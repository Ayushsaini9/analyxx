#!/usr/bin/env python3
"""
Scrape 20 years (2003–2026) of RTU B.Tech papers from all sources,
then upload directly to Cloudflare R2.

Sources:
  - rtuquestionpapers.com (primary)
  - rtuonline.com (secondary)

Storage:
  - Cloudflare R2 via boto3 (NO Supabase storage)
  - Path: library-papers/{storageFolder}/Sem {N}/{Subject Name} {Year}.pdf

Branches:
  - 1st Year (common) → rtu-1styear
  - CS / IT            → rtu-csit
  - Civil              → rtu-ce
  - Mechanical         → rtu-me
  - Electrical / Electronics → rtu-eeec

Usage:
  python scrape_rtu_all_years.py --all                      # Full pipeline
  python scrape_rtu_all_years.py --audit                    # Audit R2 only
  python scrape_rtu_all_years.py --scrape                   # Scrape + download (no upload)
  python scrape_rtu_all_years.py --all --branch cs          # Single branch
  python scrape_rtu_all_years.py --all --semester 4         # Single semester
  python scrape_rtu_all_years.py --all --dry-run            # Preview only
  python scrape_rtu_all_years.py --all --skip-audit         # Skip R2 audit, scrape everything
  python scrape_rtu_all_years.py --resume-upload            # Resume failed uploads from manifest

Prerequisites:
  pip install requests beautifulsoup4 boto3 python-dotenv
  pip install playwright  (optional — for JS-rendered pages)
  playwright install chromium  (if using playwright)
"""

import os
import re
import sys
import ssl
import time
import json
import signal
import argparse
import urllib.parse
import concurrent.futures
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Optional, Set, Tuple
from datetime import datetime

import requests
from bs4 import BeautifulSoup

try:
    from playwright.sync_api import sync_playwright
    HAS_PLAYWRIGHT = True
except ImportError:
    HAS_PLAYWRIGHT = False

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "backend", ".env"))

# ── Config ──
BASE_DIR = Path(__file__).parent
DOWNLOAD_DIR = BASE_DIR / "papers_to_upload" / "RTU_ALL_YEARS"
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

PROGRESS_FILE = DOWNLOAD_DIR / "scrape_progress.json"
MANIFEST_FILE = DOWNLOAD_DIR / "upload_manifest.json"

R2_CDN_URL = "https://pub-5d418c0acdfa4e9ba673215eb5998a3b.r2.dev/library-papers"
SITE_BASE = "https://www.rtuquestionpapers.com"
CDN_BASE = "https://cdn.rtuquestionpapers.com"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

# ── Year range: 20 years ──
MIN_YEAR = 2003
MAX_YEAR = 2026
ALL_YEARS = list(range(MIN_YEAR, MAX_YEAR + 1))

# ── Download config ──
MAX_DOWNLOAD_WORKERS = 5
DOWNLOAD_DELAY = 0.5  # seconds between requests (polite scraping)
MAX_UPLOAD_WORKERS = 3
UPLOAD_DELAY = 0.3

# ── Branch → Storage Folder ──
BRANCH_STORAGE_MAP = {
    "1st-year": "rtu-1styear",
    "cs": "rtu-csit",
    "it": "rtu-csit",
    "civil": "rtu-ce",
    "mechanical": "rtu-me",
    "electrical": "rtu-eeec",
    "electronics": "rtu-eeec",
}

# Unique branches to scrape (IT=CS, Electronics=Electrical)
SCRAPE_BRANCHES = ["cs", "civil", "mechanical", "electrical"]

# Site slugs for crawling rtuquestionpapers.com
BRANCH_SITE_SLUGS = {
    "cs": ["computer-science", "cs-it", "cs"],
    "it": ["computer-science", "cs-it", "it"],
    "civil": ["civil", "civil-engineering", "ce"],
    "mechanical": ["mechanical", "mechanical-engineering", "me"],
    "electrical": ["electrical", "electrical-engineering", "ee", "ee-ec"],
    "electronics": ["electrical", "electrical-engineering", "ee", "ee-ec"],
}

