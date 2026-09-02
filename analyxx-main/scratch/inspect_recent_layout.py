import requests
from bs4 import BeautifulSoup
import json

url = "https://cracku.in/cat-previous-papers"
headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

resp = requests.get(url, headers=headers)
soup = BeautifulSoup(resp.content, "html.parser")

# Let's find all tags that might represent years, and extract links around them.
# The table structure or card structure. Let's look for text containing "CAT 20" in headings or text.
for h in soup.find_all(['h2', 'h3', 'h4', 'div']):
    text = h.get_text(strip=True)
    if "CAT 202" in text or "CAT 201" in text:
        # Check if it has a small size (not a giant container)
        if len(text) < 150:
            print(f"Tag: {h.name} | Text: {text}")
            # Find download links in siblings or children
            parent = h.find_parent()
            # Let's find download links inside this parent
            dl_links = []
            for a in parent.find_all('a', href=True):
                href = a['href']
                if href.startswith('/downloads/') or 'downloads/' in href:
                    dl_links.append((a.get_text(strip=True), href))
            if dl_links:
                print(f"  DL links in parent: {dl_links}")
            print("-" * 50)
