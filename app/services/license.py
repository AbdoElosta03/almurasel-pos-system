"""Signed activation keys stored outside the sales database."""

from __future__ import annotations

import json
import platform
import threading
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Literal

import jwt
from fastapi import status

from app.core.config import settings
from app.core.errors import api_error

Plan = Literal["two_days", "week", "month", "lifetime"]
PLAN_DAYS = {"two_days": 2, "week": 7, "month": 30}
CLOCK_SKEW = timedelta(hours=1)
WARN_DAYS = 3
ACTIVATION_WINDOW_SECONDS = 15 * 60
ACTIVATION_MAX_ATTEMPTS = 8

_lock = threading.Lock()
_attempts: dict[str, list[float]] = {}


def license_path() -> Path:
    return Path(settings.license_file).resolve()


def current_machine_id() -> str:
    if settings.license_machine_id:
        return settings.license_machine_id.strip()
    if platform.system() == "Windows":
        import winreg

        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Cryptography") as key:
            value, _ = winreg.QueryValueEx(key, "MachineGuid")
        return str(value).strip()
    raise RuntimeError("Set LICENSE_MACHINE_ID on non-Windows hosts")


def encode_token(
    *,
    plan: Plan,
    machine_id: str,
    expires_at: date | None,
    secret: str | None = None,
) -> str:
    payload: dict[str, Any] = {
        "typ": "almurasel_license",
        "plan": plan,
        "machine_id": machine_id,
        "iat": int(datetime.now(timezone.utc).timestamp()),
    }
    if plan != "lifetime":
        if expires_at is None:
            raise ValueError("Timed plans require expires_at")
        payload["expires_at"] = expires_at.isoformat()
    return jwt.encode(payload, secret or settings.license_secret, algorithm="HS256")


def decode_token(token: str, *, secret: str | None = None) -> dict[str, Any]:
    cleaned = "".join(token.split())
    try:
        payload = jwt.decode(
            cleaned,
            secret or settings.license_secret,
            algorithms=["HS256"],
            options={"require": ["plan", "machine_id"]},
        )
    except jwt.PyJWTError as exc:
        raise api_error(status.HTTP_400_BAD_REQUEST, "invalid_license", "Invalid activation code") from exc
    if payload.get("typ") != "almurasel_license":
        raise api_error(status.HTTP_400_BAD_REQUEST, "invalid_license", "Invalid activation code")
    plan = payload.get("plan")
    if plan not in ("two_days", "week", "month", "lifetime"):
        raise api_error(status.HTTP_400_BAD_REQUEST, "invalid_license", "Invalid activation code")
    machine_id = str(payload.get("machine_id") or "").strip()
    if not machine_id:
        raise api_error(status.HTTP_400_BAD_REQUEST, "invalid_license", "Invalid activation code")
    expires_at = None
    if plan != "lifetime":
        raw = payload.get("expires_at")
        if not isinstance(raw, str):
            raise api_error(status.HTTP_400_BAD_REQUEST, "invalid_license", "Invalid activation code")
        try:
            expires_at = date.fromisoformat(raw)
        except ValueError as exc:
            raise api_error(status.HTTP_400_BAD_REQUEST, "invalid_license", "Invalid activation code") from exc
    return {"token": cleaned, "plan": plan, "machine_id": machine_id, "expires_at": expires_at}


def local_today() -> date:
    from zoneinfo import ZoneInfo

    return datetime.now(ZoneInfo(settings.timezone)).date()


def compute_expires_at(plan: Plan, start: date | None = None, current_expires: date | None = None) -> date | None:
    if plan == "lifetime":
        return None
    today = start or local_today()
    base = today
    if current_expires is not None and current_expires > base:
        base = current_expires
    return base + timedelta(days=PLAN_DAYS[plan])


def status_payload() -> dict[str, Any]:
    machine_id = _safe_machine_id()
    if not settings.license_enforce:
        return _open_status(machine_id, enforced=False, reason=None)
    stored = _read()
    if stored is None:
        return _locked_status(machine_id, "license_required", None, None)
    now = _utc_now()
    if _clock_tampered(stored, now):
        return _locked_status(machine_id, "clock_tampered", stored.get("plan"), _parse_date(stored.get("expires_at")))
    try:
        decoded = decode_token(str(stored["token"]))
    except Exception:
        return _locked_status(machine_id, "license_required", None, None)
    if decoded["machine_id"] != machine_id:
        return _locked_status(machine_id, "license_required", None, None)
    expires_at = decoded["expires_at"]
    if decoded["plan"] != "lifetime" and expires_at is not None and expires_at < local_today():
        return _locked_status(machine_id, "license_expired", decoded["plan"], expires_at)
    _touch(stored, now)
    return _open_status(machine_id, enforced=True, reason=None, plan=decoded["plan"], expires_at=expires_at)


