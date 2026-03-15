"""WebSocket connection manager with Redis pub/sub backend.

Architecture:
- Each worker subscribes to Redis pub/sub channels (one per unique slug with active WS connections).
- REST services call manager.publish(slug, event) AFTER session.commit() (INV-04).
- Redis broadcasts the event to all workers; each worker dispatches to its local WS connections.
- build_payload() filters the event per-connection based on caller role (INV-06).
"""

import asyncio
import json
import logging
from dataclasses import dataclass, field

import redis.asyncio as aioredis
from fastapi import WebSocket

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class _Connection:
    ws: WebSocket
    role: str  # "owner" | "viewer"
    caller_user_id: str | None
    caller_guest_id: str | None


class ConnectionManager:
    """Manages WebSocket connections grouped by list slug.

    Lifecycle:
      - Call startup() once at application startup (FastAPI lifespan).
      - Call shutdown() once at application shutdown.
    """

    def __init__(self) -> None:
        # slug → list of active connections
        self._connections: dict[str, list[_Connection]] = {}
        self._redis: aioredis.Redis | None = None
        self._pubsub: aioredis.client.PubSub | None = None
        self._listener_task: asyncio.Task | None = None  # type: ignore[type-arg]

    async def startup(self) -> None:
        """Connect to Redis and start the pub/sub listener background task."""
        try:
            self._redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
            self._pubsub = self._redis.pubsub()
            self._listener_task = asyncio.create_task(self._listen(), name="ws-redis-listener")
            logger.info("WS manager: Redis connected, listener started")
        except Exception as exc:
            logger.error("WS manager: failed to connect to Redis: %s", exc)

    async def shutdown(self) -> None:
        """Cancel listener and close Redis connections."""
        if self._listener_task and not self._listener_task.done():
            self._listener_task.cancel()
            try:
                await self._listener_task
            except asyncio.CancelledError:
                pass
        if self._pubsub:
            try:
                await self._pubsub.aclose()
            except Exception:
                pass
        if self._redis:
            try:
                await self._redis.aclose()
            except Exception:
                pass

    # ------------------------------------------------------------------
    # Connection management
    # ------------------------------------------------------------------

    async def connect(
        self,
        ws: WebSocket,
        slug: str,
        role: str,
        caller_user_id: str | None = None,
        caller_guest_id: str | None = None,
    ) -> None:
        """Register a new WebSocket connection. The caller must accept() the WS first."""
        conn = _Connection(
            ws=ws,
            role=role,
            caller_user_id=caller_user_id,
            caller_guest_id=caller_guest_id,
        )
        if slug not in self._connections:
            self._connections[slug] = []
            # Subscribe to Redis channel for this slug
            if self._pubsub is not None:
                try:
                    await self._pubsub.subscribe(f"list:{slug}")
                except Exception as exc:
                    logger.error("WS manager: failed to subscribe list:%s: %s", slug, exc)
        self._connections[slug].append(conn)

    async def disconnect(self, ws: WebSocket, slug: str) -> None:
        """Remove a WebSocket connection and unsubscribe from Redis if no connections remain."""
        if slug not in self._connections:
            return
        self._connections[slug] = [c for c in self._connections[slug] if c.ws is not ws]
        if not self._connections[slug]:
            del self._connections[slug]
            if self._pubsub is not None:
                try:
                    await self._pubsub.unsubscribe(f"list:{slug}")
                except Exception as exc:
                    logger.error("WS manager: failed to unsubscribe list:%s: %s", slug, exc)

    # ------------------------------------------------------------------
    # Publishing (called by REST services after session.commit())
    # ------------------------------------------------------------------

    async def publish(self, slug: str, event: dict) -> None:  # type: ignore[type-arg]
        """Publish an event to all subscribers of this list slug via Redis.

        Must be called AFTER session.commit() — never before (INV-04).
        Fails silently if Redis is unavailable so REST remains unaffected.
        """
        if self._redis is None:
            return
        try:
            await self._redis.publish(f"list:{slug}", json.dumps(event, default=str))
        except Exception as exc:
            logger.warning("WS manager: publish failed for list:%s: %s", slug, exc)

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    async def _listen(self) -> None:
        """Background task: read Redis pub/sub messages and dispatch to WS clients."""
        if self._pubsub is None:
            return
        try:
            async for message in self._pubsub.listen():
                if message["type"] != "message":
                    continue
                channel: str = message["channel"]
                if not channel.startswith("list:"):
                    continue
                slug = channel[5:]  # strip "list:" prefix
                try:
                    data: dict = json.loads(message["data"])  # type: ignore[type-arg]
                except (json.JSONDecodeError, Exception):
                    continue
                await self._dispatch(slug, data)
        except asyncio.CancelledError:
            pass
        except Exception as exc:
            logger.error("WS manager: listener crashed: %s", exc)

    async def _dispatch(self, slug: str, event: dict) -> None:  # type: ignore[type-arg]
        """Send the filtered event payload to every connection on this slug."""
        conns = list(self._connections.get(slug, []))
        dead: list[_Connection] = []
        for conn in conns:
            payload = build_payload(
                event,
                role=conn.role,
                caller_user_id=conn.caller_user_id,
                caller_guest_id=conn.caller_guest_id,
            )
            try:
                await conn.ws.send_json(payload)
            except Exception:
                dead.append(conn)
        for conn in dead:
            await self.disconnect(conn.ws, slug)


