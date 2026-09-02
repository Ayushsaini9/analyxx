import requests

url = "https://cdn.toprankers.net.in/docs/cat-2025-slot-01--0291b89991070.pdf"
headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

resp = requests.get(url, headers=headers)
print("Status Code:", resp.status_code)
print("Content-Type:", resp.headers.get("Content-Type"))
print("Length:", len(resp.content))
print("First 100 bytes:", resp.content[:100])
