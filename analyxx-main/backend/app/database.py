"""
database.py — Supabase PostgreSQL connection via SQLAlchemy ORM.

Architecture:
  - SQLAlchemy engine → Supabase PostgreSQL (connection pooler)
    Used for: all ORM queries (users, papers, subscriptions, payments)
    Connects as: postgres role (full access, bypasses RLS by design)

  - Supabase client (supabase-py) → Supabase REST / Auth
    Used for: Auth JWT verification

  - Cloudflare R2 (via boto3 S3 client) → PDF file storage
    Used for: uploading & downloading user papers and library papers
    Falls back to Supabase Storage when R2 credentials are not configured.

Schema is managed via Supabase Dashboard / migrations in backend/migrations/.
NEVER call Base.metadata.create_all() in production.
"""

from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from supabase import create_client, Client
from dotenv import load_dotenv
import os

load_dotenv()

# ── Supabase PostgreSQL (via connection pooler) ──────────────────────────────
DATABASE_URL = os.getenv("SUPABASE_DATABASE_URL", os.getenv("DATABASE_URL"))

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL (or SUPABASE_DATABASE_URL) is not set. "
        "Add it to your .env file or deployment environment variables."
    )

engine = create_engine(
    DATABASE_URL,
    # Production connection pool settings for Supabase's PgBouncer pooler
    pool_size=5,            # keep 5 connections warm
    max_overflow=10,        # allow up to 10 extra under load
    pool_timeout=30,        # wait 30s for a connection before erroring
    pool_recycle=1800,      # recycle connections every 30 min (prevents stale)
    pool_pre_ping=True,     # test connection health before using (critical for Supabase)
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ── Supabase client (Auth + Storage) ─────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise RuntimeError(
        "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment variables."
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# ── Cloudflare R2 (PDF Storage) ───────────────────────────────────────────────
import boto3
from botocore.config import Config as BotoConfig

R2_ENDPOINT_URL = os.getenv("R2_ENDPOINT_URL")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME", "analyxx-papers")
R2_PUBLIC_URL = os.getenv("R2_PUBLIC_URL", "https://pub-5d418c0acdfa4e9ba673215eb5998a3b.r2.dev")

r2_client = None
if R2_ENDPOINT_URL and R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY:
    r2_client = boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT_URL,
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        config=BotoConfig(signature_version="s3v4", connect_timeout=2, read_timeout=3),
        region_name="auto",
    )
else:
    import warnings
    warnings.warn("R2 credentials not set — falling back to Supabase Storage")


def get_db():
    """FastAPI dependency — yields a DB session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()