# ── Complete Subject Catalog (from frontend library page) ──
SUBJECT_CATALOG: Dict[str, Dict[int, List[str]]] = {
    "1st-year": {
        1: [
            "Engineering Mathematics-I", "Engineering Physics", "Engineering Chemistry",
            "Communication Skills", "Human Values", "Programming for Problem Solving",
            "Basic Mechanical Engineering", "Basic Electrical Engineering", "Basic Civil Engineering",
        ],
        2: [
            "Engineering Mathematics-II", "Engineering Physics", "Engineering Chemistry",
            "Communication Skills", "Human Values", "Programming for Problem Solving",
            "Basic Mechanical Engineering", "Basic Electrical Engineering", "Basic Civil Engineering",
        ],
    },
    "cs": {
        3: [
            "Advanced Engineering Mathematics-I", "Technical Communication",
            "Managerial Economics & Financial Accounting", "Digital Electronics",
            "Data Structures and Algorithms", "Object Oriented Programming",
            "Software Engineering", "Discrete Mathematical Structures",
            "Microprocessor and Microcontroller", "General Studies",
        ],
        4: [
            "Discrete Mathematical Structures", "Technical Communication",
            "Managerial Economics & Financial Accounting", "Principles of Communication",
            "Database Management System", "Theory of Computation",
            "Data Communication and Computer Networks", "Microprocessor and Interfaces",
            "Disaster Management", "Introduction to Java Programming",
            "Introduction to Python Programming", "Software Testing",
        ],
        5: [
            "Analysis of Algorithms", "Compiler Design", "Operating System",
            "Computer Graphics and Multimedia", "Data Mining Concepts and Techniques",
            "Digital Forensics and Incident Response", "Fundamentals of Blockchain",
            "Information Theory and Coding",
        ],
        6: [
            "Digital Image Processing", "Machine Learning", "Information Security Systems",
            "Computer Architecture and Organization", "Artificial Intelligence",
            "Distributed System", "Cloud Computing", "E-Commerce and ERP",
            "Artificial Intelligence and Data Science", "Blockchain and Cyber Security",
            "Cyber Forensics", "Natural Language Processing",
        ],
        7: ["Big Data Analytics", "Internet of Things", "Quality Management"],
        8: ["Big Data Analytics", "Internet of Things", "Disaster Management"],
    },
    "civil": {
        3: [
            "Advanced Engineering Mathematics-I", "Technical Communication",
            "Managerial Economics & Financial Accounting", "Building Materials and Construction",
            "Engineering Mechanics", "Fluid Mechanics", "Surveying",
            "Engineering Geology", "Architecture Drawing and Building Construction",
        ],
        4: [
            "Advanced Engineering Mathematics-II", "Technical Communication",
            "Managerial Economics & Financial Accounting", "Hydraulics Engineering",
            "Strength of Materials", "Basic Electronics for Civil Engineering Applications",
            "Geotechnical Engineering-I", "Disaster Management",
        ],
        5: [
            "Indian Constitution", "Air and Noise Pollution and Control",
            "Construction Technology and Equipments", "Design of Concrete Structures",
            "Geotechnical Engineering", "Structural Analysis-I", "Water Resource Engineering",
        ],
        6: [
            "Design of Steel Structures", "Environmental Engineering",
            "Estimating and Costing", "Geographic Information System and Remote Sensing",
            "Solid and Hazardous Waste Management", "Design of Hydraulic Structures",
            "Structural Analysis-II", "Wind and Seismic Analysis",
        ],
        7: ["Transportation Engineering"],
        8: ["Disaster Management"],
    },
    "mechanical": {
        3: [
            "Advanced Engineering Mathematics-I", "Technical Communication",
            "Managerial Economics & Financial Accounting", "Engineering Mechanics",
            "Manufacturing Processes", "Aero Engineering Thermodynamics",
            "Elements of Aeronautics", "Fluid Mechanics and Turbo Machines",
        ],
        4: [
            "Technical Communication", "Managerial Economics & Financial Accounting",
            "Disaster Management", "Digital Electronics",
            "Fluid Mechanics and Fluid Machines", "Aerospace Materials", "Data Analytics",
        ],
        5: ["Indian Constitution", "Mechatronic Systems"],
        6: [
            "Computer Integrated Manufacturing Systems", "Design of Machine Elements-II",
            "Mechanical Vibrations", "Quality Management",
            "Refrigeration and Air Conditioning", "Measurement and Metrology",
        ],
        7: [],
        8: ["Disaster Management", "Supply and Operations Management"],
    },
    "electrical": {
        3: [
            "Advanced Engineering Mathematics-I", "Technical Communication",
            "Managerial Economics & Financial Accounting", "Analog Electronics",
            "Digital System Design", "Electrical Circuit Analysis",
            "Electrical Machines-I", "Electromagnetic Fields", "Electronic Devices",
            "Network Theory", "Power Generation Process", "Signal and Systems",
            "General Studies", "Electrical Measurement", "Power System Instrumentation",
        ],
        4: [
            "Advanced Engineering Mathematics-II", "Managerial Economics & Financial Accounting",
            "Analog Circuits", "Digital Electronics", "Electrical Machines-II",
            "Electronic Measurement and Instrumentation", "Power Electronics",
            "Signal and Systems", "Analog and Digital Communication",
            "Microcontroller", "Biology", "Instrumentation",
        ],
        5: [
            "Electrical Machine Design", "Power Generation Sources",
            "Power System-I", "Computer Architecture", "Control System",
            "Digital Signal Processing", "Electrical Materials",
            "Electromagnetic Waves", "Microprocessor",
            "Microwave Theory and Techniques", "Restructured Power System",
            "Satellite Communication",
        ],
        6: [
            "Electric Drives", "Electrical Energy Conversion and Auditing",
            "Computer Architecture", "Power System-II", "Power System Protection",
        ],
        7: ["CMOS Design", "Principles of Electronic Communication", "Wind and Solar Energy Systems"],
        8: ["Advanced Electric Drives", "Soft Computing"],
    },
}

# IT and Electronics share catalogs
SUBJECT_CATALOG["it"] = SUBJECT_CATALOG["cs"]
SUBJECT_CATALOG["electronics"] = SUBJECT_CATALOG["electrical"]


# ══════════════════════════════════════════════════════════════════════════════
# Subject Name Normalization
# ══════════════════════════════════════════════════════════════════════════════

