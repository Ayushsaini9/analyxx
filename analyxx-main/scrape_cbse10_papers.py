"""
Scrape CBSE Class 10 PYQ papers from the official CBSE website (cbse.gov.in).

The official site hosts papers at predictable URLs:
  Main exams:  https://www.cbse.gov.in/cbsenew/question-paper/{year}/X/{Subject}.zip
  Single PDFs: https://www.cbse.gov.in/cbsenew/question-paper/{year}/X/{code}_{Subject}.pdf

Strategy:
  1. Try downloading ZIP archives for each subject & year from cbse.gov.in
  2. Extract the first (or largest) PDF from each ZIP
  3. For subjects hosted as single PDFs, download those directly
  4. Save with naming convention: class10_{subject}_{year}.pdf
  5. Ready for upload via upload_library_papers.py

Usage:
  python scrape_cbse10_papers.py                     # Download all missing papers
  python scrape_cbse10_papers.py --dry-run            # Preview only
  python scrape_cbse10_papers.py --upload             # Download + upload to Supabase
  python scrape_cbse10_papers.py --year 2024          # Specific year only
  python scrape_cbse10_papers.py --subject science    # Specific subject only

Prerequisites:
  pip install requests beautifulsoup4
"""

import os
import re
import sys
import time
import shutil
import zipfile
from typing import Optional, List, Dict
import argparse
import tempfile
from pathlib import Path
from io import BytesIO

import requests

# ── Config ──
BASE_DIR = Path(__file__).parent
DOWNLOAD_DIR = BASE_DIR / "papers_to_upload"
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

CBSE_BASE = "https://www.cbse.gov.in/cbsenew/question-paper"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Referer": "https://www.cbse.gov.in/cbsenew/question-paper.html",
}

