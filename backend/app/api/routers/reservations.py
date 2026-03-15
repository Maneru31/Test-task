"""Reservations router.

Endpoints:
  POST   /items/{item_id}/reserve                              → 201
  DELETE /items/{item_id}/reserve                              → 204
  DELETE /lists/{list_id}/items/{item_id}/reserve/force        → 204
"""

import uuid

from fastapi import APIRouter, Depends, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import Caller, get_caller, get_current_user
from app.models.user import User
from app.schemas.reservation import ReservationOut
from app.services import reservation_service

router = APIRouter(tags=["reservations"])


@router.post(
    "/items/{item_id}/reserve",
    response_model=ReservationOut,
    status_code=status.HTTP_201_CREATED,
)
async def reserve_item(
    item_id: uuid.UUID,
    caller: Caller = Depends(get_caller),
    db: AsyncSession = Depends(get_db),
) -> ReservationOut:
    return await reservation_service.reserve(item_id, caller, db)


@router.delete("/items/{item_id}/reserve", status_code=status.HTTP_204_NO_CONTENT)
async def release_reservation(
    item_id: uuid.UUID,
    caller: Caller = Depends(get_caller),
    db: AsyncSession = Depends(get_db),
) -> Response:
    await reservation_service.release(item_id, caller, db)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete(
    "/lists/{list_id}/items/{item_id}/reserve/force",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def force_release_reservation(
    list_id: uuid.UUID,
    item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    await reservation_service.release_by_owner(list_id, item_id, current_user, db)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
