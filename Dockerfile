FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install
COPY backend/requirements-cloud.txt .
RUN pip install --no-cache-dir -r requirements-cloud.txt

# Copy the rest of the backend code
COPY backend/ .

# Set environment variables
ENV PYTHONPATH=/app
ENV USE_OLLAMA=false

# Expose the port Railway expects
EXPOSE 8000

# Run uvicorn
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
