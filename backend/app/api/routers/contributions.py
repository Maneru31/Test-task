"""Contributions router.

Endpoints:
  POST   /items/{item_id}/contributions                        → 201
  GET    /items/{item_id}/contributions/summary                → 200
  DELETE /items/{item_id}/contributions/{contribution_id}      → 204
"""

import uuid

from fastapi import APIRouter, Depends, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import Caller, get_caller
from app.schemas.contribution import ContributionCreate, ContributionOut, ContributionSummary
from app.services import contribution_service

router = APIRouter(prefix="/items", tags=["contributions"])


# summary must be declared before /{contribution_id} to avoid ambiguity
@router.get("/{item_id}/contributions/summary", response_model=ContributionSummary)
async def get_contribution_summary(
    item_id: uuid.UUID,
    caller: Caller = Depends(get_caller),
    db: AsyncSession = Depends(get_db),
) -> ContributionSummary:
    return await contribution_service.get_summary(item_id, caller, db)


@router.post(
    "/{item_id}/contributions",
    response_model=ContributionOut,
    status_code=status.HTTP_201_CREATED,
)
async def add_contribution(
    item_id: uuid.UUID,
    req: ContributionCreate,
    caller: Caller = Depends(get_caller),
    db: AsyncSession = Depends(get_db),
) -> ContributionOut:
    return await contribution_service.add_contribution(item_id, req, caller, db)


@router.delete(
    "/{item_id}/contributions/{contribution_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_contribution(
    item_id: uuid.UUID,
    contribution_id: uuid.UUID,
    caller: Caller = Depends(get_caller),
    db: AsyncSession = Depends(get_db),
) -> Response:
    await contribution_service.delete_contribution(item_id, contribution_id, caller, db)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