NORMALIZE_MAP = {
    # CS/IT
    "advance engineering mathematics 1": "Advanced Engineering Mathematics-I",
    "advance engineering mathematics": "Advanced Engineering Mathematics-I",
    "advanced engineering mathematics 1": "Advanced Engineering Mathematics-I",
    "advanced engineering mathematics i": "Advanced Engineering Mathematics-I",
    "advance engineering mathematics 2": "Advanced Engineering Mathematics-II",
    "advanced engineering mathematics 2": "Advanced Engineering Mathematics-II",
    "advanced engineering mathematics ii": "Advanced Engineering Mathematics-II",
    "data structures and algorithms": "Data Structures and Algorithms",
    "data structure and algorithms": "Data Structures and Algorithms",
    "data structures and algorithm": "Data Structures and Algorithms",
    "data base management systems": "Database Management System",
    "database management system": "Database Management System",
    "database management systems": "Database Management System",
    "discrete mathematical structures": "Discrete Mathematical Structures",
    "discrete mathematical structure": "Discrete Mathematical Structures",
    "discrete mathematics structure": "Discrete Mathematical Structures",
    "discrete mathematics": "Discrete Mathematical Structures",
    "digital electronics": "Digital Electronics",
    "object oriented programming": "Object Oriented Programming",
    "software engineering": "Software Engineering",
    "microprocessor and microcontroller": "Microprocessor and Microcontroller",
    "microprocessor and interfaces": "Microprocessor and Interfaces",
    "principle of communication": "Principles of Communication",
    "principles of communication": "Principles of Communication",
    "theory of computation": "Theory of Computation",
    "data communication and computer networks": "Data Communication and Computer Networks",
    "introduction to java programming": "Introduction to Java Programming",
    "introduction to python programming": "Introduction to Python Programming",
    "software testing": "Software Testing",
    "analysis of algorithms": "Analysis of Algorithms",
    "compiler design": "Compiler Design",
    "computer graphics and multimedia": "Computer Graphics and Multimedia",
    "operating system": "Operating System",
    "data mining concepts and techniques": "Data Mining Concepts and Techniques",
    "digital forensics and incident response": "Digital Forensics and Incident Response",
    "fundamental of block chain": "Fundamentals of Blockchain",
    "fundamentals of blockchain": "Fundamentals of Blockchain",
    "information theory and coding": "Information Theory and Coding",
    "digital image processing": "Digital Image Processing",
    "machine learning": "Machine Learning",
    "information security system": "Information Security Systems",
    "information security systems": "Information Security Systems",
    "computer architecture and organization": "Computer Architecture and Organization",
    "artificial intelligence": "Artificial Intelligence",
    "principles of artificial intelligence": "Artificial Intelligence",
    "artificial intelligence and data science": "Artificial Intelligence and Data Science",
    "distributed system": "Distributed System",
    "cloud computing": "Cloud Computing",
    "e commerce and erp": "E-Commerce and ERP",
    "block chain and cyber security": "Blockchain and Cyber Security",
    "blockchain and cyber security": "Blockchain and Cyber Security",
    "cyber forensic": "Cyber Forensics",
    "cyber forensics": "Cyber Forensics",
    "natural language processing": "Natural Language Processing",
    "big data analytics": "Big Data Analytics",
    "internet of things": "Internet of Things",
    "quality management": "Quality Management",
    "technical communication": "Technical Communication",
    "managerial economics and financial accounting": "Managerial Economics & Financial Accounting",
    "managerial economics financial accounting": "Managerial Economics & Financial Accounting",
    "general studies": "General Studies",
    "disaster management": "Disaster Management",
    "indian constitution": "Indian Constitution",
    # CE
    "building materials and construction": "Building Materials and Construction",
    "building materials": "Building Materials and Construction",
    "engineering mechanics": "Engineering Mechanics",
    "fluid mechanics": "Fluid Mechanics",
    "surveying": "Surveying",
    "engineering geology": "Engineering Geology",
    "architecture drawing and building construction": "Architecture Drawing and Building Construction",
    "hydraulics engineering": "Hydraulics Engineering",
    "strength of materials": "Strength of Materials",
    "basic electronics for civil engineering applications": "Basic Electronics for Civil Engineering Applications",
    "geotechnical engineering": "Geotechnical Engineering",
    "geotechnical engineering 1": "Geotechnical Engineering-I",
    "geotechnical engineering i": "Geotechnical Engineering-I",
    "air and noise pollution and control": "Air and Noise Pollution and Control",
    "construction technology and equipments": "Construction Technology and Equipments",
    "design of concrete structures": "Design of Concrete Structures",
    "structural analysis 1": "Structural Analysis-I",
    "structural analysis i": "Structural Analysis-I",
    "structural analysis 2": "Structural Analysis-II",
    "structural analysis ii": "Structural Analysis-II",
    "water resource engineering": "Water Resource Engineering",
    "design of steel structures": "Design of Steel Structures",
    "environmental engineering": "Environmental Engineering",
    "estimating and costing": "Estimating and Costing",
    "geographic information system and remote sensing": "Geographic Information System and Remote Sensing",
    "geographics information system and remote sensing": "Geographic Information System and Remote Sensing",
    "solid and hazardous waste management": "Solid and Hazardous Waste Management",
    "design of hydraulic structures": "Design of Hydraulic Structures",
    "wind and seismic analysis": "Wind and Seismic Analysis",
    "transportation engineering": "Transportation Engineering",
    # ME
    "manufacturing processes": "Manufacturing Processes",
    "aero engineering thermodynamics": "Aero Engineering Thermodynamics",
    "elements of aeronautics": "Elements of Aeronautics",
    "fluid mechanics and turbo machines": "Fluid Mechanics and Turbo Machines",
    "fluid mechanics and fluid machines": "Fluid Mechanics and Fluid Machines",
    "aerospace materials": "Aerospace Materials",
    "data analytics": "Data Analytics",
    "mechatronic systems": "Mechatronic Systems",
    "computer integrated manufacturing systems": "Computer Integrated Manufacturing Systems",
    "cims": "Computer Integrated Manufacturing Systems",
    "design of machine elements 2": "Design of Machine Elements-II",
    "design of machine elements ii": "Design of Machine Elements-II",
    "mechanical vibrations": "Mechanical Vibrations",
    "refrigeration and air conditioning": "Refrigeration and Air Conditioning",
    "measurement and meterology": "Measurement and Metrology",
    "measurement and metrology": "Measurement and Metrology",
    "supply and operations management": "Supply and Operations Management",
    # EE/EC
    "analog electronics": "Analog Electronics",
    "digital system design": "Digital System Design",
    "electrical circuit analysis": "Electrical Circuit Analysis",
    "electrical circuit analysis 1": "Electrical Circuit Analysis-I",
    "electrical machine 1": "Electrical Machines-I",
    "electrical machines 1": "Electrical Machines-I",
    "electrical machines i": "Electrical Machines-I",
    "electrical machine 2": "Electrical Machines-II",
    "electrical machines 2": "Electrical Machines-II",
    "electrical machines ii": "Electrical Machines-II",
    "electromagnetic fields": "Electromagnetic Fields",
    "electronic devices": "Electronic Devices",
    "network theory": "Network Theory",
    "power generation process": "Power Generation Process",
    "signal and systems": "Signal and Systems",
    "signals and systems": "Signal and Systems",
    "signals and system": "Signal and Systems",
    "analog circuits": "Analog Circuits",
    "analogy and digital communication": "Analog and Digital Communication",
    "analog and digital communication": "Analog and Digital Communication",
    "electronic measurement and instrumentation": "Electronic Measurement and Instrumentation",
    "power electronics": "Power Electronics",
    "microcontroller": "Microcontroller",
    "instrumentation": "Instrumentation",
    "electrical measurement": "Electrical Measurement",
    "power system instrumentation": "Power System Instrumentation",
    "electrical machine design": "Electrical Machine Design",
    "power generation sources": "Power Generation Sources",
    "power system 1": "Power System-I",
    "power system i": "Power System-I",
    "power system 2": "Power System-II",
    "power system ii": "Power System-II",
    "computer architecture": "Computer Architecture",
    "control system": "Control System",
    "digital signal processing": "Digital Signal Processing",
    "electrical materials": "Electrical Materials",
    "electromagnetics waves": "Electromagnetic Waves",
    "electromagnetic waves": "Electromagnetic Waves",
    "microprocessor": "Microprocessor",
    "microwave theory and techniques": "Microwave Theory and Techniques",
    "restructured power system": "Restructured Power System",
    "satellite communication": "Satellite Communication",
    "electric drives": "Electric Drives",
    "electrical energy conversion and auditing": "Electrical Energy Conversion and Auditing",
    "power system protection": "Power System Protection",
    "cmos design": "CMOS Design",
    "principle of electronic communication": "Principles of Electronic Communication",
    "principles of electronic communication": "Principles of Electronic Communication",
    "wind and solar energy systems": "Wind and Solar Energy Systems",
    "advanced electric drives": "Advanced Electric Drives",
    "soft computing": "Soft Computing",
    "biology": "Biology",
    # 1st year
    "engineering mathematics 1": "Engineering Mathematics-I",
    "engineering mathematics i": "Engineering Mathematics-I",
    "engineering mathematics 2": "Engineering Mathematics-II",
    "engineering mathematics ii": "Engineering Mathematics-II",
    "engineering physics": "Engineering Physics",
    "engineering chemistry": "Engineering Chemistry",
    "communication skills": "Communication Skills",
    "communication skill": "Communication Skills",
    "human values": "Human Values",
    "programming for problem solving": "Programming for Problem Solving",
    "basic mechanical engineering": "Basic Mechanical Engineering",
    "elements of mechanical engineering": "Basic Mechanical Engineering",
    "basic electrical engineering": "Basic Electrical Engineering",
    "basic civil engineering": "Basic Civil Engineering",
    "introduction to built environment": "Basic Civil Engineering",
}


