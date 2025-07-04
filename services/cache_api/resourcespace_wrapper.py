#!/usr/bin/env python3
"""
ResourceSpace Integration Wrapper with SQLite Caching
Async version for FastAPI
"""

import os
import json
import httpx
import hashlib
from typing import Optional, Dict, List, Any
from pathlib import Path
from datetime import timedelta
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlencode

from resourcespace_cache import ResourceSpaceCache

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Thread pool for blocking operations
thread_pool = ThreadPoolExecutor(max_workers=4)


class ResourceSpaceWrapper:
    """High-level wrapper for ResourceSpace with caching"""
    
    def __init__(self, 
                 api_url: str,
                 api_key: str,
                 cache_dir: str = "cache",
                 cache_ttl_days: int = 7,
                 rs_user: str = "admin"):
        """
        Initialize the wrapper
        
        Args:
            api_url: ResourceSpace API URL
            api_key: ResourceSpace API key
            cache_dir: Directory for cached files
            cache_ttl_days: Default cache TTL in days
            rs_user: ResourceSpace username
        """
        self.api_url = api_url
        self.api_key = api_key
        self.rs_user = rs_user
        self.cache = ResourceSpaceCache(
            cache_dir=cache_dir,
            default_ttl_days=cache_ttl_days,
            rs_api_url=api_url,
            rs_api_key=api_key
        )
        self.client = httpx.AsyncClient(timeout=30.0)
        
    async def _make_api_call(self, function: str, params: Dict[str, Any] = None) -> Any:
        """Make an async ResourceSpace API call with proper authentication"""
        if params is None:
            params = {}
            
        # Build ordered parameters - order matters for signature!
        ordered_params = [
            ('user', self.rs_user),
            ('function', function)
        ]
        
        # Add numbered params (param1, param2, etc) in sorted order
        for key in sorted(params.keys()):
            if params[key] is not None:
                ordered_params.append((key, str(params[key])))
                
        # Create query string
        query_string = urlencode(ordered_params)
        
        # Generate signature
        sign_string = self.api_key + query_string
        signature = hashlib.sha256(sign_string.encode()).hexdigest()
        
        # Build final URL
        url = f"{self.api_url}?{query_string}&sign={signature}"
        
        # Log API call details
        logger.info(f"RS API Call: {function}")
        logger.info(f"URL: {self.api_url}")
        logger.info(f"Query params: {ordered_params}")
        
        try:
            # Use GET request with signed URL
            response = await self.client.get(url)
            logger.info(f"Response status: {response.status_code}")
            response.raise_for_status()
            
            # Try to parse as JSON, otherwise return text
            try:
                json_data = response.json()
                logger.info(f"Response (JSON): {json.dumps(json_data, indent=2)[:500]}...")
                return json_data
            except json.JSONDecodeError:
                text_data = response.text
                logger.info(f"Response (Text): {text_data[:500]}...")
                return text_data
                
        except Exception as e:
            logger.error(f"API call failed: {e}")
            logger.error(f"Full error: {type(e).__name__}: {str(e)}")
            raise
            
    def get_resource(self, resource_id: int, fetch_file: bool = False) -> Optional[Dict[str, Any]]:
        """
        Get resource with caching (sync wrapper for compatibility)
        
        Args:
            resource_id: Resource ID
            fetch_file: Whether to also fetch and cache the original file
            
        Returns:
            Resource data with metadata, previews, and optional file path
        """
        # First check cache
        cached = self.cache.get_cached_resource(resource_id)
        if cached:
            logger.info(f"Resource {resource_id} loaded from cache")
            
            # Check if we need to fetch the file
            if fetch_file and not cached.get('cached_file'):
                file_path = self.cache.fetch_and_cache_file(resource_id)
                if file_path:
                    cached['cached_file'] = {'file_path': file_path}
            
            # Mark as from cache
            cached['_from_cache'] = True
            return cached
            
        # Not in cache, fetch from API using sync method
        logger.info(f"Resource {resource_id} not in cache, fetching from API")
        return None  # Let async method handle API fetch
        
    async def get_resource_async(self, resource_id: int, fetch_file: bool = False) -> Optional[Dict[str, Any]]:
        """
        Get resource with caching (async version)
        """
        # First try sync cache check
        loop = asyncio.get_event_loop()
        cached = await loop.run_in_executor(thread_pool, self.get_resource, resource_id, fetch_file)
        
        if cached:
            return cached
            
        # Fetch from API
        logger.info(f"Fetching resource {resource_id} from API")
        
        # Get resource metadata
        resource_data = await self._make_api_call('get_resource_data', {'param1': resource_id})
        
        # Check for API errors
        if isinstance(resource_data, dict) and resource_data.get('success') == False:
            error_msg = resource_data.get('error', 'Unknown error')
            logger.error(f"RS API returned error for resource {resource_id}: {error_msg}")
            return None
            
        if not resource_data or isinstance(resource_data, str):
            logger.error(f"Failed to get resource data for {resource_id}: Invalid response type")
            return None
            
        # If resource_data is a list with one item, extract it
        if isinstance(resource_data, list) and len(resource_data) == 1:
            resource_data = resource_data[0]
            
        logger.info(f"Successfully fetched resource {resource_id} from RS API")
            
        # Get resource field data
        field_data = await self._make_api_call('get_resource_field_data', {'param1': resource_id})
        
        # Merge field data into resource data
        if isinstance(field_data, list):
            logger.info(f"Merging {len(field_data)} fields into resource data")
            for field in field_data:
                field_name = f"field{field.get('ref', '')}"
                resource_data[field_name] = field.get('value', '')
        else:
            logger.warning(f"Field data response was not a list: {type(field_data)}")
                
        # Get preview sizes
        sizes = await self._make_api_call('get_resource_path', {
            'param1': resource_id,
            'param2': False,
            'param3': '',
            'param4': '',
            'param5': '',
            'param6': '',
            'param7': 'thm,pre,scr'
        })
        
        if isinstance(sizes, dict):
            resource_data['sizes'] = sizes
            
        # Store in cache (sync operation in thread pool)
        try:
            await loop.run_in_executor(thread_pool, self.cache.store_resource, resource_data)
            logger.info(f"Stored resource {resource_id} in cache")
        except Exception as e:
            logger.error(f"Failed to store resource {resource_id} in cache: {e}")
            
        # Fetch file if requested
        if fetch_file:
            logger.info(f"Attempting to fetch file for resource {resource_id}")
            file_path = await loop.run_in_executor(
                thread_pool,
                self.cache.fetch_and_cache_file,
                resource_id,
                None,
                resource_data.get('file_extension')
            )
            if file_path:
                resource_data['cached_file'] = {'file_path': file_path}
                logger.info(f"Successfully cached file at: {file_path}")
            else:
                logger.warning(f"Failed to cache file for resource {resource_id}")
                
        # Mark as not from cache (freshly fetched)
        resource_data['_from_cache'] = False
        return resource_data
        
    def search_resources(self, search: str, 
                        resource_types: Optional[List[int]] = None,
                        limit: int = 100) -> List[Dict[str, Any]]:
        """
        Search resources with caching (sync for compatibility)
        """
        # First check cached resources
        keywords = search.lower().split() if search else []
        cached_results = self.cache.search_cached_resources(
            keywords=keywords,
            limit=limit
        )
        
        if cached_results:
            logger.info(f"Found {len(cached_results)} cached results for '{search}'")
            # Return basic results, let async method enrich if needed
            return cached_results
            
        return []  # Let async method handle API search
        
    async def search_resources_async(self, search: str,
                                   resource_types: Optional[List[int]] = None,
                                   limit: int = 100) -> List[Dict[str, Any]]:
        """
        Search resources with caching (async version)
        """
        # First try sync cache search
        loop = asyncio.get_event_loop()
        cached_results = await loop.run_in_executor(
            thread_pool,
            self.search_resources,
            search,
            resource_types,
            limit
        )
        
        if cached_results:
            # Enrich with full data
            results = []
            for res in cached_results:
                full_res = await self.get_resource_async(res.get('resource_id', res.get('ref')))
                if full_res:
                    results.append(full_res)
            return results
            
        # Search via API
        params = {
            'param1': search,
            'param2': '',  # resource types string
            'param3': 'relevance',
            'param4': 0,  # archive
            'param5': limit
        }
        
        if resource_types:
            params['param2'] = ','.join(map(str, resource_types))
            
        search_results = await self._make_api_call('do_search', params)
        
        if not isinstance(search_results, list):
            return []
            
        # Cache the results
        results = []
        for res in search_results[:limit]:
            if isinstance(res, dict) and 'ref' in res:
                # Get full resource data
                full_res = await self.get_resource_async(res['ref'])
                if full_res:
                    results.append(full_res)
                    
        return results
        
    def resource_view(self, resource_id: int, include_file: bool = True) -> Dict[str, Any]:
        """Get complete resource view data (sync)"""
        resource = self.get_resource(resource_id, fetch_file=include_file)
        
        if not resource:
            return {'error': f'Resource {resource_id} not found'}
            
        # Format for display
        view_data = {
            'id': resource_id,
            'title': resource.get('field8', resource.get('title', 'Untitled')),
            'type': resource.get('resource_type'),
            'metadata': {},
            'previews': resource.get('previews', {}),
            'keywords': [kw['keyword'] for kw in resource.get('keywords', [])],
            'file': None
        }
        
        # Format metadata
        for item in resource.get('metadata', []):
            field_name = item.get('field_name', f"field_{item.get('field_id')}")
            view_data['metadata'][field_name] = item.get('value')
            
        # Add file info if available
        if resource.get('cached_file'):
            view_data['file'] = {
                'path': resource['cached_file']['file_path'],
                'size': resource['cached_file'].get('file_size'),
                'hash': resource['cached_file'].get('file_hash')
            }
            
        return view_data
        
    def cleanup_cache(self, force: bool = False) -> Dict[str, Any]:
        """Clean up expired cache entries"""
        return self.cache.evict_stale_entries(force=force)
        
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return self.cache.get_cache_stats()
        
    def prefetch_resources(self, resource_ids: List[int], include_files: bool = False):
        """Prefetch multiple resources into cache"""
        logger.info(f"Prefetching {len(resource_ids)} resources...")
        
        for resource_id in resource_ids:
            try:
                self.get_resource(resource_id, fetch_file=include_files)
            except Exception as e:
                logger.error(f"Failed to prefetch resource {resource_id}: {e}")
                
    async def close(self):
        """Close async client"""
        await self.client.aclose()