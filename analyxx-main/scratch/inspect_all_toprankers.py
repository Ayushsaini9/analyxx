import requests
from bs4 import BeautifulSoup
import re

urls = [
    "https://www.toprankers.com/cat-2025-question-paper",
    "https://www.toprankers.com/cat-2024-question-paper",
    "https://www.toprankers.com/cat-2023-question-paper",
    "https://www.toprankers.com/cat-2022-question-paper",
    "https://www.toprankers.com/cat-2021-question-paper"
]

headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

all_found = {}

for url in urls:
    year = url.split("/")[-1].split("-")[1]
    print(f"\nFetching {url} for year {year}...")
    resp = requests.get(url, headers=headers)
    if resp.status_code != 200:
        print(f"Failed to fetch {url}: Status {resp.status_code}")
        continue
        
    soup = BeautifulSoup(resp.content, "html.parser")
    found_in_page = []
    
    # Let's search for buttons or links with href ending with .pdf
    for tag in soup.find_all(['button', 'a']):
        href = tag.get('href', '')
        if href and '.pdf' in href:
            text = tag.get_text(" ", strip=True)
            # Try to get the row or context
            context = ""
            tr = tag.find_parent('tr')
            if tr:
                context = tr.get_text(" | ", strip=True)
            else:
                context = tag.parent.get_text(" ", strip=True)[:100]
                
            found_in_page.append({
                "text": text,
                "href": href,
                "context": context
            })
            
    # Remove duplicates
    seen = set()
    unique = []
    for item in found_in_page:
        if item['href'] not in seen:
            seen.add(item['href'])
            unique.append(item)
            
    all_found[year] = unique
    print(f"Found {len(unique)} unique PDFs for {year}:")
    for item in unique:
        print(f"  Href: {item['href']}")
        print(f"  Context: '{item['context']}'")
