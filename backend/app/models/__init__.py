from sqlalchemy.orm import declarative_base

Base = declarative_base()

# Import all models so they are registered with Base (needed for alembic)
from app.models.user import User  # noqa: F401, E402
from app.models.list import WishList  # noqa: F401, E402
from app.models.item import Item  # noqa: F401, E402
from app.models.guest_session import GuestSession  # noqa: F401, E402
from app.models.reservation import Reservation  # noqa: F401, E402
from app.models.contribution import Contribution  # noqa: F401, E402
from app.models.url_scrape_cache import UrlScrapeCache  # noqa: F401, E402
