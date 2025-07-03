import { Clock, Trash2, Search } from 'lucide-react'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from '../../lib/utils'

export default function SavedSearches({ searches, onSelect, onDelete, onClose }) {
  if (searches.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="p-6 text-center"
      >
        <div className="py-12">
          <Clock className="h-16 w-16 text-art-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">No saved searches yet</h3>
          <p className="text-art-gray-400 mb-6">
            Save your searches to quickly run them again later
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-art-gray-800 text-white rounded-lg hover:bg-art-gray-700 transition-colors"
          >
            Back to search
          </button>
        </div>
      </motion.div>
    )
  }
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-6"
    >
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white mb-2">Saved Searches</h2>
        <p className="text-art-gray-400">
          Click on a saved search to load it
        </p>
      </div>
      
      <div className="space-y-3">
        {searches.map((search, index) => (
          <motion.div
            key={search.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group relative bg-art-gray-800 rounded-lg hover:bg-art-gray-700 transition-colors"
          >
            <button
              onClick={() => onSelect(search)}
              className="w-full p-4 text-left"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-white mb-1 flex items-center gap-2">
                    <Search className="h-4 w-4 text-art-accent" />
                    {search.name}
                  </h3>
                  <div className="text-sm text-art-gray-400 space-y-1">
                    {search.data.keywords && (
                      <div>Keywords: {search.data.keywords}</div>
                    )}
                    {search.data.fileTypes?.length > 0 && (
                      <div>File types: {search.data.fileTypes.slice(0, 3).join(', ')}{search.data.fileTypes.length > 3 && '...'}</div>
                    )}
                    {Object.keys(search.data.metadataFields || {}).length > 0 && (
                      <div>{Object.keys(search.data.metadataFields).length} metadata filters</div>
                    )}
                  </div>
                  <div className="text-xs text-art-gray-500 mt-2">
                    Saved {formatDistanceToNow(new Date(search.createdAt))} ago
                  </div>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(search.id)
                  }}
                  className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded transition-all"
                  title="Delete saved search"
                >
                  <Trash2 className="h-4 w-4 text-red-400" />
                </button>
              </div>
            </button>
          </motion.div>
        ))}
      </div>
      
      <div className="mt-6 flex justify-end">
        <button
          onClick={onClose}
          className="px-6 py-2 text-art-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  )
}