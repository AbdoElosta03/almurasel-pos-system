from decimal import Decimal, ROUND_HALF_UP

DIRHAMS_PER_LYD = 1000


def lyd_to_dirhams(amount: Decimal) -> int:
    scaled = (amount * DIRHAMS_PER_LYD).quantize(Decimal('1'), rounding=ROUND_HALF_UP)
    return int(scaled)


def dirhams_to_lyd(amount: int) -> Decimal:
    return (Decimal(amount) / DIRHAMS_PER_LYD).quantize(Decimal('0.001'))


def line_total(unit_price_dirhams: int, qty: int) -> int:
    return unit_price_dirhams * qty
