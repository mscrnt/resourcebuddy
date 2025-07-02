import { useState, useEffect } from 'react'
import { X, FolderOpen, ChevronUp, ChevronDown, Plus, MoreVertical, Search, Eye, Trash2, Download, Share2, FolderPlus } from 'lucide-react'
import axios from 'axios'
import useAuthStore from '../stores/useAuthStore'
import useSettingsStore from '../stores/useSettingsStore'
import { cn } from '../lib/utils'
import { useNavigate } from 'react-router-dom'
import resourceSpaceApi from '../lib/resourcespace-api-backend'

export default function CollectionBarEnhanced({ 
  collection, 
  onClose, 
  onAddResources,
  selectedResources = new Set(),
  onCollectionChange
}) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(false)
  const [collections, setCollections] = useState({ user: [], featured: [] })
  const [showCollectionDropdown, setShowCollectionDropdown] = useState(false)
  const [showActionsDropdown, setShowActionsDropdown] = useState(false)
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [creatingCollection, setCreatingCollection] = useState(false)
  const { sessionKey, user } = useAuthStore()
  const { getSetting, fetchSettings } = useSettingsStore()
  const navigate = useNavigate()

  // Fetch settings and collections on mount
  useEffect(() => {
    fetchSettings()
    fetchAllCollections()
  }, [])

  // Fetch collection resources when collection changes
  useEffect(() => {
    if (collection?.ref) {
      fetchCollectionResources()
    }
  }, [collection])

  const fetchAllCollections = async () => {
    try {
      const [userCollections, featuredCollections] = await Promise.all([
        resourceSpaceApi.getUserCollections(sessionKey),
        resourceSpaceApi.getFeaturedCollections(sessionKey)
      ])
      
      setCollections({
        user: userCollections || [],
        featured: featuredCollections || []
      })
      
      // If no active collection, select the first one
      if (!collection && userCollections && userCollections.length > 0) {
        onCollectionChange(userCollections[0])
      }
    } catch (error) {
      console.error('Failed to fetch collections:', error)
    }
  }

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

  const handleCollectionSelect = (selectedCollection) => {
    onCollectionChange(selectedCollection)
    setShowCollectionDropdown(false)
  }

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return

    setCreatingCollection(true)
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/collections/create`,
        {
          name: newCollectionName,
          type: 0, // Standard collection
          public: 0, // Private
          sessionKey
        }
      )

      if (response.data.success) {
        // Refresh collections
        await fetchAllCollections()
        // Select the new collection
        onCollectionChange(response.data.collection)
        setShowNewCollectionModal(false)
        setNewCollectionName('')
      }
    } catch (error) {
      console.error('Failed to create collection:', error)
      alert('Failed to create collection')
    } finally {
      setCreatingCollection(false)
    }
  }

  const handleDeleteCollection = async () => {
    if (!collection?.ref) return
    
    if (!confirm(`Are you sure you want to delete "${collection.name}"?`)) return

    try {
      const response = await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/collections/${collection.ref}?sessionKey=${sessionKey}`
      )

      if (response.data.success) {
        // Refresh collections and select first one
        await fetchAllCollections()
        onClose()
      }
    } catch (error) {
      console.error('Failed to delete collection:', error)
      alert('Failed to delete collection')
    }
  }

  const handleViewAllResources = () => {
    navigate(`/collections/${collection.ref}`)
  }

  const handleRemoveAllResources = async () => {
    if (!confirm('Are you sure you want to remove all resources from this collection?')) return

    try {
      // Remove each resource
      await Promise.all(resources.map(r => 
        axios.delete(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/collections/${collection.ref}/resources/${r.ref}?sessionKey=${sessionKey}`)
      ))
      
      // Clear local state
      setResources([])
    } catch (error) {
      console.error('Failed to remove all resources:', error)
    }
  }

  // Check if collection bar is enabled
  const isEnabled = getSetting('enableCollectionBar') !== false
  
  if (!isEnabled) return null

  return (
    <>
      <div className={cn(
        "fixed bottom-0 left-0 right-0 bg-art-darker border-t border-art-gray-800 transition-all duration-300 z-[60]",
        isMinimized ? "h-12" : "h-48"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-2 bg-art-gray-900/50">
          <div className="flex items-center gap-3">
            <FolderOpen className="h-5 w-5 text-art-accent" />
            
            {/* Collection Selector */}
            <div className="relative">
              <button
                onClick={() => setShowCollectionDropdown(!showCollectionDropdown)}
                className="flex items-center gap-2 hover:text-art-accent transition-colors"
              >
                <div>
                  <h3 className="text-white font-medium">{collection?.name || 'Select Collection'}</h3>
                  {!isMinimized && collection && (
                    <p className="text-xs text-art-gray-400">
                      {resources.length} resources
                    </p>
                  )}
                </div>
                <ChevronDown className="h-4 w-4 text-art-gray-400" />
              </button>

              {/* Collection Dropdown */}
              {showCollectionDropdown && (
                <div className="absolute bottom-full left-0 mb-2 w-64 bg-art-gray-900 border border-art-gray-800 rounded-lg shadow-xl overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    {/* User Collections */}
                    {collections.user.length > 0 && (
                      <>
                        <div className="px-3 py-2 text-xs font-semibold text-art-gray-400 uppercase bg-art-gray-800">
                          My Collections
                        </div>
                        {collections.user.map(col => (
                          <button
                            key={col.ref}
                            onClick={() => handleCollectionSelect(col)}
                            className={cn(
                              "w-full px-3 py-2 text-left text-sm hover:bg-art-gray-800 transition-colors",
                              collection?.ref === col.ref ? "bg-art-gray-800 text-art-accent" : "text-white"
                            )}
                          >
                            {col.name}
                          </button>
                        ))}
                      </>
                    )}

                    {/* Featured Collections */}
                    {collections.featured.length > 0 && (
                      <>
                        <div className="px-3 py-2 text-xs font-semibold text-art-gray-400 uppercase bg-art-gray-800">
                          Featured Collections
                        </div>
                        {collections.featured.map(col => (
                          <button
                            key={col.ref}
                            onClick={() => handleCollectionSelect(col)}
                            className={cn(
                              "w-full px-3 py-2 text-left text-sm hover:bg-art-gray-800 transition-colors",
                              collection?.ref === col.ref ? "bg-art-gray-800 text-art-accent" : "text-white"
                            )}
                          >
                            {col.name}
                          </button>
                        ))}
                      </>
                    )}

                    {/* Create New Collection */}
                    <div className="border-t border-art-gray-800">
                      <button
                        onClick={() => {
                          setShowCollectionDropdown(false)
                          setShowNewCollectionModal(true)
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-art-accent hover:bg-art-gray-800 transition-colors flex items-center gap-2"
                      >
                        <FolderPlus className="h-4 w-4" />
                        Create New Collection
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedResources.size > 0 && (
              <button
                onClick={handleAddSelectedToCollection}
                className="px-4 py-1.5 bg-art-accent text-white text-sm rounded-lg hover:bg-art-accent-dark transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add {selectedResources.size} Selected
              </button>
            )}

            {/* Actions Menu */}
            {collection && (
              <div className="relative">
                <button
                  onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                  className="p-2 text-art-gray-400 hover:text-white transition-colors"
                  title="Collection Actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>

                {showActionsDropdown && (
                  <div className="absolute bottom-full right-0 mb-2 w-48 bg-art-gray-900 border border-art-gray-800 rounded-lg shadow-xl overflow-hidden">
                    <button
                      onClick={() => {
                        handleViewAllResources()
                        setShowActionsDropdown(false)
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-white hover:bg-art-gray-800 transition-colors flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View All Resources
                    </button>
                    <button
                      onClick={() => {
                        // TODO: Implement download all
                        setShowActionsDropdown(false)
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-white hover:bg-art-gray-800 transition-colors flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download All
                    </button>
                    <button
                      onClick={() => {
                        // TODO: Implement share collection
                        setShowActionsDropdown(false)
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-white hover:bg-art-gray-800 transition-colors flex items-center gap-2"
                    >
                      <Share2 className="h-4 w-4" />
                      Share Collection
                    </button>
                    <div className="border-t border-art-gray-800">
                      <button
                        onClick={() => {
                          handleRemoveAllResources()
                          setShowActionsDropdown(false)
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-art-gray-800 transition-colors flex items-center gap-2"
                      >
                        <X className="h-4 w-4" />
                        Remove All Resources
                      </button>
                      <button
                        onClick={() => {
                          handleDeleteCollection()
                          setShowActionsDropdown(false)
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-art-gray-800 transition-colors flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Collection
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
        {!isMinimized && collection && (
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
                        src={`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/resource/${resource.ref}/preview?size=${sessionKey}`}
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

      {/* New Collection Modal */}
      {showNewCollectionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-art-gray-900 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold text-white mb-4">Create New Collection</h2>
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateCollection()}
              placeholder="Collection name..."
              className="w-full px-3 py-2 bg-art-gray-800 border border-art-gray-700 rounded text-white mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowNewCollectionModal(false)
                  setNewCollectionName('')
                }}
                className="px-4 py-2 text-art-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCollection}
                disabled={!newCollectionName.trim() || creatingCollection}
                className="px-4 py-2 bg-art-accent text-white rounded hover:bg-art-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingCollection ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}