from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from app.models.sale import Sale
from app.utils.time import period_bounds


def _sell(client, cashier_headers, product_id, method="cash"):
    return client.post(
        "/api/sales",
        headers=cashier_headers,
        json={"payment_method": method, "items": [{"product_id": product_id, "qty": 1}]},
    )


def test_reports_count_completed_sales_only(client, admin_headers, cashier_headers, product, session_factory):
    opened = client.post("/api/shifts/open", headers=cashier_headers, json={"opening_cash_lyd": 0})
    sale = _sell(client, cashier_headers, product["id"], "card")
    assert sale.status_code == 201

    day = client.get("/api/reports/summary", params={"period": "day"}, headers=admin_headers)
    assert day.status_code == 200
    body = day.json()
    assert body["count"] == 1
    assert float(body["total_lyd"]) == 0.5
    assert float(body["card_lyd"]) == 0.5

    client.post(f"/api/sales/{sale.json()['id']}/cancel", headers=cashier_headers)
    after_cancel = client.get("/api/reports/summary", params={"period": "day"}, headers=admin_headers)
    assert after_cancel.json()["count"] == 0

    kept = _sell(client, cashier_headers, product["id"], "cash")
    week_start, _week_end = period_bounds("week", "Africa/Tripoli")
    month_start, _month_end = period_bounds("month", "Africa/Tripoli")
    with session_factory() as db:
        row = db.get(Sale, kept.json()["id"])
        row.created_at = min(week_start, month_start) - timedelta(seconds=1)
        db.commit()

    assert client.get("/api/reports/summary", params={"period": "week"}, headers=admin_headers).json()["count"] == 0
    assert client.get("/api/reports/summary", params={"period": "month"}, headers=admin_headers).json()["count"] == 0

    by_shift = client.get(
        "/api/reports/summary",
        params={"shift_id": opened.json()["id"]},
        headers=admin_headers,
    )
    shift_body = by_shift.json()
    assert shift_body["count"] == 1
    assert float(shift_body["cash_lyd"]) == 0.5


def test_audit_is_admin_only(client, admin_headers, cashier_headers, product):
    client.post("/api/shifts/open", headers=cashier_headers, json={"opening_cash_lyd": 0})
    sale = _sell(client, cashier_headers, product["id"])
    client.post(f"/api/sales/{sale.json()['id']}/cancel", headers=cashier_headers)

    denied_report = client.get("/api/reports/summary", params={"period": "day"}, headers=cashier_headers)
    denied_audit = client.get("/api/audit-logs", headers=cashier_headers)
    assert denied_report.status_code == 403
    assert denied_audit.status_code == 403

    logs = client.get("/api/audit-logs", headers=admin_headers)
    assert logs.status_code == 200
    assert [item["action"] for item in logs.json()] == ["sale.cancelled", "sale.created"]


def _today() -> str:
    return datetime.now(ZoneInfo("Africa/Tripoli")).date().isoformat()