def normalize_subject(raw_name: str) -> str:
    """Normalize a scraped subject name to the canonical R2 storage name."""
    lower = raw_name.lower().strip()
    if lower in NORMALIZE_MAP:
        return NORMALIZE_MAP[lower]

    # Try with different separators
    for sep_from, sep_to in [(' ', '-'), ('-', ' '), ('_', ' '), (' ', '_')]:
        variant = lower.replace(sep_from, sep_to)
        if variant in NORMALIZE_MAP:
            return NORMALIZE_MAP[variant]

    # Partial match
    for key, canonical in NORMALIZE_MAP.items():
        if key in lower or lower in key:
            return canonical

    # No match — return title-cased version
    return raw_name.strip().title()


# ══════════════════════════════════════════════════════════════════════════════
# R2 Audit — HEAD-check existing papers
# ══════════════════════════════════════════════════════════════════════════════

def check_r2_paper(storage_folder: str, semester: int, subject: str, year: int) -> bool:
    """HEAD-check if a paper exists on R2 CDN."""
    path = f"{storage_folder}/Sem {semester}/{subject} {year}.pdf"
    url = f"{R2_CDN_URL}/{urllib.parse.quote(path)}"
    try:
        resp = requests.head(url, timeout=8, allow_redirects=True)
        return resp.status_code == 200
    except Exception:
        return False


