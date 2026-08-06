#!/usr/bin/env python3
"""
Lifetime Coding Stats — Local version (no GitHub Actions needed).
Uses GitHub API language-bytes endpoint to estimate LOC across all repos.
Run locally → updates README → you push.
"""

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError

# Fix Windows console encoding for emoji support
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# ─── Config ───────────────────────────────────────────────────────────────────

GH_TOKEN = os.environ.get("GH_TOKEN", "")
USERNAME = "Build-with-Akshit"
README   = Path(__file__).resolve().parent.parent / "README.md"

START_MARKER = "<!-- LOC_STATS_START -->"
END_MARKER   = "<!-- LOC_STATS_END -->"

# Average bytes per line of code (industry standard estimate)
# Different languages have different averages
BYTES_PER_LINE = {
    "Kotlin":     35,
    "Java":       38,
    "Python":     30,
    "Dart":       34,
    "JavaScript": 32,
    "TypeScript": 34,
    "C++":        36,
    "C":          32,
    "Go":         28,
    "Rust":       34,
    "HTML":       45,
    "CSS":        30,
    "SCSS":       28,
    "Shell":      25,
    "Bash":       25,
    "Ruby":       28,
    "PHP":        32,
    "Swift":      34,
    "Lua":        26,
    "R":          28,
    "Jupyter Notebook": 50,
    "CMake":      30,
    "Makefile":   25,
    "Dockerfile": 22,
    "YAML":       28,
    "JSON":       30,
    "XML":        50,
    "Markdown":   40,
}
DEFAULT_BPL = 32  # default bytes per line for unknown languages

# ─── GitHub API ───────────────────────────────────────────────────────────────

def gh_api(endpoint: str):
    """Call GitHub REST API with pagination."""
    results = []
    url = f"https://api.github.com{endpoint}"

    while url:
        req = Request(url)
        req.add_header("Accept", "application/vnd.github+json")
        req.add_header("X-GitHub-Api-Version", "2022-11-28")
        req.add_header("User-Agent", "LOC-Counter")
        if GH_TOKEN:
            req.add_header("Authorization", f"Bearer {GH_TOKEN}")

        try:
            with urlopen(req) as resp:
                data = json.loads(resp.read().decode())
                if isinstance(data, list):
                    results.extend(data)
                else:
                    return data

                link_header = resp.headers.get("Link", "")
                url = None
                for part in link_header.split(","):
                    if 'rel="next"' in part:
                        url = part.split(";")[0].strip().strip("<>")
        except HTTPError as e:
            print(f"  ⚠ API error {e.code}: {e.reason}")
            break

    return results


def fetch_repos():
    """Fetch all owned repos (excludes forks)."""
    if GH_TOKEN:
        repos = gh_api("/user/repos?per_page=100&affiliation=owner&type=all")
    else:
        repos = gh_api(f"/users/{USERNAME}/repos?per_page=100&type=owner")

    repos = [r for r in repos if not r.get("fork", False)]
    print(f"📦 Found {len(repos)} repositories (forks excluded)")
    return repos


def get_repo_languages(owner: str, repo: str) -> dict:
    """Get language bytes for a repo via GitHub API."""
    return gh_api(f"/repos/{owner}/{repo}/languages") or {}


# ─── LOC Calculation ─────────────────────────────────────────────────────────

def bytes_to_loc(lang: str, byte_count: int) -> int:
    """Convert language bytes to estimated lines of code."""
    bpl = BYTES_PER_LINE.get(lang, DEFAULT_BPL)
    return byte_count // bpl


def aggregate_stats(repos):
    """Aggregate language stats across all repos."""
    all_langs = {}  # {language: total_bytes}
    counted = 0

    for i, repo in enumerate(repos, 1):
        name = repo["name"]
        owner = repo["owner"]["login"]
        print(f"  [{i}/{len(repos)}] 📂 {name}", end="")

        languages = get_repo_languages(owner, name)

        if languages:
            for lang, bytes_count in languages.items():
                all_langs[lang] = all_langs.get(lang, 0) + bytes_count
            total_bytes = sum(languages.values())
            print(f"  → {total_bytes:,} bytes ({len(languages)} languages)")
            counted += 1
        else:
            print("  → (empty)")

    # Convert bytes to LOC
    lang_loc = {}
    for lang, total_bytes in all_langs.items():
        loc = bytes_to_loc(lang, total_bytes)
        if loc > 0:
            lang_loc[lang] = loc

    total_loc = sum(lang_loc.values())
    return total_loc, lang_loc, counted


# ─── README Updater ──────────────────────────────────────────────────────────

def format_number(n: int) -> str:
    return f"{n:,}"


def build_stats_block(total_loc, langs, repo_count):
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    sorted_langs = sorted(langs.items(), key=lambda x: x[1], reverse=True)
    top_langs = sorted_langs[:8]

    lang_parts = []
    for lang, lines in top_langs:
        pct = (lines / total_loc * 100) if total_loc > 0 else 0
        lang_parts.append(f"{lang} ({pct:.1f}%)")

    lang_str = ", ".join(lang_parts)

    return f"""
```text
📝 Total Lines of Code : {format_number(total_loc)}
📦 Total Repositories  : {repo_count}
💻 Languages           : {lang_str}
🕒 Last Updated        : {now}
```
"""


def update_readme(stats_block):
    if not README.exists():
        print(f"❌ README not found at {README}")
        sys.exit(1)

    content = README.read_text(encoding="utf-8")

    if START_MARKER not in content or END_MARKER not in content:
        print("❌ Markers not found in README!")
        sys.exit(1)

    pattern = re.escape(START_MARKER) + r".*?" + re.escape(END_MARKER)
    replacement = f"{START_MARKER}\n{stats_block}\n{END_MARKER}"
    new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

    README.write_text(new_content, encoding="utf-8")
    print(f"\n✅ README updated!")


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("🚀 Lifetime Coding Stats — LOC Counter (Local)")
    print("=" * 60)

    if not GH_TOKEN:
        print("⚠  No GH_TOKEN found. Only PUBLIC repos will be counted.")
        print("   Set it: $env:GH_TOKEN = 'your_token_here'\n")

    repos = fetch_repos()
    if not repos:
        print("❌ No repositories found!")
        sys.exit(1)

    print(f"\n📊 Scanning {len(repos)} repos...\n")
    total_loc, all_langs, counted = aggregate_stats(repos)

    print("\n" + "=" * 60)
    print(f"📊 TOTAL: {format_number(total_loc)} lines across {counted} repos")
    print("=" * 60)

    # Show breakdown
    sorted_langs = sorted(all_langs.items(), key=lambda x: x[1], reverse=True)
    print("\n📋 Language Breakdown:")
    for lang, lines in sorted_langs[:15]:
        pct = (lines / total_loc * 100) if total_loc > 0 else 0
        bar = "█" * int(pct / 2)
        print(f"   {lang:20s} {format_number(lines):>10s} lines  ({pct:5.1f}%)  {bar}")

    stats_block = build_stats_block(total_loc, all_langs, counted)
    update_readme(stats_block)

    print("\n🎉 Done! Now just: git add -A && git commit && git push")


if __name__ == "__main__":
    main()
