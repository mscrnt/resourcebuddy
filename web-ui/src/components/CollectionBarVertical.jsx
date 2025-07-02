import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Eye, Download, Share2, Plus, X, MoreVertical, FolderPlus, GripHorizontal } from 'lucide-react'
import axios from 'axios'
import useAuthStore from '../stores/useAuthStore'
import useSettingsStore from '../stores/useSettingsStore'
import { cn } from '../lib/utils'
import { useNavigate } from 'react-router-dom'
import resourceSpaceApi from '../lib/resourcespace-api-backend'
import { useApi } from '../contexts/ApiContext'

// Vertical ResourceThumbnail component
function ResourceThumbnail({ resource, onRemove }) {
  const [thumbUrl, setThumbUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showTooltip, setShowTooltip] = useState(false)
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

  const title = resource.field8 || `Resource ${resource.ref}`

  return (
    <div 
      className="relative group flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-art-gray-800 rounded transition-colors"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Thumbnail */}
      <div className="w-14 h-14 flex-shrink-0 bg-gray-200 dark:bg-art-gray-800 rounded overflow-hidden">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-3 w-3 border-b border-amber-500 dark:border-art-accent"></div>
          </div>
        ) : thumbUrl ? (
          <img
            src={thumbUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-art-gray-600">
            <i className="fas fa-image text-sm"></i>
          </div>
        )}
      </div>
      
      {/* Title */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 dark:text-white truncate">{title}</p>
      </div>
      
      {/* Remove button */}
      <button
        onClick={onRemove}
        className="p-1 bg-red-600 hover:bg-red-700 rounded opacity-0 group-hover:opacity-100 transition-all duration-200"
        title="Remove from collection"
      >
        <X className="h-3 w-3 text-white" />
      </button>
      
      {/* Tooltip for long titles */}
      {showTooltip && title.length > 20 && (
        <div className="absolute left-16 top-1/2 transform -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 dark:bg-black text-white text-xs rounded shadow-lg whitespace-nowrap pointer-events-none z-20">
          {title}
          <div className="absolute right-full top-1/2 transform -translate-y-1/2 mr-1">
            <div className="w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-r-4 border-r-gray-900 dark:border-r-black"></div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CollectionBarVertical({ 
  collection, 
  onClose, 
  onAddResources,
  selectedResources = new Set(),
  onCollectionChange,
  isModalOpen = false,
  onHeightChange
}) {
  // Load saved state from localStorage
  const [showThumbs, setShowThumbs] = useState(() => {
    const saved = localStorage.getItem('collectionBarShowThumbs')
    return saved !== null ? JSON.parse(saved) : true
  })
  const [panelHeight, setPanelHeight] = useState(() => {
    const saved = localStorage.getItem('collectionBarPanelHeight')
    return saved ? parseInt(saved) : 300
  })
  
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(false)
  const [collections, setCollections] = useState({ user: [], featured: [] })
  const [showCollectionDropdown, setShowCollectionDropdown] = useState(false)
  const [showActionsDropdown, setShowActionsDropdown] = useState(false)
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [creatingCollection, setCreatingCollection] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [startY, setStartY] = useState(0)
  const [startHeight, setStartHeight] = useState(0)
  
  const { sessionKey, user } = useAuthStore()
  const { getSetting, fetchSettings } = useSettingsStore()
  const navigate = useNavigate()
  const barRef = useRef(null)
  const scrollRef = useRef(null)

  const COMPACT_HEIGHT = 48
  const MIN_PANEL_HEIGHT = 150
  const MAX_PANEL_HEIGHT = typeof window !== 'undefined' ? window.innerHeight * 0.8 : 600

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('collectionBarShowThumbs', JSON.stringify(showThumbs))
  }, [showThumbs])

  useEffect(() => {
    localStorage.setItem('collectionBarPanelHeight', panelHeight.toString())
  }, [panelHeight])

  // Notify parent of height changes
  useEffect(() => {
    if (onHeightChange) {
      onHeightChange(showThumbs ? panelHeight : COMPACT_HEIGHT)
    }
  }, [panelHeight, showThumbs, onHeightChange])

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

  // Handle panel resize
  const handleMouseDown = (e) => {
    setIsResizing(true)
    setStartY(e.clientY)
    setStartHeight(panelHeight)
    e.preventDefault()
  }

  const handleMouseMove = useCallback((e) => {
    if (!isResizing) return
    
    const deltaY = startY - e.clientY
    const newHeight = Math.min(MAX_PANEL_HEIGHT, Math.max(MIN_PANEL_HEIGHT, startHeight + deltaY))
    setPanelHeight(newHeight)
  }, [isResizing, startY, startHeight])

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
  }, [])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'ns-resize'
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = 'auto'
      }
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  // Handle drag and drop
  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (collection) {
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
    if (!e.currentTarget.contains(e.relatedTarget)) {
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
          const resourceRefs = resourceRef.split(',')
          const response = await axios.post(
            `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/collections/${collection.ref}/resources/batch`,
            { resourceIds: resourceRefs, sessionKey }
          )
          
          if (response.data.success) {
            fetchCollectionResources()
            if (onAddResources) {
              onAddResources(`${resourceRefs.length} resources added to collection`)
            }
          }
        } else {
          const response = await axios.post(
            `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/collections/${collection.ref}/resources/${resourceRef}`,
            { sessionKey }
          )
          
          if (response.data.success) {
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
          type: 0,
          public: 0,
          sessionKey
        }
      )

      if (response.data.success) {
        await fetchAllCollections()
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

  const handleViewAllResources = () => {
    navigate(`/collections/${collection.ref}`)
  }

  const handleRemoveAllResources = async () => {
    if (!confirm('Are you sure you want to remove all resources from this collection?')) return

    try {
      await Promise.all(resources.map(r => 
        axios.delete(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/collections/${collection.ref}/resources/${r.ref}?sessionKey=${sessionKey}`)
      ))
      setResources([])
    } catch (error) {
      console.error('Failed to remove all resources:', error)
    }
  }

  // Check if collection bar is enabled
  const isEnabled = getSetting('enableCollectionBar') !== false
  if (!isEnabled) return null

  const currentHeight = showThumbs ? panelHeight : COMPACT_HEIGHT

  return createPortal(
    <>
      {/* Vertical Collection Bar */}
      <div 
        ref={barRef}
        className={cn(
          "fixed right-0 bottom-0 bg-white dark:bg-art-darker border-l border-gray-300 dark:border-art-gray-800 transition-all duration-300 flex",
          isDragOver && "bg-amber-50 dark:bg-art-accent/10",
          showThumbs ? "w-72 sm:w-80" : "w-auto"
        )}
        style={{ 
          height: `${currentHeight}px`,
          zIndex: 60
        }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag over indicator */}
        {isDragOver && (
          <div className="absolute inset-0 pointer-events-none z-10">
            <div className="absolute inset-0 bg-gradient-to-t from-amber-500/20 dark:from-art-accent/20 to-transparent" />
            <div className="absolute inset-2 border-2 border-dashed border-amber-500 dark:border-art-accent rounded-lg" />
          </div>
        )}

        {/* Resize Handle - Top edge */}
        {showThumbs && (
          <div
            className="absolute top-0 left-0 right-0 h-1 bg-gray-300 dark:bg-art-gray-700 hover:bg-amber-500 dark:hover:bg-art-accent cursor-ns-resize transition-colors"
            onMouseDown={handleMouseDown}
          >
            <div className="absolute top-1 left-1/2 transform -translate-x-1/2">
              <GripHorizontal className="h-3 w-4 text-gray-500 dark:text-art-gray-400" />
            </div>
          </div>
        )}

        {/* Compact Mode - Horizontal controls */}
        {!showThumbs ? (
          <div className="flex items-center h-full px-3 gap-2">
            <button
              onClick={() => setShowThumbs(true)}
              className="px-2 py-1 text-xs text-gray-600 dark:text-art-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-art-gray-800 rounded transition-colors"
            >
              Show thumbs
            </button>
            
            {selectedResources.size > 0 && (
              <>
                <div className="h-6 w-px bg-gray-300 dark:bg-art-gray-700" />
                <button
                  onClick={handleAddSelectedToCollection}
                  className="px-3 py-1 bg-amber-500 dark:bg-art-accent hover:bg-amber-600 dark:hover:bg-art-accent-dark text-white text-xs rounded transition-colors flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add {selectedResources.size}
                </button>
              </>
            )}
          </div>
        ) : (
          /* Expanded Mode - Vertical sidebar */
          <div className="flex flex-col w-full">
            {/* Header with controls */}
            <div className="p-3 border-b border-gray-200 dark:border-art-gray-800 mt-2">
              {/* Collection Selector */}
              <div className="relative mb-3">
                <button
                  onClick={() => setShowCollectionDropdown(!showCollectionDropdown)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 dark:bg-art-gray-800 hover:bg-gray-100 dark:hover:bg-art-gray-700 rounded transition-colors"
                >
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {collection?.name || 'Select Collection'}
                    </p>
                    {collection && (
                      <p className="text-xs text-gray-500 dark:text-art-gray-400">
                        {resources.length} resources
                      </p>
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-500 dark:text-art-gray-400 flex-shrink-0" />
                </button>

                {/* Collection Dropdown */}
                {showCollectionDropdown && (
                  <div className="absolute bottom-full left-0 mb-1 w-full bg-white dark:bg-art-gray-900 border border-gray-200 dark:border-art-gray-800 rounded shadow-xl overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      {collections.user.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-xs font-semibold text-gray-600 dark:text-art-gray-400 uppercase bg-gray-100 dark:bg-art-gray-800">
                            My Collections
                          </div>
                          {collections.user.map(col => (
                            <button
                              key={col.ref}
                              onClick={() => handleCollectionSelect(col)}
                              className={cn(
                                "w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-art-gray-800 transition-colors",
                                collection?.ref === col.ref ? "bg-gray-100 dark:bg-art-gray-800 text-amber-600 dark:text-art-accent" : "text-gray-900 dark:text-white"
                              )}
                            >
                              {col.name}
                            </button>
                          ))}
                        </>
                      )}
                      <div className="border-t border-gray-200 dark:border-art-gray-800">
                        <button
                          onClick={() => {
                            setShowCollectionDropdown(false)
                            setShowNewCollectionModal(true)
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-amber-600 dark:text-art-accent hover:bg-gray-100 dark:hover:bg-art-gray-800 transition-colors flex items-center gap-2"
                        >
                          <FolderPlus className="h-4 w-4" />
                          Create New Collection
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {collection && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    onClick={handleViewAllResources}
                    className="px-2 py-1.5 text-xs text-gray-700 dark:text-art-gray-300 bg-gray-50 dark:bg-art-gray-800 hover:bg-gray-100 dark:hover:bg-art-gray-700 rounded transition-colors flex items-center justify-center gap-1"
                  >
                    <Eye className="h-3 w-3" />
                    View All
                  </button>

                  <button
                    onClick={() => {/* TODO: Implement download all */}}
                    className="px-2 py-1.5 text-xs text-gray-700 dark:text-art-gray-300 bg-gray-50 dark:bg-art-gray-800 hover:bg-gray-100 dark:hover:bg-art-gray-700 rounded transition-colors flex items-center justify-center gap-1"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </button>

                  <button
                    onClick={() => {/* TODO: Implement share */}}
                    className="px-2 py-1.5 text-xs text-gray-700 dark:text-art-gray-300 bg-gray-50 dark:bg-art-gray-800 hover:bg-gray-100 dark:hover:bg-art-gray-700 rounded transition-colors flex items-center justify-center gap-1"
                  >
                    <Share2 className="h-3 w-3" />
                    Share
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                      className="w-full px-2 py-1.5 text-xs text-gray-700 dark:text-art-gray-300 bg-gray-50 dark:bg-art-gray-800 hover:bg-gray-100 dark:hover:bg-art-gray-700 rounded transition-colors flex items-center justify-center gap-1"
                    >
                      <MoreVertical className="h-3 w-3" />
                      More
                    </button>

                    {showActionsDropdown && (
                      <div className="absolute bottom-full right-0 mb-1 w-32 bg-white dark:bg-art-gray-900 border border-gray-200 dark:border-art-gray-800 rounded shadow-xl overflow-hidden">
                        <button
                          onClick={() => {
                            handleRemoveAllResources()
                            setShowActionsDropdown(false)
                          }}
                          className="w-full px-3 py-2 text-left text-xs text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-art-gray-800 transition-colors"
                        >
                          Remove All
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Add Selected Button */}
              {selectedResources.size > 0 && (
                <button
                  onClick={handleAddSelectedToCollection}
                  className="w-full px-3 py-2 bg-amber-500 dark:bg-art-accent hover:bg-amber-600 dark:hover:bg-art-accent-dark text-white text-sm rounded transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add {selectedResources.size} Selected
                </button>
              )}

              {/* Hide thumbs button */}
              <button
                onClick={() => setShowThumbs(false)}
                className="w-full mt-2 px-2 py-1 text-xs text-gray-600 dark:text-art-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Hide thumbs
              </button>
            </div>

            {/* Thumbnails - Vertical scroll */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-3"
              style={{ maxHeight: `${currentHeight - 200}px` }}
            >
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500 dark:border-art-accent"></div>
                </div>
              ) : resources.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500 dark:text-art-gray-500">Collection is empty</p>
                  <p className="text-xs text-gray-400 dark:text-art-gray-600 mt-1">Drag resources here to add them</p>
                </div>
              ) : (
                <div className="space-y-1">
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
          <div className="bg-white dark:bg-art-gray-900 rounded-lg p-6 max-w-md w-full border border-gray-200 dark:border-art-gray-800">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Create New Collection</h2>
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateCollection()}
              placeholder="Collection name..."
              className="w-full px-3 py-2 bg-white dark:bg-art-gray-800 border border-gray-300 dark:border-art-gray-700 rounded text-gray-900 dark:text-white mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowNewCollectionModal(false)
                  setNewCollectionName('')
                }}
                className="px-4 py-2 text-gray-600 dark:text-art-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCollection}
                disabled={!newCollectionName.trim() || creatingCollection}
                className="px-4 py-2 bg-amber-500 dark:bg-art-accent text-white rounded hover:bg-amber-600 dark:hover:bg-art-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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