def audit_r2_papers(branches: List[str] = None) -> Tuple[Set, Set]:
    """
    Fast concurrent audit of R2 bucket.
    Returns (existing_set, missing_set) of (storage_folder, semester, subject, year) tuples.
    """
    existing = set()
    missing = set()
    all_keys = []

    # 1st year papers
    sf = "rtu-1styear"
    for sem, subjects in SUBJECT_CATALOG["1st-year"].items():
        for subject in subjects:
            for year in ALL_YEARS:
                all_keys.append((sf, sem, subject, year))

    # Branch-specific papers
    branches_to_check = branches or SCRAPE_BRANCHES
    seen = set()
    for branch in branches_to_check:
        storage_folder = BRANCH_STORAGE_MAP.get(branch, f"rtu-{branch}")
        catalog = SUBJECT_CATALOG.get(branch, {})
        for sem, subjects in catalog.items():
            for subject in subjects:
                for year in ALL_YEARS:
                    key = (storage_folder, sem, subject, year)
                    if key not in seen:
                        seen.add(key)
                        all_keys.append(key)

    print(f"\n📊 Auditing {len(all_keys)} paper slots on R2 CDN...")
    print(f"   (Concurrent HEAD requests, {MIN_YEAR}–{MAX_YEAR})\n")

    def check_one(key):
        sf, sem, subj, yr = key
        exists = check_r2_paper(sf, sem, subj, yr)
        return key, exists

    checked = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=15) as executor:
        futures = {executor.submit(check_one, k): k for k in all_keys}
        for future in concurrent.futures.as_completed(futures):
            key, exists = future.result()
            checked += 1
            if exists:
                existing.add(key)
                sf, sem, subj, yr = key
                print(f"  ✅ [{checked}/{len(all_keys)}] {sf}/Sem {sem}/{subj} {yr}.pdf")
            else:
                missing.add(key)
            if checked % 200 == 0:
                print(f"  ... checked {checked}/{len(all_keys)} ({len(existing)} found)")

    return existing, missing


# ══════════════════════════════════════════════════════════════════════════════
# Web Scraping — Discover PDFs
# ══════════════════════════════════════════════════════════════════════════════

def extract_papers_from_links(links: list, min_year: int = MIN_YEAR) -> list:
    """
    Parse a list of {'href': ..., 'text': ...} dicts into paper tuples.
    Returns list of (subject_name, year, pdf_url, filename).
    """
    papers = []
    for link in links:
        href = link["href"] if isinstance(link, dict) else link
        if not href:
            continue
        filename = href.split("/")[-1]
        year_match = re.search(r'-(\d{4})\.pdf$', filename, re.IGNORECASE)
        if not year_match:
            continue
        year = int(year_match.group(1))
        if year < min_year or year > MAX_YEAR:
            continue

        # Extract subject slug from filename
        name_part = re.sub(r'^btech-[\w-]+-\d+-sem-', '', filename, re.IGNORECASE)
        name_part = re.sub(r'-\w{2,7}\d{3,5}-\d{4}\.pdf$', '', name_part, re.IGNORECASE)
        name_part = re.sub(r'-\d{4}\.pdf$', '', name_part, re.IGNORECASE)
        # Remove month suffix
        name_part = re.sub(r'-(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)$', '',
                           name_part, flags=re.IGNORECASE)
        subject_name = name_part.replace('-', ' ').strip().title()

        if subject_name:
            papers.append((subject_name, year, href, filename))

    return papers


def crawl_semester_page(branch_slug: str, semester: int) -> list:
    """
    Crawl rtuquestionpapers.com semester page to discover all PDF links.
    Returns list of (subject_name, year, pdf_url, filename).
    """
    url = f"{SITE_BASE}/btech/{branch_slug}/sem-{semester}"
    papers = []

    # Try requests + BeautifulSoup first (faster)
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, "html.parser")
            links = []
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if ".pdf" in href.lower():
                    if not href.startswith("http"):
                        href = urllib.parse.urljoin(url, href)
                    links.append({"href": href, "text": a.get_text(strip=True)})
            papers = extract_papers_from_links(links)
            if papers:
                print(f"     Found {len(papers)} papers (BS4)")
    except Exception as e:
        print(f"     ⚠️  Request error: {str(e)[:80]}")

    # Fallback: Playwright for JS-rendered pages
    if not papers and HAS_PLAYWRIGHT:
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                ctx = browser.new_context(user_agent=HEADERS["User-Agent"])
                page = ctx.new_page()
                page.goto(url, timeout=20000)
                page.wait_for_timeout(3000)
                links = page.evaluate("""
                    () => {
                        const results = [];
                        document.querySelectorAll('a[href]').forEach(a => {
                            const href = a.href || '';
                            if (href.toLowerCase().includes('.pdf')) {
                                results.push({ href, text: a.textContent.trim() });
                            }
                        });
                        return results;
                    }
                """)
                papers = extract_papers_from_links(links)
                browser.close()
                if papers:
                    print(f"     Found {len(papers)} papers (Playwright)")
        except Exception as e:
            print(f"     ⚠️  Playwright error: {str(e)[:80]}")

    return papers


