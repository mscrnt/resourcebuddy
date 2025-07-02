const Database = require('better-sqlite3');
const path = require('path');

// Create or open database - renamed to resourcebuddy.db
const db = new Database(path.join(__dirname, 'resourcebuddy.db'));

// Initialize settings table
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Initialize user profiles table
db.exec(`
  CREATE TABLE IF NOT EXISTS user_profiles (
    ref INTEGER PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    bio TEXT,
    profile_picture TEXT,
    theme_preference TEXT DEFAULT 'dark',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Initialize dashboard tiles table
db.exec(`
  CREATE TABLE IF NOT EXISTS dashboard_tiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_ref INTEGER NOT NULL,
    title TEXT NOT NULL,
    tile_type TEXT NOT NULL,
    tile_style TEXT,
    tile_config JSON NOT NULL,
    position INTEGER DEFAULT 0,
    size TEXT DEFAULT 'normal',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_ref) REFERENCES user_profiles(ref)
  )
`);

// Initialize default settings if not exists
const initSettings = db.prepare(`
  INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
`);

const defaultSettings = {
  // Branding
  appTitle: 'ResourceBuddy',
  logoUrl: '/logo.png',  // Legacy - kept for compatibility
  logoDarkUrl: '/logo-dark.png',  // Logo for dark mode
  logoLightUrl: '/logo-light.png',  // Logo for light mode
  faviconUrl: '/favicon-rb.png',  // Compact logo for favicon
  
  // Theme Colors
  primaryColor: '#10b981',
  primaryColorDark: '#059669',
  accentColor: '#10b981',
  
  // Dark Theme (default)
  darkBackground: '#0a0a0a',
  darkBackgroundSecondary: '#171717',
  darkBackgroundTertiary: '#262626',
  darkText: '#ffffff',
  darkTextSecondary: '#a3a3a3',
  darkTextTertiary: '#737373',
  darkBorder: '#404040',
  
  // Light Theme (optional)
  enableLightTheme: false,
  lightBackground: '#ffffff',
  lightBackgroundSecondary: '#f5f5f5',
  lightBackgroundTertiary: '#e5e5e5',
  lightText: '#0a0a0a',
  lightTextSecondary: '#525252',
  lightTextTertiary: '#737373',
  lightBorder: '#d4d4d4',
  
  // Layout
  sidebarEnabled: true,
  sidebarPosition: 'left', // left or right
  navbarStyle: 'full', // full, minimal, compact
  gridColumns: 'auto', // auto, 2, 3, 4, 5, 6
  
  // Features
  enableSearch: true,
  enableCollections: true,
  enableCollectionBar: true, // Enable/disable collection bar
  enableSharing: true,
  enableDownload: true,
  enableUpload: true,
  defaultView: 'grid', // grid, list, masonry
  
  // Custom CSS (advanced)
  customCss: ''
};

// Insert default settings
Object.entries(defaultSettings).forEach(([key, value]) => {
  initSettings.run(key, JSON.stringify(value));
});

// Database functions
const getSettings = () => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  
  rows.forEach(row => {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch (e) {
      settings[row.key] = row.value;
    }
  });
  
  return settings;
};

const getSetting = (key) => {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  if (!row) return null;
  
  try {
    return JSON.parse(row.value);
  } catch (e) {
    return row.value;
  }
};

const setSetting = (key, value) => {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO settings (key, value, updated_at) 
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `);
  
  stmt.run(key, JSON.stringify(value));
};

const updateSettings = (settings) => {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO settings (key, value, updated_at) 
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `);
  
  const transaction = db.transaction((settings) => {
    Object.entries(settings).forEach(([key, value]) => {
      stmt.run(key, JSON.stringify(value));
    });
  });
  
  transaction(settings);
};

// User profile functions
const getUserProfile = (ref) => {
  const stmt = db.prepare('SELECT * FROM user_profiles WHERE ref = ?');
  return stmt.get(ref);
};

const createOrUpdateUserProfile = (profile) => {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO user_profiles (ref, username, bio, profile_picture, theme_preference, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  
  stmt.run(
    profile.ref,
    profile.username,
    profile.bio || null,
    profile.profile_picture || null,
    profile.theme_preference || 'dark'
  );
};

const updateUserTheme = (ref, theme) => {
  const stmt = db.prepare(`
    UPDATE user_profiles SET theme_preference = ?, updated_at = CURRENT_TIMESTAMP
    WHERE ref = ?
  `);
  
  stmt.run(theme, ref);
};

// Dashboard tile functions
const getUserDashboardTiles = (userRef) => {
  const stmt = db.prepare(`
    SELECT * FROM dashboard_tiles 
    WHERE user_ref = ? 
    ORDER BY position ASC
  `);
  const tiles = stmt.all(userRef);
  
  // Parse JSON tile_config for each tile
  return tiles.map(tile => ({
    ...tile,
    tile_config: JSON.parse(tile.tile_config)
  }));
};

const getDashboardTile = (id, userRef) => {
  const stmt = db.prepare(`
    SELECT * FROM dashboard_tiles 
    WHERE id = ? AND user_ref = ?
  `);
  const tile = stmt.get(id, userRef);
  
  if (tile) {
    tile.tile_config = JSON.parse(tile.tile_config);
  }
  
  return tile;
};

const createDashboardTile = (userRef, tileData) => {
  const stmt = db.prepare(`
    INSERT INTO dashboard_tiles (
      user_ref, title, tile_type, tile_style, 
      tile_config, position, size
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    userRef,
    tileData.title,
    tileData.tile_type,
    tileData.tile_style || 'default',
    JSON.stringify(tileData.tile_config),
    tileData.position || 0,
    tileData.size || 'normal'
  );
  
  return result.lastInsertRowid;
};

const updateDashboardTile = (id, userRef, tileData) => {
  const stmt = db.prepare(`
    UPDATE dashboard_tiles 
    SET title = ?, tile_style = ?, tile_config = ?, 
        position = ?, size = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_ref = ?
  `);
  
  return stmt.run(
    tileData.title,
    tileData.tile_style,
    JSON.stringify(tileData.tile_config),
    tileData.position,
    tileData.size,
    id,
    userRef
  );
};

const deleteDashboardTile = (id, userRef) => {
  const stmt = db.prepare(`
    DELETE FROM dashboard_tiles 
    WHERE id = ? AND user_ref = ?
  `);
  
  return stmt.run(id, userRef);
};

const updateTilePositions = (userRef, positions) => {
  const stmt = db.prepare(`
    UPDATE dashboard_tiles 
    SET position = ? 
    WHERE id = ? AND user_ref = ?
  `);
  
  const transaction = db.transaction((positions) => {
    positions.forEach(({ id, position }) => {
      stmt.run(position, id, userRef);
    });
  });
  
  transaction(positions);
};

module.exports = {
  db,
  getSettings,
  getSetting,
  setSetting,
  updateSettings,
  getUserProfile,
  createOrUpdateUserProfile,
  updateUserTheme,
  getUserDashboardTiles,
  getDashboardTile,
  createDashboardTile,
  updateDashboardTile,
  deleteDashboardTile,
  updateTilePositions
};