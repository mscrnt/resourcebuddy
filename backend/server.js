require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const cors = require('cors');
const multer = require('multer');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { 
  getSettings, updateSettings, getSetting, setSetting, 
  getUserProfile, createOrUpdateUserProfile, updateUserTheme,
  getUserDashboardTiles, getDashboardTile, createDashboardTile,
  updateDashboardTile, deleteDashboardTile, updateTilePositions
} = require('./database');
const {
  checkCacheHealth,
  getCachedResource,
  getCachedFile,
  getCachedPreview,
  searchWithCache,
  prefetchResources,
  getCacheStats,
  evictResource
} = require('./cache-integration');
const annotationsDb = require('./database/annotations');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3002', 'http://localhost:3000', 'http://localhost:3004'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Serve static files for profile pictures
app.use('/uploads/profile_pics', express.static(path.join(__dirname, 'uploads/profile_pics')));

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is working!', timestamp: Date.now() });
});

// Debug endpoint to test URL generation
app.get('/debug/test-url/:ref', (req, res) => {
  const { ref } = req.params;
  const { size = 'scr' } = req.query;
  
  const imageUrl = `http://localhost:3003/api/resource/${ref}/preview?size=${size}`;
  const fileUrl = `http://localhost:3003/api/resource/${ref}/file`;
  
  res.json({
    ref,
    size,
    imageUrl,
    fileUrl,
    testImage: `http://localhost:3003/api/resource/153/preview?size=thm`
  });
});

// ResourceSpace configuration from environment
const RS_API_URL = process.env.RS_API_URL || 'https://mscrnt.free.resourcespace.com/api/';
const RS_API_KEY = process.env.RS_API_KEY || '37d60b421e1b759d88f8e7c0dd607326a8d4e98b400a3b71755698b9c8f06fec';
const RS_USER = process.env.RS_USER || 'admin';

// Helper to sign API requests
function signRequest(query) {
  return crypto.createHash('sha256').update(RS_API_KEY + query).digest('hex');
}

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Build query string for login
    const params = new URLSearchParams({
      function: 'login',
      username: username,
      password: password
    });
    
    const queryString = params.toString();
    const signature = signRequest(queryString);
    
    const url = `${RS_API_URL}?${queryString}&sign=${signature}`;
    console.log('Login request:', url);
    
    const response = await axios.get(url);
    
    if (response.data && response.data !== '' && response.data !== 'false') {
      // Get user info to find user ID
      try {
        const getUserParams = [
          ['user', RS_USER],
          ['function', 'get_users'],
          ['param1', username], // Search for exact username
          ['param2', 'true'] // Exact match
        ];
        
        const getUserQueryString = getUserParams
          .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
          .join('&');
        
        const getUserSignature = crypto.createHash('sha256').update(RS_API_KEY + getUserQueryString).digest('hex');
        const getUserUrl = `${RS_API_URL}?${getUserQueryString}&sign=${getUserSignature}`;
        
        console.log('Getting user info for:', username);
        const userResponse = await axios.get(getUserUrl);
        console.log('User info response:', userResponse.data);
        
        let userRef = null;
        if (Array.isArray(userResponse.data) && userResponse.data.length > 0) {
          userRef = userResponse.data[0].ref;
          console.log('Found user ref:', userRef);
        }
        
        res.json({
          success: true,
          sessionKey: response.data,
          username: username,
          userRef: userRef
        });
      } catch (userError) {
        console.error('Failed to get user info:', userError);
        // Still return success but without user ref
        res.json({
          success: true,
          sessionKey: response.data,
          username: username
        });
      }
    } else {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// Generic API proxy endpoint with cache integration
app.post('/api/proxy', async (req, res) => {
  try {
    const { function: fn, params = {}, sessionKey } = req.body;
    
    // Check if we can use cache for certain functions
    if (fn === 'do_search' && params.param1) {
      try {
        // Try cache first for searches
        console.log('Checking cache for search:', params.param1);
        const cacheResult = await searchWithCache(
          params.param1,
          params.param2 ? params.param2.split(',').map(Number) : null,
          params.param5 || 100
        );
        
        if (cacheResult && cacheResult.results) {
          console.log(`Cache hit: Found ${cacheResult.results.length} results`);
          // Transform to match RS API format
          return res.json(cacheResult.results.map(r => ({
            ref: r.resource_id,
            field8: r.title,
            resource_type: r.resource_type,
            file_extension: r.file_extension,
            has_image: r.has_cached_file ? 1 : 0,
            creation_date: r.creation_date,
            file_size: r.file_size
          })));
        }
      } catch (cacheError) {
        console.log('Cache miss or error, falling back to RS API:', cacheError.message);
      }
    }
    
    // Check cache for get_resource_data
    if (fn === 'get_resource_data' && params.param1) {
      try {
        const cached = await getCachedResource(params.param1);
        if (cached) {
          console.log(`Cache hit for resource ${params.param1}`);
          return res.json(cached);
        }
      } catch (cacheError) {
        console.log('Cache miss for resource, falling back to RS API');
      }
    }
    
    // Build query parameters - order matters!
    const orderedParams = [
      ['user', RS_USER],
      ['function', fn]
    ];
    
    // Add numbered params (param1, param2, etc)
    Object.keys(params).sort().forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        orderedParams.push([key, String(params[key])]);
      }
    });
    
    // Convert to query string
    const queryString = orderedParams
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    
    // Always use the API key for signing (session keys don't seem to work)
    const signature = crypto.createHash('sha256').update(RS_API_KEY + queryString).digest('hex');
    
    console.log('API request:', fn, 'with params:', params);
    
    // Log search details for do_search
    if (fn === 'do_search') {
      console.log('Search details:', {
        search: params.param1,
        restypes: params.param2,
        order_by: params.param3,
        archive: params.param4,
        fetchrows: params.param5,
        sort: params.param6,
        offset: params.param7
      });
    }
    
    const url = `${RS_API_URL}?${queryString}&sign=${signature}`;
    
    // Log full details for create_resource
    if (fn === 'create_resource') {
      console.log('=== CREATE RESOURCE REQUEST ===');
      console.log('Function:', fn);
      console.log('Params:', JSON.stringify(params, null, 2));
      console.log('Query String:', queryString);
      console.log('Full URL:', url);
    }
    
    // Use POST for create_resource as per API documentation
    let response;
    if (fn === 'create_resource') {
      response = await axios.post(url);
    } else {
      response = await axios.get(url);
    }
    
    console.log('API response for', fn, ':', typeof response.data === 'string' ? response.data.substring(0, 100) + '...' : response.data);
    
    // Special handling for get_resource_path - return backend URL instead of RS URL
    if (fn === 'get_resource_path' && response.data && typeof response.data === 'string' && response.data.startsWith('http')) {
      // Return our backend URL that will handle caching
      const size = params.param3 || '';
      // Use preview endpoint for preview sizes, file endpoint for full files
      let backendUrl;
      if (size && ['thm', 'pre', 'scr', 'col'].includes(size)) {
        backendUrl = `${process.env.BACKEND_URL || 'http://localhost:3003'}/api/resource/${params.param1}/preview?size=${size}`;
      } else {
        backendUrl = `${process.env.BACKEND_URL || 'http://localhost:3003'}/api/resource/${params.param1}/file?size=${size}`;
      }
      console.log(`Returning backend URL for file: ${backendUrl}`);
      res.json(backendUrl);
    } else {
      res.json(response.data);
    }
  } catch (error) {
    console.error('API error:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.message
    });
  }
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  }
});

