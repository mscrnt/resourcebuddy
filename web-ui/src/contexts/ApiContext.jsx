import { createContext, useContext } from 'react'
import resourceSpaceApi from '../lib/resourcespace-api-backend'
import resourceSpaceApiAuthenticated from '../lib/resourcespace-api-authenticated'
import useAuthStore from '../stores/useAuthStore'

const ApiContext = createContext(null)

export const ApiProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore()
  
  // Use authenticated API when logged in, otherwise use the regular API for public endpoints
  const api = isAuthenticated ? resourceSpaceApiAuthenticated : resourceSpaceApi
  
  // Add user info to API
  api.user = user
  
  return (
    <ApiContext.Provider value={api}>
      {children}
    </ApiContext.Provider>
  )
}

export const useApi = () => {
  const context = useContext(ApiContext)
  if (!context) {
    throw new Error('useApi must be used within ApiProvider')
  }
  return context
}

export default ApiContext