def crawl_rtuonline(branch: str, semester: int) -> list:
    """Try rtuonline.com as secondary source."""
    branch_slugs = {
        "cs": "cs", "it": "it", "civil": "ce", "mechanical": "me",
        "electrical": "ee", "electronics": "ec",
    }
    slug = branch_slugs.get(branch, branch)
    url = f"https://www.rtuonline.com/btech-{slug}-question-papers.html"

    papers = []
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            return papers
        soup = BeautifulSoup(resp.text, "html.parser")
        links = []
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if ".pdf" in href.lower():
                if not href.startswith("http"):
                    href = urllib.parse.urljoin(url, href)
                # Check if it matches the target semester
                sem_match = re.search(r'-(\d+)-sem-', href, re.IGNORECASE)
                if sem_match and int(sem_match.group(1)) == semester:
                    links.append({"href": href})
        papers = extract_papers_from_links(links)
        if papers:
            print(f"     + {len(papers)} from rtuonline.com")
    except Exception:
        pass
    return papers


def scrape_all_papers(branches: List[str], semesters: List[int] = None) -> List[dict]:
    """
    Scrape all sources for available papers.
    Returns list of dicts with: subject, year, url, filename, branch, semester, storage_folder
    """
    all_papers = []
    sems = semesters or list(range(1, 9))

    # 1st year (semesters 1-2) — branch-independent
    if not semesters or any(s in [1, 2] for s in sems):
        first_year_sems = [s for s in [1, 2] if s in sems] if semesters else [1, 2]
        for sem in first_year_sems:
            print(f"\n  🌐 Crawling: 1st Year — Semester {sem}")
            papers = []
            # Try multiple slugs for 1st year
            for slug in ["COMMON", "computer-science", "civil", "mechanical", "electrical"]:
                new_papers = crawl_semester_page(slug, sem)
                if new_papers:
                    papers.extend(new_papers)
                    break  # 1st year subjects are common, one branch page is enough

            # Also try rtuonline
            for branch in ["cs", "civil"]:
                papers.extend(crawl_rtuonline(branch, sem))

            # Deduplicate and normalize
            seen = set()
            for subj, year, url, fname in papers:
                canonical = normalize_subject(subj)
                key = (canonical.lower(), year)
                if key not in seen:
                    seen.add(key)
                    all_papers.append({
                        "subject": canonical,
                        "year": year,
                        "url": url,
                        "filename": fname,
                        "branch": "1st-year",
                        "semester": sem,
                        "storage_folder": "rtu-1styear",
                    })

    # Branch-specific (semesters 3-8)
    branch_sems = [s for s in sems if s >= 3] if semesters else list(range(3, 9))
    for branch in branches:
        site_slugs = BRANCH_SITE_SLUGS.get(branch, [branch])
        storage_folder = BRANCH_STORAGE_MAP.get(branch, f"rtu-{branch}")

        for sem in branch_sems:
            print(f"\n  🌐 Crawling: {branch.upper()} — Semester {sem}")
            papers = []
            for slug in site_slugs:
                papers = crawl_semester_page(slug, sem)
                if papers:
                    break

            # Also try rtuonline
            papers.extend(crawl_rtuonline(branch, sem))

            # Deduplicate and normalize
            seen = set()
            for subj, year, url, fname in papers:
                canonical = normalize_subject(subj)
                key = (canonical.lower(), year)
                if key not in seen:
                    seen.add(key)
                    all_papers.append({
                        "subject": canonical,
                        "year": year,
                        "url": url,
                        "filename": fname,
                        "branch": branch,
                        "semester": sem,
                        "storage_folder": storage_folder,
                    })

            time.sleep(DOWNLOAD_DELAY)

    return all_papers


# ══════════════════════════════════════════════════════════════════════════════
# Download PDFs
# ══════════════════════════════════════════════════════════════════════════════

def download_pdf(url: str, save_path: Path) -> bool:
    """Download a PDF with validation."""
    if save_path.exists() and save_path.stat().st_size > 5000:
        return True  # Already downloaded

    try:
        resp = requests.get(url, headers=HEADERS, timeout=60, stream=True, allow_redirects=True)
        if resp.status_code != 200:
            return False

        content = resp.content
        if not content[:5] == b'%PDF-':
            return False
        if len(content) < 5000:
            return False

        save_path.parent.mkdir(parents=True, exist_ok=True)
        with open(save_path, "wb") as f:
            f.write(content)

        return True
    except Exception:
        return False


def download_papers(papers: List[dict], dry_run: bool = False) -> Tuple[List[dict], List[dict]]:
    """
    Download all papers. Returns (downloaded, failed) lists.
    """
    downloaded = []
    failed = []

    for i, paper in enumerate(papers, 1):
        sf = paper["storage_folder"]
        sem = paper["semester"]
        subject = paper["subject"]
        year = paper["year"]

        storage_path = f"{sf}/Sem {sem}/{subject} {year}.pdf"
        safe_name = re.sub(r'[^\w\s-]', '', subject).replace(' ', '-').lower()
        local_path = DOWNLOAD_DIR / sf / f"sem-{sem}" / f"{safe_name}-{year}.pdf"

        paper["local_path"] = str(local_path)
        paper["storage_path"] = storage_path

        if dry_run:
            print(f"  [{i}/{len(papers)}] [DRY] {storage_path}")
            downloaded.append(paper)
            continue

        print(f"  [{i}/{len(papers)}] ⬇️  {subject} {year} (Sem {sem}, {paper['branch']})")

        if download_pdf(paper["url"], local_path):
            size = local_path.stat().st_size if local_path.exists() else 0
            print(f"    ✅ {local_path.name} ({size:,} bytes)")
            downloaded.append(paper)
        else:
            print(f"    ❌ Failed: {paper['url'][:70]}...")
            failed.append(paper)

        time.sleep(DOWNLOAD_DELAY)

    return downloaded, failed