// Configure multer for profile picture uploads
const profilePicStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, 'uploads/profile_pics');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${req.params.ref}${ext}`);
  }
});

const profilePicUpload = multer({ 
  storage: profilePicStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Upload endpoint - handles file upload to ResourceSpace
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }

    const { ref, no_exif, revert } = req.body;
    
    console.log('=== FILE UPLOAD REQUEST ===');
    console.log('Ref:', ref);
    console.log('Filename:', req.file.originalname);
    console.log('Size:', req.file.size);
    console.log('Mimetype:', req.file.mimetype);
    
    // Use upload_multipart directly as it's the recommended method for file uploads
    
    // Use upload_multipart as documented in ResourceSpace API
    // According to docs, we need to create a multipart form with specific structure
    // The file should NOT be part of the signature
    
    // Build the query string for the signature (without the file)
    const queryData = {
      user: RS_USER,
      function: 'upload_multipart',
      ref: ref,
      no_exif: no_exif === 'true' ? 1 : 0,
      revert: revert === 'true' ? 1 : 0
    };
    
    // Create query string in the exact order
    const queryString = Object.entries(queryData)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    
    // Sign the query
    const signature = signRequest(queryString);
    
    // Create form data according to ResourceSpace documentation
    const form = new FormData();
    form.append('query', queryString);
    form.append('sign', signature);
    form.append('user', RS_USER);
    form.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });
    
    console.log('=== UPLOAD MULTIPART REQUEST ===');
    console.log('Query String:', queryString);
    console.log('Signature:', signature);
    
    try {
      const response = await axios.post(RS_API_URL, form, {
        headers: {
          ...form.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      
      console.log('ResourceSpace upload response status:', response.status);
      console.log('ResourceSpace upload response data:', response.data);
      
      // According to docs, success returns 204 status
      if (response.status === 204) {
        res.json({
          success: true,
          ref: ref,
          filename: req.file.originalname,
          message: 'File uploaded successfully'
        });
      } else if (response.data && response.data.status === 'fail') {
        throw new Error(response.data.data.message || 'Upload failed');
      } else {
        res.json({
          success: true,
          ref: ref,
          filename: req.file.originalname,
          data: response.data
        });
      }
      
    } catch (uploadError) {
      console.error('ResourceSpace upload error:');
      console.error('Status:', uploadError.response?.status);
      console.error('Data:', uploadError.response?.data);
      console.error('Message:', uploadError.message);
      
      if (uploadError.response?.status === 413) {
        throw new Error('File size too large');
      } else if (uploadError.response?.status === 400) {
        throw new Error(uploadError.response.data?.data?.message || 'Bad request - possible duplicate file');
      } else if (uploadError.response?.status === 500) {
        throw new Error('Server error - check ResourceSpace configuration');
      }
      
      throw uploadError;
    }
    
  } catch (error) {
    console.error('Upload error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Preview endpoint - uses cache first, then proxies from ResourceSpace
app.get('/api/resource/:ref/preview', async (req, res) => {
  try {
    const { ref } = req.params;
    const { size = 'thm' } = req.query;
    
    console.log(`Fetching preview for resource ${ref}, size: ${size}`);
    
    // Try cache first
    try {
      const cachedPreview = await getCachedPreview(ref, size);
      if (cachedPreview && cachedPreview.preview_url) {
        console.log(`Cache hit for preview ${ref} size ${size}`);
        
        // If we have a URL, fetch and proxy it
        const imageResponse = await axios.get(cachedPreview.preview_url, {
          responseType: 'stream'
        });
        
        res.set('Content-Type', imageResponse.headers['content-type'] || 'image/jpeg');
        res.set('Cache-Control', 'public, max-age=86400');
        res.set('X-Cache', 'HIT');
        
        return imageResponse.data.pipe(res);
      }
    } catch (cacheError) {
      console.log('Cache miss for preview, falling back to RS API');
    }
    
    // Fall back to ResourceSpace API
    const params = {
      user: RS_USER,
      function: 'get_resource_path',
      param1: ref,        // resource ID
      param2: '',         // not_used
      param3: size,       // size code (thm, pre, scr, etc)
      param4: 1,          // generate if not exists
      param5: 'jpg',      // extension
      param6: 1,          // page
      param7: 0,          // watermarked
      param8: -1          // alternative (-1 = original)
    };
    
    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    
    const signature = signRequest(queryString);
    const apiUrl = `${RS_API_URL}?${queryString}&sign=${signature}`;
    
    const response = await axios.get(apiUrl);
    
    if (response.data && typeof response.data === 'string' && response.data.startsWith('http')) {
      // Got a URL, fetch the image
      const imageResponse = await axios.get(response.data, {
        responseType: 'stream'
      });
      
      // Set appropriate headers
      res.set('Content-Type', imageResponse.headers['content-type'] || 'image/jpeg');
      res.set('Cache-Control', 'public, max-age=3600');
      res.set('X-Cache', 'MISS');
      
      // Stream the image to the client
      imageResponse.data.pipe(res);
    } else {
      console.error('Invalid preview URL response:', response.data);
      res.status(404).json({
        success: false,
        error: 'Preview not found'
      });
    }
    
  } catch (error) {
    console.error('Preview fetch error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch preview'
    });
  }
});

// File streaming endpoint - for videos and original files
app.get('/api/resource/:ref/file', async (req, res) => {
  try {
    const { ref } = req.params;
    const { size = '' } = req.query; // empty size means original file
    
    console.log(`Fetching file for resource ${ref}, size: ${size || 'original'}`);
    
    // Try cache first
    try {
      const cachedFile = await getCachedFile(ref);
      if (cachedFile && cachedFile.stream) {
        console.log(`Cache hit for file ${ref}`);
        
        // Set appropriate headers
        res.set('Content-Type', cachedFile.headers['content-type'] || 'application/octet-stream');
        res.set('Cache-Control', 'public, max-age=86400');
        res.set('X-Cache', 'HIT');
        
        return cachedFile.stream.pipe(res);
      }
    } catch (cacheError) {
      console.log('Cache miss for file, falling back to RS API');
    }
    
    // Fall back to ResourceSpace API to get file URL
    const params = {
      user: RS_USER,
      function: 'get_resource_path',
      param1: ref,        // resource ID
      param2: '',         // not_used
      param3: size,       // size code (empty for original)
      param4: 0,          // don't generate (for original files)
      param5: '',         // extension (let RS determine)
      param6: 1,          // page
      param7: 0,          // watermarked
      param8: -1          // alternative (-1 = original)
    };
    
    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    
    const signature = signRequest(queryString);
    const apiUrl = `${RS_API_URL}?${queryString}&sign=${signature}`;
    
    const response = await axios.get(apiUrl);
    
    if (response.data && typeof response.data === 'string' && response.data.startsWith('http')) {
      // Got a URL, fetch the file
      const fileResponse = await axios.get(response.data, {
        responseType: 'stream'
      });
      
      // Set appropriate headers
      res.set('Content-Type', fileResponse.headers['content-type'] || 'application/octet-stream');
      res.set('Cache-Control', 'public, max-age=3600');
      res.set('X-Cache', 'MISS');
      
      // Support range requests for video streaming
      const range = req.headers.range;
      if (range && fileResponse.headers['accept-ranges'] === 'bytes') {
        res.status(206);
        res.set('Content-Range', fileResponse.headers['content-range']);
        res.set('Accept-Ranges', 'bytes');
        res.set('Content-Length', fileResponse.headers['content-length']);
      }
      
      // Stream the file to the client
      fileResponse.data.pipe(res);
    } else {
      console.error('Invalid file URL response:', response.data);
      res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
  } catch (error) {
    console.error('File fetch error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch file'
    });
  }
});

// Settings management endpoints

// Get all settings
app.get('/api/settings', async (req, res) => {
  try {
    const settings = getSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error reading settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to read settings'
    });
  }
});

// Get specific setting
app.get('/api/settings/:key', async (req, res) => {
  try {
    const value = getSetting(req.params.key);
    res.json({ key: req.params.key, value });
  } catch (error) {
    console.error('Error reading setting:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to read setting'
    });
  }
});

// Update settings (requires admin permission)
app.put('/api/settings', async (req, res) => {
  try {
    // TODO: Add proper permission check with session
    const newSettings = req.body;
    
    // Basic validation
    if (newSettings.appTitle !== undefined && (!newSettings.appTitle || typeof newSettings.appTitle !== 'string')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid app title'
      });
    }
    
    // Update settings in database
    updateSettings(newSettings);
    
    // Return all current settings
    const allSettings = getSettings();
    
    res.json({
      success: true,
      settings: allSettings
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings'
    });
  }
});

// Check user permissions
app.post('/api/check-permission', async (req, res) => {
  try {
    const { permission, sessionKey } = req.body;
    
    if (!sessionKey) {
      return res.json({ hasPermission: false });
    }
    
    // Call ResourceSpace checkperm function
    const checkPermResult = await axios.get(
      `${RS_API_URL}?user=${RS_USER}&function=checkperm&param1=${permission}&sign=${signRequest(`user=${RS_USER}&function=checkperm&param1=${permission}`)}`
    );
    
    res.json({
      hasPermission: checkPermResult.data === true || checkPermResult.data === 'true'
    });
  } catch (error) {
    console.error('Error checking permission:', error);
    res.json({ hasPermission: false });
  }
});

// Get user metadata from ResourceSpace
app.post('/api/user-metadata', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ success: false, error: 'Username required' });
    }
    
    // Call ResourceSpace get_users function
    const getUsersResult = await axios.get(
      `${RS_API_URL}?user=${RS_USER}&function=get_users&param1=${username}&sign=${signRequest(`user=${RS_USER}&function=get_users&param1=${username}`)}`
    );
    
    if (getUsersResult.data && getUsersResult.data.length > 0) {
      const userData = getUsersResult.data[0];
      
      // Check or create user profile in local DB
      let profile = getUserProfile(userData.ref);
      if (!profile) {
        createOrUpdateUserProfile({
          ref: userData.ref,
          username: userData.username,
          theme_preference: 'dark'
        });
        profile = getUserProfile(userData.ref);
      }
      
      res.json({
        success: true,
        user: {
          ref: userData.ref,
          username: userData.username,
          fullname: userData.fullname,
          usergroup: userData.usergroup,
          email: userData.email,
          // Include local profile data
          bio: profile?.bio || '',
          profile_picture: profile?.profile_picture || '',
          theme_preference: profile?.theme_preference || 'dark'
        }
      });
    } else {
      res.status(404).json({ success: false, error: 'User not found' });
    }
  } catch (error) {
    console.error('Error fetching user metadata:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user metadata' });
  }
});

// Update user profile
app.put('/api/user-profile/:ref', async (req, res) => {
  try {
    const { ref } = req.params;
    const { bio, profile_picture, theme_preference, username } = req.body;
    
    createOrUpdateUserProfile({
      ref: parseInt(ref),
      username,
      bio,
      profile_picture,
      theme_preference
    });
    
    const updatedProfile = getUserProfile(parseInt(ref));
    
    res.json({
      success: true,
      profile: updatedProfile
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ success: false, error: 'Failed to update user profile' });
  }
});

// Upload profile picture
app.post('/api/user-profile/:ref/picture', profilePicUpload.single('picture'), async (req, res) => {
  try {
    const { ref } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file provided' });
    }
    
    // Update user profile with new picture path
    const profile = getUserProfile(parseInt(ref));
    if (profile) {
      const picturePath = `/uploads/profile_pics/${req.file.filename}`;
      createOrUpdateUserProfile({
        ...profile,
        profile_picture: picturePath
      });
    }
    
    res.json({
      success: true,
      filename: req.file.filename,
      path: `/uploads/profile_pics/${req.file.filename}`
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ success: false, error: 'Failed to upload profile picture' });
  }
});

// Dashboard Tiles API endpoints
// Get all tiles for a user
app.get('/api/dashboard/tiles/:userRef', async (req, res) => {
  try {
    const { userRef } = req.params;
    const tiles = getUserDashboardTiles(parseInt(userRef));
    
    res.json({
      success: true,
      tiles
    });
  } catch (error) {
    console.error('Error fetching dashboard tiles:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard tiles' });
  }
});

// Get single tile
app.get('/api/dashboard/tiles/:userRef/:tileId', async (req, res) => {
  try {
    const { userRef, tileId } = req.params;
    const tile = getDashboardTile(parseInt(tileId), parseInt(userRef));
    
    if (!tile) {
      return res.status(404).json({ success: false, error: 'Tile not found' });
    }
    
    res.json({
      success: true,
      tile
    });
  } catch (error) {
    console.error('Error fetching dashboard tile:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard tile' });
  }
});

// Create new tile
app.post('/api/dashboard/tiles/:userRef', async (req, res) => {
  try {
    const { userRef } = req.params;
    const tileData = req.body;
    
    const tileId = createDashboardTile(parseInt(userRef), tileData);
    const tile = getDashboardTile(tileId, parseInt(userRef));
    
    res.json({
      success: true,
      tile
    });
  } catch (error) {
    console.error('Error creating dashboard tile:', error);
    res.status(500).json({ success: false, error: 'Failed to create dashboard tile' });
  }
});

// Update tile
app.put('/api/dashboard/tiles/:userRef/:tileId', async (req, res) => {
  try {
    const { userRef, tileId } = req.params;
    const tileData = req.body;
    
    updateDashboardTile(parseInt(tileId), parseInt(userRef), tileData);
    const tile = getDashboardTile(parseInt(tileId), parseInt(userRef));
    
    res.json({
      success: true,
      tile
    });
  } catch (error) {
    console.error('Error updating dashboard tile:', error);
    res.status(500).json({ success: false, error: 'Failed to update dashboard tile' });
  }
});

// Delete tile
app.delete('/api/dashboard/tiles/:userRef/:tileId', async (req, res) => {
  try {
    const { userRef, tileId } = req.params;
    
    deleteDashboardTile(parseInt(tileId), parseInt(userRef));
    
    res.json({
      success: true
    });
  } catch (error) {
    console.error('Error deleting dashboard tile:', error);
    res.status(500).json({ success: false, error: 'Failed to delete dashboard tile' });
  }
});

// Update tile positions
app.post('/api/dashboard/tiles/:userRef/positions', async (req, res) => {
  try {
    const { userRef } = req.params;
    const { positions } = req.body;
    
    updateTilePositions(parseInt(userRef), positions);
    
    res.json({
      success: true
    });
  } catch (error) {
    console.error('Error updating tile positions:', error);
    res.status(500).json({ success: false, error: 'Failed to update tile positions' });
  }
});

// Execute saved search for tile
app.post('/api/dashboard/tiles/execute-search', async (req, res) => {
  try {
    const { searchParams, sessionKey } = req.body;
    
    // Build ResourceSpace search query
    const params = new URLSearchParams({
      function: 'do_search',
      param1: searchParams.search || '',
      param2: searchParams.restypes || '',
      param3: searchParams.order_by || 'relevance',
      param4: searchParams.archive || '0',
      param5: searchParams.fetchrows || '8',
      param6: searchParams.sort || 'DESC',
      param7: searchParams.recent_search_daylimit || '',
      param8: searchParams.go || ''
    });
    
    const query = `user=${RS_USER}&${params.toString()}`;
    const sign = signRequest(query);
    
    const response = await axios.get(`${RS_API_URL}?${query}&sign=${sign}`, {
      headers: {
        'Cookie': `rs_session=${sessionKey}`
      }
    });
    
    res.json({
      success: true,
      results: response.data,
      count: Array.isArray(response.data) ? response.data.length : 0
    });
  } catch (error) {
    console.error('Error executing search:', error);
    res.status(500).json({ success: false, error: 'Failed to execute search' });
  }
});

// Collection Management endpoints
// Add resource to collection
app.post('/api/collections/:collectionId/resources/:resourceId', async (req, res) => {
  try {
    const { collectionId, resourceId } = req.params;
    const { sessionKey } = req.body;
    
    // Build ResourceSpace API query
    const params = new URLSearchParams({
      function: 'add_resource_to_collection',
      param1: resourceId,
      param2: collectionId
    });
    
    const query = `user=${RS_USER}&${params.toString()}`;
    const sign = signRequest(query);
    
    const response = await axios.get(`${RS_API_URL}?${query}&sign=${sign}`, {
      headers: {
        'Cookie': `rs_session=${sessionKey}`
      }
    });
    
    res.json({
      success: response.data === true,
      message: response.data === true ? 'Resource added to collection' : 'Failed to add resource'
    });
  } catch (error) {
    console.error('Error adding resource to collection:', error);
    res.status(500).json({ success: false, error: 'Failed to add resource to collection' });
  }
});

// Remove resource from collection
app.delete('/api/collections/:collectionId/resources/:resourceId', async (req, res) => {
  try {
    const { collectionId, resourceId } = req.params;
    const { sessionKey } = req.query;
    
    // Build ResourceSpace API query
    const params = new URLSearchParams({
      function: 'remove_resource_from_collection',
      param1: resourceId,
      param2: collectionId
    });
    
    const query = `user=${RS_USER}&${params.toString()}`;
    const sign = signRequest(query);
    
    const response = await axios.get(`${RS_API_URL}?${query}&sign=${sign}`, {
      headers: {
        'Cookie': `rs_session=${sessionKey}`
      }
    });
    
    res.json({
      success: response.data === true,
      message: response.data === true ? 'Resource removed from collection' : 'Failed to remove resource'
    });
  } catch (error) {
    console.error('Error removing resource from collection:', error);
    res.status(500).json({ success: false, error: 'Failed to remove resource from collection' });
  }
});

// Add multiple resources to collection
app.post('/api/collections/:collectionId/resources/batch', async (req, res) => {
  try {
    const { collectionId } = req.params;
    const { resourceIds, sessionKey } = req.body;
    
    const results = await Promise.all(resourceIds.map(async (resourceId) => {
      const params = new URLSearchParams({
        function: 'add_resource_to_collection',
        param1: resourceId,
        param2: collectionId
      });
      
      const query = `user=${RS_USER}&${params.toString()}`;
      const sign = signRequest(query);
      
      try {
        const response = await axios.get(`${RS_API_URL}?${query}&sign=${sign}`, {
          headers: {
            'Cookie': `rs_session=${sessionKey}`
          }
        });
        return { resourceId, success: response.data === true };
      } catch (err) {
        return { resourceId, success: false };
      }
    }));
    
    const successCount = results.filter(r => r.success).length;
    
    res.json({
      success: successCount > 0,
      results,
      message: `Added ${successCount} of ${resourceIds.length} resources to collection`
    });
  } catch (error) {
    console.error('Error adding resources to collection:', error);
    res.status(500).json({ success: false, error: 'Failed to add resources to collection' });
  }
});

// Resource Modal Enhancement endpoints

// Get resource field data (detailed metadata)
app.post('/api/resource/:ref/field-data', async (req, res) => {
  try {
    const { ref } = req.params;
    const { sessionKey } = req.body;
    
    const params = new URLSearchParams({
      function: 'get_resource_field_data',
      param1: ref,
      param2: 'false' // Don't use permissions
    });
    
    const query = `user=${RS_USER}&${params.toString()}`;
    const sign = signRequest(query);
    
    const response = await axios.get(`${RS_API_URL}?${query}&sign=${sign}`, {
      headers: {
        'Cookie': `rs_session=${sessionKey}`
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error getting resource field data:', error);
    res.status(500).json({ success: false, error: 'Failed to get field data' });
  }
});

// Update resource field
app.post('/api/resource/:ref/field/:fieldRef', async (req, res) => {
  try {
    const { ref, fieldRef } = req.params;
    const { value, sessionKey } = req.body;
    
    const params = new URLSearchParams({
      function: 'update_field',
      param1: ref,
      param2: fieldRef,
      param3: value || ''
    });
    
    const query = `user=${RS_USER}&${params.toString()}`;
    const sign = signRequest(query);
    
    const response = await axios.get(`${RS_API_URL}?${query}&sign=${sign}`, {
      headers: {
        'Cookie': `rs_session=${sessionKey}`
      }
    });
    
    res.json({
      success: response.data === true || response.data === 'true',
      message: 'Field updated successfully'
    });
  } catch (error) {
    console.error('Error updating resource field:', error);
    res.status(500).json({ success: false, error: 'Failed to update field' });
  }
});

// Update resource type
app.post('/api/resource/:ref/type', async (req, res) => {
  try {
    const { ref } = req.params;
    const { resource_type, sessionKey } = req.body;
    
    const params = new URLSearchParams({
      function: 'update_resource_type',
      param1: ref,
      param2: resource_type
    });
    
    const query = `user=${RS_USER}&${params.toString()}`;
    const sign = signRequest(query);
    
    const response = await axios.get(`${RS_API_URL}?${query}&sign=${sign}`, {
      headers: {
        'Cookie': `rs_session=${sessionKey}`
      }
    });
    
    res.json({
      success: response.data === true || response.data === 'true',
      message: 'Resource type updated successfully'
    });
  } catch (error) {
    console.error('Error updating resource type:', error);
    res.status(500).json({ success: false, error: 'Failed to update resource type' });
  }
});

// Get alternative files
app.post('/api/resource/:ref/alternative-files', async (req, res) => {
  try {
    const { ref } = req.params;
    const { sessionKey } = req.body;
    
    const params = new URLSearchParams({
      function: 'get_alternative_files',
      param1: ref
    });
    
    const query = `user=${RS_USER}&${params.toString()}`;
    const sign = signRequest(query);
    
    const response = await axios.get(`${RS_API_URL}?${query}&sign=${sign}`, {
      headers: {
        'Cookie': `rs_session=${sessionKey}`
      }
    });
    
    res.json(response.data || []);
  } catch (error) {
    console.error('Error getting alternative files:', error);
    res.status(500).json({ success: false, error: 'Failed to get alternative files' });
  }
});

// Get available sizes for alternative file
app.get('/api/alternative/:altId/sizes', async (req, res) => {
  try {
    const { altId } = req.params;
    const { resourceRef } = req.query;
    
    // First try with just the alternative file ID
    let params = new URLSearchParams({
      function: 'get_resource_all_image_sizes',
      param1: altId // try alternative file ID directly
    });
    
    let query = `user=${RS_USER}&${params.toString()}`;
    let sign = signRequest(query);
    
    console.log(`Checking sizes for alternative file ${altId} directly...`);
    let response = await axios.get(`${RS_API_URL}?${query}&sign=${sign}`);
    
    // If no sizes found and we have a parent resource ref, try that
    if ((!response.data || response.data.length === 0) && resourceRef) {
      console.log(`No sizes found for alt file ${altId}, trying parent resource ${resourceRef}...`);
      params = new URLSearchParams({
        function: 'get_resource_all_image_sizes',
        param1: resourceRef // try parent resource ID
      });
      
      query = `user=${RS_USER}&${params.toString()}`;
      sign = signRequest(query);
      response = await axios.get(`${RS_API_URL}?${query}&sign=${sign}`);
    }
    
    console.log(`Sizes response:`, response.data);
    res.json(response.data || []);
  } catch (error) {
    console.error('Error getting alternative file sizes:', error);
    res.status(500).json({ success: false, error: 'Failed to get alternative file sizes' });
  }
});

// Get alternative file preview - using API to get authenticated URL
app.get('/api/alternative/:altId/preview', async (req, res) => {
  try {
    const { altId } = req.params;
    const { size = 'scr', resourceRef } = req.query;
    
    if (!resourceRef) {
      return res.status(400).json({ success: false, error: 'Parent resource ref is required' });
    }
    
    // Use get_resource_path API to get authenticated URL
    const params = new URLSearchParams({
      function: 'get_resource_path',
      param1: resourceRef, // parent resource ref
      param3: size, // size
      param5: 'jpg', // extension
      param8: altId // alternative file ID
    });
    
    const query = `user=${RS_USER}&${params.toString()}`;
    const sign = signRequest(query);
    
    console.log(`Getting alternative file preview path: ref=${resourceRef}, alt=${altId}, size=${size}`);
    const response = await axios.get(`${RS_API_URL}?${query}&sign=${sign}`);
    
    if (response.data && response.data !== false && response.data !== 'false') {
      console.log('Got authenticated URL:', response.data);
      // Redirect to the authenticated URL
      res.redirect(response.data);
    } else {
      // Fallback to direct download URL
      const downloadParams = new URLSearchParams({
        ref: resourceRef,
        size: size,
        ext: 'jpg',
        page: '1',
        alternative: altId,
        watermarked: '',
        k: '',
        noattach: 'true'
      });
      
      const downloadUrl = `https://mscrnt.free.resourcespace.com/pages/download.php?${downloadParams.toString()}`;
      console.log('Fallback to direct URL:', downloadUrl);
      res.redirect(downloadUrl);
    }
  } catch (error) {
    console.error('Error getting alternative file preview:', error);
    res.status(500).json({ success: false, error: 'Failed to get alternative file preview' });
  }
});

