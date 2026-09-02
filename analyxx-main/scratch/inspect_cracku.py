import requests
from bs4 import BeautifulSoup
import json

url = "https://cracku.in/cat-previous-papers"
headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, Gecko) Chrome/124.0.0.0 Safari/537.36"
}

resp = requests.get(url, headers=headers)
soup = BeautifulSoup(resp.content, "html.parser")

results = []
current_year_heading = ""
for el in soup.find_all(['h2', 'h3', 'a']):
    if el.name in ['h2', 'h3']:
        text = el.get_text(strip=True)
        if "CAT" in text or "Previous" in text:
            current_year_heading = text
    elif el.name == 'a':
        href = el.get('href')
        if href and (href.startswith('/downloads/') or 'downloads/' in href):
            text = el.get_text(strip=True)
            results.append({
                "context": current_year_heading,
                "text": text,
                "href": href
            })

print(f"Total download links found: {len(results)}")
for r in results:
    print(r)
