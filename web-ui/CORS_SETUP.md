# CORS Setup for ResourceSpace Integration

Since we're making direct API calls to ResourceSpace from the browser, you'll need to handle CORS (Cross-Origin Resource Sharing) in one of the following ways:

## Option 1: Configure ResourceSpace Server (Recommended for Production)

Add the following headers to your ResourceSpace server configuration:

### Apache (.htaccess or httpd.conf)
```apache
Header set Access-Control-Allow-Origin "http://localhost:3000"
Header set Access-Control-Allow-Methods "GET, POST, OPTIONS"
Header set Access-Control-Allow-Headers "Content-Type, Accept"
Header set Access-Control-Allow-Credentials "true"
```

For production, replace `http://localhost:3000` with your actual domain.

### Nginx
```nginx
location /api {
    add_header 'Access-Control-Allow-Origin' 'http://localhost:3000' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Content-Type, Accept' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;
    
    if ($request_method = 'OPTIONS') {
        return 204;
    }
}
```

## Option 2: Use a Browser Extension (Development Only)

For development purposes, you can use a CORS browser extension:

1. **Chrome**: Install "CORS Unblock" or "Allow CORS" extension
2. **Firefox**: Install "CORS Everywhere" extension
3. **Edge**: Install "CORS Unblock" extension

⚠️ **Warning**: Only use browser extensions for development. Never rely on them for production.

## Option 3: Set up a Backend Proxy (Alternative)

If you cannot modify the ResourceSpace server, you can create a backend proxy:

1. Create a simple Node.js/Express server
2. Configure it to proxy requests to ResourceSpace
3. Add appropriate CORS headers to your proxy server

Example Express proxy:
```javascript
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

app.use('/api', createProxyMiddleware({
  target: 'https://your-resourcespace-domain.com',
  changeOrigin: true,
  onProxyRes: function (proxyRes, req, res) {
    proxyRes.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000';
  }
}));

app.listen(3001);
```

## Testing CORS

To verify CORS is working:

1. Open your browser's Developer Tools (F12)
2. Go to the Network tab
3. Try to log in or make an API call
4. Check for CORS-related errors in the Console
5. Verify the response headers include the necessary CORS headers

## Security Considerations

- Always use specific origins instead of `*` for `Access-Control-Allow-Origin`
- Only allow the minimum required methods and headers
- For production, ensure CORS is configured on the server, not via browser extensions
- Consider implementing additional security measures like API rate limiting