import requests

urls = [
    "https://bodheeprep.com/wp-content/uploads/2024/12/CAT-2024-Slot-03-Final-with-Answer-Keys.pdf",
    "https://bodheeprep.com/wp-content/uploads/2024/12/CAT-2024-Slot-3-Final-with-Answer-Keys.pdf",
    "https://bodheeprep.com/wp-content/uploads/2024/12/CAT-2024-Slot-03-with-Answer-Keys.pdf",
    "https://bodheeprep.com/wp-content/uploads/2024/12/CAT-2024-Slot-3-with-Answer-Keys.pdf",
    "https://cdn.toprankers.net.in/docs/cat-previous-papers-2024-slot-3-merge-final-028e1b04081fb.pdf",
    "https://cdn.toprankers.net.in/docs/cat-previous-papers-2024-slot-3-merge-final-4--028e1b04081fb.pdf",
    "https://cdn.toprankers.net.in/docs/cat-2024-slot-03--028e1b04081fb.pdf"
]

headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

for url in urls:
    resp = requests.head(url, headers=headers)
    print(f"Status: {resp.status_code} | URL: {url}")
