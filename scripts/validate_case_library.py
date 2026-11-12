#!/usr/bin/env python3
"""Validate the case manifest and case-file schema without network/API calls."""
import json
import pathlib
import sys
import unicodedata

ROOT = pathlib.Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / "data/case-manifest.json").read_text(encoding="utf-8"))
assert manifest.get("schemaVersion") == 1
entries = manifest.get("files")
assert isinstance(entries, list) and entries
seen_paths, seen_ids, seen_titles = set(), set(), set()
errors = []
count = 0
for entry in entries:
    rel = entry.get("path", "")
    if not isinstance(rel, str) or not rel.startswith("data/research-candidates-social-religion-") or not rel.endswith(".json") or ".." in rel:
        errors.append(f"Invalid manifest path: {rel!r}")
        continue
    if rel in seen_paths:
        errors.append(f"Duplicate manifest path: {rel}")
        continue
    seen_paths.add(rel)
    path = ROOT / rel
    if not path.is_file():
        errors.append(f"Missing file: {rel}")
        continue
    try:
        obj = json.loads(path.read_text(encoding="utf-8"))
    except (ValueError, UnicodeError) as exc:
        errors.append(f"Invalid JSON {rel}: {exc}")
        continue
    cases = obj.get("cases")
    if not isinstance(cases, list):
        errors.append(f"Missing cases array: {rel}")
        continue
    for i, case in enumerate(cases):
        count += 1
        if not isinstance(case, dict):
            errors.append(f"{rel} #{i}: not an object")
            continue
        for key in ("id", "title", "category", "prompt", "check", "risk", "wake", "counter", "sourceTitle", "sourceUrl", "sourceDate", "originalExcerpt", "originalRewrite", "evidenceStatus"):
            if key not in case:
                errors.append(f"{rel} #{i}: missing {key}")
        if case.get("category") not in ("社会", "宗教"):
            errors.append(f"{rel} #{i}: invalid category")
        cid = case.get("id")
        if not isinstance(cid, str) or not cid.strip():
            errors.append(f"{rel} #{i}: invalid ID")
        elif cid in seen_ids:
            errors.append(f"{rel} #{i}: duplicate ID {cid}")
        else:
            seen_ids.add(cid)
        title = case.get("title", "")
        norm = unicodedata.normalize("NFKC", str(title)).casefold().strip()
        if norm in seen_titles:
            errors.append(f"{rel} #{i}: duplicate title {title}")
        seen_titles.add(norm)
        status = str(case.get("evidenceStatus", ""))
        if not status:
            errors.append(f"{rel} #{i}: empty evidence status")
        if "原创模拟" in status and case.get("originalExcerpt"):
            errors.append(f"{rel} #{i}: simulated case has original excerpt; manual source check required")
app = (ROOT / "app.js").read_text(encoding="utf-8")
if "data/case-manifest.json" not in app:
    errors.append("app.js does not load the case manifest")
if "loadCaseManifest()" not in app:
    errors.append("app.js is missing manifest loader")
print(f"Validated {len(seen_paths)} manifest files, {count} cases, {len(seen_ids)} unique IDs")
if errors:
    for error in errors:
        print("ERROR:", error, file=sys.stderr)
    sys.exit(1)
print("PASS: structural checks. Semantic duplication and browser deployment require separate review.")
