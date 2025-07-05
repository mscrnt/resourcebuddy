
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

-- Cached original resource files
CREATE TABLE IF NOT EXISTS cached_files (
    resource_id INTEGER PRIMARY KEY,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    file_hash TEXT,
    last_fetched DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    FOREIGN KEY (resource_id) REFERENCES cached_resources(resource_id) ON DELETE CASCADE
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
CREATE INDEX IF NOT EXISTS idx_files_expires ON cached_files(expires_at);

-- Cache management views
CREATE VIEW IF NOT EXISTS expired_resources AS
SELECT resource_id FROM cache_status 
WHERE expires_at < datetime('now');

CREATE VIEW IF NOT EXISTS expired_files AS
SELECT resource_id, file_path FROM cached_files
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
GROUP BY r.resource_id;
