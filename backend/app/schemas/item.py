import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class ItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=300)
    description: str | None = None
    url: str | None = None
    image_url: str | None = None
    price: Decimal | None = None
    currency: str = Field(default="RUB", max_length=3)
    is_group_fund: bool = False
    target_amount: Decimal | None = None


class ItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=300)
    description: str | None = None
    url: str | None = None
    image_url: str | None = None
    price: Decimal | None = None
    currency: str | None = Field(default=None, max_length=3)
    is_group_fund: bool | None = None
    target_amount: Decimal | None = None


class ItemOut(BaseModel):
    id: uuid.UUID
    list_id: uuid.UUID
    name: str
    description: str | None
    url: str | None
    image_url: str | None
    price: Decimal | None
    currency: str
    is_group_fund: bool
    target_amount: Decimal | None
    position: int
    deleted_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DeleteCheckResponse(BaseModel):
    warning: str  # "has_contributions" | "has_reservation" | "has_both"


class DeleteConfirmResponse(BaseModel):
    deleted: bool
    soft: bool


class ReorderRequest(BaseModel):
    item_ids: list[uuid.UUID]
