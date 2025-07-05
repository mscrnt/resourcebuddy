# ResourceSpace SQLite Cache System Documentation

## Overview

This caching system provides a local SQLite-based cache for ResourceSpace metadata and original resource files. It's designed to improve performance, reduce API calls, and enable offline access to frequently used resources.

## Architecture

### Components

1. **SQLite Database (`cache.db`)**: Stores metadata, keywords, preview info, and file references
2. **File Cache (`cache/originals/`)**: Stores cached original resource files
3. **Python Modules**:
   - `resourcespace_cache.py`: Core caching logic and data access layer
   - `resourcespace_wrapper.py`: High-level integration wrapper
   - `cache_eviction_scheduler.py`: Automated cache cleanup
   - `cache_schema_parser.py`: Schema analysis and generation

### Database Schema

#### Core Tables

1. **cached_resources**: Main resource metadata
   - `resource_id` (PRIMARY KEY)
   - `title`, `resource_type`, `file_extension`
   - `creation_date`, `modified`, `last_accessed`
   - `file_size`, `disk_usage`
   - `cache_expires_at`

2. **cached_metadata**: Dynamic field-value pairs
   - `resource_id`, `field_id`
   - `field_name`, `field_type`, `value`
   - `last_updated`

3. **cached_keywords**: Resource keywords/tags
   - `resource_id`, `keyword`
   - `field_id`, `position`

4. **cached_files**: Original file cache tracking
   - `resource_id` (PRIMARY KEY)
   - `file_path`, `file_size`, `file_hash`
   - `last_fetched`, `expires_at`

5. **cache_status**: Cache validity tracking
   - `resource_id`, `last_fetched`
   - `expires_at`, `is_complete`

## Usage Guide

### Basic Setup

```python
from resourcespace_wrapper import ResourceSpaceWrapper

# Initialize wrapper
wrapper = ResourceSpaceWrapper(
    api_url="http://resourcespace.local/api/",
    api_key="your_api_key",
    cache_dir="cache",
    cache_ttl_days=7
)
```

### Getting Resources

```python
# Get resource with metadata only
resource = wrapper.get_resource(123)

# Get resource with original file
resource = wrapper.get_resource(123, fetch_file=True)

# Get complete view data
view_data = wrapper.resource_view(123, include_file=True)
```

### Searching Resources

```python
# Search with automatic caching
results = wrapper.search_resources("landscape mountains", limit=50)

# Search specific resource types
results = wrapper.search_resources("photos", resource_types=[1, 2])
```

### Cache Management

```python
# Get cache statistics
stats = wrapper.get_cache_stats()
print(f"Cached resources: {stats['total_resources']}")
print(f"Cache size: {stats['cache_directory_size'] / (1024**3):.2f} GB")

# Clean up expired entries
cleanup_stats = wrapper.cleanup_cache()

# Force clean all cache
cleanup_stats = wrapper.cleanup_cache(force=True)
```

### Prefetching Resources

```python
# Prefetch multiple resources
resource_ids = [123, 124, 125, 126]
wrapper.prefetch_resources(resource_ids, include_files=True)
```

## Cache Expiration Policy

### Default TTL
- Metadata: 7 days (configurable)
- Files: 7 days (configurable)
- Resources are marked expired but not immediately deleted

### Expiration Triggers
1. **Time-based**: Resources expire after TTL
2. **Space-based**: When cache exceeds size limits
3. **Manual**: Via cleanup commands

### LRU Eviction
- Tracks `last_accessed` timestamp
- Evicts least recently used items first
- Triggered when disk space is low

## Scheduled Maintenance

### Setting up Cron Job

```bash
# Add to crontab for daily cleanup at 2 AM
0 2 * * * /usr/bin/python3 /path/to/cache_eviction_scheduler.py

# With custom settings
0 2 * * * /usr/bin/python3 /path/to/cache_eviction_scheduler.py --max-size 20 --min-free 10
```

### Manual Maintenance

```bash
# Run maintenance
python3 cache_eviction_scheduler.py

# Dry run to see what would be cleaned
python3 cache_eviction_scheduler.py --dry-run
```

## API Reference

### ResourceSpaceCache Methods

#### Core Methods
- `get_cached_resource(resource_id)`: Get cached resource data
- `store_resource(resource_data, ttl_override)`: Store resource in cache
- `fetch_and_cache_file(resource_id, file_url, file_extension)`: Cache original file
- `is_cached_file_valid(resource_id)`: Check if cached file is valid

#### Management Methods
- `evict_stale_entries(force)`: Remove expired entries
- `evict_cached_files(force)`: Remove expired files
- `get_cache_stats()`: Get cache statistics

#### Search Methods
- `search_cached_resources(resource_type, keywords, limit)`: Search cache

### ResourceSpaceWrapper Methods

- `get_resource(resource_id, fetch_file)`: Get resource with caching
- `search_resources(search, resource_types, limit)`: Search with caching
- `resource_view(resource_id, include_file)`: Get display-ready data
- `cleanup_cache(force)`: Clean cache
- `prefetch_resources(resource_ids, include_files)`: Bulk prefetch

## Performance Considerations

### Cache Hit Rates
- Monitor `get_cache_stats()` for hit/miss ratios
- Adjust TTL based on usage patterns
- Consider prefetching frequently accessed resources

### Disk Space Management
- Set appropriate `max_cache_size_gb`
- Monitor `min_free_space_gb`
- Schedule regular eviction runs

### Database Optimization
- SQLite VACUUM runs during maintenance
- Indexes on commonly queried fields
- Foreign key constraints for integrity

## Future Extensions

### Planned Features
1. **Redis Support**: For distributed caching
2. **Compression**: Compress cached files
3. **Partial File Caching**: Cache only needed parts
4. **Smart Prefetching**: ML-based prediction
5. **Multi-tier Storage**: Hot/cold storage tiers

### Extension Points
- Abstract cache backend interface
- Plugin system for custom eviction policies
- Webhook support for cache invalidation
- API for cache warming

## Troubleshooting

### Common Issues

1. **Cache Misses**
   - Check if resource exists: `SELECT * FROM cached_resources WHERE resource_id = ?`
   - Verify not expired: `SELECT * FROM cache_status WHERE resource_id = ?`
   - Check file exists: `ls cache/originals/`

2. **Disk Space Issues**
   - Run eviction: `python3 cache_eviction_scheduler.py`
   - Check stats: `df -h cache/`
   - Reduce TTL or max size

3. **Database Locks**
   - Ensure single writer
   - Check for hung processes
   - Consider WAL mode

### Debug Mode

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Security Considerations

1. **File Permissions**: Ensure cache directory has appropriate permissions
2. **API Keys**: Store securely, not in cache
3. **File Validation**: Verify file hashes on retrieval
4. **Access Control**: Implement at application layer

## Migration Guide

### From Direct API Access

```python
# Before
resource = api_call('get_resource_data', {'param1': 123})

# After
resource = wrapper.get_resource(123)
```

### Database Schema Updates

```bash
# Run migration script
python3 migrate_cache_schema.py
```

## Contributing

When extending the cache system:
1. Update schema in `cache_schema.sql`
2. Add migration in `migrate_cache_schema.py`
3. Update data access methods
4. Add tests
5. Update documentation

## License

This caching system is part of the ResourceSpace integration project.