import { useState, useRef, useEffect } from 'react'
import { HelpCircle, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function SearchTooltip() {
  const [showTooltip, setShowTooltip] = useState(false)
  const tooltipRef = useRef(null)
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target)) {
        setShowTooltip(false)
      }
    }
    
    if (showTooltip) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showTooltip])
  
  return (
    <div className="relative" ref={tooltipRef}>
      <button
        type="button"
        onClick={() => setShowTooltip(!showTooltip)}
        className="p-1 hover:bg-art-gray-800 rounded transition-colors"
        aria-label="Search help"
      >
        <HelpCircle className="h-5 w-5 text-art-gray-400" />
      </button>
      
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute top-full mt-2 right-0 w-96 bg-art-gray-800 border border-art-gray-700 rounded-lg shadow-xl z-50"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-medium">Search Tips</h3>
                <button
                  onClick={() => setShowTooltip(false)}
                  className="p-1 hover:bg-art-gray-700 rounded transition-colors"
                >
                  <X className="h-4 w-4 text-art-gray-400" />
                </button>
              </div>
              
              <div className="space-y-3 text-sm">
                <div>
                  <h4 className="text-art-gray-300 font-medium mb-1">Text Search</h4>
                  <ul className="space-y-1 text-art-gray-400">
                    <li>• <code className="bg-art-gray-700 px-1 rounded">+word</code> - Must include word</li>
                    <li>• <code className="bg-art-gray-700 px-1 rounded">-word</code> - Must exclude word</li>
                    <li>• <code className="bg-art-gray-700 px-1 rounded">"exact phrase"</code> - Exact phrase match</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-art-gray-300 font-medium mb-1">Field Search</h4>
                  <ul className="space-y-1 text-art-gray-400">
                    <li>• <code className="bg-art-gray-700 px-1 rounded">country:japan</code> - Single value</li>
                    <li>• <code className="bg-art-gray-700 px-1 rounded">country:japan;korea</code> - Multiple values (OR)</li>
                    <li>• <code className="bg-art-gray-700 px-1 rounded">date:2024-01-01..2024-12-31</code> - Date range</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-art-gray-300 font-medium mb-1">Special Searches</h4>
                  <ul className="space-y-1 text-art-gray-400">
                    <li>• <code className="bg-art-gray-700 px-1 rounded">!empty54</code> - Field 54 is not empty</li>
                    <li>• <code className="bg-art-gray-700 px-1 rounded">!nodownloads</code> - No downloads allowed</li>
                    <li>• <code className="bg-art-gray-700 px-1 rounded">!list1001:1002</code> - Fixed list values</li>
                    <li>• <code className="bg-art-gray-700 px-1 rounded">!collection15</code> - In collection 15</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-art-gray-300 font-medium mb-1">Operators</h4>
                  <ul className="space-y-1 text-art-gray-400">
                    <li>• <strong>AND</strong> - All conditions must match</li>
                    <li>• <strong>OR</strong> - Any condition can match</li>
                    <li>• Multiple fields are combined with the selected operator</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}