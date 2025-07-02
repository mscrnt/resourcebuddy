import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Eye, Download, Share2, Plus, X, MoreVertical, FolderPlus, ChevronLeft, ChevronRight } from 'lucide-react'
import axios from 'axios'
import useAuthStore from '../stores/useAuthStore'
import useSettingsStore from '../stores/useSettingsStore'
import { cn } from '../lib/utils'
import { useNavigate } from 'react-router-dom'
import resourceSpaceApi from '../lib/resourcespace-api-backend'
import { useApi } from '../contexts/ApiContext'

// Compact ResourceThumbnail component
function ResourceThumbnail({ resource, onRemove, showThumbs = true }) {
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

  const size = showThumbs ? '56px' : '40px'
  const title = resource.field8 || `Resource ${resource.ref}`

  return (
    <div 
      className="relative group flex-shrink-0" 
      style={{ width: size, height: size, padding: '2px' }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="w-full h-full bg-gray-200 dark:bg-art-gray-800 rounded overflow-hidden">
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
      
      {/* Remove button - positioned to not clip */}
      <button
        onClick={onRemove}
        className="absolute top-0 right-0 p-1 bg-red-600 hover:bg-red-700 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
        title="Remove from collection"
      >
        <X className="h-3 w-3 text-white" />
      </button>
      
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-black text-white text-xs rounded shadow-lg whitespace-nowrap pointer-events-none z-20">
          {title}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-gray-900 dark:border-t-black"></div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CollectionBarCompact({ 
  collection, 
  onClose, 
  onAddResources,
  selectedResources = new Set(),
  onCollectionChange,
  isModalOpen = false,
  onHeightChange
}) {
  const [showThumbs, setShowThumbs] = useState(() => {
    // Load saved preference
    const saved = localStorage.getItem('collectionBarShowThumbs')
    return saved !== null ? JSON.parse(saved) : true
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
  
  const { sessionKey, user } = useAuthStore()
  const { getSetting, fetchSettings } = useSettingsStore()
  const navigate = useNavigate()
  const barRef = useRef(null)
  const scrollRef = useRef(null)

  const COMPACT_HEIGHT = 40
  const COMPACT_HEIGHT_WITH_THUMBS = 72

  // Save thumb visibility preference
  useEffect(() => {
    localStorage.setItem('collectionBarShowThumbs', JSON.stringify(showThumbs))
  }, [showThumbs])

  // Notify parent of height changes
  useEffect(() => {
    if (onHeightChange) {
      onHeightChange(showThumbs ? COMPACT_HEIGHT_WITH_THUMBS : COMPACT_HEIGHT)
    }
  }, [showThumbs, onHeightChange])

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

  const scrollThumbs = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 200
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  // Check if collection bar is enabled
  const isEnabled = getSetting('enableCollectionBar') !== false
  if (!isEnabled) return null

  const currentHeight = showThumbs ? COMPACT_HEIGHT_WITH_THUMBS : COMPACT_HEIGHT

  return createPortal(
    <>
      {/* Compact Collection Bar */}
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
        {/* Drag over indicator */}
        {isDragOver && (
          <div className="absolute inset-0 pointer-events-none z-10">
            <div className="absolute inset-0 checkered-pattern opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-t from-art-accent/60 via-art-accent/30 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/95 px-6 py-3 rounded-lg shadow-2xl border border-art-accent">
                <p className="text-white font-medium">Drop to add to {collection?.name || 'collection'}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center h-full px-3">
          {/* Left side - Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Collection Selector */}
            <div className="relative">
              <button
                onClick={() => setShowCollectionDropdown(!showCollectionDropdown)}
                className="flex items-center gap-1.5 px-2 py-1 hover:bg-gray-100 dark:hover:bg-art-gray-800 rounded transition-colors"
              >
                <span className="text-sm text-gray-900 dark:text-white font-medium max-w-[120px] sm:max-w-[180px] truncate">{collection?.name || 'Select Collection'}</span>
                {collection && (
                  <span className="text-xs text-gray-500 dark:text-art-gray-400">({resources.length})</span>
                )}
                <ChevronDown className="h-3 w-3 text-gray-500 dark:text-art-gray-400" />
              </button>

              {/* Collection Dropdown */}
              {showCollectionDropdown && (
                <div className="absolute bottom-full left-0 mb-1 w-56 bg-white dark:bg-art-gray-900 border border-gray-200 dark:border-art-gray-800 rounded shadow-xl overflow-hidden">
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
                              "w-full px-2 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-art-gray-800 transition-colors",
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
                        className="w-full px-2 py-1.5 text-left text-sm text-amber-600 dark:text-art-accent hover:bg-gray-100 dark:hover:bg-art-gray-800 transition-colors flex items-center gap-1.5"
                      >
                        <FolderPlus className="h-3 w-3" />
                        Create New Collection
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-gray-300 dark:bg-art-gray-700" />

            {/* Action Buttons */}
            {collection && (
              <>
                <button
                  onClick={handleViewAllResources}
                  className="px-2 py-1 text-xs text-gray-600 dark:text-art-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-art-gray-800 rounded transition-colors flex items-center gap-1"
                  title="View All Resources"
                >
                  <Eye className="h-3 w-3" />
                  <span className="hidden lg:inline">View All</span>
                </button>

                <button
                  onClick={() => {/* TODO: Implement download all */}}
                  className="px-2 py-1 text-xs text-gray-600 dark:text-art-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-art-gray-800 rounded transition-colors flex items-center gap-1"
                  title="Download All"
                >
                  <Download className="h-3 w-3" />
                  <span className="hidden lg:inline">Download All</span>
                </button>

                <button
                  onClick={() => {/* TODO: Implement share */}}
                  className="px-2 py-1 text-xs text-gray-600 dark:text-art-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-art-gray-800 rounded transition-colors flex items-center gap-1"
                  title="Share Collection"
                >
                  <Share2 className="h-3 w-3" />
                  <span className="hidden lg:inline">Share</span>
                </button>

                {/* More Actions */}
                <div className="relative">
                  <button
                    onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                    className="p-1 text-gray-500 dark:text-art-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-art-gray-800 rounded transition-colors"
                    title="More Actions"
                  >
                    <MoreVertical className="h-3 w-3" />
                  </button>

                  {showActionsDropdown && (
                    <div className="absolute bottom-full left-0 mb-1 w-40 bg-white dark:bg-art-gray-900 border border-gray-200 dark:border-art-gray-800 rounded shadow-xl overflow-hidden">
                      <button
                        onClick={() => {
                          handleRemoveAllResources()
                          setShowActionsDropdown(false)
                        }}
                        className="w-full px-2 py-1.5 text-left text-xs text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-art-gray-800 transition-colors flex items-center gap-1.5"
                      >
                        <X className="h-3 w-3" />
                        Remove All
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Add Selected Button */}
            {selectedResources.size > 0 && (
              <>
                <div className="h-6 w-px bg-gray-300 dark:bg-art-gray-700" />
                <button
                  onClick={handleAddSelectedToCollection}
                  className="px-3 py-1 bg-amber-500 dark:bg-art-accent hover:bg-amber-600 dark:hover:bg-art-accent-dark text-white text-xs rounded transition-colors flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add {selectedResources.size} Selected
                </button>
              </>
            )}

            {/* Show/Hide Thumbs Toggle */}
            <div className="h-6 w-px bg-gray-300 dark:bg-art-gray-700" />
            <button
              onClick={() => setShowThumbs(!showThumbs)}
              className="px-2 py-1 text-xs text-gray-600 dark:text-art-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-art-gray-800 rounded transition-colors"
            >
              {showThumbs ? 'Hide thumbs' : 'Show thumbs'}
            </button>
          </div>

          {/* Right side - Thumbnails */}
          {showThumbs && collection && (
            <div className="flex-1 flex items-center ml-4 overflow-hidden">
              {/* Scroll Left */}
              {resources.length > 0 && (
                <button
                  onClick={() => scrollThumbs('left')}
                  className="p-1 text-gray-500 dark:text-art-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-art-gray-800 rounded transition-colors flex-shrink-0"
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
              )}

              {/* Thumbnails Container */}
              <div 
                ref={scrollRef}
                className="flex-1 overflow-x-auto scrollbar-none mx-2"
              >
                {loading ? (
                  <div className="flex items-center justify-center h-14">
                    <div className="animate-spin rounded-full h-5 w-5 border-b border-amber-500 dark:border-art-accent"></div>
                  </div>
                ) : resources.length === 0 ? (
                  <div className="flex items-center justify-center h-14">
                    <p className="text-xs text-gray-500 dark:text-art-gray-500">Collection is empty</p>
                  </div>
                ) : (
                  <div className="flex gap-1.5 items-center">
                    {resources.map(resource => (
                      <ResourceThumbnail
                        key={resource.ref}
                        resource={resource}
                        onRemove={() => handleRemoveResource(resource.ref)}
                        showThumbs={showThumbs}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Scroll Right */}
              {resources.length > 0 && (
                <button
                  onClick={() => scrollThumbs('right')}
                  className="p-1 text-gray-500 dark:text-art-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-art-gray-800 rounded transition-colors flex-shrink-0"
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>
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