# ══════════════════════════════════════════════════════════════════════════════
# Upload to R2 (Direct — NO Supabase)
# ══════════════════════════════════════════════════════════════════════════════

def get_r2_client():
    """Create boto3 R2 client."""
    import boto3
    from botocore.config import Config

    endpoint = os.getenv("R2_ENDPOINT_URL")
    access_key = os.getenv("R2_ACCESS_KEY_ID")
    secret_key = os.getenv("R2_SECRET_ACCESS_KEY")

    if not all([endpoint, access_key, secret_key]):
        print("❌ R2 credentials not found in .env")
        print("   Required: R2_ENDPOINT_URL, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY")
        sys.exit(1)

    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


def upload_to_r2(r2_client, local_path: str, storage_path: str, max_retries: int = 3) -> bool:
    """Upload a single PDF directly to R2 via boto3."""
    bucket = os.getenv("R2_BUCKET_NAME", "analyxx-papers")
    r2_key = f"library-papers/{storage_path}"

    for attempt in range(1, max_retries + 1):
        try:
            with open(local_path, "rb") as f:
                r2_client.put_object(
                    Bucket=bucket,
                    Key=r2_key,
                    Body=f.read(),
                    ContentType="application/pdf",
                )
            return True
        except Exception as e:
            if attempt < max_retries:
                print(f"    ⚠️  R2 attempt {attempt}/{max_retries}: {str(e)[:60]}")
                time.sleep(3)
            else:
                print(f"    ❌ R2 upload failed after {max_retries} attempts: {str(e)[:80]}")
                return False


def upload_papers(papers: List[dict], dry_run: bool = False) -> Tuple[int, int]:
    """
    Upload all downloaded papers to R2.
    Returns (uploaded_count, failed_count).
    """
    if dry_run:
        for p in papers:
            print(f"  [DRY] → library-papers/{p['storage_path']}")
        return len(papers), 0

    r2 = get_r2_client()
    uploaded = 0
    failed = 0

    for i, paper in enumerate(papers, 1):
        local_path = paper["local_path"]
        storage_path = paper["storage_path"]

        if not os.path.exists(local_path):
            print(f"  [{i}/{len(papers)}] ❌ File not found: {local_path}")
            failed += 1
            continue

        print(f"  [{i}/{len(papers)}] 📤 {storage_path}...", end=" ")

        if upload_to_r2(r2, local_path, storage_path):
            print("✅")
            uploaded += 1
        else:
            failed += 1

        time.sleep(UPLOAD_DELAY)

    return uploaded, failed


# ══════════════════════════════════════════════════════════════════════════════
# Progress Tracking
# ══════════════════════════════════════════════════════════════════════════════

def save_manifest(papers: List[dict], downloaded: int, uploaded: int, failed_uploads: int):
    """Save scrape/upload manifest for resume capability."""
    manifest = {
        "timestamp": datetime.now().isoformat(),
        "year_range": f"{MIN_YEAR}-{MAX_YEAR}",
        "total_scraped": len(papers),
        "total_downloaded": downloaded,
        "total_uploaded": uploaded,
        "failed_uploads": failed_uploads,
        "papers": [
            {
                "local_path": p.get("local_path", ""),
                "storage_path": p.get("storage_path", ""),
                "subject": p["subject"],
                "year": p["year"],
                "branch": p["branch"],
                "semester": p["semester"],
                "url": p["url"],
            }
            for p in papers
        ],
    }
    with open(MANIFEST_FILE, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"\n   📋 Manifest saved: {MANIFEST_FILE}")


def load_manifest() -> Optional[dict]:
    """Load existing manifest for resume."""
    if MANIFEST_FILE.exists():
        with open(MANIFEST_FILE) as f:
            return json.load(f)
    return None


