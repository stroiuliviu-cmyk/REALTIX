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
import atexit
import json
import logging
import os
import random
import re
import signal
import sqlite3
import subprocess
import sys
import time
import urllib.request
from datetime import datetime, timedelta, timezone
from logging.handlers import RotatingFileHandler
from pathlib import Path
from zoneinfo import ZoneInfo

try:
    import psycopg2  # type: ignore
except ImportError:
    psycopg2 = None  # falls back to SQLite if Laravel still uses it


# ── DB adapter (Postgres / SQLite) ────────────────────────────────────────────
def _load_laravel_env(env_path: Path) -> dict:
    env: dict[str, str] = {}
    if not env_path.exists():
        return env
    for line in env_path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def open_db_connection(repo_root: Path, sqlite_path_override: str | None = None):
    """Returns (connection, dialect) where dialect is 'pgsql' or 'sqlite'.

    Reads Laravel .env to decide which backend to connect to. With pgsql we
    use psycopg2; otherwise sqlite3 against the legacy file.
    """
    env = _load_laravel_env(repo_root / ".env")
    driver = env.get("DB_CONNECTION", "sqlite")

    if driver == "pgsql":
        if psycopg2 is None:
            raise RuntimeError("DB_CONNECTION=pgsql but psycopg2 is not installed (run: pip install psycopg2-binary)")
        conn = psycopg2.connect(
            host=env.get("DB_HOST", "127.0.0.1"),
            port=int(env.get("DB_PORT", "5432") or 5432),
            dbname=env.get("DB_DATABASE", "realtix"),
            user=env.get("DB_USERNAME", "postgres"),
            password=env.get("DB_PASSWORD", ""),
        )
        return conn, "pgsql"

    db_path = sqlite_path_override or str(repo_root / "database" / "database.sqlite")
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    return conn, "sqlite"


def _ph(sql: str, dialect: str) -> str:
    """Convert ? placeholders to %s for psycopg2."""
    return sql.replace("?", "%s") if dialect == "pgsql" else sql


# Run-tracking globals — set by _init_run_row() and updated by the main loop.
# Signal handler / atexit cleanup uses them to finalize the scraper_runs row
# even when the process is killed mid-loop.
SCRAPER_RUN_ID: int | None = None
_current_category_name: str | None = None  # type slug (apartment / house / land / …) currently being processed


def _write_heartbeat() -> None:
    """Write JSON heartbeat (atomic) so the Laravel watchdog can verify the
    scraper is alive. Format:
        {"timestamp": "<ISO>", "pid": <int>, "run_id": <int|null>, "category": "<str|null>"}

    Watchdog accepts both this JSON and the legacy "<ISO>|<PID>" format
    (see App\\Console\\Commands\\ScraperWatchdog) so a partial rollout of
    older scraper code doesn't break the heartbeat check.
    """
    try:
        HEARTBEAT_PATH.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(timespec='seconds'),
            "pid":       os.getpid(),
            "run_id":    SCRAPER_RUN_ID,
            "category":  _current_category_name,
        }
        tmp = HEARTBEAT_PATH.with_suffix(".txt.tmp")
        tmp.write_text(json.dumps(payload), encoding="utf-8")
        tmp.replace(HEARTBEAT_PATH)
    except Exception:
        pass


def _clear_heartbeat() -> None:
    try:
        if HEARTBEAT_PATH.exists():
            HEARTBEAT_PATH.unlink()
    except Exception:
        pass


# ── Run tracking (scraper_runs table) ────────────────────────────────────────
def _init_run_row(conn, dialect: str, mode: str, pid: int) -> int | None:
    """Insert a new row into scraper_runs and return its ID. Cross-dialect:
    on Postgres uses RETURNING id, on SQLite falls back to lastrowid.
    Returns None on failure (e.g. table missing because migrations haven't
    been run yet) so the scraper keeps working without run-tracking."""
    try:
        started = datetime.now(timezone.utc)
        cur = conn.cursor()
        if dialect == "pgsql":
            cur.execute(
                "INSERT INTO scraper_runs (mode, pid, started_at, status, created_at, updated_at) "
                "VALUES (%s, %s, %s, 'running', %s, %s) RETURNING id",
                (mode, pid, started, started, started),
            )
            run_id = cur.fetchone()[0]
        else:
            cur.execute(
                "INSERT INTO scraper_runs (mode, pid, started_at, status, created_at, updated_at) "
                "VALUES (?, ?, ?, 'running', ?, ?)",
                (mode, pid, started, started, started),
            )
            run_id = cur.lastrowid
        conn.commit()
        cur.close()
        return int(run_id) if run_id else None
    except Exception as e:
        log.warning(f"Failed to init scraper_runs row: {e}")
        try:
            conn.rollback()
        except Exception:
            pass
        return None


def _reset_aborted_tx(conn) -> None:
    """Roll back any in-flight transaction so the next query can run.
    psycopg2 raises InFailedSqlTransaction on every subsequent query once
    one has errored without a rollback — call this before any "must succeed"
    write so finalize/update don't get blocked by an earlier upsert failure.
    Idempotent and safe on a clean connection."""
    try:
        conn.rollback()
    except Exception:
        pass


def _update_run_row(conn, dialect: str, run_id: int | None, **fields) -> None:
    """Update scraper_runs row with arbitrary stat fields. category_stats
    dicts get JSON-encoded automatically. Silently no-ops if run_id is None."""
    if not run_id or not fields:
        return
    # Reset any aborted-tx state from a prior failed upsert (see Bug A in
    # commit 65f57b3 incident: hourly run 16:13 hit InFailedSqlTransaction
    # and lost the finalize, leaving the row stuck on 'running').
    _reset_aborted_tx(conn)
    try:
        cols, vals = [], []
        for k, v in fields.items():
            if k == "category_stats" and isinstance(v, dict):
                v = json.dumps(v)
            cols.append(f"{k} = ?")
            vals.append(v)
        # Always bump updated_at so Eloquent timestamps reflect activity.
        cols.append("updated_at = ?")
        vals.append(datetime.now(timezone.utc))
        vals.append(run_id)
        sql = f"UPDATE scraper_runs SET {', '.join(cols)} WHERE id = ?"
        cur = conn.cursor()
        cur.execute(_ph(sql, dialect), vals)
        conn.commit()
        cur.close()
    except Exception as e:
        log.warning(f"Failed to update scraper_runs row {run_id}: {e}")
        _reset_aborted_tx(conn)


def _finalize_run(conn, dialect: str, run_id: int | None,
                  status: str = "success", error_msg: str | None = None,
                  exit_code: int | None = None) -> None:
    """Mark a run as finished (success / failed / killed / timeout) and
    compute duration in Python (avoids dialect-specific date arithmetic).
    Falls back to a minimal status-only UPDATE if the full one fails — we'd
    rather lose duration/stats than leave a row stuck on 'running'."""
    if not run_id:
        return
    # Always rollback first — if a prior upsert errored, every SELECT/UPDATE
    # below would just re-raise InFailedSqlTransaction.
    _reset_aborted_tx(conn)
    ended = datetime.now(timezone.utc)
    try:
        cur = conn.cursor()
        # Fetch started_at to compute duration; falls back to 0 if missing.
        cur.execute(_ph("SELECT started_at FROM scraper_runs WHERE id = ?", dialect), (run_id,))
        row = cur.fetchone()
        duration = 0
        if row and row[0] is not None:
            started = row[0]
            # psycopg2 returns datetime; sqlite3 returns str. Normalize.
            if isinstance(started, str):
                try:
                    started = datetime.fromisoformat(started)
                except ValueError:
                    started = ended
            if started.tzinfo is None:
                started = started.replace(tzinfo=timezone.utc)
            duration = max(0, int((ended - started).total_seconds()))
        cur.execute(
            _ph(
                "UPDATE scraper_runs SET status = ?, ended_at = ?, duration_seconds = ?, "
                "error_message = ?, exit_code = ?, current_category = NULL, updated_at = ? WHERE id = ?",
                dialect,
            ),
            (status, ended, duration, error_msg, exit_code, ended, run_id),
        )
        conn.commit()
        cur.close()
        return
    except Exception as e:
        log.warning(f"Failed to finalize run {run_id}: {e}")

    # Recovery path: rollback, then retry with a minimal status-only UPDATE
    # so the row at least leaves the 'running' state (the cleanup cron can
    # backfill duration later from started_at/ended_at).
    _reset_aborted_tx(conn)
    try:
        cur = conn.cursor()
        cur.execute(
            _ph(
                "UPDATE scraper_runs SET status = ?, ended_at = ?, error_message = ?, "
                "updated_at = ? WHERE id = ?",
                dialect,
            ),
            (status, ended, error_msg, ended, run_id),
        )
        conn.commit()
        cur.close()
        log.info(f"Recovered: finalized run {run_id} with status={status} (minimal update)")
    except Exception as e2:
        log.error(f"Recovery also failed for run {run_id}: {e2}")
        _reset_aborted_tx(conn)


# ── Logging / shutdown / driver recovery ──────────────────────────────────────
# Logger module-level; configured in setup_logging() from main().
log = logging.getLogger("scraper_999")

# Tracked globally so signal handlers + atexit can find the live driver
# for cleanup even when execution is deep in a nested loop.
_current_driver = None

