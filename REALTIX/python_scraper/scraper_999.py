#!/usr/bin/env python3
"""
REALTIX 999.md scraper — profesional, adaptat la schema scraped_listings.

Folosește Selenium + Firefox headless ca să execute JS-ul aplicației Next.js
de pe 999.md (datele NU sunt în HTML inițial — sunt încărcate client-side).

Acoperă toate cele 6 subcategorii imobiliare și extrage:
  - titlu, ID extern, URL
  - preț + valută
  - suprafață, camere
  - oraș, sector
  - galerie completă fotografii (CDN simpalsmedia)
  - telefon (click-to-reveal cu fallback regex)
  - descriere
  - tip imobil + tip tranzacție (sale/rent dedus din offer_type)
  - owner_type (proprietar / agenție)

Scrie direct în baza REALTIX SQLite (`database/database.sqlite`) cu deduplicare
pe (source='999md', external_id).

Setup:
  pip install -r requirements.txt
  Asigură-te că Firefox + geckodriver sunt instalate. Pe Windows:
    https://github.com/mozilla/geckodriver/releases
    Pune geckodriver.exe în PATH (sau în folderul scraper-ului).

Utilizare:
  python scraper_999.py                   # default 2 pagini per categorie, headless
  python scraper_999.py --pages 5         # 5 pagini per categorie
  python scraper_999.py --max-ads 50      # oprește după 50 anunțuri
  python scraper_999.py --no-headless     # vezi browserul (debug)
  python scraper_999.py --category apartments-and-rooms  # doar o categorie

Apelat din Laravel:
  php artisan portal:999:scrape
"""
from __future__ import annotations

import argparse
import json
import os
import random
import re
import sqlite3
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

# Force UTF-8 on Windows so emoji + diacritics in print() don't crash cp1252
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.common.exceptions import (
    ElementClickInterceptedException,
    NoSuchElementException,
    TimeoutException,
    WebDriverException,
)
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options as FirefoxOptions
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

# ── Config ────────────────────────────────────────────────────────────────────
BASE_URL = "https://999.md"
CDN_PREFIX = "https://i.simpalsmedia.com/999.md/"

# Local image storage (relative to REALTIX storage/app/public)
IMAGES_DIR = Path(__file__).resolve().parent.parent / "storage" / "app" / "public" / "scraped"

# Global flag: fast bulk mode disables expensive UI interactions
_FAST_MODE = False
_DOWNLOAD_IMAGES = False
_TODAY_ONLY = False

CATEGORIES = [
    {"slug": "apartments-and-rooms",   "type": "apartment",  "transaction_type": "sale", "label": "Apartamente"},
    {"slug": "house-and-garden",       "type": "house",      "transaction_type": "sale", "label": "Case"},
    {"slug": "cottage",                "type": "house",      "transaction_type": "sale", "label": "Cabane/vile"},
    {"slug": "land",                   "type": "land",       "transaction_type": "sale", "label": "Terenuri"},
    {"slug": "commercial-real-estate", "type": "commercial", "transaction_type": "sale", "label": "Comercial"},
    {"slug": "garages-and-parking",    "type": "commercial", "transaction_type": "sale", "label": "Garaje/parcări"},
]

REALTIX_DB_DEFAULT = Path(__file__).resolve().parent.parent / "database" / "database.sqlite"
DEFAULT_AGENCY_ID = 1


# ── Driver ────────────────────────────────────────────────────────────────────
def make_driver(headless: bool = True) -> webdriver.Firefox:
    opts = FirefoxOptions()
    if headless:
        opts.add_argument("--headless")
    # Skip image downloads to speed up — we only need URLs from DOM
    opts.set_preference("permissions.default.image", 2)
    opts.set_preference("dom.popup_maximum", 0)
    opts.set_preference(
        "general.useragent.override",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 REALTIX-Scraper/1.0",
    )

    try:
        return webdriver.Firefox(options=opts)
    except WebDriverException as e:
        print(f"[FATAL] Firefox failed to start: {e}", file=sys.stderr)
        print("  Asigură-te că Firefox + geckodriver sunt instalate și în PATH.", file=sys.stderr)
        raise


# ── Recent-cache: skip URLs updated in last N hours ──────────────────────────
def get_recently_updated_ids(conn: sqlite3.Connection, hours: int = 4) -> set[str]:
    """IDs whose row was updated_at within the last N hours — skip refetching."""
    cur = conn.execute(
        "SELECT external_id FROM scraped_listings "
        "WHERE source = '999md' AND updated_at >= datetime('now', ?)",
        (f"-{hours} hours",),
    )
    return {row[0] for row in cur.fetchall()}


# ── List page → ad URLs ───────────────────────────────────────────────────────
def collect_ad_urls(driver, category_slug: str, max_pages: int | None = 2) -> list[str]:
    """Return unique ad URLs from a category, paginated.

    If max_pages is None, paginate until no new ads are found on a page (end of results).
    """
    urls: set[str] = set()
    base = f"{BASE_URL}/ro/list/real-estate/{category_slug}"

    page = 1
    consecutive_empty = 0

    while True:
        if max_pages is not None and page > max_pages:
            break

        url = base + (f"?page={page}" if page > 1 else "")
        prev_count = len(urls)

        try:
            driver.get(url)
            wait_secs = 6 if _FAST_MODE else 12
            try:
                WebDriverWait(driver, wait_secs).until(
                    lambda d: re.search(r'href="/ro/\d{6,}', d.page_source)
                )
            except TimeoutException:
                pass
            if _FAST_MODE:
                time.sleep(random.uniform(0.8, 1.5))
            else:
                time.sleep(random.uniform(2.0, 3.5))

            soup = BeautifulSoup(driver.page_source, "html.parser")
            for a in soup.find_all("a", href=True):
                href = a["href"]
                m = re.match(r"^/ro/(\d{6,})(?:[/?].*)?$", href)
                if m:
                    urls.add(f"{BASE_URL}/ro/{m.group(1)}")

            new_on_page = len(urls) - prev_count
            print(f"    page {page}: +{new_on_page} new (cumulative {len(urls)})")

            if not urls and page == 1:
                print(f"    [warn] no ads found on first page — possible block or selector change")
                break

            # In unlimited mode, stop after 2 consecutive pages with no new ads
            if max_pages is None:
                if new_on_page == 0:
                    consecutive_empty += 1
                    if consecutive_empty >= 2:
                        print(f"    [end] reached end of results at page {page}")
                        break
                else:
                    consecutive_empty = 0

            # Hard safety cap even in unlimited mode
            if page >= 200:
                print(f"    [safety] hit 200-page cap")
                break

            page += 1

        except Exception as e:
            print(f"    [error] page {page}: {e}")
            break

    return sorted(urls)


