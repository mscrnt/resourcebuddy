#!/usr/bin/env python3
"""
ResourceSpace Database Schema Parser and SQLite Cache Designer
Parses table_*.txt files from ResourceSpace dbstruct directory
and creates an optimized SQLite cache schema
"""

import os
import re
from typing import Dict, List, Tuple
from dataclasses import dataclass


@dataclass
class TableField:
    name: str
    data_type: str
    nullable: str
    key: str
    default: str
    extra: str


@dataclass
class Table:
    name: str
    fields: List[TableField]


class RSSchemaParser:
    """Parser for ResourceSpace database structure files"""
    
    def __init__(self, dbstruct_path: str):
        self.dbstruct_path = dbstruct_path
        self.tables: Dict[str, Table] = {}
        
    def parse_table_file(self, filepath: str) -> Table:
        """Parse a single table definition file"""
        table_name = os.path.basename(filepath).replace('table_', '').replace('.txt', '')
        fields = []
        
        with open(filepath, 'r') as f:
            for line in f:
                # Skip empty lines
                line = line.strip()
                if not line:
                    continue
                
                # Parse CSV format: field_name,type,nullable,key,default,extra
                parts = line.split(',')
                if len(parts) >= 2:
                    field = TableField(
                        name=parts[0],
                        data_type=parts[1] if len(parts) > 1 else '',
                        nullable=parts[2] if len(parts) > 2 else '',
                        key=parts[3] if len(parts) > 3 else '',
                        default=parts[4] if len(parts) > 4 else '',
                        extra=parts[5] if len(parts) > 5 else ''
                    )
                    fields.append(field)
        
        return Table(name=table_name, fields=fields)
    
    def load_all_tables(self):
        """Load all table definitions from dbstruct directory"""
        for filename in os.listdir(self.dbstruct_path):
            if filename.startswith('table_') and filename.endswith('.txt'):
                filepath = os.path.join(self.dbstruct_path, filename)
                table = self.parse_table_file(filepath)
                self.tables[table.name] = table
                
    def get_metadata_tables(self) -> Dict[str, Table]:
        """Identify and return tables relevant for metadata caching"""
        metadata_tables = [
            'resource',
            'resource_type', 
            'resource_type_field',
            'resource_node',
            'node',
            'resource_keyword',
            'keyword',
            'preview_size',
            'resource_dimensions',
            'resource_alt_files'
        ]
        
        return {name: self.tables[name] for name in metadata_tables if name in self.tables}