# Tracked globally so the SIGTERM handler can finalize the scraper_runs row
# even though the spawn entry point is too deep in main()'s try/finally to
# access locals directly. Set in main() right after the DB connection opens.
_current_db_conn = None
_current_db_dialect = None
# Set to True by the signal handler so atexit knows whether to mark the run
# as 'killed' (SIGTERM) vs the default 'success'/'failed' path in main().
_terminated_by_signal = False
# Set to True by main() after it finalizes the run row, so the atexit
# fallback doesn't overwrite a 'success' with 'failed'.
_run_finalized = False
# Parallel-group label (a/b) when this scraper is part of a hourly_a/hourly_b
# pair. None for legacy single-process runs (morning, manual sync). Used to:
#   1. write to a per-group heartbeat file (scraper_heartbeat_{group}.txt)
#   2. scope the safe_quit_driver Firefox/geckodriver pkill so groups don't
#      kill each other's browser when they happen to exit at the same time
#   3. tag scraper_runs.mode as "hourly_a" / "hourly_b" for dashboard split
_GROUP: str | None = None

# Per-run driver restart budget (resets on each fresh `main()` invocation).
MAX_DRIVER_RESTARTS = 3
BACKOFF_SECONDS     = [5, 15, 45]


def setup_logging(verbose: bool = False) -> None:
    """Configure module logger with rotating file + stderr handlers.
    Falls back to /tmp if storage/logs is not writable (sandboxed envs)."""
    log_dir = Path(__file__).resolve().parent.parent / "storage" / "logs"
    log_file: Path
    try:
        log_dir.mkdir(parents=True, exist_ok=True)
        log_file = log_dir / "scraper_999.log"
        log_file.touch(exist_ok=True)
    except (OSError, PermissionError):
        log_file = Path("/tmp/scraper_999.log")

    level = logging.DEBUG if verbose else logging.INFO
    fmt   = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")

    log.setLevel(level)
    log.handlers.clear()
    log.propagate = False  # avoid duplicate-to-root

    fh = RotatingFileHandler(log_file, maxBytes=10 * 1024 * 1024, backupCount=3)
    fh.setFormatter(fmt)
    log.addHandler(fh)

    ch = logging.StreamHandler(sys.stderr)
    ch.setFormatter(fmt)
    log.addHandler(ch)


