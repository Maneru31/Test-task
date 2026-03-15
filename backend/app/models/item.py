import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import String, Text, Boolean, Integer, Numeric, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.models import Base


class Item(Base):
    __tablename__ = "items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    list_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lists.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="RUB", nullable=False)
    is_group_fund: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    target_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
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
    wish_list: Mapped["WishList"] = relationship(  # noqa: F821
        "WishList", back_populates="items"
    )
    reservations: Mapped[list["Reservation"]] = relationship(  # noqa: F821
        "Reservation", back_populates="item", cascade="all, delete-orphan"
    )
    contributions: Mapped[list["Contribution"]] = relationship(  # noqa: F821
        "Contribution", back_populates="item", cascade="all, delete-orphan"
    )
