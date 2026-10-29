from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from app.models.sale import Sale
from app.utils.time import UTC, day_bounds, period_bounds

TRIPOLI = ZoneInfo("Africa/Tripoli")


def test_day_bounds_steps_backward_by_local_day():
    moment = datetime(2026, 10, 29, 15, tzinfo=TRIPOLI)
    start, end, local_date = day_bounds(0, "Africa/Tripoli", moment)
    previous_start, previous_end, previous_date = day_bounds(1, "Africa/Tripoli", moment)

    assert local_date == moment.date()
    assert previous_date == local_date - timedelta(days=1)
    assert previous_end == start
    assert end - start == timedelta(days=1)


def _sell(client, cashier_headers, product_id, qty: int = 1):
    return client.post(
        "/api/sales",
        headers=cashier_headers,
        json={"payment_method": "cash", "items": [{"product_id": product_id, "qty": qty}]},
    )


def _place(session_factory, sale_id: int, moment: datetime):
    with session_factory() as db:
        row = db.get(Sale, sale_id)
        row.created_at = moment.astimezone(UTC).replace(tzinfo=None)
        db.commit()


def test_daily_product_sales_groups_qty_by_product_for_a_day(
    client, admin_headers, cashier_headers, product, session_factory
):
    client.post("/api/shifts/open", headers=cashier_headers, json={"opening_cash_lyd": 0})
    category = client.post("/api/categories", headers=admin_headers, json={"name": "Snacks"})
    assert category.status_code == 201, category.text
    coffee = client.post(
        "/api/products",
        headers=admin_headers,
        json={"category_id": category.json()["id"], "name": "Coffee", "price_lyd": 1},
    )
    assert coffee.status_code == 201, coffee.text

    day_start, _ = period_bounds("day", "Africa/Tripoli")
    today = day_start.replace(tzinfo=UTC).astimezone(TRIPOLI).replace(hour=10)
    yesterday = today - timedelta(days=1)

    for qty in (2, 3):
        created = _sell(client, cashier_headers, product["id"], qty=qty)
        assert created.status_code == 201, created.text
        _place(session_factory, created.json()["id"], today)

    coffee_sale = _sell(client, cashier_headers, coffee.json()["id"], qty=1)
    assert coffee_sale.status_code == 201, coffee_sale.text
    _place(session_factory, coffee_sale.json()["id"], today)

    old = _sell(client, cashier_headers, product["id"], qty=5)
    _place(session_factory, old.json()["id"], yesterday)

    cancelled = _sell(client, cashier_headers, product["id"])
    _place(session_factory, cancelled.json()["id"], today)
    assert client.post(f"/api/sales/{cancelled.json()['id']}/cancel", headers=admin_headers).status_code == 200

    denied = client.get("/api/reports/daily-product-sales", headers=cashier_headers)
    assert denied.status_code == 403

    today_report = client.get("/api/reports/daily-product-sales", headers=admin_headers)
    assert today_report.status_code == 200, today_report.text
    body = today_report.json()
    assert body["day_offset"] == 0
    assert body["total_qty"] == 6
    by_name = {item["product_name"]: item for item in body["items"]}
    assert by_name["Tea"]["qty"] == 5
    assert by_name["Tea"]["total_lyd"] == 2.5
    assert by_name["Coffee"]["qty"] == 1
    assert by_name["Coffee"]["total_lyd"] == 1

    yesterday_report = client.get("/api/reports/daily-product-sales", params={"day_offset": 1}, headers=admin_headers)
    assert yesterday_report.status_code == 200, yesterday_report.text
    previous = yesterday_report.json()
    assert previous["total_qty"] == 5
    assert len(previous["items"]) == 1
    assert previous["items"][0]["product_name"] == "Tea"

    by_date = client.get(
        "/api/reports/daily-product-sales",
        params={"date": yesterday.date().isoformat()},
        headers=admin_headers,
    )
    assert by_date.status_code == 200, by_date.text
    assert by_date.json() == previous

    too_far = client.get("/api/reports/daily-product-sales", params={"day_offset": 366}, headers=admin_headers)
    assert too_far.status_code == 422


def test_daily_product_sales_explicit_date_boundaries(
    client, admin_headers, cashier_headers, product, session_factory
):
    client.post("/api/shifts/open", headers=cashier_headers, json={"opening_cash_lyd": 0})
    start, _, today = day_bounds(0, "Africa/Tripoli")
    local_start = start.replace(tzinfo=UTC).astimezone(TRIPOLI) - timedelta(days=400)
    for moment, qty in (
        (local_start - timedelta(seconds=1), 1),
        (local_start, 2),
        (local_start + timedelta(days=1) - timedelta(seconds=1), 3),
        (local_start + timedelta(days=1), 4),
    ):
        sale = _sell(client, cashier_headers, product["id"], qty=qty)
        assert sale.status_code == 201, sale.text
        _place(session_factory, sale.json()["id"], moment)

    response = client.get(
        "/api/reports/daily-product-sales",
        params={"date": local_start.date().isoformat()},
        headers=admin_headers,
    )
    assert response.status_code == 200, response.text
    assert response.json()["total_qty"] == 5
    assert response.json()["day_offset"] == 400
    assert response.json()["date"] == local_start.date().isoformat()

    for invalid_date in ((today + timedelta(days=1)).isoformat(), "not-a-date", "2026-02-30"):
        invalid = client.get(
            "/api/reports/daily-product-sales", params={"date": invalid_date}, headers=admin_headers
        )
        assert invalid.status_code == 422, invalid.text

    denied = client.get(
        "/api/reports/daily-product-sales",
        params={"date": today.isoformat()},
        headers=cashier_headers,
    )
    assert denied.status_code == 403
