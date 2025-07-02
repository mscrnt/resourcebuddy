import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import useAuthStore from '../stores/useAuthStore'
import resourceSpaceApi from '../lib/resourcespace-api-backend'
import ResourceModalEnhanced from '../components/ResourceModalEnhanced'

export default function SharePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { isAuthenticated, sessionKey } = useAuthStore()
  const [resource, setResource] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [accessDenied, setAccessDenied] = useState(false)
  
  const resourceId = searchParams.get('resource')
  const collectionId = searchParams.get('collection')
  
  useEffect(() => {
    if (!resourceId) {
      setError('No resource specified')
      setLoading(false)
      return
    }
    
    loadResource()
  }, [resourceId, isAuthenticated])
  
  const loadResource = async () => {
    try {
      // Check if user has access
      if (isAuthenticated) {
        const access = await resourceSpaceApi.checkResourceAccess(resourceId, sessionKey)
        if (!access.view) {
          setAccessDenied(true)
          setLoading(false)
          return
        }
      }
      
      // Load resource
      const resourceData = await resourceSpaceApi.getResource(resourceId, sessionKey)
      setResource(resourceData)
      
    } catch (err) {
      console.error('Failed to load shared resource:', err)
      setError('Failed to load resource')
    } finally {
      setLoading(false)
    }
  }
  
  const handleClose = () => {
    // Navigate to appropriate page based on context
    if (collectionId) {
      navigate(`/collections/${collectionId}`)
    } else if (searchParams.get('search')) {
      const params = new URLSearchParams()
      searchParams.forEach((value, key) => {
        if (key !== 'resource' && key !== 'collection') {
          params.set(key, value)
        }
      })
      navigate(`/?${params.toString()}`)
    } else {
      navigate('/')
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-art-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-art-accent"></div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-art-dark flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
          <p className="text-xl text-white mb-2">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-art-accent text-white rounded hover:bg-art-accent-dark"
          >
            Go to Browse
          </button>
        </div>
      </div>
    )
  }
  
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-art-dark flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-lock text-4xl text-yellow-500 mb-4"></i>
          <p className="text-xl text-white mb-2">Access Denied</p>
          <p className="text-art-gray-400 mb-4">You don't have permission to view this resource.</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-art-accent text-white rounded hover:bg-art-accent-dark"
          >
            Go to Browse
          </button>
        </div>
      </div>
    )
  }
  
  if (!resource) {
    return null
  }
  
  // Build search params for context
  const contextSearchParams = {}
  searchParams.forEach((value, key) => {
    if (key !== 'resource' && key !== 'collection') {
      contextSearchParams[key] = value
    }
  })
  
  return (
    <ResourceModalEnhanced
      resource={resource}
      isOpen={true}
      onClose={handleClose}
      onNext={() => {}} // No navigation in share view
      onPrevious={() => {}}
      hasNext={false}
      hasPrevious={false}
      context={collectionId ? 'collection' : 'search'}
      searchParams={contextSearchParams}
      collectionId={collectionId}
    />
  )
}