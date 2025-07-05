#!/usr/bin/env python3
"""
Cache Eviction Scheduler
Automatically cleans up expired cache entries on a schedule
Can be run as a cron job or background service
"""

import argparse
import logging
import json
from datetime import datetime, timedelta
from pathlib import Path
from resourcespace_cache import ResourceSpaceCache

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class CacheEvictionScheduler:
    """Manages scheduled cache eviction"""
    
    def __init__(self, cache_db_path: str = "cache.db", 
                 cache_dir: str = "cache",
                 max_cache_size_gb: float = 10.0,
                 min_free_space_gb: float = 5.0):
        """
        Initialize the scheduler
        
        Args:
            cache_db_path: Path to cache database
            cache_dir: Cache directory path
            max_cache_size_gb: Maximum cache size in GB
            min_free_space_gb: Minimum free disk space in GB
        """
        self.cache = ResourceSpaceCache(cache_db_path=cache_db_path, cache_dir=cache_dir)
        self.max_cache_size = max_cache_size_gb * 1024 * 1024 * 1024  # Convert to bytes
        self.min_free_space = min_free_space_gb * 1024 * 1024 * 1024
        self.cache_dir = Path(cache_dir)
        
    def check_disk_space(self) -> Dict[str, float]:
        """Check available disk space"""
        import shutil
        
        stat = shutil.disk_usage(self.cache_dir)
        return {
            'total_gb': stat.total / (1024**3),
            'used_gb': stat.used / (1024**3),
            'free_gb': stat.free / (1024**3),
            'free_bytes': stat.free
        }
        
    def run_eviction(self, force_if_low_space: bool = True) -> Dict[str, Any]:
        """
        Run cache eviction process
        
        Args:
            force_if_low_space: Force eviction if disk space is low
            
        Returns:
            Eviction statistics
        """
        logger.info("Starting cache eviction process...")
        
        # Get initial stats
        initial_stats = self.cache.get_cache_stats()
        disk_stats = self.check_disk_space()
        
        logger.info(f"Cache size: {initial_stats['cache_directory_size'] / (1024**3):.2f} GB")
        logger.info(f"Free disk space: {disk_stats['free_gb']:.2f} GB")
        
        # Check if we need to force eviction due to space constraints
        force_evict = False
        if force_if_low_space:
            if disk_stats['free_bytes'] < self.min_free_space:
                logger.warning(f"Low disk space! Free: {disk_stats['free_gb']:.2f} GB < Minimum: {self.min_free_space / (1024**3):.2f} GB")
                force_evict = True
                
            if initial_stats['cache_directory_size'] > self.max_cache_size:
                logger.warning(f"Cache size exceeded! Size: {initial_stats['cache_directory_size'] / (1024**3):.2f} GB > Maximum: {self.max_cache_size / (1024**3):.2f} GB")
                force_evict = True
                
        # Run standard eviction (expired entries)
        eviction_stats = self.cache.evict_stale_entries(force=False)
        
        # If still over limits, do aggressive eviction
        if force_evict:
            logger.info("Running aggressive eviction...")
            # Get least recently accessed resources
            with self.cache._get_connection() as conn:
                cursor = conn.execute("""
                    SELECT r.resource_id, cf.file_size
                    FROM cached_resources r
                    LEFT JOIN cached_files cf ON r.resource_id = cf.resource_id
                    ORDER BY r.last_accessed ASC
                    LIMIT 100
                """)
                
                old_resources = cursor.fetchall()
                
            # Remove old resources until we're under limits
            for resource in old_resources:
                if self.cache.get_cache_stats()['cache_directory_size'] < self.max_cache_size * 0.8:  # 80% threshold
                    break
                    
                # Remove specific resource
                with self.cache._get_connection() as conn:
                    conn.execute("DELETE FROM cached_resources WHERE resource_id = ?", 
                               (resource['resource_id'],))
                    
                logger.info(f"Evicted old resource {resource['resource_id']}")
                
        # Get final stats
        final_stats = self.cache.get_cache_stats()
        final_disk_stats = self.check_disk_space()
        
        results = {
            'timestamp': datetime.now().isoformat(),
            'eviction_stats': eviction_stats,
            'initial_cache_size_gb': initial_stats['cache_directory_size'] / (1024**3),
            'final_cache_size_gb': final_stats['cache_directory_size'] / (1024**3),
            'space_freed_gb': (initial_stats['cache_directory_size'] - final_stats['cache_directory_size']) / (1024**3),
            'initial_free_disk_gb': disk_stats['free_gb'],
            'final_free_disk_gb': final_disk_stats['free_gb'],
            'forced_eviction': force_evict
        }
        
        logger.info(f"Eviction complete. Space freed: {results['space_freed_gb']:.2f} GB")
        
        # Save results to log file
        log_file = Path('cache_eviction_log.json')
        if log_file.exists():
            with open(log_file, 'r') as f:
                logs = json.load(f)
        else:
            logs = []
            
        logs.append(results)
        
        # Keep only last 100 entries
        logs = logs[-100:]
        
        with open(log_file, 'w') as f:
            json.dump(logs, f, indent=2)
            
        return results
        
    def run_scheduled_maintenance(self):
        """Run full maintenance cycle"""
        logger.info("=== Starting scheduled cache maintenance ===")
        
        # 1. Run eviction
        eviction_results = self.run_eviction()
        
        # 2. Optimize database
        logger.info("Optimizing database...")
        with self.cache._get_connection() as conn:
            conn.execute("VACUUM")
            conn.execute("ANALYZE")
            
        # 3. Verify file integrity
        logger.info("Verifying file integrity...")
        integrity_issues = 0
        
        with self.cache._get_connection() as conn:
            cursor = conn.execute("SELECT resource_id, file_path FROM cached_files")
            files = cursor.fetchall()
            
            for file_info in files:
                file_path = Path(file_info['file_path'])
                if not file_path.exists():
                    logger.warning(f"Missing cached file: {file_path}")
                    conn.execute("DELETE FROM cached_files WHERE resource_id = ?",
                               (file_info['resource_id'],))
                    integrity_issues += 1
                    
        if integrity_issues > 0:
            logger.warning(f"Fixed {integrity_issues} file integrity issues")
            
        logger.info("=== Cache maintenance complete ===")
        return eviction_results


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='ResourceSpace Cache Eviction Scheduler')
    parser.add_argument('--cache-db', default='cache.db', help='Path to cache database')
    parser.add_argument('--cache-dir', default='cache', help='Cache directory path')
    parser.add_argument('--max-size', type=float, default=10.0, 
                       help='Maximum cache size in GB')
    parser.add_argument('--min-free', type=float, default=5.0,
                       help='Minimum free disk space in GB')
    parser.add_argument('--dry-run', action='store_true',
                       help='Show what would be done without doing it')
    
    args = parser.parse_args()
    
    if args.dry_run:
        logger.info("DRY RUN MODE - No changes will be made")
        cache = ResourceSpaceCache(cache_db_path=args.cache_db, cache_dir=args.cache_dir)
        stats = cache.get_cache_stats()
        print(json.dumps(stats, indent=2))
        return
        
    # Run maintenance
    scheduler = CacheEvictionScheduler(
        cache_db_path=args.cache_db,
        cache_dir=args.cache_dir,
        max_cache_size_gb=args.max_size,
        min_free_space_gb=args.min_free
    )
    
    results = scheduler.run_scheduled_maintenance()
    print(json.dumps(results, indent=2))
    

if __name__ == "__main__":
    main()