# ── Detail page → structured ad data ──────────────────────────────────────────
PHONE_PATTERN_MD = re.compile(r"(?:\+?373\s?\d{8}|\b0\d{8}\b)")
PRICE_DIGITS = re.compile(r"\d[\d\s]*\d|\d")
NUMERIC_RE = re.compile(r"\d+(?:[.,]\d+)?")


def extract_ad(driver, url: str) -> dict | None:
    m = re.search(r"/ro/(\d+)", url)
    if not m:
        return None
    external_id = m.group(1)

    try:
        driver.get(url)
    except Exception as e:
        print(f"      driver.get failed: {e}")
        return None

    # Wait for either the H1 or 10 seconds (shorter in fast mode)
    wait_secs = 5 if _FAST_MODE else 10
    try:
        WebDriverWait(driver, wait_secs).until(EC.presence_of_element_located((By.TAG_NAME, "h1")))
    except TimeoutException:
        pass

    if _FAST_MODE:
        # Minimal wait, no scroll, no clicks → fast bulk
        time.sleep(random.uniform(0.2, 0.4))
    else:
        time.sleep(random.uniform(0.8, 1.4))
        _trigger_lazyload(driver)
        _try_reveal_phone(driver)
        _try_open_gallery(driver)

    soup = BeautifulSoup(driver.page_source, "html.parser")

    # Parse any JSON-LD structured data (often holds price, area, rooms cleanly)
    json_ld = _parse_json_ld(soup)

    # Title
    title = _extract_title(soup, json_ld)

    # Price + currency (with json-ld fallback)
    price, currency = _extract_price(soup, json_ld)

    # Images
    images = _extract_images(soup, json_ld)

    # Phone
    phone = _extract_phone(soup)

    # Description
    description = _extract_description(soup, json_ld)

    # Location (city, district) — title is the canonical source on 999.md
    city, district = _location_from_title(title) or _extract_location(soup, json_ld)

    # Structured label-value features (most reliable for 999.md)
    feature_pairs = _parse_feature_pairs(soup)
    features_text = _flatten_features(soup)

    # Pull values directly from structured pairs first
    area  = _from_pairs_area(feature_pairs)  or _extract_area(features_text, json_ld)
    rooms = _from_pairs_rooms(feature_pairs) or _extract_rooms(features_text, json_ld)
    floor = _from_pairs_floor(feature_pairs)
    floors_total = _from_pairs_floors_total(feature_pairs)
    if floor is None or floors_total is None:
        f2, ft2 = _extract_floor(features_text, json_ld)
        floor = floor or f2
        floors_total = floors_total or ft2
    year_built    = _from_pairs_year(feature_pairs)         or _extract_year_built(features_text)
    condition     = _from_pairs_condition(feature_pairs)    or _extract_condition(features_text)
    building_type = _from_pairs_building(feature_pairs)     or _extract_building_type(features_text)
    heating       = _from_pairs_heating(feature_pairs)      or _extract_heating(features_text)
    amenities     = _amenities_from_pairs(feature_pairs)
    # Merge legacy text-based amenities for fields still null
    legacy_amenities = _extract_amenities(features_text, soup)
    for k, v in legacy_amenities.items():
        if amenities.get(k) is None:
            amenities[k] = v

    # Address (street): structured pairs > JSON-LD > none
    address = _from_pairs_address(feature_pairs)
    if not address and json_ld:
        addr = _json_ld_find(json_ld, "address")
        if isinstance(addr, dict):
            address = addr.get("streetAddress")

    # Published_at — try to read from JSON-LD or detail page
    published_at = None
    if json_ld:
        pub = _json_ld_find(json_ld, "datePosted", "datePublished")
        if pub:
            try:
                published_at = datetime.fromisoformat(str(pub).replace("Z", "+00:00"))
            except (ValueError, TypeError):
                pass

    # Owner type detection: "Persoană fizică" vs agency
    owner_type = _detect_owner_type(soup)

    # Transaction type from breadcrumb (most reliable) → fallback to text heuristic
    transaction_type_override = (
        _detect_transaction_type_from_breadcrumb(soup)
        or _detect_transaction_type(soup, features_text)
    )

    # Download images locally if requested
    if _DOWNLOAD_IMAGES and images:
        local_paths = []
        for idx, img_url in enumerate(images[:30], start=1):
            local = _download_image(img_url, external_id, idx)
            if local:
                local_paths.append(local)
        # Replace remote URLs with local relative paths
        if local_paths:
            images = local_paths

    return {
        "external_id":              external_id,
        "external_url":             url,
        "title":                    title,
        "price":                    price,
        "currency":                 currency,
        "area":                     area,
        "rooms":                    rooms,
        "floor":                    floor,
        "floors_total":             floors_total,
        "year_built":               year_built,
        "condition":                condition,
        "building_type":            building_type,
        "heating":                  heating,
        "city":                     city,
        "district":                 district,
        "address":                  address,
        "images":                   images,
        "phone":                    phone,
        "description":              description,
        "owner_type":               owner_type,
        "published_at":             published_at,
        "transaction_type_override":transaction_type_override,
        **amenities,  # furnished/parking/balcony/elevator/pets_allowed/air_conditioning
    }


def _trigger_lazyload(driver):
    """Scroll page to trigger lazy-loaded images / features."""
    try:
        # scroll in steps, not all at once
        for ratio in (0.3, 0.6, 0.9, 0.4):
            driver.execute_script(f"window.scrollTo(0, document.body.scrollHeight * {ratio});")
            time.sleep(random.uniform(0.3, 0.6))
        driver.execute_script("window.scrollTo(0, 0);")
        time.sleep(random.uniform(0.2, 0.4))
    except Exception:
        pass


