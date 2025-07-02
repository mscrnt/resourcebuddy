import { useState, useEffect, useRef } from 'react'
import { Upload, FileUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function DragDropOverlay({ onDrop }) {
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)

  useEffect(() => {
    const handleDragEnter = (e) => {
      e.preventDefault()
      e.stopPropagation()
      
      dragCounter.current++
      
      // Only activate for file drops, not internal element drags
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        // Check if this is a file drag by looking for file types
        const hasFiles = Array.from(e.dataTransfer.items).some(item => item.kind === 'file')
        
        // Also check if it's not an internal drag (no resourceRef data)
        const isInternalDrag = e.dataTransfer.types.includes('resourceref') || 
                              e.dataTransfer.types.includes('resourcedata') ||
                              e.dataTransfer.types.includes('multipleresources') ||
                              e.dataTransfer.types.includes('text/plain')
        
        if (hasFiles && !isInternalDrag) {
          setIsDragging(true)
        }
      }
    }

    const handleDragLeave = (e) => {
      e.preventDefault()
      e.stopPropagation()
      
      dragCounter.current--
      
      if (dragCounter.current === 0) {
        setIsDragging(false)
      }
    }

    const handleDragOver = (e) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const handleDrop = (e) => {
      e.preventDefault()
      e.stopPropagation()
      
      dragCounter.current = 0
      setIsDragging(false)
      
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        onDrop(files)
      }
    }

    // Add event listeners
    window.addEventListener('dragenter', handleDragEnter)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('drop', handleDrop)

    // Cleanup
    return () => {
      window.removeEventListener('dragenter', handleDragEnter)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('drop', handleDrop)
    }
  }, [onDrop])

  return (
    <AnimatePresence>
      {isDragging && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] pointer-events-none"
        >
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          
          {/* Drop zone */}
          <div className="absolute inset-8 border-4 border-dashed border-art-accent rounded-2xl flex items-center justify-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="text-center"
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="mb-6"
              >
                <FileUp className="h-24 w-24 text-art-accent mx-auto" />
              </motion.div>
              <h2 className="text-3xl font-bold text-white mb-2">
                Drop files anywhere to upload
              </h2>
              <p className="text-art-gray-300 text-lg">
                Release to start uploading to ResourceSpace
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}