import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Eye, Download, Share2, Plus, X, MoreVertical, FolderPlus, GripHorizontal, Trash2, Edit3, FileText, Calendar, User, Search, Folder, Globe } from 'lucide-react'
import axios from 'axios'
import useAuthStore from '../stores/useAuthStore'
import useSettingsStore from '../stores/useSettingsStore'
import { cn } from '../lib/utils'
import { useNavigate } from 'react-router-dom'
import resourceSpaceApi from '../lib/resourcespace-api-backend'
import { useApi } from '../contexts/ApiContext'
import ResourceModalEnhanced from './ResourceModalEnhanced'

// Collection Dropdown Component
function CollectionDropdown({ collections, collection, onSelect, onCreate, searchQuery, onSearchChange, searchResults, searchLoading, searchInputRef }) {
  const displayCollections = searchResults !== null ? searchResults : [...collections.user, ...collections.featured]
  const hasUserCollections = searchResults === null && collections.user.length > 0
  const hasFeaturedCollections = searchResults === null && collections.featured.length > 0
  
  return (
    <>
      {/* Search Input */}
      <div className="p-2 border-b border-gray-200 dark:border-art-gray-800">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-art-gray-500" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={onSearchChange}
            placeholder="Search collections..."
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-art-gray-800 border border-gray-200 dark:border-art-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 dark:focus:ring-art-accent"
          />
        </div>
      </div>
      
      <div className="max-h-64 overflow-y-auto">
        {searchLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-500 dark:border-art-accent"></div>
          </div>
        ) : searchResults !== null && searchResults.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-gray-500 dark:text-art-gray-500">
            No collections found
          </div>
        ) : (
          <>
            {/* User Collections */}
            {hasUserCollections && (
              <>
                <div className="px-2 py-1 text-xs font-semibold text-gray-600 dark:text-art-gray-400 uppercase bg-gray-100 dark:bg-art-gray-800 flex items-center gap-1">
                  <Folder className="h-3 w-3" />
                  My Collections
                </div>
                {collections.user.map(col => (
                  <button
                    key={col.ref}
                    onClick={() => onSelect(col)}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-art-gray-800 transition-colors flex items-center justify-between group",
                      collection?.ref === col.ref ? "bg-gray-100 dark:bg-art-gray-800 text-amber-600 dark:text-art-accent" : "text-gray-900 dark:text-white"
                    )}
                  >
                    <span className="truncate">{col.name}</span>
                    {col.count !== undefined && (
                      <span className="text-xs text-gray-500 dark:text-art-gray-400 group-hover:text-gray-700 dark:group-hover:text-art-gray-300">
                        ({col.count})
                      </span>
                    )}
                  </button>
                ))}
              </>
            )}
            
            {/* Featured Collections */}
            {hasFeaturedCollections && (
              <>
                <div className="px-2 py-1 text-xs font-semibold text-gray-600 dark:text-art-gray-400 uppercase bg-gray-100 dark:bg-art-gray-800 flex items-center gap-1 mt-px">
                  <Globe className="h-3 w-3" />
                  Featured Collections
                </div>
                {collections.featured.map(col => (
                  <button
                    key={col.ref}
                    onClick={() => onSelect(col)}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-art-gray-800 transition-colors flex items-center justify-between group",
                      collection?.ref === col.ref ? "bg-gray-100 dark:bg-art-gray-800 text-amber-600 dark:text-art-accent" : "text-gray-900 dark:text-white"
                    )}
                  >
                    <span className="truncate">{col.name}</span>
                    {col.count !== undefined && (
                      <span className="text-xs text-gray-500 dark:text-art-gray-400 group-hover:text-gray-700 dark:group-hover:text-art-gray-300">
                        ({col.count})
                      </span>
                    )}
                  </button>
                ))}
              </>
            )}
            
            {/* Search Results */}
            {searchResults !== null && (
              <>
                {searchResults.map(col => (
                  <button
                    key={col.ref}
                    onClick={() => onSelect(col)}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-art-gray-800 transition-colors flex items-center justify-between group",
                      collection?.ref === col.ref ? "bg-gray-100 dark:bg-art-gray-800 text-amber-600 dark:text-art-accent" : "text-gray-900 dark:text-white"
                    )}
                  >
                    <span className="truncate">{col.name}</span>
                    {col.count !== undefined && (
                      <span className="text-xs text-gray-500 dark:text-art-gray-400 group-hover:text-gray-700 dark:group-hover:text-art-gray-300">
                        ({col.count})
                      </span>
                    )}
                  </button>
                ))}
              </>
            )}
          </>
        )}
        
        {/* Create New Collection Button */}
        <div className="border-t border-gray-200 dark:border-art-gray-800 mt-1">
          <button
            onClick={onCreate}
            className="w-full px-3 py-2 text-left text-sm text-amber-600 dark:text-art-accent hover:bg-gray-100 dark:hover:bg-art-gray-800 transition-colors flex items-center gap-2"
          >
            <FolderPlus className="h-4 w-4" />
            Create New Collection
          </button>
        </div>
      </div>
    </>
  )
}

