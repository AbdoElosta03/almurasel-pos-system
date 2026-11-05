from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import select

from app.core.config import settings
from app.models.audit_log import AuditLog


def _today() -> str:
    return datetime.now(ZoneInfo("Africa/Tripoli")).date().isoformat()


def _open(client, headers, opening=10):
    opened = client.post("/api/shifts/open", headers=headers, json={"opening_cash_lyd": opening})
    assert opened.status_code == 201, opened.text
    return opened.json()


def _expense(client, headers, **overrides):
    body = {
        "expense_date": _today(),
        "category": "wage",
        "payee_name": "  سارة  ",
        "amount_lyd": 20,
        "paid_from": "external",
        "note": "  أجر اليوم  ",
    }
    body.update(overrides)
    return client.post("/api/expenses", headers=headers, json=body)


def test_admin_records_filters_and_period_totals(client, admin_headers, cashier_headers, session_factory):
    created = _expense(client, admin_headers, payee_name="مسوق الحلويات", category="supplier_payment", amount_lyd=15.5)
    assert created.status_code == 201, created.text
    expense = created.json()
    assert expense["payee_name"] == "مسوق الحلويات"
    assert expense["note"] == "أجر اليوم"
    assert expense["amount_lyd"] == 15.5
    assert expense["paid_from"] == "external"
    assert expense["shift_id"] is None
    assert expense["created_by_username"] == settings.admin_username
    assert expense["deletable"] is True

    old = _expense(client, admin_headers, expense_date="2020-01-01", payee_name="قديم", category="other", amount_lyd=3)
    assert old.status_code == 201, old.text

    listed = client.get("/api/expenses", headers=admin_headers, params={"q": "حلويات", "category": "supplier_payment", "paid_from": "external"})
    assert listed.status_code == 200, listed.text
    body = listed.json()
    assert body["total"] == 1
    assert body["total_lyd"] == 15.5
    assert body["items"][0]["id"] == expense["id"]

    summary = client.get("/api/expenses/summary", headers=admin_headers)
    assert summary.status_code == 200, summary.text
    assert summary.json()["day_lyd"] == 15.5
    assert summary.json()["day_count"] == 1
    assert summary.json()["week_count"] == 1
    assert summary.json()["month_count"] == 1

    detail = client.get(f"/api/expenses/{expense['id']}", headers=admin_headers)
    assert detail.status_code == 200
    assert detail.json()["id"] == expense["id"]

    denied = client.get("/api/expenses", headers=cashier_headers)
    assert denied.status_code == 403
    assert client.patch(f"/api/expenses/{expense['id']}", headers=admin_headers, json={"amount_lyd": 1}).status_code == 405

    removed = client.delete(f"/api/expenses/{expense['id']}", headers=admin_headers)
    assert removed.status_code == 204
    assert client.get(f"/api/expenses/{expense['id']}", headers=admin_headers).status_code == 404

    with session_factory() as db:
        actions = list(db.scalars(select(AuditLog.action).where(AuditLog.entity_type == "expense").order_by(AuditLog.id)))
        assert actions == ["expense.created", "expense.created", "expense.deleted"]

    logs = client.get("/api/audit-logs", headers=admin_headers)
    deleted = next(item for item in logs.json() if item["action"] == "expense.deleted")
    assert deleted["actor_username"] == settings.admin_username
    assert deleted["entity_id"] == expense["id"]


def test_validation_and_external_shift_rules(client, admin_headers, cashier_headers):
    assert _expense(client, admin_headers, amount_lyd=0).status_code == 422
    assert _expense(client, admin_headers, payee_name="   ").status_code == 422
    assert _expense(client, admin_headers, category="salary").status_code == 422
    assert client.get("/api/expenses", params={"date_from": "2026-11-04", "date_to": "2026-11-01"}, headers=admin_headers).status_code == 400

    shift = _open(client, cashier_headers)
    linked = _expense(client, admin_headers, paid_from="external", shift_id=shift["id"])
    assert linked.status_code == 400
    assert linked.json()["code"] == "expense_shift_not_allowed"
    missing_shift = _expense(client, admin_headers, paid_from="drawer")
    assert missing_shift.status_code == 400
    assert missing_shift.json()["code"] == "expense_shift_required"
    unknown = _expense(client, admin_headers, paid_from="drawer", shift_id=9999)
    assert unknown.status_code == 404

    external = _expense(client, cashier_headers, paid_from="external")
    assert external.status_code == 403
    assert external.json()["code"] == "cashier_drawer_only"


