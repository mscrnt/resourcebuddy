import axios from 'axios'

// Use backend URL - hardcoded for now to bypass env issues
const BACKEND_URL = 'http://localhost:3003'

console.log('Backend URL:', BACKEND_URL)
console.log('Environment:', import.meta.env)

// Create axios instance for backend
const backendApi = axios.create({
  baseURL: BACKEND_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// API Functions using backend proxy
export const resourceSpaceApi = {
  // User authentication
  validateUser: async (username, password) => {
    try {
      const response = await backendApi.post('/api/login', {
        username,
        password
      })
      
      return response.data
    } catch (error) {
      console.error('Login error:', error)
      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Invalid username or password'
        }
      }
      return {
        success: false,
        error: 'Login failed'
      }
    }
  },

  // Generic API call through backend
  apiCall: async (functionName, params = {}, sessionKey = null) => {
    try {
      const response = await backendApi.post('/api/proxy', {
        function: functionName,
        params,
        sessionKey
      })
      
      return response.data
    } catch (error) {
      console.error('API call error:', error)
      throw error
    }
  },

  // Search resources
  searchResources: async (search = '', options = {}, sessionKey = null) => {
    // Handle special search for user uploads
    if (search && search.startsWith('!myuploads')) {
      const userId = search.split(':')[1] || ''
      if (userId) {
        // Use the contributions search with all archive states
        search = `!contributions${userId}`
        options.archive = options.archive || '-2,-1,0,1,2,3'
        options.restypes = options.restypes || ''
      }
    }
    
    const searchParams = {
      param1: search, // search string
      param2: options.restypes || '', // resource types
      param3: options.order_by || 'relevance', // order by
      param4: options.archive || '0', // archive state
      param5: options.fetchrows || 50, // number of results
      param6: options.sort || 'DESC', // sort order
      param7: options.offset || 0, // offset for pagination
    }
    
    return resourceSpaceApi.apiCall('do_search', searchParams, sessionKey)
  },

  // Get resource data
  getResource: async (ref, sessionKey = null) => {
    return resourceSpaceApi.apiCall('get_resource_data', {
      param1: ref
    }, sessionKey)
  },

  // Get resource field data
  getResourceFieldData: async (ref, sessionKey = null) => {
    return resourceSpaceApi.apiCall('get_resource_field_data', {
      param1: ref
    }, sessionKey)
  },

  // Get user collections
  getUserCollections: async (sessionKey = null) => {
    return resourceSpaceApi.apiCall('get_user_collections', {
      param1: API_USER
    }, sessionKey)
  },

  // Get featured collections
  getFeaturedCollections: async (sessionKey = null) => {
    return resourceSpaceApi.apiCall('get_featured_collections', {
      param1: 0, // parent
      param2: 'themearray' // context
    }, sessionKey)
  },

  // Get collection resources
  getCollectionResources: async (collection, sessionKey = null) => {
    return resourceSpaceApi.apiCall('get_collection_resources', {
      param1: collection
    }, sessionKey)
  },

  // Get resource path/URL
  getResourcePath: async (ref, size = '', sessionKey = null) => {
    return resourceSpaceApi.apiCall('get_resource_path', {
      param1: ref,              // resource ID
      param2: '',               // not_used (should be empty string)
      param3: size || '',       // size code (thm, pre, scr, etc)
      param4: 1,                // generate if not exists
      param5: 'jpg',            // extension
      param6: 1,                // page (for multi-page docs)
      param7: 0,                // watermarked (0 = no)
      param8: -1,               // alternative (-1 = original)
    }, sessionKey)
  },

  // Get system status (for testing)
  getSystemStatus: async (sessionKey = null) => {
    return resourceSpaceApi.apiCall('get_system_status', {}, sessionKey)
  },

  // Get related resources
  getRelatedResources: async (ref, sessionKey = null) => {
    return resourceSpaceApi.apiCall('get_related_resources', {
      param1: ref
    }, sessionKey)
  },

  // Check permission
  checkPermission: async (permission, sessionKey = null) => {
    return resourceSpaceApi.apiCall('checkperm', {
      param1: permission
    }, sessionKey)
  },

  // Check collection permission
  checkCollectionPermission: async (collectionId, permission, sessionKey = null) => {
    return resourceSpaceApi.apiCall('collection_readable', {
      param1: collectionId,
      param2: permission
    }, sessionKey)
  },

  // Create resource
  createResource: async (options = {}, sessionKey = null) => {
    console.log('Creating resource with options:', options)
    
    const result = await resourceSpaceApi.apiCall('create_resource', {
      param1: options.resource_type || 1,
      param2: options.archive !== undefined ? options.archive : 999,
      param3: options.url || '', // URL parameter (empty for local uploads)
      param4: options.no_exif || false,
      param5: options.revert || false,
      param6: options.autorotate || false,
      param7: options.metadata ? JSON.stringify(options.metadata) : ''
    }, sessionKey)
    
    console.log('Create resource result:', result)
    
    // The API returns just the ref number, not an object
    if (result && typeof result === 'number') {
      return { ref: result }
    } else if (result && typeof result === 'string') {
      if (result.startsWith('FAILED:')) {
        throw new Error(result)
      }
      // Sometimes the API returns the ref as a string
      const numResult = parseInt(result)
      if (!isNaN(numResult)) {
        return { ref: numResult }
      }
    } else if (result === false) {
      throw new Error('Permission denied or invalid resource type')
    }
    
    throw new Error(`Failed to create resource. Response: ${JSON.stringify(result)}`)
  },

  // Upload file using multipart
  uploadMultipart: async (ref, file, options = {}, sessionKey = null) => {
    const formData = new FormData()
    formData.append('file', file) // ResourceSpace expects 'file' not 'userfile'
    formData.append('ref', ref)
    formData.append('no_exif', options.no_exif ? 'true' : 'false')
    formData.append('revert', options.revert ? 'true' : 'false')
    
    try {
      const response = await backendApi.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (options.onProgress && progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            options.onProgress(percent)
          }
        }
      })
      
      return response.data
    } catch (error) {
      console.error('Upload error:', error)
      throw error
    }
  },

  // Update resource data
  updateResourceData: async (ref, metadata, sessionKey = null) => {
    return resourceSpaceApi.apiCall('put_resource_data', {
      param1: ref,
      param2: metadata // Pass as object, not JSON string
    }, sessionKey)
  },

  // Add resource to collection
  addResourceToCollection: async (resourceRef, collectionRef, sessionKey = null) => {
    return resourceSpaceApi.apiCall('add_resource_to_collection', {
      param1: resourceRef,
      param2: collectionRef
    }, sessionKey)
  },

  // Relate resources
  relateResources: async (ref1, ref2, sessionKey = null) => {
    return resourceSpaceApi.apiCall('update_related_resource', {
      param1: ref1,
      param2: ref2,
      param3: 1 // Add relationship
    }, sessionKey)
  },

  // Get resource type fields
  getResourceTypeFields: async (resourceType, sessionKey = null) => {
    return resourceSpaceApi.apiCall('get_resource_type_fields', {
      param1: resourceType ? resourceType.toString() : '', // Filter by resource type
      param2: '', // Find parameter
      param3: '' // Filter by field types
    }, sessionKey)
  },

  // Get field options (nodes)
  getFieldOptions: async (fieldId, nodeInfo = false, sessionKey = null) => {
    return resourceSpaceApi.apiCall('get_field_options', {
      param1: fieldId,
      param2: nodeInfo
    }, sessionKey)
  },

  // Add resource nodes (for fixed list fields)
  addResourceNodes: async (resourceId, nodeIds, sessionKey = null) => {
    return resourceSpaceApi.apiCall('add_resource_nodes', {
      param1: resourceId,
      param2: nodeIds // Comma-separated list of node IDs
    }, sessionKey)
  },

  // Get all resource types
  getResourceTypes: async (sessionKey = null) => {
    return resourceSpaceApi.apiCall('get_resource_types', {}, sessionKey)
  }
}

const API_USER = import.meta.env.VITE_RS_USER

export default resourceSpaceApi