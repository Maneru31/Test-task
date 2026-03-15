import uuid
from datetime import datetime

from pydantic import BaseModel


class ReserveRequest(BaseModel):
    """Empty body — caller identity comes from auth headers."""

    pass


class ReservationOut(BaseModel):
    id: uuid.UUID
    item_id: uuid.UUID
    reserved_at: datetime

    model_config = {"from_attributes": True}
