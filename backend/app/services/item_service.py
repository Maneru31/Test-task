"""Item service: CRUD + two-phase delete + reorder."""

import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.contribution import Contribution
from app.models.item import Item
from app.models.list import WishList
from app.models.reservation import Reservation
from app.schemas.item import (
    DeleteCheckResponse,
    DeleteConfirmResponse,
    ItemCreate,
    ItemOut,
    ItemUpdate,
    ReorderRequest,
)
from app.services.ws_manager import manager


async def _get_list_or_404(list_id: uuid.UUID, db: AsyncSession) -> WishList:
    result = await db.execute(select(WishList).where(WishList.id == list_id))
    lst = result.scalar_one_or_none()
    if not lst:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="List not found")
    return lst


async def _get_active_item_or_404(
    list_id: uuid.UUID, item_id: uuid.UUID, db: AsyncSession
) -> Item:
    result = await db.execute(
        select(Item).where(
            Item.id == item_id,
            Item.list_id == list_id,
            Item.deleted_at.is_(None),
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return item


def _require_owner(lst: WishList, user_id: uuid.UUID) -> None:
    if lst.owner_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")


async def create_item(
    list_id: uuid.UUID, req: ItemCreate, user_id: uuid.UUID, db: AsyncSession
) -> ItemOut:
    lst = await _get_list_or_404(list_id, db)
    _require_owner(lst, user_id)

    # Determine next position
    pos_result = await db.execute(
        select(func.coalesce(func.max(Item.position), -1)).where(
            Item.list_id == list_id,
            Item.deleted_at.is_(None),
        )
    )
    next_position = pos_result.scalar_one() + 1

    item = Item(
        id=uuid.uuid4(),
        list_id=list_id,
        name=req.name,
        description=req.description,
        url=req.url,
        image_url=req.image_url,
        price=req.price,
        currency=req.currency,
        is_group_fund=req.is_group_fund,
        target_amount=req.target_amount,
        position=next_position,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)

    # Publish WS event AFTER commit (INV-04)
    item_out = ItemOut.model_validate(item)
    await manager.publish(lst.public_slug, {
        "event": "item.created",
        "item_id": str(item.id),
        "item": item_out.model_dump(mode="json"),
    })

    return item_out


async def update_item(
    list_id: uuid.UUID,
    item_id: uuid.UUID,
    req: ItemUpdate,
    user_id: uuid.UUID,
    db: AsyncSession,
) -> ItemOut:
    lst = await _get_list_or_404(list_id, db)
    _require_owner(lst, user_id)
    item = await _get_active_item_or_404(list_id, item_id, db)

    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    await db.commit()
    await db.refresh(item)

    # Publish WS event AFTER commit (INV-04)
    item_out = ItemOut.model_validate(item)
    await manager.publish(lst.public_slug, {
        "event": "item.updated",
        "item_id": str(item.id),
        "item": item_out.model_dump(mode="json"),
    })

    return item_out


async def delete_item_check(
    list_id: uuid.UUID,
    item_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession,
) -> DeleteCheckResponse | None:
    """Phase 1: if no dependencies, hard-delete and return None (→ 204).
    If dependencies exist, return a warning response (→ 200)."""
    lst = await _get_list_or_404(list_id, db)
    _require_owner(lst, user_id)
    item = await _get_active_item_or_404(list_id, item_id, db)

    has_reservation_result = await db.execute(
        select(func.count(Reservation.id)).where(
            Reservation.item_id == item.id,
            Reservation.released_at.is_(None),
        )
    )
    has_reservation = has_reservation_result.scalar_one() > 0

    has_contributions_result = await db.execute(
        select(func.count(Contribution.id)).where(Contribution.item_id == item.id)
    )
    has_contributions = has_contributions_result.scalar_one() > 0

    if not has_reservation and not has_contributions:
        item_id_str = str(item.id)
        await db.delete(item)
        await db.commit()

        # Publish WS event AFTER commit (INV-04)
        await manager.publish(lst.public_slug, {
            "event": "item.deleted",
            "item_id": item_id_str,
        })
        return None  # → 204

    if has_reservation and has_contributions:
        warning = "has_both"
    elif has_reservation:
        warning = "has_reservation"
    else:
        warning = "has_contributions"

    return DeleteCheckResponse(warning=warning)


async def delete_item_confirm(
    list_id: uuid.UUID,
    item_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession,
) -> DeleteConfirmResponse:
    """Phase 2 (confirm=true): always soft-delete regardless of dependencies (INV-03)."""
    lst = await _get_list_or_404(list_id, db)
    _require_owner(lst, user_id)
    item = await _get_active_item_or_404(list_id, item_id, db)

    item_id_str = str(item.id)
    item.deleted_at = datetime.now(UTC)
    await db.commit()

    # Publish WS event AFTER commit (INV-04)
    await manager.publish(lst.public_slug, {
        "event": "item.deleted",
        "item_id": item_id_str,
    })

    return DeleteConfirmResponse(deleted=True, soft=True)


async def reorder_items(
    list_id: uuid.UUID,
    req: ReorderRequest,
    user_id: uuid.UUID,
    db: AsyncSession,
) -> list[ItemOut]:
    lst = await _get_list_or_404(list_id, db)
    _require_owner(lst, user_id)

    # Load all active items for this list
    items_result = await db.execute(
        select(Item).where(
            Item.list_id == list_id,
            Item.deleted_at.is_(None),
        )
    )
    items_map: dict[uuid.UUID, Item] = {
        item.id: item for item in items_result.scalars().all()
    }

    # Validate all provided IDs belong to this list
    for item_id in req.item_ids:
        if item_id not in items_map:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Item {item_id} not found in list",
            )

    # Update positions according to the provided order
    for position, item_id in enumerate(req.item_ids):
        items_map[item_id].position = position

    await db.commit()

    # Return items in new order
    ordered = [items_map[item_id] for item_id in req.item_ids]
    for item in ordered:
        await db.refresh(item)
    result_items = [ItemOut.model_validate(item) for item in ordered]

    # Publish WS event AFTER commit (INV-04)
    await manager.publish(lst.public_slug, {
        "event": "item.reordered",
        "item_ids": [str(iid) for iid in req.item_ids],
    })

    return result_items