def test_cashier_without_shift_cannot_record_drawer_expense(client, admin_headers):
    created = client.post(
        "/api/users",
        headers=admin_headers,
        json={"username": "cashier2", "password": "12345678", "role": "cashier"},
    )
    assert created.status_code == 201, created.text
    login = client.post("/api/auth/login", json={"username": "cashier2", "password": "12345678"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    denied = _expense(client, headers, paid_from="drawer", payee_name="سارة")
    assert denied.status_code == 400
    assert denied.json()["code"] == "no_open_shift"
    assert client.get("/api/expenses/current-drawer", headers=headers).status_code == 404


def test_drawer_expense_reduces_expected_cash_until_reconciliation(client, admin_headers, cashier_headers, product):
    shift = _open(client, cashier_headers, 10)
    sale = client.post(
        "/api/sales",
        headers=cashier_headers,
        json={"payment_method": "cash", "items": [{"product_id": product["id"], "qty": 1}]},
    )
    assert sale.status_code == 201, sale.text
    purchase = client.post(
        "/api/purchases",
        headers=admin_headers,
        json={"purchase_date": _today(), "items": [{"item_name": "حليب", "qty": 1, "line_total_lyd": 40}]},
    )
    assert purchase.status_code == 201, purchase.text

    drawer = _expense(
        client,
        cashier_headers,
        paid_from="drawer",
        category="wage",
        payee_name="باريستا",
        amount_lyd=0.2,
        note=None,
    )
    assert drawer.status_code == 201, drawer.text
    assert drawer.json()["shift_id"] == shift["id"]
    assert drawer.json()["created_by_username"] == "cashier1"

    outside = _expense(client, admin_headers, paid_from="external", amount_lyd=7, payee_name="مالك")
    assert outside.status_code == 201, outside.text

    current = client.get("/api/expenses/current-drawer", headers=cashier_headers)
    assert current.status_code == 200, current.text
    assert current.json()["cash_sales_lyd"] == 0.5
    assert current.json()["drawer_expenses_lyd"] == 0.2
    assert current.json()["expected_drawer_lyd"] == 10.3
    assert len(current.json()["items"]) == 1

    closed = client.post(f"/api/shifts/{shift['id']}/close", headers=cashier_headers, json={"closing_cash_lyd": 10.3})
    assert closed.status_code == 200, closed.text
    after_close = client.delete(f"/api/expenses/{drawer.json()['id']}", headers=cashier_headers)
    assert after_close.status_code == 403
    assert after_close.json()["code"] == "cashier_open_shift_only"

    listed = client.get("/api/daily-closings", headers=admin_headers)
    row = next(item for item in listed.json()["items"] if item["shift_id"] == shift["id"])
    assert row["drawer_expenses_lyd"] == 0.2
    assert row["expected_drawer_lyd"] == 10.3
    assert row["cash_sales_lyd"] == 0.5

    other = client.post(
        "/api/users",
        headers=admin_headers,
        json={"username": "cashier2", "password": "12345678", "role": "cashier"},
    )
    other_login = client.post("/api/auth/login", json={"username": "cashier2", "password": "12345678"})
    other_headers = {"Authorization": f"Bearer {other_login.json()['access_token']}"}
    _open(client, other_headers, 0)
    foreign = client.delete(f"/api/expenses/{drawer.json()['id']}", headers=other_headers)
    assert foreign.status_code == 403

    saved = client.post(f"/api/daily-closings/{shift['id']}", headers=admin_headers, json={"counted_cash_lyd": 10.3})
    assert saved.status_code == 200, saved.text
    assert saved.json()["variance_lyd"] == 0
    assert saved.json()["result"] == "match"
    assert saved.json()["drawer_expenses_lyd"] == 0.2

    locked_delete = client.delete(f"/api/expenses/{drawer.json()['id']}", headers=admin_headers)
    assert locked_delete.status_code == 409
    assert locked_delete.json()["code"] == "expense_locked"
    locked_create = _expense(client, admin_headers, paid_from="drawer", shift_id=shift["id"], amount_lyd=1, payee_name="بعد المطابقة")
    assert locked_create.status_code == 409
    assert locked_create.json()["code"] == "expense_locked"

    still = client.get("/api/daily-closings", headers=admin_headers)
    same = next(item for item in still.json()["items"] if item["shift_id"] == shift["id"])
    assert same["expected_drawer_lyd"] == 10.3


def test_admin_can_delete_drawer_expense_before_reconciliation(client, admin_headers, cashier_headers):
    shift = _open(client, cashier_headers, 5)
    created = _expense(client, admin_headers, paid_from="drawer", shift_id=shift["id"], amount_lyd=1, payee_name="أجرة")
    assert created.status_code == 201, created.text
    client.post(f"/api/shifts/{shift['id']}/close", headers=cashier_headers, json={"closing_cash_lyd": 4})
    removed = client.delete(f"/api/expenses/{created.json()['id']}", headers=admin_headers)
    assert removed.status_code == 204
    listed = client.get("/api/daily-closings", headers=admin_headers)
    row = next(item for item in listed.json()["items"] if item["shift_id"] == shift["id"])
    assert row["drawer_expenses_lyd"] == 0
    assert row["expected_drawer_lyd"] == 5
