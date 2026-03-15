from datetime import datetime
from decimal import Decimal

from sqlalchemy import Text, String, Numeric, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class UrlScrapeCache(Base):
    __tablename__ = "url_scrape_cache"

    url: Mapped[str] = mapped_column(Text, primary_key=True)
    og_title: Mapped[str | None] = mapped_column(Text, nullable=True)
    og_image: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    currency: Mapped[str | None] = mapped_column(String(3), nullable=True)
    scraped_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
