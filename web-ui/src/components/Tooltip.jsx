import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Tooltip({ children, content, position = 'top' }) {
  const [isVisible, setIsVisible] = useState(false)
  
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  }
  
  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 -mt-1',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-1',
    left: 'left-full top-1/2 -translate-y-1/2 -ml-1',
    right: 'right-full top-1/2 -translate-y-1/2 -mr-1'
  }
  
  const arrowBorder = {
    top: 'border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-gray-900',
    bottom: 'border-l-4 border-l-transparent border-r-4 border-r-transparent border-b-4 border-b-gray-900',
    left: 'border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-4 border-l-gray-900',
    right: 'border-t-4 border-t-transparent border-b-4 border-b-transparent border-r-4 border-r-gray-900'
  }
  
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      
      <AnimatePresence>
        {isVisible && content && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className={`absolute ${positionClasses[position]} z-[9999] pointer-events-none`}
          >
            <div className="bg-gray-900 text-white text-sm rounded-lg shadow-lg px-3 py-2 max-w-xs whitespace-pre-wrap">
              {content}
              <div className={`absolute ${arrowClasses[position]}`}>
                <div className={`w-0 h-0 ${arrowBorder[position]}`}></div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}