// Enhanced Thumbnail component with metadata popover
function ResourceThumbnail({ resource, onRemove, showPopover, onPopoverToggle, onResourceOpen }) {
  const [thumbUrl, setThumbUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showTooltip, setShowTooltip] = useState(false)
  const popoverRef = useRef(null)
  const thumbnailRef = useRef(null)
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
  const truncatedTitle = title.length > 60 ? title.substring(0, 57) + '...' : title
  
  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size'
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  // Get file type from extension
  const getFileType = () => {
    const ext = resource.file_extension?.toUpperCase() || 'FILE'
    const typeMap = {
      JPG: 'Image', JPEG: 'Image', PNG: 'Image', GIF: 'Image', 
      MP4: 'Video', MOV: 'Video', AVI: 'Video',
      PDF: 'Document', DOC: 'Document', DOCX: 'Document'
    }
    return typeMap[ext] || ext
  }

  const handleClick = (e) => {
    e.stopPropagation()
    if (showPopover) {
      // Second click - open modal
      onResourceOpen(resource)
    } else {
      // First click - show popover
      onPopoverToggle(resource.ref)
    }
  }

  return (
    <div className="relative group">
      <div 
        ref={thumbnailRef}
        className="w-[124px] h-[124px] bg-gray-100 dark:bg-art-gray-800 rounded overflow-hidden border border-gray-200 dark:border-art-gray-700 hover:border-gray-300 dark:hover:border-art-gray-600 transition-colors cursor-pointer"
        onClick={handleClick}
        onMouseEnter={() => !showPopover && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        title={`${truncatedTitle} • ID: ${resource.ref}`}
        data-thumbnail="true"
      >
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
          <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-art-gray-900">
            <i className="fas fa-image text-lg text-gray-400 dark:text-art-gray-600"></i>
          </div>
        )}
      </div>
      
      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className="absolute top-1 right-1 p-0.5 bg-red-600 hover:bg-red-700 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 shadow"
        title="Remove from collection"
      >
        <X className="h-3 w-3 text-white" />
      </button>
      
      {/* Enhanced Tooltip - only show when popover is not open */}
      {showTooltip && !showPopover && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-black text-white text-xs rounded shadow-lg whitespace-nowrap pointer-events-none z-20 max-w-xs">
          <div className="truncate">{truncatedTitle}</div>
          <div className="text-gray-300">ID: {resource.ref}</div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-gray-900 dark:border-t-black"></div>
          </div>
        </div>
      )}
      
      {/* Metadata Popover */}
      {showPopover && createPortal(
        <div
          ref={popoverRef}
          className="popover-content absolute bg-white dark:bg-art-gray-900 border border-gray-200 dark:border-art-gray-700 rounded-lg shadow-xl p-3 min-w-[200px] max-w-[280px] z-[100]"
          style={{
            position: 'fixed',
            bottom: thumbnailRef.current ? `${window.innerHeight - thumbnailRef.current.getBoundingClientRect().top + 8}px` : '0',
            left: thumbnailRef.current ? `${thumbnailRef.current.getBoundingClientRect().left + (thumbnailRef.current.offsetWidth / 2)}px` : '0',
            transform: 'translateX(-50%)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Arrow pointing down */}
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white dark:border-t-art-gray-900"></div>
            <div className="absolute -top-[9px] left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-gray-200 dark:border-t-art-gray-700"></div>
          </div>
          
          {/* Popover Content */}
          <div className="space-y-2">
            {/* Title */}
            <div>
              <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                {title}
              </h4>
            </div>
            
            {/* Metadata */}
            <div className="space-y-1 text-xs text-gray-600 dark:text-art-gray-400">
              <div className="flex items-center gap-2">
                <FileText className="h-3 w-3" />
                <span>{getFileType()} • {resource.file_extension?.toUpperCase() || 'N/A'}</span>
              </div>
              
              {resource.file_size && (
                <div className="flex items-center gap-2">
                  <span className="ml-5">{formatFileSize(resource.file_size)}</span>
                </div>
              )}
              
              {resource.creation_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(resource.creation_date).toLocaleDateString()}</span>
                </div>
              )}
              
              {resource.created_by && (
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3" />
                  <span className="truncate">{resource.created_by}</span>
                </div>
              )}
            </div>
            
            {/* Click hint */}
            <div className="pt-2 border-t border-gray-200 dark:border-art-gray-700">
              <p className="text-xs text-gray-500 dark:text-art-gray-500 text-center">
                Click again to open
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default function CollectionBarFooter({ 
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
    return saved !== null ? JSON.parse(saved) : false
  })
  const [panelHeight, setPanelHeight] = useState(() => {
    const saved = localStorage.getItem('collectionBarPanelHeight')
    // Default height: 124px thumbnail + 8px padding top + 8px padding bottom + 8px for scrollbar = 148px
    return saved ? parseInt(saved) : 148
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
  const [activePopover, setActivePopover] = useState(null)
  const [selectedResourceForModal, setSelectedResourceForModal] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [collectionSearchQuery, setCollectionSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const searchTimeoutRef = useRef(null)
  const searchInputRef = useRef(null)
  
  const { sessionKey, user } = useAuthStore()
  const { getSetting, fetchSettings } = useSettingsStore()
  const navigate = useNavigate()
  const barRef = useRef(null)
  const scrollRef = useRef(null)

  const COMPACT_HEIGHT = 40  // Single row height when collapsed
  const MIN_PANEL_HEIGHT = 148  // Minimum to show one row of thumbnails
  const MAX_PANEL_HEIGHT = typeof window !== 'undefined' ? window.innerHeight * 0.8 : 600

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('collectionBarShowThumbs', JSON.stringify(showThumbs))
  }, [showThumbs])

  useEffect(() => {
    localStorage.setItem('collectionBarPanelHeight', panelHeight.toString())
  }, [panelHeight])

  // Save last selected collection
  useEffect(() => {
    if (collection?.ref) {
      localStorage.setItem('lastSelectedCollection', JSON.stringify(collection))
    }
  }, [collection])

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
    
    // Restore last selected collection
    const savedCollection = localStorage.getItem('lastSelectedCollection')
    if (savedCollection && !collection) {
      try {
        const parsed = JSON.parse(savedCollection)
        onCollectionChange(parsed)
      } catch (err) {
        console.error('Failed to parse saved collection:', err)
      }
    }
  }, [])

  // Fetch collection resources when collection changes
  useEffect(() => {
    if (collection?.ref) {
      fetchCollectionResources()
    }
  }, [collection])

  // Handle ESC key and outside clicks for all dropdowns and popovers
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (activePopover) setActivePopover(null)
        if (showCollectionDropdown) setShowCollectionDropdown(false)
        if (showActionsDropdown) setShowActionsDropdown(false)
      }
    }

    const handleOutsideClick = (e) => {
      // Check if click is outside all dropdowns and popovers
      const isOutsidePopover = activePopover && !e.target.closest('.popover-content') && !e.target.closest('[data-thumbnail]')
      const isOutsideCollectionDropdown = showCollectionDropdown && !e.target.closest('[data-collection-dropdown]') && !e.target.closest('[data-collection-trigger]')
      const isOutsideActionsDropdown = showActionsDropdown && !e.target.closest('[data-actions-dropdown]') && !e.target.closest('[data-actions-trigger]')
      
      if (isOutsidePopover) setActivePopover(null)
      if (isOutsideCollectionDropdown) setShowCollectionDropdown(false)
      if (isOutsideActionsDropdown) setShowActionsDropdown(false)
    }

    if (activePopover || showCollectionDropdown || showActionsDropdown) {
      document.addEventListener('keydown', handleEscape)
      document.addEventListener('mousedown', handleOutsideClick)
      
      return () => {
        document.removeEventListener('keydown', handleEscape)
        document.removeEventListener('mousedown', handleOutsideClick)
      }
    }
  }, [activePopover, showCollectionDropdown, showActionsDropdown])

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

  const handlePopoverToggle = (resourceRef) => {
    if (activePopover === resourceRef) {
      // Same resource clicked - close popover
      setActivePopover(null)
    } else {
      // Different resource - open new popover
      setActivePopover(resourceRef)
    }
  }

  const handleResourceOpen = (resource) => {
    setActivePopover(null)
    setSelectedResourceForModal(resource)
    setModalOpen(true)
  }

  // Search collections with debounce
  const searchCollections = async (query) => {
    if (!query.trim()) {
      setSearchResults(null)
      return
    }

    setSearchLoading(true)
    try {
      // For now, we'll filter locally since search_public_collections might not be available
      // In a real implementation, this would call: resourceSpaceApi.searchPublicCollections(query, 'name', 'ASC', 0)
      const allCollections = [...collections.user, ...collections.featured]
      const filtered = allCollections.filter(col => 
        col.name.toLowerCase().includes(query.toLowerCase()) ||
        col.ref.toString().includes(query)
      )
      setSearchResults(filtered)
    } catch (error) {
      console.error('Failed to search collections:', error)
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  // Handle search input with debounce
  const handleSearchInput = (e) => {
    const query = e.target.value
    setCollectionSearchQuery(query)

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      searchCollections(query)
    }, 300)
  }

  // Focus search input when dropdown opens
  useEffect(() => {
    if (showCollectionDropdown && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [showCollectionDropdown])

  // Clear search when dropdown closes
  useEffect(() => {
    if (!showCollectionDropdown) {
      setCollectionSearchQuery('')
      setSearchResults(null)
    }
  }, [showCollectionDropdown])

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
      {/* Footer Collection Bar */}
      <div 
        ref={barRef}
        className={cn(
          "fixed inset-x-0 bottom-0 bg-white dark:bg-art-darker border-t border-gray-300 dark:border-art-gray-800",
          isDragOver && "bg-amber-50 dark:bg-art-accent/10 border-amber-500 dark:border-art-accent",
          "transition-all duration-300 ease-in-out"
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
            <div className="absolute inset-0 checkered-pattern opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-t from-amber-500/40 dark:from-art-accent/40 via-amber-500/20 dark:via-art-accent/20 to-transparent" />
          </div>
        )}

        {/* Resize Handle - Top edge, only when thumbs are shown */}
        {showThumbs && (
          <div
            className="absolute top-0 left-0 right-0 h-2 bg-transparent hover:bg-gray-300 dark:hover:bg-art-gray-700 cursor-ns-resize transition-colors group"
            onMouseDown={handleMouseDown}
          >
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-300 dark:bg-art-gray-700 group-hover:bg-amber-500 dark:group-hover:bg-art-accent transition-colors" />
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <GripHorizontal className="h-3 w-4 text-gray-500 dark:text-art-gray-400" />
            </div>
          </div>
        )}

        <div className={cn("h-full", showThumbs ? "flex" : "")}>
          {/* When collapsed - single line */}
          {!showThumbs && (
            <div className="flex items-center h-full px-3">
              {/* Show/Hide Thumbs Toggle - Far left */}
              <button
                onClick={() => setShowThumbs(!showThumbs)}
                className="px-2 py-0.5 text-xs text-gray-600 dark:text-art-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-art-gray-800 rounded transition-colors"
              >
                Show thumbs
              </button>

              <div className="h-4 w-px bg-gray-300 dark:bg-art-gray-700 mx-2" />

              {/* Collection Selector - Inline */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowCollectionDropdown(!showCollectionDropdown)
                    setShowActionsDropdown(false)
                  }}
                  className="flex items-center gap-1.5 px-2 py-0.5 text-xs hover:bg-gray-100 dark:hover:bg-art-gray-800 rounded transition-colors"
                  data-collection-trigger="true"
                >
                  <span className="font-medium text-gray-900 dark:text-white">
                    {collection?.name || 'Select Collection'}
                  </span>
                  {collection && (
                    <span className="text-xs text-gray-500 dark:text-art-gray-400">
                      ({resources.length})
                    </span>
                  )}
                  <ChevronDown className="h-3 w-3 text-gray-500 dark:text-art-gray-400" />
                </button>

                {/* Collection Dropdown */}
                {showCollectionDropdown && (
                  <div className="absolute bottom-full left-0 mb-1 w-80 bg-white dark:bg-art-gray-900 border border-gray-200 dark:border-art-gray-800 rounded-lg shadow-xl overflow-hidden z-50" data-collection-dropdown="true">
                    <CollectionDropdown
                      collections={collections}
                      collection={collection}
                      onSelect={handleCollectionSelect}
                      onCreate={() => {
                        setShowCollectionDropdown(false)
                        setShowNewCollectionModal(true)
                      }}
                      searchQuery={collectionSearchQuery}
                      onSearchChange={handleSearchInput}
                      searchResults={searchResults}
                      searchLoading={searchLoading}
                      searchInputRef={searchInputRef}
                    />
                  </div>
                )}
              </div>

              <div className="h-4 w-px bg-gray-300 dark:bg-art-gray-700 mx-2" />

              {/* Action Buttons - Inline when collapsed */}
              {collection && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleViewAllResources}
                    className="px-2 py-0.5 text-xs text-gray-600 dark:text-art-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-art-gray-800 rounded transition-colors"
                    title="View All Resources"
                  >
                    <Eye className="h-3 w-3 inline mr-1" />
                    View All
                  </button>

                  <button
                    onClick={() => {/* TODO: Implement download all */}}
                    className="px-2 py-0.5 text-xs text-gray-600 dark:text-art-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-art-gray-800 rounded transition-colors"
                    title="Download All"
                  >
                    <Download className="h-3 w-3 inline mr-1" />
                    Download
                  </button>

                  <button
                    onClick={() => {/* TODO: Implement share */}}
                    className="px-2 py-0.5 text-xs text-gray-600 dark:text-art-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-art-gray-800 rounded transition-colors"
                    title="Share Collection"
                  >
                    <Share2 className="h-3 w-3 inline mr-1" />
                    Share
                  </button>

                  {/* More Actions */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setShowActionsDropdown(!showActionsDropdown)
                        setShowCollectionDropdown(false)
                      }}
                      className="p-1 text-gray-500 dark:text-art-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-art-gray-800 rounded transition-colors"
                      title="More Actions"
                      data-actions-trigger="true"
                    >
                      <MoreVertical className="h-3 w-3" />
                    </button>

                    {showActionsDropdown && (
                      <div className="absolute bottom-full left-0 mb-1 w-40 bg-white dark:bg-art-gray-900 border border-gray-200 dark:border-art-gray-800 rounded shadow-xl overflow-hidden" data-actions-dropdown="true">
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
                </div>
              )}

              {/* Add Selected Button - Inline when collapsed */}
              {selectedResources.size > 0 && (
                <>
                  <div className="h-4 w-px bg-gray-300 dark:bg-art-gray-700 mx-2" />
                  <button
                    onClick={handleAddSelectedToCollection}
                    className="px-2 py-0.5 bg-amber-500 dark:bg-art-accent hover:bg-amber-600 dark:hover:bg-art-accent-dark text-white text-xs rounded transition-colors flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add {selectedResources.size} Selected
                  </button>
                </>
              )}
            </div>
          )}

          {/* When expanded - left control panel + thumbnails */}
          {showThumbs && (
            <>
              {/* Left Control Panel - Fixed width */}
              <div className="w-64 flex-shrink-0 bg-gray-50 dark:bg-art-gray-900 border-r border-gray-200 dark:border-art-gray-800 p-3 flex flex-col gap-2">
                {/* Show/Hide Toggle - At the top */}
                <button
                  onClick={() => setShowThumbs(false)}
                  className="px-2 py-1 text-xs text-gray-600 dark:text-art-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-art-gray-800 rounded transition-colors self-start"
                >
                  <Eye className="h-3.5 w-3.5 inline mr-1" />
                  Hide thumbs
                </button>

                {/* Collection Dropdown - No label */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowCollectionDropdown(!showCollectionDropdown)
                      setShowActionsDropdown(false)
                    }}
                    className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 bg-white dark:bg-art-gray-800 hover:bg-gray-100 dark:hover:bg-art-gray-700 rounded border border-gray-200 dark:border-art-gray-700 transition-colors"
                    data-collection-trigger="true"
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {collection ? `${collection.name} (${resources.length})` : 'Select Collection'}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-gray-500 dark:text-art-gray-400 flex-shrink-0" />
                  </button>

                  {/* Collection Dropdown Menu */}
                  {showCollectionDropdown && (
                    <div className="absolute bottom-full left-0 mb-1 w-full min-w-[320px] bg-white dark:bg-art-gray-900 border border-gray-200 dark:border-art-gray-800 rounded-lg shadow-xl overflow-hidden z-50" data-collection-dropdown="true">
                      <CollectionDropdown
                        collections={collections}
                        collection={collection}
                        onSelect={handleCollectionSelect}
                        onCreate={() => {
                          setShowCollectionDropdown(false)
                          setShowNewCollectionModal(true)
                        }}
                        searchQuery={collectionSearchQuery}
                        onSearchChange={handleSearchInput}
                        searchResults={searchResults}
                        searchLoading={searchLoading}
                        searchInputRef={searchInputRef}
                      />
                    </div>
                  )}
                </div>

                {/* Actions Dropdown - No label */}
                {collection && (
                  <div className="relative">
                    <button
                      onClick={() => {
                        setShowActionsDropdown(!showActionsDropdown)
                        setShowCollectionDropdown(false)
                      }}
                      className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 bg-white dark:bg-art-gray-800 hover:bg-gray-100 dark:hover:bg-art-gray-700 rounded border border-gray-200 dark:border-art-gray-700 transition-colors"
                      data-actions-trigger="true"
                    >
                      <span className="text-sm text-gray-900 dark:text-white">Actions</span>
                      <ChevronDown className="h-3.5 w-3.5 text-gray-500 dark:text-art-gray-400 flex-shrink-0" />
                    </button>

                    {/* Actions Dropdown Menu */}
                    {showActionsDropdown && (
                      <div className="absolute bottom-full left-0 mb-1 w-full bg-white dark:bg-art-gray-900 border border-gray-200 dark:border-art-gray-800 rounded shadow-xl overflow-hidden z-50" data-actions-dropdown="true">
                        <button
                          onClick={() => {
                            handleViewAllResources()
                            setShowActionsDropdown(false)
                          }}
                          className="w-full px-3 py-1.5 text-left text-sm text-gray-700 dark:text-art-gray-300 hover:bg-gray-100 dark:hover:bg-art-gray-800 transition-colors flex items-center gap-2"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View All
                        </button>

                        <button
                          onClick={() => {
                            // TODO: Implement download all
                            setShowActionsDropdown(false)
                          }}
                          className="w-full px-3 py-1.5 text-left text-sm text-gray-700 dark:text-art-gray-300 hover:bg-gray-100 dark:hover:bg-art-gray-800 transition-colors flex items-center gap-2"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download All
                        </button>

                        <button
                          onClick={() => {
                            // TODO: Implement share
                            setShowActionsDropdown(false)
                          }}
                          className="w-full px-3 py-1.5 text-left text-sm text-gray-700 dark:text-art-gray-300 hover:bg-gray-100 dark:hover:bg-art-gray-800 transition-colors flex items-center gap-2"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          Share Collection
                        </button>

                        <button
                          onClick={() => {
                            // TODO: Implement edit metadata
                            setShowActionsDropdown(false)
                          }}
                          className="w-full px-3 py-1.5 text-left text-sm text-gray-700 dark:text-art-gray-300 hover:bg-gray-100 dark:hover:bg-art-gray-800 transition-colors flex items-center gap-2"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Edit Metadata
                        </button>

                        <div className="border-t border-gray-200 dark:border-art-gray-800">
                          <button
                            onClick={() => {
                              // TODO: Implement remove from collection
                              setShowActionsDropdown(false)
                            }}
                            className="w-full px-3 py-1.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-art-gray-800 transition-colors flex items-center gap-2"
                          >
                            <X className="h-3.5 w-3.5" />
                            Remove from Collection
                          </button>

                          <button
                            onClick={() => {
                              handleRemoveAllResources()
                              setShowActionsDropdown(false)
                            }}
                            className="w-full px-3 py-1.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-art-gray-800 transition-colors flex items-center gap-2"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Clear Collection
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Add Selected Button */}
                {selectedResources.size > 0 && (
                  <button
                    onClick={handleAddSelectedToCollection}
                    className="px-3 py-1.5 bg-amber-500 dark:bg-art-accent hover:bg-amber-600 dark:hover:bg-art-accent-dark text-white text-sm rounded transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add {selectedResources.size} Selected
                  </button>
                )}

              </div>

              {/* Thumbnails Area - Main panel */}
              <div className="flex-1 overflow-hidden bg-white dark:bg-art-darker">
                <div 
                  ref={scrollRef}
                  className="h-full overflow-y-auto p-2 custom-scrollbar"
                >
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 dark:border-art-accent"></div>
                    </div>
                  ) : resources.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <p className="text-lg text-gray-500 dark:text-art-gray-500 mb-2">Collection is empty</p>
                        <p className="text-sm text-gray-400 dark:text-art-gray-600">Drag resources here to add them</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap" style={{ gap: '8px' }}>
                      {resources.map(resource => (
                        <ResourceThumbnail
                          key={resource.ref}
                          resource={resource}
                          onRemove={() => handleRemoveResource(resource.ref)}
                          showPopover={activePopover === resource.ref}
                          onPopoverToggle={handlePopoverToggle}
                          onResourceOpen={handleResourceOpen}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
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
      
      {/* Resource Modal */}
      <ResourceModalEnhanced
        resource={selectedResourceForModal}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setSelectedResourceForModal(null)
        }}
        onNext={() => {
          const currentIndex = resources.findIndex(r => r.ref === selectedResourceForModal?.ref)
          if (currentIndex < resources.length - 1) {
            setSelectedResourceForModal(resources[currentIndex + 1])
          }
        }}
        onPrevious={() => {
          const currentIndex = resources.findIndex(r => r.ref === selectedResourceForModal?.ref)
          if (currentIndex > 0) {
            setSelectedResourceForModal(resources[currentIndex - 1])
          }
        }}
        hasNext={selectedResourceForModal && resources.findIndex(r => r.ref === selectedResourceForModal.ref) < resources.length - 1}
        hasPrevious={selectedResourceForModal && resources.findIndex(r => r.ref === selectedResourceForModal.ref) > 0}
        context="collection"
        collectionId={collection?.ref}
        activeCollection={collection}
        collectionBarHeight={showThumbs ? panelHeight : COMPACT_HEIGHT}
      />
    </>,
    document.body
  )
}