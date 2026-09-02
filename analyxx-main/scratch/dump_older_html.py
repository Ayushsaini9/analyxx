import requests
from bs4 import BeautifulSoup

url = "https://cracku.in/cat-previous-papers"
headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

resp = requests.get(url, headers=headers)
soup = BeautifulSoup(resp.content, "html.parser")

heading = None
for h in soup.find_all(['h2', 'h3', 'h4']):
    if "2008 - 1990" in h.get_text():
        heading = h
        break

if heading:
    parent = heading.find_parent()
    # Print the parent HTML or the container's HTML
    # We can print the next sibling elements or structure
    print(parent.prettify()[:10000])
else:
    print("Heading not found")