def test_sales_report_filters_pages_and_keeps_cancelled(
    client, admin_headers, cashier_headers, product, session_factory
):
    today = _today()
    opened = client.post("/api/shifts/open", headers=cashier_headers, json={"opening_cash_lyd": 0})
    shift_id = opened.json()["id"]
    card_sale = _sell(client, cashier_headers, product["id"], "card")
    cash_sale = _sell(client, cashier_headers, product["id"], "cash")
    client.post(f"/api/sales/{card_sale.json()['id']}/cancel", headers=admin_headers)

    other = client.post(
        "/api/users",
        headers=admin_headers,
        json={"username": "cashier2", "password": "pass1234", "role": "cashier"},
    )
    other_login = client.post("/api/auth/login", json={"username": "cashier2", "password": "pass1234"})
    other_headers = {"Authorization": f"Bearer {other_login.json()['access_token']}"}
    client.post("/api/shifts/open", headers=other_headers, json={"opening_cash_lyd": 0})
    _sell(client, other_headers, product["id"], "cash")

    report = client.get(
        "/api/reports/sales",
        params={"date_from": today, "date_to": today, "cashier_id": other.json()["id"]},
        headers=admin_headers,
    )
    assert report.status_code == 200, report.text
    body = report.json()
    assert body["summary"]["count"] == 1
    assert body["summary"]["cancelled_count"] == 0
    assert body["total"] == 1
    assert body["items"][0]["cashier_username"] == "cashier2"

    both = client.get(
        "/api/reports/sales",
        params={"date_from": today, "date_to": today, "page_size": 1, "page": 1},
        headers=admin_headers,
    ).json()
    assert both["summary"]["count"] == 2
    assert both["summary"]["cancelled_count"] == 1
    assert float(both["summary"]["cash_lyd"]) == 1
    assert float(both["summary"]["card_lyd"]) == 0
    assert float(both["summary"]["cancelled_lyd"]) == 0.5
    assert both["total"] == 3
    assert len(both["items"]) == 1

    cancelled_only = client.get(
        "/api/reports/sales",
        params={"date_from": today, "date_to": today, "status": "cancelled"},
        headers=admin_headers,
    ).json()
    assert cancelled_only["total"] == 1
    assert cancelled_only["summary"]["count"] == 2
    assert cancelled_only["items"][0]["id"] == card_sale.json()["id"]
    assert cancelled_only["items"][0]["status"] == "cancelled"
    assert cancelled_only["items"][0]["cancelled_by_username"] == "admin"

    with session_factory() as db:
        row = db.get(Sale, cash_sale.json()["id"])
        row.created_at = datetime(2020, 1, 1)
        db.commit()

    outside = client.get(
        "/api/reports/sales",
        params={"date_from": today, "date_to": today, "cashier_id": card_sale.json()["cashier_id"]},
        headers=admin_headers,
    ).json()
    assert cash_sale.json()["id"] not in {item["id"] for item in outside["items"]}

    by_shift = client.get(
        "/api/reports/sales",
        params={"shift_id": shift_id, "date_from": today, "date_to": today},
        headers=admin_headers,
    ).json()
    assert {item["id"] for item in by_shift["items"]} == {card_sale.json()["id"], cash_sale.json()["id"]}

    denied = client.get("/api/reports/sales", params={"date_from": today, "date_to": today}, headers=cashier_headers)
    assert denied.status_code == 403
    missing = client.get("/api/reports/sales", headers=admin_headers)
    assert missing.status_code == 400
    assert missing.json()["code"] == "report_filter_required"
    backwards = client.get(
        "/api/reports/sales",
        params={"date_from": "2026-10-20", "date_to": "2026-10-01"},
        headers=admin_headers,
    )
    assert backwards.status_code == 400
    assert backwards.json()["code"] == "invalid_date_range"


def test_sale_detail_is_admin_only_and_includes_items(client, admin_headers, cashier_headers, product):
    client.post("/api/shifts/open", headers=cashier_headers, json={"opening_cash_lyd": 0})
    sale = client.post(
        "/api/sales",
        headers=cashier_headers,
        json={"payment_method": "card", "items": [{"product_id": product["id"], "qty": 2}]},
    ).json()
    url = f"/api/reports/sales/{sale['id']}"

    assert client.get(url, headers=cashier_headers).status_code == 403
    detail = client.get(url, headers=admin_headers)
    assert detail.status_code == 200
    body = detail.json()
    assert body["cashier_username"] == "cashier1"
    assert body["cancelled_by_username"] is None
    assert body["payment_method"] == "card"
    assert body["status"] == "completed"
    assert float(body["total_lyd"]) == 1
    assert body["items"][0]["product_name"] == product["name"]
    assert body["items"][0]["qty"] == 2
    assert float(body["items"][0]["unit_price_lyd"]) == 0.5
    assert float(body["items"][0]["line_total_lyd"]) == 1

    client.post(f"/api/sales/{sale['id']}/cancel", headers=admin_headers)
    cancelled = client.get(url, headers=admin_headers).json()
    assert cancelled["status"] == "cancelled"
    assert cancelled["cancelled_by_username"] == "admin"
    assert cancelled["cancelled_at"] is not None
    assert client.get("/api/reports/sales/999999", headers=admin_headers).status_code == 404
