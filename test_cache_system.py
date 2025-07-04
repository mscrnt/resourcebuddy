#!/usr/bin/env python3
"""
Test script for ResourceSpace cache system
Demonstrates all major functionality
"""

import json
import time
from pathlib import Path
from resourcespace_cache import ResourceSpaceCache
from resourcespace_wrapper import ResourceSpaceWrapper

def test_basic_caching():
    """Test basic cache operations"""
    print("=== Testing Basic Cache Operations ===")
    
    # Initialize cache
    cache = ResourceSpaceCache(cache_db_path="test_cache.db", cache_dir="test_cache")
    
    # Create sample resource data
    sample_resource = {
        'ref': 1001,
        'resource_type': 1,
        'field8': 'Test Image',
        'creation_date': '2024-01-01 10:00:00',
        'file_extension': 'jpg',
        'preview_extension': 'jpg',
        'file_size': 1024000,
        'field1': 'Test description',
        'field3': 'Test Creator',
        'keywords': ['test', 'sample', 'demo'],
        'sizes': {
            'thm': {'url': '/test/thumb.jpg', 'width': 150, 'height': 150},
            'pre': {'url': '/test/preview.jpg', 'width': 700, 'height': 700}
        }
    }
    
    # Store resource
    print("Storing resource...")
    cache.store_resource(sample_resource)
    
    # Retrieve resource
    print("Retrieving resource...")
    cached = cache.get_cached_resource(1001)
    
    if cached:
        print(f"✓ Resource retrieved: {cached['title']}")
        print(f"  - Metadata fields: {len(cached['metadata'])}")
        print(f"  - Keywords: {len(cached['keywords'])}")
        print(f"  - Previews: {list(cached['previews'].keys())}")
    else:
        print("✗ Failed to retrieve resource")
        
    # Test file caching
    print("\nTesting file cache...")
    
    # Create a dummy file to simulate download
    dummy_file = cache.originals_dir / "1001.jpg"
    dummy_file.parent.mkdir(parents=True, exist_ok=True)
    dummy_file.write_bytes(b"dummy image data")
    
    # Manually register the file in cache
    from datetime import datetime, timedelta
    expires_at = datetime.now() + timedelta(days=7)
    
    with cache._get_connection() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO cached_files (
                resource_id, file_path, file_size, file_hash,
                last_fetched, expires_at
            ) VALUES (?, ?, ?, ?, datetime('now'), ?)
        """, (1001, str(dummy_file), 16, 'dummy_hash', expires_at))
    
    # Now test retrieval
    cached_path = cache.get_cached_file_path(1001)
    
    if cached_path:
        print(f"✓ File cached at: {cached_path}")
        
        # Verify file exists
        if cache.is_cached_file_valid(1001):
            print("✓ Cached file is valid")
        else:
            print("✗ Cached file validation failed")
    else:
        print("✗ File caching failed")
    
    return cache

def test_search_and_stats(cache):
    """Test search and statistics"""
    print("\n=== Testing Search and Statistics ===")
    
    # Add more test resources
    for i in range(1002, 1006):
        cache.store_resource({
            'ref': i,
            'resource_type': 1,
            'field8': f'Test Image {i}',
            'keywords': ['test', f'image{i}']
        })
    
    # Search cached resources
    print("Searching for 'test' keyword...")
    results = cache.search_cached_resources(keywords=['test'])
    print(f"✓ Found {len(results)} resources")
    
    # Get statistics
    print("\nCache Statistics:")
    stats = cache.get_cache_stats()
    print(f"  - Total resources: {stats['total_resources']}")
    print(f"  - Expired resources: {stats['expired_resources']}")
    print(f"  - Cached files: {stats['cached_files']['count']}")
    print(f"  - Cache directory size: {stats['cache_directory_size'] / 1024:.2f} KB")

def test_eviction(cache):
    """Test cache eviction"""
    print("\n=== Testing Cache Eviction ===")
    
    # Get initial count
    stats_before = cache.get_cache_stats()
    
    # Force eviction
    print("Running eviction...")
    eviction_stats = cache.evict_stale_entries(force=True)
    
    print(f"✓ Eviction complete:")
    print(f"  - Metadata entries removed: {eviction_stats['metadata_entries_removed']}")
    print(f"  - Files removed: {eviction_stats['files_removed']}")
    print(f"  - Bytes freed: {eviction_stats['bytes_freed']:,}")
    
    # Verify cleanup
    stats_after = cache.get_cache_stats()
    print(f"  - Resources before: {stats_before['total_resources']}")
    print(f"  - Resources after: {stats_after['total_resources']}")

def test_wrapper_integration():
    """Test high-level wrapper"""
    print("\n=== Testing Wrapper Integration ===")
    
    # Note: This would require actual RS API credentials
    print("Wrapper integration test would require:")
    print("  - Valid ResourceSpace API URL")
    print("  - Valid API key")
    print("  - Network access to RS instance")
    print("\nExample usage:")
    print("""
    wrapper = ResourceSpaceWrapper(
        api_url="http://resourcespace.local/api/",
        api_key="your_api_key"
    )
    
    # Get resource with file
    resource = wrapper.resource_view(123, include_file=True)
    
    # Search resources
    results = wrapper.search_resources("landscape")
    """)

def cleanup_test_data():
    """Clean up test files"""
    print("\n=== Cleaning up test data ===")
    
    # Remove test database
    test_db = Path("test_cache.db")
    if test_db.exists():
        test_db.unlink()
        print("✓ Removed test database")
    
    # Remove test cache directory
    test_cache_dir = Path("test_cache")
    if test_cache_dir.exists():
        import shutil
        shutil.rmtree(test_cache_dir)
        print("✓ Removed test cache directory")

def main():
    """Run all tests"""
    print("ResourceSpace Cache System Test Suite")
    print("=" * 50)
    
    try:
        # Run tests
        cache = test_basic_caching()
        test_search_and_stats(cache)
        test_eviction(cache)
        test_wrapper_integration()
        
        print("\n✓ All tests completed successfully!")
        
    except Exception as e:
        print(f"\n✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        cleanup_test_data()

if __name__ == "__main__":
    main()