# ══════════════════════════════════════════════════════════════════════════════
# Main CLI
# ══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="Scrape 20 years of RTU Papers → Cloudflare R2",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --all                          Full pipeline: audit → scrape → upload
  %(prog)s --audit                        Just audit R2 bucket
  %(prog)s --scrape                       Scrape + download (no upload)
  %(prog)s --all --branch cs              Single branch
  %(prog)s --all --semester 4             Single semester
  %(prog)s --all --dry-run                Preview only
  %(prog)s --all --skip-audit             Skip R2 audit, scrape everything
  %(prog)s --resume-upload                Resume failed uploads from manifest
        """,
    )
    parser.add_argument("--all", action="store_true", help="Full pipeline: audit → scrape → download → upload")
    parser.add_argument("--audit", action="store_true", help="Audit R2 bucket only")
    parser.add_argument("--scrape", action="store_true", help="Scrape + download (no upload)")
    parser.add_argument("--upload-only", action="store_true", help="Upload already-downloaded papers from manifest")
    parser.add_argument("--resume-upload", action="store_true", help="Resume uploads from existing manifest")
    parser.add_argument("--branch", type=str, help="Specific branch: cs, civil, mechanical, electrical, all")
    parser.add_argument("--semester", type=int, help="Specific semester (1-8)")
    parser.add_argument("--skip-audit", action="store_true", help="Skip R2 audit, scrape everything")
    parser.add_argument("--dry-run", action="store_true", help="Preview only, no downloads/uploads")
    args = parser.parse_args()

    if not any([args.all, args.audit, args.scrape, args.upload_only, args.resume_upload]):
        parser.print_help()
        return

    branches = SCRAPE_BRANCHES if not args.branch or args.branch == "all" else [args.branch]
    semesters = [args.semester] if args.semester else None

    print(f"\n{'='*70}")
    print(f"🚀 RTU 20-Year Paper Scraper → Cloudflare R2")
    print(f"   Year range:  {MIN_YEAR}–{MAX_YEAR}")
    print(f"   Branches:    {', '.join(branches)}")
    print(f"   Semesters:   {semesters or 'all (1-8)'}")
    print(f"   Mode:        {'Audit ' if args.audit or (args.all and not args.skip_audit) else ''}"
          f"{'Scrape ' if args.scrape or args.all else ''}"
          f"{'Upload ' if args.all or args.upload_only else ''}"
          f"{'Resume ' if args.resume_upload else ''}"
          f"{'[DRY RUN]' if args.dry_run else ''}")
    print(f"   Storage:     Cloudflare R2 (direct, no Supabase)")
    print(f"{'='*70}")

    existing = set()
    missing = set()

    # ── Step 1: Audit R2 ──
    if (args.audit or args.all) and not args.skip_audit:
        print(f"\n📊 Step 1: Auditing R2 bucket...")
        existing, missing = audit_r2_papers(branches)

        print(f"\n{'='*70}")
        print(f"📊 R2 Audit Results:")
        print(f"   ✅ Existing papers: {len(existing)}")
        print(f"   ❌ Missing slots:   {len(missing)}")

        # Group missing by storage folder
        missing_by_group = defaultdict(int)
        for (sf, sem, subj, yr) in missing:
            missing_by_group[f"{sf}/Sem {sem}"] += 1
        if missing_by_group:
            print(f"\n   Missing by folder:")
            for group in sorted(missing_by_group.keys()):
                print(f"     📂 {group}: {missing_by_group[group]} papers")

        if args.audit and not args.all:
            return

    # ── Step 2: Scrape web sources ──
    if args.scrape or args.all:
        print(f"\n🕷️  Step 2: Scraping web sources for papers ({MIN_YEAR}–{MAX_YEAR})...")

        all_scraped = scrape_all_papers(branches, semesters)
        print(f"\n   📋 Total papers discovered: {len(all_scraped)}")

        # Filter to missing papers (if audit was done)
        if existing and not args.skip_audit:
            to_download = []
            for paper in all_scraped:
                key = (paper["storage_folder"], paper["semester"], paper["subject"], paper["year"])
                if key not in existing:
                    to_download.append(paper)
            print(f"   📋 Papers not yet in R2: {len(to_download)}")
        else:
            to_download = all_scraped
            print(f"   📋 Papers to download: {len(to_download)} (audit skipped)")

        if not to_download:
            print(f"\n   ✅ All discovered papers are already in R2!")
            return

        # ── Step 3: Download ──
        print(f"\n📥 Step 3: Downloading {len(to_download)} papers...")
        downloaded, failed_dl = download_papers(to_download, dry_run=args.dry_run)

        print(f"\n   ✅ Downloaded: {len(downloaded)}")
        if failed_dl:
            print(f"   ❌ Failed:     {len(failed_dl)}")

        # Save manifest
        save_manifest(downloaded, len(downloaded), 0, 0)

        # ── Step 4: Upload to R2 ──
        if args.all and downloaded:
            print(f"\n☁️  Step 4: Uploading {len(downloaded)} papers to Cloudflare R2...")
            uploaded, failed_up = upload_papers(downloaded, dry_run=args.dry_run)

            print(f"\n   ✅ Uploaded: {uploaded}")
            if failed_up:
                print(f"   ❌ Failed:   {failed_up}")

            # Update manifest
            save_manifest(downloaded, len(downloaded), uploaded, failed_up)

    # ── Resume upload from manifest ──
    if args.resume_upload or args.upload_only:
        manifest = load_manifest()
        if not manifest:
            print(f"\n❌ No manifest found at {MANIFEST_FILE}")
            print(f"   Run --scrape or --all first.")
            return

        papers = manifest["papers"]
        print(f"\n📦 Resuming upload from manifest ({len(papers)} papers)")
        print(f"   Generated: {manifest.get('timestamp', 'unknown')}")

        # Filter to papers that have local files
        to_upload = [p for p in papers if os.path.exists(p.get("local_path", ""))]
        print(f"   Papers with local files: {len(to_upload)}")

        if to_upload:
            uploaded, failed_up = upload_papers(to_upload, dry_run=args.dry_run)
            print(f"\n   ✅ Uploaded: {uploaded}")
            if failed_up:
                print(f"   ❌ Failed:   {failed_up}")

    # ── Final Summary ──
    print(f"\n{'='*70}")
    print(f"🎉 Done!")
    print(f"   📂 Downloads: {DOWNLOAD_DIR}")
    print(f"   📋 Manifest:  {MANIFEST_FILE}")
    print(f"   🌐 R2 CDN:    {R2_CDN_URL}/")
    print(f"   📁 Pattern:   library-papers/{{storageFolder}}/Sem {{N}}/{{Subject}} {{Year}}.pdf")
    print(f"{'='*70}")


if __name__ == "__main__":
    main()
