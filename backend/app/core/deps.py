"""FastAPI dependencies for auth and caller resolution."""

import uuid
from typing import Literal

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import verify_token
from app.models.guest_session import GuestSession
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Require authenticated user; raises 401 if missing or invalid."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    user_id = verify_token(credentials.credentials, token_type="access")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    result = await db.execute(
        select(User).where(User.id == uuid.UUID(user_id))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Return current user or None — never raises 401 (INV-07)."""
    if not credentials:
        return None
    user_id = verify_token(credentials.credentials, token_type="access")
    if not user_id:
        return None
    try:
        result = await db.execute(
            select(User).where(User.id == uuid.UUID(user_id))
        )
        return result.scalar_one_or_none()
    except Exception:
        return None


async def get_guest_session(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> GuestSession | None:
    """Return GuestSession from X-Guest-Token header, or None."""
    token = request.headers.get("X-Guest-Token")
    if not token:
        return None
    result = await db.execute(
        select(GuestSession).where(GuestSession.token == token)
    )
    return result.scalar_one_or_none()


CallerRole = Literal["owner", "viewer"]


class Caller:
    """Resolved caller context — either a User or a GuestSession."""

    def __init__(
        self,
        user: User | None = None,
        guest: GuestSession | None = None,
    ) -> None:
        self.user = user
        self.guest = guest

    @property
    def role(self) -> CallerRole:
        # Role is determined per-list in services; here we only track identity.
        # Default to viewer; services promote to owner when list.owner_id == user.id.
        return "viewer"

    @property
    def identity_id(self) -> str | None:
        if self.user:
            return str(self.user.id)
        if self.guest:
            return str(self.guest.id)
        return None


async def get_caller(
    user: User | None = Depends(get_optional_user),
    guest: GuestSession | None = Depends(get_guest_session),
) -> Caller:
    """
    Resolve caller from Bearer token or X-Guest-Token.
    Never raises — anonymous callers have role='viewer'.
    """
    return Caller(user=user, guest=guest)
