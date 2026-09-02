import requests

url = "http://localhost:3000/api/library/list-papers?folder=cat/Paper"
try:
    resp = requests.get(url, timeout=5)
    print("Status:", resp.status_code)
    print("Content:", resp.text)
except Exception as e:
    print("Error connecting to frontend dev server:", e)