// Get alternative file download - proxy download with proper headers
app.get('/api/alternative/:altId/file', async (req, res) => {
  try {
    const { altId } = req.params;
    const { resourceRef, extension = 'jpg', download = 'true' } = req.query;
    
    if (!resourceRef) {
      return res.status(400).json({ success: false, error: 'Parent resource ref is required' });
    }
    
    // Use get_resource_path API to get authenticated URL
    const params = new URLSearchParams({
      function: 'get_resource_path',
      param1: resourceRef, // parent resource ref
      param3: '', // size - empty for original
      param5: extension, // extension
      param8: altId // alternative file ID
    });
    
    const query = `user=${RS_USER}&${params.toString()}`;
    const sign = signRequest(query);
    
    console.log(`Getting alternative file path: ref=${resourceRef}, alt=${altId}, ext=${extension}`);
    const response = await axios.get(`${RS_API_URL}?${query}&sign=${sign}`);
    
    if (response.data && response.data !== false && response.data !== 'false') {
      const fileUrl = response.data;
      console.log('Got authenticated URL:', fileUrl);
      
      // Get the alternative file info to get the filename
      const altFilesParams = new URLSearchParams({
        function: 'get_alternative_files',
        param1: resourceRef
      });
      
      const altFilesQuery = `user=${RS_USER}&${altFilesParams.toString()}`;
      const altFilesSign = signRequest(altFilesQuery);
      
      const altFilesResponse = await axios.get(`${RS_API_URL}?${altFilesQuery}&sign=${altFilesSign}`);
      const altFiles = Array.isArray(altFilesResponse.data) ? altFilesResponse.data : [];
      const altFile = altFiles.find(f => f.ref == altId);
      const fileName = altFile ? altFile.name : `alternative_${altId}.${extension}`;
      
      // If download is requested, proxy the file with download headers
      if (download === 'true') {
        const fileResponse = await axios.get(fileUrl, {
          responseType: 'stream'
        });
        
        // Set headers to force download
        res.setHeader('Content-Type', fileResponse.headers['content-type'] || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        if (fileResponse.headers['content-length']) {
          res.setHeader('Content-Length', fileResponse.headers['content-length']);
        }
        
        // Pipe the file to the response
        fileResponse.data.pipe(res);
      } else {
        // Just redirect for preview
        res.redirect(fileUrl);
      }
    } else {
      res.status(404).json({ success: false, error: 'Alternative file not found' });
    }
  } catch (error) {
    console.error('Error getting alternative file:', error);
    res.status(500).json({ success: false, error: 'Failed to get alternative file' });
  }
});

// Delete alternative file
app.delete('/api/resource/:ref/alternative-file/:fileId', async (req, res) => {
  try {
    const { ref, fileId } = req.params;
    const { sessionKey } = req.query;
    
    const params = new URLSearchParams({
      function: 'delete_alternative_file',
      param1: ref,
      param2: fileId
    });
    
    const query = `user=${RS_USER}&${params.toString()}`;
    const sign = signRequest(query);
    
    const response = await axios.get(`${RS_API_URL}?${query}&sign=${sign}`, {
      headers: {
        'Cookie': `rs_session=${sessionKey}`
      }
    });
    
    res.json({
      success: response.data === true || response.data === 'true',
      message: 'Alternative file deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting alternative file:', error);
    res.status(500).json({ success: false, error: 'Failed to delete alternative file' });
  }
});

// Get resource log
app.get('/api/resource/:ref/log', async (req, res) => {
  try {
    const { ref } = req.params;
    const { sessionKey } = req.query;
    
    const params = new URLSearchParams({
      function: 'get_resource_log',
      param1: ref
    });
    
    const query = `user=${RS_USER}&${params.toString()}`;
    const sign = signRequest(query);
    
    const response = await axios.get(`${RS_API_URL}?${query}&sign=${sign}`);
    
    res.json(response.data || []);
  } catch (error) {
    console.error('Error getting resource log:', error);
    res.status(500).json({ success: false, error: 'Failed to get resource log' });
  }
});

// Check resource access
app.post('/api/resource/:ref/access', async (req, res) => {
  try {
    const { ref } = req.params;
    const { sessionKey } = req.body;
    
    const params = new URLSearchParams({
      function: 'get_resource_access',
      param1: ref
    });
    
    const query = `user=${RS_USER}&${params.toString()}`;
    const sign = signRequest(query);
    
    const response = await axios.get(`${RS_API_URL}?${query}&sign=${sign}`, {
      headers: {
        'Cookie': `rs_session=${sessionKey}`
      }
    });
    
    // Parse access level
    const accessLevel = parseInt(response.data) || 0;
    
    res.json({
      access: accessLevel,
      view: accessLevel >= 0,
      edit: accessLevel >= 1,
      download: accessLevel >= 0,
      comment: accessLevel >= 0
    });
  } catch (error) {
    console.error('Error checking resource access:', error);
    res.status(500).json({ success: false, error: 'Failed to check access' });
  }
});

// Configure multer for resource file uploads
const resourceUploadStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, 'uploads/temp');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const resourceUpload = multer({ 
  storage: resourceUploadStorage,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB
});

// Upload file (for thumbnails and variants)
app.post('/api/resource/:ref/upload', resourceUpload.single('file'), async (req, res) => {
  try {
    const { ref } = req.params;
    const { sessionKey, previewonly, alternative } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    // Create form data for ResourceSpace
    const formData = new FormData();
    formData.append('userfile', fs.createReadStream(file.path), file.originalname);
    
    // Build query parameters
    const params = new URLSearchParams({
      function: 'upload_file',
      param1: ref,
      param2: 'true', // no_exif
      param3: 'false', // revert
      param4: 'false' // autorotate
    });
    
    if (previewonly === 'true') {
      params.append('param5', 'true'); // preview_only
    }
    
    if (alternative) {
      params.append('param6', alternative); // alternative file name
    }
    
    const query = `user=${RS_USER}&${params.toString()}`;
    const sign = signRequest(query);
    
    const response = await axios.post(
      `${RS_API_URL}?${query}&sign=${sign}`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Cookie': `rs_session=${sessionKey}`
        }
      }
    );
    
    // Clean up temp file
    fs.unlinkSync(file.path);
    
    res.json({
      success: response.data === true || response.data === 'true',
      message: previewonly === 'true' ? 'Thumbnail uploaded successfully' : 'File uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    // Clean up temp file on error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, error: 'Failed to upload file' });
  }
});

// Get related resources
app.post('/api/resource/:ref/related', async (req, res) => {
  try {
    const { ref } = req.params;
    const { sessionKey } = req.body;
    
    const params = new URLSearchParams({
      function: 'get_related_resources',
      param1: ref
    });
    
    const query = `user=${RS_USER}&${params.toString()}`;
    const sign = signRequest(query);
    
    const response = await axios.get(`${RS_API_URL}?${query}&sign=${sign}`, {
      headers: {
        'Cookie': `rs_session=${sessionKey}`
      }
    });
    
    res.json(response.data || []);
  } catch (error) {
    console.error('Error getting related resources:', error);
    res.status(500).json({ success: false, error: 'Failed to get related resources' });
  }
});

// Create new collection
app.post('/api/collections/create', async (req, res) => {
  try {
    const { name, type = 0, public: isPublic = 0, sessionKey } = req.body;
    
    // First create a new empty collection
    const createParams = new URLSearchParams({
      function: 'create_collection',
      param1: name
    });
    
    const createQuery = `user=${RS_USER}&${createParams.toString()}`;
    const createSign = signRequest(createQuery);
    
    const createResponse = await axios.get(`${RS_API_URL}?${createQuery}&sign=${createSign}`, {
      headers: {
        'Cookie': `rs_session=${sessionKey}`
      }
    });
    
    const collectionRef = createResponse.data;
    
    if (collectionRef) {
      // Save collection data
      const saveParams = new URLSearchParams({
        function: 'save_collection',
        param1: collectionRef,
        param2: JSON.stringify({
          name: name,
          type: type,
          public: isPublic
        })
      });
      
      const saveQuery = `user=${RS_USER}&${saveParams.toString()}`;
      const saveSign = signRequest(saveQuery);
      
      await axios.get(`${RS_API_URL}?${saveQuery}&sign=${saveSign}`, {
        headers: {
          'Cookie': `rs_session=${sessionKey}`
        }
      });
      
      res.json({
        success: true,
        collection: { ref: collectionRef, name: name }
      });
    } else {
      res.json({ success: false, error: 'Failed to create collection' });
    }
  } catch (error) {
    console.error('Error creating collection:', error);
    res.status(500).json({ success: false, error: 'Failed to create collection' });
  }
});

// Delete collection
app.delete('/api/collections/:collectionId', async (req, res) => {
  try {
    const { collectionId } = req.params;
    const { sessionKey } = req.query;
    
    const params = new URLSearchParams({
      function: 'delete_collection',
      param1: collectionId
    });
    
    const query = `user=${RS_USER}&${params.toString()}`;
    const sign = signRequest(query);
    
    const response = await axios.get(`${RS_API_URL}?${query}&sign=${sign}`, {
      headers: {
        'Cookie': `rs_session=${sessionKey}`
      }
    });
    
    res.json({
      success: response.data === true || response.data === 'true'
    });
  } catch (error) {
    console.error('Error deleting collection:', error);
    res.status(500).json({ success: false, error: 'Failed to delete collection' });
  }
});

// Get user collections
app.post('/api/collections/user', async (req, res) => {
  try {
    const { sessionKey } = req.body;
    
    const params = new URLSearchParams({
      function: 'get_user_collections'
    });
    
    const query = `user=${RS_USER}&${params.toString()}`;
    const sign = signRequest(query);
    
    const response = await axios.get(`${RS_API_URL}?${query}&sign=${sign}`, {
      headers: {
        'Cookie': `rs_session=${sessionKey}`
      }
    });
    
    res.json(response.data || []);
  } catch (error) {
    console.error('Error getting user collections:', error);
    res.status(500).json({ success: false, error: 'Failed to get user collections' });
  }
});

// Get featured collections
app.post('/api/collections/featured', async (req, res) => {
  try {
    const { sessionKey, parent = 0 } = req.body;
    
    const params = new URLSearchParams({
      function: 'get_featured_collections',
      param1: parent
    });
    
    const query = `user=${RS_USER}&${params.toString()}`;
    const sign = signRequest(query);
    
    const response = await axios.get(`${RS_API_URL}?${query}&sign=${sign}`, {
      headers: {
        'Cookie': `rs_session=${sessionKey}`
      }
    });
    
    res.json(response.data || []);
  } catch (error) {
    console.error('Error getting featured collections:', error);
    res.status(500).json({ success: false, error: 'Failed to get featured collections' });
  }
});

// Cache management endpoints
app.get('/api/cache/status', async (req, res) => {
  try {
    const stats = await getCacheStats();
    res.json(stats);
  } catch (error) {
    console.error('Failed to get cache stats:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache statistics'
    });
  }
});

