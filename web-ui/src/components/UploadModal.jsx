import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Upload, AlertCircle, CheckCircle, Loader2, RefreshCw, Eye, Folder, ChevronRight, ChevronLeft, Image, FileText, Film, Music, Archive, File } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApi } from '../contexts/ApiContext'
import { useLocation, useParams } from 'react-router-dom'
import { detectUploadContext, checkUploadPermission } from '../lib/upload-context'
import { getResourceTypeFromFile, getResourceTypeIcon, getResourceTypeDisplayName, groupFilesByResourceType } from '../lib/resource-type-utils'
import UploadProgress from './UploadProgress'
import CollectionSelector from './CollectionSelector'
import UploadedResourcesGrid from './UploadedResourcesGrid'
import MetadataForm from './MetadataForm'

export default function UploadModal({ isOpen, onClose, files = [], onUploadComplete }) {
  const api = useApi()
  const location = useLocation()
  const params = useParams()
  
  // Upload state
  const [uploadContext, setUploadContext] = useState(null)
  const [permission, setPermission] = useState({ allowed: true, reason: null })
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({})
  const [uploadedResources, setUploadedResources] = useState([])
  const [errors, setErrors] = useState({})
  const [modalFiles, setModalFiles] = useState(files) // Local state for files
  const [isDraggingModal, setIsDraggingModal] = useState(false)
  const modalDragCounter = useRef(0)
  
  // Options
  const [selectedCollection, setSelectedCollection] = useState(null)
  const [relateUploads, setRelateUploads] = useState(true)
  const [relateToResource, setRelateToResource] = useState(false)
  const [showResults, setShowResults] = useState(false)
  
  // Metadata
  const [step, setStep] = useState(1) // 1: Files/Options, 2: Metadata, 3: Upload Progress, 4: Results
  const [commonMetadata, setCommonMetadata] = useState({})
  const [lockedFields, setLockedFields] = useState(new Set())
  const [fileMetadata, setFileMetadata] = useState({}) // Per-file metadata
  const [currentMetadataIndex, setCurrentMetadataIndex] = useState(0) // For individual file metadata
  const [metadataMode, setMetadataMode] = useState('locked') // 'locked' or 'individual'
  const [resourceTypes, setResourceTypes] = useState([]) // Available resource types from API
  const [selectedResourceType, setSelectedResourceType] = useState(null) // User-selected resource type
  
  // Update modal files when prop changes
  useEffect(() => {
    setModalFiles(files)
  }, [files])
  
  // Detect context on mount and load resource types
  useEffect(() => {
    if (isOpen) {
      const context = detectUploadContext(location, params)
      setUploadContext(context)
      
      // Set default collection if in collection context
      if (context.type === 'collection') {
        setSelectedCollection(context.collectionId)
      }
      
      // Enable relate to resource if in resource context
      if (context.type === 'resource') {
        setRelateToResource(true)
      }
      
      // Check permissions
      checkPermissions(context)
      
      // Load resource types
      loadResourceTypes()
    }
  }, [isOpen, location, params])
  
  const loadResourceTypes = async () => {
    try {
      const types = await api.getResourceTypes()
      setResourceTypes(types)
      
      // Set default resource type based on first file
      if (modalFiles.length > 0 && !selectedResourceType) {
        const defaultType = getResourceTypeFromFile(modalFiles[0])
        setSelectedResourceType(defaultType)
      }
    } catch (error) {
      console.error('Failed to load resource types:', error)
    }
  }
  
  const checkPermissions = async (context) => {
    const result = await checkUploadPermission(api, context)
    setPermission(result)
  }
  
  // File preview renderer
  const renderFilePreview = (file) => {
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    
    if (isImage || isVideo) {
      const url = URL.createObjectURL(file)
      if (isImage) {
        return <img src={url} alt={file.name} className="w-full h-full object-cover" />
      } else {
        return <video src={url} className="w-full h-full object-cover" muted />
      }
    }
    
    // Show file type icon
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-art-gray-800">
        {getFileIcon(file)}
        <span className="text-xs text-art-gray-500 mt-2">
          {file.name.split('.').pop().toUpperCase()}
        </span>
      </div>
    )
  }
  
  // Handle metadata changes from form
  const handleMetadataChange = useCallback((metadata, locked) => {
    if (metadataMode === 'locked') {
      setCommonMetadata(metadata)
      setLockedFields(locked)
    } else {
      // Individual mode - save for current file
      setFileMetadata(prev => ({
        ...prev,
        [currentMetadataIndex]: metadata
      }))
    }
  }, [metadataMode, currentMetadataIndex])
  
  // Progress to next file in individual metadata mode
  const handleNextFile = () => {
    if (currentMetadataIndex < modalFiles.length - 1) {
      setCurrentMetadataIndex(currentMetadataIndex + 1)
    } else {
      // All files done, proceed to upload
      setStep(3)
      handleUpload()
    }
  }
  
  // Progress to previous file in individual metadata mode
  const handlePreviousFile = () => {
    if (currentMetadataIndex > 0) {
      setCurrentMetadataIndex(currentMetadataIndex - 1)
    }
  }
  
  // Upload handler
  const handleUpload = async () => {
    if (!permission.allowed) return
    
    setUploading(true)
    setShowResults(false)
    const results = []
    
    for (let i = 0; i < modalFiles.length; i++) {
      const file = modalFiles[i]
      const fileId = `file-${i}`
      
      try {
        // Update progress
        setUploadProgress(prev => ({
          ...prev,
          [fileId]: { percent: 0, status: 'creating' }
        }))
        
        // Prepare metadata for this file
        const resourceMetadata = {}
        
        // Add locked fields from common metadata
        lockedFields.forEach(fieldId => {
          if (commonMetadata[fieldId] !== undefined) {
            resourceMetadata[fieldId] = commonMetadata[fieldId]
          }
        })
        
        // Add file-specific metadata (for single file or unlocked fields)
        if (files.length === 1) {
          // For single file, use all metadata
          Object.assign(resourceMetadata, commonMetadata)
        } else {
          // For multiple files, use per-file metadata for unlocked fields
          const perFileData = fileMetadata[fileId] || {}
          Object.keys(perFileData).forEach(fieldId => {
            if (!lockedFields.has(fieldId)) {
              resourceMetadata[fieldId] = perFileData[fieldId]
            }
          })
        }
        
        // Always set filename as title if not provided (field 8 is typically the title field)
        if (!resourceMetadata[8]) {
          resourceMetadata[8] = file.name
        }
        
        // Step 1: Create resource with initial metadata
        const createResult = await api.createResource({
          resource_type: selectedResourceType || getResourceTypeFromFile(file),
          archive: 0,
          metadata: resourceMetadata
        })
        
        if (!createResult.ref) {
          throw new Error('Failed to create resource')
        }
        
        const resourceRef = createResult.ref
        
        // Step 2: Upload file
        setUploadProgress(prev => ({
          ...prev,
          [fileId]: { percent: 10, status: 'uploading' }
        }))
        
        await api.uploadMultipart(resourceRef, file, {
          no_exif: true,
          revert: false,
          onProgress: (percent) => {
            setUploadProgress(prev => ({
              ...prev,
              [fileId]: { percent: 10 + (percent * 0.8), status: 'uploading' }
            }))
          }
        })
        
        // Step 3: Handle node-based fields if any
        setUploadProgress(prev => ({
          ...prev,
          [fileId]: { percent: 90, status: 'processing' }
        }))
        
        // Since we already sent metadata during resource creation,
        // we only need to handle node-based fields separately
        const nodeFields = []
        
        Object.entries(resourceMetadata).forEach(([fieldId, value]) => {
          // Check if this is a node field (contains comma-separated node IDs)
          if (value && typeof value === 'string' && value.includes(',') && /^\d+(,\d+)*$/.test(value)) {
            nodeFields.push({ fieldId, nodeIds: value })
          }
        })
        
        // Add nodes for fixed list fields
        for (const { fieldId, nodeIds } of nodeFields) {
          try {
            await api.addResourceNodes(resourceRef, nodeIds)
          } catch (error) {
            console.error(`Failed to add nodes for field ${fieldId}:`, error)
          }
        }
        
        // Add to collection if selected
        if (selectedCollection) {
          await api.addResourceToCollection(resourceRef, selectedCollection)
        }
        
        // Step 4: Handle relationships
        if (relateToResource && uploadContext?.resourceId) {
          await api.relateResources(resourceRef, uploadContext.resourceId)
        }
        
        // Complete
        setUploadProgress(prev => ({
          ...prev,
          [fileId]: { percent: 100, status: 'complete' }
        }))
        
        results.push({
          ref: resourceRef,
          file: file,
          success: true
        })
        
      } catch (error) {
        console.error(`Upload failed for ${file.name}:`, error)
        setErrors(prev => ({
          ...prev,
          [fileId]: error.message || 'Upload failed'
        }))
        setUploadProgress(prev => ({
          ...prev,
          [fileId]: { percent: 0, status: 'error' }
        }))
        
        results.push({
          file: file,
          success: false,
          error: error.message
        })
      }
    }
    
    // Handle relating uploads to each other
    if (relateUploads && results.filter(r => r.success).length > 1) {
      const successfulRefs = results.filter(r => r.success).map(r => r.ref)
      for (let i = 0; i < successfulRefs.length - 1; i++) {
        try {
          await api.relateResources(successfulRefs[i], successfulRefs[i + 1])
        } catch (error) {
          console.error('Failed to relate resources:', error)
        }
      }
    }
    
    setUploadedResources(results.filter(r => r.success))
    setUploading(false)
    setShowResults(true)
    setStep(4)
    
    // Call upload complete callback if any uploads succeeded
    if (onUploadComplete && results.some(r => r.success)) {
      onUploadComplete()
    }
  }
  
  // Get icon for file type
  const getFileIcon = (file) => {
    const resourceType = getResourceTypeFromFile(file)
    const iconName = getResourceTypeIcon(resourceType)
    
    const icons = {
      Image: <Image className="h-8 w-8 text-art-gray-400" />,
      FileText: <FileText className="h-8 w-8 text-art-gray-400" />,
      Film: <Film className="h-8 w-8 text-art-gray-400" />,
      Music: <Music className="h-8 w-8 text-art-gray-400" />,
      Archive: <Archive className="h-8 w-8 text-art-gray-400" />,
      File: <File className="h-8 w-8 text-art-gray-400" />
    }
    
    return icons[iconName] || icons.File
  }
  
  // Retry failed uploads
  const retryFailedUploads = () => {
    const failedFiles = modalFiles.filter((file, index) => 
      errors[`file-${index}`] || uploadProgress[`file-${index}`]?.status === 'error'
    )
    setErrors({})
    setUploadProgress({})
    handleUpload()
  }
  
  // Handle drag events for modal
  const handleModalDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    modalDragCounter.current += 1
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingModal(true)
    }
  }
  
  const handleModalDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    modalDragCounter.current -= 1
    if (modalDragCounter.current === 0) {
      setIsDraggingModal(false)
    }
  }
  
  const handleModalDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }
  
  const handleModalDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    modalDragCounter.current = 0
    setIsDraggingModal(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      // Add new files to existing files
      setModalFiles(prev => [...prev, ...droppedFiles])
      // Reset to step 1 to show all files
      if (step > 1) {
        setStep(1)
      }
    }
  }
  
  // File input for browse button
  const fileInputRef = useRef(null)
  const handleBrowseClick = () => {
    fileInputRef.current?.click()
  }
  
  const handleFileInputChange = (e) => {
    const selectedFiles = Array.from(e.target.files)
    if (selectedFiles.length > 0) {
      setModalFiles(prev => [...prev, ...selectedFiles])
      if (step > 1) {
        setStep(1)
      }
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  
  if (!isOpen) return null
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-art-darker rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-art-gray-900 px-6 py-4 flex items-center justify-between border-b border-art-gray-800">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              Upload {modalFiles.length} {modalFiles.length === 1 ? 'File' : 'Files'}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Progress indicator */}
          {!showResults && (
            <div className="px-6 py-3 border-b border-art-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`flex items-center ${step >= 1 ? 'text-white' : 'text-art-gray-500'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step === 1 ? 'bg-art-accent' : step > 1 ? 'bg-green-500' : 'bg-art-gray-700'
                    }`}>
                      {step > 1 ? '✓' : '1'}
                    </div>
                    <span className="ml-2 text-sm">Files & Options</span>
                  </div>
                  
                  <ChevronRight className="h-4 w-4 text-art-gray-600" />
                  
                  <div className={`flex items-center ${step >= 2 ? 'text-white' : 'text-art-gray-500'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step === 2 ? 'bg-art-accent' : step > 2 ? 'bg-green-500' : 'bg-art-gray-700'
                    }`}>
                      {step > 2 ? '✓' : '2'}
                    </div>
                    <span className="ml-2 text-sm">Metadata</span>
                  </div>
                  
                  <ChevronRight className="h-4 w-4 text-art-gray-600" />
                  
                  <div className={`flex items-center ${step >= 3 ? 'text-white' : 'text-art-gray-500'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step === 3 ? 'bg-art-accent' : step > 3 ? 'bg-green-500' : 'bg-art-gray-700'
                    }`}>
                      {step > 3 ? '✓' : '3'}
                    </div>
                    <span className="ml-2 text-sm">Upload</span>
                  </div>
                  
                  <ChevronRight className="h-4 w-4 text-art-gray-600" />
                  
                  <div className={`flex items-center ${step >= 4 ? 'text-white' : 'text-art-gray-500'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step === 4 ? 'bg-art-accent' : 'bg-art-gray-700'
                    }`}>
                      4
                    </div>
                    <span className="ml-2 text-sm">Complete</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {step === 1 && !showResults ? (
              <>
                {/* Permission warning */}
                {!permission.allowed && (
                  <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <p className="text-red-400 font-medium">Upload Permission Denied</p>
                        <p className="text-red-300 text-sm mt-1">{permission.reason}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Context info */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-art-gray-400 mb-2">Upload Context</h3>
                  <div className="flex items-center justify-between p-3 bg-art-gray-900 rounded-lg">
                    <span className="text-white">{uploadContext?.description || 'General Upload'}</span>
                    {uploadContext?.type === 'collection' && (
                      <CollectionSelector
                        value={selectedCollection}
                        onChange={setSelectedCollection}
                        className="ml-4"
                      />
                    )}
                  </div>
                </div>
                
                {/* File previews grouped by type */}
                <div className="mb-6">
                  {modalFiles.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-art-gray-400">Files to Upload</h3>
                        <button
                          onClick={handleBrowseClick}
                          className="text-sm text-art-accent hover:text-art-accent-dark transition-colors"
                        >
                          + Add more files
                        </button>
                      </div>
                      
                      {/* Drag and drop zone for adding more */}
                      <div
                        onDragEnter={handleModalDragEnter}
                        onDragLeave={handleModalDragLeave}
                        onDragOver={handleModalDragOver}
                        onDrop={handleModalDrop}
                        className={`mb-4 border-2 border-dashed rounded-lg p-4 text-center transition-all ${
                          isDraggingModal
                            ? 'border-art-accent bg-art-accent/10'
                            : 'border-art-gray-700 hover:border-art-gray-600'
                        }`}
                      >
                        <Upload className="mx-auto h-8 w-8 text-art-gray-500 mb-2" />
                        <p className="text-sm text-art-gray-400">
                          Drag and drop more files here or{' '}
                          <button
                            onClick={handleBrowseClick}
                            className="text-art-accent hover:text-art-accent-dark transition-colors"
                          >
                            browse
                          </button>
                        </p>
                      </div>
                    </>
                  ) : (
                    /* Empty state - large drop zone */
                    <div
                      onDragEnter={handleModalDragEnter}
                      onDragLeave={handleModalDragLeave}
                      onDragOver={handleModalDragOver}
                      onDrop={handleModalDrop}
                      className={`border-2 border-dashed rounded-lg p-12 text-center transition-all ${
                        isDraggingModal
                          ? 'border-art-accent bg-art-accent/10'
                          : 'border-art-gray-700 hover:border-art-gray-600'
                      }`}
                    >
                      <Upload className="mx-auto h-16 w-16 text-art-gray-500 mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">
                        Choose files to upload
                      </h3>
                      <p className="text-art-gray-400 mb-4">
                        Drag and drop your files here or{' '}
                        <button
                          onClick={handleBrowseClick}
                          className="text-art-accent hover:text-art-accent-dark transition-colors"
                        >
                          browse
                        </button>
                      </p>
                      <p className="text-sm text-art-gray-500">
                        Supported formats: Images, Videos, Documents, Archives
                      </p>
                    </div>
                  )}
                  
                  {(() => {
                    const grouped = groupFilesByResourceType(modalFiles)
                    return Object.entries(grouped).map(([resourceType, typeFiles]) => (
                      <div key={resourceType} className="mb-4">
                        <h4 className="text-sm text-art-gray-500 mb-2">
                          {getResourceTypeDisplayName(parseInt(resourceType))} ({typeFiles.length})
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {typeFiles.map((file, index) => {
                            const fileIndex = modalFiles.indexOf(file)
                            return (
                              <div key={fileIndex} className="relative group">
                                <div className="aspect-square rounded-lg overflow-hidden bg-art-gray-900">
                                  {renderFilePreview(file)}
                                </div>
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-end p-2">
                                  <p className="text-white text-xs truncate">{file.name}</p>
                                </div>
                                {/* Remove file button */}
                                <button
                                  onClick={() => {
                                    setModalFiles(prev => {
                                      const newFiles = prev.filter((_, i) => i !== fileIndex)
                                      // Close modal if no files left
                                      if (newFiles.length === 0) {
                                        setTimeout(() => onClose(), 100)
                                      }
                                      return newFiles
                                    })
                                  }}
                                  className="absolute top-2 right-2 p-1 bg-black/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                                >
                                  <X className="h-3 w-3 text-white" />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))
                  })()}
                </div>
                
                {/* Options */}
                <div className="mb-6 space-y-3">
                  <label className="flex items-center text-white">
                    <input
                      type="checkbox"
                      checked={relateUploads}
                      onChange={(e) => setRelateUploads(e.target.checked)}
                      className="mr-3 rounded text-art-accent focus:ring-art-accent"
                    />
                    Relate uploaded files to each other
                  </label>
                  
                  {uploadContext?.type === 'resource' && (
                    <label className="flex items-center text-white">
                      <input
                        type="checkbox"
                        checked={relateToResource}
                        onChange={(e) => setRelateToResource(e.target.checked)}
                        className="mr-3 rounded text-art-accent focus:ring-art-accent"
                      />
                      Relate to current resource #{uploadContext.resourceId}
                    </label>
                  )}
                  
                  {uploadContext?.type !== 'collection' && (
                    <div className="flex items-center">
                      <Folder className="h-4 w-4 text-art-gray-400 mr-2" />
                      <span className="text-art-gray-400 mr-3">Add to collection:</span>
                      <CollectionSelector
                        value={selectedCollection}
                        onChange={setSelectedCollection}
                        placeholder="None"
                      />
                    </div>
                  )}
                </div>
              </>
            ) : step === 2 && !showResults ? (
              /* Metadata step */
              <>
                {/* Resource Type Selector */}
                <div className="mb-6 p-4 bg-art-gray-900 rounded-lg">
                  <h3 className="text-sm font-medium text-white mb-2">Resource Type</h3>
                  <select
                    value={selectedResourceType || ''}
                    onChange={(e) => setSelectedResourceType(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                  >
                    <option value="">Select resource type...</option>
                    {resourceTypes.map(type => (
                      <option key={type.ref} value={type.ref}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-art-gray-500 mt-2">
                    This determines which metadata fields are available
                  </p>
                </div>
                
                {modalFiles.length > 1 && (
                  <div className="mb-4 p-4 bg-art-gray-900 rounded-lg">
                    <h3 className="text-sm font-medium text-white mb-2">Metadata Entry Mode</h3>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="metadataMode"
                          value="locked"
                          checked={metadataMode === 'locked'}
                          onChange={(e) => setMetadataMode(e.target.value)}
                          className="mr-2 text-art-accent focus:ring-art-accent"
                        />
                        <span className="text-white">Use locked fields for all files</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="metadataMode"
                          value="individual"
                          checked={metadataMode === 'individual'}
                          onChange={(e) => setMetadataMode(e.target.value)}
                          className="mr-2 text-art-accent focus:ring-art-accent"
                        />
                        <span className="text-white">Enter metadata for each file</span>
                      </label>
                    </div>
                  </div>
                )}
                
                {metadataMode === 'individual' && modalFiles.length > 1 && (
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-medium text-white">
                      File {currentMetadataIndex + 1} of {modalFiles.length}: {modalFiles[currentMetadataIndex].name}
                    </h3>
                    <div className="text-sm text-art-gray-400">
                      {getResourceTypeDisplayName(getResourceTypeFromFile(modalFiles[currentMetadataIndex]))}
                    </div>
                  </div>
                )}
                
                {selectedResourceType ? (
                  <MetadataForm
                    resourceType={selectedResourceType}
                    fileCount={metadataMode === 'individual' ? 1 : modalFiles.length}
                    onMetadataChange={handleMetadataChange}
                    initialMetadata={metadataMode === 'individual' ? (fileMetadata[currentMetadataIndex] || {}) : commonMetadata}
                  />
                ) : (
                  <div className="text-center py-8 text-art-gray-500">
                    Please select a resource type to continue
                  </div>
                )}
              </>
            ) : step === 3 && !showResults ? (
              /* Upload progress step */
              <>
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white mb-4">Uploading {modalFiles.length} {modalFiles.length === 1 ? 'file' : 'files'}...</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {modalFiles.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden bg-art-gray-900">
                          {renderFilePreview(file)}
                        </div>
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-end p-2">
                          <p className="text-white text-xs truncate">{file.name}</p>
                        </div>
                        {uploadProgress[`file-${index}`] && (
                          <UploadProgress
                            percent={uploadProgress[`file-${index}`].percent}
                            status={uploadProgress[`file-${index}`].status}
                            error={errors[`file-${index}`]}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              /* Upload results */
              <UploadedResourcesGrid
                resources={uploadedResources}
                onViewResource={(ref) => {
                  window.open(`/resource/${ref}`, '_blank')
                }}
              />
            )}
          </div>
          
          {/* Footer */}
          <div className="bg-art-gray-900 px-6 py-4 flex items-center justify-between border-t border-art-gray-800">
            <div className="flex items-center space-x-2">
              {Object.values(errors).length > 0 && (
                <button
                  onClick={retryFailedUploads}
                  className="flex items-center px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                  disabled={uploading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Failed
                </button>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Back button */}
              {step > 1 && !showResults && !uploading && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="flex items-center px-4 py-2 text-art-gray-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </button>
              )}
              
              <button
                onClick={onClose}
                className="px-4 py-2 text-art-gray-400 hover:text-white transition-colors"
              >
                {showResults ? 'Close' : 'Cancel'}
              </button>
              
              {/* Step-specific buttons */}
              {step === 1 && !showResults && (
                <button
                  onClick={() => setStep(2)}
                  disabled={!permission.allowed || modalFiles.length === 0}
                  className="flex items-center px-4 py-2 bg-art-accent hover:bg-art-accent-dark text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next: Add Metadata
                  <ChevronRight className="h-4 w-4 ml-2" />
                </button>
              )}
              
              {step === 2 && !showResults && metadataMode === 'locked' && (
                <button
                  onClick={() => {
                    setStep(3)
                    handleUpload()
                  }}
                  disabled={!permission.allowed || !selectedResourceType}
                  className="flex items-center px-4 py-2 bg-art-accent hover:bg-art-accent-dark text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Start Upload
                </button>
              )}
              
              {step === 2 && !showResults && metadataMode === 'individual' && (
                <>
                  {currentMetadataIndex < modalFiles.length - 1 ? (
                    <button
                      onClick={handleNextFile}
                      className="flex items-center px-4 py-2 bg-art-accent hover:bg-art-accent-dark text-white rounded-lg transition-colors"
                    >
                      Next File
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setStep(3)
                        handleUpload()
                      }}
                      disabled={!permission.allowed || !selectedResourceType}
                      className="flex items-center px-4 py-2 bg-art-accent hover:bg-art-accent-dark text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Start Upload
                    </button>
                  )}
                </>
              )}
              
              {step === 3 && !showResults && uploading && (
                <button
                  disabled
                  className="flex items-center px-4 py-2 bg-art-accent/50 text-white rounded-lg cursor-not-allowed"
                >
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </button>
              )}
              
              {showResults && uploadedResources.length > 0 && (
                <button
                  onClick={() => {
                    const refs = uploadedResources.map(r => r.ref).join(',')
                    window.location.href = `/search?q=ref:${refs}`
                  }}
                  className="flex items-center px-4 py-2 bg-art-accent hover:bg-art-accent-dark text-white rounded-lg transition-colors"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View All Uploads
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
        accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
      />
    </AnimatePresence>
  )
}