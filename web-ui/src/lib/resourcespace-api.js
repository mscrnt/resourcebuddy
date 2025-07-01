import axios from 'axios'
import CryptoJS from 'crypto-js'

const API_KEY = import.meta.env.VITE_RS_API_KEY
const API_USER = import.meta.env.VITE_RS_USER
const API_URL = import.meta.env.VITE_RS_API_URL

// Use direct URL - CORS must be handled by ResourceSpace or browser extension
const BASE_URL = API_URL || 'https://mscrnt.free.resourcespace.com/api'

// Create axios instance
const rsApi = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
})

// Helper to sign API requests
function signRequest(query) {
  // ResourceSpace expects: SHA256(api_key + query_string)
  const signature = CryptoJS.SHA256(API_KEY + query).toString()
  return signature
}

// Helper to build query string - order matters for ResourceSpace!
function buildQueryString(functionName, params) {
  // Build ordered params array - user and function must be first
  const orderedParams = [
    ['user', API_USER],
    ['function', functionName]
  ]
  
  // Add remaining params - ResourceSpace uses param1, param2, etc.
  Object.keys(params).forEach(key => {
    const value = params[key]
    if (value !== undefined && value !== null) {
      // Convert booleans to 0/1 as expected by ResourceSpace
      let stringValue = typeof value === 'boolean' ? (value ? '1' : '0') : String(value)
      orderedParams.push([key, stringValue])
    }
  })
  
  // Build query string manually to ensure proper encoding
  return orderedParams
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&')
}

// Make ResourceSpace API call
async function rsApiCall(functionName, params = {}) {
  try {
    console.log('Making API call:', functionName, params)
    console.log('BASE_URL:', BASE_URL)
    console.log('API_USER:', API_USER)
    console.log('API_KEY exists:', !!API_KEY)
    
    // Build query string (without sign parameter)
    const queryString = buildQueryString(functionName, params)
    
    // Sign the request
    const signature = signRequest(queryString)
    
    // Add signature to the query string
    const fullQuery = `${queryString}&sign=${signature}`
    
    console.log('Query string:', queryString)
    console.log('Signature:', signature)
    console.log('Full API Request:', BASE_URL + '?' + fullQuery)
    
    // Make GET request with query in URL (ResourceSpace style)
    // Note: ResourceSpace API typically uses GET requests
    const response = await rsApi.get('', { 
      params: Object.fromEntries(new URLSearchParams(fullQuery))
    })
    
    console.log('API Response:', response.data)
    return response.data
  } catch (error) {
    console.error('ResourceSpace API Error:', error)
    if (error.response) {
      console.error('Response status:', error.response.status)
      console.error('Response data:', error.response.data)
      console.error('Response headers:', error.response.headers)
    }
    throw error
  }
}

// API Functions
export const resourceSpaceApi = {
  // Search resources
  searchResources: async (search = '', options = {}) => {
    return rsApiCall('do_search', {
      param1: search, // search string
      param2: options.restypes || '', // resource types
      param3: options.order_by || 'relevance', // order by
      param4: options.archive || '0', // archive state
      param5: options.fetchrows || 50, // number of results
      param6: options.sort || 'DESC', // sort order
      param7: options.offset || 0, // offset for pagination
    })
  },

  // Get resource data
  getResource: async (ref) => {
    return rsApiCall('get_resource_data', {
      param1: ref
    })
  },

  // Get resource field data
  getResourceFieldData: async (ref) => {
    return rsApiCall('get_resource_field_data', {
      param1: ref
    })
  },

  // Get collections
  getUserCollections: async () => {
    return rsApiCall('get_user_collections', {
      param1: API_USER
    })
  },

  // Get featured collections
  getFeaturedCollections: async () => {
    return rsApiCall('get_featured_collections', {
      param1: 0, // parent
      param2: 'themearray' // context
    })
  },

  // Get collection resources
  getCollectionResources: async (collection) => {
    return rsApiCall('get_collection_resources', {
      param1: collection
    })
  },

  // Get resource path/URL
  getResourcePath: async (ref, size = '') => {
    return rsApiCall('get_resource_path', {
      param1: ref,
      param2: false, // getfilepath
      param3: size, // size code (thm, pre, etc)
      param4: true, // generate if not exists
      param5: 'jpg', // extension
      param6: true, // scramble
      param7: 1, // page
      param8: false, // watermarked
    })
  },

  // Get system status (for testing)
  getSystemStatus: async () => {
    return rsApiCall('get_system_status')
  },
  
  // User authentication - validate credentials
  // Note: login function doesn't require a user parameter
  validateUser: async (username, password) => {
    try {
      // Build query string without user parameter for login function
      const params = [
        ['function', 'login'],
        ['username', username],
        ['password', password]
      ]
      
      const queryString = params
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&')
      
      // Sign the request with admin API key
      const signature = signRequest(queryString)
      const fullQuery = `${queryString}&sign=${signature}`
      
      console.log('Login query string:', queryString)
      console.log('Login URL:', BASE_URL + '?' + fullQuery)
      
      const response = await rsApi.get('', {
        params: Object.fromEntries(new URLSearchParams(fullQuery))
      })
      console.log('Login response:', response.data)
      
      // login function returns a session key string if successful, empty string or false if failed
      if (response.data && response.data !== '' && response.data !== 'false' && response.data !== false) {
        // Clean up the session key (remove quotes if present)
        const sessionKey = String(response.data).replace(/"/g, '').trim()
        
        if (sessionKey) {
          return {
            success: true,
            sessionKey: sessionKey,
          }
        }
      }
      
      return {
        success: false,
        error: 'Invalid username or password',
      }
    } catch (error) {
      console.error('Login error:', error)
      return {
        success: false,
        error: 'Login failed',
      }
    }
  },
}

export default resourceSpaceApi