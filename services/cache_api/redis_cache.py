"""
Redis cache wrapper for ResourceSpace Cache API
Provides an optional hot cache layer for lightweight metadata
"""

import json
import logging
from typing import Optional, Dict, Any
import redis
from redis.exceptions import RedisError
from config import settings

logger = logging.getLogger(__name__)


class RedisCache:
    """Redis cache wrapper with fallback handling"""
    
    def __init__(self):
        self.client: Optional[redis.asyncio.Redis] = None
        self.enabled = settings.REDIS_ENABLED
        self.ttl = settings.REDIS_TTL_SECONDS
        
    async def connect(self) -> bool:
        """Initialize Redis connection"""
        if not self.enabled:
            logger.info("Redis is disabled in configuration")
            return False
            
        try:
            self.client = redis.asyncio.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB,
                password=settings.REDIS_PASSWORD,
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5
            )
            
            # Test connection
            await self.client.ping()
            logger.info(f"Redis connected successfully at {settings.REDIS_HOST}:{settings.REDIS_PORT}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self.enabled = False
            self.client = None
            return False
            
    async def disconnect(self):
        """Close Redis connection"""
        if self.client:
            await self.client.close()
            
    async def get_resource(self, resource_id: int) -> Optional[Dict[str, Any]]:
        """Get resource metadata from Redis"""
        if not self.enabled or not self.client:
            return None
            
        try:
            key = f"resource:{resource_id}"
            data = await self.client.get(key)
            if data:
                # Increment hit counter
                await self.increment_hits(resource_id)
                return json.loads(data)
            return None
            
        except (RedisError, json.JSONDecodeError) as e:
            logger.error(f"Redis get error for resource {resource_id}: {e}")
            return None
            
    async def set_resource(self, resource_id: int, data: Dict[str, Any], ttl: Optional[int] = None):
        """Set resource metadata in Redis"""
        if not self.enabled or not self.client:
            return
            
        try:
            key = f"resource:{resource_id}"
            # Store only lightweight metadata
            metadata = {
                'resource_id': resource_id,
                'title': data.get('title') or data.get('field8'),
                'resource_type': data.get('resource_type'),
                'file_extension': data.get('file_extension'),
                'thumb_url': data.get('thumb_url'),
                'creation_date': data.get('creation_date'),
                'modified': data.get('modified')
            }
            
            await self.client.set(
                key, 
                json.dumps(metadata),
                ex=ttl or self.ttl
            )
            
        except (RedisError, json.JSONEncodeError) as e:
            logger.error(f"Redis set error for resource {resource_id}: {e}")
            
    async def delete_resource(self, resource_id: int):
        """Delete resource from Redis"""
        if not self.enabled or not self.client:
            return
            
        try:
            key = f"resource:{resource_id}"
            await self.client.delete(key)
            
        except RedisError as e:
            logger.error(f"Redis delete error for resource {resource_id}: {e}")
            
    async def increment_hits(self, resource_id: int):
        """Increment resource hit counter"""
        if not self.enabled or not self.client:
            return
            
        try:
            key = f"resource_hits:{resource_id}"
            await self.client.incr(key)
            
        except RedisError as e:
            logger.error(f"Redis incr error for resource {resource_id}: {e}")
            
    async def get_hits(self, resource_id: int) -> int:
        """Get resource hit count"""
        if not self.enabled or not self.client:
            return 0
            
        try:
            key = f"resource_hits:{resource_id}"
            hits = await self.client.get(key)
            return int(hits) if hits else 0
            
        except (RedisError, ValueError) as e:
            logger.error(f"Redis get hits error for resource {resource_id}: {e}")
            return 0
            
    async def acquire_lock(self, resource_id: int, timeout: int = 10) -> bool:
        """Acquire a lock to prevent duplicate fetches"""
        if not self.enabled or not self.client:
            return True  # If Redis is disabled, always allow
            
        try:
            key = f"resource:{resource_id}:lock"
            # Use SET NX (set if not exists) with expiration
            result = await self.client.set(key, "1", nx=True, ex=timeout)
            return bool(result)
            
        except RedisError as e:
            logger.error(f"Redis lock error for resource {resource_id}: {e}")
            return True  # Allow operation on error
            
    async def release_lock(self, resource_id: int):
        """Release resource lock"""
        if not self.enabled or not self.client:
            return
            
        try:
            key = f"resource:{resource_id}:lock"
            await self.client.delete(key)
            
        except RedisError as e:
            logger.error(f"Redis unlock error for resource {resource_id}: {e}")
            
    async def get_cache_status(self) -> Dict[str, Any]:
        """Get Redis cache statistics"""
        status = {
            'enabled': self.enabled,
            'connected': False,
            'keys': 0,
            'memory_used': 0,
            'hits': 0,
            'misses': 0
        }
        
        if not self.enabled or not self.client:
            return status
            
        try:
            # Check connection
            await self.client.ping()
            status['connected'] = True
            
            # Get info
            info = await self.client.info()
            status['memory_used'] = info.get('used_memory', 0)
            
            # Count keys
            status['keys'] = await self.client.dbsize()
            
            # Get hit/miss stats if available
            stats = await self.client.info('stats')
            status['hits'] = stats.get('keyspace_hits', 0)
            status['misses'] = stats.get('keyspace_misses', 0)
            
        except RedisError as e:
            logger.error(f"Redis status error: {e}")
            
        return status
        
    async def increment_metric(self, metric: str, value: int = 1):
        """Increment a global metric counter"""
        if not self.enabled or not self.client:
            return
            
        try:
            key = f"cache_status:{metric}"
            await self.client.incrby(key, value)
            
        except RedisError as e:
            logger.error(f"Redis metric increment error: {e}")
            
    async def get_metric(self, metric: str) -> int:
        """Get a global metric value"""
        if not self.enabled or not self.client:
            return 0
            
        try:
            key = f"cache_status:{metric}"
            value = await self.client.get(key)
            return int(value) if value else 0
            
        except (RedisError, ValueError) as e:
            logger.error(f"Redis metric get error: {e}")
            return 0


# Global Redis cache instance
redis_cache = RedisCache()