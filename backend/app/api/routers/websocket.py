"""WebSocket router.

Endpoint:  WS /ws/lists/{slug}?token=<access_token|guest_token>

Auth:
- No token → viewer
- Valid access token → viewer (or owner if list.owner_id == user.id)
- Valid guest token → viewer with guest identity
- Invalid token → close(4001)
- Unknown slug → close(4004)

Keepalive: client may send "ping" text, server responds with "pong".
Server sends { event: "ping" } every 30 s to detect dead connections.
"""

import asyncio
import uuid

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import verify_token
from app.models.guest_session import GuestSession
from app.models.list import WishList
from app.models.user import User
from app.services.ws_manager import manager

router = APIRouter(tags=["websocket"])

_PING_INTERVAL = 30  # seconds


@router.websocket("/ws/lists/{slug}")
async def websocket_endpoint(
    websocket: WebSocket,
    slug: str,
    token: str | None = Query(default=None),
) -> None:
    """WebSocket endpoint for real-time list updates."""

    # ------------------------------------------------------------------
    # 1. Resolve caller role (short-lived DB session, closed before WS loop)
    # ------------------------------------------------------------------
    user_id: str | None = None
    guest_id: str | None = None
    role = "viewer"

    async with AsyncSessionLocal() as db:
        # Validate slug
        list_result = await db.execute(
            select(WishList).where(WishList.public_slug == slug)
        )
        lst = list_result.scalar_one_or_none()
        if lst is None:
            await websocket.accept()
            await websocket.close(code=4004)
            return

        if token:
            # Try as JWT access token
            user_id_str = verify_token(token, token_type="access")
            if user_id_str:
                try:
                    user_result = await db.execute(
                        select(User).where(User.id == uuid.UUID(user_id_str))
                    )
                    user = user_result.scalar_one_or_none()
                    if user:
                        user_id = str(user.id)
                        if lst.owner_id == user.id:
                            role = "owner"
                    else:
                        # Token valid but user deleted — reject
                        await websocket.accept()
                        await websocket.close(code=4001)
                        return
                except Exception:
                    await websocket.accept()
                    await websocket.close(code=4001)
                    return
            else:
                # Try as guest token
                guest_result = await db.execute(
                    select(GuestSession).where(GuestSession.token == token)
                )
                guest = guest_result.scalar_one_or_none()
                if guest:
                    guest_id = str(guest.id)
                else:
                    # Token provided but invalid — reject
                    await websocket.accept()
                    await websocket.close(code=4001)
                    return

    # ------------------------------------------------------------------
    # 2. Accept and register with ConnectionManager
    # ------------------------------------------------------------------
    await websocket.accept()
    await manager.connect(
        websocket,
        slug,
        role=role,
        caller_user_id=user_id,
        caller_guest_id=guest_id,
    )

    try:
        # 3. Send "connected" event
        await websocket.send_json(
            {"event": "connected", "payload": {"viewer_role": role}}
        )

        # 4. Main loop: receive messages + periodic keepalive ping
        while True:
            try:
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=float(_PING_INTERVAL),
                )
                if data == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                # No message received within interval — send server-side ping
                try:
                    await websocket.send_json({"event": "ping"})
                except Exception:
                    break
            except WebSocketDisconnect:
                break
            except Exception:
                break
    finally:
        await manager.disconnect(websocket, slug)
