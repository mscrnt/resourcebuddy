import { useState, useRef, useEffect } from 'react'
import { ZoomIn, ZoomOut, RotateCw, Maximize2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ImageViewer({ src, alt, isFullscreen, availableWidth, availableHeight }) {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)
  
  const containerRef = useRef(null)
  const imageRef = useRef(null)
  
  const MIN_SCALE = 0.5
  const MAX_SCALE = 5
  const SCALE_STEP = 0.25

  // Reset view when image changes
  useEffect(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
    setRotation(0)
  }, [src])

  // Mouse wheel zoom
  useEffect(() => {
    const handleWheel = (e) => {
      if (!containerRef.current?.contains(e.target)) return
      
      e.preventDefault()
      const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale + delta))
      
      if (newScale !== scale) {
        // Calculate zoom point relative to image center
        const rect = imageRef.current?.getBoundingClientRect()
        if (rect) {
          const x = e.clientX - rect.left - rect.width / 2
          const y = e.clientY - rect.top - rect.height / 2
          
          // Adjust position to zoom towards cursor
          const scaleDiff = newScale - scale
          setPosition(prev => ({
            x: prev.x - (x * scaleDiff) / scale,
            y: prev.y - (y * scaleDiff) / scale
          }))
        }
        
        setScale(newScale)
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [scale])

  const handleMouseDown = (e) => {
    if (scale <= 1) return
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleZoomIn = () => {
    setScale(prev => Math.min(MAX_SCALE, prev + SCALE_STEP))
  }

  const handleZoomOut = () => {
    setScale(prev => Math.max(MIN_SCALE, prev - SCALE_STEP))
  }

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360)
  }

  const handleReset = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
    setRotation(0)
  }

  const handleDoubleClick = (e) => {
    if (scale === 1) {
      // Zoom in to 2x at click point
      const rect = imageRef.current?.getBoundingClientRect()
      if (rect) {
        const x = e.clientX - rect.left - rect.width / 2
        const y = e.clientY - rect.top - rect.height / 2
        setPosition({ x: -x, y: -y })
        setScale(2)
      }
    } else {
      // Reset zoom
      handleReset()
    }
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center space-x-2 bg-black/70 rounded-lg p-2">
        <button
          onClick={handleZoomOut}
          disabled={scale <= MIN_SCALE}
          className="p-2 rounded hover:bg-white/10 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Zoom out (-)"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        
        <span className="text-white text-sm min-w-[60px] text-center">
          {Math.round(scale * 100)}%
        </span>
        
        <button
          onClick={handleZoomIn}
          disabled={scale >= MAX_SCALE}
          className="p-2 rounded hover:bg-white/10 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Zoom in (+)"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        
        <div className="w-px h-6 bg-white/30" />
        
        <button
          onClick={handleRotate}
          className="p-2 rounded hover:bg-white/10 text-white transition-colors"
          title="Rotate 90°"
        >
          <RotateCw className="h-4 w-4" />
        </button>
        
        <button
          onClick={handleReset}
          className="p-2 rounded hover:bg-white/10 text-white transition-colors"
          title="Reset view"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {/* Image */}
      <motion.img
        ref={imageRef}
        src={src}
        alt={alt}
        className="select-none object-contain"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          maxWidth: availableWidth ? `${availableWidth}px` : '100%',
          maxHeight: availableHeight ? `${availableHeight}px` : '100%',
          cursor: scale > 1 ? 'move' : 'pointer'
        }}
        draggable={false}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      />
    </div>
  )
}