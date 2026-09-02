import os
import sys

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

print("Testing GET /api/v1/library/list-papers?folder=cat/Paper...")
response = client.get("/api/v1/library/list-papers?folder=cat/Paper")
print("Status Code:", response.status_code)
if response.status_code == 200:
    papers = response.json()
    print(f"Success! Found {len(papers)} papers.")
    for p in papers[:5]:
        print("  -", p)
    if len(papers) > 5:
        print("  ...")
else:
    print("Error response:", response.text)
