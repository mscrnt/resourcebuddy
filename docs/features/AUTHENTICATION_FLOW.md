# ResourceSpace Authentication Flow

This document describes how the authentication system works with ResourceSpace session keys.

## Overview

The authentication system now properly uses ResourceSpace session keys instead of always using the admin API key for authenticated requests.

## Authentication Flow

1. **User Login**
   - User provides username and password
   - Frontend calls `api_login` function via the ResourceSpace API
   - `api_login` returns a session-specific API key if credentials are valid

2. **Session Key Storage**
   - The session key is stored in the auth store (Zustand)
   - Session key is persisted in localStorage for page refreshes
   - Password is kept in memory for the session duration

3. **Authenticated API Calls**
   - When making API calls, the system checks if a session key is available
   - If session key exists:
     - Uses `authmode=sessionkey` parameter
     - Signs requests with the session key
   - If no session key (fallback):
     - Signs requests with the admin API key
     - Acts on behalf of the logged-in user

## Key Components

### 1. Auth Store (`useAuthStore.js`)
```javascript
{
  user: { username, sessionKey },
  password: string,
  sessionKey: string,
  isAuthenticated: boolean
}
```

### 2. API Client (`resourcespace-api-authenticated.js`)
- Automatically detects if session key is available
- Adds `authmode=sessionkey` when using session keys
- Signs requests with appropriate key (session or admin)

### 3. Login Process (`LoginPage.jsx`)
1. Calls `resourceSpaceApi.validateUser(username, password)`
2. Stores returned session key in auth store
3. Redirects to requested page

## Security Considerations

1. **Session Keys**
   - Unique per user session
   - More secure than using admin key for all requests
   - Tied to user's current session in ResourceSpace

2. **Password Storage**
   - Currently stored in memory (not persisted)
   - Should be encrypted in production
   - Cleared on logout

3. **API Key Usage**
   - Admin key only used for initial login
   - Session key used for all subsequent authenticated requests
   - Reduces exposure of admin credentials

## Testing

To test the authentication flow:

```javascript
// In browser console
await testAuthFlow('username', 'password')
```

This will:
1. Login with provided credentials
2. Store the session key
3. Make an authenticated API call
4. Verify the session key is being used correctly

## Benefits

1. **Better Security**: Each user has their own session key
2. **Proper User Context**: Actions are performed as the logged-in user
3. **Session Management**: Keys are tied to ResourceSpace sessions
4. **Reduced Admin Key Exposure**: Admin key only used for login