# Environment Configuration Guide

## Overview

ResourceBuddy uses environment variables for configuration. This guide explains all available options and how to set them up.

## Main Configuration File

The primary configuration file is `.env` in the root directory. Copy `.env.example` to `.env` and update with your values:

```bash
cp .env.example .env
```

## Environment Variables

### ResourceSpace API Configuration
```env
# Your ResourceSpace API endpoint (with trailing slash)
RS_API_URL=https://your-resourcespace-domain.com/api/
# API key from your ResourceSpace user account
RS_API_KEY=your_resourcespace_api_key_here
# ResourceSpace username
RS_USER=admin
```

### Backend Server Configuration
```env
# Backend server port
PORT=3003
# Backend URL for internal use
BACKEND_URL=http://localhost:3003
```

### Frontend Configuration (Vite)
All frontend environment variables must be prefixed with `VITE_`:

```env
# Same as RS_API_URL but for frontend
VITE_RS_API_URL=https://your-resourcespace-domain.com/api/
# Same as RS_API_KEY but for frontend
VITE_RS_API_KEY=your_resourcespace_api_key_here
# Same as RS_USER but for frontend
VITE_RS_USER=admin
# Backend API URL
VITE_BACKEND_URL=http://localhost:3003
# Cache API URL
VITE_CACHE_URL=http://localhost:8000
# Enable demo mode (uses mock data)
VITE_DEMO_MODE=false
```

### Cache Configuration
```env
# Directory for cache storage
CACHE_DIR=/app/cache
# How long to keep cached items (days)
CACHE_TTL_DAYS=7
# Maximum cache size in GB
MAX_CACHE_SIZE_GB=10.0
# Minimum free space to maintain in GB
MIN_FREE_SPACE_GB=5.0
# How often to run cleanup (hours)
CLEANUP_INTERVAL_HOURS=6
```

### CORS Configuration
```env
# Allowed origins for CORS (JSON array format)
CORS_ORIGINS=["http://localhost:3000","http://localhost:3002","http://localhost:3003"]
```

### Database Configuration (Docker)
Only needed if running ResourceSpace in Docker:

```env
MYSQL_PASSWORD=your-secure-password
MYSQL_ROOT_PASSWORD=your-root-password
MYSQL_DATABASE=resourcespace
MYSQL_USER=resourcespace_rw
```

## Service-Specific Configuration

### Backend Service
The backend service uses these variables:
- `RS_API_URL`, `RS_API_KEY`, `RS_USER` - For ResourceSpace API access
- `PORT` - Server port
- `CORS_ORIGINS` - For CORS configuration

### Frontend Service
The frontend uses all `VITE_` prefixed variables. These are embedded at build time.

### Cache API Service
Uses cache-related variables:
- `CACHE_DIR`, `CACHE_TTL_DAYS`, `MAX_CACHE_SIZE_GB`, etc.
- Also needs `RS_API_URL` and `RS_API_KEY` for ResourceSpace access

## Development vs Production

### Development
- Use `.env` file in root directory
- Frontend reads from `.env` during `npm run dev`
- Backend reads from `backend/.env` or root `.env`

### Production (Docker)
- Pass environment variables to Docker:
  ```bash
  docker run --env-file .env resourcebuddy
  ```
- Or use docker-compose with env_file directive

### Production (Manual)
- Set environment variables in your system
- Or use a process manager like PM2 with ecosystem file

## Getting Your ResourceSpace API Key

1. Log into ResourceSpace as an admin user
2. Go to User Menu → My Account
3. Find "API Key" section
4. Copy the key (or generate a new one)
5. Add to your `.env` file

## Troubleshooting

### Frontend not reading variables
- Ensure variables start with `VITE_`
- Restart the dev server after changing .env
- Check browser console for missing variables

### Backend connection issues
- Verify `RS_API_URL` includes `/api/` at the end
- Check API key is valid
- Ensure ResourceSpace user has necessary permissions

### CORS errors
- Add your frontend URL to `CORS_ORIGINS`
- Ensure format is correct (JSON array)
- Restart backend after changes

## Security Notes

- Never commit `.env` files to version control
- Use different API keys for development and production
- Rotate API keys regularly
- Keep database passwords secure
- Use HTTPS in production for API URLs