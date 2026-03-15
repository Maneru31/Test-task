"""Utility endpoints: URL scraper with rate limiting."""

import logging

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.services.scraper_service import scrape_url

router = APIRouter(prefix="/util", tags=["util"])
logger = logging.getLogger(__name__)

RATE_LIMIT_MAX = 10
RATE_LIMIT_WINDOW_SECONDS = 60


class ScrapeRequest(BaseModel):
    url: str


class ScrapeResponse(BaseModel):
    title: str | None
    image_url: str | None
    price: str | None


async def _check_rate_limit(user_id: str) -> None:
    """Enforce 10 requests/minute per user via Redis counter. Fails open if Redis is down."""
    try:
        r: aioredis.Redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        async with r:
            key = f"rate:scrape:{user_id}"
            count = await r.incr(key)
            if count == 1:
                # Set TTL only on first increment so the window is fixed
                await r.expire(key, RATE_LIMIT_WINDOW_SECONDS)
            if count > RATE_LIMIT_MAX:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded: 10 requests per minute",
                )
    except HTTPException:
        raise
    except Exception as exc:
        # Redis unavailable → allow request (fail open), log warning
        logger.warning("Rate limit check skipped (Redis unavailable): %s", exc)


@router.post("/scrape", response_model=ScrapeResponse)
async def scrape_endpoint(
    body: ScrapeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ScrapeResponse:
    """Scrape OG metadata from a URL.

    - Requires authentication.
    - Rate limited: 10 requests per minute per user.
    - SSRF protected: private/loopback IPs are blocked.
    - Always returns HTTP 200; errors yield null fields.
    """
    await _check_rate_limit(str(current_user.id))
    result = await scrape_url(body.url, db)
    return ScrapeResponse(**result)
