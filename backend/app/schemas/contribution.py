import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class ContributionCreate(BaseModel):
    amount: Decimal = Field(gt=0, decimal_places=2)
    note: str | None = None


class ContributionOut(BaseModel):
    id: uuid.UUID
    item_id: uuid.UUID
    amount: Decimal
    note: str | None
    contributed_at: datetime

    model_config = {"from_attributes": True}


class MyContributionOut(BaseModel):
    id: uuid.UUID
    amount: Decimal
    note: str | None
    contributed_at: datetime

    model_config = {"from_attributes": True}


class ContributionSummary(BaseModel):
    total_contributed: Decimal
    target_amount: Decimal | None
    progress_pct: float | None
    contribution_count: int
    # viewer-only: present for viewers, absent (None) for owners
    my_contributions: list[MyContributionOut] | None = None
