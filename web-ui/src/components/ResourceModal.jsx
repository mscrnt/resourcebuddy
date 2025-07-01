import { useState, useEffect, useRef, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Info, ZoomIn, ZoomOut, Maximize2, Volume2, VolumeX } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { useApi } from '../contexts/ApiContext'
import MetadataPanel from './MetadataPanel'
import RelatedResourcesStrip from './RelatedResourcesStrip'
import VideoPlayer from './VideoPlayer'
import ImageViewer from './ImageViewer'

export default function ResourceModal({ 
  resource, 
  isOpen, 
  onClose, 
  onNext, 
  onPrevious,
  hasNext,
  hasPrevious,
  context = 'search' // search, collection, related
}) {
  const api = useApi()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mediaUrl, setMediaUrl] = useState(null)
  const [relatedResources, setRelatedResources] = useState([])
  const [showMetadata, setShowMetadata] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  const modalRef = useRef(null)
  const mediaType = getMediaType(resource)

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

  // Load media URL when resource changes
  useEffect(() => {
    if (resource && isOpen) {
      loadMedia()
      loadRelatedResources()
    }
  }, [resource?.ref, isOpen])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return
      
      switch (e.key) {
        case 'Escape':
          if (isFullscreen) {
            setIsFullscreen(false)
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
          setShowMetadata(!showMetadata)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, onNext, onPrevious, hasNext, hasPrevious, showMetadata, isFullscreen])

  const loadMedia = async () => {
    setLoading(true)
    setError(null)
    try {
      // Get the appropriate preview size
      const size = mediaType === 'video' ? '' : 'scr' // screen size for images, original for video
      const url = await api.getResourcePath(resource.ref, size)
      setMediaUrl(url)
    } catch (err) {
      console.error('Failed to load media:', err)
      setError('Failed to load media')
    } finally {
      setLoading(false)
    }
  }

  const loadRelatedResources = async () => {
    try {
      const related = await api.getRelatedResources(resource.ref)
      // ResourceSpace returns an array of resource objects
      if (Array.isArray(related)) {
        // Get thumbnails for each related resource
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

  const handleRelatedClick = (relatedResource) => {
    // Update the current resource to the related one
    // This would be handled by the parent component
    console.log('Navigate to related resource:', relatedResource)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      >
        <div className="relative h-full w-full" ref={modalRef}>
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/70 to-transparent p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white truncate max-w-2xl">
                {resource.field8 || `Resource ${resource.ref}`}
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMetadata(!showMetadata)
                  }}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Toggle metadata (I)"
                >
                  <Info className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsFullscreen(!isFullscreen)
                  }}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Fullscreen"
                >
                  <Maximize2 className="h-5 w-5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Close (ESC)"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div 
            className="h-full w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Navigation Arrows */}
            {hasPrevious && (
              <button
                onClick={onPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all transform hover:scale-110"
                title="Previous (←)"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
            
            {hasNext && (
              <button
                onClick={onNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all transform hover:scale-110"
                title="Next (→)"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}

            {/* Media Container */}
            <div className={cn(
              "relative max-w-full max-h-full transition-all duration-300",
              showMetadata ? "mr-80" : "",
              isFullscreen ? "w-full h-full" : "w-[90vw] h-[85vh]"
            )}>
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
                <>
                  {mediaType === 'video' ? (
                    <VideoPlayer
                      src={mediaUrl}
                      resource={resource}
                      isFullscreen={isFullscreen}
                    />
                  ) : (
                    <ImageViewer
                      src={mediaUrl}
                      alt={resource.field8 || 'Resource preview'}
                      isFullscreen={isFullscreen}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          {/* Metadata Panel */}
          <AnimatePresence>
            {showMetadata && (
              <MetadataPanel
                resource={resource}
                isOpen={showMetadata}
                onClose={() => setShowMetadata(false)}
              />
            )}
          </AnimatePresence>

          {/* Related Resources Strip */}
          {relatedResources.length > 0 && (
            <RelatedResourcesStrip
              resources={relatedResources}
              currentResourceRef={resource.ref}
              onResourceClick={handleRelatedClick}
            />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// Helper function to determine media type
function getMediaType(resource) {
  if (!resource?.file_extension) return 'image'
  
  const ext = resource.file_extension.toLowerCase()
  const videoExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'm4v']
  const audioExtensions = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a']
  
  if (videoExtensions.includes(ext)) return 'video'
  if (audioExtensions.includes(ext)) return 'audio'
  return 'image'
}