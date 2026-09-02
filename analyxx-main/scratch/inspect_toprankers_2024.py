import requests
from bs4 import BeautifulSoup

url = "https://www.toprankers.com/cat-2024-question-paper"
headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

resp = requests.get(url, headers=headers)
soup = BeautifulSoup(resp.content, "html.parser")

for i, table in enumerate(soup.find_all("table")):
    print(f"\n--- Table {i+1} ---")
    for tr in table.find_all("tr"):
        print("Row:", tr.get_text(" | ", strip=True))
        for a in tr.find_all(["a", "button"]):
            print(f"  Link/Btn: '{a.get_text(strip=True)}' -> href: {a.get('href')}")
