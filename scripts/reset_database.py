"""إعادة إنشاء قاعدة البيانات من الصفر (أوقف uvicorn أولاً إن كان يعمل).

Usage (من جذر المشروع):
    python scripts/reset_database.py
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "pos.db"

if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def main() -> int:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")

    if DB_PATH.exists():
        try:
            DB_PATH.unlink()
            print(f"تم حذف {DB_PATH.name}")
        except OSError as exc:
            print(
                "تعذر حذف قاعدة البيانات. أوقف خادم الباكند (uvicorn) ثم أعد المحاولة.\n"
                f"  {exc}",
                file=sys.stderr,
            )
            return 1

    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=ROOT,
        check=False,
    )
    if result.returncode != 0:
        return result.returncode

    # تشغيل البذور (مدير + تصنيفات ومنتجات) مثل أول تشغيل للتطبيق
    from app.db.session import SessionLocal
    from app.services.seed import seed_cashiers, seed_catalog
    from app.services.users import seed_admin

    db = SessionLocal()
    try:
        seed_admin(db)
        seed_cashiers(db)
        seed_catalog(db)
        print("تم إنشاء الجداول وبيانات البذور الافتراضية.")
    finally:
        db.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
