#!/usr/bin/env python3
"""
ResourceSpace Integration Wrapper with SQLite Caching
Provides a high-level interface for accessing ResourceSpace resources
with automatic caching of metadata and files
"""

import os
import json
import requests
from typing import Optional, Dict, List, Any
from pathlib import Path
from datetime import timedelta
import logging

from resourcespace_cache import ResourceSpaceCache

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ResourceSpaceWrapper:
    """High-level wrapper for ResourceSpace with caching"""
    
    def __init__(self, 
                 api_url: str,
                 api_key: str,
                 cache_dir: str = "cache",
                 cache_ttl_days: int = 7):
        """
        Initialize the wrapper
        
        Args:
            api_url: ResourceSpace API URL
            api_key: ResourceSpace API key
            cache_dir: Directory for cached files
            cache_ttl_days: Default cache TTL in days
        """
        self.api_url = api_url
        self.api_key = api_key
        self.cache = ResourceSpaceCache(
            cache_dir=cache_dir,
            default_ttl_days=cache_ttl_days,
            rs_api_url=api_url,
            rs_api_key=api_key
        )
        
    def _make_api_call(self, function: str, params: Dict[str, Any] = None) -> Any:
        """Make a ResourceSpace API call"""
        if params is None:
            params = {}
            
        params['function'] = function
        params['key'] = self.api_key
        
        try:
            response = requests.get(self.api_url, params=params, timeout=30)
            response.raise_for_status()
            
            # Try to parse as JSON, otherwise return text
            try:
                return response.json()
            except json.JSONDecodeError:
                return response.text
                
        except Exception as e:
            logger.error(f"API call failed: {e}")
            raise
            
    def get_resource(self, resource_id: int, fetch_file: bool = False) -> Optional[Dict[str, Any]]:
        """
        Get resource with caching
        
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
                    
            return cached
            
        # Not in cache, fetch from API
        logger.info(f"Fetching resource {resource_id} from API")
        
        # Get resource metadata
        resource_data = self._make_api_call('get_resource_data', {'param1': resource_id})
        
        if not resource_data or isinstance(resource_data, str):
            logger.error(f"Failed to get resource data for {resource_id}")
            return None
            
        # Get resource field data
        field_data = self._make_api_call('get_resource_field_data', {'param1': resource_id})
        
        # Merge field data into resource data
        if isinstance(field_data, list):
            for field in field_data:
                field_name = f"field{field.get('ref', '')}"
                resource_data[field_name] = field.get('value', '')
                
        # Get preview sizes
        sizes = self._make_api_call('get_resource_path', {
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
            
        # Store in cache
        self.cache.store_resource(resource_data)
        
        # Fetch file if requested
        if fetch_file:
            file_path = self.cache.fetch_and_cache_file(
                resource_id, 
                file_extension=resource_data.get('file_extension')
            )
            if file_path:
                resource_data['cached_file'] = {'file_path': file_path}
                
        return resource_data
        
    def search_resources(self, search: str, 
                        resource_types: Optional[List[int]] = None,
                        limit: int = 100) -> List[Dict[str, Any]]:
        """
        Search resources with caching
        
        Args:
            search: Search query
            resource_types: Optional list of resource type IDs
            limit: Maximum results
            
        Returns:
            List of resource data
        """
        # First check cached resources
        keywords = search.lower().split() if search else []
        cached_results = self.cache.search_cached_resources(
            keywords=keywords,
            limit=limit
        )
        
        if cached_results:
            logger.info(f"Found {len(cached_results)} cached results for '{search}'")
            # Enrich with full data
            results = []
            for res in cached_results:
                full_res = self.get_resource(res['resource_id'])
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
            
        search_results = self._make_api_call('do_search', params)
        
        if not isinstance(search_results, list):
            return []
            
        # Cache the results
        results = []
        for res in search_results[:limit]:
            if isinstance(res, dict) and 'ref' in res:
                # Get full resource data
                full_res = self.get_resource(res['ref'])
                if full_res:
                    results.append(full_res)
                    
        return results
        
    def resource_view(self, resource_id: int, include_file: bool = True) -> Dict[str, Any]:
        """
        Get complete resource view data
        
        Args:
            resource_id: Resource ID
            include_file: Whether to include the original file
            
        Returns:
            Complete resource data for display
        """
        resource = self.get_resource(resource_id, fetch_file=include_file)
        
        if not resource:
            return {'error': f'Resource {resource_id} not found'}
            
        # Format for display
        view_data = {
            'id': resource_id,
            'title': resource.get('field8', 'Untitled'),
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
        """
        Clean up expired cache entries
        
        Args:
            force: Remove all cache entries if True
            
        Returns:
            Cleanup statistics
        """
        return self.cache.evict_stale_entries(force=force)
        
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return self.cache.get_cache_stats()
        
    def prefetch_resources(self, resource_ids: List[int], include_files: bool = False):
        """
        Prefetch multiple resources into cache
        
        Args:
            resource_ids: List of resource IDs to prefetch
            include_files: Whether to also fetch original files
        """
        logger.info(f"Prefetching {len(resource_ids)} resources...")
        
        for resource_id in resource_ids:
            try:
                self.get_resource(resource_id, fetch_file=include_files)
            except Exception as e:
                logger.error(f"Failed to prefetch resource {resource_id}: {e}")
                

def main():
    """Example usage"""
    # Initialize wrapper with your RS credentials
    wrapper = ResourceSpaceWrapper(
        api_url="http://resourcespace.local/api/",
        api_key="your_api_key_here",
        cache_dir="cache",
        cache_ttl_days=7
    )
    
    # Example: Get a resource with file
    resource = wrapper.resource_view(123, include_file=True)
    print(f"Resource: {resource['title']}")
    if resource.get('file'):
        print(f"Cached file: {resource['file']['path']}")
        
    # Example: Search resources
    results = wrapper.search_resources("landscape", limit=10)
    print(f"Found {len(results)} results")
    
    # Example: Get cache stats
    stats = wrapper.get_cache_stats()
    print(f"Cache stats: {json.dumps(stats, indent=2)}")
    
    # Example: Clean up old cache entries
    cleanup_stats = wrapper.cleanup_cache()
    print(f"Cleanup stats: {cleanup_stats}")
    

if __name__ == "__main__":
    main()