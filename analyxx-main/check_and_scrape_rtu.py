"""
Check RTU papers in R2 bucket, scrape missing ones, and upload to R2.

Workflow:
  1. Build the "expected" catalog from the frontend's subject definitions
  2. HEAD-check each expected paper on the R2 CDN to build the "existing" set
  3. Crawl rtuquestionpapers.com + rtuonline.com to discover available PDFs
  4. Download missing PDFs locally
  5. Generate Analyxx-branded cover pages + merge
  6. Upload final PDFs to R2 via the Supabase Storage API (mirrored to R2)
     OR directly to R2 using certifi for SSL

Usage:
  python check_and_scrape_rtu.py --audit           # Just audit R2 (no scraping)
  python check_and_scrape_rtu.py --scrape           # Audit + scrape missing
  python check_and_scrape_rtu.py --scrape --upload   # Audit + scrape + upload
  python check_and_scrape_rtu.py --scrape --upload --branch cs  # Single branch
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
DOWNLOAD_DIR = BASE_DIR / "papers_to_upload" / "RTU_SCRAPED"
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

R2_CDN_URL = "https://pub-5d418c0acdfa4e9ba673215eb5998a3b.r2.dev/library-papers"
SITE_BASE = "https://www.rtuquestionpapers.com"
CDN_BASE = "https://cdn.rtuquestionpapers.com"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

# ── RTU Storage Structure ──
# Frontend uses: {storageFolder}/Sem {N}/{Subject Name} {Year}.pdf
# Where storageFolder = rtu-csit, rtu-ce, rtu-me, rtu-eeec, rtu-1styear

BRANCH_STORAGE_MAP = {
    "cs": "rtu-csit",
    "it": "rtu-csit",
    "civil": "rtu-ce",
    "mechanical": "rtu-me",
    "electrical": "rtu-eeec",
    "electronics": "rtu-eeec",
}

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
# Maps (branch, semester) → list of subject names
SUBJECT_CATALOG: Dict[str, Dict[int, List[str]]] = {
    # 1st year is branch-independent
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

# IT and Electronics share catalogs with CS and Electrical respectively
SUBJECT_CATALOG["it"] = SUBJECT_CATALOG["cs"]
SUBJECT_CATALOG["electronics"] = SUBJECT_CATALOG["electrical"]

# Years to check (2018-2026)
CHECK_YEARS = list(range(2018, 2027))


def check_r2_paper(storage_folder: str, semester: int, subject: str, year: int) -> bool:
    """HEAD-check if a paper exists on R2 CDN."""
    path = f"{storage_folder}/Sem {semester}/{subject} {year}.pdf"
    url = f"{R2_CDN_URL}/{urllib.parse.quote(path)}"
    try:
        resp = requests.head(url, timeout=8, allow_redirects=True)
        return resp.status_code == 200
    except Exception:
        return False


def audit_r2_papers(branches: List[str] = None) -> Tuple[Dict, Dict]:
    """
    Audit R2 bucket by HEAD-checking all expected papers.
    Returns (existing, missing) dicts keyed by (storage_folder, semester, subject, year).
    """
    existing = {}
    missing = {}

    # 1st year papers
    storage_folder = "rtu-1styear"
    for sem, subjects in SUBJECT_CATALOG["1st-year"].items():
        for subject in subjects:
            for year in CHECK_YEARS:
                key = (storage_folder, sem, subject, year)
                if check_r2_paper(storage_folder, sem, subject, year):
                    existing[key] = True
                    print(f"  ✅ {storage_folder}/Sem {sem}/{subject} {year}.pdf")
                else:
                    missing[key] = True
                time.sleep(0.05)  # Rate limit

    # Branch-specific papers
    branches_to_check = branches or ["cs", "it", "civil", "mechanical", "electrical", "electronics"]
    for branch in branches_to_check:
        if branch == "1st-year":
            continue
        storage_folder = BRANCH_STORAGE_MAP.get(branch, f"rtu-{branch}")
        catalog = SUBJECT_CATALOG.get(branch, {})
        for sem, subjects in catalog.items():
            for subject in subjects:
                for year in CHECK_YEARS:
                    key = (storage_folder, sem, subject, year)
                    if key in existing or key in missing:
                        continue  # Skip duplicates (IT=CS, Electronics=Electrical)
                    if check_r2_paper(storage_folder, sem, subject, year):
                        existing[key] = True
                        print(f"  ✅ {storage_folder}/Sem {sem}/{subject} {year}.pdf")
                    else:
                        missing[key] = True
                    time.sleep(0.05)

    return existing, missing


def fast_audit_r2_papers(branches: List[str] = None) -> Tuple[Dict, Dict]:
    """
    Fast audit using concurrent HEAD requests.
    Returns (existing, missing) dicts.
    """
    existing = {}
    missing = {}
    all_keys = []

    # Build all keys to check
    storage_folder = "rtu-1styear"
    for sem, subjects in SUBJECT_CATALOG["1st-year"].items():
        for subject in subjects:
            for year in CHECK_YEARS:
                all_keys.append((storage_folder, sem, subject, year))

    branches_to_check = branches or ["cs", "civil", "mechanical", "electrical"]
    seen = set()
    for branch in branches_to_check:
        storage_folder = BRANCH_STORAGE_MAP.get(branch, f"rtu-{branch}")
        catalog = SUBJECT_CATALOG.get(branch, {})
        for sem, subjects in catalog.items():
            for subject in subjects:
                for year in CHECK_YEARS:
                    key = (storage_folder, sem, subject, year)
                    if key not in seen:
                        seen.add(key)
                        all_keys.append(key)

    print(f"\n📊 Checking {len(all_keys)} paper slots across R2 CDN...")
    print(f"   (Using concurrent HEAD requests)\n")

    def check_one(key):
        sf, sem, subj, yr = key
        exists = check_r2_paper(sf, sem, subj, yr)
        return key, exists

    with concurrent.futures.ThreadPoolExecutor(max_workers=15) as executor:
        futures = {executor.submit(check_one, k): k for k in all_keys}
        done_count = 0
        for future in concurrent.futures.as_completed(futures):
            key, exists = future.result()
            done_count += 1
            if exists:
                existing[key] = True
                sf, sem, subj, yr = key
                print(f"  ✅ [{done_count}/{len(all_keys)}] {sf}/Sem {sem}/{subj} {yr}.pdf")
            else:
                missing[key] = True
            if done_count % 100 == 0:
                print(f"  ... checked {done_count}/{len(all_keys)}")

    return existing, missing


def crawl_semester_page(branch_slug: str, semester: int) -> list:
    """
    Crawl rtuquestionpapers.com semester page to discover all PDF links.
    Returns list of (subject_name, year, pdf_url, filename)
    """
    url = f"{SITE_BASE}/btech/{branch_slug}/sem-{semester}"
    print(f"\n  🌐 Crawling: {url}")

    papers = []

    # Try requests + BeautifulSoup first (faster)
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, "html.parser")
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if ".pdf" in href.lower():
                    if not href.startswith("http"):
                        href = urllib.parse.urljoin(url, href)
                    filename = href.split("/")[-1]
                    year_match = re.search(r'-(\d{4})\.pdf$', filename, re.IGNORECASE)
                    if year_match:
                        year = int(year_match.group(1))
                        name_part = re.sub(r'^btech-[\w-]+-\d+-sem-', '', filename, re.IGNORECASE)
                        name_part = re.sub(r'-\w{2,7}\d{3,5}-\d{4}\.pdf$', '', name_part, re.IGNORECASE)
                        name_part = re.sub(r'-\d{4}\.pdf$', '', name_part, re.IGNORECASE)
                        # Remove month suffix
                        name_part = re.sub(r'-(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)$', '', name_part, flags=re.IGNORECASE)
                        subject_name = name_part.replace('-', ' ').strip().title()
                        if subject_name and year >= 2018:
                            papers.append((subject_name, year, href, filename))
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
                for link in links:
                    href = link["href"]
                    filename = href.split("/")[-1]
                    year_match = re.search(r'-(\d{4})\.pdf$', filename, re.IGNORECASE)
                    if not year_match:
                        continue
                    year = int(year_match.group(1))
                    name_part = re.sub(r'^btech-[\w-]+-\d+-sem-', '', filename, re.IGNORECASE)
                    name_part = re.sub(r'-\w{2,7}\d{3,5}-\d{4}\.pdf$', '', name_part, re.IGNORECASE)
                    name_part = re.sub(r'-\d{4}\.pdf$', '', name_part, re.IGNORECASE)
                    name_part = re.sub(r'-(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)$', '', name_part, flags=re.IGNORECASE)
                    subject_name = name_part.replace('-', ' ').strip().title()
                    if subject_name and year >= 2018:
                        papers.append((subject_name, year, href, filename))
                browser.close()
                print(f"     Found {len(papers)} papers (Playwright)")
        except Exception as e:
            print(f"     ⚠️  Playwright error: {str(e)[:80]}")

    return papers


def also_try_rtuonline(branch: str, semester: int) -> list:
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
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if ".pdf" in href.lower():
                if not href.startswith("http"):
                    href = urllib.parse.urljoin(url, href)
                sem_match = re.search(r'-(\d+)-sem-', href, re.IGNORECASE)
                if sem_match and int(sem_match.group(1)) == semester:
                    filename = href.split("/")[-1]
                    year_match = re.search(r'-(\d{4})\.pdf$', filename, re.IGNORECASE)
                    if year_match:
                        year = int(year_match.group(1))
                        name_part = re.sub(r'^btech-[\w-]+-\d+-sem-', '', filename, re.IGNORECASE)
                        name_part = re.sub(r'-\w{2,7}\d{3,5}-\d{4}\.pdf$', '', name_part, re.IGNORECASE)
                        name_part = re.sub(r'-\d{4}\.pdf$', '', name_part, re.IGNORECASE)
                        name_part = re.sub(r'-(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)$', '', name_part, flags=re.IGNORECASE)
                        subject_name = name_part.replace('-', ' ').strip().title()
                        if subject_name and year >= 2018:
                            papers.append((subject_name, year, href, filename))
        if papers:
            print(f"     + {len(papers)} from rtuonline.com")
    except Exception:
        pass
    return papers


# ── Subject Name Normalization ──
# Maps scraped slug-based names → canonical names used in R2 storage
NORMALIZE_MAP = {
    # CS/IT
    "advance engineering mathematics 1": "Advanced Engineering Mathematics-I",
    "advance engineering mathematics": "Advanced Engineering Mathematics-I",
    "advanced engineering mathematics 1": "Advanced Engineering Mathematics-I",
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
    "air and noise pollution and control": "Air and Noise Pollution and Control",
    "construction technology and equipments": "Construction Technology and Equipments",
    "design of concrete structures": "Design of Concrete Structures",
    "structural analysis 1": "Structural Analysis-I",
    "structural analysis 2": "Structural Analysis-II",
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
    "electrical machine 2": "Electrical Machines-II",
    "electrical machines 2": "Electrical Machines-II",
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
    "power system 2": "Power System-II",
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


def download_pdf(url: str, save_path: Path) -> bool:
    """Download a PDF with validation."""
    if save_path.exists() and save_path.stat().st_size > 5000:
        print(f"    ⏭️  Exists: {save_path.name}")
        return True

    try:
        resp = requests.get(url, headers=HEADERS, timeout=60, stream=True, allow_redirects=True)
        if resp.status_code != 200:
            print(f"    ❌ HTTP {resp.status_code}: {save_path.name}")
            return False

        content = resp.content
        if not content[:5] == b'%PDF-':
            print(f"    ❌ Not a PDF: {save_path.name}")
            return False
        if len(content) < 5000:
            print(f"    ❌ Too small ({len(content)} bytes): {save_path.name}")
            return False

        save_path.parent.mkdir(parents=True, exist_ok=True)
        with open(save_path, "wb") as f:
            f.write(content)

        print(f"    ✅ {save_path.name} ({len(content):,} bytes)")
        return True
    except Exception as e:
        print(f"    ❌ Error: {str(e)[:60]}")
        return False


def upload_to_r2(local_path: Path, storage_path: str, max_retries: int = 3) -> bool:
    """
    Upload a PDF to R2 via the Supabase Storage API.
    The Supabase bucket 'library-papers' mirrors to R2.
    """
    from supabase import create_client, ClientOptions

    supabase = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_KEY"),
        options=ClientOptions(storage_client_timeout=300),
    )

    BUCKET = "library-papers"

    with open(local_path, "rb") as f:
        content = f.read()

    for attempt in range(1, max_retries + 1):
        try:
            supabase.storage.from_(BUCKET).upload(
                path=storage_path,
                file=content,
                file_options={"content-type": "application/pdf"},
            )
            print(f"    ✅ Uploaded → {storage_path} ({len(content):,} bytes)")
            return True
        except Exception as e:
            if "Duplicate" in str(e) or "already exists" in str(e).lower():
                print(f"    ℹ️  Already exists → {storage_path}")
                return True
            elif attempt < max_retries:
                print(f"    ⚠️  Attempt {attempt}/{max_retries} failed: {str(e)[:60]}")
                time.sleep(3)
            else:
                print(f"    ❌ Upload failed after {max_retries} attempts: {str(e)[:80]}")
                return False


def upload_to_r2_direct(local_path: Path, storage_path: str, max_retries: int = 3) -> bool:
    """
    Upload directly to R2 using Python 3.12 subprocess (Python 3.9 SSL can't
    handle Cloudflare R2's TLS requirements).
    """
    import subprocess

    r2_key = f"library-papers/{storage_path}"
    endpoint = os.getenv('R2_ENDPOINT_URL')
    access_key = os.getenv('R2_ACCESS_KEY_ID')
    secret_key = os.getenv('R2_SECRET_ACCESS_KEY')
    bucket = os.getenv('R2_BUCKET_NAME', 'analyxx-papers')

    # Use Python 3.12 (Homebrew) which has modern SSL support
    py312 = "/opt/homebrew/bin/python3.12"
    if not os.path.exists(py312):
        py312 = "/opt/homebrew/bin/python3.11"
    if not os.path.exists(py312):
        print("    ⚠️  No modern Python found, falling back to Supabase upload")
        return upload_to_r2(local_path, storage_path, max_retries)

    upload_script = f'''
import boto3
from botocore.config import Config

r2 = boto3.client(
    "s3",
    endpoint_url="{endpoint}",
    aws_access_key_id="{access_key}",
    aws_secret_access_key="{secret_key}",
    config=Config(signature_version="s3v4"),
    region_name="auto",
)

with open("{local_path}", "rb") as f:
    r2.put_object(
        Bucket="{bucket}",
        Key="{r2_key}",
        Body=f.read(),
        ContentType="application/pdf",
    )
print("OK")
'''

    for attempt in range(1, max_retries + 1):
        try:
            result = subprocess.run(
                [py312, "-c", upload_script],
                capture_output=True, text=True, timeout=120,
            )
            if result.returncode == 0 and "OK" in result.stdout:
                print(f"    ✅ R2 Upload → {r2_key}")
                return True
            else:
                err = (result.stderr or result.stdout)[:120]
                if attempt < max_retries:
                    print(f"    ⚠️  R2 attempt {attempt}/{max_retries}: {err}")
                    time.sleep(3)
                else:
                    print(f"    ❌ R2 upload failed: {err}")
                    return False
        except subprocess.TimeoutExpired:
            if attempt < max_retries:
                print(f"    ⚠️  R2 attempt {attempt}/{max_retries}: timeout")
                time.sleep(3)
            else:
                print(f"    ❌ R2 upload timed out after {max_retries} attempts")
                return False
        except Exception as e:
            if attempt < max_retries:
                print(f"    ⚠️  R2 attempt {attempt}/{max_retries}: {str(e)[:60]}")
                time.sleep(3)
            else:
                print(f"    ❌ R2 upload failed: {str(e)[:80]}")
                return False


def scrape_and_collect_papers(branches: List[str], semesters: List[int] = None) -> List[dict]:
    """
    Scrape rtuquestionpapers.com and rtuonline.com for all available papers.
    Returns list of dicts with: subject, year, url, filename, branch, semester
    """
    all_papers = []

    for branch in branches:
        site_slugs = BRANCH_SITE_SLUGS.get(branch, [branch])
        sems = semesters or list(range(1, 9))

        for sem in sems:
            papers = []
            for slug in site_slugs:
                papers = crawl_semester_page(slug, sem)
                if papers:
                    break

            # Also try rtuonline
            papers.extend(also_try_rtuonline(branch, sem))

            # Deduplicate
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
                    })

    return all_papers


def main():
    parser = argparse.ArgumentParser(description="Check & Scrape RTU Papers for R2")
    parser.add_argument("--audit", action="store_true", help="Audit R2 bucket (HEAD-check all expected papers)")
    parser.add_argument("--scrape", action="store_true", help="Scrape missing papers from web sources")
    parser.add_argument("--upload", action="store_true", help="Upload scraped papers to R2")
    parser.add_argument("--branch", type=str, help="Specific branch: cs, it, civil, mechanical, electrical, electronics, all")
    parser.add_argument("--semester", type=int, help="Specific semester (1-8)")
    parser.add_argument("--fast", action="store_true", help="Use concurrent HEAD checks (faster audit)")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be done without downloading/uploading")
    args = parser.parse_args()

    if not args.audit and not args.scrape:
        args.audit = True
        args.scrape = True

    branches = ["cs", "civil", "mechanical", "electrical"] if not args.branch or args.branch == "all" else [args.branch]
    semesters = [args.semester] if args.semester else None

    print(f"\n🚀 RTU Papers R2 Checker & Scraper")
    print(f"   Branches: {', '.join(branches)}")
    print(f"   Semesters: {semesters or 'all'}")
    print(f"   Mode: {'Audit' if args.audit else ''} {'Scrape' if args.scrape else ''} {'Upload' if args.upload else ''}")
    print(f"{'='*60}")

    # ── Step 1: Audit R2 ──
    existing = {}
    missing = {}
    if args.audit:
        print(f"\n📊 Step 1: Auditing R2 bucket...")
        if args.fast:
            existing, missing = fast_audit_r2_papers(branches)
        else:
            existing, missing = fast_audit_r2_papers(branches)  # Always use fast

        print(f"\n{'='*60}")
        print(f"📊 R2 Audit Results:")
        print(f"   ✅ Existing papers: {len(existing)}")
        print(f"   ❌ Missing slots:   {len(missing)}")

        # Group missing by branch/semester
        missing_by_group = defaultdict(list)
        for (sf, sem, subj, yr) in missing:
            missing_by_group[f"{sf}/Sem {sem}"].append(f"{subj} {yr}")

        if missing_by_group:
            print(f"\n   Missing papers by folder:")
            for group in sorted(missing_by_group.keys()):
                items = missing_by_group[group]
                print(f"     📂 {group}: {len(items)} papers")

    # ── Step 2: Scrape missing papers ──
    if args.scrape:
        print(f"\n🕷️ Step 2: Scraping available papers from web...")

        scraped_papers = scrape_and_collect_papers(branches, semesters)
        print(f"\n   📋 Total papers discovered: {len(scraped_papers)}")

        # Filter to only missing papers
        actually_missing = []
        for paper in scraped_papers:
            storage_folder = BRANCH_STORAGE_MAP.get(paper["branch"], f"rtu-{paper['branch']}")
            if paper["semester"] in (1, 2):
                storage_folder = "rtu-1styear"
            key = (storage_folder, paper["semester"], paper["subject"], paper["year"])
            if key not in existing:
                actually_missing.append(paper)

        print(f"   📋 Papers not yet in R2: {len(actually_missing)}")

        if args.dry_run:
            print(f"\n   [DRY RUN] Would download and upload:")
            for paper in actually_missing:
                sf = BRANCH_STORAGE_MAP.get(paper["branch"], f"rtu-{paper['branch']}")
                if paper["semester"] in (1, 2):
                    sf = "rtu-1styear"
                path = f"{sf}/Sem {paper['semester']}/{paper['subject']} {paper['year']}.pdf"
                print(f"     → {path}")
            return

        # Download missing papers
        print(f"\n📥 Step 3: Downloading {len(actually_missing)} missing papers...")
        downloaded = 0
        upload_queue = []

        for i, paper in enumerate(actually_missing, 1):
            storage_folder = BRANCH_STORAGE_MAP.get(paper["branch"], f"rtu-{paper['branch']}")
            if paper["semester"] in (1, 2):
                storage_folder = "rtu-1styear"

            storage_path = f"{storage_folder}/Sem {paper['semester']}/{paper['subject']} {paper['year']}.pdf"
            safe_name = re.sub(r'[^\w\s-]', '', paper["subject"]).replace(' ', '-').lower()
            local_path = DOWNLOAD_DIR / f"{storage_folder}" / f"sem-{paper['semester']}" / f"{safe_name}-{paper['year']}.pdf"

            print(f"\n  [{i}/{len(actually_missing)}] {paper['subject']} {paper['year']} (Sem {paper['semester']})")
            print(f"    Source: {paper['url'][:80]}...")

            if download_pdf(paper["url"], local_path):
                downloaded += 1
                upload_queue.append((local_path, storage_path))

            time.sleep(0.5)

        print(f"\n   ✅ Downloaded: {downloaded}/{len(actually_missing)}")

        # ── Step 4: Upload to R2 ──
        if args.upload and upload_queue:
            print(f"\n☁️  Step 4: Uploading {len(upload_queue)} papers to R2...")
            uploaded = 0
            failed_uploads = []
            for local_path, storage_path in upload_queue:
                print(f"\n  📤 {storage_path}")
                if upload_to_r2_direct(local_path, storage_path):
                    uploaded += 1
                else:
                    failed_uploads.append((str(local_path), storage_path))
                time.sleep(0.5)

            print(f"\n   ✅ Uploaded: {uploaded}/{len(upload_queue)}")

            # If uploads failed (SSL issue), save manifest for later upload
            if failed_uploads:
                print(f"\n   ⚠️  {len(failed_uploads)} uploads failed (likely SSL issue)")
                print(f"   Saving upload manifest for later...")
        elif args.upload and not upload_queue:
            print(f"\n   ℹ️  Nothing to upload — all papers already in R2 or no new downloads.")
            failed_uploads = []
        else:
            failed_uploads = [(str(lp), sp) for lp, sp in upload_queue]

        # Always save manifest of downloaded papers
        if upload_queue:
            manifest = {
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
                "total_downloaded": downloaded,
                "papers": [
                    {"local_path": str(lp), "storage_path": sp}
                    for lp, sp in upload_queue
                ]
            }
            manifest_path = DOWNLOAD_DIR / "upload_manifest.json"
            with open(manifest_path, "w") as f:
                json.dump(manifest, f, indent=2)
            print(f"\n   📋 Manifest saved: {manifest_path}")
            print(f"      Contains {len(upload_queue)} papers to upload")

            # Generate standalone upload script
            upload_script_path = BASE_DIR / "upload_scraped_to_r2.py"
            _generate_upload_script(upload_script_path, manifest_path)
            print(f"   📜 Upload script: {upload_script_path}")
            print(f"      Run on a machine with R2 access:")
            print(f"      python upload_scraped_to_r2.py")

    # ── Summary ──
    print(f"\n{'='*60}")
    print(f"🎉 Done!")
    if existing:
        print(f"   ✅ Papers in R2: {len(existing)}")
    if missing:
        print(f"   ❌ Missing slots: {len(missing)}")
    print(f"   📂 Downloads: {DOWNLOAD_DIR}")


def _generate_upload_script(script_path: Path, manifest_path: Path):
    """Generate a standalone Python script that uploads papers from manifest to R2."""
    script = '''#!/usr/bin/env python3
"""
Upload scraped RTU papers to Cloudflare R2.
Generated by check_and_scrape_rtu.py

Usage:
  python upload_scraped_to_r2.py                    # Upload all from manifest
  python upload_scraped_to_r2.py --dry-run           # Preview only
"""
import os, json, sys, time
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "backend", ".env"))

MANIFEST_PATH = "''' + str(manifest_path) + '''"

def upload_via_boto3(local_path, storage_path):
    """Upload via boto3 to R2."""
    import boto3
    from botocore.config import Config

    r2 = boto3.client(
        "s3",
        endpoint_url=os.getenv("R2_ENDPOINT_URL"),
        aws_access_key_id=os.getenv("R2_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("R2_SECRET_ACCESS_KEY"),
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )
    bucket = os.getenv("R2_BUCKET_NAME", "analyxx-papers")
    r2_key = f"library-papers/{storage_path}"

    with open(local_path, "rb") as f:
        r2.put_object(Bucket=bucket, Key=r2_key, Body=f.read(), ContentType="application/pdf")
    return True

def main():
    dry_run = "--dry-run" in sys.argv

    with open(MANIFEST_PATH) as f:
        manifest = json.load(f)

    papers = manifest["papers"]
    print(f"\\n📦 Upload Manifest: {len(papers)} papers")
    print(f"   Generated: {manifest['timestamp']}")

    if dry_run:
        print("\\n[DRY RUN]")
        for p in papers:
            print(f"  → {p['storage_path']}")
        return

    uploaded = 0
    failed = 0
    for i, p in enumerate(papers, 1):
        local_path = p["local_path"]
        storage_path = p["storage_path"]

        if not os.path.exists(local_path):
            print(f"  [{i}/{len(papers)}] ❌ File not found: {local_path}")
            failed += 1
            continue

        print(f"  [{i}/{len(papers)}] 📤 {storage_path}...", end=" ")
        try:
            upload_via_boto3(local_path, storage_path)
            print("✅")
            uploaded += 1
        except Exception as e:
            print(f"❌ {str(e)[:60]}")
            failed += 1
        time.sleep(0.3)

    print(f"\\n🎉 Done! ✅ {uploaded} uploaded | ❌ {failed} failed")

if __name__ == "__main__":
    main()
'''
    with open(script_path, "w") as f:
        f.write(script)


if __name__ == "__main__":
    main()