def _try_open_gallery(driver):
    """Click on gallery thumbnail/main image to expand the gallery DOM."""
    selectors = [
        '[class*="gallery"] img',
        '[class*="photo-gallery"]',
        'button[class*="show-all"]',
        'a[class*="all-photos"]',
        '[data-testid*="gallery"]',
    ]
    for sel in selectors[:2]:  # stop early to keep it fast
        try:
            elements = driver.find_elements(By.CSS_SELECTOR, sel)
            for el in elements[:1]:
                try:
                    driver.execute_script("arguments[0].click();", el)
                    time.sleep(0.5)
                    break
                except Exception:
                    continue
        except Exception:
            continue


def _parse_json_ld(soup: BeautifulSoup) -> list[dict]:
    """Extract all <script type='application/ld+json'> blocks as parsed JSON."""
    out: list[dict] = []
    for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
        raw = script.string or script.get_text() or ""
        if not raw.strip():
            continue
        try:
            data = json.loads(raw)
            if isinstance(data, list):
                out.extend(d for d in data if isinstance(d, dict))
            elif isinstance(data, dict):
                out.append(data)
        except (json.JSONDecodeError, ValueError):
            continue
    return out


def _json_ld_find(json_ld: list[dict], *keys, types: tuple[str, ...] = ()) -> object | None:
    """Search through JSON-LD blocks for the first matching key, optionally constrained by @type."""
    for block in json_ld:
        # If types filter is set, skip non-matching @type
        if types:
            block_type = block.get("@type", "")
            if isinstance(block_type, list):
                if not any(t in types for t in block_type):
                    continue
            elif block_type not in types:
                continue
        for k in keys:
            if k in block:
                return block[k]
        # Try nested 'offers' for products
        if isinstance(block.get("offers"), dict):
            for k in keys:
                if k in block["offers"]:
                    return block["offers"][k]
    return None


# ── Detail extractors ─────────────────────────────────────────────────────────
def _extract_title(soup: BeautifulSoup, json_ld: list[dict] | None = None) -> str:
    if json_ld:
        v = _json_ld_find(json_ld, "name", "headline")
        if isinstance(v, str) and len(v.strip()) >= 3:
            return v.strip()
    h1 = soup.find("h1")
    if h1 and len(h1.get_text(strip=True)) >= 3:
        return h1.get_text(strip=True)
    og = soup.find("meta", property="og:title")
    if og and og.get("content"):
        return og["content"].replace(" pe 999.md", "").strip()
    return "Anunț 999.md"


def _extract_price(soup: BeautifulSoup, json_ld: list[dict] | None = None) -> tuple[float | None, str]:
    """Look for price in JSON-LD first, then in elements with class 'price'."""
    # JSON-LD path (most reliable)
    if json_ld:
        price_v = _json_ld_find(json_ld, "price")
        cur_v = _json_ld_find(json_ld, "priceCurrency", "currency")
        if price_v is not None:
            try:
                price = float(str(price_v).replace(",", ""))
                cur = str(cur_v).upper() if cur_v else "EUR"
                if cur in ("EUR", "USD", "MDL"):
                    return price, cur
            except (ValueError, TypeError):
                pass

    candidates: list[str] = []
    for el in soup.find_all(attrs={"class": re.compile(r"price", re.IGNORECASE)}):
        text = el.get_text(separator=" ", strip=True)
        if not text:
            continue
        if any(s in text.lower() for s in ["€", "eur", "$", "usd", "lei", "mdl"]):
            if re.search(r"\d{2,}", text):
                candidates.append(text)

    candidates.sort(key=lambda t: len(re.sub(r"[^\d]", "", t)), reverse=True)

    if not candidates:
        return None, "EUR"

    text = candidates[0]
    digits = re.sub(r"[^\d]", "", text)
    price = float(digits) if digits else None

    currency = "EUR"
    low = text.lower()
    if "$" in text or "usd" in low:
        currency = "USD"
    elif "lei" in low or "mdl" in low:
        currency = "MDL"
    elif "€" in text or "eur" in low:
        currency = "EUR"

    return price, currency


def _extract_images(soup: BeautifulSoup, json_ld: list[dict] | None = None) -> list[str]:
    """Collect unique image URLs: JSON-LD `image` array, og:image, then all <img>/<source> simpalsmedia."""
    seen: set[str] = set()
    images: list[str] = []

    def add(url: str):
        clean = url.split("?")[0]
        if clean.startswith("//"):
            clean = "https:" + clean
        if clean and "simpalsmedia" in clean and clean not in seen:
            seen.add(clean)
            images.append(clean)

    # 1. JSON-LD image field (often the cleanest source)
    if json_ld:
        for block in json_ld:
            img = block.get("image")
            if isinstance(img, str):
                add(img)
            elif isinstance(img, list):
                for x in img:
                    if isinstance(x, str):
                        add(x)
                    elif isinstance(x, dict) and isinstance(x.get("url"), str):
                        add(x["url"])
            elif isinstance(img, dict) and isinstance(img.get("url"), str):
                add(img["url"])

    # 2. og:image
    og_img = soup.find("meta", property="og:image")
    if og_img and og_img.get("content"):
        add(og_img["content"])

    # 3. All <img> and <source> tags pointing to simpalsmedia /board
    for img in soup.find_all(["img", "source"]):
        for attr in ("src", "data-src", "data-lazy-src", "srcset", "data-srcset"):
            v = img.get(attr) or ""
            for piece in v.split(","):
                token = piece.strip().split(" ")[0]
                if "simpalsmedia.com" in token and "/board" in token:
                    add(token)

    # 4. Inline style url(...) backgrounds
    for el in soup.find_all(style=re.compile(r"url\([^)]*simpalsmedia")):
        m = re.search(r"url\(['\"]?([^)'\"]+simpalsmedia[^)'\"]+)['\"]?\)", el.get("style", ""))
        if m:
            add(m.group(1))

    return images[:30]  # cap at 30


