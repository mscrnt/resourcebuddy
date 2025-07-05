#!/usr/bin/env python3
"""
Migration script to add cached_files table to existing cache.db
"""

import sqlite3
import os

def migrate_database(db_path='cache.db'):
    """Add cached_files table to existing database"""
    
    if not os.path.exists(db_path):
        print(f"Database {db_path} not found. Please run resourcespace_cache.py first.")
        return
        
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON")
    
    try:
        # Check if cached_files table already exists
        cursor = conn.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='cached_files'
        """)
        
        if cursor.fetchone():
            print("cached_files table already exists. No migration needed.")
            return
            
        # Add the new table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS cached_files (
                resource_id INTEGER PRIMARY KEY,
                file_path TEXT NOT NULL,
                file_size INTEGER,
                file_hash TEXT,
                last_fetched DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME,
                FOREIGN KEY (resource_id) REFERENCES cached_resources(resource_id) ON DELETE CASCADE
            )
        """)
        
        # Add index
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_files_expires ON cached_files(expires_at)
        """)
        
        # Drop and recreate views with new schema
        conn.execute("DROP VIEW IF EXISTS expired_files")
        conn.execute("DROP VIEW IF EXISTS resource_summary")
        
        conn.execute("""
            CREATE VIEW IF NOT EXISTS expired_files AS
            SELECT resource_id, file_path FROM cached_files
            WHERE expires_at < datetime('now')
        """)
        
        conn.execute("""
            CREATE VIEW IF NOT EXISTS resource_summary AS
            SELECT 
                r.resource_id,
                r.title,
                r.resource_type,
                rt.name as type_name,
                r.file_extension,
                r.file_size,
                r.last_accessed,
                cs.expires_at as metadata_expires,
                cf.expires_at as file_expires,
                cf.file_path as cached_file_path,
                COUNT(DISTINCT m.field_id) as metadata_count,
                COUNT(DISTINCT k.keyword) as keyword_count
            FROM cached_resources r
            LEFT JOIN cached_resource_types rt ON r.resource_type = rt.ref
            LEFT JOIN cached_metadata m ON r.resource_id = m.resource_id
            LEFT JOIN cached_keywords k ON r.resource_id = k.resource_id
            LEFT JOIN cache_status cs ON r.resource_id = cs.resource_id
            LEFT JOIN cached_files cf ON r.resource_id = cf.resource_id
            GROUP BY r.resource_id
        """)
        
        conn.commit()
        print("Migration completed successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_database()