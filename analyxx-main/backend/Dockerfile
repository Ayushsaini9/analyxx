FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (better Docker layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code (env vars are injected by Render — not from .env files)
COPY app/ ./app/

EXPOSE ${PORT:-8000}

# Production: 2 workers, no reload, clean logs
# Railway injects $PORT dynamically — sh -c ensures variable expansion
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2"]