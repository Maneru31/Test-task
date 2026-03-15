import uuid
from datetime import datetime, date

from sqlalchemy import String, Text, Boolean, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.models import Base


class WishList(Base):
    __tablename__ = "lists"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    occasion: Mapped[str | None] = mapped_column(String(50), nullable=True)
    occasion_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    public_slug: Mapped[str] = mapped_column(
        String(16), unique=True, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    owner: Mapped["User"] = relationship(  # noqa: F821
        "User", back_populates="lists"
    )
    items: Mapped[list["Item"]] = relationship(  # noqa: F821
        "Item", back_populates="wish_list", cascade="all, delete-orphan"
    )
