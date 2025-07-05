import { useState, useEffect, useRef } from 'react'
import { cn } from '../lib/utils'
import { getResourcePreviewUrl } from '../lib/resourcespace-api-backend'

export default function ResourceCard({ 
  resource, 
  viewMode = 'grid', 
  showUser = true, 
  onClick,
  onLongPress,
  selected = false,
  selectionMode = false,
  onSelect,
  selectedResources = new Set(),
  allResources = []
}) {
  const [imageError, setImageError] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const longPressTimer = useRef(null)
  const touchStarted = useRef(false)
  
  const previewUrl = getResourcePreviewUrl(resource.ref, 'thm')
  const title = resource.field8 || resource.title || `Resource ${resource.ref}`
  const contributor = resource.created_by || 'Unknown'
  
  const formatFileSize = (bytes) => {
    if (!bytes) return '-'
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }
  
  // Handle long press for selection
  const handleTouchStart = () => {
    touchStarted.current = true
    longPressTimer.current = setTimeout(() => {
      if (touchStarted.current && onLongPress) {
        onLongPress()
      }
    }, 500) // 500ms for long press
  }
  
  const handleTouchEnd = () => {
    touchStarted.current = false
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }
  }
  
  const handleCheckboxClick = (e) => {
    e.stopPropagation()
    if (onSelect) {
      onSelect(e)
    }
  }

  // Drag and drop handlers
  const handleDragStart = (e) => {
    setIsDragging(true)
    
    // If multiple resources are selected and this resource is one of them,
    // include all selected resources in the drag
    if (selected && selectedResources.size > 1) {
      // Get all selected resource objects
      const selectedResourceObjects = allResources.filter(r => selectedResources.has(r.ref))
      
      // Set data for multiple resources
      e.dataTransfer.setData('resourceref', Array.from(selectedResources).join(','))
      e.dataTransfer.setData('resourcedata', JSON.stringify(selectedResourceObjects))
      e.dataTransfer.setData('multipleresources', 'true')
      
      // Set custom drag image showing count
      const dragImage = document.createElement('div')
      dragImage.style.position = 'absolute'
      dragImage.style.top = '-1000px'
      dragImage.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'
      dragImage.style.color = 'white'
      dragImage.style.padding = '8px 12px'
      dragImage.style.borderRadius = '4px'
      dragImage.style.fontSize = '14px'
      dragImage.style.fontWeight = 'bold'
      dragImage.innerHTML = `${selectedResources.size} resources`
      document.body.appendChild(dragImage)
      e.dataTransfer.setDragImage(dragImage, 0, 0)
      setTimeout(() => document.body.removeChild(dragImage), 0)
    } else {
      // Single resource drag
      e.dataTransfer.setData('resourceref', resource.ref)
      e.dataTransfer.setData('resourcedata', JSON.stringify(resource))
    }
    
    e.dataTransfer.effectAllowed = 'copy'
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }
    }
  }, [])
  
  // List view
  if (viewMode === 'list') {
    return (
      <div 
        onClick={(e) => onClick && onClick(e)}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className="flex items-center gap-4 p-4 card-theme rounded-lg bg-theme-hover transition-colors group cursor-pointer"
      >
        <div className="w-24 h-24 flex-shrink-0 bg-theme-tertiary rounded-lg overflow-hidden">
          {!imageError ? (
            <img
              src={previewUrl}
              alt={title}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <i className="fas fa-image text-2xl text-theme-tertiary"></i>
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-theme-primary font-medium truncate group-hover:text-art-accent transition-colors">
            {title}
          </h3>
          <div className="flex items-center gap-4 mt-1 text-sm text-theme-secondary">
            <span className="flex items-center gap-1">
              <i className="fas fa-calendar text-xs"></i>
              {new Date(resource.creation_date).toLocaleDateString()}
            </span>
            {showUser && (
              <span className="flex items-center gap-1">
                <i className="fas fa-user text-xs"></i>
                {contributor}
              </span>
            )}
            {resource.file_extension && (
              <span className="flex items-center gap-1">
                <i className="fas fa-file text-xs"></i>
                {resource.file_extension.toUpperCase()}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-art-gray-400">
          {resource.rating && (
            <span className="flex items-center gap-1">
              <i className="fas fa-star text-yellow-500"></i>
              {resource.rating}
            </span>
          )}
          <i className="fas fa-chevron-right"></i>
        </div>
      </div>
    )
  }
  
  // Masonry view - preserves aspect ratio
  if (viewMode === 'masonry') {
    return (
      <div 
        onClick={(e) => onClick && onClick(e)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={cn(
          "group cursor-pointer block mb-4 break-inside-avoid",
          selected && "ring-2 ring-art-accent rounded-lg"
        )}
      >
        <div className="relative bg-art-gray-900 rounded-lg overflow-hidden">
          {!imageError ? (
            <img
              src={previewUrl}
              alt={title}
              onError={() => setImageError(true)}
              className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full aspect-[4/3] flex items-center justify-center bg-art-gray-800">
              <i className="fas fa-image text-3xl text-art-gray-600"></i>
            </div>
          )}
          
          {/* Selection checkbox */}
          <div className={cn(
            "absolute top-2 left-2 z-10 transition-opacity",
            selectionMode || selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}>
            <input
              type="checkbox"
              checked={selected}
              onChange={handleCheckboxClick}
              onClick={(e) => e.stopPropagation()}
              className="resource-checkbox w-5 h-5 cursor-pointer bg-white/20 backdrop-blur-sm"
            />
          </div>
          
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <h3 className="text-white font-medium text-sm">{title}</h3>
              {showUser && (
                <p className="text-xs text-art-gray-300 mt-1">{contributor}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // Compact view
  if (viewMode === 'compact') {
    return (
      <div 
        onClick={(e) => onClick && onClick(e)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={cn(
          "relative aspect-square card-theme overflow-hidden group cursor-pointer",
          selected && "ring-2 ring-art-accent"
        )}
      >
        {!imageError ? (
          <img
            src={previewUrl}
            alt={title}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-theme-tertiary">
            <i className="fas fa-image text-xl text-theme-tertiary"></i>
          </div>
        )}
        
        {/* Selection checkbox */}
        <div className={cn(
          "absolute top-1 left-1 z-10 transition-opacity",
          selectionMode || selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}>
          <input
            type="checkbox"
            checked={selected}
            onChange={handleCheckboxClick}
            onClick={(e) => e.stopPropagation()}
            className="resource-checkbox w-4 h-4 cursor-pointer bg-white/20 backdrop-blur-sm"
          />
        </div>
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute bottom-0 left-0 right-0 p-2">
            <p className="text-white text-xs truncate">{title}</p>
          </div>
        </div>
      </div>
    )
  }
  
  // Default thumbnail view with info board
  return (
    <div 
      onClick={(e) => onClick && onClick(e)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        "group cursor-pointer card-theme rounded-lg overflow-hidden border border-theme-primary hover:border-theme-secondary transition-all",
        selected && "ring-2 ring-art-accent"
      )}
    >
      {/* Top bar with file extension and resource type */}
      <div className="flex items-center justify-between px-3 py-2 bg-theme-tertiary/50 border-b border-theme-primary">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={handleCheckboxClick}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "resource-checkbox w-4 h-4 cursor-pointer transition-opacity",
              selectionMode || selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
          />
          {resource.file_extension && (
            <span className="text-xs font-bold text-theme-secondary uppercase">
              {resource.file_extension}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {resource.archive !== undefined && resource.archive !== 0 && (
            <i className="fas fa-archive text-xs text-theme-tertiary" title={`Archive state: ${resource.archive}`}></i>
          )}
          <span className="text-xs text-theme-tertiary">#{resource.ref}</span>
        </div>
      </div>
      
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] bg-theme-secondary overflow-hidden">
        {!imageError ? (
          <img
            src={previewUrl}
            alt={title}
            onError={() => setImageError(true)}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <i className="fas fa-image text-3xl text-art-gray-700"></i>
          </div>
        )}
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <i className="fas fa-expand text-white text-2xl"></i>
        </div>
      </div>
      
      {/* Info panel */}
      <div className="p-3 space-y-2">
        {/* Title */}
        <h3 className="text-white font-medium line-clamp-2 group-hover:text-art-accent transition-colors" title={title}>
          {title}
        </h3>
        
        {/* Metadata fields */}
        <div className="space-y-1 text-sm">
          {/* Date created */}
          {resource.creation_date && (
            <div className="flex items-center gap-2 text-art-gray-400">
              <i className="fas fa-calendar text-xs w-4"></i>
              <span className="truncate">{new Date(resource.creation_date).toLocaleDateString()}</span>
            </div>
          )}
          
          {/* Created by */}
          {showUser && contributor && (
            <div className="flex items-center gap-2 text-art-gray-400">
              <i className="fas fa-user text-xs w-4"></i>
              <span className="truncate">{contributor}</span>
            </div>
          )}
          
          {/* File size */}
          {resource.file_size && (
            <div className="flex items-center gap-2 text-art-gray-400">
              <i className="fas fa-file text-xs w-4"></i>
              <span className="truncate">{formatFileSize(resource.file_size)}</span>
            </div>
          )}
          
          {/* Categories/Keywords */}
          {resource.field88 && (
            <div className="flex items-center gap-2 text-art-gray-400">
              <i className="fas fa-tags text-xs w-4"></i>
              <span className="truncate" title={resource.field88}>{resource.field88}</span>
            </div>
          )}
        </div>
        
        {/* Bottom stats */}
        <div className="flex items-center justify-between pt-2 border-t border-theme-primary">
          <div className="flex items-center gap-3 text-xs text-theme-tertiary">
            {resource.hit_count !== undefined && (
              <span className="flex items-center gap-1">
                <i className="fas fa-eye"></i>
                {resource.hit_count}
              </span>
            )}
            {resource.rating && (
              <span className="flex items-center gap-1 text-yellow-500">
                <i className="fas fa-star"></i>
                {resource.rating}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}