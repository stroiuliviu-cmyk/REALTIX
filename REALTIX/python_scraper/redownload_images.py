#!/usr/bin/env python
"""
Bulk redownload de imagini pentru scraped_listings cu folder lipsă fizic.

Pentru fiecare listing fără folder /storage/app/public/scraped/{external_id}/:
1. Fetch HTML de la URL-ul listingului
2. Extrage URL-uri remote simpalsmedia.com via _extract_images
3. Descarcă + comprimă fiecare imagine via _download_image (din scraper_999)
4. Update DB cu noile path-uri (deși ar trebui să fie aceleași)

Logging detaliat în redownload_images.log.
Sleep 0.4s între requests anti-rate-limit.

Apel:
    python python_scraper/redownload_images.py                    # rulează toate cele lipsă
    python python_scraper/redownload_images.py --limit 100        # test pe 100
    python python_scraper/redownload_images.py --dry-run          # doar identifică, nu descarcă
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

# Import helpers din scraper_999
sys.path.insert(0, str(Path(__file__).resolve().parent))
from scraper_999 import (
    _extract_images,
    _download_image,
    open_db_connection,
    _ph,
    IMAGES_DIR,
)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ro-MD,ro;q=0.9,ru;q=0.6,en;q=0.4",
}

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s %(message)s',
    handlers=[
        logging.FileHandler('redownload_images.log'),
        logging.StreamHandler()
    ]
)
log = logging.getLogger(__name__)


def _parse_json_ld(soup: BeautifulSoup) -> list[dict]:
    blocks = []
    for tag in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(tag.string or "{}")
        except Exception:
            continue
        if isinstance(data, list):
            blocks.extend(b for b in data if isinstance(b, dict))
        elif isinstance(data, dict):
            blocks.append(data)
    return blocks


def fetch_listing_images(external_id: str) -> tuple[list[str] | None, int]:
    """Fetch listing page, extract remote image URLs. Returns (urls, status)."""
    url = f"https://999.md/ro/{external_id}"
    try:
        r = requests.get(url, headers=HEADERS, timeout=20)
    except Exception as e:
        log.warning(f"Network error for {external_id}: {e}")
        return None, 0

    if r.status_code != 200:
        return None, r.status_code

    soup = BeautifulSoup(r.text, "html.parser")
    json_ld = _parse_json_ld(soup)
    images = _extract_images(soup, json_ld)
    return images, 200


def folder_missing(external_id: str) -> bool:
    """Check if local image folder doesn't exist or is empty."""
    folder = IMAGES_DIR / str(external_id)
    if not folder.is_dir():
        return True
    # Are there any .jpg files in there?
    has_images = any(folder.glob("*.jpg"))
    return not has_images


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--limit", type=int, default=None, help="Procesează maxim N rânduri")
    ap.add_argument("--dry-run", action="store_true", help="Doar identifică, nu descarcă")
    ap.add_argument("--sleep", type=float, default=0.4, help="Pauză între requests (default 0.4s)")
    args = ap.parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    conn, dialect = open_db_connection(repo_root)
    cur = conn.cursor()

    # Get all listings ordered by most recent first
    cur.execute(f"""
        SELECT external_id
        FROM scraped_listings
        WHERE images IS NOT NULL
        ORDER BY updated_at DESC
    """)
    rows = cur.fetchall()
    total = len(rows)
    log.info(f"Found {total} scraped_listings in DB")

    # Filter: only those with missing folder
    missing = [r[0] for r in rows if folder_missing(str(r[0]))]
    log.info(f"Missing folders: {len(missing)} / {total} ({len(missing)*100//total}%)")

    if args.limit:
        missing = missing[:args.limit]
        log.info(f"Limited to first {len(missing)}")

    if args.dry_run:
        log.info("DRY RUN — no downloads performed")
        for ext_id in missing[:20]:
            log.info(f"  Would process: {ext_id}")
        log.info(f"... ({len(missing)} total)")
        return 0

    success = 0
    failed = 0
    not_found_404 = 0
    no_images = 0

    for i, ext_id in enumerate(missing, 1):
        if i % 50 == 0:
            log.info(f"Progress: {i}/{len(missing)} (success={success}, failed={failed}, 404={not_found_404}, no_images={no_images})")

        try:
            images, status = fetch_listing_images(str(ext_id))

            if status == 404:
                not_found_404 += 1
                log.debug(f"{ext_id}: 404 (probably deleted)")
                time.sleep(args.sleep)
                continue

            if status != 200 or not images:
                no_images += 1
                log.debug(f"{ext_id}: no images extracted (status={status})")
                time.sleep(args.sleep)
                continue

            # Download each image
            downloaded = 0
            for idx, url in enumerate(images[:10], 1):  # max 10 per listing
                result = _download_image(url, str(ext_id), idx)
                if result:
                    downloaded += 1

            if downloaded > 0:
                success += 1
                log.info(f"{ext_id}: downloaded {downloaded}/{len(images)} images")
            else:
                failed += 1
                log.warning(f"{ext_id}: extracted {len(images)} URLs but ALL downloads failed")

        except Exception as e:
            failed += 1
            log.error(f"{ext_id}: exception {e}")

        time.sleep(args.sleep)

    log.info("=" * 60)
    log.info(f"FINAL: {success} success, {failed} failed, {not_found_404} not found, {no_images} no images")
    log.info("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
