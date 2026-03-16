"""List service: CRUD for wishlists + public view with role-filtered fields."""

import random
import string
import uuid
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import Caller
from app.models.contribution import Contribution
from app.models.guest_session import GuestSession
from app.models.item import Item
from app.models.list import WishList
from app.models.reservation import Reservation
from app.models.user import User
from app.schemas.list import (
    ListCreate,
    ListOut,
    ListSummary,
    ListUpdate,
    MyContributionOut,
    PublicItemOut,
    PublicListOut,
)
from app.services.ws_manager import manager

_BASE62 = string.digits + string.ascii_letters  # 62 chars


def _generate_slug(length: int = 8) -> str:
    return "".join(random.choices(_BASE62, k=length))


async def _get_list_or_404(list_id: uuid.UUID, db: AsyncSession) -> WishList:
    result = await db.execute(select(WishList).where(WishList.id == list_id))
    lst = result.scalar_one_or_none()
    if not lst:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="List not found")
    return lst


def _require_owner(lst: WishList, user_id: uuid.UUID) -> None:
    if lst.owner_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")


async def get_user_lists(user_id: uuid.UUID, db: AsyncSession) -> list[ListSummary]:
    result = await db.execute(
        select(WishList)
        .where(WishList.owner_id == user_id)
        .order_by(WishList.created_at.desc())
    )
    lists = result.scalars().all()

    summaries: list[ListSummary] = []
    for lst in lists:
        count_result = await db.execute(
            select(func.count(Item.id)).where(
                Item.list_id == lst.id,
                Item.deleted_at.is_(None),
            )
        )
        item_count = count_result.scalar_one()
        summaries.append(
            ListSummary(
                id=lst.id,
                title=lst.title,
                occasion=lst.occasion,
                occasion_date=lst.occasion_date,
                public_slug=lst.public_slug,
                is_active=lst.is_active,
                item_count=item_count,
                created_at=lst.created_at,
            )
        )
    return summaries


async def create_list(req: ListCreate, user_id: uuid.UUID, db: AsyncSession) -> ListOut:
    slug: str | None = None
    for _ in range(5):
        candidate = _generate_slug()
        existing = await db.execute(
            select(WishList).where(WishList.public_slug == candidate)
        )
        if not existing.scalar_one_or_none():
            slug = candidate
            break
    if slug is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate unique slug",
        )

    wish_list = WishList(
        id=uuid.uuid4(),
        owner_id=user_id,
        title=req.title,
        description=req.description,
        occasion=req.occasion,
        occasion_date=req.occasion_date,
        public_slug=slug,
    )
    db.add(wish_list)
    await db.commit()
    await db.refresh(wish_list)
    return ListOut.model_validate(wish_list)


async def get_list_owner_view(
    list_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession
) -> "ListWithItemsOut":
    from app.schemas.list import ListWithItemsOut
    from app.schemas.item import ItemOut

    lst = await _get_list_or_404(list_id, db)
    _require_owner(lst, user_id)

    items_result = await db.execute(
        select(Item)
        .where(Item.list_id == lst.id, Item.deleted_at.is_(None))
        .order_by(Item.position, Item.created_at)
    )
    items = items_result.scalars().all()

    return ListWithItemsOut(
        **ListOut.model_validate(lst).model_dump(),
        items=[ItemOut.model_validate(i) for i in items],
    )


async def update_list(
    list_id: uuid.UUID, req: ListUpdate, user_id: uuid.UUID, db: AsyncSession
) -> ListOut:
    lst = await _get_list_or_404(list_id, db)
    _require_owner(lst, user_id)

    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(lst, field, value)

    await db.commit()
    await db.refresh(lst)
    list_out = ListOut.model_validate(lst)

    # Publish WS event AFTER commit (INV-04)
    await manager.publish(lst.public_slug, {
        "event": "list.updated",
        "list": list_out.model_dump(mode="json"),
    })

    return list_out


async def delete_list(
    list_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession
) -> None:
    lst = await _get_list_or_404(list_id, db)
    _require_owner(lst, user_id)
    await db.delete(lst)
    await db.commit()