# ── CBSE Class 10 Core Subjects ──
# Maps our canonical subject name → list of possible URL slugs on cbse.gov.in
# The scraper tries each slug until one works
SUBJECTS = {
    # Main board subjects
    "english": {
        "display": "English",
        "slugs": {
            2025: ["184_English_Language_and_Literature"],  # ZIP
            2024: ["ENGLISH_L&L"],                         # ZIP
            2023: ["ENGLISH_L&L"],
            2022: ["ENGLISH_L&L"],
            2020: ["ENGLISH_L&L"],
        },
        "default_slugs": ["ENGLISH_L&L", "English_Language_and_Literature",
                          "English_Lan_Lit", "184_English_Language_and_Literature"],
    },
    "hindi": {
        "display": "Hindi",
        "slugs": {
            2025: ["002_Hindi_Course_A", "085_Hindi_Course_B"],
            2024: ["HINDI_A", "HINDI_B"],
            2023: ["HINDI_A", "HINDI_B"],
            2022: ["HINDI_A", "HINDI_B"],
            2020: ["HINDI_A", "HINDI_B"],
        },
        "default_slugs": ["HINDI_A", "Hindi_Course_A", "002_Hindi_Course_A"],
    },
    "mathematics_standard": {
        "display": "Mathematics Standard",
        "slugs": {
            2025: ["041_Mathematics_Standard"],
            2024: ["MATHEMATICS_STANDARD"],
            2023: ["MATHEMATICS_STANDARD"],
            2022: ["MATHEMATICS_STANDARD"],
            2020: ["MATHEMATICS_STANDARD"],
        },
        "default_slugs": ["MATHEMATICS_STANDARD", "041_Mathematics_Standard",
                          "Maths_Standard"],
    },
    "mathematics_basic": {
        "display": "Mathematics Basic",
        "slugs": {
            2025: ["241_Mathematics_Basic"],
            2024: ["MATHEMATICS_BASIC"],
            2023: ["MATHEMATICS_BASIC"],
            2022: ["MATHEMATICS_BASIC"],
            2020: ["MATHEMATICS_BASIC"],
        },
        "default_slugs": ["MATHEMATICS_BASIC", "241_Mathematics_Basic",
                          "Maths_Basic"],
    },
    "science": {
        "display": "Science",
        "slugs": {
            2025: ["086_Science"],
            2024: ["SCIENCE"],
            2023: ["SCIENCE"],
            2022: ["SCIENCE"],
            2020: ["SCIENCE"],
        },
        "default_slugs": ["SCIENCE", "Science", "086_Science"],
    },
    "social_science": {
        "display": "Social Science",
        "slugs": {
            2025: ["087_Social_Science"],
            2024: ["SOCIAL_SCIENCE"],
            2023: ["SOCIAL_SCIENCE"],
            2022: ["SOCIAL_SCIENCE"],
            2020: ["SOCIAL_SCIENCE"],
        },
        "default_slugs": ["SOCIAL_SCIENCE", "Social_Science", "087_Social_Science"],
    },
    "sanskrit": {
        "display": "Sanskrit",
        "slugs": {
            2025: ["52_Sanskrit"],
            2024: ["Sanskrit"],
            2023: ["Sanskrit"],
            2022: ["Sanskrit"],
            2020: ["Sanskrit"],
        },
        "default_slugs": ["Sanskrit", "52_Sanskrit"],
    },
    "french": {
        "display": "French",
        "slugs": {
            2025: ["20_French"],
            2024: ["French"],
            2023: ["French"],
            2022: ["French"],
            2020: ["French"],
        },
        "default_slugs": ["French", "20_French"],
    },
    "computer_application": {
        "display": "Computer Application",
        "slugs": {
            2025: ["53_Computer_Application"],
            2024: ["Computer_Applications"],
            2023: ["Computer_applications", "Computer_Application"],
            2022: ["Computer_Application", "Computer_Applications"],
            2020: ["Computer_Application"],
        },
        "default_slugs": ["Computer_Application", "Computer_Applications",
                          "Computer_applications", "53_Computer_Application"],
    },
    "information_technology": {
        "display": "Information Technology",
        "slugs": {
            2025: ["89_Information_Technology"],
            2024: ["Information_Technology"],
            2023: ["Information_Technology"],
            2022: ["Information_Technology"],
            2020: ["Information_Technology"],
        },
        "default_slugs": ["Information_Technology", "89_Information_Technology"],
    },
    "japanese": {
        "display": "Japanese",
        "slugs": {
            2025: ["43_Japanese"],
            2024: ["Japanese"],
            2023: ["Japanese"],
            2022: ["Japanese"],
        },
        "default_slugs": ["Japanese", "43_Japanese"],
    },
    "data_science": {
        "display": "Data Science",
        "slugs": {
            2025: ["106_Data_Science"],
            2024: ["Data_Science"],
            2023: ["Data_Science"],
        },
        "default_slugs": ["Data_Science", "106_Data_Science"],
    },
    "design_thinking": {
        "display": "Design Thinking",
        "slugs": {
            2025: ["109_Design_Thinking_Innovation"],
            2024: ["Design_thinking_Innovation"],
        },
        "default_slugs": ["Design_thinking_Innovation", "Design_Thinking_Innovation",
                          "109_Design_Thinking_Innovation"],
    },
    "artificial_intelligence": {
        "display": "Artificial Intelligence",
        "slugs": {
            2025: ["104_Artificial_Intelleigence_NEW"],  # Note: CBSE typo in URL
            2024: ["Artificial_Intelligence"],
            2023: ["Artificial_Intelligence"],
        },
        "default_slugs": ["Artificial_Intelligence", "104_Artificial_Intelleigence_NEW"],
    },
    "home_science": {
        "display": "Home Science",
        "slugs": {
            2025: ["37_Home_Science"],
            2024: ["Home_Science"],
            2023: ["Home_Science"],
            2022: ["Home_Science"],
        },
        "default_slugs": ["Home_Science", "37_Home_Science"],
    },
    "painting": {
        "display": "Painting",
        "slugs": {
            2025: ["38_Painting"],
            2024: ["Painting"],
            2023: ["Painting"],
        },
        "default_slugs": ["Painting", "38_Painting"],
    },
}

# Years available (2021 cancelled due to COVID)
ALL_YEARS = [2020, 2022, 2023, 2024, 2025]


