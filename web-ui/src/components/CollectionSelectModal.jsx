import { useState, useEffect } from 'react'
import { X, FolderPlus, Folder } from 'lucide-react'
import axios from 'axios'
import useAuthStore from '../stores/useAuthStore'

export default function CollectionSelectModal({ 
  isOpen, 
  onClose, 
  onSelectCollection,
  selectedResourceCount = 0
}) {
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const { sessionKey, user } = useAuthStore()

  useEffect(() => {
    if (isOpen) {
      fetchCollections()
    }
  }, [isOpen])

  const fetchCollections = async () => {
    setLoading(true)
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/collections`,
        { sessionKey }
      )
      
      if (response.data.collections) {
        setCollections(response.data.collections)
      }
    } catch (error) {
      console.error('Failed to fetch collections:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCollection = async (e) => {
    e.preventDefault()
    if (!newCollectionName.trim()) return

    setCreating(true)
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/collections/create`,
        {
          name: newCollectionName,
          sessionKey
        }
      )

      if (response.data.success && response.data.ref) {
        // Select the newly created collection
        onSelectCollection({
          ref: response.data.ref,
          name: newCollectionName
        })
        onClose()
      }
    } catch (error) {
      console.error('Failed to create collection:', error)
    } finally {
      setCreating(false)
      setNewCollectionName('')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-art-gray-900 rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-art-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Add to Collection</h2>
              <p className="text-sm text-art-gray-400 mt-1">
                Select a collection for {selectedResourceCount} resource{selectedResourceCount !== 1 ? 's' : ''}
              </p>
            </div>
            <button onClick={onClose} className="text-art-gray-400 hover:text-white">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Create new collection */}
          <form onSubmit={handleCreateCollection} className="mb-6">
            <label className="block text-sm font-medium text-art-gray-400 mb-2">
              Create New Collection
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="Collection name..."
                className="flex-1 px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
              />
              <button
                type="submit"
                disabled={creating || !newCollectionName.trim()}
                className="px-4 py-2 bg-art-accent text-white rounded-lg hover:bg-art-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <FolderPlus className="h-4 w-4" />
                Create
              </button>
            </div>
          </form>

          {/* Existing collections */}
          <div>
            <label className="block text-sm font-medium text-art-gray-400 mb-2">
              Or Select Existing Collection
            </label>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-art-accent"></div>
              </div>
            ) : collections.length === 0 ? (
              <div className="text-center py-8 text-art-gray-500">
                <Folder className="h-12 w-12 mx-auto mb-2" />
                <p>No collections found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {collections.map(collection => (
                  <button
                    key={collection.ref}
                    onClick={() => {
                      onSelectCollection(collection)
                      onClose()
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-art-gray-800 rounded-lg hover:bg-art-gray-700 transition-colors text-left"
                  >
                    <Folder className="h-5 w-5 text-art-gray-400" />
                    <div className="flex-1">
                      <p className="text-white font-medium">{collection.name}</p>
                      {collection.count !== undefined && (
                        <p className="text-xs text-art-gray-500">
                          {collection.count} resource{collection.count !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}