async def get_public_list(
    slug: str, caller: Caller, db: AsyncSession
) -> PublicListOut:
    result = await db.execute(select(WishList).where(WishList.public_slug == slug))
    lst = result.scalar_one_or_none()
    if not lst:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="List not found")

    is_owner = caller.user is not None and lst.owner_id == caller.user.id
    caller_role = "owner" if is_owner else "viewer"

    # Load owner display name
    owner_result = await db.execute(select(User).where(User.id == lst.owner_id))
    owner = owner_result.scalar_one()

    # Load active items
    items_result = await db.execute(
        select(Item)
        .where(Item.list_id == lst.id, Item.deleted_at.is_(None))
        .order_by(Item.position, Item.created_at)
    )
    items = items_result.scalars().all()

    if not items:
        return PublicListOut(
            id=lst.id,
            title=lst.title,
            description=lst.description,
            occasion=lst.occasion,
            occasion_date=lst.occasion_date,
            public_slug=lst.public_slug,
            owner_display_name=owner.display_name,
            caller_role=caller_role,
            items=[],
        )

    item_ids = [item.id for item in items]

    # Batch load active reservations
    res_result = await db.execute(
        select(Reservation).where(
            Reservation.item_id.in_(item_ids),
            Reservation.released_at.is_(None),
        )
    )
    active_reservations: dict[uuid.UUID, Reservation] = {
        r.item_id: r for r in res_result.scalars().all()
    }

    # Batch load total contributions per item
    contrib_sum_result = await db.execute(
        select(
            Contribution.item_id,
            func.coalesce(func.sum(Contribution.amount), 0).label("total"),
        )
        .where(Contribution.item_id.in_(item_ids))
        .group_by(Contribution.item_id)
    )
    total_contribs: dict[uuid.UUID, Decimal] = {
        row.item_id: row.total for row in contrib_sum_result
    }

    # Batch load user display names for reservations
    reserver_user_ids = {
        r.reserver_user_id
        for r in active_reservations.values()
        if r.reserver_user_id is not None
    }
    reserver_names: dict[uuid.UUID, str] = {}
    if reserver_user_ids:
        users_result = await db.execute(
            select(User).where(User.id.in_(reserver_user_ids))
        )
        reserver_names = {u.id: u.display_name for u in users_result.scalars().all()}

    # Batch load my contributions (viewer only)
    my_contribs_map: dict[uuid.UUID, list[Contribution]] = {}
    if caller_role == "viewer":
        if caller.user:
            my_result = await db.execute(
                select(Contribution).where(
                    Contribution.item_id.in_(item_ids),
                    Contribution.contributor_user_id == caller.user.id,
                )
            )
            for c in my_result.scalars().all():
                my_contribs_map.setdefault(c.item_id, []).append(c)
        elif caller.guest:
            my_result = await db.execute(
                select(Contribution).where(
                    Contribution.item_id.in_(item_ids),
                    Contribution.guest_session_id == caller.guest.id,
                )
            )
            for c in my_result.scalars().all():
                my_contribs_map.setdefault(c.item_id, []).append(c)

    # Build public items
    public_items: list[PublicItemOut] = []
    for item in items:
        active_res = active_reservations.get(item.id)
        is_reserved = active_res is not None
        total_contributed = total_contribs.get(item.id, Decimal("0"))

        pub_item = PublicItemOut(
            id=item.id,
            name=item.name,
            description=item.description,
            url=item.url,
            image_url=item.image_url,
            price=item.price,
            currency=item.currency,
            is_group_fund=item.is_group_fund,
            target_amount=item.target_amount,
            position=item.position,
            is_reserved=is_reserved,
            total_contributed=total_contributed,
        )

        if caller_role == "viewer":
            if active_res is not None:
                # reserved_by_me
                reserved_by_me = False
                if caller.user and active_res.reserver_user_id == caller.user.id:
                    reserved_by_me = True
                elif (
                    caller.guest
                    and active_res.guest_session_id == caller.guest.id
                ):
                    reserved_by_me = True
                pub_item.reserved_by_me = reserved_by_me

                # reserver_name
                if active_res.guest_display_name:
                    pub_item.reserver_name = active_res.guest_display_name
                elif active_res.reserver_user_id:
                    pub_item.reserver_name = reserver_names.get(
                        active_res.reserver_user_id
                    )
            else:
                pub_item.reserved_by_me = False
                pub_item.reserver_name = None

            # my_contributions
            my_contribs = my_contribs_map.get(item.id, [])
            pub_item.my_contributions = [
                MyContributionOut(
                    id=c.id,
                    amount=c.amount,
                    note=c.note,
                    contributed_at=c.contributed_at,
                )
                for c in my_contribs
            ]

        public_items.append(pub_item)

    return PublicListOut(
        id=lst.id,
        title=lst.title,
        description=lst.description,
        occasion=lst.occasion,
        occasion_date=lst.occasion_date,
        public_slug=lst.public_slug,
        owner_display_name=owner.display_name,
        caller_role=caller_role,
        items=public_items,
    )


async def get_guest_session_by_token(
    token: str, db: AsyncSession
) -> GuestSession | None:
    result = await db.execute(
        select(GuestSession).where(GuestSession.token == token)
    )
    return result.scalar_one_or_none()
