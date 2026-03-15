import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import update

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.api.routers import auth as auth_router
from app.api.routers import lists as lists_router
from app.api.routers import items as items_router
from app.api.routers import reservations as reservations_router
from app.api.routers import contributions as contributions_router
from app.api.routers import websocket as websocket_router
from app.api.routers import util as util_router
from app.services.ws_manager import manager

logger = logging.getLogger(__name__)

GUEST_RESERVATION_INACTIVE_DAYS = 30
CLEANUP_INTERVAL_SECONDS = 24 * 3600  # once per day


async def _release_stale_guest_reservations() -> None:
    """Release guest reservations whose guest_session.last_seen_at is >30 days ago."""
    from sqlalchemy import select
    from app.models.reservation import Reservation
    from app.models.guest_session import GuestSession

    cutoff = datetime.now(timezone.utc) - timedelta(days=GUEST_RESERVATION_INACTIVE_DAYS)
    try:
        async with AsyncSessionLocal() as db:
            stale_guest_ids_result = await db.execute(
                select(GuestSession.id).where(GuestSession.last_seen_at < cutoff)
            )
            stale_ids = [row[0] for row in stale_guest_ids_result.fetchall()]
            if not stale_ids:
                logger.info("Cleanup: no stale guest sessions found")
                return
            await db.execute(
                update(Reservation)
                .where(
                    Reservation.released_at.is_(None),
                    Reservation.guest_session_id.in_(stale_ids),
                )
                .values(released_at=datetime.now(timezone.utc))
            )
            await db.commit()
            logger.info(
                "Cleanup: released guest reservations for %d stale sessions", len(stale_ids)
            )
    except Exception as exc:
        logger.error("Cleanup: guest reservation release failed: %s", exc)


async def _cleanup_loop() -> None:
    """Background task: run guest reservation cleanup once per day."""
    while True:
        try:
            await asyncio.sleep(CLEANUP_INTERVAL_SECONDS)
            await _release_stale_guest_reservations()
        except asyncio.CancelledError:
            break
        except Exception as exc:
            # Log and keep running — do not crash the main process
            logger.error("Cleanup loop error: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Startup: connect Redis pub/sub listener + start daily cleanup task
    await manager.startup()
    cleanup_task = asyncio.create_task(_cleanup_loop(), name="guest-reservation-cleanup")
    yield
    # Shutdown
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass
    await manager.shutdown()


app = FastAPI(title="Wishify API", version="1.0.0", lifespan=lifespan)

# CORS
allowed_origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
# Support wildcard entry "*" in ALLOWED_ORIGINS for development
if "*" in allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Routers
app.include_router(auth_router.router, prefix="/api/v1")
app.include_router(lists_router.router, prefix="/api/v1")
app.include_router(items_router.router, prefix="/api/v1")
app.include_router(reservations_router.router, prefix="/api/v1")
app.include_router(contributions_router.router, prefix="/api/v1")
app.include_router(websocket_router.router, prefix="/api/v1")
app.include_router(util_router.router, prefix="/api/v1")


@app.get("/api/v1/health")
async def health() -> dict:
    from sqlalchemy import text
    import redis.asyncio as aioredis
    from app.core.database import engine

    db_status = "error"
    redis_status = "error"

    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception as exc:
        logger.error("Health check DB failed: %s", exc)

    try:
        r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        await r.ping()
        await r.aclose()
        redis_status = "ok"
    except Exception as exc:
        logger.error("Health check Redis failed: %s", exc)

    return {"status": "ok", "db": db_status, "redis": redis_status}
