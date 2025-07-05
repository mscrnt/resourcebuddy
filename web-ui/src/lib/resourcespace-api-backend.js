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
    try {
      const response = await axios.post(`${BACKEND_URL}/api/collections/user`, {
        sessionKey
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user collections:', error);
      throw error;
    }
  },

  // Get featured collections
  getFeaturedCollections: async (sessionKey = null) => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/collections/featured`, {
        sessionKey,
        parent: 0 // Root level
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching featured collections:', error);
      throw error;
    }
  },

  // Get collection resources
  getCollectionResources: async (collection, sessionKey = null) => {
    return resourceSpaceApi.apiCall('get_collection_resources', {
      param1: collection
    }, sessionKey)
  },

  // Get resource path/URL
  getResourcePath: async (ref, size = '', sessionKey = null, forceOriginal = false, extension = null) => {
    // For videos and when forceOriginal is true, we need to get the original file
    // not a jpg preview
    const fileExt = forceOriginal && extension ? extension : 'jpg'
    const generateIfMissing = forceOriginal ? 0 : 1  // Don't generate for original files
    
    return resourceSpaceApi.apiCall('get_resource_path', {
      param1: ref,              // resource ID
      param2: '',               // not_used (should be empty string)
      param3: size || '',       // size code (thm, pre, scr, etc) - empty for original
      param4: generateIfMissing,// generate if not exists (0 for originals)
      param5: fileExt,          // extension (use actual extension for videos)
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

  // Get nodes for a field with search
  getNodes: async (fieldId, parent = null, recursive = false, offset = 0, limit = 50, query = '', sessionKey = null) => {
    return resourceSpaceApi.apiCall('get_nodes', {
      param1: fieldId,
      param2: parent,
      param3: recursive,
      param4: offset,
      param5: limit,
      param6: query
    }, sessionKey)
  },

  // Add resource nodes (for fixed list fields)
  addResourceNodes: async (resourceId, nodeIds, sessionKey = null) => {
    return resourceSpaceApi.apiCall('add_resource_nodes', {
      param1: resourceId,
      param2: nodeIds // Comma-separated list of node IDs
    }, sessionKey)
  },

  /**
   * Perform a search and return matching resources
   * @param {string} search - The search string in ResourceSpace format
   * @param {string} restypes - Resource type IDs to include (e.g., "1,2")
   * @param {string} orderBy - Order results by: relevance, popularity, rating, date, colour, country, title, file_path, resourceid, resourcetype, titleandcountry, random, status
   * @param {number} archive - Archive status: 0=active, 1=pending archive, 2=archived, 3=deleted, -1=pending review, -2=pending submission
   * @param {string|number} fetchrows - Max rows to return, or "offset,limit" for pagination
   * @param {string} sort - Sort order: "asc" or "desc"
   * @param {number} offset - Starting offset for results (deprecated if using fetchrows with comma)
   * @param {string|null} sessionKey - Session key for authenticated requests
   * @returns {Promise<Array|Object>} Array of resources or object with {total, data} if using offset,limit
   */
  doSearch: async (search = '', restypes = '', orderBy = 'relevance', archive = 0, fetchrows = -1, sort = 'desc', offset = 0, sessionKey = null) => {
    return resourceSpaceApi.apiCall('do_search', {
      param1: search,
      param2: restypes,
      param3: orderBy,
      param4: archive,
      param5: fetchrows,
      param6: sort,
      param7: offset
    }, sessionKey)
  },

  // Get all resource types
  getResourceTypes: async (sessionKey = null) => {
    return resourceSpaceApi.apiCall('get_resource_types', {}, sessionKey)
  },

  // Get detailed resource field data
  getResourceFieldData: async (ref, sessionKey) => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/resource/${ref}/field-data`, {
        sessionKey
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching resource field data:', error);
      throw error;
    }
  },

  // Update resource field
  updateResourceField: async (ref, fieldRef, value, sessionKey) => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/resource/${ref}/field/${fieldRef}`, {
        value,
        sessionKey
      });
      return response.data;
    } catch (error) {
      console.error('Error updating resource field:', error);
      throw error;
    }
  },

  // Update resource type
  updateResourceType: async (ref, resourceType, sessionKey) => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/resource/${ref}/type`, {
        resource_type: resourceType,
        sessionKey
      });
      return response.data;
    } catch (error) {
      console.error('Error updating resource type:', error);
      throw error;
    }
  },

  // Get alternative files
  getAlternativeFiles: async (ref, sessionKey) => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/resource/${ref}/alternative-files`, {
        sessionKey
      });
      return response.data;
    } catch (error) {
      console.error('Error getting alternative files:', error);
      throw error;
    }
  },

  getResourceLog: async (ref, sessionKey) => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/resource/${ref}/log`, {
        params: { sessionKey }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting resource log:', error);
      throw error;
    }
  },

  // Delete alternative file
  deleteAlternativeFile: async (ref, fileId, sessionKey) => {
    try {
      const response = await axios.delete(
        `${BACKEND_URL}/api/resource/${ref}/alternative-file/${fileId}?sessionKey=${sessionKey}`
      );
      return response.data;
    } catch (error) {
      console.error('Error deleting alternative file:', error);
      throw error;
    }
  },

  // Check resource access
  checkResourceAccess: async (ref, sessionKey) => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/resource/${ref}/access`, {
        sessionKey
      });
      return response.data;
    } catch (error) {
      console.error('Error checking resource access:', error);
      throw error;
    }
  },

  // Get related resources via backend
  getRelatedResourcesBackend: async (ref, sessionKey) => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/resource/${ref}/related`, {
        sessionKey
      });
      return response.data;
    } catch (error) {
      console.error('Error getting related resources:', error);
      throw error;
    }
  }
}

const API_USER = import.meta.env.VITE_RS_USER

// Helper function to get preview URL directly from backend
export const getResourcePreviewUrl = (ref, size = 'thm') => {
  return `${BACKEND_URL}/api/resource/${ref}/preview?size=${size}`
}

export default resourceSpaceApi