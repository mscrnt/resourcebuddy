// This module extends the backend API with session key support
import resourceSpaceApi from './resourcespace-api-backend'
import useAuthStore from '../stores/useAuthStore'

// Create a wrapper that automatically includes the session key
const resourceSpaceApiAuthenticated = {
  ...resourceSpaceApi,
  
  // Override each method to include session key from auth store
  searchResources: async (search = '', options = {}) => {
    const sessionKey = useAuthStore.getState().getCredentials()?.sessionKey
    return resourceSpaceApi.searchResources(search, options, sessionKey)
  },

  getResource: async (ref) => {
    const sessionKey = useAuthStore.getState().getCredentials()?.sessionKey
    return resourceSpaceApi.getResource(ref, sessionKey)
  },

  getResourceFieldData: async (ref) => {
    const sessionKey = useAuthStore.getState().getCredentials()?.sessionKey
    return resourceSpaceApi.getResourceFieldData(ref, sessionKey)
  },

  getUserCollections: async () => {
    const sessionKey = useAuthStore.getState().getCredentials()?.sessionKey
    return resourceSpaceApi.getUserCollections(sessionKey)
  },

  getFeaturedCollections: async () => {
    const sessionKey = useAuthStore.getState().getCredentials()?.sessionKey
    return resourceSpaceApi.getFeaturedCollections(sessionKey)
  },

  getCollectionResources: async (collection) => {
    const sessionKey = useAuthStore.getState().getCredentials()?.sessionKey
    return resourceSpaceApi.getCollectionResources(collection, sessionKey)
  },

  getResourcePath: async (ref, size = '') => {
    const sessionKey = useAuthStore.getState().getCredentials()?.sessionKey
    return resourceSpaceApi.getResourcePath(ref, size, sessionKey)
  },

  getSystemStatus: async () => {
    const sessionKey = useAuthStore.getState().getCredentials()?.sessionKey
    return resourceSpaceApi.getSystemStatus(sessionKey)
  }
}

export default resourceSpaceApiAuthenticated