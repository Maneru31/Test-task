"""URL scraper service with SSRF protection and 24h DB cache."""

import ipaddress
import logging
import socket
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation

import httpx
from bs4 import BeautifulSoup
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.url_scrape_cache import UrlScrapeCache

logger = logging.getLogger(__name__)

# RFC 1918, loopback, link-local networks blocked for SSRF protection
_BLOCKED_NETWORKS: list[ipaddress.IPv4Network | ipaddress.IPv6Network] = [
    ipaddress.ip_network("127.0.0.0/8"),      # loopback IPv4
    ipaddress.ip_network("::1/128"),           # loopback IPv6
    ipaddress.ip_network("10.0.0.0/8"),        # RFC 1918
    ipaddress.ip_network("172.16.0.0/12"),     # RFC 1918
    ipaddress.ip_network("192.168.0.0/16"),    # RFC 1918
    ipaddress.ip_network("169.254.0.0/16"),    # link-local
    ipaddress.ip_network("fc00::/7"),          # IPv6 ULA
    ipaddress.ip_network("0.0.0.0/8"),         # "this" network
]

_BLOCKED_HOSTNAMES = frozenset({"localhost"})
_BLOCKED_SUFFIXES = (".internal", ".local", ".localdomain")

CACHE_TTL_HOURS = 24
MAX_RESPONSE_BYTES = 5 * 1024 * 1024  # 5 MB


def _is_ssrf_blocked(url: str) -> bool:
    """Return True if the URL should be blocked to prevent SSRF.

    Checks:
    1. Hostname/suffix deny-list
    2. DNS resolution → check each resolved IP against blocked networks
       (DNS rebinding protection: we check the *resolved* IP, not just hostname)
    """
    try:
        from urllib.parse import urlparse

        parsed = urlparse(url)
        hostname = parsed.hostname
        if not hostname:
            return True

        hostname_lower = hostname.lower()

        # Hostname deny-list
        if hostname_lower in _BLOCKED_HOSTNAMES:
            return True

        # Suffix deny-list
        for suffix in _BLOCKED_SUFFIXES:
            if hostname_lower.endswith(suffix):
                return True

        # Try to parse as IP directly (no DNS needed)
        try:
            ip = ipaddress.ip_address(hostname_lower)
            for network in _BLOCKED_NETWORKS:
                if ip in network:
                    return True
            return False
        except ValueError:
            pass  # Not a raw IP — proceed to DNS resolution

        # Resolve hostname and check each resulting IP (DNS rebinding protection)
        try:
            infos = socket.getaddrinfo(hostname, None)
        except OSError:
            # Cannot resolve → block to be safe
            return True

        if not infos:
            return True

        for info in infos:
            ip_str = info[4][0]
            try:
                ip = ipaddress.ip_address(ip_str)
            except ValueError:
                return True  # Unknown format → block
            for network in _BLOCKED_NETWORKS:
                if ip in network:
                    return True

        return False

    except Exception:
        return True  # Any unexpected error → block


def _parse_og(html: str) -> dict[str, str | None]:
    """Extract og:title, og:image, and price meta tags from HTML."""
    result: dict[str, str | None] = {"title": None, "image_url": None, "price": None}
    try:
        soup = BeautifulSoup(html, "html.parser")

        og_title = soup.find("meta", property="og:title")
        if og_title and og_title.get("content"):  # type: ignore[union-attr]
            result["title"] = str(og_title["content"])[:500]  # type: ignore[index]

        og_image = soup.find("meta", property="og:image")
        if og_image and og_image.get("content"):  # type: ignore[union-attr]
            result["image_url"] = str(og_image["content"])[:1000]  # type: ignore[index]

        # Try common price meta tags (best-effort)
        price_attrs = [
            {"property": "product:price:amount"},
            {"name": "price"},
            {"itemprop": "price"},
        ]
        for attrs in price_attrs:
            tag = soup.find("meta", attrs)
            if tag and tag.get("content"):  # type: ignore[union-attr]
                raw = str(tag["content"]).replace(",", ".").strip()  # type: ignore[index]
                try:
                    Decimal(raw)  # validate
                    result["price"] = raw
                except InvalidOperation:
                    pass
                break

    except Exception as exc:
        logger.debug("OG parse error: %s", exc)

    return result


async def scrape_url(url: str, db: AsyncSession) -> dict[str, str | None]:
    """Scrape OG metadata from a URL with SSRF protection and 24h DB cache.

    Contract: always returns HTTP 200. On any error → all fields are None.
    """
    empty: dict[str, str | None] = {"title": None, "image_url": None, "price": None}

    # 1. SSRF protection — check before any network I/O
    if _is_ssrf_blocked(url):
        logger.info("Scraper: SSRF blocked URL: %s", url)
        return empty

    # 2. Check DB cache (24h TTL)
    cache_result = await db.execute(
        select(UrlScrapeCache).where(UrlScrapeCache.url == url)
    )
    cached: UrlScrapeCache | None = cache_result.scalar_one_or_none()

    if cached is not None:
        scraped_at = cached.scraped_at
        if scraped_at.tzinfo is None:
            scraped_at = scraped_at.replace(tzinfo=timezone.utc)
        age = datetime.now(timezone.utc) - scraped_at
        if age < timedelta(hours=CACHE_TTL_HOURS):
            return {
                "title": cached.og_title,
                "image_url": cached.og_image,
                "price": str(cached.price) if cached.price is not None else None,
            }

    # 3. Fetch URL with streaming (limits response size)
    html = ""
    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=10.0,
            headers={"User-Agent": "Wishify/1.0"},
        ) as client:
            async with client.stream("GET", url) as response:
                if response.status_code >= 400:
                    logger.info("Scraper: HTTP %s for %s", response.status_code, url)
                    return empty
                chunks: list[bytes] = []
                total = 0
                async for chunk in response.aiter_bytes(chunk_size=65536):
                    total += len(chunk)
                    if total > MAX_RESPONSE_BYTES:
                        logger.info("Scraper: response too large for %s, truncating", url)
                        break
                    chunks.append(chunk)
                html = b"".join(chunks).decode("utf-8", errors="replace")
    except Exception as exc:
        logger.info("Scraper: fetch failed for %s: %s", url, exc)
        return empty

    # 4. Parse OG tags
    parsed = _parse_og(html)

    # 5. Upsert cache
    try:
        now = datetime.now(timezone.utc)
        price_decimal: Decimal | None = (
            Decimal(parsed["price"]) if parsed["price"] is not None else None
        )
        if cached is not None:
            cached.og_title = parsed["title"]
            cached.og_image = parsed["image_url"]
            cached.price = price_decimal
            cached.scraped_at = now
        else:
            entry = UrlScrapeCache(
                url=url,
                og_title=parsed["title"],
                og_image=parsed["image_url"],
                price=price_decimal,
                scraped_at=now,
            )
            db.add(entry)
        await db.commit()
    except Exception as exc:
        logger.warning("Scraper: cache upsert failed for %s: %s", url, exc)
        await db.rollback()

    return parsed
