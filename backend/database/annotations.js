const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Initialize the annotations database
const dbPath = path.join(__dirname, 'annotations.db');
const db = new Database(dbPath);

// Run schema creation
const schemaPath = path.join(__dirname, 'annotations-schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

// Prepare statements for better performance
const statements = {
  insertAnnotation: db.prepare(`
    INSERT INTO annotations (resource_id, resource_type, frame, timestamp, annotations_json, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  
  getAnnotationsByResource: db.prepare(`
    SELECT * FROM annotations 
    WHERE resource_id = ? 
    ORDER BY created_at DESC
  `),
  
  getLatestAnnotation: db.prepare(`
    SELECT * FROM annotations 
    WHERE resource_id = ? 
    ORDER BY created_at DESC 
    LIMIT 1
  `),
  
  updateAnnotation: db.prepare(`
    UPDATE annotations 
    SET annotations_json = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `),
  
  deleteAnnotation: db.prepare(`
    DELETE FROM annotations WHERE id = ?
  `)
};

// API functions
module.exports = {
  // Save new annotation
  saveAnnotation: (resourceId, resourceType, annotationsJson, options = {}) => {
    const { frame = null, timestamp = null, createdBy = null } = options;
    
    try {
      const result = statements.insertAnnotation.run(
        resourceId,
        resourceType,
        frame,
        timestamp,
        JSON.stringify(annotationsJson),
        createdBy
      );
      
      return {
        success: true,
        id: result.lastInsertRowid,
        changes: result.changes
      };
    } catch (error) {
      console.error('Error saving annotation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get all annotations for a resource
  getAnnotationsByResource: (resourceId) => {
    try {
      const annotations = statements.getAnnotationsByResource.all(resourceId);
      
      // Parse JSON strings back to objects
      return annotations.map(ann => ({
        ...ann,
        annotations_json: JSON.parse(ann.annotations_json)
      }));
    } catch (error) {
      console.error('Error getting annotations:', error);
      return [];
    }
  },

  // Get latest annotation for a resource
  getLatestAnnotation: (resourceId) => {
    try {
      const annotation = statements.getLatestAnnotation.get(resourceId);
      
      if (annotation) {
        return {
          ...annotation,
          annotations_json: JSON.parse(annotation.annotations_json)
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting latest annotation:', error);
      return null;
    }
  },

  // Update existing annotation
  updateAnnotation: (annotationId, annotationsJson) => {
    try {
      const result = statements.updateAnnotation.run(
        JSON.stringify(annotationsJson),
        annotationId
      );
      
      return {
        success: true,
        changes: result.changes
      };
    } catch (error) {
      console.error('Error updating annotation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Delete annotation
  deleteAnnotation: (annotationId) => {
    try {
      const result = statements.deleteAnnotation.run(annotationId);
      
      return {
        success: true,
        changes: result.changes
      };
    } catch (error) {
      console.error('Error deleting annotation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Close database connection
  close: () => {
    db.close();
  }
};