#!/usr/bin/env python3
"""Validate a bounded Google Sheets CSV export without changing source files."""
import argparse
import csv
import hashlib
import json
import re
import sys
from pathlib import Path

REQUIRED = ("序号", "原始信息来源", "原文", "检测点", "催眠", "催醒")

def normalize(value):
    return re.sub(r"\s+", "", str(value or "")).casefold()

def audit(path):
    with Path(path).open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        missing = sorted(set(REQUIRED) - set(reader.fieldnames or []))
        if missing:
            raise ValueError("Missing columns: " + ", ".join(missing))
        seen_ids, seen_text = set(), set()
        stats = dict(rows=0, complete=0, incomplete=0, duplicate_ids=0,
                     duplicate_text=0, missing_source=0)
        for row in reader:
            if not any(normalize(v) for v in row.values()):
                continue
            stats["rows"] += 1
            identity = normalize(row["序号"])
            excerpt = normalize(row["原文"])
            if identity:
                if identity in seen_ids:
                    stats["duplicate_ids"] += 1
                seen_ids.add(identity)
            if excerpt:
                digest = hashlib.sha256(excerpt.encode()).hexdigest()
                if digest in seen_text:
                    stats["duplicate_text"] += 1
                seen_text.add(digest)
            if not normalize(row["原始信息来源"]):
                stats["missing_source"] += 1
            if all(normalize(row[k]) for k in REQUIRED):
                stats["complete"] += 1
            else:
                stats["incomplete"] += 1
    stats["unique_ids"] = len(seen_ids)
    stats["unique_texts"] = len(seen_text)
    stats["semantic_duplicates"] = "not_checked"
    return stats

def main():
    p = argparse.ArgumentParser()
    p.add_argument("csv_path", help="Exported source sheet, UTF-8 CSV")
    p.add_argument("--output", help="Optional JSON report destination")
    args = p.parse_args()
    try:
        result = audit(args.csv_path)
    except (OSError, ValueError, csv.Error) as exc:
        print(str(exc), file=sys.stderr)
        return 2
    report = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        Path(args.output).write_text(report, encoding="utf-8")
    print(report, end="")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
