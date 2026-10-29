from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

UTC = ZoneInfo("UTC")


def utc_now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def as_utc(moment: datetime) -> datetime:
    if moment.tzinfo is None:
        return moment.replace(tzinfo=UTC)
    return moment.astimezone(UTC)


def local_calendar_date(moment: datetime, timezone_name: str) -> date:
    return as_utc(moment).astimezone(ZoneInfo(timezone_name)).date()


def is_previous_local_day(moment: datetime, timezone_name: str, now: datetime | None = None) -> bool:
    """True when moment's local calendar day is before today's local day."""
    tz = ZoneInfo(timezone_name)
    current = datetime.now(tz) if now is None else as_utc(now).astimezone(tz)
    return local_calendar_date(moment, timezone_name) < current.date()


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


def week_bounds(
    week_offset: int,
    timezone_name: str,
    moment: datetime | None = None,
) -> tuple[datetime, datetime, date, date]:
    """Local Saturday–Friday week as a half-open UTC range, plus the inclusive local dates.

    week_offset 0 is the week containing moment. Larger offsets step backward.
    """
    if week_offset < 0:
        raise ValueError("week_offset must be zero or positive")
    start, end = period_bounds("week", timezone_name, moment)
    if week_offset:
        delta = timedelta(days=7 * week_offset)
        start -= delta
        end -= delta
    tz = ZoneInfo(timezone_name)
    local_start = start.replace(tzinfo=UTC).astimezone(tz).date()
    local_end = end.replace(tzinfo=UTC).astimezone(tz).date() - timedelta(days=1)
    return start, end, local_start, local_end


def day_bounds(
    day_offset: int,
    timezone_name: str,
    moment: datetime | None = None,
) -> tuple[datetime, datetime, date]:
    """Local calendar day as a half-open UTC range, plus the local date.

    day_offset 0 is the day containing moment. Larger offsets step backward.
    """
    if day_offset < 0:
        raise ValueError("day_offset must be zero or positive")
    start, end = period_bounds("day", timezone_name, moment)
    if day_offset:
        delta = timedelta(days=day_offset)
        start -= delta
        end -= delta
    tz = ZoneInfo(timezone_name)
    local_date = start.replace(tzinfo=UTC).astimezone(tz).date()
    return start, end, local_date


def date_range_bounds(date_from: date, date_to: date, timezone_name: str) -> tuple[datetime, datetime]:
    """Inclusive local dates as a half-open UTC range."""
    tz = ZoneInfo(timezone_name)
    start = datetime.combine(date_from, time.min, tzinfo=tz)
    end = datetime.combine(date_to + timedelta(days=1), time.min, tzinfo=tz)
    return start.astimezone(UTC).replace(tzinfo=None), end.astimezone(UTC).replace(tzinfo=None)