def _extract_phone(soup: BeautifulSoup) -> str | None:
    # Search anywhere in the page — phone reveal click should have made it visible
    text = soup.get_text(" ", strip=True)
    m = PHONE_PATTERN_MD.search(text)
    if m:
        return re.sub(r"\s+", "", m.group())

    # tel: links sometimes contain the number even when hidden visually
    for a in soup.find_all("a", href=True):
        if a["href"].startswith("tel:"):
            num = re.sub(r"[^\d+]", "", a["href"][4:])
            if len(num) >= 8:
                return num
    return None


def _extract_description(soup: BeautifulSoup, json_ld: list[dict] | None = None) -> str | None:
    if json_ld:
        v = _json_ld_find(json_ld, "description", "articleBody")
        if isinstance(v, str) and len(v.strip()) >= 30:
            return v.strip()[:5000]

    desc_el = soup.find(attrs={"class": re.compile(r"description|advert-text|content-description", re.IGNORECASE)})
    if desc_el:
        text = desc_el.get_text("\n", strip=True)
        if len(text) >= 30:
            return text[:5000]

    og = soup.find("meta", property="og:description")
    if og and og.get("content"):
        return og["content"].strip()[:5000]

    return None


def _location_from_title(title: str | None) -> tuple[str, str | None] | None:
    # 999.md canonical title format: "TYPE[+rooms], [SECTOR], CITY, RAION"
    # Returns (city, district) where district = sector when present.
    if not title:
        return None
    parts = [p.strip() for p in title.split(",") if p.strip()]
    n = len(parts)
    if n < 3:
        return None
    city   = parts[n - 2]
    sector = parts[n - 3] if n >= 4 else None
    # First part is TYPE (Apartament/Casă/Teren/...) — never a sector
    if sector and re.match(r"^(apartament|cas[ăa]|teren|garaj|spa[țt]iu|vil[ăa]|cabana|cot[ăa]|biro?u)", sector, re.I):
        sector = None
    return city, sector


def _extract_location(soup: BeautifulSoup, json_ld: list[dict] | None = None) -> tuple[str, str | None]:
    # JSON-LD address
    if json_ld:
        addr = _json_ld_find(json_ld, "address")
        if isinstance(addr, dict):
            city = addr.get("addressLocality") or addr.get("addressRegion")
            district = addr.get("streetAddress") or addr.get("addressArea")
            if city:
                return str(city), str(district) if district else None
        elif isinstance(addr, str) and addr:
            parts = [p.strip() for p in addr.split(",") if p.strip()]
            if parts:
                return parts[0], (parts[1] if len(parts) > 1 else None)

    for el in soup.find_all(attrs={"class": re.compile(r"location|address|geo", re.IGNORECASE)}):
        text = el.get_text(", ", strip=True)
        if not text or len(text) > 200:
            continue
        parts = [p.strip() for p in text.split(",") if p.strip()]
        if parts:
            city = parts[0] or "Chișinău"
            district = parts[1] if len(parts) > 1 else None
            return city, district
    return "Chișinău", None


def _flatten_features(soup: BeautifulSoup) -> str:
    chunks: list[str] = []
    for el in soup.find_all(attrs={"class": re.compile(r"feature|spec|param|detail|characteristic", re.IGNORECASE)}):
        chunks.append(el.get_text(" ", strip=True))
    return " ".join(chunks).lower()


def _parse_feature_pairs(soup: BeautifulSoup) -> dict[str, str]:
    """
    Parse 999.md detail page features block into a dict {label: value}.
    Layout is "Label | Value | Label | Value | ..." inside div[class*=feature].
    Returns lowercased keys for easy matching.
    """
    pairs: dict[str, str] = {}
    for container in soup.find_all(attrs={"class": re.compile(r"feature|spec|characteristic", re.IGNORECASE)}):
        text = container.get_text("|", strip=True)
        if not text or len(text) < 20 or len(text) > 5000:
            continue
        items = [t.strip() for t in text.split("|") if t.strip()]
        # Skip the leading "Caracteristici" header if present
        if items and items[0].lower() in ("caracteristici", "характеристики", "characteristics"):
            items = items[1:]
        # Pair adjacent items as (label, value)
        for i in range(0, len(items) - 1, 2):
            label = items[i].lower().rstrip(":").strip()
            value = items[i + 1].strip()
            if label and value and label not in pairs:
                pairs[label] = value
    return pairs


def _extract_area(features_text: str, json_ld: list[dict] | None = None) -> float | None:
    # JSON-LD: floorSize.value or area
    if json_ld:
        for block in json_ld:
            fs = block.get("floorSize")
            if isinstance(fs, dict) and fs.get("value"):
                try:
                    return float(str(fs["value"]).replace(",", "."))
                except (ValueError, TypeError):
                    pass
            for k in ("area", "size"):
                v = block.get(k)
                if isinstance(v, (int, float)):
                    return float(v)
                if isinstance(v, str):
                    m = re.search(r"\d+(?:[.,]\d+)?", v)
                    if m:
                        try:
                            return float(m.group().replace(",", "."))
                        except ValueError:
                            pass

    # Text patterns: "75 m²" / "75 m2" / "75m2" / "Suprafața: 75"
    patterns = [
        r"(\d+(?:[.,]\d+)?)\s*m\s*[²2]",
        r"suprafa[țt][ăa][:\s]+(\d+(?:[.,]\d+)?)",
        r"общая\s+площадь[:\s]+(\d+(?:[.,]\d+)?)",
    ]
    for pat in patterns:
        m = re.search(pat, features_text, re.IGNORECASE)
        if m:
            try:
                val = float(m.group(1).replace(",", "."))
                if 5 <= val <= 99999:  # sanity range for real estate area
                    return val
            except ValueError:
                continue
    return None


def _extract_rooms(features_text: str, json_ld: list[dict] | None = None) -> int | None:
    # JSON-LD: numberOfRooms
    if json_ld:
        for block in json_ld:
            v = block.get("numberOfRooms")
            if isinstance(v, (int, float)):
                return int(v)
            if isinstance(v, str):
                m = re.search(r"\d+", v)
                if m:
                    return int(m.group())

    # Text patterns
    for pat in [
        r"(\d)\s*[\-–]?\s*camer",
        r"(\d)\s*[\-–]?\s*комнат",
        r"(\d)\s*[\-–]?\s*rooms?",
        r"camere[:\s]+(\d)",
        r"количество\s+комнат[:\s]+(\d)",
    ]:
        m = re.search(pat, features_text, re.IGNORECASE)
        if m:
            try:
                n = int(m.group(1))
                if 1 <= n <= 20:  # sanity
                    return n
            except ValueError:
                continue
    return None


