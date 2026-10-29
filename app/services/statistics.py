from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.sale import Sale, SaleItem
from app.schemas.statistics import (
    DailyProductSales,
    DailyProductSalesItem,
    WeeklySales,
    WeeklySalesDay,
    WeeklySalesInsights,
)
from app.utils.money import dirhams_to_lyd
from app.utils.time import as_utc, day_bounds, week_bounds

# Saturday through Friday, matching period_bounds.
WEEK_WEEKDAYS = (5, 6, 0, 1, 2, 3, 4)
WEEKDAY_LABELS = {
    5: "السبت",
    6: "الأحد",
    0: "الإثنين",
    1: "الثلاثاء",
    2: "الأربعاء",
    3: "الخميس",
    4: "الجمعة",
}
PEAK_DAY_RATIO_PERCENT = 75
MAX_NAMED_PEAK_DAYS = 3
PEAK_HOUR_RATIO_PERCENT = 60
MAX_HOUR_WINDOW = 4
EMPTY_WEEK_SUMMARY = "لا توجد مبيعات مكتملة في هذا الأسبوع."


def weekly_sales(db: Session, week_offset: int) -> WeeklySales:
    start, end, local_start, local_end = week_bounds(week_offset, settings.timezone)
    rows = db.execute(
        select(Sale.created_at, Sale.total_dirhams).where(
            Sale.status == "completed",
            Sale.created_at >= start,
            Sale.created_at < end,
        )
    ).all()
    day_totals = {weekday: 0 for weekday in WEEK_WEEKDAYS}
    day_counts = {weekday: 0 for weekday in WEEK_WEEKDAYS}
    hour_totals = {hour: 0 for hour in range(24)}
    tz = ZoneInfo(settings.timezone)
    for created_at, total_dirhams in rows:
        local = as_utc(created_at).astimezone(tz)
        amount = int(total_dirhams)
        day_totals[local.weekday()] += amount
        day_counts[local.weekday()] += 1
        hour_totals[local.hour] += amount
    best_days, crowded = select_peak_days(day_totals)
    window = select_hour_window(hour_totals)
    return WeeklySales(
        week_start=local_start,
        week_end=local_end,
        week_offset=week_offset,
        days=[
            WeeklySalesDay(
                weekday=weekday,
                label=WEEKDAY_LABELS[weekday],
                total_lyd=dirhams_to_lyd(day_totals[weekday]),
                count=day_counts[weekday],
            )
            for weekday in WEEK_WEEKDAYS
        ],
        insights=WeeklySalesInsights(
            best_days=best_days,
            hour_from=None if window is None else window[0],
            hour_to=None if window is None else window[1],
            summary=build_summary(best_days, crowded, window),
        ),
    )


def daily_product_sales(db: Session, day_offset: int) -> DailyProductSales:
    start, end, local_date = day_bounds(day_offset, settings.timezone)
    rows = db.execute(
        select(
            SaleItem.product_id,
            SaleItem.product_name,
            func.sum(SaleItem.qty).label("qty"),
            func.sum(SaleItem.line_total_dirhams).label("total_dirhams"),
        )
        .join(Sale, SaleItem.sale_id == Sale.id)
        .where(
            Sale.status == "completed",
            Sale.created_at >= start,
            Sale.created_at < end,
        )
        .group_by(SaleItem.product_id, SaleItem.product_name)
        .order_by(func.sum(SaleItem.qty).desc(), SaleItem.product_name)
    ).all()
    items = [
        DailyProductSalesItem(
            product_id=product_id,
            product_name=product_name,
            qty=int(qty),
            total_lyd=dirhams_to_lyd(int(total_dirhams)),
        )
        for product_id, product_name, qty, total_dirhams in rows
    ]
    return DailyProductSales(
        date=local_date,
        day_offset=day_offset,
        items=items,
        total_qty=sum(item.qty for item in items),
    )


def select_peak_days(totals: dict[int, int]) -> tuple[list[str], bool]:
    """Days at least 75% of the best day, ordered Saturday to Friday.

    The flag is true when more than three days qualify, so the sentence stays short.
    """
    ranked = sorted(
        (day for day in WEEK_WEEKDAYS if totals.get(day, 0) > 0),
        key=lambda day: (-totals[day], WEEK_WEEKDAYS.index(day)),
    )
    if not ranked:
        return [], False
    top = totals[ranked[0]]
    chosen: list[int] = []
    for day in ranked:
        if totals[day] * 100 >= top * PEAK_DAY_RATIO_PERCENT:
            chosen.append(day)
        else:
            break
    chosen.sort(key=WEEK_WEEKDAYS.index)
    return [WEEKDAY_LABELS[day] for day in chosen], len(chosen) > MAX_NAMED_PEAK_DAYS


def select_hour_window(hour_totals: dict[int, int]) -> tuple[int, int] | None:
    """Busiest hour, widened across neighbors at least 60% as busy, up to four hours.

    The end hour is exclusive, so (8, 12) means 08:00–12:00.
    """
    peak = max(hour_totals.values(), default=0)
    if peak <= 0:
        return None
    peak_hour = min(hour for hour, total in hour_totals.items() if total == peak)
    start = peak_hour
    end = peak_hour
    while end - start + 1 < MAX_HOUR_WINDOW:
        left = hour_totals.get(start - 1, 0) if start > 0 else 0
        right = hour_totals.get(end + 1, 0) if end < 23 else 0
        expand_left = start > 0 and left * 100 >= peak * PEAK_HOUR_RATIO_PERCENT
        expand_right = end < 23 and right * 100 >= peak * PEAK_HOUR_RATIO_PERCENT
        if expand_left and (not expand_right or left >= right):
            start -= 1
        elif expand_right:
            end += 1
        else:
            break
    return start, end + 1


def build_summary(best_days: list[str], crowded: bool, window: tuple[int, int] | None) -> str:
    if not best_days and window is None:
        return EMPTY_WEEK_SUMMARY
    parts: list[str] = []
    if crowded:
        parts.append("المبيعات متقاربة على معظم أيام الأسبوع")
    elif len(best_days) == 1:
        parts.append(f"أفضل يوم للبيع هو {best_days[0]}")
    elif len(best_days) == 2:
        parts.append(f"أفضل أيام البيع هما {best_days[0]} و{best_days[1]}")
    elif len(best_days) >= 3:
        parts.append(f"أفضل أيام البيع هي {best_days[0]} و{best_days[1]} و{best_days[2]}")
    if window is not None:
        parts.append(f"أفضل توقيت للبيع {format_hour_window(window[0], window[1])}")
    return ". ".join(parts) + "."


def format_hour_window(start: int, end: int) -> str:
    if end == start + 1:
        number, period = _clock(start)
        return f"في الساعة {number} {period}"
    start_number, start_period = _clock(start)
    end_number, end_period = _clock(end)
    if start_period == end_period:
        return f"من الساعة {start_number} إلى {end_number} {start_period}"
    return f"من الساعة {start_number} {start_period} إلى {end_number} {end_period}"


def _clock(hour: int) -> tuple[int, str]:
    if hour in (0, 24):
        return 12, "منتصف الليل"
    if hour <= 11:
        return hour, "صباحاً"
    if hour == 12:
        return 12, "ظهراً"
    if hour <= 17:
        return hour - 12, "عصراً"
    return hour - 12, "مساءً"
