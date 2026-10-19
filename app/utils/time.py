from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

UTC = ZoneInfo("UTC")


def utc_now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def period_bounds(period: str, timezone_name: str, moment: datetime | None = None) -> tuple[datetime, datetime]:
    """Return a half-open UTC range. Weeks start on Saturday in timezone_name."""
    tz = ZoneInfo(timezone_name)
    if moment is None:
        current = datetime.now(tz)
    elif moment.tzinfo is None:
        current = moment.replace(tzinfo=UTC).astimezone(tz)
    else:
        current = moment.astimezone(tz)
    start_of_day = current.replace(hour=0, minute=0, second=0, microsecond=0)
    if period == "day":
        start = start_of_day
        end = start_of_day + timedelta(days=1)
    elif period == "week":
        days_since_saturday = (start_of_day.weekday() - 5) % 7
        start = start_of_day - timedelta(days=days_since_saturday)
        end = start + timedelta(days=7)
    elif period == "month":
        start = start_of_day.replace(day=1)
        if start.month == 12:
            end = start.replace(year=start.year + 1, month=1)
        else:
            end = start.replace(month=start.month + 1)
    else:
        raise ValueError(f"Unknown period: {period}")
    return start.astimezone(UTC).replace(tzinfo=None), end.astimezone(UTC).replace(tzinfo=None)


def date_range_bounds(date_from: date, date_to: date, timezone_name: str) -> tuple[datetime, datetime]:
    """Inclusive local dates as a half-open UTC range."""
    tz = ZoneInfo(timezone_name)
    start = datetime.combine(date_from, time.min, tzinfo=tz)
    end = datetime.combine(date_to + timedelta(days=1), time.min, tzinfo=tz)
    return start.astimezone(UTC).replace(tzinfo=None), end.astimezone(UTC).replace(tzinfo=None)