# ── Structured pair extractors (preferred when 999.md provides label/value) ──
def _pair_match(pairs: dict, *keywords: str) -> str | None:
    """Find the value in pairs whose label contains any of the keywords (case-insensitive)."""
    for key, val in pairs.items():
        for kw in keywords:
            if kw in key:
                return val
    return None


def _from_pairs_area(pairs: dict) -> float | None:
    v = _pair_match(pairs, "suprafa", "площад")
    if not v: return None
    m = re.search(r"\d+(?:[.,]\d+)?", v)
    if m:
        try:
            n = float(m.group().replace(",", "."))
            if 5 <= n <= 99999:
                return n
        except ValueError: pass
    return None


def _from_pairs_rooms(pairs: dict) -> int | None:
    v = _pair_match(pairs, "număr de camere", "număr camere", "число комнат", "количество комнат", "rooms")
    if not v: return None
    m = re.search(r"\d+", v)
    if m:
        try:
            n = int(m.group())
            if 1 <= n <= 20: return n
        except ValueError: pass
    return None


def _from_pairs_floor(pairs: dict) -> int | None:
    v = _pair_match(pairs, "etaj")
    if not v: return None
    # Skip "Număr de etaje" — that goes to floors_total
    for key in pairs:
        if "etaj" in key and ("număr" in key or "число" in key or "общее" in key):
            continue
    m = re.search(r"\d+", v)
    if m:
        try:
            n = int(m.group())
            if 0 <= n <= 100: return n
        except ValueError: pass
    return None


def _from_pairs_floors_total(pairs: dict) -> int | None:
    # Specifically the "Număr de etaje" label
    for key, val in pairs.items():
        if ("număr" in key or "общее" in key or "число" in key) and "etaj" in key + val.lower():
            m = re.search(r"\d+", val)
            if m:
                try:
                    n = int(m.group())
                    if 1 <= n <= 100: return n
                except ValueError: pass
    # Russian variant
    for key, val in pairs.items():
        if "этаж" in key and ("общ" in key or "всего" in key):
            m = re.search(r"\d+", val)
            if m:
                try:
                    n = int(m.group())
                    if 1 <= n <= 100: return n
                except ValueError: pass
    return None


def _from_pairs_year(pairs: dict) -> int | None:
    v = _pair_match(pairs, "an construc", "год постройки", "year built")
    if not v: return None
    m = re.search(r"(19|20)\d{2}", v)
    if m:
        return int(m.group())
    return None


def _from_pairs_condition(pairs: dict) -> str | None:
    v = _pair_match(pairs, "starea apartamentului", "starea casei", "состояние")
    if not v: return None
    low = v.lower()
    if any(k in low for k in ["euroreparat", "reparat capital", "lux", "евроремонт", "капитальный"]):
        return "renovated"
    if any(k in low for k in ["nefinis", "fără reparat", "fără finis", "без ремонта", "без финиш"]):
        return "needs_renovation"
    if any(k in low for k in ["nou", "новый", "construc"]):
        return "new"
    if any(k in low for k in ["bun", "хорош"]):
        return "good"
    return None


def _from_pairs_building(pairs: dict) -> str | None:
    v = _pair_match(pairs, "tipul casei", "material construc", "материал стен", "тип дома", "fond locativ")
    if not v: return None
    low = v.lower()
    if "panel" in low or "панель" in low: return "panel"
    if "cărămid" in low or "caramid" in low or "кирпич" in low: return "brick"
    if "monolit" in low or "монолит" in low: return "monolith"
    if "cotileț" in low or "котелец" in low: return "shellrock"
    return None


def _from_pairs_heating(pairs: dict) -> str | None:
    v = _pair_match(pairs, "încălzir", "отопление", "heating")
    if not v: return None
    low = v.lower()
    if "autonom" in low: return "autonomous"
    if "central" in low or "централ" in low: return "central"
    if "electric" in low or "электрич" in low: return "electric"
    if "fără" in low or "без" in low: return "none"
    return None


def _from_pairs_address(pairs: dict) -> str | None:
    v = _pair_match(pairs, "adres", "адрес", "address")
    if v and len(v) <= 255 and len(v) >= 5:
        return v
    return None


def _amenities_from_pairs(pairs: dict) -> dict:
    """Extract bool amenities from labeled pairs (e.g. 'Balcon/lojie' = '1', 'Lift' = 'da')."""
    def truthy(value: str) -> bool | None:
        if not value: return None
        v = value.lower().strip()
        if v in ("nu", "нет", "no", "0", "fără", "без"): return False
        if re.search(r"\d+", v) and not v.startswith("0"): return True
        if any(k in v for k in ["da", "есть", "yes", "prezent"]): return True
        return None

    result = {
        "furnished": None, "parking": None, "balcony": None,
        "elevator": None, "pets_allowed": None, "air_conditioning": None,
    }
    for key, val in pairs.items():
        k = key.lower()
        if "mobilat" in k or "мебелирован" in k:
            result["furnished"] = truthy(val)
        elif "parcare" in k or "гараж" in k or "парков" in k:
            result["parking"] = truthy(val)
        elif "balcon" in k or "lojie" in k or "балкон" in k or "лоджи" in k or "teras" in k:
            result["balcony"] = truthy(val)
        elif "lift" in k or "лифт" in k or "elevator" in k:
            result["elevator"] = truthy(val)
        elif "anim" in k or "питом" in k or "pet" in k:
            result["pets_allowed"] = truthy(val)
        elif "condi" in k or "кондиц" in k or "ac" in k.split():
            result["air_conditioning"] = truthy(val)
    return result