def download_file(url: str, timeout: int = 60) -> Optional[bytes]:
    """Download a file and return its content, or None on failure."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=timeout,
                            stream=True, allow_redirects=True)
        if resp.status_code != 200:
            return None
        content = resp.content
        if len(content) < 1000:  # Too small to be a real paper
            return None
        return content
    except Exception as e:
        print(f"     ⚠️  Download error: {str(e)[:80]}")
        return None


def extract_best_pdf_from_zip(zip_content: bytes) -> Optional[bytes]:
    """
    Extract the largest/best PDF from a ZIP archive.
    Returns the PDF content or None.
    """
    try:
        with zipfile.ZipFile(BytesIO(zip_content)) as zf:
            pdf_files = [
                f for f in zf.namelist()
                if f.lower().endswith('.pdf')
                and not f.startswith('__MACOSX')
                and not f.startswith('.')
            ]
            if not pdf_files:
                return None

            # Pick the largest PDF (usually the actual question paper)
            best = max(pdf_files, key=lambda f: zf.getinfo(f).file_size)
            content = zf.read(best)

            # Verify it's a real PDF
            if content[:5] != b'%PDF-':
                return None

            print(f"     📦 Extracted: {best} ({len(content):,} bytes)")
            return content
    except (zipfile.BadZipFile, Exception) as e:
        print(f"     ⚠️  ZIP error: {str(e)[:80]}")
        return None


def try_download_subject(subject_key: str, subject_info: dict, year: int) -> Optional[bytes]:
    """
    Try all known URL patterns for a subject + year.
    Returns PDF content or None.
    """
    # Get year-specific slugs or fall back to defaults
    slugs = subject_info.get("slugs", {}).get(year, subject_info["default_slugs"])

    for slug in slugs:
        # Try as ZIP first (most subjects are ZIPs)
        for ext in [".zip", ".pdf", ".rar"]:
            url = f"{CBSE_BASE}/{year}/X/{slug}{ext}"
            print(f"     🔗 Trying: {url}")

            content = download_file(url)
            if content is None:
                continue

            if ext == ".zip":
                pdf_content = extract_best_pdf_from_zip(content)
                if pdf_content:
                    return pdf_content
            elif ext == ".pdf":
                if content[:5] == b'%PDF-':
                    print(f"     📄 Direct PDF ({len(content):,} bytes)")
                    return content
            # .rar files would need extra handling, skip for now

        time.sleep(0.3)  # Be polite

    # Also try compartment papers if main exam not found
    for slug in slugs:
        for ext in [".zip", ".pdf"]:
            url = f"{CBSE_BASE}/{year}-COMPTT/X/{slug}{ext}"
            content = download_file(url)
            if content and ext == ".zip":
                pdf_content = extract_best_pdf_from_zip(content)
                if pdf_content:
                    print(f"     📋 (Compartment paper)")
                    return pdf_content
            elif content and ext == ".pdf" and content[:5] == b'%PDF-':
                print(f"     📋 (Compartment paper)")
                return content

    return None


def scrape_cbse10(years: Optional[List[int]] = None, subjects: Optional[List[str]] = None,
                  dry_run: bool = False) -> Dict:
    """
    Scrape CBSE Class 10 papers.
    Returns stats dict.
    """
    if years is None:
        years = ALL_YEARS
    if subjects is None:
        subjects = list(SUBJECTS.keys())

    stats = {"downloaded": 0, "skipped": 0, "failed": 0, "already_exists": 0}

    print(f"\n🚀 CBSE Class 10 Paper Scraper (cbse.gov.in)")
    print(f"   Years: {years}")
    print(f"   Subjects: {len(subjects)}")
    print(f"   Mode: {'DRY RUN' if dry_run else 'DOWNLOAD'}")
    print(f"{'=' * 60}\n")

    for subject_key in subjects:
        subject_info = SUBJECTS[subject_key]
        display_name = subject_info["display"]

        print(f"\n📚 {display_name}")
        print(f"   {'─' * 40}")

        for year in years:
            filename = f"class10_{subject_key}_{year}.pdf"
            save_path = DOWNLOAD_DIR / filename

            # Check if already downloaded
            if save_path.exists() and save_path.stat().st_size > 5000:
                print(f"  ⏭️  {year}: Already exists — {filename} "
                      f"({save_path.stat().st_size:,} bytes)")
                stats["already_exists"] += 1
                continue

            if dry_run:
                print(f"  🔍 {year}: Would download → {filename}")
                stats["downloaded"] += 1
                continue

            print(f"  📥 {year}: Downloading...")
            pdf_content = try_download_subject(subject_key, subject_info, year)

            if pdf_content:
                save_path.parent.mkdir(parents=True, exist_ok=True)
                with open(save_path, "wb") as f:
                    f.write(pdf_content)
                print(f"  ✅ {year}: Saved → {filename} ({len(pdf_content):,} bytes)")
                stats["downloaded"] += 1
            else:
                print(f"  ❌ {year}: Not found on cbse.gov.in")
                stats["failed"] += 1

            time.sleep(0.5)  # Be polite to the server

    return stats


def print_inventory():
    """Show current CBSE Class 10 paper inventory."""
    print(f"\n📊 CBSE Class 10 Paper Inventory")
    print(f"{'=' * 60}")

    existing = {}
    for f in sorted(DOWNLOAD_DIR.glob("class10_*.pdf")):
        parts = f.stem.split("_")
        # class10_{subject parts}_{year}
        year = parts[-1]
        subject = "_".join(parts[1:-1])
        if subject not in existing:
            existing[subject] = []
        existing[subject].append(year)

    if not existing:
        print("  No papers found yet.")
        return

    for subject in sorted(existing.keys()):
        years = existing[subject]
        display = SUBJECTS.get(subject, {}).get("display", subject.replace("_", " ").title())
        print(f"  📚 {display}: {', '.join(sorted(years))}")

    total = sum(len(v) for v in existing.values())
    print(f"\n  📊 Total: {total} papers on disk")

    # Show gaps
    print(f"\n  💡 Missing papers:")
    for subject_key, info in SUBJECTS.items():
        if subject_key in existing:
            have = set(existing[subject_key])
            missing = [str(y) for y in ALL_YEARS if str(y) not in have]
            if missing:
                print(f"     {info['display']}: {', '.join(missing)}")
        else:
            print(f"     {info['display']}: ALL YEARS")


def main():
    parser = argparse.ArgumentParser(
        description="Scrape CBSE Class 10 Papers from cbse.gov.in"
    )
    parser.add_argument("--year", type=int, help="Specific year to scrape")
    parser.add_argument("--subject", type=str,
                        help="Specific subject key (e.g., science, english)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview only, no downloads")
    parser.add_argument("--inventory", action="store_true",
                        help="Show current paper inventory")
    parser.add_argument("--upload", action="store_true",
                        help="Upload to Supabase after downloading")
    args = parser.parse_args()

    if args.inventory:
        print_inventory()
        return

    years = [args.year] if args.year else None
    subjects = [args.subject] if args.subject else None

    # Validate subject
    if subjects:
        for s in subjects:
            if s not in SUBJECTS:
                print(f"❌ Unknown subject: {s}")
                print(f"   Available: {', '.join(SUBJECTS.keys())}")
                sys.exit(1)

    stats = scrape_cbse10(years=years, subjects=subjects, dry_run=args.dry_run)

    # Summary
    print(f"\n{'=' * 60}")
    print(f"🎉 {'DRY RUN' if args.dry_run else 'Scraping'} Complete!")
    print(f"   ✅ {stats['downloaded']} {'would be ' if args.dry_run else ''}downloaded")
    print(f"   ⏭️  {stats['already_exists']} already on disk")
    print(f"   ❌ {stats['failed']} not found")
    print(f"\n   📂 Location: {DOWNLOAD_DIR}")

    if stats["downloaded"] > 0 and not args.dry_run:
        print(f"\n   💡 Next step — upload to Supabase:")
        print(f"      python upload_library_papers.py")

    if args.upload and stats["downloaded"] > 0 and not args.dry_run:
        print(f"\n📎 Running upload script...")
        import subprocess
        subprocess.run(
            [sys.executable, str(BASE_DIR / "upload_library_papers.py")],
            cwd=str(BASE_DIR)
        )


if __name__ == "__main__":
    main()
