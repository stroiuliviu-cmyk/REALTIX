#!/usr/bin/env python3
"""
Re-compress backlog of existing scraped images in-place.

Usage:
    # Dry run (estimate only, no changes):
    python python_scraper/recompress_backlog.py --dry-run

    # Real run (in background with logging):
    nohup /home/forge/scraper-venv/venv/bin/python \\
        python_scraper/recompress_backlog.py \\
        > /home/forge/recompress.log 2>&1 &

    # Monitor:
    tail -f /home/forge/recompress.log

Config via env vars:
    SCRAPER_IMAGES_DIR  Path to scraped/ folder
                       (default: /home/forge/realtix.eu/storage/app/public/scraped)
    MAX_SIZE           Max dimension on long side in pixels (default: 800)
    QUALITY            JPEG quality 1-100 (default: 80)
    SKIP_BELOW_KB      Skip files smaller than this (default: 50)
"""

import argparse
import io
import os
import sys
import time
from pathlib import Path

from PIL import Image


DEFAULT_ROOT = "/home/forge/realtix.eu/storage/app/public/scraped"
REDUCTION_THRESHOLD = 0.95  # keep new file only if it's < 95% of original


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Re-compress backlog of scraped JPEGs in place.")
    p.add_argument("--dry-run", action="store_true",
                   help="Estimate savings without modifying any files.")
    return p.parse_args()


def cleanup_orphans(root: Path, dry_run: bool) -> int:
    """Remove .jpg.tmp leftovers from previous interrupted runs."""
    count = 0
    for tmp in root.glob("*/*.jpg.tmp"):
        if dry_run:
            print(f"  [orphan] would delete {tmp}")
        else:
            try:
                tmp.unlink()
            except OSError:
                pass
        count += 1
    return count


def process_image(path: Path, max_size: int, quality: int, dry_run: bool):
    """Returns (size_before, size_after, error_msg).
    size_after equals size_before when no rewrite happens (skip / no-reduction)."""
    size_before = path.stat().st_size
    try:
        # Load fully into memory and close source file handle before any writes.
        with open(path, "rb") as f:
            raw = f.read()
        img = Image.open(io.BytesIO(raw))

        if img.mode != "RGB":
            img = img.convert("RGB")

        if max(img.size) > max_size:
            img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)

        if dry_run:
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=quality, optimize=True, progressive=True)
            size_new = buf.tell()
            if size_new < size_before * REDUCTION_THRESHOLD:
                return (size_before, size_new, None)
            return (size_before, size_before, None)

        tmp = path.with_suffix(path.suffix + ".tmp")
        img.save(tmp, format="JPEG", quality=quality, optimize=True, progressive=True)
        size_new = tmp.stat().st_size

        if size_new < size_before * REDUCTION_THRESHOLD:
            os.replace(tmp, path)  # atomic on same filesystem
            return (size_before, size_new, None)

        tmp.unlink(missing_ok=True)
        return (size_before, size_before, None)
    except Exception as e:
        # Best-effort cleanup of partial tmp
        try:
            tmp = path.with_suffix(path.suffix + ".tmp")
            if tmp.exists():
                tmp.unlink(missing_ok=True)
        except OSError:
            pass
        return (size_before, size_before, str(e))


def fmt_mb(num_bytes: int) -> float:
    return num_bytes / (1024 * 1024)


def main() -> int:
    args = parse_args()
    root = Path(os.getenv("SCRAPER_IMAGES_DIR", DEFAULT_ROOT))
    max_size = int(os.getenv("MAX_SIZE", "800"))
    quality = int(os.getenv("QUALITY", "80"))
    skip_below_kb = int(os.getenv("SKIP_BELOW_KB", "50"))
    skip_below = skip_below_kb * 1024

    if not root.is_dir():
        print(f"ERROR: SCRAPER_IMAGES_DIR not found: {root}", file=sys.stderr)
        return 1

    mode = "DRY RUN" if args.dry_run else "LIVE"
    print(f"=== Backlog recompression [{mode}] ===")
    print(f"Root         : {root}")
    print(f"max_size     : {max_size}px on long side")
    print(f"quality      : {quality}")
    print(f"skip_below   : {skip_below_kb} KB")
    print(f"keep_new_if  : < {int(REDUCTION_THRESHOLD * 100)}% of original")
    print()

    # Cleanup .jpg.tmp orphans from any previous interrupted run
    orphans = cleanup_orphans(root, args.dry_run)
    if orphans:
        action = "Would delete" if args.dry_run else "Deleted"
        print(f"{action} {orphans} orphaned .jpg.tmp files")
        print()

    print("Scanning files...")
    files = sorted(root.glob("*/*.jpg"))
    total = len(files)
    print(f"Found {total} files")
    print()

    if total == 0:
        print("Nothing to do.")
        return 0

    stats = {
        "processed": 0,
        "skipped_small": 0,
        "skipped_no_reduction": 0,
        "skipped_error": 0,
        "bytes_before": 0,
        "bytes_after": 0,
    }
    errors: list[str] = []
    start_ts = time.time()

    for i, path in enumerate(files, start=1):
        try:
            size_before = path.stat().st_size
        except OSError as e:
            stats["skipped_error"] += 1
            if len(errors) < 10:
                errors.append(f"{path}: stat() failed: {e}")
            continue

        if size_before < skip_below:
            stats["skipped_small"] += 1
            stats["bytes_before"] += size_before
            stats["bytes_after"] += size_before
        else:
            sb, sa, err = process_image(path, max_size, quality, args.dry_run)
            stats["bytes_before"] += sb
            stats["bytes_after"] += sa
            if err:
                stats["skipped_error"] += 1
                if len(errors) < 10:
                    errors.append(f"{path}: {err}")
            elif sa == sb:
                stats["skipped_no_reduction"] += 1
            else:
                stats["processed"] += 1

        if i % 100 == 0:
            pct = i * 100 / total
            saved = fmt_mb(stats["bytes_before"] - stats["bytes_after"])
            print(f"[{i}/{total}] {pct:.1f}% — saved so far: {saved:.1f} MB", flush=True)

    elapsed = time.time() - start_ts
    mb_before = fmt_mb(stats["bytes_before"])
    mb_after = fmt_mb(stats["bytes_after"])
    mb_saved = mb_before - mb_after
    pct_red = (mb_saved / mb_before * 100) if mb_before > 0 else 0.0

    print()
    print("=" * 60)
    print(f"{mode} COMPLETE — elapsed {elapsed:.0f}s")
    print(f"  Total files            : {total}")
    print(f"  Recompressed           : {stats['processed']}")
    print(f"  Skipped (already small): {stats['skipped_small']}")
    print(f"  Skipped (no reduction) : {stats['skipped_no_reduction']}")
    print(f"  Skipped (error)        : {stats['skipped_error']}")
    print(f"  Size before            : {mb_before:.1f} MB")
    print(f"  Size after             : {mb_after:.1f} MB")
    print(f"  Saved                  : {mb_saved:.1f} MB ({pct_red:.1f}% reduction)")
    print("=" * 60)

    if errors:
        print()
        print(f"First {len(errors)} errors (of {stats['skipped_error']} total):")
        for err in errors:
            print(f"  - {err}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
