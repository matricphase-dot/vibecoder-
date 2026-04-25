# ============================================
# VibeCoder Dockerfile (Multi-stage)
# ============================================

# Stage 1: Frontend build
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production
COPY frontend/ .
RUN npm run build

# Stage 2: Backend base
FROM python:3.10-slim AS backend
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .

# Stage 3: Final image with both frontend and backend
FROM python:3.10-slim
WORKDIR /app

# Install nginx to serve frontend
RUN apt-get update && apt-get install -y nginx && rm -rf /var/lib/apt/lists/*

# Copy backend
COPY --from=backend /app /app/backend
# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Copy nginx config
COPY nginx.conf /etc/nginx/sites-available/default

# Copy startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80 8000
CMD ["/start.sh"]
