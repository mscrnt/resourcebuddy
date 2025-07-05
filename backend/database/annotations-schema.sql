-- Annotations database schema for ResourceBuddy
-- Stores marker.js annotation metadata linked to ResourceSpace resources

CREATE TABLE IF NOT EXISTS annotations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resource_id INTEGER NOT NULL,
  resource_type TEXT,
  frame INTEGER,
  timestamp REAL,
  annotations_json TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT
);

-- Create indexes separately
CREATE INDEX IF NOT EXISTS idx_resource_id ON annotations (resource_id);
CREATE INDEX IF NOT EXISTS idx_created_at ON annotations (created_at);

-- Trigger to update the updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_annotations_timestamp 
AFTER UPDATE ON annotations
BEGIN
  UPDATE annotations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;