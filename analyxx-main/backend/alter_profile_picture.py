"""Alter profile_picture column from VARCHAR(500) to TEXT"""
from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import text
from app.database import engine

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE users ALTER COLUMN profile_picture TYPE TEXT"))
        conn.commit()
        print("✓ Changed profile_picture to TEXT")
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
