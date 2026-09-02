import os
from dotenv import load_dotenv

load_dotenv("backend/.env")

r2_vars = ["R2_ENDPOINT_URL", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"]
for var in r2_vars:
    val = os.getenv(var)
    print(f"{var}: {'SET' if val else 'NOT SET'} (length={len(val) if val else 0})")