def require_active() -> None:
    if not settings.license_enforce:
        return
    info = status_payload()
    if info["active"]:
        return
    code = info.get("lock_reason") or "license_required"
    messages = {
        "license_required": "Activation required",
        "license_expired": "License expired",
        "clock_tampered": "System clock was moved backwards",
    }
    raise api_error(status.HTTP_403_FORBIDDEN, code, messages.get(code, "Activation required"))


def activate(token: str, client_key: str = "local") -> dict[str, Any]:
    _rate_limit(client_key)
    machine_id = current_machine_id()
    decoded = decode_token(token)
    if decoded["machine_id"] != machine_id:
        raise api_error(status.HTTP_400_BAD_REQUEST, "license_wrong_machine", "This code belongs to another computer")
    now = _utc_now()
    stored = _read()
    if stored is not None and _clock_tampered(stored, now):
        raise api_error(status.HTTP_403_FORBIDDEN, "clock_tampered", "System clock was moved backwards")
    current_plan = None
    current_expires = None
    if stored is not None:
        try:
            current = decode_token(str(stored["token"]))
            current_plan = current["plan"]
            current_expires = current["expires_at"]
        except Exception:
            current_plan = None
            current_expires = None
    if current_plan == "lifetime" and decoded["plan"] != "lifetime":
        raise api_error(
            status.HTTP_409_CONFLICT,
            "lifetime_already_active",
            "A lifetime license is already active",
        )
    if decoded["plan"] != "lifetime":
        expires_at = decoded["expires_at"]
        assert expires_at is not None
        if expires_at < local_today():
            raise api_error(status.HTTP_400_BAD_REQUEST, "license_expired", "License expired")
        if current_expires is not None and expires_at <= current_expires:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "license_not_extension",
                "This code does not extend the current license",
            )
    payload = {
        "token": decoded["token"],
        "plan": decoded["plan"],
        "expires_at": None if decoded["expires_at"] is None else decoded["expires_at"].isoformat(),
        "machine_id": machine_id,
        "activated_at": now.isoformat(),
        "last_seen_at": now.isoformat(),
    }
    _write(payload)
    _clear_attempts(client_key)
    return status_payload()


def is_exempt_path(path: str, method: str) -> bool:
    if path == "/api/license/status" and method == "GET":
        return True
    if path == "/api/license/activate" and method == "POST":
        return True
    return False


def _safe_machine_id() -> str:
    try:
        return current_machine_id()
    except Exception:
        return ""


def _open_status(
    machine_id: str,
    *,
    enforced: bool,
    reason: str | None,
    plan: str | None = None,
    expires_at: date | None = None,
) -> dict[str, Any]:
    days_remaining = None
    warning = False
    if plan == "lifetime":
        days_remaining = None
    elif expires_at is not None:
        days_remaining = (expires_at - local_today()).days
        warning = days_remaining <= WARN_DAYS
    return {
        "active": True,
        "enforced": enforced,
        "plan": plan if enforced else "development",
        "expires_at": expires_at,
        "days_remaining": days_remaining,
        "warning": warning,
        "machine_id": machine_id,
        "lock_reason": reason,
    }


def _locked_status(machine_id: str, reason: str, plan: str | None, expires_at: date | None) -> dict[str, Any]:
    return {
        "active": False,
        "enforced": True,
        "plan": plan,
        "expires_at": expires_at,
        "days_remaining": None if expires_at is None else (expires_at - local_today()).days,
        "warning": False,
        "machine_id": machine_id,
        "lock_reason": reason,
    }


def _read() -> dict[str, Any] | None:
    path = license_path()
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError, UnicodeError):
        return None
    if not isinstance(data, dict) or not isinstance(data.get("token"), str):
        return None
    return data


def _write(payload: dict[str, Any]) -> None:
    path = license_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    temporary.replace(path)


def _touch(stored: dict[str, Any], now: datetime) -> None:
    stored["last_seen_at"] = now.isoformat()
    try:
        _write(stored)
    except OSError:
        pass


def _clock_tampered(stored: dict[str, Any], now: datetime) -> bool:
    raw = stored.get("last_seen_at")
    if not isinstance(raw, str) or not raw:
        return False
    try:
        last_seen = datetime.fromisoformat(raw)
    except ValueError:
        return False
    if last_seen.tzinfo is None:
        last_seen = last_seen.replace(tzinfo=timezone.utc)
    return now + CLOCK_SKEW < last_seen


def _parse_date(value: Any) -> date | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _rate_limit(client_key: str) -> None:
    now = time.monotonic()
    with _lock:
        stamps = [stamp for stamp in _attempts.get(client_key, []) if now - stamp < ACTIVATION_WINDOW_SECONDS]
        if len(stamps) >= ACTIVATION_MAX_ATTEMPTS:
            _attempts[client_key] = stamps
            raise api_error(status.HTTP_429_TOO_MANY_REQUESTS, "license_rate_limited", "Too many activation attempts")
        stamps.append(now)
        _attempts[client_key] = stamps


def _clear_attempts(client_key: str) -> None:
    with _lock:
        _attempts.pop(client_key, None)
