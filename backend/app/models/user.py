import uuid
from datetime import datetime

from sqlalchemy import String, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.models import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    google_id: Mapped[str | None] = mapped_column(
        String(255), unique=True, nullable=True
    )
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
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
    lists: Mapped[list["WishList"]] = relationship(  # noqa: F821
        "WishList", back_populates="owner", cascade="all, delete-orphan"
    )
    reservations: Mapped[list["Reservation"]] = relationship(  # noqa: F821
        "Reservation", back_populates="reserver_user"
    )
    contributions: Mapped[list["Contribution"]] = relationship(  # noqa: F821
        "Contribution", back_populates="contributor_user"
    )
