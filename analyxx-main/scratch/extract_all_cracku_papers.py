import requests
from bs4 import BeautifulSoup
import json

url = "https://cracku.in/cat-previous-papers"
headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

resp = requests.get(url, headers=headers)
soup = BeautifulSoup(resp.content, "html.parser")

papers = []

# Find all divs with class containing pp-mock-row
rows = soup.find_all(class_=lambda x: x and 'pp-mock-row' in x)
print(f"Found {len(rows)} pp-mock-row elements.")

for row in rows:
    # Try to get data-mock-title
    title = row.get('data-mock-title')
    if not title:
        # Try to find a link or heading inside
        a_title = row.find('a', class_=lambda x: x and 'font-medium' in x)
        if a_title:
            title = a_title.get_text(strip=True)
        else:
            title = row.get_text(" ", strip=True)

    # Find the download links
    dl_links = []
    for a in row.find_all('a', href=True):
        href = a['href']
        text = a.get_text(" ", strip=True)
        if href.startswith('/downloads/') or 'downloads/' in href:
            dl_links.append((text, href))
    
    # Also look for sectional links
    sectional_links = []
    for a in row.find_all('a', href=True):
        href = a['href']
        text = a.get_text(" ", strip=True)
        if 'solved' in href and not href.startswith('/downloads/'):
            sectional_links.append((text, href))

    papers.append({
        "title": title,
        "download_links": dl_links,
        "sectional_links": sectional_links
    })

print(f"Processed {len(papers)} papers:")
for p in papers:
    print(f"Title: {p['title']}")
    for text, href in p['download_links']:
        print(f"  DL: '{text}' -> {href}")
    for text, href in p['sectional_links']:
        print(f"  Sect: '{text}' -> {href}")

# Let's save this data to a JSON file
with open("scratch/cracku_papers.json", "w") as f:
    json.dump(papers, f, indent=2)
print("Saved to scratch/cracku_papers.json")
