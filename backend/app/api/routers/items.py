"""Items router — 4 endpoints with two-phase delete."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.item import (
    DeleteCheckResponse,
    DeleteConfirmResponse,
    ItemCreate,
    ItemOut,
    ItemUpdate,
    ReorderRequest,
)
from app.services import item_service

router = APIRouter(prefix="/lists", tags=["items"])


# 1. PATCH /lists/{list_id}/items/reorder — reorder items
# Declared BEFORE /{item_id} routes so "reorder" is not matched as a UUID.
@router.patch("/{list_id}/items/reorder", response_model=list[ItemOut])
async def reorder_items(
    list_id: uuid.UUID,
    req: ReorderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ItemOut]:
    return await item_service.reorder_items(list_id, req, current_user.id, db)


# 2. POST /lists/{list_id}/items — create item
@router.post(
    "/{list_id}/items",
    response_model=ItemOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_item(
    list_id: uuid.UUID,
    req: ItemCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ItemOut:
    return await item_service.create_item(list_id, req, current_user.id, db)


# 3. PATCH /lists/{list_id}/items/{item_id} — update item
@router.patch("/{list_id}/items/{item_id}", response_model=ItemOut)
async def update_item(
    list_id: uuid.UUID,
    item_id: uuid.UUID,
    req: ItemUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ItemOut:
    return await item_service.update_item(list_id, item_id, req, current_user.id, db)


# 4. DELETE /lists/{list_id}/items/{item_id} — two-phase delete
#   Phase 1 (no confirm): clean → 204; has dependencies → 200 + warning
#   Phase 2 (confirm=true): always soft-delete → 200 + {deleted, soft}
@router.delete("/{list_id}/items/{item_id}", response_model=None)
async def delete_item(
    list_id: uuid.UUID,
    item_id: uuid.UUID,
    confirm: Annotated[bool, Query()] = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response | DeleteCheckResponse | DeleteConfirmResponse:
    if confirm:
        result = await item_service.delete_item_confirm(
            list_id, item_id, current_user.id, db
        )
        return result

    check = await item_service.delete_item_check(
        list_id, item_id, current_user.id, db
    )
    if check is None:
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    return check
