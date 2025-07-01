require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const cors = require('cors');
const multer = require('multer');
const FormData = require('form-data');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3002', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is working!' });
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

// Generic API proxy endpoint
app.post('/api/proxy', async (req, res) => {
  try {
    const { function: fn, params = {}, sessionKey } = req.body;
    
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
    
    console.log('API request:', fn, 'with params:', Object.keys(params).length);
    
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
    
    console.log('API response for', fn, ':', response.data);
    res.json(response.data);
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

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});