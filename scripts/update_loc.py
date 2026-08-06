#!/usr/bin/env python3
"""
Lifetime Coding Stats — Auto-update README with total LOC across all repos.
Uses `scc` (Sloc Cloc and Code) for fast, accurate line counting.
"""

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError

# ─── Config ───────────────────────────────────────────────────────────────────

GH_TOKEN  = os.environ.get("GH_TOKEN", "")
USERNAME  = os.environ.get("USERNAME", "Build-with-Akshit")
README    = Path(__file__).resolve().parent.parent / "README.md"

# Markers in README between which stats are injected
START_MARKER = "<!-- LOC_STATS_START -->"
END_MARKER   = "<!-- LOC_STATS_END -->"

# Directories to always exclude from counting
EXCLUDE_DIRS = [
    ".git", "node_modules", "vendor", "venv", ".venv", "__pycache__",
    "build", "dist", ".gradle", ".idea", ".vscode", ".dart_tool",
    "ios/Pods", ".pub-cache", "Pods", ".next", ".nuxt", "target",
    "out", "bin", "obj", ".cache", "coverage", "generated",
]

# ─── GitHub API Helpers ───────────────────────────────────────────────────────

def gh_api(endpoint: str) -> list | dict:
    """Call GitHub REST API with pagination support."""
    results = []
    url = f"https://api.github.com{endpoint}"

    while url:
        req = Request(url)
        req.add_header("Accept", "application/vnd.github+json")
        req.add_header("X-GitHub-Api-Version", "2022-11-28")
        if GH_TOKEN:
            req.add_header("Authorization", f"Bearer {GH_TOKEN}")

        try:
            with urlopen(req) as resp:
                data = json.loads(resp.read().decode())
                if isinstance(data, list):
                    results.extend(data)
                else:
                    return data  # single-object endpoint

                # Parse Link header for pagination
                link_header = resp.headers.get("Link", "")
                url = None
                for part in link_header.split(","):
                    if 'rel="next"' in part:
                        url = part.split(";")[0].strip().strip("<>")
        except HTTPError as e:
            print(f"⚠ API error {e.code} for {url}: {e.reason}")
            break

    return results


def fetch_repos() -> list[dict]:
    """Fetch all repositories for the user (public + private if token allows)."""
    if GH_TOKEN:
        # Authenticated: gets private repos too
        repos = gh_api("/user/repos?per_page=100&affiliation=owner&type=all")
    else:
        # Unauthenticated: only public repos
        repos = gh_api(f"/users/{USERNAME}/repos?per_page=100&type=owner")

    # Filter out forks
    repos = [r for r in repos if not r.get("fork", False)]

    print(f"📦 Found {len(repos)} repositories (forks excluded)")
    return repos


# ─── SCC / LOC Counting ──────────────────────────────────────────────────────

def install_scc():
    """Install scc if not already available."""
    if shutil.which("scc"):
        print("✅ scc already installed")
        return

    print("📥 Installing scc...")
    subprocess.run(
        [
            "bash", "-c",
            "curl -sL https://github.com/boyter/scc/releases/download/v3.4.0/"
            "scc_Linux_x86_64.tar.gz | tar xz -C /usr/local/bin scc"
        ],
        check=True,
    )
    print("✅ scc installed")


def clone_repo(clone_url: str, dest: str) -> bool:
    """Shallow-clone a repository. Returns True on success."""
    try:
        # Build clone URL with token for private repos
        if GH_TOKEN and clone_url.startswith("https://"):
            clone_url = clone_url.replace(
                "https://", f"https://x-access-token:{GH_TOKEN}@"
            )

        subprocess.run(
            ["git", "clone", "--depth=1", "--single-branch", clone_url, dest],
            check=True,
            capture_output=True,
            timeout=120,
        )
        return True
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as e:
        print(f"  ⚠ Clone failed: {e}")
        return False