app.post('/api/cache/prefetch', async (req, res) => {
  try {
    const { resourceIds, includeFiles = false } = req.body;
    
    if (!Array.isArray(resourceIds)) {
      return res.status(400).json({
        success: false,
        error: 'resourceIds must be an array'
      });
    }
    
    const result = await prefetchResources(resourceIds, includeFiles);
    res.json(result);
  } catch (error) {
    console.error('Prefetch error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to prefetch resources'
    });
  }
});

app.delete('/api/cache/resource/:ref', async (req, res) => {
  try {
    const { ref } = req.params;
    const result = await evictResource(ref);
    res.json(result);
  } catch (error) {
    console.error('Eviction error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to evict resource'
    });
  }
});

// Annotation API endpoints

// Save annotation metadata
app.post('/api/annotations', async (req, res) => {
  try {
    const { resourceId, resourceType, annotationsJson, frame, timestamp, createdBy } = req.body;
    
    if (!resourceId || !annotationsJson) {
      return res.status(400).json({
        success: false,
        error: 'Resource ID and annotations JSON are required'
      });
    }
    
    const result = annotationsDb.saveAnnotation(
      resourceId,
      resourceType,
      annotationsJson,
      { frame, timestamp, createdBy }
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error saving annotation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save annotation'
    });
  }
});

