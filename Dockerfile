FROM python:3.12.7-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Only the API's dependencies (not the scraping/training ones in the root requirements.txt).
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# What the API reads at runtime: the code, the CSVs, the models. See .dockerignore for what stays out.
COPY backend backend
COPY src src
COPY scripts scripts
COPY data data
COPY models models
COPY lutadores_historicos.csv lutadores_historicos.csv

# Railway sets PORT; the fallback is for running the image locally.
CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