def count_loc(repo_path: str) -> dict:
    """Run scc on a repo and return {language: lines} dict."""
    exclude_arg = ",".join(EXCLUDE_DIRS)

    try:
        result = subprocess.run(
            [
                "scc", repo_path,
                "--exclude-dir", exclude_arg,
                "--format", "json",
                "--no-cocomo",
                "--no-gen",       # skip generated files
                "--no-min-gen",   # skip minified generated files
            ],
            capture_output=True,
            text=True,
            timeout=300,
        )

        if result.returncode != 0:
            print(f"  ⚠ scc error: {result.stderr.strip()}")
            return {}

        if not result.stdout.strip():
            return {}

        data = json.loads(result.stdout)
        lang_lines = {}
        for entry in data:
            lang = entry.get("Name", "Unknown")
            lines = entry.get("Code", 0)
            if lines > 0:
                lang_lines[lang] = lang_lines.get(lang, 0) + lines

        return lang_lines

    except (subprocess.TimeoutExpired, json.JSONDecodeError) as e:
        print(f"  ⚠ Count error: {e}")
        return {}


# ─── Stats Aggregation ───────────────────────────────────────────────────────

def aggregate_stats(repos: list[dict]) -> tuple[int, dict, int]:
    """
    Clone each repo, count LOC, aggregate.
    Returns: (total_loc, {language: lines}, repo_count)
    """
    total_loc = 0
    all_langs: dict[str, int] = {}
    counted = 0

    with tempfile.TemporaryDirectory(prefix="loc_") as tmp:
        for i, repo in enumerate(repos, 1):
            name = repo["name"]
            clone_url = repo["clone_url"]
            print(f"\n[{i}/{len(repos)}] 📂 {name}")

            dest = os.path.join(tmp, name)
            if not clone_repo(clone_url, dest):
                continue

            lang_lines = count_loc(dest)

            repo_total = sum(lang_lines.values())
            total_loc += repo_total
            counted += 1

            for lang, lines in lang_lines.items():
                all_langs[lang] = all_langs.get(lang, 0) + lines

            print(f"  ✅ {repo_total:,} lines")

            # Cleanup immediately to save disk
            shutil.rmtree(dest, ignore_errors=True)

    return total_loc, all_langs, counted


# ─── README Updater ──────────────────────────────────────────────────────────

def format_number(n: int) -> str:
    """Format number with commas: 128534 → 128,534"""
    return f"{n:,}"


def build_stats_block(total_loc: int, langs: dict, repo_count: int) -> str:
    """Build the markdown stats block to inject into README."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    # Top languages by percentage
    sorted_langs = sorted(langs.items(), key=lambda x: x[1], reverse=True)
    top_langs = sorted_langs[:8]  # Show top 8

    lang_parts = []
    for lang, lines in top_langs:
        pct = (lines / total_loc * 100) if total_loc > 0 else 0
        lang_parts.append(f"{lang} ({pct:.1f}%)")

    lang_str = ", ".join(lang_parts)

    block = f"""
```text
📝 Total Lines of Code : {format_number(total_loc)}
📦 Total Repositories  : {repo_count}
💻 Languages           : {lang_str}
🕒 Last Updated        : {now}
```
"""
    return block


def update_readme(stats_block: str):
    """Replace content between markers in README."""
    if not README.exists():
        print(f"❌ README not found at {README}")
        sys.exit(1)

    content = README.read_text(encoding="utf-8")

    if START_MARKER not in content or END_MARKER not in content:
        print("❌ Markers not found in README!")
        print(f"   Add these markers where you want stats to appear:")
        print(f"   {START_MARKER}")
        print(f"   {END_MARKER}")
        sys.exit(1)

    # Replace everything between markers
    pattern = re.escape(START_MARKER) + r".*?" + re.escape(END_MARKER)
    replacement = f"{START_MARKER}\n{stats_block}\n{END_MARKER}"
    new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

    README.write_text(new_content, encoding="utf-8")
    print(f"\n✅ README updated at {README}")


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("🚀 Lifetime Coding Stats — LOC Counter")
    print("=" * 60)

    if not GH_TOKEN:
        print("⚠ No GH_TOKEN set. Only public repos will be counted.")
        print("  Set GH_TOKEN secret for private repos.\n")

    # Step 1: Install scc
    install_scc()

    # Step 2: Fetch all repos
    repos = fetch_repos()
    if not repos:
        print("❌ No repositories found!")
        sys.exit(1)

    # Step 3: Count LOC across all repos
    total_loc, all_langs, counted = aggregate_stats(repos)

    print("\n" + "=" * 60)
    print(f"📊 TOTAL: {format_number(total_loc)} lines across {counted} repos")
    print("=" * 60)

    # Step 4: Update README
    stats_block = build_stats_block(total_loc, all_langs, counted)
    update_readme(stats_block)

    print("\n🎉 Done!")


if __name__ == "__main__":
    main()