# ---------------------------------------------------------------------------
# Role-based payload filter (INV-01, INV-06)
# ---------------------------------------------------------------------------

def build_payload(
    event: dict,  # type: ignore[type-arg]
    role: str,
    caller_user_id: str | None,
    caller_guest_id: str | None,
) -> dict:  # type: ignore[type-arg]
    """Return a role-filtered WS payload for one connection.

    Filtering rules (from 04-work-plan.md Этап 5):
    - item_id, is_reserved, total_contributed, contribution_count  → both roles
    - reserved_by_me, reserver_name                               → viewer only
    - contributor_name                                             → never
    - my_contributions                                             → viewer only, own entries
    """
    event_type = event.get("event", "unknown")

    if event_type == "reservation.changed":
        inner: dict = {  # type: ignore[type-arg]
            "item_id": event.get("item_id"),
            "is_reserved": event.get("is_reserved"),
        }
        if role == "viewer":
            reserved_by_me = False
            if event.get("is_reserved"):
                if caller_user_id and event.get("reserver_user_id") == caller_user_id:
                    reserved_by_me = True
                elif caller_guest_id and event.get("guest_session_id") == caller_guest_id:
                    reserved_by_me = True
            inner["reserved_by_me"] = reserved_by_me
            inner["reserver_name"] = event.get("reserver_name") if event.get("is_reserved") else None
        return {"event": event_type, "payload": inner}

    if event_type == "contribution.added":
        inner = {
            "item_id": event.get("item_id"),
            "total_contributed": event.get("total_contributed"),
            "contribution_count": event.get("contribution_count"),
        }
        if role == "viewer":
            is_mine = (
                (caller_user_id and event.get("contributor_user_id") == caller_user_id)
                or (caller_guest_id and event.get("guest_session_id") == caller_guest_id)
            )
            if is_mine:
                inner["my_contribution"] = {
                    "id": event.get("contribution_id"),
                    "amount": event.get("amount"),
                    "note": event.get("note"),
                    "contributed_at": event.get("contributed_at"),
                }
        return {"event": event_type, "payload": inner}

    if event_type == "contribution.removed":
        inner = {
            "item_id": event.get("item_id"),
            "total_contributed": event.get("total_contributed"),
            "contribution_count": event.get("contribution_count"),
        }
        if role == "viewer":
            is_mine = (
                (caller_user_id and event.get("contributor_user_id") == caller_user_id)
                or (caller_guest_id and event.get("guest_session_id") == caller_guest_id)
            )
            if is_mine:
                inner["removed_contribution_id"] = event.get("contribution_id")
        return {"event": event_type, "payload": inner}

    # item.created, item.updated, item.deleted, item.reordered, list.updated
    # — no sensitive data; pass through inner fields directly
    return {
        "event": event_type,
        "payload": {k: v for k, v in event.items() if k != "event"},
    }


# Singleton used throughout the application
manager = ConnectionManager()
