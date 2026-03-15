import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class ListCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    occasion: str | None = Field(default=None, max_length=50)
    occasion_date: date | None = None


class ListUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    occasion: str | None = Field(default=None, max_length=50)
    occasion_date: date | None = None
    is_active: bool | None = None


class ListOut(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    title: str
    description: str | None
    occasion: str | None
    occasion_date: date | None
    public_slug: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ListSummary(BaseModel):
    id: uuid.UUID
    title: str
    occasion: str | None
    occasion_date: date | None
    public_slug: str
    is_active: bool
    item_count: int
    created_at: datetime


class MyContributionOut(BaseModel):
    id: uuid.UUID
    amount: Decimal
    note: str | None
    contributed_at: datetime

    model_config = {"from_attributes": True}


class PublicItemOut(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    url: str | None
    image_url: str | None
    price: Decimal | None
    currency: str
    is_group_fund: bool
    target_amount: Decimal | None
    position: int
    is_reserved: bool
    total_contributed: Decimal
    # Viewer-only fields — set to None for owner; excluded in endpoint serialization
    reserved_by_me: bool | None = None
    reserver_name: str | None = None
    my_contributions: list[MyContributionOut] | None = None

    model_config = {"from_attributes": True}


class PublicListOut(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    occasion: str | None
    occasion_date: date | None
    public_slug: str
    owner_display_name: str
    caller_role: str
    items: list[PublicItemOut]
