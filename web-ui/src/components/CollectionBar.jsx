import { useState, useEffect } from 'react'
import { X, FolderOpen, ChevronUp, ChevronDown } from 'lucide-react'
import axios from 'axios'
import useAuthStore from '../stores/useAuthStore'
import useSettingsStore from '../stores/useSettingsStore'
import { cn } from '../lib/utils'

export default function CollectionBar({ 
  collection, 
  onClose, 
  onAddResources,
  selectedResources = new Set()
}) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(false)
  const { sessionKey, user } = useAuthStore()
  const { getSetting, fetchSettings } = useSettingsStore()

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings()
  }, [])
  
  // Fetch collection resources
  useEffect(() => {
    if (collection?.ref) {
      fetchCollectionResources()
    }
  }, [collection])

  const fetchCollectionResources = async () => {
    setLoading(true)
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/search`,
        {
          search: `!collection${collection.ref}`,
          restypes: '',
          order_by: 'relevance',
          archive: 0,
          fetchrows: 100,
          offset: 0,
          sessionKey
        }
      )
      
      if (response.data) {
        setResources(Array.isArray(response.data) ? response.data : [])
      }
    } catch (error) {
      console.error('Failed to fetch collection resources:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddSelectedToCollection = async () => {
    if (selectedResources.size === 0 || !collection?.ref) return

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/collections/${collection.ref}/resources/batch`,
        {
          resourceIds: Array.from(selectedResources),
          sessionKey
        }
      )

      if (response.data.success) {
        // Refresh collection
        fetchCollectionResources()
        if (onAddResources) {
          onAddResources(response.data.message)
        }
      }
    } catch (error) {
      console.error('Failed to add resources to collection:', error)
    }
  }

  const handleRemoveResource = async (resourceRef) => {
    try {
      const response = await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/collections/${collection.ref}/resources/${resourceRef}?sessionKey=${sessionKey}`
      )

      if (response.data.success) {
        // Remove from local state
        setResources(prev => prev.filter(r => r.ref !== resourceRef))
      }
    } catch (error) {
      console.error('Failed to remove resource from collection:', error)
    }
  }

  // Check if collection bar is enabled
  const isEnabled = getSetting('enableCollectionBar') !== false
  
  console.log('CollectionBar - collection:', collection, 'isEnabled:', isEnabled, 'setting value:', getSetting('enableCollectionBar'))

  if (!collection || !isEnabled) return null

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 bg-art-darker border-t border-art-gray-800 transition-all duration-300 z-40",
      isMinimized ? "h-12" : "h-48"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-2 bg-art-gray-900/50">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-5 w-5 text-art-accent" />
          <div>
            <h3 className="text-white font-medium">{collection.name}</h3>
            {!isMinimized && (
              <p className="text-xs text-art-gray-400">
                {resources.length} resources
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedResources.size > 0 && (
            <button
              onClick={handleAddSelectedToCollection}
              className="px-4 py-1.5 bg-art-accent text-white text-sm rounded-lg hover:bg-art-accent-dark transition-colors flex items-center gap-2"
            >
              <i className="fas fa-plus"></i>
              Add {selectedResources.size} Selected
            </button>
          )}

          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-2 text-art-gray-400 hover:text-white transition-colors"
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          <button
            onClick={onClose}
            className="p-2 text-art-gray-400 hover:text-white transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="p-4 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-art-accent"></div>
            </div>
          ) : resources.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-art-gray-500">
              <div className="text-center">
                <i className="fas fa-folder-open text-3xl mb-2"></i>
                <p>Collection is empty</p>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              {resources.map(resource => (
                <div
                  key={resource.ref}
                  className="relative group flex-shrink-0"
                >
                  <div className="w-32 h-24 bg-art-gray-800 rounded overflow-hidden">
                    <img
                      src={`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/resource/${resource.ref}/preview`}
                      alt={resource.field8 || 'Resource'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Remove button */}
                  <button
                    onClick={() => handleRemoveResource(resource.ref)}
                    className="absolute top-1 right-1 p-1 bg-black/70 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove from collection"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                  
                  {/* Title */}
                  <div className="absolute bottom-0 left-0 right-0 p-1 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="text-xs text-white truncate">
                      {resource.field8 || `Resource ${resource.ref}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}