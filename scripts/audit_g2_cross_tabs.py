#!/usr/bin/env python3
"""Read-only cross-tab G2 CSV audit. Does not modify source sheets or publish cases."""
import argparse
import csv
import hashlib
import json
import re
import unicodedata
from pathlib import Path

FIELDS = ("序号", "原始信息来源", "原文", "检测点", "催眠", "催醒")

def norm(value):
    return re.sub(r"\s+", "", unicodedata.normalize("NFKC", str(value or "")).casefold())

def fingerprint(value):
    return hashlib.sha256(norm(value).encode("utf-8")).hexdigest()

def audit(files):
    report = {"tabs": {}, "total_rows": 0, "duplicate_ids_within_tab": [],
              "duplicate_text_across_tabs": [], "missing_required": [],
              "semantic_duplicates": "not_checked", "publish_ready": False}
    text_seen = {}
    for path in files:
        tab = Path(path).stem
        if tab in report["tabs"]:
            raise ValueError("Duplicate tab filename: " + tab)
        seen_ids = set()
        stats = {"rows": 0, "unique_ids": 0, "complete": 0, "incomplete": 0}
        with open(path, encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            missing = set(FIELDS) - set(reader.fieldnames or [])
            if missing:
                raise ValueError(f"{tab}: missing columns {sorted(missing)}")
            for line, row in enumerate(reader, 2):
                if not any(norm(v) for v in row.values()):
                    continue
                stats["rows"] += 1
                report["total_rows"] += 1
                ident = norm(row["序号"])
                if ident:
                    if ident in seen_ids:
                        report["duplicate_ids_within_tab"].append({"tab": tab, "line": line, "id": row["序号"]})
                    seen_ids.add(ident)
                missing_fields = [key for key in FIELDS if not norm(row[key])]
                if missing_fields:
                    stats["incomplete"] += 1
                    report["missing_required"].append({"tab": tab, "line": line, "fields": missing_fields})
                else:
                    stats["complete"] += 1
                original = norm(row["原文"])
                if original:
                    digest = fingerprint(original)
                    if digest in text_seen:
                        report["duplicate_text_across_tabs"].append({
                            "first": text_seen[digest], "duplicate": {"tab": tab, "line": line}, "sha256": digest
                        })
                    else:
                        text_seen[digest] = {"tab": tab, "line": line}
        stats["unique_ids"] = len(seen_ids)
        report["tabs"][tab] = stats
    report["unique_original_fingerprints"] = len(text_seen)
    return report

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("csv_files", nargs="+", help="Bounded UTF-8 CSV exports; no Google write access")
    parser.add_argument("--output", help="Optional local JSON report")
    args = parser.parse_args()
    result = audit(args.csv_files)
    data = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        Path(args.output).write_text(data, encoding="utf-8")
    print(data, end="")

if __name__ == "__main__":
    main()
