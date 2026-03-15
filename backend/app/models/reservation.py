import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.models import Base


class Reservation(Base):
    __tablename__ = "reservations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("items.id", ondelete="CASCADE"),
        nullable=False,
    )
    reserver_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    guest_session_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("guest_sessions.id", ondelete="SET NULL"),
        nullable=True,
    )
    guest_display_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    reserved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    released_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # UNIQUE INDEX (item_id) WHERE released_at IS NULL is defined in the migration

    # Relationships
    item: Mapped["Item"] = relationship(  # noqa: F821
        "Item", back_populates="reservations"
    )
    reserver_user: Mapped["User | None"] = relationship(  # noqa: F821
        "User", back_populates="reservations"
    )
    guest_session: Mapped["GuestSession | None"] = relationship(  # noqa: F821
        "GuestSession", back_populates="reservations"
    )