def generate_sqlite_cache_schema() -> str:
    """Generate optimized SQLite cache schema"""
    schema = """
-- SQLite Cache Schema for ResourceSpace Metadata
-- Optimized for read performance and local caching

-- Core resource information cache
CREATE TABLE IF NOT EXISTS cached_resources (
    resource_id INTEGER PRIMARY KEY,
    resource_type INTEGER,
    title TEXT,
    creation_date DATETIME,
    file_extension TEXT,
    preview_extension TEXT,
    thumb_width INTEGER,
    thumb_height INTEGER,
    file_size INTEGER,
    disk_usage INTEGER,
    archive INTEGER DEFAULT 0,
    access INTEGER DEFAULT 0,
    created_by INTEGER,
    modified DATETIME,
    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
    cache_expires_at DATETIME
);

-- Metadata fields cache (dynamic field-value pairs)
CREATE TABLE IF NOT EXISTS cached_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_id INTEGER NOT NULL,
    field_id INTEGER NOT NULL,
    field_name TEXT,
    field_type INTEGER,
    value TEXT,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resource_id) REFERENCES cached_resources(resource_id) ON DELETE CASCADE,
    UNIQUE(resource_id, field_id)
);

-- Keywords cache
CREATE TABLE IF NOT EXISTS cached_keywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_id INTEGER NOT NULL,
    keyword TEXT NOT NULL,
    field_id INTEGER,
    position INTEGER DEFAULT 0,
    FOREIGN KEY (resource_id) REFERENCES cached_resources(resource_id) ON DELETE CASCADE
);

-- Preview paths and sizes cache
CREATE TABLE IF NOT EXISTS cached_previews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_id INTEGER NOT NULL,
    preview_type TEXT NOT NULL, -- 'thm', 'pre', 'scr', etc.
    preview_path TEXT,
    width INTEGER,
    height INTEGER,
    file_size INTEGER,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resource_id) REFERENCES cached_resources(resource_id) ON DELETE CASCADE,
    UNIQUE(resource_id, preview_type)
);

-- Resource dimensions cache
CREATE TABLE IF NOT EXISTS cached_dimensions (
    resource_id INTEGER PRIMARY KEY,
    width INTEGER,
    height INTEGER,
    file_size INTEGER,
    resolution INTEGER,
    unit TEXT,
    page_count INTEGER,
    FOREIGN KEY (resource_id) REFERENCES cached_resources(resource_id) ON DELETE CASCADE
);

-- Cache status tracking
CREATE TABLE IF NOT EXISTS cache_status (
    resource_id INTEGER PRIMARY KEY,
    last_fetched DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    fetch_count INTEGER DEFAULT 1,
    is_complete BOOLEAN DEFAULT 0,
    etag TEXT,
    FOREIGN KEY (resource_id) REFERENCES cached_resources(resource_id) ON DELETE CASCADE
);

-- Resource types lookup cache
CREATE TABLE IF NOT EXISTS cached_resource_types (
    ref INTEGER PRIMARY KEY,
    name TEXT,
    allowed_extensions TEXT,
    config_options TEXT,
    icon TEXT,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Field definitions cache
CREATE TABLE IF NOT EXISTS cached_field_definitions (
    ref INTEGER PRIMARY KEY,
    name TEXT,
    title TEXT,
    type INTEGER,
    global BOOLEAN DEFAULT 1,
    required BOOLEAN DEFAULT 0,
    order_by INTEGER DEFAULT 0,
    tab INTEGER,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_resources_type ON cached_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_resources_modified ON cached_resources(modified);
CREATE INDEX IF NOT EXISTS idx_resources_accessed ON cached_resources(last_accessed);
CREATE INDEX IF NOT EXISTS idx_metadata_resource ON cached_metadata(resource_id);
CREATE INDEX IF NOT EXISTS idx_metadata_field ON cached_metadata(field_id);
CREATE INDEX IF NOT EXISTS idx_keywords_resource ON cached_keywords(resource_id);
CREATE INDEX IF NOT EXISTS idx_keywords_keyword ON cached_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_previews_resource ON cached_previews(resource_id);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache_status(expires_at);

-- Cache management views
CREATE VIEW IF NOT EXISTS expired_resources AS
SELECT resource_id FROM cache_status 
WHERE expires_at < datetime('now');

CREATE VIEW IF NOT EXISTS resource_summary AS
SELECT 
    r.resource_id,
    r.title,
    r.resource_type,
    rt.name as type_name,
    r.file_extension,
    r.file_size,
    r.last_accessed,
    cs.expires_at,
    COUNT(DISTINCT m.field_id) as metadata_count,
    COUNT(DISTINCT k.keyword) as keyword_count
FROM cached_resources r
LEFT JOIN cached_resource_types rt ON r.resource_type = rt.ref
LEFT JOIN cached_metadata m ON r.resource_id = m.resource_id
LEFT JOIN cached_keywords k ON r.resource_id = k.resource_id
LEFT JOIN cache_status cs ON r.resource_id = cs.resource_id
GROUP BY r.resource_id;
"""
    return schema


def main():
    """Main execution"""
    # Parse ResourceSpace schema
    parser = RSSchemaParser('/mnt/d/Projects/rs_art_station/resourcespace/dbstruct')
    parser.load_all_tables()
    
    # Get metadata-relevant tables
    metadata_tables = parser.get_metadata_tables()
    
    print("=== ResourceSpace Metadata Tables Analysis ===\n")
    for table_name, table in metadata_tables.items():
        print(f"Table: {table_name}")
        print(f"Fields: {len(table.fields)}")
        for field in table.fields[:5]:  # Show first 5 fields
            print(f"  - {field.name}: {field.data_type}")
        if len(table.fields) > 5:
            print("  ...")
        print()
    
    # Generate SQLite schema
    sqlite_schema = generate_sqlite_cache_schema()
    
    # Save schema to file
    with open('/mnt/d/Projects/rs_art_station/cache_schema.sql', 'w') as f:
        f.write(sqlite_schema)
    
    print("\n=== SQLite Cache Schema Generated ===")
    print("Schema saved to: cache_schema.sql")
    print("\nKey features:")
    print("- Optimized for read performance")
    print("- Supports expiration and cache invalidation")
    print("- Tracks access patterns for LRU eviction")
    print("- Normalized structure for flexible metadata")
    print("- Includes indexes for common queries")


if __name__ == "__main__":
    main()