// Get annotations for a resource
app.get('/api/annotations/:resourceId', async (req, res) => {
  try {
    const { resourceId } = req.params;
    const annotations = annotationsDb.getLatestAnnotation(resourceId);
    
    res.json({
      success: true,
      annotations
    });
  } catch (error) {
    console.error('Error getting annotations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get annotations'
    });
  }
});

// Get all annotations for a resource
app.get('/api/annotations/:resourceId/all', async (req, res) => {
  try {
    const { resourceId } = req.params;
    const annotations = annotationsDb.getAnnotationsByResource(resourceId);
    
    res.json({
      success: true,
      annotations
    });
  } catch (error) {
    console.error('Error getting all annotations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get annotations'
    });
  }
});

// Update annotation
app.put('/api/annotations/:annotationId', async (req, res) => {
  try {
    const { annotationId } = req.params;
    const { annotationsJson } = req.body;
    
    if (!annotationsJson) {
      return res.status(400).json({
        success: false,
        error: 'Annotations JSON is required'
      });
    }
    
    const result = annotationsDb.updateAnnotation(annotationId, annotationsJson);
    res.json(result);
  } catch (error) {
    console.error('Error updating annotation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update annotation'
    });
  }
});

// Delete annotation
app.delete('/api/annotations/:annotationId', async (req, res) => {
  try {
    const { annotationId } = req.params;
    const result = annotationsDb.deleteAnnotation(annotationId);
    res.json(result);
  } catch (error) {
    console.error('Error deleting annotation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete annotation'
    });
  }
});

