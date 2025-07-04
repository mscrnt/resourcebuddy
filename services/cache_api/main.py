#!/usr/bin/env python3
"""
ResourceSpace Cache API Microservice
FastAPI-based caching service for ResourceSpace metadata and files
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, Response
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from pathlib import Path
import logging
import asyncio
from datetime import datetime, timedelta
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from prometheus_client import Counter, Histogram, Gauge, generate_latest

from config import settings
from resourcespace_wrapper import ResourceSpaceWrapper
from models import ResourceResponse, SearchRequest, PrefetchRequest, CacheStats
from redis_cache import redis_cache
from admin_settings import AdminSettingsManager, CacheSettings, ensure_config_file

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Prometheus metrics
cache_hits = Counter('cache_hits_total', 'Total cache hits')
cache_misses = Counter('cache_misses_total', 'Total cache misses')
request_duration = Histogram('request_duration_seconds', 'Request duration')
cache_size_bytes = Gauge('cache_size_bytes', 'Current cache size in bytes')
cached_resources_total = Gauge('cached_resources_total', 'Total cached resources')
redis_hits = Counter('redis_hits_total', 'Total Redis cache hits')
redis_misses = Counter('redis_misses_total', 'Total Redis cache misses')
redis_connected = Gauge('redis_connected', 'Redis connection status (1=connected, 0=disconnected)')
redis_keys_total = Gauge('redis_keys_total', 'Total keys in Redis')

# Global scheduler
scheduler = AsyncIOScheduler()

# Global instances
rs_wrapper: Optional[ResourceSpaceWrapper] = None
admin_settings: Optional[AdminSettingsManager] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    global rs_wrapper, admin_settings
    
    # Ensure config file exists
    ensure_config_file(settings.CONFIG_FILE_PATH)
    
    # Initialize admin settings
    logger.info("Initializing admin settings...")
    admin_settings = AdminSettingsManager(settings.CONFIG_FILE_PATH)
    
    # Initialize Redis if enabled
    if admin_settings.get_setting('redis_enabled'):
        logger.info("Initializing Redis cache...")
        connected = await redis_cache.connect()
        if connected:
            logger.info("Redis cache connected successfully")
        else:
            logger.warning("Redis cache connection failed, continuing without Redis")
    
    # Initialize ResourceSpace wrapper with admin settings
    logger.info("Initializing ResourceSpace wrapper...")
    rs_wrapper = ResourceSpaceWrapper(
        api_url=settings.RS_API_URL,
        api_key=settings.RS_API_KEY,
        cache_dir=settings.CACHE_DIR,
        cache_ttl_days=admin_settings.get_setting('media_cache_ttl_days'),
        rs_user=settings.RS_USER,
        redis_cache=redis_cache if admin_settings.get_setting('redis_enabled') else None
    )
    
    # Schedule cleanup tasks
    scheduler.add_job(
        cleanup_expired_cache,
        'interval',
        hours=admin_settings.get_setting('cleanup_interval_hours'),
        id='cache_cleanup',
        replace_existing=True
    )
    
    # Schedule Redis metrics update
    scheduler.add_job(
        update_redis_metrics,
        'interval',
        minutes=1,
        id='redis_metrics',
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("Cache cleanup scheduler started")
    
    yield
    
    # Cleanup
    scheduler.shutdown()
    if redis_cache.enabled:
        await redis_cache.disconnect()
    logger.info("Cleanup complete")


# Create FastAPI app
app = FastAPI(
    title="ResourceSpace Cache API",
    description="High-performance caching service for ResourceSpace",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def cleanup_expired_cache():
    """Background task to clean expired cache entries"""
    logger.info("Running cache cleanup...")
    try:
        # Update the cache TTL from admin settings before cleanup
        if admin_settings:
            current_ttl = admin_settings.get_setting('media_cache_ttl_days')
            max_cache_size = admin_settings.get_setting('max_cache_size_mb')
            rs_wrapper.cache.default_ttl = timedelta(days=current_ttl)
            logger.info(f"Using media TTL of {current_ttl} days for cleanup")
            logger.info(f"Max cache size: {max_cache_size} MB")
            
        stats = rs_wrapper.cleanup_cache(max_cache_size_mb=max_cache_size)
        logger.info(f"Cache cleanup complete: {stats}")
        
        # Update metrics
        cache_stats = rs_wrapper.get_cache_stats()
        cache_size_bytes.set(cache_stats['cache_directory_size'])
        cached_resources_total.set(cache_stats['total_resources'])
    except Exception as e:
        logger.error(f"Cache cleanup failed: {e}")


async def update_redis_metrics():
    """Update Redis metrics for Prometheus"""
    try:
        if redis_cache and redis_cache.enabled:
            status = await redis_cache.get_cache_status()
            redis_connected.set(1 if status['connected'] else 0)
            redis_keys_total.set(status.get('keys', 0))
        else:
            redis_connected.set(0)
            redis_keys_total.set(0)
    except Exception as e:
        logger.error(f"Failed to update Redis metrics: {e}")
        redis_connected.set(0)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "ResourceSpace Cache API",
        "version": "1.0.0",
        "status": "healthy",
        "endpoints": {
            "resource": "/resource/{id}",
            "file": "/file/{id}",
            "preview": "/preview/{id}/{size}",
            "search": "/search",
            "cache_status": "/debug/cache-status",
            "metrics": "/metrics",
            "docs": "/docs"
        }
    }


@app.get("/resource/{resource_id}", response_model=ResourceResponse)
async def get_resource(resource_id: int):
    """Get resource metadata"""
    with request_duration.time():
        try:
            # Use async method to get resource
            resource = await rs_wrapper.get_resource_async(resource_id, fetch_file=False)
            
            if resource:
                # Check if this was from cache
                if resource.get('_from_cache', False):
                    cache_hits.inc()
                    # Check if it was from Redis
                    if resource.get('_from_redis', False):
                        redis_hits.inc()
                else:
                    cache_misses.inc()
                    redis_misses.inc()
            else:
                cache_misses.inc()
                redis_misses.inc()
                raise HTTPException(status_code=404, detail=f"Resource {resource_id} not found")
                
            return ResourceResponse.from_cache_data(resource)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.exception(f"Error getting resource {resource_id}: {e}")
            raise HTTPException(status_code=500, detail=str(e))


@app.get("/file/{resource_id}")
async def get_file(resource_id: int):
    """Get original resource file"""
    with request_duration.time():
        try:
            # Get resource with file using async method
            resource = await rs_wrapper.get_resource_async(resource_id, fetch_file=True)
            
            if not resource:
                raise HTTPException(status_code=404, detail=f"Resource {resource_id} not found")
                
            if not resource.get('cached_file'):
                # Try to fetch file
                file_path = rs_wrapper.cache.fetch_and_cache_file(
                    resource_id,
                    file_extension=resource.get('file_extension')
                )
                if not file_path:
                    raise HTTPException(status_code=404, detail=f"File for resource {resource_id} not available")
            else:
                file_path = resource['cached_file']['file_path']
                cache_hits.inc()
                
            # Return file
            path = Path(file_path)
            if not path.exists():
                cache_misses.inc()
                raise HTTPException(status_code=404, detail="Cached file not found")
                
            # Determine proper media type
            ext = resource.get('file_extension', '').lower()
            media_type = 'application/octet-stream'
            if ext in ['jpg', 'jpeg', 'png', 'gif', 'webp']:
                media_type = f'image/{ext}'
            elif ext in ['mp4', 'webm', 'ogg']:
                media_type = f'video/{ext}'
            elif ext in ['mp3', 'wav', 'ogg']:
                media_type = f'audio/{ext}'
            elif ext == 'pdf':
                media_type = 'application/pdf'
                
            return FileResponse(
                path=path,
                media_type=media_type,
                headers={
                    "Cache-Control": "public, max-age=86400",
                    "X-Resource-ID": str(resource_id),
                    "Accept-Ranges": "bytes"  # Support range requests for video
                }
            )
            
        except Exception as e:
            logger.error(f"Error getting file for resource {resource_id}: {e}")
            raise HTTPException(status_code=500, detail=str(e))


@app.get("/preview/{resource_id}/{size}")
async def get_preview(resource_id: int, size: str = "thm"):
    """Get resource preview/thumbnail"""
    with request_duration.time():
        try:
            # Validate size parameter
            valid_sizes = ["thm", "pre", "scr", "col"]
            if size not in valid_sizes:
                raise HTTPException(status_code=400, detail=f"Invalid size. Must be one of: {valid_sizes}")
                
            # Get resource metadata using async method
            resource = await rs_wrapper.get_resource_async(resource_id, fetch_file=False)
            
            if not resource:
                raise HTTPException(status_code=404, detail=f"Resource {resource_id} not found")
                
            # Check for cached preview
            previews = resource.get('previews', {})
            if size in previews and 'preview_path' in previews[size]:
                preview_path = previews[size]['preview_path']
                
                # For now, return a redirect to RS preview URL
                # In future, could cache preview files locally
                return JSONResponse({
                    "preview_url": preview_path,
                    "width": previews[size].get('width'),
                    "height": previews[size].get('height')
                })
            else:
                raise HTTPException(status_code=404, detail=f"Preview size '{size}' not available")
                
        except Exception as e:
            logger.error(f"Error getting preview for resource {resource_id}: {e}")
            raise HTTPException(status_code=500, detail=str(e))


@app.post("/search")
async def search_resources(request: SearchRequest):
    """Search resources with caching"""
    with request_duration.time():
        try:
            results = await rs_wrapper.search_resources_async(
                search=request.query,
                resource_types=request.resource_types,
                limit=request.limit
            )
            
            # Track cache performance
            for result in results:
                if result.get('cached_file'):
                    cache_hits.inc()
                else:
                    cache_misses.inc()
                    
            return {
                "query": request.query,
                "total": len(results),
                "results": [ResourceResponse.from_cache_data(r) for r in results]
            }
            
        except Exception as e:
            logger.error(f"Search error: {e}")
            raise HTTPException(status_code=500, detail=str(e))


@app.post("/prefetch")
async def prefetch_resources(request: PrefetchRequest, background_tasks: BackgroundTasks):
    """Prefetch multiple resources into cache"""
    try:
        # Add prefetch task to background
        background_tasks.add_task(
            rs_wrapper.prefetch_resources,
            request.resource_ids,
            request.include_files
        )
        
        return {
            "status": "accepted",
            "message": f"Prefetching {len(request.resource_ids)} resources",
            "resource_ids": request.resource_ids
        }
        
    except Exception as e:
        logger.error(f"Prefetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/debug/cache-status")
async def get_cache_status():
    """Get detailed cache statistics including Redis"""
    try:
        stats = rs_wrapper.get_cache_stats()
        
        # Calculate hit rate
        total_requests = cache_hits._value.get() + cache_misses._value.get()
        hit_rate = cache_hits._value.get() / total_requests if total_requests > 0 else 0
        
        # Get Redis status
        redis_status = await redis_cache.get_cache_status() if redis_cache else {
            'enabled': False,
            'connected': False
        }
        
        # Get admin settings
        current_settings = admin_settings.get_settings() if admin_settings else {}
        
        return {
            "cache_stats": {
                "total_resources": stats['total_resources'],
                "expired_resources": stats['expired_resources'],
                "cached_files": stats['cached_files'],
                "cache_directory_size": stats['cache_directory_size'],
                "hit_rate": hit_rate,
                "total_hits": int(cache_hits._value.get()),
                "total_misses": int(cache_misses._value.get()),
                "most_accessed": stats['most_accessed']
            },
            "redis_status": redis_status,
            "settings": current_settings,
            "ttl_config": {
                "media_ttl_days": current_settings.get('media_cache_ttl_days', 7),
                "redis_ttl_seconds": current_settings.get('redis_ttl_seconds', 3600)
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting cache status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/cache/{resource_id}")
async def evict_resource(resource_id: int):
    """Manually evict a resource from cache"""
    try:
        # Delete from cache
        with rs_wrapper.cache._get_connection() as conn:
            conn.execute("DELETE FROM cached_resources WHERE resource_id = ?", (resource_id,))
            
        return {"status": "success", "message": f"Resource {resource_id} evicted from cache"}
        
    except Exception as e:
        logger.error(f"Error evicting resource {resource_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/metrics")
async def get_metrics():
    """Prometheus metrics endpoint"""
    return Response(content=generate_latest(), media_type="text/plain")


# Admin endpoints
@app.get("/admin/settings")
async def get_admin_settings():
    """Get current admin settings"""
    try:
        settings_data = admin_settings.get_settings()
        return {
            "success": True,
            "settings": settings_data
        }
    except Exception as e:
        logger.error(f"Error getting admin settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/admin/settings")
async def update_admin_settings(updates: Dict[str, Any]):
    """Update admin settings"""
    try:
        # Validate and update settings
        new_settings = admin_settings.update_settings(updates)
        
        # Apply runtime changes
        if 'redis_enabled' in updates:
            if updates['redis_enabled'] and not redis_cache.enabled:
                # Enable Redis
                redis_cache.enabled = True  # Set enabled first
                connected = await redis_cache.connect()
                if connected:
                    # Update wrapper
                    rs_wrapper.redis_cache = redis_cache
                    logger.info("Redis enabled at runtime")
                else:
                    redis_cache.enabled = False
                    logger.error("Failed to connect to Redis at runtime")
            elif not updates['redis_enabled'] and redis_cache.enabled:
                # Disable Redis
                await redis_cache.disconnect()
                redis_cache.enabled = False
                rs_wrapper.redis_cache = None
                logger.info("Redis disabled at runtime")
                
        # Update TTL in wrapper if changed
        if 'media_cache_ttl_days' in updates:
            rs_wrapper.cache.default_ttl = timedelta(days=updates['media_cache_ttl_days'])
            
        return {
            "success": True,
            "settings": new_settings.dict(),
            "message": "Settings updated successfully"
        }
        
    except Exception as e:
        logger.error(f"Error updating admin settings: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/admin/cache/cleanup")
async def trigger_cache_cleanup(background_tasks: BackgroundTasks):
    """Manually trigger cache cleanup"""
    try:
        background_tasks.add_task(cleanup_expired_cache)
        return {
            "success": True,
            "message": "Cache cleanup triggered"
        }
    except Exception as e:
        logger.error(f"Error triggering cleanup: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check if cache is accessible
        stats = rs_wrapper.get_cache_stats()
        return {
            "status": "healthy",
            "cache_accessible": True,
            "total_resources": stats['total_resources']
        }
    except Exception:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "cache_accessible": False}
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)