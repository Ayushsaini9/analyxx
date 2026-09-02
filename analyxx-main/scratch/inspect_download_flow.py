import requests
from bs4 import BeautifulSoup

url = "https://cracku.in/downloads/19318"
headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

resp = requests.get(url, headers=headers)
soup = BeautifulSoup(resp.content, "html.parser")

# Let's save the HTML so we can look at it
with open("scratch/download_page.html", "w", encoding="utf-8") as f:
    f.write(soup.prettify())

# Let's check for any download buttons or scripts that have files
print("Searching for files or downloads in HTML:")
for btn in soup.find_all(["button", "a"]):
    text = btn.get_text(strip=True)
    href = btn.get("href", "")
    onclick = btn.get("onclick", "")
    if "download" in text.lower() or "pdf" in text.lower() or "download" in href.lower() or "download" in onclick.lower():
        print(f"Tag: {btn.name} | Text: '{text}' | Href: '{href}' | Onclick: '{onclick}'")