// Upload alternative file endpoint
const alternativeFileUpload = multer({ 
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadPath = path.join(__dirname, 'temp_uploads');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

app.post('/api/alternative-file', alternativeFileUpload.single('file'), async (req, res) => {
  let tempFilePath = null;
  
  try {
    const { resource, name, description, alt_type } = req.body;
    const file = req.file;
    
    if (!file || !resource || !name) {
      return res.status(400).json({
        success: false,
        error: 'File, resource ID, and name are required'
      });
    }
    
    tempFilePath = file.path;
    
    // Step 1: Create the alternative file entry using add_alternative_file
    const fileName = file.originalname || `annotation_${resource}_${Date.now()}.jpg`;
    const fileExtension = alt_type === 'annotation' ? 'jpg' : path.extname(fileName).slice(1) || 'jpg';
    
    const params = new URLSearchParams({
      function: 'add_alternative_file',
      param1: resource, // resource ref
      param2: name, // name (required) - descriptive name
      param3: description || '', // description
      param4: fileName, // file_name - actual filename
      param5: fileExtension, // file_extension
      param6: file.size.toString(), // file_size in bytes (must be string)
      param7: alt_type || 'annotation' // alt_type for grouping
    });
    
    const query = `user=${RS_USER}&${params.toString()}`;
    const sign = signRequest(query);
    
    console.log('Step 1: Creating alternative file entry...');
    console.log('Parameters:', {
      resource: resource,
      name: name,
      description: description,
      fileName: fileName,
      fileExtension: fileExtension,
      fileSize: file.size,
      alt_type: alt_type
    });
    console.log('API URL:', `${RS_API_URL}?${query}&sign=${sign}`);
    
    const response = await axios.get(`${RS_API_URL}?${query}&sign=${sign}`);
    console.log('add_alternative_file response:', response.data);
    
    if (!response.data || response.data === false || response.data === 'false') {
      throw new Error('Failed to create alternative file entry');
    }
    
    const alternativeFileId = response.data;
    
    // Step 2: Upload the actual file using upload_multipart
    // Build the query string for the signature (including user)
    const uploadQueryData = {
      user: RS_USER,
      function: 'upload_multipart',
      ref: resource,
      no_exif: 1,
      revert: 0,
      alternative: alternativeFileId  // This is the key parameter for alternative files
    };
    
    // Create query string in the exact order
    const uploadQuery = Object.entries(uploadQueryData)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    
    // Sign the query
    const uploadSign = signRequest(uploadQuery);
    
    // Prepare multipart form data
    const formData = new FormData();
    formData.append('query', uploadQuery);
    formData.append('sign', uploadSign);
    formData.append('user', RS_USER);
    formData.append('file', fs.createReadStream(tempFilePath), {
      filename: fileName,
      contentType: 'image/jpeg'
    });
    
    console.log('Step 2: Uploading file to alternative file ID:', alternativeFileId);
    console.log('Upload query:', uploadQuery);
    
    const uploadResponse = await axios.post(RS_API_URL, formData, {
      headers: {
        ...formData.getHeaders()
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    console.log('upload_multipart response status:', uploadResponse.status);
    
    // Clean up temp file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    
    // Check if upload was successful (204 status expected)
    if (uploadResponse.status === 204 || uploadResponse.status === 200) {
      res.json({
        success: true,
        data: {
          ref: alternativeFileId,
          message: 'Alternative file created and uploaded successfully'
        }
      });
    } else {
      throw new Error(`Upload failed with status ${uploadResponse.status}`);
    }
  } catch (error) {
    console.error('Error handling alternative file:', error);
    console.error('Error details:', error.response?.data);
    console.error('Error stack:', error.stack);
    console.error('Request body:', req.body);
    console.error('File info:', req.file);
    
    // Clean up temp file on error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to handle alternative file',
      details: error.response?.data
    });
  }
});

app.listen(PORT, async () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`ResourceSpace API URL: ${RS_API_URL}`);
  console.log(`Cache API URL: ${process.env.CACHE_API_URL || 'http://cache_api:8000'}`);
  
  // Check cache API health
  try {
    const cacheHealthy = await checkCacheHealth();
    console.log(`Cache API status: ${cacheHealthy ? 'HEALTHY' : 'UNAVAILABLE'}`);
    if (!cacheHealthy) {
      console.warn('Cache API is not available - falling back to direct RS API calls');
    }
  } catch (error) {
    console.error('Could not check cache API health:', error.message);
  }
});