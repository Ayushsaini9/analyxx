import requests
from bs4 import BeautifulSoup
import re

url = "http://bodheeprep.com/cat-question-paper-previous-years-pdf"
headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

resp = requests.get(url, headers=headers)
soup = BeautifulSoup(resp.content, "html.parser")

pdfs = []
for a in soup.find_all("a", href=True):
    href = a['href']
    if href.endswith(".pdf"):
        # Let's find the text or nearest sibling text to identify what paper it is
        # Often it's inside a table or next to a label
        parent_text = a.find_parent().get_text(" ", strip=True)
        # Check if we can find a year in the href or parent text
        year_match = re.search(r'(19\d{2}|20\d{2})', href)
        year = year_match.group(1) if year_match else None
        
        pdfs.append({
            "href": href,
            "text": a.get_text(strip=True),
            "parent_text": parent_text[:120],
            "year": year
        })

print(f"Found {len(pdfs)} PDFs:")
for p in pdfs:
    print(f"Year: {p['year']} | Text: '{p['text']}' | Link: {p['href']} | Parent: '{p['parent_text']}'")
