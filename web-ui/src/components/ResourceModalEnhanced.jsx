import { useState, useEffect, useRef, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Info, ZoomIn, ZoomOut, Maximize2, Share2, Edit2, Upload, MessageSquare, FileText, ChevronUp, ChevronDown, Check, XCircle, Save, Loader2, FolderPlus, FolderMinus, Expand } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { useApi } from '../contexts/ApiContext'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../stores/useAuthStore'
import VideoPlayerPro from './VideoPlayerPro'
import ImageViewer from './ImageViewer'
import axios from 'axios'

export default function ResourceModalEnhanced({ 
  resource, 
  isOpen, 
  onClose, 
  onNext, 
  onPrevious,
  hasNext,
  hasPrevious,
  context = 'search', // search, collection, related
  searchParams = null,
  collectionId = null,
  activeCollection = null,
  onAddToCollection = null,
  onRemoveFromCollection = null,
  collectionBarHeight = 52
}) {
  const api = useApi()
  const navigate = useNavigate()
  const { sessionKey, user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mediaUrl, setMediaUrl] = useState(null)
  const [relatedResources, setRelatedResources] = useState([])
  const [showMetadata, setShowMetadata] = useState(false)
  const [metadataCollapsed, setMetadataCollapsed] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [metadataAnimating, setMetadataAnimating] = useState(false)
  const [metadata, setMetadata] = useState(null)
  const [editingField, setEditingField] = useState(null)
  const [editValues, setEditValues] = useState({})
  const [saving, setSaving] = useState(false)
  const [resourceTypes, setResourceTypes] = useState([])
  const [editingResourceType, setEditingResourceType] = useState(false)
  const [alternativeFiles, setAlternativeFiles] = useState([])
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [permissions, setPermissions] = useState({})
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false)
  const [uploadingVariant, setUploadingVariant] = useState(false)
  const [isInCollection, setIsInCollection] = useState(false)
  const [metadataWidth, setMetadataWidth] = useState(320)
  const [isResizingMetadata, setIsResizingMetadata] = useState(false)
  const MIN_METADATA_WIDTH = 280
  const MAX_METADATA_WIDTH = 600
  const [isImageFullscreen, setIsImageFullscreen] = useState(false)
  const [availableSpace, setAvailableSpace] = useState({ width: 0, height: 0 })
  const [resourceData, setResourceData] = useState(null)
  
  const modalRef = useRef(null)
  const fileInputRef = useRef(null)
  const variantInputRef = useRef(null)
  const mediaContainerRef = useRef(null)
  const mediaType = getMediaType(resourceData || resource)

  // Load metadata collapsed state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('resourceModalMetadataCollapsed')
    if (savedState !== null) {
      setMetadataCollapsed(JSON.parse(savedState))
    }
  }, [])

  // Calculate available space for media
  useEffect(() => {
    const calculateSpace = () => {
      if (!mediaContainerRef.current) return
      
      const headerHeight = 45 // Ultra compact header
      const collectionBarActualHeight = activeCollection && !isImageFullscreen ? (collectionBarHeight || 52) : 0
      const metadataPanelWidth = showMetadata && !isImageFullscreen ? metadataWidth : 0
      const padding = 0 // No padding to maximize space
      
      setAvailableSpace({
        width: window.innerWidth - metadataPanelWidth - padding,
        height: window.innerHeight - headerHeight - collectionBarActualHeight - padding
      })
    }

    calculateSpace()
    window.addEventListener('resize', calculateSpace)
    return () => window.removeEventListener('resize', calculateSpace)
  }, [showMetadata, metadataWidth, activeCollection, isImageFullscreen])

  // Save metadata collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('resourceModalMetadataCollapsed', JSON.stringify(metadataCollapsed))
  }, [metadataCollapsed])

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Load all data when resource changes
  useEffect(() => {
    if (resource && isOpen) {
      loadResourceData()
    }
  }, [resource?.ref, isOpen])

  const loadResourceData = async () => {
    setLoading(true)
    setError(null)
    try {
      // First load the resource data to get the correct type and extension
      const data = await api.getResource(resource.ref, sessionKey)
      setResourceData(data)
      
      // Get thumbnail URL for video poster
      if (data && (data.resource_type === '3' || data.resource_type === 3)) {
        try {
          const thumbUrl = await api.getResourcePath(data.ref, 'thm')
          data.thumb = thumbUrl
        } catch (err) {
          console.error('Failed to load thumbnail:', err)
        }
      }
      
      // Load all other data in parallel
      await Promise.all([
        loadMedia(data),
        loadMetadata(),
        loadRelatedResources(),
        loadAlternativeFiles(),
        loadComments(),
        checkPermissions(),
        loadResourceTypes(),
        checkIfInCollection()
      ])
    } catch (err) {
      console.error('Failed to load resource data:', err)
      setError('Failed to load resource data')
    } finally {
      setLoading(false)
    }
  }

  const loadMedia = async (resourceInfo = null) => {
    try {
      const resData = resourceInfo || resourceData || resource
      const resType = getMediaType(resData)
      
      if (resType === 'video') {
        // For videos, we need to get the actual video file URL, not a preview
        // Use empty size parameter to get the original file
        // Try to get extension from various possible fields
        const extension = resData.file_extension || resData.fileextension || resData.field53 || 'mp4'
        const url = await api.getResourcePath(resData.ref, '', true, extension)
        setMediaUrl(url)
      } else {
        // For images, get the screen size preview
        const url = await api.getResourcePath(resData.ref, 'scr')
        setMediaUrl(url)
      }
    } catch (err) {
      console.error('Failed to load media:', err)
      throw err
    }
  }

  const loadMetadata = async () => {
    try {
      const fieldData = await api.getResourceFieldData(resource.ref)
      setMetadata(fieldData)
      // Initialize edit values
      const values = {}
      fieldData.forEach(field => {
        values[field.ref] = field.value || ''
      })
      setEditValues(values)
    } catch (err) {
      console.error('Failed to load metadata:', err)
      throw err
    }
  }

  const loadRelatedResources = async () => {
    try {
      const related = await api.getRelatedResourcesBackend(resource.ref)
      if (Array.isArray(related)) {
        const relatedWithThumbs = await Promise.all(
          related.slice(0, 10).map(async (res) => {
            try {
              const thumbUrl = await api.getResourcePath(res.ref, 'thm')
              return { ...res, thumb: thumbUrl }
            } catch (err) {
              console.error(`Failed to get thumb for resource ${res.ref}:`, err)
              return res
            }
          })
        )
        setRelatedResources(relatedWithThumbs)
      } else {
        setRelatedResources([])
      }
    } catch (err) {
      console.error('Failed to load related resources:', err)
      setRelatedResources([])
    }
  }

  const loadAlternativeFiles = async () => {
    try {
      const files = await api.getAlternativeFiles(resource.ref)
      setAlternativeFiles(files || [])
    } catch (err) {
      console.error('Failed to load alternative files:', err)
      setAlternativeFiles([])
    }
  }

  const loadComments = async () => {
    // Comments feature disabled for now
    setComments([])
  }

  const checkPermissions = async () => {
    try {
      const access = await api.checkResourceAccess(resource.ref)
      setPermissions(access || {})
    } catch (err) {
      console.error('Failed to check permissions:', err)
      setPermissions({})
    }
  }

  const loadResourceTypes = async () => {
    try {
      const types = await api.getResourceTypes()
      setResourceTypes(types || [])
    } catch (err) {
      console.error('Failed to load resource types:', err)
      setResourceTypes([])
    }
  }

  // Save metadata field
  const saveField = async (fieldRef) => {
    setSaving(true)
    try {
      const response = await api.updateResourceField(resource.ref, fieldRef, editValues[fieldRef])
      
      if (response.success) {
        // Update metadata to reflect the change
        setMetadata(prev => prev.map(field => 
          field.ref === fieldRef ? { ...field, value: editValues[fieldRef] } : field
        ))
        setEditingField(null)
      }
    } catch (err) {
      console.error('Failed to save field:', err)
      alert('Failed to save field')
    } finally {
      setSaving(false)
    }
  }

  // Update resource type
  const updateResourceType = async (newType) => {
    setSaving(true)
    try {
      const response = await api.updateResourceType(resource.ref, newType)
      
      if (response.success) {
        resource.resource_type = newType
        setEditingResourceType(false)
        // Reload metadata as fields may have changed
        loadMetadata()
      }
    } catch (err) {
      console.error('Failed to update resource type:', err)
      alert('Failed to update resource type')
    } finally {
      setSaving(false)
    }
  }

  // Upload custom thumbnail
  const handleThumbnailUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setUploadingThumbnail(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('sessionKey', sessionKey)
    formData.append('previewonly', 'true')

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/resource/${resource.ref}/upload`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      )
      
      if (response.data.success) {
        // Reload media to show new thumbnail
        loadMedia()
      }
    } catch (err) {
      console.error('Failed to upload thumbnail:', err)
      alert('Failed to upload thumbnail')
    } finally {
      setUploadingThumbnail(false)
    }
  }

  // Upload variant file
  const handleVariantUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setUploadingVariant(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('sessionKey', sessionKey)
    formData.append('alternative', file.name)

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/resource/${resource.ref}/upload`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      )
      
      if (response.data.success) {
        // Reload alternative files
        loadAlternativeFiles()
      }
    } catch (err) {
      console.error('Failed to upload variant:', err)
      alert('Failed to upload variant')
    } finally {
      setUploadingVariant(false)
    }
  }

  // Post comment
  const postComment = async () => {
    if (!newComment.trim()) return

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/resource/${resource.ref}/comment`,
        { 
          comment: newComment,
          sessionKey 
        }
      )
      
      if (response.data.success) {
        setNewComment('')
        // Reload comments
        loadComments()
      }
    } catch (err) {
      console.error('Failed to post comment:', err)
      alert('Failed to post comment')
    }
  }

  // Generate share link
  const generateShareLink = () => {
    const baseUrl = window.location.origin
    const params = new URLSearchParams()
    
    params.set('resource', resource.ref)
    if (context === 'collection' && collectionId) {
      params.set('collection', collectionId)
    }
    if (searchParams) {
      Object.entries(searchParams).forEach(([key, value]) => {
        params.set(key, value)
      })
    }
    
    const shareUrl = `${baseUrl}/share?${params.toString()}`
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('Share link copied to clipboard!')
    })
  }

  // Navigate to related resource
  const handleRelatedClick = async (relatedResource) => {
    // Load the new resource data
    setLoading(true)
    try {
      // Update current resource
      resource.ref = relatedResource.ref
      resource.field8 = relatedResource.field8 || relatedResource.title
      resource.file_extension = relatedResource.file_extension
      resource.resource_type = relatedResource.resource_type
      
      // Reload all data for the new resource
      await loadResourceData()
    } catch (err) {
      console.error('Failed to switch to related resource:', err)
    }
  }

  // Search by metadata value
  const searchByMetadataValue = (field, value) => {
    // Navigate to browse page with search filter
    const searchQuery = `${field.name}:"${value}"`
    navigate(`/?search=${encodeURIComponent(searchQuery)}`)
    onClose()
  }

  // Check if resource is in active collection
  const checkIfInCollection = async () => {
    if (!activeCollection?.ref) {
      setIsInCollection(false)
      return
    }

    try {
      const results = await api.searchResources(
        `!collection${activeCollection.ref}`,
        {
          restypes: '',
          order_by: 'relevance',
          archive: 0,
          fetchrows: 1000
        }
      )
      
      if (results && Array.isArray(results)) {
        const inCollection = results.some(r => r.ref === resource.ref)
        setIsInCollection(inCollection)
      }
    } catch (err) {
      console.error('Failed to check collection status:', err)
    }
  }

  // Toggle resource in collection
  const toggleResourceInCollection = async () => {
    if (!activeCollection?.ref) return

    try {
      if (isInCollection) {
        // Remove from collection
        const response = await axios.delete(
          `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/collections/${activeCollection.ref}/resources/${resource.ref}?sessionKey=${sessionKey}`
        )
        
        if (response.data.success) {
          setIsInCollection(false)
          if (onRemoveFromCollection) {
            onRemoveFromCollection(resource.ref)
          }
        }
      } else {
        // Add to collection
        const response = await axios.post(
          `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/collections/${activeCollection.ref}/resources/${resource.ref}`,
          { sessionKey }
        )
        
        if (response.data.success) {
          setIsInCollection(true)
          if (onAddToCollection) {
            onAddToCollection(resource)
          }
        }
      }
    } catch (err) {
      console.error('Failed to toggle resource in collection:', err)
      alert('Failed to update collection')
    }
  }

  // Handle metadata panel resize
  const handleMetadataResize = useCallback((e) => {
    if (!isResizingMetadata) return
    
    const newWidth = Math.max(MIN_METADATA_WIDTH, Math.min(MAX_METADATA_WIDTH, window.innerWidth - e.clientX))
    setMetadataWidth(newWidth)
  }, [isResizingMetadata])

  const handleResizeEnd = useCallback(() => {
    setIsResizingMetadata(false)
  }, [])

  useEffect(() => {
    if (isResizingMetadata) {
      document.addEventListener('mousemove', handleMetadataResize)
      document.addEventListener('mouseup', handleResizeEnd)
      return () => {
        document.removeEventListener('mousemove', handleMetadataResize)
        document.removeEventListener('mouseup', handleResizeEnd)
      }
    }
  }, [isResizingMetadata, handleMetadataResize, handleResizeEnd])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return
      
      switch (e.key) {
        case 'Escape':
          if (isImageFullscreen) {
            setIsImageFullscreen(false)
          } else if (isFullscreen) {
            setIsFullscreen(false)
          } else if (editingField) {
            setEditingField(null)
          } else {
            onClose()
          }
          break
        case 'ArrowLeft':
          if (hasPrevious && !e.target.closest('input, textarea')) {
            onPrevious()
          }
          break
        case 'ArrowRight':
          if (hasNext && !e.target.closest('input, textarea')) {
            onNext()
          }
          break
        case 'i':
        case 'I':
          if (!e.target.closest('input, textarea')) {
            e.preventDefault()
            setShowMetadata(!showMetadata)
          }
          break
        case 'f':
        case 'F':
          if (!e.target.closest('input, textarea')) {
            setIsImageFullscreen(!isImageFullscreen)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, onNext, onPrevious, hasNext, hasPrevious, showMetadata, isFullscreen, editingField, isImageFullscreen])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm"
        onClick={(e) => {
          // Only close if clicking the backdrop, not the content
          if (e.target === e.currentTarget) {
            onClose()
          }
        }}
      >
        <div className={cn(
          "relative h-full w-full flex",
          isImageFullscreen && "p-0"
        )} ref={modalRef}>
          {/* Left Metadata Panel */}
          <AnimatePresence>
            {showMetadata && !isImageFullscreen && (
              <motion.div
                initial={{ x: -metadataWidth }}
                animate={{ x: 0 }}
                exit={{ x: -metadataWidth }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative bg-art-gray-900/95 backdrop-blur-sm border-r border-art-gray-800 overflow-y-auto flex-shrink-0 shadow-2xl"
                style={{ 
                  width: `${metadataWidth}px`,
                  height: activeCollection ? `calc(100vh - ${collectionBarHeight || 52}px)` : '100vh'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Resize Handle */}
                <div
                  className="absolute right-0 top-0 bottom-0 w-1 hover:w-2 bg-art-gray-700 hover:bg-art-accent cursor-ew-resize transition-all"
                  onMouseDown={() => setIsResizingMetadata(true)}
                />

                {/* Close button inside panel */}
                <button
                  onClick={() => setShowMetadata(false)}
                  className="absolute top-4 right-4 z-10 p-1.5 rounded-md bg-art-gray-800 hover:bg-art-gray-700 text-white transition-all"
                  title="Close metadata panel (I)"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className={cn(
                  "pt-12 px-4 pb-4 h-full overflow-y-auto",
                  metadataWidth > 400 ? "px-6" : "px-4"
                )}>
                  {/* Resource Type */}
                  <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-art-gray-400 uppercase">Resource Type</h3>
                        {permissions.edit && (
                          <button
                            onClick={() => setEditingResourceType(!editingResourceType)}
                            className="p-1 rounded hover:bg-art-gray-800"
                          >
                            <Edit2 className="h-3 w-3 text-art-gray-400" />
                          </button>
                        )}
                      </div>
                      {editingResourceType ? (
                        <div className="space-y-2">
                          <select
                            value={resourceData?.resource_type || resource.resource_type}
                            onChange={(e) => updateResourceType(e.target.value)}
                            className="w-full px-3 py-2 bg-art-gray-800 border border-art-gray-700 rounded text-white"
                            disabled={saving}
                          >
                            {resourceTypes.map(type => (
                              <option key={type.ref} value={type.ref}>{type.name}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <p className="text-white">
                          {resourceTypes.find(t => t.ref == (resourceData?.resource_type || resource.resource_type))?.name || 'Unknown'}
                        </p>
                      )}
                    </div>

                    {/* Metadata Sections */}
                    {metadata && organizeMetadataIntoSections(metadata).map((section, index) => (
                      <div key={section.key} className={cn(
                        "pb-6",
                        index !== organizeMetadataIntoSections(metadata).length - 1 && "border-b border-art-gray-800"
                      )}>
                        <h3 className="text-sm font-semibold text-art-gray-400 uppercase mb-4 tracking-wider">{section.title}</h3>
                        <div className={cn(
                          "grid gap-3",
                          metadataWidth > 400 ? "grid-cols-2" : "grid-cols-1"
                        )}>
                          {section.fields.map(field => (
                            <div key={field.ref} className={cn(
                              "col-span-1",
                              // Make some fields span full width
                              (field.type === 'largetextarea' || field.name?.toLowerCase().includes('description')) && "md:col-span-2"
                            )}>
                              <div className="group">
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-xs font-medium text-art-gray-400 uppercase tracking-wider">{field.title}</label>
                                  {permissions.edit && field.editable && (
                                    <button
                                      onClick={() => setEditingField(field.ref)}
                                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-art-gray-800 transition-opacity"
                                    >
                                      <Edit2 className="h-3 w-3 text-art-gray-400" />
                                    </button>
                                  )}
                                </div>
                            {editingField === field.ref ? (
                              <div className="flex gap-1">
                                <input
                                  type="text"
                                  value={editValues[field.ref]}
                                  onChange={(e) => setEditValues(prev => ({ ...prev, [field.ref]: e.target.value }))}
                                  className="flex-1 px-2 py-1 bg-art-gray-800 border border-art-gray-700 rounded text-white text-sm"
                                  disabled={saving}
                                />
                                <button
                                  onClick={() => saveField(field.ref)}
                                  className="p-1 rounded bg-green-600 hover:bg-green-700 text-white"
                                  disabled={saving}
                                >
                                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                </button>
                                <button
                                  onClick={() => {
                                    setEditValues(prev => ({ ...prev, [field.ref]: field.value || '' }))
                                    setEditingField(null)
                                  }}
                                  className="p-1 rounded bg-red-600 hover:bg-red-700 text-white"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <p 
                                className="text-white text-sm cursor-pointer hover:text-art-accent transition-colors"
                                onClick={() => field.value && searchByMetadataValue(field, field.value)}
                                title={`Search for "${field.value}"`}
                              >
                                {field.value || '-'}
                              </p>
                            )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Custom Thumbnail Upload */}
                    {permissions.edit && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-art-gray-400 uppercase">Custom Thumbnail</h3>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleThumbnailUpload}
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingThumbnail}
                          className="w-full px-4 py-2 bg-art-gray-800 hover:bg-art-gray-700 text-white rounded transition-colors flex items-center justify-center gap-2"
                        >
                          {uploadingThumbnail ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" />
                              Upload Thumbnail
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Alternative Files */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-art-gray-400 uppercase">Alternative Files</h3>
                      {alternativeFiles.length > 0 ? (
                        <ul className="space-y-1">
                          {alternativeFiles.map((file, idx) => (
                            <li key={idx} className="text-sm text-white flex items-center justify-between">
                              <span className="truncate">{file.name}</span>
                              <a
                                href={file.url}
                                download
                                className="text-art-accent hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <FileText className="h-3 w-3" />
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-art-gray-500">No alternative files</p>
                      )}
                      
                      {permissions.edit && (
                        <>
                          <input
                            ref={variantInputRef}
                            type="file"
                            onChange={handleVariantUpload}
                            className="hidden"
                          />
                          <button
                            onClick={() => variantInputRef.current?.click()}
                            disabled={uploadingVariant}
                            className="w-full px-4 py-2 bg-art-gray-800 hover:bg-art-gray-700 text-white rounded transition-colors flex items-center justify-center gap-2 text-sm"
                          >
                            {uploadingVariant ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4" />
                                Add Variant
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </div>

                    {/* Comments */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-art-gray-400 uppercase">Comments</h3>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {comments.length > 0 ? (
                          comments.map((comment, idx) => (
                            <div key={idx} className="bg-art-gray-800 p-2 rounded">
                              <p className="text-xs text-art-gray-400">{comment.user} - {comment.date}</p>
                              <p className="text-sm text-white">{comment.text}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-art-gray-500">No comments yet</p>
                        )}
                      </div>
                      
                      {permissions.comment && (
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && postComment()}
                            placeholder="Add a comment..."
                            className="flex-1 px-2 py-1 bg-art-gray-800 border border-art-gray-700 rounded text-white text-sm"
                          />
                          <button
                            onClick={postComment}
                            className="p-1 rounded bg-art-accent hover:bg-art-accent-dark text-white"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
              </motion.div>
            )}
          </AnimatePresence>


          {/* Main Content Area */}
          <div className={cn(
            "flex-1 relative",
            isImageFullscreen && "fixed inset-0 z-[100] bg-black"
          )} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            {!isImageFullscreen && (
              <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/90 to-transparent" style={{ height: '45px' }}>
              <div className="flex items-center justify-between h-full px-3">
                <div className="flex items-center space-x-2">
                  <AnimatePresence mode="wait">
                    {!showMetadata && (
                      <motion.button
                        key="info-button"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMetadata(true);
                        }}
                        className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors"
                        title="Show metadata panel (I)"
                      >
                        <Info className="h-4 w-4" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                  <h2 className="text-base font-medium text-white truncate max-w-2xl">
                    {resource.field8 || `Resource ${resource.ref}`}
                  </h2>
                </div>
                <div className="flex items-center space-x-2">
                  {activeCollection && (
                    <button
                      onClick={toggleResourceInCollection}
                      className={cn(
                        "p-1.5 rounded-md transition-colors",
                        isInCollection 
                          ? "bg-art-accent hover:bg-art-accent-dark text-white" 
                          : "bg-white/10 hover:bg-white/20 text-white"
                      )}
                      title={isInCollection ? `Remove from ${activeCollection.name}` : `Add to ${activeCollection.name}`}
                    >
                      {isInCollection ? <FolderMinus className="h-4 w-4" /> : <FolderPlus className="h-4 w-4" />}
                    </button>
                  )}
                  <button
                    onClick={generateShareLink}
                    className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors"
                    title="Share"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setIsImageFullscreen(!isImageFullscreen)}
                    className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors"
                    title="Fullscreen Image (F)"
                  >
                    <Expand className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors"
                    title="Maximize Modal"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors"
                    title="Close (ESC)"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            )}

            {/* Fullscreen Exit Button */}
            {isImageFullscreen && (
              <button
                onClick={() => setIsImageFullscreen(false)}
                className="absolute top-4 right-4 z-30 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all"
                title="Exit Fullscreen (ESC or F)"
              >
                <X className="h-6 w-6" />
              </button>
            )}

            {/* Navigation Arrows */}
            {hasPrevious && (
              <button
                onClick={onPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-25 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all transform hover:scale-110 backdrop-blur-sm"
                title="Previous (←)"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
            
            {hasNext && (
              <button
                onClick={onNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-25 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all transform hover:scale-110 backdrop-blur-sm"
                title="Next (→)"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}

            {/* Media Container */}
            <div 
              ref={mediaContainerRef}
              className="absolute inset-0 flex items-center justify-center"
              style={{
                top: isImageFullscreen ? 0 : '45px',
                bottom: activeCollection && !isImageFullscreen ? `${collectionBarHeight || 52}px` : 0,
                left: 0,
                right: 0,
                padding: 0
              }}
            >
              <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                {loading && (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                  </div>
                )}
                
                {error && (
                  <div className="flex flex-col items-center justify-center h-full text-white">
                    <p className="text-lg mb-2">Failed to load media</p>
                    <p className="text-sm opacity-70">{error}</p>
                  </div>
                )}
                
                {!loading && !error && mediaUrl && (
                  <div className="media-container w-full h-full flex items-center justify-center">
                    {mediaType === 'video' ? (
                      <div className="w-full h-full flex items-center justify-center bg-black">
                        <video
                          controls
                          autoPlay={false}
                          preload="metadata"
                          playsInline
                          className="w-full h-full rounded-lg shadow-2xl"
                          style={{ 
                            objectFit: 'contain',
                            backgroundColor: 'black',
                            maxWidth: '100%',
                            maxHeight: '100%'
                          }}
                          src={mediaUrl}
                          poster={resourceData?.thumb || null}
                          onError={(err) => {
                            console.error('Video error:', err)
                            setError('Failed to play video')
                          }}
                        >
                          <source src={mediaUrl} type={getVideoMimeType(resourceData?.file_extension || 'mp4')} />
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    ) : (
                      <ImageViewer
                        src={mediaUrl}
                        alt={resource.field8 || 'Resource preview'}
                        isFullscreen={isImageFullscreen}
                        availableHeight={availableSpace.height}
                        availableWidth={availableSpace.width}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Related Resources - Bottom Right */}
            {relatedResources.length > 0 && (
              <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-2 max-w-xs">
                <h3 className="text-xs font-semibold text-white mb-2 px-2">Related Resources</h3>
                <div className="flex gap-2 overflow-x-auto scrollbar-none">
                  {relatedResources.map((related) => (
                    <button
                      key={related.ref}
                      onClick={() => handleRelatedClick(related)}
                      className="flex-shrink-0 w-16 h-16 rounded overflow-hidden hover:ring-2 hover:ring-art-accent transition-all"
                      title={related.field8 || `Resource ${related.ref}`}
                    >
                      {related.thumb ? (
                        <img
                          src={related.thumb}
                          alt={related.field8 || 'Related resource'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-art-gray-800 flex items-center justify-center">
                          <FileText className="h-6 w-6 text-art-gray-600" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// Helper function to organize metadata into sections
function organizeMetadataIntoSections(metadata) {
  if (!metadata || !Array.isArray(metadata)) return []

  const sections = {
    general: {
      title: 'General Info',
      fields: [],
      order: 1,
      fieldNames: ['title', 'caption', 'description', 'date', 'country', 'credit']
    },
    media: {
      title: 'Media Info',
      fields: [],
      order: 2,
      fieldNames: ['camera', 'model', 'lens', 'filename', 'filetype', 'originalfilename', 'filesize', 'dimensions', 'resolution', 'pixelwidth', 'pixelheight']
    },
    keywords: {
      title: 'Keywords & Tags',
      fields: [],
      order: 3,
      fieldNames: ['keywords', 'tags', 'subject', 'category']
    },
    people: {
      title: 'People',
      fields: [],
      order: 4,
      fieldNames: ['person', 'people', 'namedpersons', 'actors', 'creator', 'contributor']
    },
    administrative: {
      title: 'Administrative',
      fields: [],
      order: 5,
      fieldNames: ['notes', 'source', 'copyright', 'intellectual', 'restrictions', 'contactemail']
    }
  }

  // Categorize fields
  metadata.forEach(field => {
    // Only include fields with display_field === true
    if (field.display_field === false) return
    
    // Skip empty values unless they're editable
    if (!field.value && !field.editable) return

    const fieldNameLower = field.name?.toLowerCase() || ''
    let categorized = false

    // Try to categorize based on field name
    for (const [sectionKey, section] of Object.entries(sections)) {
      if (section.fieldNames.some(name => fieldNameLower.includes(name))) {
        section.fields.push(field)
        categorized = true
        break
      }
    }

    // If not categorized, add to general
    if (!categorized) {
      sections.general.fields.push(field)
    }
  })

  // Convert to array and filter out empty sections
  return Object.entries(sections)
    .map(([key, section]) => ({
      key,
      ...section
    }))
    .filter(section => section.fields.length > 0)
    .sort((a, b) => a.order - b.order)
}

// Helper function to determine media type
function getMediaType(resource) {
  if (!resource) return 'image'
  
  // Check resource_type first (more reliable than extension)
  if (resource.resource_type === '3' || resource.resource_type === 3) return 'video'
  if (resource.resource_type === '4' || resource.resource_type === 4) return 'audio'
  
  // Fall back to extension check
  if (resource.file_extension) {
    const ext = resource.file_extension.toLowerCase()
    const videoExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'm4v']
    const audioExtensions = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a']
    
    if (videoExtensions.includes(ext)) return 'video'
    if (audioExtensions.includes(ext)) return 'audio'
  }
  
  return 'image'
}

// Helper function to get proper MIME type for video
function getVideoMimeType(extension) {
  const mimeTypes = {
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'mkv': 'video/x-matroska',
    'flv': 'video/x-flv',
    'wmv': 'video/x-ms-wmv',
    'm4v': 'video/mp4',
    'ogv': 'video/ogg'
  }
  return mimeTypes[extension.toLowerCase()] || 'video/mp4'
}