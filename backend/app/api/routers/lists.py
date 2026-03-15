"""Lists router — 6 endpoints."""

import uuid

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import Caller, get_caller, get_current_user
from app.models.user import User
from app.schemas.list import ListCreate, ListOut, ListSummary, ListUpdate
from app.services import list_service

router = APIRouter(prefix="/lists", tags=["lists"])

# Viewer-only fields excluded from owner serialization (INV-01)
_VIEWER_ONLY_ITEM_FIELDS = {"reserved_by_me", "reserver_name", "my_contributions"}


# 1. GET /lists — owner's own lists
@router.get("", response_model=list[ListSummary])
async def get_my_lists(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ListSummary]:
    return await list_service.get_user_lists(current_user.id, db)


# 2. POST /lists — create a new list
@router.post("", response_model=ListOut, status_code=status.HTTP_201_CREATED)
async def create_list(
    req: ListCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ListOut:
    return await list_service.create_list(req, current_user.id, db)


# 3. GET /lists/public/{slug} — public view, role-filtered (INV-01, INV-07)
# Declared before /{list_id} so FastAPI doesn't mistake "public" for a UUID.
@router.get("/public/{slug}")
async def get_public_list(
    slug: str,
    caller: Caller = Depends(get_caller),
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    result = await list_service.get_public_list(slug, caller, db)

    # Serialize items: exclude viewer-only fields for owner (INV-01)
    items_data = []
    for item in result.items:
        if result.caller_role == "owner":
            item_data = item.model_dump(mode="json", exclude=_VIEWER_ONLY_ITEM_FIELDS)
        else:
            item_data = item.model_dump(mode="json")
        items_data.append(item_data)

    data = result.model_dump(mode="json", exclude={"items"})
    data["items"] = items_data
    return JSONResponse(content=data)


# 4. GET /lists/{list_id} — owner view of list metadata
@router.get("/{list_id}", response_model=ListOut)
async def get_list(
    list_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ListOut:
    return await list_service.get_list_owner_view(list_id, current_user.id, db)


# 5. PATCH /lists/{list_id} — update list metadata
@router.patch("/{list_id}", response_model=ListOut)
async def update_list(
    list_id: uuid.UUID,
    req: ListUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ListOut:
    return await list_service.update_list(list_id, req, current_user.id, db)


# 6. DELETE /lists/{list_id} — delete list (cascades to items)
@router.delete("/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_list(
    list_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await list_service.delete_list(list_id, current_user.id, db)
