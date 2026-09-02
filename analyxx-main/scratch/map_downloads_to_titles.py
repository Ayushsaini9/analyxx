import requests
from bs4 import BeautifulSoup

url = "https://cracku.in/cat-previous-papers"
headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

resp = requests.get(url, headers=headers)
soup = BeautifulSoup(resp.content, "html.parser")

# Find all a tags with downloads/
for a in soup.find_all('a', href=True):
    href = a['href']
    if href.startswith('/downloads/') or 'downloads/' in href:
        # Traverse up to find some identifying text
        # Let's inspect the parents
        parent = a.find_parent()
        found = False
        
        # Traverse up to 5 levels to find text that contains 'CAT' and '20' or '19'
        curr = parent
        for i in range(5):
            if not curr:
                break
            # Find any h2, h3, h4 or class with titles
            title_el = curr.find(['h2', 'h3', 'h4', 'span', 'div', 'a'], class_=lambda x: x and ('title' in x or 'header' in x or 'name' in x))
            if title_el and title_el != a:
                title_text = title_el.get_text(strip=True)
                if len(title_text) > 5 and len(title_text) < 100:
                    print(f"URL: {href} | Class Title: '{title_text}'")
                    found = True
                    break
            
            # Let's also check data attributes of parents
            if curr.get('data-mock-title'):
                print(f"URL: {href} | Data Title: '{curr.get('data-mock-title')}'")
                found = True
                break
            
            # Look at sibling text or heading text within this subtree
            heading = curr.find(['h2', 'h3', 'h4'])
            if heading:
                print(f"URL: {href} | Subtree Heading: '{heading.get_text(strip=True)}'")
                found = True
                break
                
            curr = curr.parent
        
        if not found:
            # Just print the parent text
            parent_text = parent.get_text(" ", strip=True)
            print(f"URL: {href} | Parent Text: '{parent_text[:120]}'")
