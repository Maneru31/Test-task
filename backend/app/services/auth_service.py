"""Auth service: register, login, refresh, logout, guest, Google OAuth."""

import secrets
import uuid

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
    verify_token,
)
from app.models.guest_session import GuestSession
from app.models.user import User
from app.schemas.auth import (
    GuestTokenResponse,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserOut,
)

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


async def register(req: RegisterRequest, db: AsyncSession) -> TokenResponse:
    existing = await db.execute(select(User).where(User.email == req.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    user = User(
        id=uuid.uuid4(),
        email=req.email,
        password_hash=hash_password(req.password),
        display_name=req.display_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    access_token = create_access_token(str(user.id))
    return TokenResponse(access_token=access_token, user=UserOut.model_validate(user))


async def login(req: LoginRequest, db: AsyncSession) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    if not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    access_token = create_access_token(str(user.id))
    return TokenResponse(access_token=access_token, user=UserOut.model_validate(user))


def _make_refresh_token(user_id: str) -> str:
    return create_refresh_token(user_id)


async def refresh(refresh_token_value: str, db: AsyncSession) -> tuple[str, str]:
    """Return (new_access_token, new_refresh_token) or raise 401."""
    user_id = verify_token(refresh_token_value, token_type="refresh")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    new_access = create_access_token(str(user.id))
    new_refresh = create_refresh_token(str(user.id))
    return new_access, new_refresh


async def logout(db: AsyncSession) -> None:  # noqa: ARG001
    # Stateless JWT: no server-side revocation in this implementation.
    # Refresh token is cleared client-side (cookie removed by endpoint).
    pass


async def create_guest(display_name: str, db: AsyncSession) -> GuestTokenResponse:
    token = secrets.token_urlsafe(48)[:64]
    guest = GuestSession(
        id=uuid.uuid4(),
        display_name=display_name,
        token=token,
    )
    db.add(guest)
    await db.commit()
    return GuestTokenResponse(guest_token=token, display_name=display_name)


async def get_or_create_google_user(
    code: str,
    redirect_uri: str,
    client_id: str,
    client_secret: str,
    db: AsyncSession,
) -> User:
    """Exchange Google OAuth code for user, create account if first time."""
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
    if token_resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to exchange Google code",
        )
    google_access_token = token_resp.json().get("access_token")

    async with httpx.AsyncClient() as client:
        userinfo_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {google_access_token}"},
        )
    if userinfo_resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to fetch Google user info",
        )
    info = userinfo_resp.json()
    google_id: str = info["sub"]
    email: str = info.get("email", "")
    display_name: str = info.get("name", email.split("@")[0])
    avatar_url: str | None = info.get("picture")

    # Check existing by google_id
    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()
    if user:
        return user

    # Check existing by email
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user:
        user.google_id = google_id
        if avatar_url and not user.avatar_url:
            user.avatar_url = avatar_url
        await db.commit()
        await db.refresh(user)
        return user

    # Create new user
    user = User(
        id=uuid.uuid4(),
        email=email,
        google_id=google_id,
        display_name=display_name,
        avatar_url=avatar_url,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
