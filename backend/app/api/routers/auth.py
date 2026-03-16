"""Auth router — 9 endpoints as per 02-architecture.md §3 Auth."""

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import create_access_token, create_refresh_token
from app.models.user import User
from app.schemas.auth import (
    GuestCreateRequest,
    GuestTokenResponse,
    LoginRequest,
    RefreshResponse,
    RegisterRequest,
    TokenResponse,
    UpdateMeRequest,
    UserOut,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_COOKIE = "refresh_token"
COOKIE_PATH = "/api/v1/auth/refresh"
COOKIE_MAX_AGE = settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=token,
        httponly=True,
        secure=False,  # set True in production (HTTPS)
        samesite="lax",
        path=COOKIE_PATH,
        max_age=COOKIE_MAX_AGE,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(key=REFRESH_COOKIE, path=COOKIE_PATH)


# 1. POST /auth/register
@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    req: RegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    token_response = await auth_service.register(req, db)
    refresh_token = create_refresh_token(str(token_response.user.id))
    _set_refresh_cookie(response, refresh_token)
    return token_response


# 2. POST /auth/login
@router.post("/login", response_model=TokenResponse)
async def login(
    req: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    token_response = await auth_service.login(req, db)
    refresh_token = create_refresh_token(str(token_response.user.id))
    _set_refresh_cookie(response, refresh_token)
    return token_response


# 3. POST /auth/refresh — reads refresh_token from httpOnly cookie
@router.post("/refresh", response_model=RefreshResponse)
async def refresh(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> RefreshResponse:
    refresh_token_value = request.cookies.get(REFRESH_COOKIE)
    if not refresh_token_value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing refresh token",
        )
    new_access, new_refresh = await auth_service.refresh(refresh_token_value, db)
    _set_refresh_cookie(response, new_refresh)
    return RefreshResponse(access_token=new_access)


# 4. POST /auth/logout
@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> None:
    await auth_service.logout(db)
    _clear_refresh_cookie(response)


# 5. GET /auth/google — redirect to Google consent screen
@router.get("/google")
async def google_login() -> RedirectResponse:
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth not configured",
        )
    callback_url = f"{settings.FRONTEND_URL.rstrip('/')}/api/v1/auth/google/callback"
    google_url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={callback_url}"
        "&response_type=code"
        "&scope=openid%20email%20profile"
        "&access_type=offline"
    )
    return RedirectResponse(url=google_url)


# 6. GET /auth/google/callback — Google OAuth callback
@router.get("/google/callback")
async def google_callback(
    code: str,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth not configured",
        )
    redirect_uri = f"{settings.FRONTEND_URL.rstrip('/')}/api/v1/auth/google/callback"
    user = await auth_service.get_or_create_google_user(
        code=code,
        redirect_uri=redirect_uri,
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        db=db,
    )
    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))
    _set_refresh_cookie(response, refresh_token)
    frontend_callback = (
        f"{settings.FRONTEND_URL.rstrip('/')}/callback"
        f"?access_token={access_token}"
    )
    return RedirectResponse(url=frontend_callback)


# 7. GET /auth/me
@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(current_user)


# 8. PATCH /auth/me
@router.patch("/me", response_model=UserOut)
async def update_me(
    req: UpdateMeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    if req.display_name is not None:
        current_user.display_name = req.display_name
    if req.avatar_url is not None:
        current_user.avatar_url = req.avatar_url
    await db.commit()
    await db.refresh(current_user)
    return UserOut.model_validate(current_user)


# 9. POST /auth/guest
@router.post("/guest", response_model=GuestTokenResponse, status_code=status.HTTP_201_CREATED)
async def create_guest(
    req: GuestCreateRequest,
    db: AsyncSession = Depends(get_db),
) -> GuestTokenResponse:
    return await auth_service.create_guest(req.display_name, db)