def safe_quit_driver(driver) -> None:
    """Best-effort cleanup of a (possibly dead) Selenium driver. Never raises.
    On crash recovery the driver may already be unresponsive — pkill the leftover
    Firefox/geckodriver processes so we don't leak handles across restarts.

    NOTE on parallel groups: when this process belongs to a hourly_a/hourly_b
    pair (`_GROUP` set), the broad `pkill -f firefox` would also kill the
    SIBLING group's running browser. In that case we skip the wide pkill and
    rely on driver.quit() alone — driver.quit() is enough in 99% of exits;
    rare zombies must be reaped manually or by a future per-PID cleanup.
    """
    if driver is None:
        return
    try:
        driver.quit()
    except Exception as e:
        log.warning(f"driver.quit() failed: {e}")

    if _GROUP is not None:
        # Don't reap sibling group's Firefox.
        return

    try:
        subprocess.run(["pkill", "-f", "firefox"],     timeout=5,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(["pkill", "-f", "geckodriver"], timeout=5,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception as e:
        # pkill missing on Windows — non-fatal
        log.debug(f"pkill cleanup skipped: {e}")


def _cleanup_at_exit() -> None:
    """atexit fallback for Python crashes that skip the main() finally block.
    If a scraper_runs row is still in 'running' state, finalize it as 'killed'
    (signal-triggered) or 'failed' (uncaught exception) so the dashboard
    doesn't show a stale active run forever."""
    global _current_driver
    if _current_driver is not None:
        safe_quit_driver(_current_driver)
        _current_driver = None
    # Best-effort run row finalization. main()'s normal exit path already
    # finalizes with status='success' before this fires; this only matters
    # when we got here via crash / SIGTERM and the run is still 'running'.
    if (SCRAPER_RUN_ID is not None and not _run_finalized
            and _current_db_conn is not None and _current_db_dialect is not None):
        status = "killed" if _terminated_by_signal else "failed"
        _finalize_run(_current_db_conn, _current_db_dialect, SCRAPER_RUN_ID,
                      status=status, error_msg="Process terminated before normal exit")
    _clear_heartbeat()


def _signal_handler(signum, _frame):
    """Graceful shutdown on SIGTERM / SIGINT — triggers finally + atexit."""
    global _terminated_by_signal
    _terminated_by_signal = True
    log.warning(f"Received signal {signum}, exiting gracefully")
    # 128 + signal number convention
    sys.exit(130 if signum == signal.SIGINT else 143)


# ── Anti-ban: User-Agent pool + block detection ───────────────────────────────
USER_AGENTS = [
    # Firefox 122-135 on Windows / Linux / macOS
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
    "Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:127.0) Gecko/20100101 Firefox/127.0",
    # Chrome 130-140 on Windows / macOS / Linux
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
    # Safari 17-18 on macOS
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15",
    # Edge (Windows)
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 Edg/132.0.0.0",
]

# Patterns that suggest the IP is being blocked / captcha'd by 999.md.
_BLOCK_PATTERNS = [
    re.compile(r"\b(blocked|access denied|forbidden)\b", re.IGNORECASE),
    re.compile(r"\b(captcha|recaptcha|hcaptcha)\b", re.IGNORECASE),
    re.compile(r"\brate[\s-]?limit", re.IGNORECASE),
    re.compile(r"\b403\b.*(?:forbidden|denied)", re.IGNORECASE),
    re.compile(r"unusual\s+traffic", re.IGNORECASE),
    re.compile(r"too\s+many\s+requests", re.IGNORECASE),
]


def _detect_block(page_source: str) -> str | None:
    """Return the matching pattern's group when the page indicates blocking,
    else None. Used to bail out with exit code 42 so the scheduler pauses runs."""
    if not page_source:
        return None
    snippet = page_source[:50_000]
    for pat in _BLOCK_PATTERNS:
        m = pat.search(snippet)
        if m:
            return m.group(0)
    return None


class ScraperBlocked(Exception):
    """Raised when 999.md returns a blocking / captcha page. The main loop
    catches this and exits with code 42 so the Laravel scheduler can pause
    further runs."""
    pass


def _bool_value(v, dialect: str):
    if v is None:
        return None
    if dialect == "pgsql":
        return bool(v)
    return 1 if v else 0

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

# Use Forge SHARED storage path (NOT release-local), so files survive deploys
# and are served by Laravel's public/storage symlink.
# Falls back to relative path for local dev environments.
import os
_DEFAULT_SHARED = "/home/forge/realtix.eu/storage/app/public/scraped"
_FALLBACK_LOCAL = Path(__file__).resolve().parent.parent / "storage" / "app" / "public" / "scraped"
IMAGES_DIR = Path(os.getenv("SCRAPER_IMAGES_DIR", _DEFAULT_SHARED if os.path.exists(_DEFAULT_SHARED) else str(_FALLBACK_LOCAL)))

# Global flag: fast bulk mode disables expensive UI interactions
_FAST_MODE = False
_DOWNLOAD_IMAGES = False
_TODAY_ONLY = False
# Operating mode — one of "morning", "hourly", "manual". Affects delays + warmup + logging.
_MODE = "manual"
# Only keep ads published within last N hours (0 = no time filter).
_SCOPE_HOURS = 0
# Process ID heartbeat is written here every minute by the worker loop.
HEARTBEAT_PATH = Path(__file__).resolve().parent.parent / "storage" / "app" / "scraper_heartbeat.txt"

CATEGORIES = [
    {"slug": "apartments-and-rooms",   "type": "apartment",  "transaction_type": "sale", "label": "Apartamente"},
    {"slug": "house-and-garden",       "type": "house",      "transaction_type": "sale", "label": "Case"},
    {"slug": "cottage",                "type": "cottage",    "transaction_type": "sale", "label": "Vile/Cabane"},
    {"slug": "land",                   "type": "land",       "transaction_type": "sale", "label": "Terenuri"},
    {"slug": "garages-and-parking",    "type": "garage",     "transaction_type": "sale", "label": "Garaje/parcări"},
    {"slug": "commercial-real-estate", "type": "commercial", "transaction_type": "sale", "label": "Comercial"},
]


def derive_subtype_and_flags(type_: str, rooms, title: str, description: str) -> tuple:
    """
    Derive subtype + extra_flags from listing characteristics (title, rooms,
    description). Called once per listing in the single-pass main loop, right
    before upsert. Replaces the old multi-pass URL-filter approach which gave
    wrong tags (e.g. "Spațiu comercial" listings ended up tagged "birou"
    because of how passes were ordered).

    KEEP IN SYNC with PHP ReclassifySubtypes::deriveSubtypeAndFlags(). Any
    keyword change here needs a mirror edit in the artisan command and vice
    versa.

    Returns (subtype: str|None, extra_flags: dict).
    """
    title_lower = (title or "").lower()
    desc_lower = (description or "").lower()
    combined = title_lower + " " + desc_lower
    extra_flags: dict = {}
    subtype = None

    if type_ == "apartment":
        if rooms is not None:
            try:
                r = int(rooms)
                if   r == 1: subtype = "1_camera"
                elif r == 2: subtype = "2_camere"
                elif r == 3: subtype = "3_camere"
                elif r >= 4: subtype = "4plus"
            except (ValueError, TypeError):
                pass

        new_build_keywords = [
            "bloc nou", "bloc-nou", "новостройка",
            "complex rezidential", "complex residential",
            "imobil nou", "construcție nouă", "construcția nouă",
            "construcție 202", "construcția 202",
        ]
        if any(kw in combined for kw in new_build_keywords):
            extra_flags["new_build"] = True

    elif type_ == "land":
        if "agricol" in title_lower or "agrigol" in title_lower or "сельскохозяйств" in title_lower:
            subtype = "agricol"
        elif "lângă lac" in title_lower or "iaz" in title_lower or " lac" in title_lower or "озер" in title_lower:
            subtype = "lac"
        elif "construcți" in title_lower or "constructi" in title_lower or "под строительство" in title_lower:
            subtype = "constructii"
        else:
            subtype = "constructii"

    elif type_ == "garage":
        if "subteran" in title_lower or "подземн" in title_lower:
            subtype = "subterana"
        elif "parcare" in title_lower or "parking" in title_lower or "паркинг" in title_lower:
            subtype = "loc_parcare"
        else:
            subtype = "garaj"

    elif type_ == "commercial":
        if "depozit" in title_lower or "склад" in title_lower or "warehouse" in title_lower:
            subtype = "depozit"
        elif "industrial" in title_lower or "производств" in title_lower:
            subtype = "industrial"
        elif "birou" in title_lower or "офис" in title_lower or "office" in title_lower or "oficiu" in title_lower:
            subtype = "birou"
        else:
            subtype = "comercial"

    return subtype, extra_flags

REALTIX_DB_DEFAULT = Path(__file__).resolve().parent.parent / "database" / "database.sqlite"
DEFAULT_AGENCY_ID = 1


# ── Driver ────────────────────────────────────────────────────────────────────
def make_driver(headless: bool = True, user_agent: str | None = None) -> webdriver.Firefox:
    """Build a Firefox driver tuned to look as little like Selenium as we can:
      - Random UA from `USER_AGENTS` (passed-in `user_agent` wins).
      - `dom.webdriver.enabled = false` so `navigator.webdriver` doesn't betray us.
      - `useAutomationExtension = false` (legacy Selenium hint).
      - `media.peerconnection.enabled = false` so WebRTC cannot leak the
        real IP behind a proxy.
      - `intl.accept_languages` set to Moldovan defaults.
      - Images disabled at browser level (we only need URLs from DOM).
    """
    opts = FirefoxOptions()
    if headless:
        opts.add_argument("--headless")
    # Don't wait for every sub-resource (font/analytics) before returning from
    # driver.get() — we only need DOM + JSON-LD. Cuts page-load latency
    # substantially and reduces hang-on-stuck-asset crashes.
    opts.page_load_strategy = "eager"

    ua = user_agent or random.choice(USER_AGENTS)

    # Performance: skip image fetch — we extract URLs from DOM/JSON-LD anyway.
    opts.set_preference("permissions.default.image", 2)
    opts.set_preference("dom.popup_maximum", 0)

    # Anti-fingerprint
    opts.set_preference("general.useragent.override", ua)
    opts.set_preference("dom.webdriver.enabled", False)
    opts.set_preference("useAutomationExtension", False)
    opts.set_preference("media.peerconnection.enabled", False)
    opts.set_preference("intl.accept_languages", "ro-MD,ro;q=0.9,ru;q=0.8,en;q=0.7")
    # Stop Firefox from announcing it's a headless build via the navigator
    opts.set_preference("privacy.resistFingerprinting", False)
    # Reduce WebGL fingerprint surface
    opts.set_preference("webgl.disabled", True)

    print(f"🦊 UA: {ua[:90]}{'…' if len(ua) > 90 else ''}")

    try:
        driver = webdriver.Firefox(options=opts)
        # Hard ceiling on a single page load — prevents indefinite hangs that
        # would silently rot the heartbeat. WebDriverException raised on timeout
        # is caught by the per-card retry wrapper in main().
        driver.set_page_load_timeout(60)
        return driver
    except WebDriverException as e:
        print(f"[FATAL] Firefox failed to start: {e}", file=sys.stderr)
        print("  Asigură-te că Firefox + geckodriver sunt instalate și în PATH.", file=sys.stderr)
        raise


def _session_warmup(driver) -> None:
    """Visit homepage + real-estate listing root before scraping so we look
    like a normal browser session (cookies + referer chain). Only worth it for
    the morning sync — hourly runs are too short to amortize the warm-up cost."""
    try:
        print("🌐 warmup: GET 999.md homepage")
        driver.get(f"{BASE_URL}/ro")
        time.sleep(random.uniform(3.0, 6.0))

        print("🌐 warmup: GET real-estate category root")
        driver.get(f"{BASE_URL}/ro/list/real-estate")
        time.sleep(random.uniform(3.0, 5.0))
    except Exception as e:
        print(f"    [warn] warmup failed: {e}")


# ── Recent-cache: skip URLs updated in last N hours ──────────────────────────
def get_recently_updated_ids(conn, dialect: str, hours: int = 4) -> set[str]:
    """IDs whose row was updated_at within the last N hours — skip refetching."""
    cur = conn.cursor()
    if dialect == "pgsql":
        cur.execute(
            "SELECT external_id FROM scraped_listings "
            "WHERE source = '999md' AND updated_at >= NOW() - (%s || ' hours')::interval",
            (str(hours),),
        )
    else:
        cur.execute(
            "SELECT external_id FROM scraped_listings "
            "WHERE source = '999md' AND updated_at >= datetime('now', ?)",
            (f"-{hours} hours",),
        )
    rows = cur.fetchall()
    cur.close()
    return {row[0] for row in rows}


def check_db_listing_state(conn, dialect: str, external_id: str) -> dict | None:
    """Returns DB state for a listing or None if not in DB.

    Used by the main loop to decide whether the expensive detail-page fetch
    is needed (NEW listing or missing phone) or skippable (price-only update).
    """
    cur = conn.cursor()
    cur.execute(
        _ph("SELECT id, price, currency, phone FROM scraped_listings WHERE source = ? AND external_id = ?", dialect),
        ("999md", external_id),
    )
    row = cur.fetchone()
    cur.close()
    if not row:
        return None
    return {
        "id":        row[0],
        "price":     float(row[1]) if row[1] is not None else None,
        "currency":  row[2],
        "has_phone": bool(row[3] and str(row[3]).strip()),
    }


def update_price_only(
    conn,
    dialect: str,
    listing_id: int,
    price: float | None,
    currency: str | None,
    subtype: str | None = None,
    extra_flags: dict | None = None,
) -> None:
    """Lightweight update: bump updated_at, sync price/currency if provided.
    Also COALESCE-update subtype (first-write-wins) and JSON-merge extra_flags,
    so listings discovered through a subtype-filtered URL get tagged even when
    the detail page is skipped.
    """
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    cur = conn.cursor()

    # Read existing subtype + extra_flags to do COALESCE/merge in Python
    # (cross-dialect: sqlite has no JSONB || operator).
    if subtype is not None or extra_flags is not None:
        cur.execute(
            _ph('SELECT subtype, extra_flags FROM scraped_listings WHERE id = ?', dialect),
            (listing_id,),
        )
        row = cur.fetchone()
        existing_subtype = row[0] if row else None
        existing_flags = row[1] if row else None
        if isinstance(existing_flags, str):
            try:
                existing_flags = json.loads(existing_flags) if existing_flags else None
            except Exception:
                existing_flags = None

        # COALESCE: keep existing subtype if already set
        final_subtype = subtype if existing_subtype is None and subtype is not None else existing_subtype
        # Merge extra_flags
        if extra_flags:
            base = dict(existing_flags) if isinstance(existing_flags, dict) else {}
            base.update(extra_flags)
            final_flags = json.dumps(base, ensure_ascii=False)
        else:
            final_flags = json.dumps(existing_flags, ensure_ascii=False) if isinstance(existing_flags, dict) else None
    else:
        final_subtype = None
        final_flags = None

    sets = ["updated_at = ?"]
    params: list = [now]
    if price is not None:
        sets += ["price = ?", "currency = ?"]
        params += [price, currency or 'EUR']
    if subtype is not None or extra_flags is not None:
        sets += ["subtype = ?", "extra_flags = ?"]
        params += [final_subtype, final_flags]
    params.append(listing_id)

    cur.execute(
        _ph(f'UPDATE scraped_listings SET {", ".join(sets)} WHERE id = ?', dialect),
        params,
    )
    cur.close()


# ── List page → ad URLs ───────────────────────────────────────────────────────
def _extract_card_price(anchor) -> tuple[int | None, str | None]:
    """Walk up to ~4 ancestors looking for the listing card's price text.
    Handles discount cards ("199 900 € 209 900 € −5%") by taking the FIRST
    price (the current offer, smaller of the two). Returns (price, currency).
    """
    el = anchor
    for _ in range(4):
        el = el.parent
        if el is None:
            return (None, None)
        text = el.get_text(separator=' ', strip=True)
        if not text or len(text) > 2000:  # skip overly broad ancestors
            continue
        # Match: 3+ digits with optional internal spaces (e.g. "250", "199 900", "1 234 567")
        # followed by currency. Stricter format avoids false positives like "year 2026" or "5 m²".
        m = re.search(r'(\d{1,3}(?:[\s ]\d{3})*|\d{3,})\s*(€|EUR|MDL|lei)', text, re.IGNORECASE)
        if m:
            digits = m.group(1).replace(' ', '').replace(' ', '')
            try:
                price = int(digits)
            except ValueError:
                continue
            cur_raw = m.group(2).upper()
            currency = 'EUR' if cur_raw in ('€', 'EUR') else 'MDL'
            return (price, currency)
    return (None, None)


def collect_ad_urls(driver, category_slug: str, exo_param: str | None = None, max_pages: int | None = 2) -> list[dict]:
    """Return ad metadata from a category (optionally filtered by sub-category).

    Each dict: { url, external_id, price (int|None), currency ('EUR'|'MDL'|None) }
    Price/currency are extracted from the list-page card so callers can skip
    the expensive detail fetch when only price has changed (or nothing has).

    If max_pages is None, paginate until no new ads are found (end of results).
    If exo_param is set (e.g. "exo_241=893"), the listing URL becomes
    /ro/list/real-estate/{slug}?{exo_param}&page=N — used to scrape per-subtype.
    """
    seen: dict[str, dict] = {}  # ext_id → card metadata
    base = f"{BASE_URL}/ro/list/real-estate/{category_slug}"
    if exo_param:
        base = f"{base}?{exo_param}"

    page = 1
    consecutive_empty = 0

    while True:
        if max_pages is not None and page > max_pages:
            break

        if exo_param:
            url = f"{base}&page={page}" if page > 1 else base
        else:
            url = base + (f"?page={page}" if page > 1 else "")
        prev_count = len(seen)

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

            page_source = driver.page_source

            # Bail out if 999.md is serving a block / captcha page instead of listings.
            block_hit = _detect_block(page_source)
            if block_hit and not re.search(r'href="/ro/\d{6,}', page_source):
                raise ScraperBlocked(f"List page block on {category_slug} page {page}: {block_hit!r}")

            soup = BeautifulSoup(page_source, "html.parser")
            for a in soup.find_all("a", href=True):
                href = a["href"]
                m = re.match(r"^/ro/(\d{6,})(?:[/?].*)?$", href)
                if not m:
                    continue
                ext_id = m.group(1)
                if ext_id in seen:
                    continue  # other anchors on same card (image, title, ...) → first one wins
                price, currency = _extract_card_price(a)
                seen[ext_id] = {
                    "url":         f"{BASE_URL}/ro/{ext_id}",
                    "external_id": ext_id,
                    "price":       price,
                    "currency":    currency,
                }

            new_on_page = len(seen) - prev_count
            print(f"    page {page}: +{new_on_page} new (cumulative {len(seen)})")

            if not seen and page == 1:
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

        except ScraperBlocked:
            raise
        except Exception as e:
            print(f"    [error] page {page}: {e}")
            break

    return sorted(seen.values(), key=lambda d: d["external_id"])


# ── Detail page → structured ad data ──────────────────────────────────────────
# Matches Moldovan phone numbers in formats:
#   +37368254455, +373 68 254 455, +373-68-254-455, 068254455, 0 68 254 455
# Allows space/dash separators between any digit so we catch human-formatted output.
PHONE_PATTERN_MD = re.compile(r"\+?373(?:[\s\-]?\d){8}|\b0(?:[\s\-]?\d){8}\b")
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

    # Wait for Next.js to hydrate the SSR payload containing date fields.
    # Without this, page_source has the h1 but lacks "resetedRedesign":"..." JSON,
    # causing _extract_date_from_next_payload to return None for most listings.
    # Max 3 sec wait — old-format listings without this key are caught by the
    # function's existing None fallback.
    try:
        WebDriverWait(driver, 3).until(
            lambda d: 'resetedRedesign' in d.page_source or 'posted' in d.page_source
        )
    except TimeoutException:
        pass

    if _FAST_MODE:
        # Minimal wait, no scroll/gallery — but still reveal phone (essential
        # for call-tracking features; visible-text reveal is fast on 999.md).
        time.sleep(random.uniform(0.2, 0.4))
        _try_reveal_phone(driver)
    else:
        time.sleep(random.uniform(2.5, 3.5))
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

    # Published_at — Next.js SSR payload is now authoritative (999.md removed
    # datePosted/datePublished from JSON-LD in May 2026). JSON-LD kept as
    # secondary fallback for any pages still serving the legacy format.
    published_at = _extract_date_from_next_payload(driver.page_source)

    if not published_at and json_ld:
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
        for idx, img_url in enumerate(images[:15], start=1):
            local = _download_image(img_url, external_id, idx)
            if local:
                local_paths.append(local)
        # Replace remote URLs with local relative paths
        if local_paths:
            images = local_paths

    price_per_m2 = _extract_price_per_m2(soup, price, area)

    return {
        "external_id":              external_id,
        "external_url":             url,
        "title":                    title,
        "price":                    price,
        "currency":                 currency,
        "area":                     area,
        "price_per_m2":             price_per_m2,
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


# Map RO month abbreviations to numbers (999.md format)
_RO_MONTHS = {
    'ian': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'mai': 5, 'iun': 6,
    'iul': 7, 'aug': 8, 'sept': 9, 'sep': 9, 'oct': 10, 'noi': 11, 'dec': 12,
}


def _extract_date_from_next_payload(page_source: str) -> datetime | None:
    """Extract published date from Next.js __next_f.push JSON payload.

    999.md embeds dates in formats like:
      "resetedRedesign":"24 mai. 2026, 21:37"   (preferred — last activity, with year)
      "posted":"30 apr. 2026, 17:37"            (fallback — original posting)

    Returns naive datetime in UTC (source times are in Europe/Chișinău and are
    converted before return so downstream storage matches wall-clock UTC).
    """
    import re

    # Try resetedRedesign first (most recent activity), then posted
    for key in ("resetedRedesign", "posted"):
        # Match both escaped (Selenium) and unescaped (curl) JSON formats.
        # Selenium: \"posted\":\"30 apr. 2026, 17:37\"
        # Curl:     "posted":"30 apr. 2026, 17:37"
        pattern = rf'\\?"{key}\\?":\\?"(\d{{1,2}})\s+([a-zA-Z]+)\.?\s+(\d{{4}}),?\s+(\d{{1,2}}):(\d{{2}})\\?"'
        m = re.search(pattern, page_source)
        if m:
            day, month_abbr, year, hour, minute = m.groups()
            month_num = _RO_MONTHS.get(month_abbr.lower()[:3])
            if month_num:
                try:
                    # 999.md displays times in Europe/Chișinău (UTC+3 summer, +2 winter).
                    # Localize then convert to UTC for consistent storage.
                    local_dt = datetime(int(year), month_num, int(day), int(hour), int(minute), tzinfo=ZoneInfo("Europe/Chisinau"))
                    utc_dt = local_dt.astimezone(ZoneInfo("UTC"))
                    return utc_dt.replace(tzinfo=None)  # naive datetime for consistent DB save
                except (ValueError, TypeError):
                    continue
    return None


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


# Matches "5 306 €/m²", "1,200 EUR/mp", "850 €/m2" and Russian "за м²" variants.
_PRICE_PER_M2_RE = re.compile(
    r"(\d[\d\s.,]*)\s*(?:€|EUR|USD|\$|lei|MDL)\s*[/\\]\s*(?:m\s*[²2]|mp|кв\.?\s*м)",
    re.IGNORECASE,
)


def _extract_price_per_m2(soup: BeautifulSoup, price: float | None, area: float | None) -> float | None:
    """Try to read 'X €/m²' directly from the page; fall back to price/area math."""
    text = soup.get_text(" ", strip=True)
    m = _PRICE_PER_M2_RE.search(text)
    if m:
        digits = re.sub(r"[^\d]", "", m.group(1))
        if digits:
            try:
                val = float(digits)
                if 1 <= val <= 1_000_000:
                    return val
            except ValueError:
                pass
    # Deterministic fallback
    if price and area and area > 0:
        return round(float(price) / float(area), 2)
    return None


_GALLERY_SELECTORS = [
    '[class*="Gallery"]', '[class*="gallery"]',
    '[class*="ImageGallery"]', '[class*="MainPhoto"]',
    '[class*="adImages"]', '[class*="AdImages"]',
    '[class*="PhotoSlider"]', '[class*="photoSlider"]',
    '[data-testid*="gallery"]', '[data-cy*="gallery"]',
    '[role="region"][aria-label*="photo" i]',
]

# Containers that we MUST NOT pull images from (similar/recommended ads, banners).
_GALLERY_EXCLUDE_SELECTORS = [
    '[class*="Similar"]', '[class*="similar"]',
    '[class*="Recommend"]', '[class*="recommend"]',
    '[class*="Related"]', '[class*="related"]',
    '[class*="OtherAds"]', '[class*="otherAds"]',
    '[class*="Recent"]', '[class*="recent"]',
    '[class*="Sponsored"]', '[class*="banner"]', '[class*="Banner"]',
    '[class*="Promo"]', '[class*="promo"]',
    'footer', 'header', 'aside',
]


def _extract_images(soup: BeautifulSoup, json_ld: list[dict] | None = None) -> list[str]:
    """Collect unique listing-specific image URLs.

    Priority:
      1. JSON-LD `image` (per-listing, authoritative)
      2. og:image (per-listing, single)
      3. DOM scan inside a narrow gallery container — only if 1+2 returned <3 images.

    The DOM-wide scan was previously contaminating listings with images from
    "similar ads" / "recommended" sidebars; we now scope to gallery selectors and
    explicitly exclude known recommender containers.
    """
    seen: set[str] = set()
    images: list[str] = []

    def add(url: str):
        clean = url.split("?")[0]
        if clean.startswith("//"):
            clean = "https:" + clean
        if clean and "simpalsmedia" in clean and clean not in seen:
            seen.add(clean)
            images.append(clean)

    # 1. JSON-LD image field — authoritative per-listing source.
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

    # 2. og:image (single hero image).
    og_img = soup.find("meta", property="og:image")
    if og_img and og_img.get("content"):
        add(og_img["content"])

    # 3. DOM scan — only when JSON-LD didn't yield enough images.
    if len(images) < 3:
        # Strip out excluded containers so they can't contribute images.
        for sel in _GALLERY_EXCLUDE_SELECTORS:
            for el in soup.select(sel):
                el.decompose()

        # Find a narrow gallery scope; fall back to <main> if none of the
        # specific selectors match. Last resort: skip the broad scan entirely
        # rather than pollute with sidebar content.
        scopes = []
        for sel in _GALLERY_SELECTORS:
            scopes.extend(soup.select(sel))
        if not scopes:
            main_el = soup.find("main")
            if main_el:
                scopes = [main_el]

        for scope in scopes:
            for img in scope.find_all(["img", "source"]):
                for attr in ("src", "data-src", "data-lazy-src", "srcset", "data-srcset"):
                    v = img.get(attr) or ""
                    for piece in v.split(","):
                        token = piece.strip().split(" ")[0]
                        if "simpalsmedia.com" in token and "/board" in token:
                            add(token)
            for el in scope.find_all(style=re.compile(r"url\([^)]*simpalsmedia")):
                m = re.search(r"url\(['\"]?([^)'\"]+simpalsmedia[^)'\"]+)['\"]?\)", el.get("style", ""))
                if m:
                    add(m.group(1))

    return images[:15]  # cap at 15


_999MD_SERVICE_PHONES = {
    "+37322888002",  # 999.md / Simpals customer support — appears in header/footer
    "022888002",
}


def _normalize_phone(raw: str) -> str:
    cleaned = re.sub(r"[^\d+]", "", raw)
    if cleaned.startswith("00373"):
        cleaned = "+" + cleaned[2:]
    return cleaned


def _extract_phone(soup: BeautifulSoup) -> str | None:
    # 1. Prefer the ad's own phone container — narrowly scoped, avoids header/footer leakage.
    selectors = [
        'a[href^="tel:"]',
        '[class*="phone" i]',
        '[class*="PhoneNumber"]', '[class*="phoneNumber"]',
        '[class*="phone-number"]', '[class*="phone_number"]',
        '[data-testid*="phone"]',
        '[itemprop="telephone"]',
    ]
    for sel in selectors:
        for node in soup.select(sel):
            inner = node.get_text(" ", strip=True)
            m = PHONE_PATTERN_MD.search(inner)
            if m:
                num = _normalize_phone(m.group())
                if num and num not in _999MD_SERVICE_PHONES:
                    return num

    # 2. tel: links inside the ad body.
    for a in soup.find_all("a", href=True):
        if a["href"].startswith("tel:"):
            num = _normalize_phone(a["href"][4:])
            if len(num) >= 8 and num not in _999MD_SERVICE_PHONES:
                return num

    # 3. Last-resort full-page regex (only if not matching a service number).
    text = soup.get_text(" ", strip=True)
    m = PHONE_PATTERN_MD.search(text)
    if m:
        num = _normalize_phone(m.group())
        if num and num not in _999MD_SERVICE_PHONES:
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
    """Download an image to IMAGES_DIR/{ext_id}/{idx}.jpg, compressed.
    Returns the relative path (e.g. 'scraped/12345/01.jpg') or None if download failed.

    Compression: max 800px on the long side, JPEG quality 80, progressive,
    EXIF stripped. Reduces ~60-70% vs raw source while staying visually lossless
    at card resolution (200px) and modal viewer (max ~1200px on most screens).
    """
    try:
        from PIL import Image
        import io

        target_dir = IMAGES_DIR / str(ext_id)
        target_dir.mkdir(parents=True, exist_ok=True)
        filename = f"{idx:02d}.jpg"
        dest = target_dir / filename

        # Skip if already exists and looks good (size > 1KB)
        if dest.exists() and dest.stat().st_size > 1000:
            return f"scraped/{ext_id}/{filename}"

        # Fetch raw bytes from CDN
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 REALTIX-Scraper/1.0",
            "Accept": "image/*,*/*;q=0.8",
        })
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read()
            if len(raw) < 1000:
                return None

        # Process with Pillow: decode, resize if needed, re-encode as compressed JPEG
        img = Image.open(io.BytesIO(raw))

        # Convert RGBA/P/etc to RGB (JPEG doesn't support alpha)
        if img.mode != "RGB":
            img = img.convert("RGB")

        # Resize to 800px on long side — cards show 200px, modal max ~1200px.
        # 800px covers Retina 4x at card resolution + decent gallery quality.
        # Source from 999.md is typically 900-1280px, so resize always triggers.
        MAX_SIZE = 800
        if max(img.size) > MAX_SIZE:
            img.thumbnail((MAX_SIZE, MAX_SIZE), Image.Resampling.LANCZOS)

        # Save with balanced compression
        # Quality alone doesn't help (source is pre-compressed by 999.md);
        # the resize is what actually reduces file size ~60%.
        img.save(
            dest,
            format="JPEG",
            quality=80,
            optimize=True,
            progressive=True,
        )

        # Sanity check: must be at least 5KB (sub asta înseamnă encoding broken)
        if dest.stat().st_size < 5000:
            dest.unlink(missing_ok=True)
            return None

        return f"scraped/{ext_id}/{filename}"
    except Exception as e:
        # Cleanup partial file dacă crapă mid-save
        try:
            if 'dest' in locals() and dest.exists():
                dest.unlink(missing_ok=True)
        except:
            pass
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
                return "inchiriere_zilnica"
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


_TIP_OFERTA_LABEL_RE = re.compile(r"Tip\s+ofert|Тип\s+предложени", re.IGNORECASE)


def _detect_transaction_type(soup: BeautifulSoup, features_text: str) -> str | None:
    """Return 'rent' / 'sale' / 'inchiriere_zilnica' if detected from page; None to keep category default.

    Order of precedence (highest confidence first):
      1. Structured "Tip ofertă" sidebar field on 999.md detail pages.
      2. General page text heuristic (legacy fallback).
    The breadcrumb-based detector (_detect_transaction_type_from_breadcrumb)
    is called separately by the caller before this function.
    """
    # 1) Structured field — most reliable when present. Iterate every label
    # node matching "Tip ofertă" / "Тип предложения" and inspect parent +
    # next sibling text (999.md typically renders label/value as siblings).
    for label in soup.find_all(string=_TIP_OFERTA_LABEL_RE):
        parent = label.parent
        if not parent:
            continue
        context = parent.get_text(" ", strip=True).lower()
        nxt = parent.find_next_sibling()
        if nxt:
            context += " " + nxt.get_text(" ", strip=True).lower()

        # Check the most specific bucket first so "chirie pe zi" doesn't
        # collapse into the generic rent branch.
        if "chirie pe zi" in context or "pe zi" in context \
                or "посуточно" in context or "termen scurt" in context:
            return "inchiriere_zilnica"
        if "închiri" in context or "chirie" in context \
                or "аренд" in context or "сда" in context:
            return "rent"
        if "vând" in context or "vinde" in context or "vanzare" in context \
                or "продаж" in context or "продаю" in context:
            return "sale"

    # 2) Fallback: scan the whole page text.
    text = (soup.get_text(" ", strip=True) + " " + features_text).lower()
    if "chirie" in text or "аренд" in text or "închiri" in text:
        if "посуточно" in text or "pe zi" in text or "termen scurt" in text:
            return "inchiriere_zilnica"
        return "rent"
    if "vânz" in text or "продаж" in text or "vand " in text or "продаю" in text:
        return "sale"
    return None


_RATE_LIMIT_PATTERNS = [
    re.compile(r"prea\s+multe\s+cereri.*?(\d+)\s*secunde", re.IGNORECASE | re.DOTALL),
    re.compile(r"too\s+many\s+requests.*?(\d+)\s*second", re.IGNORECASE | re.DOTALL),
    re.compile(r"слишком\s+много\s+запросов.*?(\d+)\s*секунд", re.IGNORECASE | re.DOTALL),
]


def _detect_rate_limit(driver) -> int | None:
    """Returns number of seconds to wait if 999.md is rate-limiting the reveal
    endpoint, else None. 999.md shows a tooltip 'Prea multe cereri. Încearcă
    din nou peste N secunde.' when the same client clicks reveal too often."""
    try:
        source = driver.page_source
    except Exception:
        return None
    for pat in _RATE_LIMIT_PATTERNS:
        m = pat.search(source)
        if m:
            try:
                return int(m.group(1))
            except (ValueError, IndexError):
                return 8  # safe default
    return None


def _try_reveal_phone(driver) -> bool:
    """Click the 999.md "Arată numărul" reveal button and wait for the full phone
    to render. Returns True if a phone number became visible in the DOM.

    Handles rate-limit responses: if 999.md shows 'Prea multe cereri', sleep
    the indicated seconds and retry once."""

    # Step 1: collect candidate buttons via CSS classes (loose match).
    candidates = []
    css_selectors = [
        '[class*="phone-reveal"]', '[class*="PhoneReveal"]',
        '[class*="show-phone"]',   '[class*="ShowPhone"]',
        'button[class*="phone" i]', 'button[class*="contact" i]',
        '[data-testid*="phone" i]', '[data-cy*="phone" i]',
    ]
    for sel in css_selectors:
        try:
            candidates.extend(driver.find_elements(By.CSS_SELECTOR, sel))
        except Exception:
            continue

    # Step 2: also match by visible text — 999.md uses "Arată numărul" /
    # "Показать номер". Restrict to leaf nodes (no nested similar elements).
    text_xpaths = [
        "//button[contains(., '+373')]",
        "//button[contains(translate(., 'AĂÂÎȘȚ', 'aaaist'), 'arată numărul')]",
        "//a[contains(translate(., 'AĂÂÎȘȚ', 'aaaist'), 'arată numărul')]",
        "//*[contains(., 'Показать номер') and not(.//*[contains(., 'Показать номер')])]",
        "//*[contains(., 'Arată numărul') and not(.//*[contains(., 'Arată numărul')])]",
    ]
    for xp in text_xpaths:
        try:
            candidates.extend(driver.find_elements(By.XPATH, xp))
        except Exception:
            continue

    # Dedup while preserving order.
    seen_ids = set()
    unique = []
    for c in candidates:
        ref = id(c)
        if ref not in seen_ids:
            seen_ids.add(ref)
            unique.append(c)

    if not unique:
        return False

    # Helper: click ONE button (the first viable candidate) — clicking multiple
    # was bloating the reveal-endpoint request count and triggering rate limits.
    def _click_first() -> bool:
        for btn in unique:
            try:
                driver.execute_script("arguments[0].click();", btn)
                return True
            except (ElementClickInterceptedException, Exception):
                continue
        return False

    if not _click_first():
        return False

    # Step 3: wait up to 4s for either the number to appear OR a rate-limit notice.
    def _ready(d):
        if d.find_elements(By.CSS_SELECTOR, 'a[href^="tel:"]'):
            return 'ok'
        if PHONE_PATTERN_MD.search(d.page_source):
            return 'ok'
        if _detect_rate_limit(d):
            return 'rate_limit'
        return False

    try:
        outcome = WebDriverWait(driver, 10).until(_ready)
    except TimeoutException:
        return False

    if outcome == 'rate_limit':
        wait = _detect_rate_limit(driver) or 30
        # Add ~30% jitter so we don't retry exactly when the window opens.
        sleep_for = wait + random.uniform(5, 10)
        print(f"    [rate-limit] 999.md asked to wait {wait}s — sleeping {sleep_for:.1f}s")
        time.sleep(sleep_for)
        # Retry once
        if not _click_first():
            return False
        try:
            WebDriverWait(driver, 10).until(
                lambda d: bool(d.find_elements(By.CSS_SELECTOR, 'a[href^="tel:"]'))
                          or bool(PHONE_PATTERN_MD.search(d.page_source))
            )
            return True
        except TimeoutException:
            return False

    return True


# ── Database writer ───────────────────────────────────────────────────────────
def upsert_listing(
    conn,
    dialect: str,
    ad: dict,
    category: dict,
    agency_id: int,
    subtype: str | None = None,
    extra_flags: dict | None = None,
) -> bool:
    """Returns True if newly inserted, False if updated.

    subtype is first-write-wins (preserved across re-scrapes); extra_flags
    JSON-merge with whatever already lives on the row.
    """
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

    fields = {
        "agency_id":         agency_id,
        "source":            "999md",
        "external_id":       ad["external_id"],
        "external_url":      ad["external_url"],
        "title":             ad["title"][:255] if ad.get("title") else "Anunț 999.md",
        "price":             ad.get("price"),
        "currency":          ad.get("currency") or "EUR",
        "area":              ad.get("area"),
        "price_per_m2":      ad.get("price_per_m2"),
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
        "furnished":         _bool_value(ad.get("furnished"), dialect),
        "parking":           _bool_value(ad.get("parking"), dialect),
        "balcony":           _bool_value(ad.get("balcony"), dialect),
        "elevator":          _bool_value(ad.get("elevator"), dialect),
        "pets_allowed":      _bool_value(ad.get("pets_allowed"), dialect),
        "air_conditioning":  _bool_value(ad.get("air_conditioning"), dialect),
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

    cur = conn.cursor()
    cur.execute(
        _ph("SELECT id, subtype, extra_flags FROM scraped_listings WHERE source = ? AND external_id = ?", dialect),
        ("999md", ad["external_id"]),
    )
    existing = cur.fetchone()

    # COALESCE subtype + merge extra_flags in Python (cross-dialect safe).
    if existing:
        existing_id, existing_subtype, existing_flags = existing[0], existing[1], existing[2]
        if isinstance(existing_flags, str):
            try:
                existing_flags = json.loads(existing_flags) if existing_flags else None
            except Exception:
                existing_flags = None
        # subtype: first-write-wins
        final_subtype = subtype if existing_subtype is None and subtype is not None else existing_subtype
        # extra_flags: merge new on top of existing
        if extra_flags:
            base_flags = dict(existing_flags) if isinstance(existing_flags, dict) else {}
            base_flags.update(extra_flags)
            final_flags = json.dumps(base_flags, ensure_ascii=False)
        else:
            final_flags = json.dumps(existing_flags, ensure_ascii=False) if isinstance(existing_flags, dict) else None
    else:
        existing_id = None
        final_subtype = subtype
        final_flags = json.dumps(extra_flags, ensure_ascii=False) if extra_flags else None

    fields["subtype"]     = final_subtype
    fields["extra_flags"] = final_flags

    if existing:
        sets = ", ".join(f'"{k}" = ?' for k in fields.keys())
        params = list(fields.values()) + [existing_id]
        cur.execute(_ph(f'UPDATE scraped_listings SET {sets} WHERE id = ?', dialect), params)
        cur.close()
        return False

    fields["created_at"] = now
    cols = ", ".join(f'"{k}"' for k in fields.keys())
    placeholders = ", ".join(["?"] * len(fields))
    cur.execute(
        _ph(f"INSERT INTO scraped_listings ({cols}) VALUES ({placeholders})", dialect),
        list(fields.values()),
    )
    cur.close()
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
    parser.add_argument("--categories", type=str, default=None,
                        help="Comma-separated list of category slugs to run "
                             "(e.g. apartments-and-rooms,house-and-garden). Takes "
                             "precedence over --category.")
    parser.add_argument("--group", type=str, default=None,
                        help="Parallel-group label (a/b). Sets per-group heartbeat "
                             "file + tags scraper_runs.mode as <mode>_<group> + "
                             "scopes Firefox cleanup so sibling groups aren't killed.")
    parser.add_argument("--delay-min", type=float, default=1.2,
                        help="Min seconds between ads (helps avoid 999.md reveal-endpoint rate limit)")
    parser.add_argument("--delay-max", type=float, default=2.5,
                        help="Max seconds between ads")
    parser.add_argument("--skip-recent-hours", type=int, default=4,
                        help="Skip ads updated within last N hours (0 to disable)")
    parser.add_argument("--fast", action="store_true",
                        help="Fast bulk mode: skip lazyload/scroll/phone-click, minimal sleeps")
    parser.add_argument("--today-only", action="store_true",
                        help="Stop a category after 5 consecutive ads with published_at < today 00:00")
    parser.add_argument("--download-images", action="store_true", default=True,
                        help="Descarcă imagini local (default ON)")
    parser.add_argument("--no-download-images", dest="download_images", action="store_false",
                        help="Skip image download (test mode)")
    parser.add_argument("--scope-hours", type=int, default=0,
                        help="Only keep ads published within last N hours (0 = no time filter)")
    parser.add_argument("--mode", type=str, default="manual",
                        choices=["morning", "hourly", "manual"],
                        help="Operating mode — affects logging, delays, warmup and early-exit behaviour")
    parser.add_argument("--subtype-only", action="store_true",
                        help="Skip the main (un-filtered) category pass, iterate only subtypes + extra_flags")
    parser.add_argument("--single-subtype", type=str, default=None,
                        help="Test mode: scrape ONE subtype only, format 'category_slug:subtype_key' (e.g. 'land:agricol')")
    parser.add_argument("--verbose", action="store_true",
                        help="Enable DEBUG logging to storage/logs/scraper_999.log")
    args = parser.parse_args()

    # Setup logger + crash-safe shutdown hooks BEFORE any heavy lifting.
    setup_logging(verbose=args.verbose)
    signal.signal(signal.SIGTERM, _signal_handler)
    signal.signal(signal.SIGINT,  _signal_handler)
    atexit.register(_cleanup_at_exit)
    log.info(f"Scraper starting: mode={args.mode}, category={args.category or 'all'}, pages={args.pages}, fast={args.fast}, single_subtype={args.single_subtype}")

    # Fast mode: tighter timing
    if args.fast:
        global _FAST_MODE
        _FAST_MODE = True
        # Fast mode keeps inter-ad delay reasonable so we don't trigger
        # the 999.md reveal rate-limit (8 reveals in ~10s consistently hits it).
        if args.delay_min == 1.2:
            args.delay_min = 0.6
        if args.delay_max == 2.5:
            args.delay_max = 1.2

    # Activate global flags
    global _DOWNLOAD_IMAGES, _TODAY_ONLY, _MODE, _SCOPE_HOURS, _GROUP, HEARTBEAT_PATH
    _DOWNLOAD_IMAGES = args.download_images
    _TODAY_ONLY = args.today_only
    _MODE = args.mode
    _SCOPE_HOURS = max(0, int(args.scope_hours or 0))
    _GROUP = (args.group or '').strip().lower() or None
    if _GROUP:
        # Per-group heartbeat — watchdog reads scraper_heartbeat_{a,b}.txt
        # so each group's stale-detection is independent.
        HEARTBEAT_PATH = HEARTBEAT_PATH.parent / f"scraper_heartbeat_{_GROUP}.txt"
        log.info(f"Parallel group mode: {_GROUP} — heartbeat at {HEARTBEAT_PATH.name}")

    # Mode-specific delay defaults — only override if the caller didn't tune them.
    if args.mode == "morning":
        print("🌅 Morning initial sync — scraping ALL recent listings (last 7h)")
        if args.delay_min == 1.2: args.delay_min = 2.5
        if args.delay_max == 2.5: args.delay_max = 5.0
    elif args.mode == "hourly":
        print("⏱  Hourly incremental — scraping only last hour")
        if args.delay_min == 1.2: args.delay_min = 1.5
        if args.delay_max == 2.5: args.delay_max = 3.0
    else:
        print("🛠  Manual mode — using provided args without restrictions")

    if _SCOPE_HOURS > 0:
        print(f"⏳ Scope filter: keeping only ads published in the last {_SCOPE_HOURS}h")

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
    _env_probe = _load_laravel_env(Path(__file__).resolve().parent.parent / ".env")
    if _env_probe.get("DB_CONNECTION", "sqlite") == "sqlite" and not db_path.exists():
        print(f"[FATAL] REALTIX database not found at {db_path}", file=sys.stderr)
        return 1

    cats = CATEGORIES
    if args.categories:
        wanted = [s.strip() for s in args.categories.split(",") if s.strip()]
        cats = [c for c in CATEGORIES if c["slug"] in wanted]
        if not cats:
            print(f"[FATAL] No categories matched '{args.categories}'. Valid: {[c['slug'] for c in CATEGORIES]}", file=sys.stderr)
            return 1
    elif args.category:
        cats = [c for c in CATEGORIES if c["slug"] == args.category]
        if not cats:
            print(f"[FATAL] Unknown category '{args.category}'. Valid: {[c['slug'] for c in CATEGORIES]}", file=sys.stderr)
            return 1

    # --single-subtype / --subtype-only are deprecated since the single-pass refactor.
    # Subtypes are now derived in Python from listing characteristics (title/rooms/
    # description) instead of being inferred from URL filter passes. Flags kept for
    # backward CLI compat (cron commands may still pass them) but ignored.
    if args.single_subtype or args.subtype_only:
        log.warning(
            "--single-subtype / --subtype-only are DEPRECATED after the single-pass refactor. "
            "Subtypes are now derived from listing title/rooms in Python. Flags ignored."
        )

    print(f"🦊 Starting Firefox (headless={not args.no_headless})...")
    print(f"📁 DB: {db_path}")
    print(f"🏢 Agency ID: {args.agency}")
    print(f"📂 Categories: {len(cats)}")
    print(f"📄 Pages per category: {'ALL (until end of results)' if pages_arg is None else pages_arg}")
    if args.max_ads:
        print(f"🛑 Hard cap: {args.max_ads} ads")
    print()

    driver = make_driver(headless=not args.no_headless)
    global _current_driver
    _current_driver = driver
    driver_restart_count = 0  # per-run budget for crash recovery

    # Session warmup — only worth the time for morning sync.
    if _MODE == "morning":
        _session_warmup(driver)

    repo_root = Path(__file__).resolve().parent.parent
    conn, dialect = open_db_connection(repo_root, sqlite_path_override=str(db_path) if str(db_path) != str(REALTIX_DB_DEFAULT) else None)
    print(f"🗄  DB driver: {dialect}")

    # Register conn for the atexit fallback so SIGTERM mid-loop can still
    # finalize the scraper_runs row (the signal handler can't reach main's locals).
    global _current_db_conn, _current_db_dialect, SCRAPER_RUN_ID, _run_finalized
    _current_db_conn    = conn
    _current_db_dialect = dialect

    # Insert a 'running' row for this scrape. Returns None if the table is
    # missing (migrations not yet run) — downstream helpers no-op on None.
    # When a parallel group is active, suffix the mode (e.g. "hourly_a") so
    # the dashboard can distinguish concurrent runs by colour/filter.
    run_mode = f"{args.mode}_{_GROUP}" if _GROUP else args.mode
    SCRAPER_RUN_ID = _init_run_row(conn, dialect, mode=run_mode, pid=os.getpid())
    if SCRAPER_RUN_ID:
        log.info(f"Scraper run ID: {SCRAPER_RUN_ID} (mode={run_mode})")

    # Load list of recently-updated external IDs to skip (saves ~3-5s per ad)
    recently_updated: set[str] = set()
    if args.skip_recent_hours > 0:
        recently_updated = get_recently_updated_ids(conn, dialect, hours=args.skip_recent_hours)
        if recently_updated:
            print(f"💾 Skipping {len(recently_updated)} ads updated within last {args.skip_recent_hours}h")

    stats = {"new": 0, "updated": 0, "errors": 0, "skipped": 0, "processed": 0, "by_category": {}}
    # Per-type breakdown for the scraper_runs.category_stats JSON column.
    # Keyed by cat["type"] (apartment/house/…) so the UI can look up directly.
    category_stats_db: dict = {}
    total_stats = {"processed": 0, "new": 0, "updated": 0, "skipped": 0, "failed": 0}
    started = time.time()

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).replace(tzinfo=None)
    scope_cutoff = (
        datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=_SCOPE_HOURS)
        if _SCOPE_HOURS > 0
        else None
    )

    # Initial heartbeat — gives the watchdog something to read on slow first page loads.
    _write_heartbeat()
    last_heartbeat = time.time()

    try:
        global _current_category_name
        for cat in cats:
            cat_stats = {
                "new": 0, "updated": 0, "errors": 0, "skipped": 0, "processed": 0,
                # URLs whose detail-fetch failed (None return, generic exception, or
                # WebDriverException after the per-run restart budget was already
                # exhausted). Capped at 10 per category on flush to keep the JSON
                # blob small enough for Inertia roundtrips.
                "failed_urls": [],
            }
            stats["by_category"][cat["slug"]] = cat_stats
            cat_started = time.time()

            # Live progress: tell the dashboard which category is in flight.
            _current_category_name = cat["type"]
            _write_heartbeat()
            _update_run_row(conn, dialect, SCRAPER_RUN_ID, current_category=cat["type"])

            print(f"📂 {cat['label']} ({cat['slug']})")

            # Single-pass: one un-filtered URL fetch per category. The old multi-pass
            # approach (one URL per subtype via exo_*=N filter) gave wrong tags and
            # multiplied HTTP calls by ~5×. Subtype + extra_flags are now derived in
            # Python from listing title/rooms via derive_subtype_and_flags() right
            # before upsert. The outer for-pass loop is preserved as a single-iteration
            # wrapper to keep the inner skip-recent / scope-hours / driver-retry logic
            # unindented and stable.
            passes = [{"exo": None, "subtype": None, "extra_flags": None, "label": "main"}]

            for pass_ in passes:
                pass_subtype     = pass_["subtype"]      # always None in single-pass; kept for diff stability
                pass_extra_flags = pass_["extra_flags"]  # always None in single-pass; kept for diff stability

                print(f"  ── pass {pass_['label']} ──")
                try:
                    cards = collect_ad_urls(driver, cat["slug"], exo_param=pass_["exo"], max_pages=pages_arg)
                except WebDriverException as e:
                    # List-page fetch crashed — try driver restart once, then skip pass.
                    log.error(f"WebDriver crash on collect_ad_urls {cat['slug']}/{pass_['label']}: {e}")
                    if driver_restart_count < MAX_DRIVER_RESTARTS:
                        wait = BACKOFF_SECONDS[driver_restart_count]
                        log.warning(f"Restarting driver after collect crash (#{driver_restart_count + 1}/{MAX_DRIVER_RESTARTS}), sleeping {wait}s")
                        safe_quit_driver(driver)
                        time.sleep(wait)
                        try:
                            driver = make_driver(headless=not args.no_headless)
                            _current_driver = driver
                        except Exception as init_err:
                            log.critical(f"Driver re-init failed: {init_err}")
                            raise
                        driver_restart_count += 1
                    else:
                        log.critical(f"Driver restart budget exhausted ({MAX_DRIVER_RESTARTS}) — bailing")
                        raise
                    continue  # skip this pass; next pass uses fresh driver
                print(f"    → {len(cards)} unique cards collected")

                consecutive_old = 0  # shared counter for --today-only and --scope-hours early-exit
                consecutive_recent = 0  # for early-exit when we hit already-processed zone

                for card in cards:
                    url           = card["url"]
                    external_id   = card["external_id"]
                    list_price    = card.get("price")
                    list_currency = card.get("currency")

                    if args.max_ads and stats["processed"] >= args.max_ads:
                        print(f"\n🛑 Hit max-ads limit ({args.max_ads})")
                        raise KeyboardInterrupt()

                    # Skip recently-updated ads. 999.md sorts pages desc by date, so
                    # 5 in a row already in our DB means we've reached the
                    # already-processed zone — safe to skip the rest. Skipped for
                    # mode=morning (catch-up run must scan everything).
                    if external_id in recently_updated:
                        consecutive_recent += 1
                        if consecutive_recent >= 5 and _MODE != "morning":
                            print(f"  ⏭️  Early-exit: 5 consecutive ads already processed in last {args.skip_recent_hours}h — skipping rest of {cat['slug']}/{pass_['label']}")
                            break
                        stats["skipped"] += 1
                        cat_stats["skipped"] += 1
                        # In single-pass mode we have no fresh subtype info on this path
                        # (no detail fetch performed) — nothing to write back.
                        continue
                    consecutive_recent = 0

                    # Periodic heartbeat (every minute) so the watchdog can tell the worker is alive.
                    if time.time() - last_heartbeat > 60:
                        _write_heartbeat()
                        last_heartbeat = time.time()

                    # Check DB state up front — most listings hit the SKIP/PRICE
                    # fast path (~0.1s) instead of a full Selenium detail fetch (~12s).
                    db_state = check_db_listing_state(conn, dialect, external_id)

                    try:
                        if db_state is None:
                            # NEW listing — full extraction (only branch that fetches the detail page)
                            ad = extract_ad(driver, url)
                            time.sleep(random.uniform(3, 5))  # anti-rate-limit between detail fetches
                            if not ad:
                                stats["errors"] += 1
                                cat_stats["errors"] += 1
                                cat_stats["failed_urls"].append(url[:200])
                                continue

                            # --scope-hours: skip ads published outside the time window.
                            # 5 consecutive out-of-scope ads end the category early.
                            if scope_cutoff is not None:
                                pub = ad.get("published_at")
                                if pub is None:
                                    print(f"    [warn] no published_at for #{ad.get('external_id')} — processing anyway")
                                else:
                                    pub_naive = pub.replace(tzinfo=None) if pub.tzinfo else pub
                                    if pub_naive < scope_cutoff:
                                        consecutive_old += 1
                                        if consecutive_old >= 5:
                                            print(f"  ⏭️  Early-exit: 5 consecutive ads older than {_SCOPE_HOURS}h — skipping rest")
                                            break
                                        continue
                                    else:
                                        consecutive_old = 0

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

                            # Derive subtype + extra_flags from extracted title/rooms/desc
                            derived_subtype, derived_flags = derive_subtype_and_flags(
                                type_=cat["type"],
                                rooms=ad.get("rooms"),
                                title=ad.get("title", "") or "",
                                description=ad.get("description", "") or "",
                            )
                            upsert_listing(conn, dialect, ad, cat, args.agency,
                                           subtype=derived_subtype, extra_flags=derived_flags or None)
                            conn.commit()
                            stats["new"] += 1
                            cat_stats["new"] += 1
                            title = (ad.get("title") or "")[:45]
                            price = ad.get("price")
                            price_str = f"{int(price):,} {ad['currency']}" if price else "—"
                            print(f"  ✅ NEW #{ad['external_id']:>9} | {title:<45} | {price_str:>12} | imgs={len(ad['images']):2} ph={'y' if ad['phone'] else 'n'}")

                        elif not db_state["has_phone"]:
                            # Existing but missing phone — retry detail fetch to capture it.
                            ad = extract_ad(driver, url)
                            time.sleep(random.uniform(3, 5))
                            if not ad:
                                # Detail failed — at least bump price + updated_at so we don't
                                # re-attempt within skip-recent-hours.
                                update_price_only(conn, dialect, db_state["id"], list_price, list_currency,
                                                  subtype=pass_subtype, extra_flags=pass_extra_flags)
                                conn.commit()
                                cur_str = list_currency or '—'
                                print(f"  ↻ UPD-light (no detail) #{external_id} | (list price: {list_price} {cur_str})")
                            else:
                                derived_subtype, derived_flags = derive_subtype_and_flags(
                                    type_=cat["type"],
                                    rooms=ad.get("rooms"),
                                    title=ad.get("title", "") or "",
                                    description=ad.get("description", "") or "",
                                )
                                upsert_listing(conn, dialect, ad, cat, args.agency,
                                               subtype=derived_subtype, extra_flags=derived_flags or None)
                                conn.commit()
                                title = (ad.get("title") or "")[:45]
                                price = ad.get("price")
                                price_str = f"{int(price):,} {ad['currency']}" if price else "—"
                                print(f"  📞 RETRY-phone #{ad['external_id']:>9} | {title:<45} | {price_str:>12} | imgs={len(ad['images']):2} ph={'y' if ad['phone'] else 'n'}")
                            stats["updated"] += 1
                            cat_stats["updated"] += 1

                        else:
                            # Existing + has phone → SKIP detail. Bump updated_at, sync price if changed,
                            # tag subtype/extra_flags if we're in a subtype/flag pass.
                            price_changed = (
                                list_price is not None
                                and db_state["price"] is not None
                                and abs(list_price - db_state["price"]) > 0.01
                            )
                            update_price_only(conn, dialect, db_state["id"], list_price, list_currency,
                                              subtype=pass_subtype, extra_flags=pass_extra_flags)
                            conn.commit()
                            marker = "💲 PRICE" if price_changed else "⏭️  SKIP"
                            cur_str = list_currency or '—'
                            print(f"  {marker} #{external_id} | (list price: {list_price} {cur_str})")
                            # Count price-unchanged listings as 'skipped' rather than
                            # 'updated'. We bumped updated_at + maybe wrote a subtype,
                            # but nothing material changed — the dashboard SKIP/UPDATE
                            # split is more useful when it reflects the marker line.
                            if price_changed:
                                stats["updated"] += 1
                                cat_stats["updated"] += 1
                            else:
                                stats["skipped"] += 1
                                cat_stats["skipped"] += 1

                        stats["processed"] += 1
                        cat_stats["processed"] += 1

                    except WebDriverException as e:
                        # Selenium / Firefox died mid-fetch. Skip this listing,
                        # try to restart the driver under the global retry budget,
                        # then continue with the next card.
                        # Defensive: if the crash happened between an upsert and
                        # its commit, the psycopg2 tx is now aborted and the next
                        # iteration's first cur.execute() would re-raise
                        # InFailedSqlTransaction. Rollback to clear that state.
                        try:
                            conn.rollback()
                        except Exception:
                            pass
                        log.error(f"WebDriver crash on {external_id}: {type(e).__name__}: {str(e)[:120]}")
                        stats["errors"] += 1
                        cat_stats["errors"] += 1
                        # Only record the URL once the restart budget is gone —
                        # earlier crashes self-heal via the driver restart below
                        # and don't represent a true failure.
                        if driver_restart_count >= MAX_DRIVER_RESTARTS:
                            cat_stats["failed_urls"].append(url[:200])
                        if driver_restart_count < MAX_DRIVER_RESTARTS:
                            wait = BACKOFF_SECONDS[driver_restart_count]
                            log.warning(f"Restarting driver (#{driver_restart_count + 1}/{MAX_DRIVER_RESTARTS}), sleeping {wait}s")
                            safe_quit_driver(driver)
                            time.sleep(wait)
                            try:
                                driver = make_driver(headless=not args.no_headless)
                                _current_driver = driver
                            except Exception as init_err:
                                log.critical(f"Driver re-init failed: {init_err}")
                                raise
                            driver_restart_count += 1
                        else:
                            log.critical(f"Driver restart budget exhausted ({MAX_DRIVER_RESTARTS}) — bailing")
                            raise
                    except Exception as e:
                        stats["errors"] += 1
                        cat_stats["errors"] += 1
                        cat_stats["failed_urls"].append(url[:200])
                        # Defensive rollback: when upsert_listing/update_price_only
                        # raises a psycopg2 error (IntegrityError, DataError, etc.),
                        # the transaction is left ABORTED. Every subsequent
                        # cur.execute() in the loop then re-raises InFailedSqlTransaction
                        # and the run dies with "Scraper aborted". This cost runs
                        # #3, #36 and #44 between 104 and 193 listings each — clear
                        # the aborted tx before continuing the loop.
                        try:
                            conn.rollback()
                        except Exception:
                            pass
                        print(f"  ❌ {url}: {type(e).__name__}: {str(e)[:80]}")

                    time.sleep(random.uniform(args.delay_min, args.delay_max))

            # Per-category flush: stash one entry in category_stats_db (keyed by
            # type), accumulate totals, push everything to the run row so the
            # dashboard's live-progress card refreshes after each category.
            category_stats_db[cat["type"]] = {
                "processed":    cat_stats["processed"],
                "new":          cat_stats["new"],
                "updated":      cat_stats["updated"],
                "skipped":      cat_stats["skipped"],
                "failed":       cat_stats["errors"],
                "failed_urls":  cat_stats["failed_urls"][:10],
                "duration_sec": int(time.time() - cat_started),
            }
            for k in ("processed", "new", "updated", "skipped", "failed"):
                total_stats[k] += category_stats_db[cat["type"]][k]
            _update_run_row(conn, dialect, SCRAPER_RUN_ID,
                category_stats=category_stats_db,
                total_processed=total_stats["processed"],
                total_new=total_stats["new"],
                total_updated=total_stats["updated"],
                total_skipped=total_stats["skipped"],
                total_failed=total_stats["failed"],
            )

            print()

    except KeyboardInterrupt:
        print("\n[interrupted]")
        _finalize_run(conn, dialect, SCRAPER_RUN_ID, status="killed",
                      error_msg="KeyboardInterrupt / --max-ads cap hit")
        _run_finalized = True
    except ScraperBlocked as e:
        print(f"\n🚫 SCRAPER BLOCKED: {e}", file=sys.stderr)
        _finalize_run(conn, dialect, SCRAPER_RUN_ID, status="failed",
                      error_msg=f"ScraperBlocked: {e}", exit_code=42)
        _run_finalized = True
        return 42
    except Exception as e:
        log.critical(f"Scraper aborted: {type(e).__name__}: {e}")
        _finalize_run(conn, dialect, SCRAPER_RUN_ID, status="failed",
                      error_msg=f"{type(e).__name__}: {str(e)[:500]}", exit_code=1)
        _run_finalized = True
        raise
    finally:
        # Normal-exit finalization. SIGTERM/SIGINT raises SystemExit (NOT
        # Exception) which bypasses the except blocks above, so we have to
        # branch on _terminated_by_signal here too — otherwise the watchdog
        # killing a stuck scraper would log it as 'success'.
        if not _run_finalized and SCRAPER_RUN_ID:
            if _terminated_by_signal:
                _finalize_run(conn, dialect, SCRAPER_RUN_ID, status="killed",
                              error_msg="Process received termination signal")
            else:
                _finalize_run(conn, dialect, SCRAPER_RUN_ID, status="success", exit_code=0)
            _run_finalized = True
        try:
            conn.close()
        except Exception:
            pass
        safe_quit_driver(driver)
        _current_driver = None
        _clear_heartbeat()

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
