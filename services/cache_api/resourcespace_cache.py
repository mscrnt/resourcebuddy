#!/usr/bin/env python3
"""
ResourceSpace SQLite Cache Manager
Provides a caching layer for ResourceSpace metadata with automatic expiration
"""

import sqlite3
import json
import os
import hashlib
import shutil
import requests
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any, Tuple
from contextlib import contextmanager
import logging
from urllib.parse import urlencode

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ResourceSpaceCache:
    """SQLite cache manager for ResourceSpace metadata"""
    
    def __init__(self, cache_db_path: str = "cache.db", 
                 cache_dir: str = "cache", 
                 default_ttl_days: int = 7,
                 rs_api_url: Optional[str] = None,
                 rs_api_key: Optional[str] = None):
        """
        Initialize the cache manager
        
        Args:
            cache_db_path: Path to SQLite database file
            cache_dir: Directory for cached files
            default_ttl_days: Default time-to-live for cached entries in days
            rs_api_url: ResourceSpace API URL
            rs_api_key: ResourceSpace API key
        """
        self.cache_dir = Path(cache_dir)
        self.db_path = str(self.cache_dir / cache_db_path)
        self.originals_dir = self.cache_dir / "originals"
        self.default_ttl = timedelta(days=default_ttl_days)
        self.rs_api_url = rs_api_url
        self.rs_api_key = rs_api_key
        
        # Create cache directories
        self.originals_dir.mkdir(parents=True, exist_ok=True)
        
        self._init_database()
        
    @contextmanager
    def _get_connection(self):
        """Context manager for database connections"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
            
    def _init_database(self):
        """Initialize the database with schema"""
        schema_path = Path(__file__).parent / 'cache_schema.sql'
        if not schema_path.exists():
            # Try in current directory as fallback
            schema_path = Path('cache_schema.sql')
            
        if schema_path.exists():
            with open(schema_path, 'r') as f:
                schema = f.read()
            
            with self._get_connection() as conn:
                conn.executescript(schema)
                logger.info(f"Database initialized at {self.db_path}")
        else:
            raise FileNotFoundError(f"cache_schema.sql not found at {schema_path}")
            
    def get_cached_resource(self, resource_id: int) -> Optional[Dict[str, Any]]:
        """
        Get a cached resource by ID
        
        Args:
            resource_id: ResourceSpace resource ID
            
        Returns:
            Resource data dict or None if not cached/expired
        """
        with self._get_connection() as conn:
            # Check if resource exists and is not expired
            cursor = conn.execute("""
                SELECT r.*, cs.expires_at
                FROM cached_resources r
                JOIN cache_status cs ON r.resource_id = cs.resource_id
                WHERE r.resource_id = ?
                AND cs.expires_at > datetime('now')
            """, (resource_id,))
            
            row = cursor.fetchone()
            if not row:
                return None
                
            # Update last accessed time
            conn.execute("""
                UPDATE cached_resources 
                SET last_accessed = datetime('now')
                WHERE resource_id = ?
            """, (resource_id,))
            
            # Build resource dict
            resource = dict(row)
            
            # Get metadata
            metadata_cursor = conn.execute("""
                SELECT field_id, field_name, value, field_type
                FROM cached_metadata
                WHERE resource_id = ?
                ORDER BY field_id
            """, (resource_id,))
            
            resource['metadata'] = [dict(row) for row in metadata_cursor]
            
            # Get keywords
            keyword_cursor = conn.execute("""
                SELECT keyword, field_id, position
                FROM cached_keywords
                WHERE resource_id = ?
                ORDER BY position
            """, (resource_id,))
            
            resource['keywords'] = [dict(row) for row in keyword_cursor]
            
            # Get previews
            preview_cursor = conn.execute("""
                SELECT preview_type, preview_path, width, height
                FROM cached_previews
                WHERE resource_id = ?
            """, (resource_id,))
            
            resource['previews'] = {row['preview_type']: dict(row) for row in preview_cursor}
            
            # Get dimensions
            dim_cursor = conn.execute("""
                SELECT width, height, file_size, resolution, unit, page_count
                FROM cached_dimensions
                WHERE resource_id = ?
            """, (resource_id,))
            
            dim_row = dim_cursor.fetchone()
            if dim_row:
                resource['dimensions'] = dict(dim_row)
            
            # Get cached file info
            file_cursor = conn.execute("""
                SELECT file_path, file_size, file_hash, last_fetched, expires_at
                FROM cached_files
                WHERE resource_id = ?
                AND expires_at > datetime('now')
            """, (resource_id,))
            
            file_row = file_cursor.fetchone()
            if file_row and Path(file_row['file_path']).exists():
                resource['cached_file'] = dict(file_row)
            else:
                resource['cached_file'] = None
                
            return resource
            
    def store_resource(self, resource_data: Dict[str, Any], ttl_override: Optional[timedelta] = None):
        """
        Store resource data in cache
        
        Args:
            resource_data: Complete resource data from RS API
            ttl_override: Optional TTL override for this resource
        """
        resource_id = resource_data.get('ref')
        if not resource_id:
            raise ValueError("Resource data must contain 'ref' field")
            
        ttl = ttl_override or self.default_ttl
        expires_at = datetime.now() + ttl
        
        with self._get_connection() as conn:
            # Store main resource data
            conn.execute("""
                INSERT OR REPLACE INTO cached_resources (
                    resource_id, resource_type, title, creation_date,
                    file_extension, preview_extension, thumb_width, thumb_height,
                    file_size, disk_usage, archive, access, created_by,
                    modified, cache_expires_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                resource_id,
                resource_data.get('resource_type'),
                resource_data.get('field8', ''),  # title is often field8
                resource_data.get('creation_date'),
                resource_data.get('file_extension'),
                resource_data.get('preview_extension'),
                resource_data.get('thumb_width'),
                resource_data.get('thumb_height'),
                resource_data.get('file_size'),
                resource_data.get('disk_usage'),
                resource_data.get('archive', 0),
                resource_data.get('access', 0),
                resource_data.get('created_by'),
                resource_data.get('modified'),
                expires_at
            ))
            
            # Store cache status
            conn.execute("""
                INSERT OR REPLACE INTO cache_status (
                    resource_id, last_fetched, expires_at, is_complete
                ) VALUES (?, datetime('now'), ?, 1)
            """, (resource_id, expires_at))
            
            # Store metadata fields
            for field_key, value in resource_data.items():
                if field_key.startswith('field'):
                    try:
                        field_id = int(field_key.replace('field', ''))
                        conn.execute("""
                            INSERT OR REPLACE INTO cached_metadata (
                                resource_id, field_id, value
                            ) VALUES (?, ?, ?)
                        """, (resource_id, field_id, str(value)))
                    except ValueError:
                        pass
                        
            # Store keywords if provided
            if 'keywords' in resource_data:
                for keyword_data in resource_data['keywords']:
                    if isinstance(keyword_data, dict):
                        keyword = keyword_data.get('keyword', keyword_data.get('value', ''))
                    else:
                        keyword = str(keyword_data)
                        
                    conn.execute("""
                        INSERT INTO cached_keywords (
                            resource_id, keyword
                        ) VALUES (?, ?)
                    """, (resource_id, keyword))
                    
            # Store preview information if provided
            if 'sizes' in resource_data:
                for size_key, size_info in resource_data['sizes'].items():
                    if isinstance(size_info, dict):
                        conn.execute("""
                            INSERT OR REPLACE INTO cached_previews (
                                resource_id, preview_type, preview_path,
                                width, height, file_size
                            ) VALUES (?, ?, ?, ?, ?, ?)
                        """, (
                            resource_id,
                            size_key,
                            size_info.get('url', ''),
                            size_info.get('width'),
                            size_info.get('height'),
                            size_info.get('size')
                        ))
                        
            logger.info(f"Cached resource {resource_id} with TTL {ttl}")
            
    def update_metadata(self, resource_id: int, metadata: Dict[int, str]):
        """
        Update specific metadata fields for a resource
        
        Args:
            resource_id: Resource ID
            metadata: Dict of field_id -> value
        """
        with self._get_connection() as conn:
            for field_id, value in metadata.items():
                conn.execute("""
                    INSERT OR REPLACE INTO cached_metadata (
                        resource_id, field_id, value
                    ) VALUES (?, ?, ?)
                """, (resource_id, field_id, str(value)))
                
            logger.info(f"Updated {len(metadata)} metadata fields for resource {resource_id}")
    
    def _calculate_file_hash(self, file_path: Path, chunk_size: int = 8192) -> str:
        """Calculate SHA256 hash of a file"""
        sha256 = hashlib.sha256()
        with open(file_path, 'rb') as f:
            while chunk := f.read(chunk_size):
                sha256.update(chunk)
        return sha256.hexdigest()
    
    def is_cached_file_valid(self, resource_id: int) -> bool:
        """Check if cached file exists and is not expired"""
        with self._get_connection() as conn:
            cursor = conn.execute("""
                SELECT file_path, expires_at
                FROM cached_files
                WHERE resource_id = ?
                AND expires_at > datetime('now')
            """, (resource_id,))
            
            row = cursor.fetchone()
            if row and Path(row['file_path']).exists():
                return True
            return False
    
    def get_cached_file_path(self, resource_id: int) -> Optional[str]:
        """Get path to cached file if valid"""
        with self._get_connection() as conn:
            cursor = conn.execute("""
                SELECT file_path
                FROM cached_files
                WHERE resource_id = ?
                AND expires_at > datetime('now')
            """, (resource_id,))
            
            row = cursor.fetchone()
            if row and Path(row['file_path']).exists():
                return row['file_path']
            return None
    
    def fetch_and_cache_file(self, resource_id: int, 
                           file_url: Optional[str] = None,
                           file_extension: Optional[str] = None) -> Optional[str]:
        """
        Fetch and cache resource file
        
        Args:
            resource_id: Resource ID
            file_url: Direct URL to file (if available)
            file_extension: File extension
            
        Returns:
            Path to cached file or None if failed
        """
        # Check if valid cached file exists
        cached_path = self.get_cached_file_path(resource_id)
        if cached_path:
            logger.info(f"Using existing cached file for resource {resource_id}")
            return cached_path
        
        # Determine file extension
        if not file_extension:
            # Try to get from resource metadata
            with self._get_connection() as conn:
                cursor = conn.execute("""
                    SELECT file_extension FROM cached_resources
                    WHERE resource_id = ?
                """, (resource_id,))
                row = cursor.fetchone()
                if row:
                    file_extension = row['file_extension']
                    
        if not file_extension:
            file_extension = 'bin'  # default binary
            
        # Prepare local file path
        local_path = self.originals_dir / f"{resource_id}.{file_extension}"
        
        try:
            # If we have a direct URL, download from it
            if file_url:
                response = requests.get(file_url, stream=True, timeout=30)
                response.raise_for_status()
                
                # Download file in chunks
                with open(local_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                        
            else:
                # Use RS API to get file
                if not self.rs_api_url or not self.rs_api_key:
                    logger.error("RS API credentials not configured")
                    return None
                    
                # Build signed API request
                ordered_params = [
                    ('user', 'admin'),
                    ('function', 'get_resource_path'),
                    ('param1', str(resource_id)),
                    ('param2', ''),
                    ('param3', ''),  # empty size for original
                    ('param4', '0'), # don't generate
                    ('param5', file_extension),
                    ('param6', '1'),
                    ('param7', '0'),
                    ('param8', '-1')
                ]
                
                query_string = urlencode(ordered_params)
                signature = hashlib.sha256((self.rs_api_key + query_string).encode()).hexdigest()
                
                url = f"{self.rs_api_url}?{query_string}&sign={signature}"
                response = requests.get(url, timeout=30)
                response.raise_for_status()
                
                # The response might be JSON-encoded, so try to decode it
                file_url = response.text.strip()
                if file_url.startswith('"') and file_url.endswith('"'):
                    # It's a JSON string, decode it
                    file_url = json.loads(file_url)
                
                if not file_url or not file_url.startswith('http'):
                    logger.error(f"Invalid file URL returned for resource {resource_id}: {file_url}")
                    return None
                    
                logger.info(f"Downloading file from: {file_url[:100]}...")
                
                # Download the file
                file_response = requests.get(file_url, stream=True, timeout=30)
                file_response.raise_for_status()
                
                with open(local_path, 'wb') as f:
                    for chunk in file_response.iter_content(chunk_size=8192):
                        f.write(chunk)
            
            # Calculate file hash and size
            file_size = local_path.stat().st_size
            file_hash = self._calculate_file_hash(local_path)
            
            # Store in database with current TTL
            expires_at = datetime.now() + self.default_ttl
            
            with self._get_connection() as conn:
                conn.execute("""
                    INSERT OR REPLACE INTO cached_files (
                        resource_id, file_path, file_size, file_hash,
                        last_fetched, expires_at
                    ) VALUES (?, ?, ?, ?, datetime('now'), ?)
                """, (resource_id, str(local_path), file_size, file_hash, expires_at))
                
            logger.info(f"Cached file for resource {resource_id} at {local_path}")
            return str(local_path)
            
        except Exception as e:
            logger.error(f"Failed to cache file for resource {resource_id}: {e}")
            if local_path.exists():
                local_path.unlink()  # Clean up partial download
            return None
    
    def evict_cached_files(self, force: bool = False, max_cache_size_mb: Optional[int] = None) -> Tuple[int, int]:
        """
        Remove expired cached files
        
        Args:
            force: If True, remove all files regardless of expiry
            max_cache_size_mb: Maximum cache size in MB, if exceeded, remove oldest files
            
        Returns:
            Tuple of (files_removed, bytes_freed)
        """
        files_removed = 0
        bytes_freed = 0
        
        with self._get_connection() as conn:
            if force:
                cursor = conn.execute("SELECT resource_id, file_path, file_size FROM cached_files")
            else:
                cursor = conn.execute("""
                    SELECT resource_id, file_path, file_size 
                    FROM cached_files
                    WHERE expires_at < datetime('now')
                """)
                
            files_to_remove = cursor.fetchall()
            
            for row in files_to_remove:
                file_path = Path(row['file_path'])
                if file_path.exists():
                    try:
                        bytes_freed += file_path.stat().st_size
                        file_path.unlink()
                        files_removed += 1
                    except Exception as e:
                        logger.error(f"Failed to remove file {file_path}: {e}")
                        
                # Remove from database
                conn.execute("DELETE FROM cached_files WHERE resource_id = ?", 
                           (row['resource_id'],))
                           
            # Check if we need to remove more files due to size constraints
            if max_cache_size_mb:
                max_cache_bytes = max_cache_size_mb * 1024 * 1024
                
                # Get current cache size
                cursor = conn.execute("SELECT SUM(file_size) as total_size FROM cached_files")
                current_size = cursor.fetchone()['total_size'] or 0
                
                if current_size > max_cache_bytes:
                    # Remove oldest files until we're under the limit
                    cursor = conn.execute("""
                        SELECT resource_id, file_path, file_size 
                        FROM cached_files
                        ORDER BY last_fetched ASC
                    """)
                    
                    for row in cursor:
                        if current_size <= max_cache_bytes:
                            break
                            
                        file_path = Path(row['file_path'])
                        if file_path.exists():
                            try:
                                file_size = file_path.stat().st_size
                                file_path.unlink()
                                files_removed += 1
                                bytes_freed += file_size
                                current_size -= file_size
                                
                                # Remove from database
                                conn.execute("DELETE FROM cached_files WHERE resource_id = ?", 
                                           (row['resource_id'],))
                            except Exception as e:
                                logger.error(f"Failed to remove file {file_path}: {e}")
                           
        logger.info(f"Evicted {files_removed} cached files, freed {bytes_freed:,} bytes")
        return files_removed, bytes_freed
            
    def evict_stale_entries(self, force: bool = False) -> Dict[str, Any]:
        """
        Remove expired cache entries (metadata and files)
        
        Args:
            force: If True, remove all entries regardless of expiry
            
        Returns:
            Dict with eviction statistics
        """
        # First evict cached files
        files_removed, bytes_freed = self.evict_cached_files(force)
        
        # Then evict metadata
        with self._get_connection() as conn:
            if force:
                cursor = conn.execute("DELETE FROM cached_resources")
            else:
                cursor = conn.execute("""
                    DELETE FROM cached_resources
                    WHERE resource_id IN (
                        SELECT resource_id FROM cache_status
                        WHERE expires_at < datetime('now')
                    )
                """)
                
            metadata_removed = cursor.rowcount
            
        stats = {
            'metadata_entries_removed': metadata_removed,
            'files_removed': files_removed,
            'bytes_freed': bytes_freed
        }
        
        logger.info(f"Eviction complete: {stats}")
        return stats
            
    def search_cached_resources(self, 
                              resource_type: Optional[int] = None,
                              keywords: Optional[List[str]] = None,
                              limit: int = 100) -> List[Dict[str, Any]]:
        """
        Search cached resources
        
        Args:
            resource_type: Filter by resource type
            keywords: Filter by keywords
            limit: Maximum results to return
            
        Returns:
            List of matching resources
        """
        query = """
            SELECT DISTINCT r.*
            FROM cached_resources r
            JOIN cache_status cs ON r.resource_id = cs.resource_id
            WHERE cs.expires_at > datetime('now')
        """
        
        params = []
        
        if resource_type is not None:
            query += " AND r.resource_type = ?"
            params.append(resource_type)
            
        if keywords:
            query += """
                AND r.resource_id IN (
                    SELECT resource_id FROM cached_keywords
                    WHERE keyword IN ({})
                )
            """.format(','.join(['?'] * len(keywords)))
            params.extend(keywords)
            
        query += " ORDER BY r.last_accessed DESC LIMIT ?"
        params.append(limit)
        
        with self._get_connection() as conn:
            cursor = conn.execute(query, params)
            return [dict(row) for row in cursor]
            
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        with self._get_connection() as conn:
            stats = {}
            
            # Total cached resources
            cursor = conn.execute("SELECT COUNT(*) as count FROM cached_resources")
            stats['total_resources'] = cursor.fetchone()['count']
            
            # Expired resources
            cursor = conn.execute("""
                SELECT COUNT(*) as count FROM cache_status
                WHERE expires_at < datetime('now')
            """)
            stats['expired_resources'] = cursor.fetchone()['count']
            
            # Cached files statistics
            cursor = conn.execute("""
                SELECT 
                    COUNT(*) as count,
                    SUM(file_size) as total_size,
                    COUNT(CASE WHEN expires_at < datetime('now') THEN 1 END) as expired_count
                FROM cached_files
            """)
            file_stats = cursor.fetchone()
            stats['cached_files'] = {
                'count': file_stats['count'],
                'total_size': file_stats['total_size'] or 0,
                'expired_count': file_stats['expired_count'] or 0
            }
            
            # Cache size (metadata)
            cursor = conn.execute("""
                SELECT SUM(file_size) as total_size FROM cached_resources
            """)
            stats['metadata_size'] = cursor.fetchone()['total_size'] or 0
            
            # Most accessed resources
            cursor = conn.execute("""
                SELECT r.resource_id, r.title, r.last_accessed,
                       cf.file_path IS NOT NULL as has_cached_file
                FROM cached_resources r
                LEFT JOIN cached_files cf ON r.resource_id = cf.resource_id
                ORDER BY r.last_accessed DESC
                LIMIT 10
            """)
            stats['most_accessed'] = [dict(row) for row in cursor]
            
            # Calculate cache directory size
            cache_dir_size = 0
            if self.cache_dir.exists():
                for file in self.cache_dir.rglob('*'):
                    if file.is_file():
                        cache_dir_size += file.stat().st_size
            stats['cache_directory_size'] = cache_dir_size
            
            return stats
            
    def cache_resource_types(self, resource_types: List[Dict[str, Any]]):
        """Cache resource type definitions"""
        with self._get_connection() as conn:
            for rt in resource_types:
                conn.execute("""
                    INSERT OR REPLACE INTO cached_resource_types (
                        ref, name, allowed_extensions, config_options, icon
                    ) VALUES (?, ?, ?, ?, ?)
                """, (
                    rt.get('ref'),
                    rt.get('name'),
                    rt.get('allowed_extensions'),
                    json.dumps(rt.get('config_options', {})),
                    rt.get('icon')
                ))
                
    def cache_field_definitions(self, fields: List[Dict[str, Any]]):
        """Cache field definitions"""
        with self._get_connection() as conn:
            for field in fields:
                conn.execute("""
                    INSERT OR REPLACE INTO cached_field_definitions (
                        ref, name, title, type, global, required, order_by, tab
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    field.get('ref'),
                    field.get('name'),
                    field.get('title'),
                    field.get('type'),
                    field.get('global', 1),
                    field.get('required', 0),
                    field.get('order_by', 0),
                    field.get('tab')
                ))


def main():
    """Example usage and testing"""
    cache = ResourceSpaceCache()
    
    # Example: Store a resource
    sample_resource = {
        'ref': 12345,
        'resource_type': 1,
        'field8': 'Sample Image Title',
        'creation_date': '2024-01-15 10:30:00',
        'file_extension': 'jpg',
        'preview_extension': 'jpg',
        'thumb_width': 150,
        'thumb_height': 150,
        'file_size': 2048000,
        'field1': 'Description text',
        'field3': 'Creator Name',
        'keywords': ['landscape', 'nature', 'mountains'],
        'sizes': {
            'thm': {'url': '/path/to/thumb.jpg', 'width': 150, 'height': 150},
            'pre': {'url': '/path/to/preview.jpg', 'width': 700, 'height': 700}
        }
    }
    
    # Store the resource
    cache.store_resource(sample_resource)
    
    # Retrieve it
    cached = cache.get_cached_resource(12345)
    if cached:
        print(f"Retrieved cached resource: {cached['title']}")
        
    # Get stats
    stats = cache.get_cache_stats()
    print(f"\nCache Stats: {json.dumps(stats, indent=2)}")
    

if __name__ == "__main__":
    main()