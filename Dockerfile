FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install
COPY backend/requirements-cloud.txt .
RUN pip install --no-cache-dir -r requirements-cloud.txt && \
    pip install --no-cache-dir uvicorn

# Copy the entire backend folder contents into /app
COPY backend/ .

# Set PYTHONPATH to /app
ENV PYTHONPATH=/app

# Expose the port
EXPOSE 8000

# Run uvicorn
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--log-level", "debug"]
