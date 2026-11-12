#!/usr/bin/env python3
"""Cross-file case audit: strict ID integrity, advisory semantic overlap, reproducible JSON report."""
import difflib
import hashlib
import json
import pathlib
import re
import sys
import unicodedata

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
manifest = json.loads((DATA / "case-manifest.json").read_text(encoding="utf-8"))
paths = ["social-religion-batch-01.json", "social-religion-awakenology-scenarios-20261111.json"]
paths += [entry["path"].removeprefix("data/") for entry in manifest["files"]]
errors, warnings, cases = [], [], []
seen_paths = set()
for name in paths:
    if name in seen_paths:
        errors.append(f"Duplicate case file in loader: {name}")
        continue
    seen_paths.add(name)
    path = DATA / name
    if not path.is_file():
        errors.append(f"Missing case file: {name}")
        continue
    try:
        records = json.loads(path.read_text(encoding="utf-8"))["cases"]
        if not isinstance(records, list):
            raise ValueError("cases must be an array")
    except (ValueError, KeyError, UnicodeError) as exc:
        errors.append(f"Invalid case file {name}: {exc}")
        continue
    for pos, case in enumerate(records):
        if not isinstance(case, dict):
            errors.append(f"{name} row {pos} is not an object")
            continue
        cases.append((name, case))
def normalize(value):
    return re.sub(r"[\\W_]+", "", unicodedata.normalize("NFKC", str(value)).casefold())
ids, exact_titles, fingerprints = {}, {}, {}
for name, case in cases:
    cid = case.get("id")
    if not isinstance(cid, str) or not cid.strip():
        errors.append(f"{name}: missing ID")
        continue
    if cid in ids:
        errors.append(f"Duplicate ID {cid}: {ids[cid]} and {name}")
    ids[cid] = name
    title = normalize(case.get("title", ""))
    if not title:
        errors.append(f"{name} {cid}: empty title")
    elif title in exact_titles:
        warnings.append({"type": "duplicate_title", "a": exact_titles[title], "b": cid})
    else:
        exact_titles[title] = cid
    # Title + scenario, not metadata or labels; identical content is a stronger signal.
    fp = hashlib.sha256((normalize(case.get("title", "")) + "|" + normalize(case.get("prompt", ""))).encode()).hexdigest()
    if fp in fingerprints:
        errors.append(f"Exact repeated title+prompt: {fingerprints[fp]} and {cid}")
    fingerprints[fp] = cid
# Report high-similarity titles for manual review; never label as proven duplicate.
unique = [(normalize(c.get("title", "")), c.get("id")) for _, c in cases]
for i, (a, aid) in enumerate(unique):
    if len(a) < 9:
        continue
    for b, bid in unique[i + 1:]:
        if abs(len(a) - len(b)) > max(5, len(a) // 5) or not b:
            continue
        if difflib.SequenceMatcher(None, a, b, autojunk=False).ratio() >= 0.92 and a != b:
            if len(warnings) < 300:
                warnings.append({"type": "similar_title_review", "a": aid, "b": bid})
unlisted = sorted(p.name for p in DATA.glob("research-candidates-social-religion-*.json") if p.name not in seen_paths)
for name in unlisted:
    warnings.append({"type": "unlisted_batch", "file": name})
report = {"schemaVersion": 1, "checkedFiles": len(seen_paths), "checkedCases": len(cases), "uniqueIds": len(ids), "errors": errors, "reviewItems": warnings}
output = ROOT / "case-audit-report.json"
output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Audited {len(cases)} cases in {len(seen_paths)} files: {len(errors)} errors, {len(warnings)} review items")
for error in errors[:30]:
    print("ERROR:", error, file=sys.stderr)
if errors:
    sys.exit(1)
