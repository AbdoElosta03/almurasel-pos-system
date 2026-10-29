from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from app.models.sale import Sale
from app.services.statistics import build_summary, format_hour_window, select_hour_window, select_peak_days
from app.utils.time import UTC, period_bounds, week_bounds

TRIPOLI = ZoneInfo("Africa/Tripoli")


def test_week_bounds_run_saturday_to_friday():
    moment = datetime(2026, 10, 29, 15, tzinfo=TRIPOLI)
    start, end, local_start, local_end = week_bounds(0, "Africa/Tripoli", moment)
    previous_start, previous_end, previous_local_start, previous_local_end = week_bounds(1, "Africa/Tripoli", moment)

    assert local_start.weekday() == 5
    assert local_end.weekday() == 4
    assert local_end - local_start == timedelta(days=6)
    assert previous_local_start == local_start - timedelta(days=7)
    assert previous_local_end == local_end - timedelta(days=7)
    assert previous_end == start
    assert end - start == timedelta(days=7)


def test_peak_days_name_close_days_and_collapse_a_flat_week():
    totals = {5: 0, 6: 0, 0: 2000, 1: 1500, 2: 1000, 3: 0, 4: 0}
    days, crowded = select_peak_days(totals)
    assert days == ["الإثنين", "الثلاثاء"]
    assert crowded is False

    flat = {day: 1000 for day in (5, 6, 0, 1, 2, 3, 4)}
    days, crowded = select_peak_days(flat)
    assert crowded is True
    assert len(days) == 7
    assert "متقاربة" in build_summary(days, crowded, (8, 12))


def test_hour_window_grows_through_a_busy_morning_and_stays_on_a_spike():
    morning = {hour: 0 for hour in range(24)}
    morning[8] = 1000
    morning[9] = 900
    morning[10] = 800
    morning[11] = 700
    morning[18] = 200
    assert select_hour_window(morning) == (8, 12)
    assert format_hour_window(8, 12) == "من الساعة 8 صباحاً إلى 12 ظهراً"

    spike = {hour: 0 for hour in range(24)}
    spike[9] = 1000
    spike[10] = 100
    assert select_hour_window(spike) == (9, 10)
    assert format_hour_window(9, 10) == "في الساعة 9 صباحاً"
    assert build_summary(["الإثنين", "الثلاثاء"], False, (9, 11)) == (
        "أفضل أيام البيع هما الإثنين والثلاثاء. أفضل توقيت للبيع من الساعة 9 إلى 11 صباحاً."
    )


def _sell(client, cashier_headers, product_id):
    return client.post(
        "/api/sales",
        headers=cashier_headers,
        json={"payment_method": "cash", "items": [{"product_id": product_id, "qty": 1}]},
    )


def _place(session_factory, sale_id: int, moment: datetime):
    with session_factory() as db:
        row = db.get(Sale, sale_id)
        row.created_at = moment.astimezone(UTC).replace(tzinfo=None)
        db.commit()


def test_weekly_sales_groups_the_current_week_and_the_previous_one(
    client, admin_headers, cashier_headers, product, session_factory
):
    client.post("/api/shifts/open", headers=cashier_headers, json={"opening_cash_lyd": 0})
    week_start, week_end = period_bounds("week", "Africa/Tripoli")
    saturday = week_start.replace(tzinfo=UTC).astimezone(TRIPOLI)

    def at(day_offset: int, hour: int) -> datetime:
        return (saturday + timedelta(days=day_offset)).replace(hour=hour, minute=0, second=0, microsecond=0)

    schedule = [
        at(0, 16),
        at(2, 9), at(2, 9), at(2, 10), at(2, 10),
        at(3, 9), at(3, 9), at(3, 10), at(3, 10),
        at(4, 9),
        at(6, 23),
    ]
    for moment in schedule:
        created = _sell(client, cashier_headers, product["id"])
        assert created.status_code == 201, created.text
        _place(session_factory, created.json()["id"], moment)

    cancelled = _sell(client, cashier_headers, product["id"])
    _place(session_factory, cancelled.json()["id"], at(2, 9))
    assert client.post(f"/api/sales/{cancelled.json()['id']}/cancel", headers=admin_headers).status_code == 200

    outside = _sell(client, cashier_headers, product["id"])
    _place(session_factory, outside.json()["id"], week_end.replace(tzinfo=UTC))

    previous = _sell(client, cashier_headers, product["id"])
    _place(session_factory, previous.json()["id"], at(-5, 9))

    denied = client.get("/api/reports/weekly-sales", headers=cashier_headers)
    assert denied.status_code == 403

    current = client.get("/api/reports/weekly-sales", headers=admin_headers)
    assert current.status_code == 200, current.text
    body = current.json()
    assert [day["label"] for day in body["days"]] == ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"]
    totals = {day["label"]: day["total_lyd"] for day in body["days"]}
    counts = {day["label"]: day["count"] for day in body["days"]}
    assert totals["السبت"] == 0.5
    assert totals["الأحد"] == 0
    assert totals["الإثنين"] == 2
    assert totals["الثلاثاء"] == 2
    assert totals["الأربعاء"] == 0.5
    assert totals["الجمعة"] == 0.5
    assert counts["الإثنين"] == 4
    assert body["insights"]["best_days"] == ["الإثنين", "الثلاثاء"]
    assert body["insights"]["hour_from"] == 9
    assert body["insights"]["hour_to"] == 11
    assert body["insights"]["summary"] == "أفضل أيام البيع هما الإثنين والثلاثاء. أفضل توقيت للبيع من الساعة 9 إلى 11 صباحاً."
    assert body["week_offset"] == 0

    earlier = client.get("/api/reports/weekly-sales", params={"week_offset": 1}, headers=admin_headers)
    assert earlier.status_code == 200, earlier.text
    previous_body = earlier.json()
    assert previous_body["insights"]["best_days"] == ["الإثنين"]
    assert previous_body["insights"]["summary"] == "أفضل يوم للبيع هو الإثنين. أفضل توقيت للبيع في الساعة 9 صباحاً."
    assert sum(day["count"] for day in previous_body["days"]) == 1

    too_far = client.get("/api/reports/weekly-sales", params={"week_offset": 105}, headers=admin_headers)
    assert too_far.status_code == 422
