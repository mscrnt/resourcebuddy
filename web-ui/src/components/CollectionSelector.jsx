import { useState, useEffect } from 'react'
import { ChevronDown, Search, Folder, Lock, Globe } from 'lucide-react'
import { useApi } from '../contexts/ApiContext'
import { motion, AnimatePresence } from 'framer-motion'

export default function CollectionSelector({ value, onChange, placeholder = 'Select collection', className }) {
  const api = useApi()
  const [isOpen, setIsOpen] = useState(false)
  const [collections, setCollections] = useState([])
  const [filteredCollections, setFilteredCollections] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedCollection, setSelectedCollection] = useState(null)
  
  // Load collections
  useEffect(() => {
    loadCollections()
  }, [])
  
  // Filter collections based on search
  useEffect(() => {
    if (searchQuery) {
      const filtered = collections.filter(col => 
        col.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        col.ref.toString().includes(searchQuery)
      )
      setFilteredCollections(filtered)
    } else {
      setFilteredCollections(collections)
    }
  }, [searchQuery, collections])
  
  // Update selected collection when value changes
  useEffect(() => {
    if (value && collections.length > 0) {
      const collection = collections.find(c => c.ref === value || c.ref === parseInt(value))
      setSelectedCollection(collection)
    } else {
      setSelectedCollection(null)
    }
  }, [value, collections])
  
  const loadCollections = async () => {
    setLoading(true)
    try {
      const userCollections = await api.getUserCollections()
      const featuredCollections = await api.getFeaturedCollections()
      
      // Combine and deduplicate
      const allCollections = [...userCollections, ...featuredCollections]
      const uniqueCollections = allCollections.filter((col, index, self) =>
        index === self.findIndex(c => c.ref === col.ref)
      )
      
      setCollections(uniqueCollections)
      setFilteredCollections(uniqueCollections)
    } catch (error) {
      console.error('Failed to load collections:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleSelect = (collection) => {
    onChange(collection?.ref || null)
    setIsOpen(false)
    setSearchQuery('')
  }
  
  return (
    <div className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between min-w-[200px] px-3 py-2 bg-art-gray-800 hover:bg-art-gray-700 text-white rounded-lg transition-colors"
      >
        <span className="flex items-center">
          <Folder className="h-4 w-4 mr-2 text-art-gray-400" />
          <span className="truncate">
            {selectedCollection ? selectedCollection.name : placeholder}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 text-art-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown content */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full mt-2 w-80 bg-art-darker rounded-lg shadow-xl border border-art-gray-800 z-50 overflow-hidden"
            >
              {/* Search */}
              <div className="p-3 border-b border-art-gray-800">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-art-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search collections..."
                    className="w-full pl-10 pr-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              
              {/* Collections list */}
              <div className="max-h-80 overflow-y-auto">
                {/* No collection option */}
                <button
                  onClick={() => handleSelect(null)}
                  className="w-full px-4 py-3 text-left hover:bg-art-gray-800 transition-colors"
                >
                  <span className="text-art-gray-400">No collection</span>
                </button>
                
                {loading ? (
                  <div className="px-4 py-8 text-center text-art-gray-500">
                    Loading collections...
                  </div>
                ) : filteredCollections.length === 0 ? (
                  <div className="px-4 py-8 text-center text-art-gray-500">
                    No collections found
                  </div>
                ) : (
                  filteredCollections.map(collection => (
                    <button
                      key={collection.ref}
                      onClick={() => handleSelect(collection)}
                      className={`w-full px-4 py-3 text-left hover:bg-art-gray-800 transition-colors ${
                        selectedCollection?.ref === collection.ref ? 'bg-art-gray-800' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center flex-1 min-w-0">
                          <Folder className="h-4 w-4 mr-2 text-art-gray-500 flex-shrink-0" />
                          <span className="text-white truncate">{collection.name}</span>
                          <span className="text-art-gray-500 text-sm ml-2">#{collection.ref}</span>
                        </div>
                        {collection.public ? (
                          <Globe className="h-4 w-4 text-art-gray-500 ml-2" />
                        ) : (
                          <Lock className="h-4 w-4 text-art-gray-500 ml-2" />
                        )}
                      </div>
                      {collection.count > 0 && (
                        <span className="text-xs text-art-gray-500 ml-6">
                          {collection.count} resources
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}