# ── Extra field extractors ───────────────────────────────────────────────────
def _extract_floor(features_text: str, json_ld: list[dict] | None = None) -> tuple[int | None, int | None]:
    """Returns (floor, floors_total) or (None, None)."""
    floor = None
    floors_total = None

    if json_ld:
        for block in json_ld:
            v = block.get("floorLevel")
            if v is not None:
                m = re.search(r"\d+", str(v))
                if m: floor = int(m.group())
            v = block.get("numberOfFloorsInBuilding")
            if v is not None:
                m = re.search(r"\d+", str(v))
                if m: floors_total = int(m.group())

    # "etaj 5 / 9" or "5 etaj din 9"
    m = re.search(r"etaj[ulule]*[:\s]+(\d{1,2})\s*[/\\]\s*(\d{1,2})", features_text, re.IGNORECASE)
    if m:
        floor = floor or int(m.group(1))
        floors_total = floors_total or int(m.group(2))
    else:
        m = re.search(r"этаж[:\s]+(\d{1,2})\s*[/\\]\s*(\d{1,2})", features_text, re.IGNORECASE)
        if m:
            floor = floor or int(m.group(1))
            floors_total = floors_total or int(m.group(2))
        else:
            m = re.search(r"etaj[:\s]+(\d{1,2})", features_text, re.IGNORECASE)
            if m and not floor:
                floor = int(m.group(1))
            m = re.search(r"num[ăa]r\s+etaje[:\s]+(\d{1,2})", features_text, re.IGNORECASE)
            if m and not floors_total:
                floors_total = int(m.group(1))

    # Sanity
    if floor is not None and not (0 <= floor <= 100): floor = None
    if floors_total is not None and not (1 <= floors_total <= 100): floors_total = None
    return floor, floors_total


def _extract_year_built(features_text: str) -> int | None:
    for pat in [
        r"an\s+construc[țt]i[ei]+[:\s]+(\d{4})",
        r"год\s+постройки[:\s]+(\d{4})",
        r"year\s+built[:\s]+(\d{4})",
    ]:
        m = re.search(pat, features_text, re.IGNORECASE)
        if m:
            y = int(m.group(1))
            if 1800 <= y <= 2030:
                return y
    return None


_CONDITION_MAP = [
    (r"reparat\s+capital|euroreparat|euroreparat[ăa]|reparat\s+pe?\s+(?:de)?\s*lux|новостройка|с\s+ремонтом", "renovated"),
    (r"f[ăa]r[ăa]\s+reparat|sub\s+reparat|sub\s+finisare|без\s+ремонта|требует\s+ремонта", "needs_renovation"),
    (r"nou|nou[ăa]|новый|новая|just\s+finished|construc[țt]ie\s+nou[ăa]", "new"),
    (r"stare\s+bun[ăa]|хорошее\s+состояние|condi[țt]ie\s+bun[ăa]", "good"),
]
def _extract_condition(features_text: str) -> str | None:
    for pat, value in _CONDITION_MAP:
        if re.search(pat, features_text, re.IGNORECASE):
            return value
    return None


_BUILDING_MAP = [
    (r"panel|панель", "panel"),
    (r"c[ăa]r[ăa]mid[ăa]|кирпич", "brick"),
    (r"monolit|монолит", "monolith"),
    (r"cotile[țt]|котелец", "shellrock"),
]
def _extract_building_type(features_text: str) -> str | None:
    for pat, value in _BUILDING_MAP:
        if re.search(pat, features_text, re.IGNORECASE):
            return value
    return None


_HEATING_MAP = [
    (r"autonom[ăa]|автономное", "autonomous"),
    (r"central[ăa]|централизованное|district\s+heating", "central"),
    (r"electric|электрическое", "electric"),
    (r"f[ăa]r[ăa]\s+[îi]nc[ăa]lzire|без\s+отопления", "none"),
]
def _extract_heating(features_text: str) -> str | None:
    for pat, value in _HEATING_MAP:
        if re.search(pat, features_text, re.IGNORECASE):
            return value
    return None


def _extract_amenities(features_text: str, soup: BeautifulSoup) -> dict:
    """Returns dict with bool flags for furnished/parking/balcony/elevator/pets/ac."""
    text = (features_text + " " + soup.get_text(" ", strip=True)).lower()

    def has(*patterns: str) -> bool | None:
        for pat in patterns:
            if re.search(pat, text, re.IGNORECASE):
                return True
        return None  # unknown → null

    return {
        "furnished":         has(r"mobilat", r"мебелированн", r"furnished"),
        "parking":           has(r"parcare", r"парковка", r"parking", r"гараж"),
        "balcony":           has(r"balcon", r"balcoan", r"балкон", r"teras[ăa]", r"лоджия"),
        "elevator":          has(r"\blift\b", r"лифт", r"\belevator\b"),
        "pets_allowed":      has(r"animale\s+permise", r"с\s+животными", r"pets\s+allowed"),
        "air_conditioning":  has(r"aer\s+condi[țt]ionat", r"кондиционер", r"\bA[\\\/]?C\b", r"air\s+condition"),
    }


def _download_image(url: str, ext_id: str, idx: int) -> str | None:
    """Download an image to storage/app/public/scraped/{ext_id}/{idx}.jpg.
    Returns the relative path (e.g. 'scraped/12345/01.jpg') or None if download failed."""
    try:
        target_dir = IMAGES_DIR / str(ext_id)
        target_dir.mkdir(parents=True, exist_ok=True)
        filename = f"{idx:02d}.jpg"
        dest = target_dir / filename

        if dest.exists() and dest.stat().st_size > 1000:
            return f"scraped/{ext_id}/{filename}"

        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 REALTIX-Scraper/1.0",
            "Accept": "image/*,*/*;q=0.8",
        })
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
            if len(data) < 1000:
                return None
            dest.write_bytes(data)
        return f"scraped/{ext_id}/{filename}"
    except Exception:
        return None


def _detect_transaction_type_from_breadcrumb(soup: BeautifulSoup) -> str | None:
    """The 999.md detail page breadcrumb usually contains 'Vând' / 'Închiriez' (the offer type).
    This is the most reliable signal because it's structured navigation."""
    # Look for breadcrumb-like containers with anchor links
    for el in soup.find_all(attrs={"class": re.compile(r"breadcrumb|navigation|filter-link", re.IGNORECASE)}):
        text = el.get_text(" | ", strip=True).lower()
        if not text:
            continue
        if "închiri" in text or "аренд" in text or "сдам" in text:
            if "termen scurt" in text or "посуточно" in text or "scurt" in text:
                return "rent_short"
            return "rent"
        if "vând" in text or "vînd" in text or "продаж" in text or "продаю" in text:
            return "sale"

    # Fallback: search the URL of <link rel="canonical"> for offer-type clues
    canon = soup.find("link", rel="canonical")
    if canon and canon.get("href"):
        href = canon["href"].lower()
        if "chirie" in href or "rent" in href:
            return "rent"
        if "vanzare" in href or "vinde" in href or "sale" in href:
            return "sale"

    return None


