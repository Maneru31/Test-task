"""Contribution service: add, get summary (role-filtered), delete."""

import uuid
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import Caller
from app.models.contribution import Contribution
from app.models.item import Item
from app.models.list import WishList
from app.models.user import User
from app.schemas.contribution import (
    ContributionCreate,
    ContributionOut,
    ContributionSummary,
    MyContributionOut,
)
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


async def _get_contrib_totals(item_id: uuid.UUID, db: AsyncSession) -> tuple[Decimal, int]:
    """Return (total_contributed, contribution_count) for an item."""
    agg = await db.execute(
        select(
            func.coalesce(func.sum(Contribution.amount), Decimal("0.00")),
            func.count(Contribution.id),
        ).where(Contribution.item_id == item_id)
    )
    return agg.one()


async def add_contribution(
    item_id: uuid.UUID,
    req: ContributionCreate,
    caller: Caller,
    db: AsyncSession,
) -> ContributionOut:
    """Add a contribution. Requires authenticated user or guest session."""
    if caller.user is None and caller.guest is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to contribute",
        )

    item = await _get_active_item_or_404(item_id, db)

    contribution = Contribution(
        id=uuid.uuid4(),
        item_id=item.id,
        contributor_user_id=caller.user.id if caller.user else None,
        guest_session_id=caller.guest.id if caller.guest else None,
        guest_display_name=caller.guest.display_name if caller.guest else None,
        amount=req.amount,
        note=req.note,
    )
    db.add(contribution)
    await db.commit()
    await db.refresh(contribution)

    # Publish WS event AFTER commit (INV-04)
    list_result = await db.execute(select(WishList).where(WishList.id == item.list_id))
    lst = list_result.scalar_one_or_none()
    if lst:
        total_contributed, contribution_count = await _get_contrib_totals(item_id, db)
        contributed_at = (
            contribution.contributed_at.isoformat()
            if contribution.contributed_at
            else None
        )
        await manager.publish(lst.public_slug, {
            "event": "contribution.added",
            "item_id": str(item_id),
            "contribution_id": str(contribution.id),
            "total_contributed": str(total_contributed),
            "contribution_count": contribution_count,
            "contributor_user_id": str(contribution.contributor_user_id) if contribution.contributor_user_id else None,
            "guest_session_id": str(contribution.guest_session_id) if contribution.guest_session_id else None,
            "amount": str(contribution.amount),
            "note": contribution.note,
            "contributed_at": contributed_at,
        })

    return ContributionOut.model_validate(contribution)


async def get_summary(
    item_id: uuid.UUID,
    caller: Caller,
    db: AsyncSession,
) -> ContributionSummary:
    """Return contribution summary. Owner does NOT get my_contributions (INV-01)."""
    item = await _get_active_item_or_404(item_id, db)

    # Determine if caller is the list owner
    list_result = await db.execute(
        select(WishList).where(WishList.id == item.list_id)
    )
    lst = list_result.scalar_one_or_none()
    is_owner = (
        caller.user is not None
        and lst is not None
        and lst.owner_id == caller.user.id
    )

    # Aggregate totals
    agg_result = await db.execute(
        select(
            func.coalesce(func.sum(Contribution.amount), Decimal("0.00")),
            func.count(Contribution.id),
        ).where(Contribution.item_id == item_id)
    )
    total_contributed, contribution_count = agg_result.one()

    # Compute progress percentage
    target_amount = item.target_amount
    if target_amount and target_amount > 0:
        progress_pct = float(total_contributed / target_amount * 100)
    else:
        progress_pct = None

    # Build my_contributions for viewer only (INV-01: owner sees nothing)
    my_contributions: list[MyContributionOut] | None = None
    if not is_owner:
        mine_query = select(Contribution).where(Contribution.item_id == item_id)
        if caller.user:
            mine_query = mine_query.where(
                Contribution.contributor_user_id == caller.user.id
            )
        elif caller.guest:
            mine_query = mine_query.where(
                Contribution.guest_session_id == caller.guest.id
            )
        else:
            # Anonymous viewer — no personal contributions to show
            mine_query = mine_query.where(False)  # noqa: E712

        mine_result = await db.execute(mine_query)
        my_contributions = [
            MyContributionOut.model_validate(c) for c in mine_result.scalars().all()
        ]

    return ContributionSummary(
        total_contributed=total_contributed,
        target_amount=target_amount,
        progress_pct=progress_pct,
        contribution_count=contribution_count,
        my_contributions=my_contributions,
    )


async def delete_contribution(
    item_id: uuid.UUID,
    contribution_id: uuid.UUID,
    caller: Caller,
    db: AsyncSession,
) -> None:
    """Delete caller's own contribution."""
    if caller.user is None and caller.guest is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    item = await _get_active_item_or_404(item_id, db)

    result = await db.execute(
        select(Contribution).where(
            Contribution.id == contribution_id,
            Contribution.item_id == item_id,
        )
    )
    contribution = result.scalar_one_or_none()
    if not contribution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Contribution not found"
        )

    # Verify ownership
    if caller.user:
        if contribution.contributor_user_id != caller.user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not your contribution",
            )
    else:
        if contribution.guest_session_id != caller.guest.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not your contribution",
            )

    # Save contributor info before deletion (needed for WS event after commit)
    contrib_user_id = str(contribution.contributor_user_id) if contribution.contributor_user_id else None
    contrib_guest_id = str(contribution.guest_session_id) if contribution.guest_session_id else None
    contrib_id_str = str(contribution.id)
    item_list_id = item.list_id

    await db.delete(contribution)
    await db.commit()

    # Publish WS event AFTER commit (INV-04)
    list_result = await db.execute(select(WishList).where(WishList.id == item_list_id))
    lst = list_result.scalar_one_or_none()
    if lst:
        total_contributed, contribution_count = await _get_contrib_totals(item_id, db)
        await manager.publish(lst.public_slug, {
            "event": "contribution.removed",
            "item_id": str(item_id),
            "contribution_id": contrib_id_str,
            "total_contributed": str(total_contributed),
            "contribution_count": contribution_count,
            "contributor_user_id": contrib_user_id,
            "guest_session_id": contrib_guest_id,
        })
