import requests
from bs4 import BeautifulSoup

url = "https://www.toprankers.com/cat-2025-question-paper"
headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

resp = requests.get(url, headers=headers)
soup = BeautifulSoup(resp.content, "html.parser")

h2 = soup.find(id="download")
if h2:
    curr = h2.next_sibling
    while curr:
        if curr.name == 'table':
            print("Found Table HTML:")
            print(curr.prettify())
            break
        curr = curr.next_sibling
else:
    print("h2 id=download not found")
