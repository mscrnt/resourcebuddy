import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Info, X, FolderOpen, Plus, MoreVertical, Eye, Trash2, Download, Share2, FolderPlus, ChevronDown, ChevronUp, Maximize2, Minimize2 } from 'lucide-react'
import axios from 'axios'
import useAuthStore from '../stores/useAuthStore'
import useSettingsStore from '../stores/useSettingsStore'
import { cn } from '../lib/utils'
import { useNavigate } from 'react-router-dom'
import resourceSpaceApi from '../lib/resourcespace-api-backend'
import { useApi } from '../contexts/ApiContext'

// ResourceThumbnail component for collection items
function ResourceThumbnail({ resource, onRemove }) {
  const [thumbUrl, setThumbUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const api = useApi()

  useEffect(() => {
    const loadThumbnail = async () => {
      try {
        const url = await api.getResourcePath(resource.ref, 'thm')
        setThumbUrl(url)
      } catch (err) {
        console.error('Failed to load thumbnail:', err)
      } finally {
        setLoading(false)
      }
    }
    loadThumbnail()
  }, [resource.ref, api])

  return (
    <div className="relative group flex-shrink-0" style={{ width: '120px', height: '120px' }}>
      <div className="w-full h-full bg-art-gray-800 rounded overflow-hidden">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-art-accent"></div>
          </div>
        ) : thumbUrl ? (
          <img
            src={thumbUrl}
            alt={resource.field8 || 'Resource'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-art-gray-600">
            <i className="fas fa-image text-2xl"></i>
          </div>
        )}
      </div>
      
      {/* Remove button */}
      <button
        onClick={onRemove}
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
  )
}

