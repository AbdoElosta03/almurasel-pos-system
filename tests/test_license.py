import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import pytest

from app.core.config import settings
from app.services import license as license_service


@pytest.fixture
def license_env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    path = tmp_path / "license.json"
    monkeypatch.setattr(settings, "license_enforce", True)
    monkeypatch.setattr(settings, "license_file", str(path))
    monkeypatch.setattr(settings, "license_machine_id", "cafe-pc-1")
    monkeypatch.setattr(settings, "license_secret", "test-license-secret-at-least-32-bytes")
    license_service._attempts.clear()
    yield path
    if path.exists():
        path.unlink()


def _token(plan="week", machine_id="cafe-pc-1", expires_at=None, current_expires=None, start=None):
    if plan != "lifetime" and expires_at is None:
        expires_at = license_service.compute_expires_at(plan, start=start, current_expires=current_expires)
    return license_service.encode_token(
        plan=plan,
        machine_id=machine_id,
        expires_at=expires_at,
        secret=settings.license_secret,
    )


def test_status_available_while_locked_and_login_blocked(client, license_env):
    status = client.get("/api/license/status")
    assert status.status_code == 200
    body = status.json()
    assert body["active"] is False
    assert body["lock_reason"] == "license_required"
    assert body["machine_id"] == "cafe-pc-1"

    denied = client.post("/api/auth/login", json={"username": settings.admin_username, "password": settings.admin_password})
    assert denied.status_code == 403
    assert denied.json()["code"] == "license_required"


def test_two_days_license_activates(client, license_env):
    token = _token("two_days")
    activated = client.post("/api/license/activate", json={"token": token})
    assert activated.status_code == 200, activated.text
    assert activated.json()["active"] is True
    assert activated.json()["plan"] == "two_days"
    assert activated.json()["expires_at"] == (date.today() + timedelta(days=2)).isoformat()


def test_week_license_activates_and_reuse_does_not_extend(client, license_env):
    token = _token("week")
    activated = client.post("/api/license/activate", json={"token": token})
    assert activated.status_code == 200, activated.text
    assert activated.json()["active"] is True
    assert activated.json()["plan"] == "week"
    first_expiry = activated.json()["expires_at"]

    login = client.post("/api/auth/login", json={"username": settings.admin_username, "password": settings.admin_password})
    assert login.status_code == 200, login.text

    again = client.post("/api/license/activate", json={"token": token})
    assert again.status_code == 409
    assert again.json()["code"] == "license_not_extension"

    status = client.get("/api/license/status")
    assert status.json()["expires_at"] == first_expiry


def test_wrong_machine_and_expired_rejected(client, license_env):
    wrong = _token("week", machine_id="other-pc")
    response = client.post("/api/license/activate", json={"token": wrong})
    assert response.status_code == 400
    assert response.json()["code"] == "license_wrong_machine"

    expired = _token("week", expires_at=date.today() - timedelta(days=1))
    response = client.post("/api/license/activate", json={"token": expired})
    assert response.status_code == 400
    assert response.json()["code"] == "license_expired"


def test_clock_tamper_locks_system(client, license_env):
    token = _token("month")
    assert client.post("/api/license/activate", json={"token": token}).status_code == 200
    stored = json.loads(license_env.read_text(encoding="utf-8"))
    stored["last_seen_at"] = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    license_env.write_text(json.dumps(stored), encoding="utf-8")

    status = client.get("/api/license/status")
    assert status.status_code == 200
    assert status.json()["active"] is False
    assert status.json()["lock_reason"] == "clock_tampered"

    denied = client.post("/api/auth/login", json={"username": settings.admin_username, "password": settings.admin_password})
    assert denied.status_code == 403
    assert denied.json()["code"] == "clock_tampered"


def test_lifetime_blocks_downgrade_and_early_renew_keeps_farther_date(client, license_env):
    lifetime = _token("lifetime")
    assert client.post("/api/license/activate", json={"token": lifetime}).status_code == 200
    monthly = _token("month")
    denied = client.post("/api/license/activate", json={"token": monthly})
    assert denied.status_code == 409
    assert denied.json()["code"] == "lifetime_already_active"

    license_env.unlink()
    current = date.today() + timedelta(days=20)
    first = _token("month", expires_at=current)
    assert client.post("/api/license/activate", json={"token": first}).status_code == 200
    renewed = _token("month", start=date.today(), current_expires=current)
    saved = client.post("/api/license/activate", json={"token": renewed})
    assert saved.status_code == 200, saved.text
    assert saved.json()["expires_at"] == (current + timedelta(days=30)).isoformat()
