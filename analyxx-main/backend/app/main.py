from dotenv import load_dotenv
load_dotenv()

import os
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import auth, papers, library, payments, analyze, study_chat
from app.models.paper_request import PaperRequest  # ensure model is registered
from app.models.subscription import Subscription, Payment  # ensure models are registered
from app.models.library_paper import LibraryPaper  # ensure model is registered
from app.rate_limiter import limiter, rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

# ── Sentry Error Tracking ─────────────────────────────────────────────────────
# Only initializes when SENTRY_DSN is set (no-op in local dev without it).
SENTRY_DSN = os.getenv("SENTRY_DSN")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=os.getenv("NODE_ENV", "production"),
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            SqlalchemyIntegration(),
        ],
        # Capture 10% of transactions for performance monitoring (free tier friendly)
        traces_sample_rate=0.1,
        # Send 100% of errors
        sample_rate=1.0,
        send_default_pii=False,  # Don't send user PII to Sentry
    )

# ── NOTE: Schema is managed by Supabase migrations (backend/migrations/schema.sql)
# ── Do NOT call Base.metadata.create_all() in production — Supabase is the
# ── source of truth. SQLAlchemy models are used only for ORM query mapping.



app = FastAPI(title="ANALYXX AI API", version="1.0.0")

# ── Rate Limiting ──
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# ── CORS Configuration ──
# Allowed origins from env var (comma-separated), with sensible defaults
ALLOWED_ORIGINS = os.getenv(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,https://analyxx.com,https://www.analyxx.com,https://analyxx.vercel.app"
).split(",")

# Strip whitespace from each origin
ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
    max_age=600,  # Cache preflight responses for 10 minutes
)

# ── API Versioning ──
# All domain routes live under /api/v1 for forward-compatible versioning.
# When v2 is needed, mount a new router at /api/v2 without breaking v1 clients.

api_v1 = APIRouter(prefix="/api/v1")
api_v1.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_v1.include_router(papers.router, prefix="/papers", tags=["Papers"])
api_v1.include_router(library.router, prefix="/library", tags=["Library"])
api_v1.include_router(payments.router, prefix="/payments", tags=["Payments"])
api_v1.include_router(analyze.router, prefix="/analyze", tags=["Analysis"])
api_v1.include_router(study_chat.router, prefix="/study", tags=["Study Chat"])


app.include_router(api_v1)

# ── Health check ──
# Root-level /health for load-balancers / infra probes (no auth, no version prefix).
@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "ANALYXX AI is running!", "api_version": "v1"}