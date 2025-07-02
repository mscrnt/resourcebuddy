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

module.exports = {
  db,
  getSettings,
  getSetting,
  setSetting,
  updateSettings,
  getUserProfile,
  createOrUpdateUserProfile,
  updateUserTheme
};