FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements-cloud.txt .
RUN pip install --no-cache-dir -r requirements-cloud.txt && \
    pip install --no-cache-dir uvicorn

COPY backend/ .

ENV PYTHONPATH=/app

# Use Railway's PORT variable (default 8000 if not set)
CMD sh -c "uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000} --log-level debug"
