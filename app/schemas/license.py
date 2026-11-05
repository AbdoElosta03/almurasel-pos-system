from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

LicensePlan = Literal["two_days", "week", "month", "lifetime", "development"]
LockReason = Literal["license_required", "license_expired", "clock_tampered"]


class LicenseActivateIn(BaseModel):
    token: str = Field(min_length=20, max_length=4000)


class LicenseStatusOut(BaseModel):
    active: bool
    enforced: bool
    plan: LicensePlan | None
    expires_at: date | None
    days_remaining: int | None
    warning: bool
    machine_id: str
    lock_reason: LockReason | None
