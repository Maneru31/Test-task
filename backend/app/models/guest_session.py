import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.models import Base


class GuestSession(Base):
    __tablename__ = "guest_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    reservations: Mapped[list["Reservation"]] = relationship(  # noqa: F821
        "Reservation", back_populates="guest_session"
    )
    contributions: Mapped[list["Contribution"]] = relationship(  # noqa: F821
        "Contribution", back_populates="guest_session"
    )
