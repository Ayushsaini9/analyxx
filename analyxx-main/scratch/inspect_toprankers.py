import requests
from bs4 import BeautifulSoup

url = "https://www.toprankers.com/cat-2025-question-paper"
headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

resp = requests.get(url, headers=headers)
print("Status Code:", resp.status_code)

soup = BeautifulSoup(resp.content, "html.parser")
links = soup.find_all("a", href=True)
print(f"Found {len(links)} links:")
for a in links:
    href = a['href']
    text = a.get_text(strip=True)
    if 'pdf' in href.lower() or 'download' in href.lower() or 'paper' in href.lower() or 'slot' in href.lower() or 'slot' in text.lower():
        print(f"Text: '{text}' -> {href}")
