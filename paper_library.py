#!/usr/bin/env python3
"""Download and audit the curated AI paper library (Python standard library only)."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import socket
import sys
import tempfile
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CATALOG = ROOT / "catalog.csv"
LIBRARY = ROOT / "library"
STATUS = ROOT / "download_status.json"
MAX_BYTES = 200 * 1024 * 1024


def entries():
    with CATALOG.open(newline="", encoding="utf-8") as file:
        rows = list(csv.DictReader(file))
    required = {"id", "year", "area", "title", "authors", "source_url", "pdf_url"}
    if not rows or not required.issubset(rows[0]):
        raise ValueError("catalog.csv is empty or has missing columns")
    ids = [row["id"] for row in rows]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate paper IDs in catalog.csv")
    for row in rows:
        if not re.fullmatch(r"[a-zA-Z0-9_]+", row["id"]):
            raise ValueError(f"Unsafe ID: {row['id']}")
        if not re.fullmatch(r"\d{4}", row["year"]):
            raise ValueError(f"Invalid year: {row['id']}")
        if not re.fullmatch(r"\d{2}_[a-zA-Z0-9_]+", row["area"]):
            raise ValueError(f"Unsafe area: {row['id']}")
        if not row["source_url"].startswith(("https://", "http://")):
            raise ValueError(f"Invalid source URL: {row['id']}")
        if row["pdf_url"] and not row["pdf_url"].startswith(("https://", "http://")):
            raise ValueError(f"Invalid PDF URL: {row['id']}")
    return sorted(rows, key=lambda row: (int(row["year"]), row["id"]))


def target(row):
    return LIBRARY / row["area"] / f"{row['year']}_{row['id']}.pdf"


def is_pdf(path):
    if not path.is_file() or path.stat().st_size < 1024:
        return False
    with path.open("rb") as file:
        if not file.read(8).startswith(b"%PDF-"):
            return False
        file.seek(-min(path.stat().st_size, 1024), 2)
        return b"%%EOF" in file.read()


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_status():
    if not STATUS.exists():
        return {}
    with STATUS.open(encoding="utf-8") as file:
        return json.load(file)


def save_status(status):
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=ROOT, delete=False) as file:
        json.dump(status, file, indent=2, sort_keys=True)
        file.write("\n")
        temporary = Path(file.name)
    temporary.replace(STATUS)


def download(row, timeout):
    destination = target(row)
    destination.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(
        row["pdf_url"],
        headers={"User-Agent": "AI-Paper-Library/1.0 (personal research archive)"},
    )
    temporary = None
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            with tempfile.NamedTemporaryFile("wb", dir=destination.parent, delete=False) as file:
                temporary = Path(file.name)
                size = 0
                for chunk in iter(lambda: response.read(1024 * 1024), b""):
                    size += len(chunk)
                    if size > MAX_BYTES:
                        raise ValueError("PDF exceeds 200 MB limit")
                    file.write(chunk)
        if not is_pdf(temporary):
            raise ValueError("Source did not return a PDF")
        temporary.replace(destination)
        return {"state": "downloaded", "bytes": destination.stat().st_size,
                "sha256": sha256(destination), "url": row["pdf_url"],
                "checked_utc": datetime.now(timezone.utc).isoformat()}
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["init", "download", "status", "verify", "index"])
    parser.add_argument("--limit", type=int, default=0, help="Maximum download attempts (0 = all)")
    parser.add_argument("--area", help="Only this directory category")
    parser.add_argument("--timeout", type=int, default=25, help="Per-request timeout in seconds")
    args = parser.parse_args()
    rows = entries()
    if args.area:
        rows = [row for row in rows if row["area"] == args.area]
    if args.command == "init":
        for row in sorted(rows, key=lambda item: (item["area"], int(item["year"]), item["id"])):
            target(row).parent.mkdir(parents=True, exist_ok=True)
        print(f"Initialized {len({row['area'] for row in rows})} category directories")
        return 0
    if args.command == "index":
        lines = ["# Paper index", "", "Generated from `catalog.csv`. A check mark means a valid PDF is present locally.", ""]
        timeline = ["# Chronological paper timeline", "", "Generated from `catalog.csv`. A check mark means a valid PDF is present locally.", ""]
        current_area = None
        for row in sorted(rows, key=lambda item: (item["area"], int(item["year"]), item["id"])):
            if row["area"] != current_area:
                current_area = row["area"]
                lines.extend([f"## {current_area.replace('_', ' ')}", ""])
            path = target(row)
            saved = is_pdf(path)
            link = path.relative_to(ROOT).as_posix() if saved else row["source_url"]
            lines.append(f"- [{'x' if saved else ' '}] {row['year']} [{row['title']}]({link}) — {row['authors']}")
        lines.append("")
        (ROOT / "INDEX.md").write_text("\n".join(lines), encoding="utf-8")
        current_year = None
        for row in rows:
            if row["year"] != current_year:
                current_year = row["year"]
                timeline.extend([f"## {current_year}", ""])
            path = target(row)
            saved = is_pdf(path)
            link = path.relative_to(ROOT).as_posix() if saved else row["source_url"]
            timeline.append(f"- [{'x' if saved else ' '}] [{row['title']}]({link}) — {row['authors']} · {row['area'].replace('_', ' ')}")
        timeline.append("")
        (ROOT / "TIMELINE.md").write_text("\n".join(timeline), encoding="utf-8")
        print(f"Wrote INDEX.md and TIMELINE.md for {len(rows)} papers")
        return 0
    status = load_status()
    attempts = 0
    failures = 0
    for row in rows:
        path = target(row)
        if is_pdf(path):
            actual = sha256(path)
            prior = status.get(row["id"], {})
            state = "downloaded" if not prior.get("sha256") or prior["sha256"] == actual else "checksum_mismatch"
            status[row["id"]] = {"state": state, "bytes": path.stat().st_size,
                                  "sha256": prior["sha256"] if state == "checksum_mismatch" else actual,
                                  "url": row["pdf_url"], "path": str(path.relative_to(ROOT))}
            if state == "checksum_mismatch":
                status[row["id"]]["observed_sha256"] = actual
                failures += 1
            continue
        if path.exists():
            status[row["id"]] = {"state": "invalid_pdf", "path": str(path.relative_to(ROOT))}
            failures += 1
            continue
        if not row["pdf_url"]:
            status[row["id"]] = {"state": "source_needed", "source_url": row["source_url"]}
            continue
        if args.command != "download":
            previous = status.get(row["id"], {})
            if previous.get("state") != "failed" or previous.get("url") != row["pdf_url"]:
                status[row["id"]] = {"state": "pending", "url": row["pdf_url"]}
            continue
        if args.limit and attempts >= args.limit:
            status[row["id"]] = {"state": "pending", "url": row["pdf_url"]}
            continue
        attempts += 1
        print(f"[{attempts}] {row['year']} {row['title']}", flush=True)
        try:
            status[row["id"]] = download(row, args.timeout)
            status[row["id"]]["path"] = str(path.relative_to(ROOT))
            print(f"  saved {path.relative_to(ROOT)}", flush=True)
        except (urllib.error.URLError, TimeoutError, OSError, ValueError) as error:
            status[row["id"]] = {"state": "failed", "url": row["pdf_url"],
                                  "error": str(error), "checked_utc": datetime.now(timezone.utc).isoformat()}
            failures += 1
            print(f"  failed: {error}", file=sys.stderr, flush=True)
            if isinstance(error, urllib.error.URLError) and isinstance(error.reason, socket.gaierror):
                print("DNS is unavailable; stopping the batch so the remaining papers can be resumed later.", file=sys.stderr)
                break
        finally:
            save_status(status)
    save_status(status)
    counts = {}
    for row in rows:
        state = status.get(row["id"], {}).get("state", "pending")
        counts[state] = counts.get(state, 0) + 1
    print(json.dumps(counts, sort_keys=True))
    if args.command == "verify" and counts.get("downloaded", 0) != len(rows):
        return 1
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
