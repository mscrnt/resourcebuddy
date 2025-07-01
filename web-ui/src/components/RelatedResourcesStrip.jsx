import { useRef, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '../lib/utils'

export default function RelatedResourcesStrip({ 
  resources = [], 
  currentResourceRef, 
  onResourceClick 
}) {
  const scrollContainerRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [hoveredResource, setHoveredResource] = useState(null)

  // Check scroll ability
  const checkScroll = () => {
    const container = scrollContainerRef.current
    if (!container) return

    setCanScrollLeft(container.scrollLeft > 0)
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth
    )
  }

  useEffect(() => {
    checkScroll()
    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener('scroll', checkScroll)
      window.addEventListener('resize', checkScroll)
      
      return () => {
        container.removeEventListener('scroll', checkScroll)
        window.removeEventListener('resize', checkScroll)
      }
    }
  }, [resources])

  const scroll = (direction) => {
    const container = scrollContainerRef.current
    if (!container) return

    const scrollAmount = container.clientWidth * 0.8
    const targetScroll = container.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount)
    
    container.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    })
  }

  if (!resources || resources.length === 0) return null

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent"
    >
      <div className="relative px-12 pb-6 pt-8">
        <h3 className="text-white text-sm font-medium mb-3 opacity-80">Related Resources</h3>
        
        {/* Scroll buttons */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {/* Thumbnails container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-3 overflow-x-auto scrollbar-none scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {resources.map((resource) => (
            <motion.button
              key={resource.ref}
              onClick={() => onResourceClick(resource)}
              onMouseEnter={() => setHoveredResource(resource.ref)}
              onMouseLeave={() => setHoveredResource(null)}
              className={cn(
                "relative flex-shrink-0 group transition-all duration-200",
                currentResourceRef === resource.ref
                  ? "ring-2 ring-white scale-105"
                  : "hover:scale-105"
              )}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.95 }}
            >
              {/* Thumbnail */}
              <div className="relative w-32 h-24 bg-art-gray-800 rounded-lg overflow-hidden">
                {resource.thumb && (
                  <img
                    src={resource.thumb}
                    alt={resource.field8 || `Resource ${resource.ref}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
                
                {/* Overlay on hover */}
                <div className={cn(
                  "absolute inset-0 bg-black/60 flex items-end p-2 transition-opacity duration-200",
                  hoveredResource === resource.ref ? "opacity-100" : "opacity-0"
                )}>
                  <div className="text-left">
                    <p className="text-white text-xs font-medium line-clamp-1">
                      {resource.field8 || `Resource ${resource.ref}`}
                    </p>
                    {resource.file_extension && (
                      <p className="text-white/70 text-xs uppercase">
                        {resource.file_extension}
                      </p>
                    )}
                  </div>
                </div>

                {/* Current indicator */}
                {currentResourceRef === resource.ref && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full animate-pulse" />
                )}
              </div>

              {/* Resource type indicator */}
              {resource.resource_type && (
                <div className="absolute -top-1 -right-1 bg-art-primary text-white text-xs px-1.5 py-0.5 rounded">
                  {getResourceTypeLabel(resource.resource_type)}
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// Helper function to get resource type label
function getResourceTypeLabel(type) {
  const types = {
    1: 'IMG',
    2: 'DOC',
    3: 'VID',
    4: 'AUD',
    // Add more types as needed
  }
  return types[type] || 'FILE'
}