def _detect_owner_type(soup: BeautifulSoup) -> str:
    text = soup.get_text(" ", strip=True).lower()
    # Heuristics
    if "persoană fizică" in text or "частное лицо" in text:
        return "owner"
    if "agenție" in text or "агентство" in text or "real estate agency" in text:
        return "agency"
    return "agency"


def _detect_transaction_type(soup: BeautifulSoup, features_text: str) -> str | None:
    """Return 'rent' / 'sale' / 'rent_short' if detected from page; None to keep category default."""
    text = (soup.get_text(" ", strip=True) + " " + features_text).lower()
    if "chirie" in text or "аренд" in text or "închiri" in text:
        if "посуточно" in text or "pe zi" in text or "termen scurt" in text:
            return "rent_short"
        return "rent"
    if "vânz" in text or "продаж" in text or "vand " in text or "продаю" in text:
        return "sale"
    return None


def _try_reveal_phone(driver):
    """Click any obvious phone-reveal buttons. Best-effort, non-blocking."""
    selectors = [
        '[class*="phone"][class*="show"]',
        '[class*="contact"][class*="show"]',
        'button[class*="phone"]',
        'button[class*="contact"]',
        '[data-testid*="phone"]',
    ]
    for sel in selectors:
        try:
            buttons = driver.find_elements(By.CSS_SELECTOR, sel)
            for btn in buttons[:3]:
                try:
                    driver.execute_script("arguments[0].click();", btn)
                    time.sleep(0.4)
                except (ElementClickInterceptedException, Exception):
                    continue
        except Exception:
            continue


# ── Database writer ───────────────────────────────────────────────────────────
def upsert_listing(conn: sqlite3.Connection, ad: dict, category: dict, agency_id: int) -> bool:
    """Returns True if newly inserted, False if updated."""
    transaction_type = ad.get("transaction_type_override") or category["transaction_type"]
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    raw_data = {
        "scraped_at":    datetime.now(timezone.utc).isoformat(timespec="seconds") + "Z",
        "description":   ad.get("description"),
        "category_slug": category["slug"],
        "category_label":category["label"],
    }

    # Use detected published_at if any, otherwise current time
    pub_at = ad.get("published_at")
    if isinstance(pub_at, datetime):
        pub_str = pub_at.strftime("%Y-%m-%d %H:%M:%S")
    else:
        pub_str = now

    def _bool_to_int(v):
        if v is None: return None
        return 1 if v else 0

    fields = {
        "agency_id":         agency_id,
        "source":            "999md",
        "external_id":       ad["external_id"],
        "external_url":      ad["external_url"],
        "title":             ad["title"][:255] if ad.get("title") else "Anunț 999.md",
        "price":             ad.get("price"),
        "currency":          ad.get("currency") or "EUR",
        "area":              ad.get("area"),
        "rooms":             ad.get("rooms"),
        "floor":             ad.get("floor"),
        "floors_total":      ad.get("floors_total"),
        "city":              (ad.get("city") or "Chișinău")[:100],
        "district":          ad["district"][:100] if ad.get("district") else None,
        "address":           ad["address"][:255] if ad.get("address") else None,
        "year_built":        ad.get("year_built"),
        "condition":         ad.get("condition"),
        "building_type":     ad.get("building_type"),
        "heating":           ad.get("heating"),
        "furnished":         _bool_to_int(ad.get("furnished")),
        "parking":           _bool_to_int(ad.get("parking")),
        "balcony":           _bool_to_int(ad.get("balcony")),
        "elevator":          _bool_to_int(ad.get("elevator")),
        "pets_allowed":      _bool_to_int(ad.get("pets_allowed")),
        "air_conditioning":  _bool_to_int(ad.get("air_conditioning")),
        "description":       ad["description"][:5000] if ad.get("description") else None,
        "images":            json.dumps(ad.get("images") or [], ensure_ascii=False),
        "phone":             ad.get("phone"),
        "owner_type":        ad.get("owner_type") or "agency",
        "published_at":      pub_str,
        "type":              category["type"],
        "transaction_type":  transaction_type,
        "raw_data":          json.dumps(raw_data, ensure_ascii=False),
        "updated_at":        now,
    }

    cursor = conn.execute(
        "SELECT id FROM scraped_listings WHERE source = ? AND external_id = ?",
        ("999md", ad["external_id"]),
    )
    existing = cursor.fetchone()

    if existing:
        sets = ", ".join(f'"{k}" = ?' for k in fields.keys())
        params = list(fields.values()) + [existing[0]]
        conn.execute(f'UPDATE scraped_listings SET {sets} WHERE id = ?', params)
        return False

    fields["created_at"] = now
    cols = ", ".join(f'"{k}"' for k in fields.keys())
    placeholders = ", ".join(["?"] * len(fields))
    conn.execute(f"INSERT INTO scraped_listings ({cols}) VALUES ({placeholders})", list(fields.values()))
    return True