export default function CollectionBarSlide({ 
  collection, 
  onClose, 
  onAddResources,
  selectedResources = new Set(),
  onCollectionChange,
  isModalOpen = false,
  onHeightChange
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [barHeight, setBarHeight] = useState(52) // Compact mode height
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(false)
  const [collections, setCollections] = useState({ user: [], featured: [] })
  const [showCollectionDropdown, setShowCollectionDropdown] = useState(false)
  const [showActionsDropdown, setShowActionsDropdown] = useState(false)
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [creatingCollection, setCreatingCollection] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  
  const { sessionKey, user } = useAuthStore()
  const { getSetting, fetchSettings } = useSettingsStore()
  const navigate = useNavigate()
  const resizeRef = useRef(null)
  const barRef = useRef(null)

  const COMPACT_HEIGHT = 52
  const MIN_EXPANDED_HEIGHT = 200
  const MAX_EXPANDED_HEIGHT = 400

  // Notify parent of height changes
  useEffect(() => {
    if (onHeightChange) {
      onHeightChange(isExpanded ? barHeight : COMPACT_HEIGHT)
    }
  }, [barHeight, isExpanded, onHeightChange])

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
      const results = await resourceSpaceApi.searchResources(
        `!collection${collection.ref}`,
        {
          restypes: '',
          order_by: 'relevance',
          archive: 0,
          fetchrows: 100,
          sort: 'DESC'
        },
        sessionKey
      )
      
      if (results) {
        setResources(Array.isArray(results) ? results : [])
      }
    } catch (error) {
      console.error('Failed to fetch collection resources:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResize = useCallback((e) => {
    if (!isResizing || !isExpanded) return
    
    const newHeight = Math.max(
      MIN_EXPANDED_HEIGHT,
      Math.min(MAX_EXPANDED_HEIGHT, window.innerHeight - e.clientY)
    )
    setBarHeight(newHeight)
  }, [isResizing, isExpanded])

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false)
  }, [])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResize)
      document.addEventListener('mouseup', handleResizeEnd)
      return () => {
        document.removeEventListener('mousemove', handleResize)
        document.removeEventListener('mouseup', handleResizeEnd)
      }
    }
  }, [isResizing, handleResize, handleResizeEnd])

  // Handle drag and drop
  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (collection) {
      console.log('Drag enter collection bar')
      setIsDragOver(true)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set dragover to false if we're leaving the entire collection bar
    if (!e.currentTarget.contains(e.relatedTarget)) {
      console.log('Drag leave collection bar')
      setIsDragOver(false)
    }
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const isMultiple = e.dataTransfer.getData('multipleresources') === 'true'
    const resourceRef = e.dataTransfer.getData('resourceref')
    
    if (resourceRef && collection?.ref) {
      try {
        if (isMultiple) {
          // Handle multiple resources
          const resourceRefs = resourceRef.split(',')
          const response = await axios.post(
            `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/collections/${collection.ref}/resources/batch`,
            {
              resourceIds: resourceRefs,
              sessionKey
            }
          )
          
          if (response.data.success) {
            // Refresh collection
            fetchCollectionResources()
            if (onAddResources) {
              onAddResources(`${resourceRefs.length} resources added to collection`)
            }
          }
        } else {
          // Handle single resource
          const response = await axios.post(
            `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/collections/${collection.ref}/resources/${resourceRef}`,
            { sessionKey }
          )
          
          if (response.data.success) {
            // Refresh collection
            fetchCollectionResources()
            if (onAddResources) {
              onAddResources('Resource added to collection')
            }
          }
        }
      } catch (error) {
        console.error('Failed to add resource(s) to collection:', error)
      }
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

  const toggleExpanded = () => {
    if (!isExpanded) {
      setBarHeight(MIN_EXPANDED_HEIGHT)
    }
    setIsExpanded(!isExpanded)
  }

  // Check if collection bar is enabled
  const isEnabled = getSetting('enableCollectionBar') !== false
  
  if (!isEnabled) return null

  const currentHeight = isExpanded ? barHeight : COMPACT_HEIGHT

  return createPortal(
    <>
      {/* Collection Bar - Enhanced fixed positioning */}
      <div 
        ref={barRef}
        className={cn(
          "fixed inset-x-0 bottom-0 bg-art-darker border-t border-art-gray-800 transition-all duration-300",
          isDragOver && "bg-art-accent/40 border-art-accent border-t-2"
        )}
        style={{ 
          height: `${currentHeight}px`,
          zIndex: 60,
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0
        }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag over indicator - checkered border */}
        {isDragOver && (
          <div className="absolute inset-0 pointer-events-none z-10">
            <div className="absolute inset-0 checkered-pattern opacity-40" />
            <div className="absolute inset-2 border-4 border-dashed border-art-accent rounded-lg animate-pulse" />
            <div className="absolute inset-0 bg-gradient-to-t from-art-accent/60 via-art-accent/30 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/95 px-10 py-6 rounded-lg shadow-2xl border-2 border-art-accent">
                <p className="text-white font-bold text-xl">Drop to add to {collection?.name || 'collection'}</p>
              </div>
            </div>
          </div>
        )}
        {/* Resize Handle - Only show when expanded */}
        {isExpanded && (
          <div
            ref={resizeRef}
            className="absolute top-0 left-0 right-0 h-1 hover:h-2 bg-art-gray-700 hover:bg-art-accent cursor-ns-resize transition-all"
            onMouseDown={() => setIsResizing(true)}
          />
        )}

        {/* Compact Mode Header */}
        <div className="flex items-center justify-between px-6 h-[52px] bg-art-gray-900/50">
          <div className="flex items-center gap-3">
            <FolderOpen className="h-5 w-5 text-art-accent" />
            
            {/* Collection Selector */}
            <div className="relative">
              <button
                onClick={() => setShowCollectionDropdown(!showCollectionDropdown)}
                className="flex items-center gap-2 hover:text-art-accent transition-colors"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-medium">{collection?.name || 'Select Collection'}</h3>
                  {collection && (
                    <span className="text-xs text-art-gray-400">
                      ({resources.length})
                    </span>
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

            {/* Quick info in compact mode */}
            {!isExpanded && collection && (
              <div className="hidden sm:flex items-center gap-4 ml-4 text-sm text-art-gray-400">
                <span>Drag resources here to add</span>
              </div>
            )}
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

            {/* Expand/Collapse Button */}
            <button
              onClick={toggleExpanded}
              className="p-2 text-art-gray-400 hover:text-white transition-colors"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && collection && (
          <div className="flex h-full" style={{ height: `${currentHeight - 52}px` }}>
            {/* Left side - Collection info and actions */}
            <div className="w-56 flex-shrink-0 p-4 border-r border-art-gray-800">
              <div className="space-y-3">
                <div>
                  <h3 className="text-white font-medium">{collection.name}</h3>
                  <p className="text-sm text-art-gray-400">{resources.length} resources</p>
                </div>
                
                {/* Actions */}
                <div className="space-y-1">
                  <button
                    onClick={handleViewAllResources}
                    className="w-full px-3 py-2 text-left text-sm text-white hover:bg-art-gray-800 rounded transition-colors flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View All
                  </button>
                  <button
                    onClick={() => {
                      // TODO: Implement download all
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-white hover:bg-art-gray-800 rounded transition-colors flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download All
                  </button>
                  <button
                    onClick={() => {
                      // TODO: Implement share collection
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-white hover:bg-art-gray-800 rounded transition-colors flex items-center gap-2"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </button>
                  <div className="border-t border-art-gray-800 pt-1 mt-2">
                    <button
                      onClick={handleRemoveAllResources}
                      className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-art-gray-800 rounded transition-colors flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Remove All
                    </button>
                    <button
                      onClick={handleDeleteCollection}
                      className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-art-gray-800 rounded transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Resources */}
            <div className="flex-1 p-4 overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-art-accent"></div>
                </div>
              ) : resources.length === 0 ? (
                <div className="flex items-center justify-center h-full text-art-gray-500">
                  <div className="text-center">
                    <i className="fas fa-folder-open text-3xl mb-2"></i>
                    <p className="text-sm">Collection is empty</p>
                    <p className="text-xs mt-1">Drag resources here to add them</p>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 h-full items-start">
                  {resources.map(resource => (
                    <ResourceThumbnail
                      key={resource.ref}
                      resource={resource}
                      onRemove={() => handleRemoveResource(resource.ref)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Collection Modal */}
      {showNewCollectionModal && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4">
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
    </>,
    document.body
  )
}