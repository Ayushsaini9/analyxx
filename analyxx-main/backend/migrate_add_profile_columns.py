"""
One-time migration: add profile columns to the users table.
Run with: python migrate_add_profile_columns.py
"""
from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import text
from app.database import engine

COLUMNS = [
    ("gender",                 "VARCHAR(50)"),
    ("date_of_birth",          "DATE"),
    ("institution",            "VARCHAR(255)"),
    ("school_name",            "VARCHAR(255)"),
    ("college_email",          "VARCHAR(255)"),
    ("college_email_verified", "BOOLEAN DEFAULT FALSE"),
    ("exam_target",            "VARCHAR(100)"),
    ("profile_completed",      "BOOLEAN DEFAULT FALSE"),
    ("profile_picture",        "TEXT"),
]

def migrate():
    with engine.connect() as conn:
        for col_name, col_type in COLUMNS:
            try:
                conn.execute(text(
                    f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"
                ))
                print(f"  ✓ Added column: {col_name}")
            except Exception as e:
                if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                    print(f"  – Column already exists: {col_name}")
                else:
                    print(f"  ✗ Error adding {col_name}: {e}")
            conn.commit()
    print("\nMigration complete.")

if __name__ == "__main__":
    migrate()