# ── Main ──────────────────────────────────────────────────────────────────────
def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--pages", default="2",
                        help="Pages per category (default: 2). Use 'all' to scan until end of results.")
    parser.add_argument("--max-ads", type=int, default=None, help="Hard cap on number of ads processed")
    parser.add_argument("--no-headless", action="store_true", help="Show Firefox window (debug)")
    parser.add_argument("--db", type=str, default=str(REALTIX_DB_DEFAULT), help="REALTIX SQLite path")
    parser.add_argument("--agency", type=int, default=DEFAULT_AGENCY_ID, help="Agency ID for new rows")
    parser.add_argument("--category", type=str, default=None, help="Run only one category (slug)")
    parser.add_argument("--delay-min", type=float, default=0.6)
    parser.add_argument("--delay-max", type=float, default=1.4)
    parser.add_argument("--skip-recent-hours", type=int, default=4,
                        help="Skip ads updated within last N hours (0 to disable)")
    parser.add_argument("--fast", action="store_true",
                        help="Fast bulk mode: skip lazyload/scroll/phone-click, minimal sleeps")
    parser.add_argument("--today-only", action="store_true",
                        help="Stop a category after 5 consecutive ads with published_at < today 00:00")
    parser.add_argument("--download-images", action="store_true",
                        help="Download each image locally (storage/app/public/scraped/{id}/) instead of storing CDN URLs")
    args = parser.parse_args()

    # Fast mode: tighter timing
    if args.fast:
        global _FAST_MODE
        _FAST_MODE = True
        if args.delay_min == 0.6:
            args.delay_min = 0.2
        if args.delay_max == 1.4:
            args.delay_max = 0.5

    # Activate global flags
    global _DOWNLOAD_IMAGES, _TODAY_ONLY
    _DOWNLOAD_IMAGES = args.download_images
    _TODAY_ONLY = args.today_only

    # Parse --pages: int or "all"
    pages_arg: int | None
    if str(args.pages).lower() in ("all", "inf", "unlimited"):
        pages_arg = None
    else:
        try:
            pages_arg = int(args.pages)
        except ValueError:
            print(f"[FATAL] Invalid --pages: '{args.pages}' (use number or 'all')", file=sys.stderr)
            return 1

    db_path = Path(args.db)
    if not db_path.exists():
        print(f"[FATAL] REALTIX database not found at {db_path}", file=sys.stderr)
        return 1

    cats = CATEGORIES
    if args.category:
        cats = [c for c in CATEGORIES if c["slug"] == args.category]
        if not cats:
            print(f"[FATAL] Unknown category '{args.category}'. Valid: {[c['slug'] for c in CATEGORIES]}", file=sys.stderr)
            return 1

    print(f"🦊 Starting Firefox (headless={not args.no_headless})...")
    print(f"📁 DB: {db_path}")
    print(f"🏢 Agency ID: {args.agency}")
    print(f"📂 Categories: {len(cats)}")
    print(f"📄 Pages per category: {'ALL (until end of results)' if pages_arg is None else pages_arg}")
    if args.max_ads:
        print(f"🛑 Hard cap: {args.max_ads} ads")
    print()

    driver = make_driver(headless=not args.no_headless)
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA journal_mode=WAL")

    # Load list of recently-updated external IDs to skip (saves ~3-5s per ad)
    recently_updated: set[str] = set()
    if args.skip_recent_hours > 0:
        recently_updated = get_recently_updated_ids(conn, hours=args.skip_recent_hours)
        if recently_updated:
            print(f"💾 Skipping {len(recently_updated)} ads updated within last {args.skip_recent_hours}h")

    stats = {"new": 0, "updated": 0, "errors": 0, "skipped": 0, "processed": 0, "by_category": {}}
    started = time.time()

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).replace(tzinfo=None)

    try:
        for cat in cats:
            cat_stats = {"new": 0, "updated": 0, "errors": 0}
            stats["by_category"][cat["slug"]] = cat_stats

            print(f"📂 {cat['label']} ({cat['slug']})")
            ad_urls = collect_ad_urls(driver, cat["slug"], max_pages=pages_arg)
            print(f"  → {len(ad_urls)} unique ad URLs collected")

            consecutive_old = 0  # for --today-only stop logic

            for url in ad_urls:
                if args.max_ads and stats["processed"] >= args.max_ads:
                    print(f"\n🛑 Hit max-ads limit ({args.max_ads})")
                    raise KeyboardInterrupt()

                # Skip recently-updated ads
                m = re.search(r"/ro/(\d+)", url)
                ext_id = m.group(1) if m else None
                if ext_id and ext_id in recently_updated:
                    stats["skipped"] += 1
                    continue

                try:
                    ad = extract_ad(driver, url)
                    if not ad:
                        continue

                    # --today-only: stop category if ad is older than today
                    if _TODAY_ONLY and ad.get("published_at"):
                        pub = ad["published_at"]
                        pub_naive = pub.replace(tzinfo=None) if pub.tzinfo else pub
                        if pub_naive < today_start:
                            consecutive_old += 1
                            if consecutive_old >= 5:
                                print(f"  🛑 today-only: 5 consecutive ads older than today, switching to next category")
                                break
                            continue
                        else:
                            consecutive_old = 0

                    is_new = upsert_listing(conn, ad, cat, args.agency)
                    conn.commit()
                    stats["processed"] += 1

                    if is_new:
                        stats["new"] += 1
                        cat_stats["new"] += 1
                        marker = "✅ NEW"
                    else:
                        stats["updated"] += 1
                        cat_stats["updated"] += 1
                        marker = "↻ UPD"

                    title = (ad.get("title") or "")[:45]
                    price = ad.get("price")
                    price_str = f"{int(price):,} {ad['currency']}" if price else "—"
                    print(f"  {marker} #{ad['external_id']:>9} | {title:<45} | {price_str:>12} | imgs={len(ad['images']):2} ph={'y' if ad['phone'] else 'n'}")

                except Exception as e:
                    stats["errors"] += 1
                    cat_stats["errors"] += 1
                    print(f"  ❌ {url}: {type(e).__name__}: {str(e)[:80]}")

                time.sleep(random.uniform(args.delay_min, args.delay_max))

            print()

    except KeyboardInterrupt:
        print("\n[interrupted]")
    finally:
        conn.close()
        driver.quit()

    elapsed = time.time() - started
    print("=" * 70)
    print(f"🎉 Done in {elapsed:.1f}s")
    print(f"   Processed: {stats['processed']}  |  New: {stats['new']}  |  Updated: {stats['updated']}  |  Skipped (recent): {stats['skipped']}  |  Errors: {stats['errors']}")
    print()
    for slug, s in stats["by_category"].items():
        print(f"   {slug:30} new={s['new']:3} upd={s['updated']:3} err={s['errors']:3}")

    return 0 if stats["errors"] < stats["processed"] else 1


if __name__ == "__main__":
    sys.exit(main())
