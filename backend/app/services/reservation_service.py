"""Reservation service: reserve, release, force-release by owner."""

import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import Caller
from app.models.item import Item
from app.models.list import WishList
from app.models.reservation import Reservation
from app.models.user import User
from app.schemas.reservation import ReservationOut
from app.services.ws_manager import manager


async def _get_active_item_or_404(item_id: uuid.UUID, db: AsyncSession) -> Item:
    result = await db.execute(
        select(Item).where(
            Item.id == item_id,
            Item.deleted_at.is_(None),
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return item


async def _get_list_slug(list_id: uuid.UUID, db: AsyncSession) -> str | None:
    result = await db.execute(select(WishList).where(WishList.id == list_id))
    lst = result.scalar_one_or_none()
    return lst.public_slug if lst else None


async def _get_reserver_name(reservation: Reservation, db: AsyncSession) -> str | None:
    """Return display name of the reserver (guest name or user display name)."""
    if reservation.guest_display_name:
        return reservation.guest_display_name
    if reservation.reserver_user_id:
        user_result = await db.execute(
            select(User).where(User.id == reservation.reserver_user_id)
        )
        user = user_result.scalar_one_or_none()
        return user.display_name if user else None
    return None


async def reserve(item_id: uuid.UUID, caller: Caller, db: AsyncSession) -> ReservationOut:
    """Create a reservation. Returns 401 if caller is anonymous, 409 if already reserved."""
    if caller.user is None and caller.guest is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to reserve",
        )

    item = await _get_active_item_or_404(item_id, db)

    reservation = Reservation(
        id=uuid.uuid4(),
        item_id=item.id,
        reserver_user_id=caller.user.id if caller.user else None,
        guest_session_id=caller.guest.id if caller.guest else None,
        guest_display_name=caller.guest.display_name if caller.guest else None,
    )
    db.add(reservation)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Item is already reserved",
        )

    await db.refresh(reservation)

    # Publish WS event AFTER commit (INV-04)
    slug = await _get_list_slug(item.list_id, db)
    if slug:
        reserver_name = await _get_reserver_name(reservation, db)
        await manager.publish(slug, {
            "event": "reservation.changed",
            "item_id": str(item.id),
            "is_reserved": True,
            "reserver_user_id": str(reservation.reserver_user_id) if reservation.reserver_user_id else None,
            "guest_session_id": str(reservation.guest_session_id) if reservation.guest_session_id else None,
            "reserver_name": reserver_name,
        })

    return ReservationOut.model_validate(reservation)


async def release(item_id: uuid.UUID, caller: Caller, db: AsyncSession) -> None:
    """Release the caller's own active reservation."""
    if caller.user is None and caller.guest is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    item = await _get_active_item_or_404(item_id, db)

    query = select(Reservation).where(
        Reservation.item_id == item_id,
        Reservation.released_at.is_(None),
    )
    if caller.user:
        query = query.where(Reservation.reserver_user_id == caller.user.id)
    else:
        query = query.where(Reservation.guest_session_id == caller.guest.id)

    result = await db.execute(query)
    reservation = result.scalar_one_or_none()
    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active reservation found for this caller",
        )

    reservation.released_at = datetime.now(UTC)
    await db.commit()

    # Publish WS event AFTER commit (INV-04)
    slug = await _get_list_slug(item.list_id, db)
    if slug:
        await manager.publish(slug, {
            "event": "reservation.changed",
            "item_id": str(item_id),
            "is_reserved": False,
            "reserver_user_id": None,
            "guest_session_id": None,
            "reserver_name": None,
        })


async def release_by_owner(
    list_id: uuid.UUID,
    item_id: uuid.UUID,
    current_user: User,
    db: AsyncSession,
) -> None:
    """Force-release any active reservation on the item. Only list owner can do this."""
    # Verify list exists and caller is the owner
    list_result = await db.execute(
        select(WishList).where(WishList.id == list_id)
    )
    lst = list_result.scalar_one_or_none()
    if not lst:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="List not found")
    if lst.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    # Verify item belongs to this list
    item_result = await db.execute(
        select(Item).where(
            Item.id == item_id,
            Item.list_id == list_id,
            Item.deleted_at.is_(None),
        )
    )
    item = item_result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    # Find the active reservation (any reserver)
    res_result = await db.execute(
        select(Reservation).where(
            Reservation.item_id == item_id,
            Reservation.released_at.is_(None),
        )
    )
    reservation = res_result.scalar_one_or_none()
    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active reservation on this item",
        )

    reservation.released_at = datetime.now(UTC)
    await db.commit()

    # Publish WS event AFTER commit (INV-04)
    await manager.publish(lst.public_slug, {
        "event": "reservation.changed",
        "item_id": str(item_id),
        "is_reserved": False,
        "reserver_user_id": None,
        "guest_session_id": None,
        "reserver_name": None,
    })
