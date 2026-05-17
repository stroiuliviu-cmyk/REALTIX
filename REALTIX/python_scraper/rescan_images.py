#!/usr/bin/env python
"""
Re-scanare imagini pentru toate scraped_listings existente.

Vizitează URL-ul fiecărui anunț, aplică logica corectă _extract_images
(care exclude container-ele de "anunțuri similare" / "recomandate" / "banner"),
și actualizează coloana `images` în DB.

Pentru listări 404 (eliminate de pe 999.md), șterge rândul.

Necesită: requests, beautifulsoup4. Nu folosește Selenium (mai rapid, 999.md
oferă suficiente date prin HTML static + JSON-LD pentru extragerea de imagini).

Apel:
    python python_scraper/rescan_images.py
    python python_scraper/rescan_images.py --limit 50    # test pe primele 50
    python python_scraper/rescan_images.py --dry-run     # nu modifică DB
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

# Import the fixed image extractor + DB helpers from the main scraper.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from scraper_999 import (  # noqa: E402
    _extract_images,
    open_db_connection,
    _ph,
    REALTIX_DB_DEFAULT,
)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ro-MD,ro;q=0.9,ru;q=0.6,en;q=0.4",
}


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


def fetch_images(url: str) -> tuple[list[str] | None, int]:
    """Returnează (images, status). Status 0 = network error, alt -> HTTP status."""
    try:
        r = requests.get(url, headers=HEADERS, timeout=20)
    except Exception:
        return None, 0
    if r.status_code != 200:
        return None, r.status_code

    soup = BeautifulSoup(r.text, "html.parser")
    json_ld = _parse_json_ld(soup)
    images = _extract_images(soup, json_ld)
    return images, 200


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--limit", type=int, default=None, help="Procesează maxim N rânduri (debug)")
    ap.add_argument("--dry-run", action="store_true", help="Doar afișează; nu actualizează DB")
    ap.add_argument("--delete-404", action="store_true", default=True, help="Șterge rândul când URL-ul răspunde 404 (default: ON)")
    ap.add_argument("--no-delete-404", dest="delete_404", action="store_false")
    ap.add_argument("--sleep", type=float, default=0.4, help="Pauză între request-uri (secunde, default 0.4)")
    ap.add_argument("--db", type=str, default=None, help="Override path SQLite")
    args = ap.parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    conn, dialect = open_db_connection(repo_root, sqlite_path_override=args.db)

    sel = "SELECT id, external_url, images FROM scraped_listings WHERE external_url IS NOT NULL AND external_url != ''"
    if args.limit:
        sel += f" LIMIT {int(args.limit)}"

    cur = conn.cursor()
    cur.execute(sel)
    rows = cur.fetchall()
    cur.close()

    total   = len(rows)
    updated = 0
    deleted = 0
    skipped = 0
    errors  = 0

    print(f"De procesat: {total} anunțuri")

    for i, (lid, url, old_images_raw) in enumerate(rows, start=1):
        if isinstance(old_images_raw, list):
            old_images = old_images_raw
        elif old_images_raw:
            try:
                old_images = json.loads(old_images_raw)
            except Exception:
                old_images = []
        else:
            old_images = []

        images, status = fetch_images(url)

        if status == 404:
            if args.delete_404 and not args.dry_run:
                c2 = conn.cursor()
                c2.execute(_ph("DELETE FROM scraped_listings WHERE id = ?", dialect), (lid,))
                c2.close()
                conn.commit()
                deleted += 1
                print(f"  [{i}/{total}] #{lid} → 404, deleted")
            else:
                deleted += 1
                print(f"  [{i}/{total}] #{lid} → 404 (would delete)")
            time.sleep(args.sleep)
            continue

        if status != 200 or images is None:
            errors += 1
            print(f"  [{i}/{total}] #{lid} → error status={status}")
            time.sleep(args.sleep)
            continue

        # Update only if image set changed.
        if sorted(images) == sorted(old_images):
            skipped += 1
        else:
            if not args.dry_run:
                c2 = conn.cursor()
                c2.execute(
                    _ph("UPDATE scraped_listings SET images = ?, updated_at = NOW() WHERE id = ?", dialect)
                    if dialect == "pgsql"
                    else _ph("UPDATE scraped_listings SET images = ?, updated_at = datetime('now') WHERE id = ?", dialect),
                    (json.dumps(images, ensure_ascii=False), lid),
                )
                c2.close()
                conn.commit()
            updated += 1
            print(f"  [{i}/{total}] #{lid} → {len(old_images)} → {len(images)} imagini")

        time.sleep(args.sleep)

    conn.close()
    print("\n=== Sumar ===")
    print(f"Actualizate : {updated}")
    print(f"Șterse (404): {deleted}")
    print(f"Neschimbate : {skipped}")
    print(f"Erori       : {errors}")
    print(f"Total       : {total}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
