# Multi-stage build for lightweight production image
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY web-ui/package*.json ./web-ui/

# Install dependencies
WORKDIR /app/web-ui
RUN npm ci --only=production

# Copy source code
COPY web-ui/ .

# Build the application
RUN npm run build

# Production stage
FROM python:3.11-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy built frontend from builder stage
COPY --from=builder /app/web-ui/dist /app/web-ui/dist

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy entrypoint script
COPY entrypoint.py /app/entrypoint.py

# Copy supervisor config
COPY config/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create necessary directories
RUN mkdir -p /var/log/supervisor

# Expose port
EXPOSE 80

# Set entrypoint
CMD ["python", "/app/entrypoint.py"]