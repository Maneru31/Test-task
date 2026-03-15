import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import String, Text, Numeric, DateTime, ForeignKey, CheckConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.models import Base


class Contribution(Base):
    __tablename__ = "contributions"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_contributions_amount_positive"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("items.id", ondelete="CASCADE"),
        nullable=False,
    )
    contributor_user_id: Mapped[uuid.UUID | None] = mapped_column(
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
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    contributed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    item: Mapped["Item"] = relationship(  # noqa: F821
        "Item", back_populates="contributions"
    )
    contributor_user: Mapped["User | None"] = relationship(  # noqa: F821
        "User", back_populates="contributions"
    )
    guest_session: Mapped["GuestSession | None"] = relationship(  # noqa: F821
        "GuestSession", back_populates="contributions"
    )
