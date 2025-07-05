# Scripts Directory

This directory contains utility scripts for the ResourceBuddy project.

## Cache Scripts (`/cache`)

Scripts related to the caching system:

- **cache_eviction_scheduler.py** - Manages cache eviction policies and schedules cleanup
- **cache_schema_parser.py** - Parses and manages the cache database schema
- **cache_schema.sql** - SQL schema definition for the cache database
- **migrate_cache_schema.py** - Handles cache database schema migrations
- **resourcespace_cache.py** - Main caching logic for ResourceSpace API responses
- **resourcespace_wrapper.py** - Wrapper for ResourceSpace API with caching support

These scripts are used by the cache API service to optimize performance by caching ResourceSpace API responses and managing cache lifecycle.