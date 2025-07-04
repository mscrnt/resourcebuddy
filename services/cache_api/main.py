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

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Prometheus metrics
cache_hits = Counter('cache_hits_total', 'Total cache hits')
cache_misses = Counter('cache_misses_total', 'Total cache misses')
request_duration = Histogram('request_duration_seconds', 'Request duration')
cache_size_bytes = Gauge('cache_size_bytes', 'Current cache size in bytes')
cached_resources_total = Gauge('cached_resources_total', 'Total cached resources')

# Global scheduler
scheduler = AsyncIOScheduler()

# Global wrapper instance
rs_wrapper: Optional[ResourceSpaceWrapper] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    global rs_wrapper
    
    # Initialize ResourceSpace wrapper
    logger.info("Initializing ResourceSpace wrapper...")
    rs_wrapper = ResourceSpaceWrapper(
        api_url=settings.RS_API_URL,
        api_key=settings.RS_API_KEY,
        cache_dir=settings.CACHE_DIR,
        cache_ttl_days=settings.CACHE_TTL_DAYS,
        rs_user=settings.RS_USER
    )
    
    # Schedule cleanup tasks
    scheduler.add_job(
        cleanup_expired_cache,
        'interval',
        hours=settings.CLEANUP_INTERVAL_HOURS,
        id='cache_cleanup',
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("Cache cleanup scheduler started")
    
    yield
    
    # Cleanup
    scheduler.shutdown()
    logger.info("Scheduler shutdown complete")


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
        stats = rs_wrapper.cleanup_cache()
        logger.info(f"Cache cleanup complete: {stats}")
        
        # Update metrics
        cache_stats = rs_wrapper.get_cache_stats()
        cache_size_bytes.set(cache_stats['cache_directory_size'])
        cached_resources_total.set(cache_stats['total_resources'])
    except Exception as e:
        logger.error(f"Cache cleanup failed: {e}")


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
                else:
                    cache_misses.inc()
            else:
                cache_misses.inc()
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


@app.get("/debug/cache-status", response_model=CacheStats)
async def get_cache_status():
    """Get detailed cache statistics"""
    try:
        stats = rs_wrapper.get_cache_stats()
        
        # Calculate hit rate
        total_requests = cache_hits._value.get() + cache_misses._value.get()
        hit_rate = cache_hits._value.get() / total_requests if total_requests > 0 else 0
        
        return CacheStats(
            total_resources=stats['total_resources'],
            expired_resources=stats['expired_resources'],
            cached_files=stats['cached_files'],
            cache_directory_size=stats['cache_directory_size'],
            hit_rate=hit_rate,
            total_hits=int(cache_hits._value.get()),
            total_misses=int(cache_misses._value.get()),
            most_accessed=stats['most_accessed']
        )
        
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