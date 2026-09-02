import requests
from bs4 import BeautifulSoup

url = "https://cracku.in/cat-previous-papers"
headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

resp = requests.get(url, headers=headers)
soup = BeautifulSoup(resp.content, "html.parser")

# Find the heading "CAT Previous Papers with Solutions (2008 - 1990)"
heading = None
for h in soup.find_all(['h2', 'h3', 'h4']):
    if "2008 - 1990" in h.get_text():
        heading = h
        break

if heading:
    print("Found Heading:", heading.get_text())
    # Let's inspect sibling elements
    parent = heading.find_parent()
    # Let's print out the list items or tables under this section
    for el in heading.find_all_next():
        # Stop if we hit another heading (like 'Join CAT')
        if el.name in ['h2', 'h3'] and "2008 - 1990" not in el.get_text():
            break
        if el.name == 'a' and el.get('href', '').startswith('/downloads/'):
            # Let's find the text around this link
            # Often it's inside a list item or table row
            li = el.find_parent('li')
            p = el.find_parent('p')
            row = el.find_parent('tr')
            parent_text = ""
            if li:
                parent_text = li.get_text(" | ", strip=True)
            elif p:
                parent_text = p.get_text(" | ", strip=True)
            elif row:
                parent_text = row.get_text(" | ", strip=True)
            else:
                parent_text = el.get_text(strip=True)
            print(f"Link: {el.get('href')} | Context: {parent_text[:120]}")
else:
    print("Heading not found")
