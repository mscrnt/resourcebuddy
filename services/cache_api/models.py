"""
Pydantic models for API requests and responses
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class ResourceResponse(BaseModel):
    """Resource metadata response"""
    resource_id: int = Field(..., description="Resource ID")
    title: Optional[str] = Field(None, description="Resource title")
    resource_type: Optional[int] = Field(None, description="Resource type ID")
    file_extension: Optional[str] = Field(None, description="File extension")
    file_size: Optional[int] = Field(None, description="File size in bytes")
    creation_date: Optional[datetime] = Field(None, description="Creation date")
    modified: Optional[datetime] = Field(None, description="Last modified date")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Metadata fields")
    keywords: List[str] = Field(default_factory=list, description="Keywords/tags")
    previews: Dict[str, Dict[str, Any]] = Field(default_factory=dict, description="Preview URLs and sizes")
    has_cached_file: bool = Field(False, description="Whether original file is cached")
    cached_file_path: Optional[str] = Field(None, description="Path to cached file")
    
    @classmethod
    def from_cache_data(cls, data: Dict[str, Any]) -> "ResourceResponse":
        """Create response from cache data"""
        # Extract metadata into dict
        metadata = {}
        for item in data.get('metadata', []):
            field_id = item.get('field_id')
            field_name = item.get('field_name')
            if not field_name and field_id:
                field_name = f"field_{field_id}"
            if field_name:  # Only add if we have a valid field name
                metadata[field_name] = item.get('value')
            
        # Extract keywords
        keywords = [kw['keyword'] for kw in data.get('keywords', [])]
        
        # Check for cached file
        cached_file = data.get('cached_file')
        has_cached_file = bool(cached_file)
        cached_file_path = cached_file.get('file_path') if cached_file else None
        
        return cls(
            resource_id=data.get('resource_id', data.get('ref')),
            title=data.get('title', data.get('field8')),
            resource_type=data.get('resource_type'),
            file_extension=data.get('file_extension'),
            file_size=data.get('file_size'),
            creation_date=data.get('creation_date'),
            modified=data.get('modified'),
            metadata=metadata,
            keywords=keywords,
            previews=data.get('previews', {}),
            has_cached_file=has_cached_file,
            cached_file_path=cached_file_path
        )


class SearchRequest(BaseModel):
    """Search request model"""
    query: str = Field(..., description="Search query")
    resource_types: Optional[List[int]] = Field(None, description="Filter by resource type IDs")
    limit: int = Field(100, ge=1, le=500, description="Maximum results")


class PrefetchRequest(BaseModel):
    """Prefetch request model"""
    resource_ids: List[int] = Field(..., description="Resource IDs to prefetch")
    include_files: bool = Field(False, description="Whether to fetch original files")


class CacheStats(BaseModel):
    """Cache statistics response"""
    total_resources: int = Field(..., description="Total cached resources")
    expired_resources: int = Field(..., description="Number of expired resources")
    cached_files: Dict[str, Any] = Field(..., description="Cached files statistics")
    cache_directory_size: int = Field(..., description="Total cache size in bytes")
    hit_rate: float = Field(..., description="Cache hit rate (0-1)")
    total_hits: int = Field(..., description="Total cache hits")
    total_misses: int = Field(..., description="Total cache misses")
    most_accessed: List[Dict[str, Any]] = Field(..., description="Most accessed resources")