from datetime import timedelta

from app.models.shift import Shift
from app.utils.time import utc_now


def _open(client, headers, opening=10):
    opened = client.post("/api/shifts/open", headers=headers, json={"opening_cash_lyd": opening})
    assert opened.status_code == 201, opened.text
    return opened.json()


def _sell(client, headers, product_id, method="cash", qty=1):
    sale = client.post(
        "/api/sales",
        headers=headers,
        json={"payment_method": method, "items": [{"product_id": product_id, "qty": qty}]},
    )
    assert sale.status_code == 201, sale.text
    return sale.json()


def test_daily_closing_is_admin_only(client, cashier_headers):
    denied = client.get("/api/daily-closings", headers=cashier_headers)
    assert denied.status_code == 403
    assert denied.json()["code"] == "admin_only"


def test_reconcile_cash_drawer_and_freeze_result(client, admin_headers, cashier_headers, product, session_factory):
    shift = _open(client, cashier_headers, 10)
    _sell(client, cashier_headers, product["id"], "cash")
    _sell(client, cashier_headers, product["id"], "card")
    closed = client.post(f"/api/shifts/{shift['id']}/close", headers=cashier_headers, json={"closing_cash_lyd": 10.5})
    assert closed.status_code == 200, closed.text

    listed = client.get("/api/daily-closings", headers=admin_headers)
    assert listed.status_code == 200, listed.text
    row = next(item for item in listed.json()["items"] if item["shift_id"] == shift["id"])
    assert row["cashier_username"] == "cashier1"
    assert row["opening_cash_lyd"] == 10
    assert row["closing_cash_lyd"] == 10.5
    assert row["cash_sales_lyd"] == 0.5
    assert row["card_sales_lyd"] == 0.5
    assert row["sales_total_lyd"] == 1
    assert row["expected_drawer_lyd"] == 10.5
    assert row["result"] == "pending"

    saved = client.post(
        f"/api/daily-closings/{shift['id']}",
        headers=admin_headers,
        json={"counted_cash_lyd": 12},
    )
    assert saved.status_code == 200, saved.text
    assert saved.json()["counted_cash_lyd"] == 12
    assert saved.json()["variance_lyd"] == 1.5
    assert saved.json()["result"] == "surplus"

    again = client.post(
        f"/api/daily-closings/{shift['id']}",
        headers=admin_headers,
        json={"counted_cash_lyd": 9},
    )
    assert again.status_code == 409
    assert again.json()["code"] == "account_already_closed"

    with session_factory() as db:
        stored = db.get(Shift, shift["id"])
        stored.opened_at = utc_now() - timedelta(days=3)
        db.commit()
    other_day = client.get("/api/daily-closings", headers=admin_headers)
    assert all(item["shift_id"] != shift["id"] for item in other_day.json()["items"])


def test_open_shift_cannot_be_reconciled(client, admin_headers, cashier_headers):
    shift = _open(client, cashier_headers, 0)
    listed = client.get("/api/daily-closings", headers=admin_headers)
    row = next(item for item in listed.json()["items"] if item["shift_id"] == shift["id"])
    assert row["result"] == "open"
    assert row["closing_cash_lyd"] is None

    denied = client.post(
        f"/api/daily-closings/{shift['id']}",
        headers=admin_headers,
        json={"counted_cash_lyd": 0},
    )
    assert denied.status_code == 400
    assert denied.json()["code"] == "shift_still_open"


def test_cancelled_cash_sale_is_excluded_from_expected_drawer(client, admin_headers, cashier_headers, product):
    shift = _open(client, cashier_headers, 5)
    sale = _sell(client, cashier_headers, product["id"], "cash")
    cancelled = client.post(f"/api/sales/{sale['id']}/cancel", headers=cashier_headers)
    assert cancelled.status_code == 200
    client.post(f"/api/shifts/{shift['id']}/close", headers=cashier_headers, json={"closing_cash_lyd": 5})
    saved = client.post(
        f"/api/daily-closings/{shift['id']}",
        headers=admin_headers,
        json={"counted_cash_lyd": 5},
    )
    assert saved.status_code == 200, saved.text
    assert saved.json()["cash_sales_lyd"] == 0
    assert saved.json()["expected_drawer_lyd"] == 5
    assert saved.json()["result"] == "match"
