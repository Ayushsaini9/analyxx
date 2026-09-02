"""
Rate limiting middleware for ANALYXX AI API.

Uses slowapi (built on top of limits) for per-IP rate limiting.
Configurable limits per endpoint category:
  - Auth (login/register): strict limits to prevent brute-force
  - Upload/AI endpoints: moderate limits to prevent abuse
  - General API: relaxed limits for normal usage
"""
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse
import os

# Default limits (can be overridden via env vars)
DEFAULT_RATE = os.getenv("RATE_LIMIT_DEFAULT", "60/minute")
AUTH_RATE = os.getenv("RATE_LIMIT_AUTH", "5/minute")
UPLOAD_RATE = os.getenv("RATE_LIMIT_UPLOAD", "10/minute")
AI_RATE = os.getenv("RATE_LIMIT_AI", "10/minute")

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[DEFAULT_RATE],
    storage_uri=os.getenv("RATE_LIMIT_STORAGE", "memory://"),
)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Custom handler for rate limit exceeded errors."""
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Too many requests. Please slow down.",
            "retry_after": str(exc.detail),
        },
    )
