import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { Folder, Plus, Lock, Globe, ArrowLeft } from 'lucide-react'
import { useApi } from '../contexts/ApiContext'
import ResourceGrid from '../components/ResourceGrid'
import ResourceModal from '../components/ResourceModal'
import SortDropdown from '../components/SortDropdown'
import useAuthStore from '../stores/useAuthStore'
import { cn } from '../lib/utils'

const CollectionCard = ({ collection }) => {
  const isPublic = collection.type === 'public'
  
  return (
    <Link
      to={`/collections/${collection.ref}`}
      className="group relative overflow-hidden rounded-lg bg-art-gray-900 p-6 transition-all hover:bg-art-gray-800"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center">
          <Folder className="h-8 w-8 text-art-gray-500 group-hover:text-art-accent transition-colors" />
          <div className="ml-4">
            <h3 className="font-semibold text-white">
              {collection.name}
            </h3>
            {collection.count > 0 && (
              <p className="mt-1 text-sm text-art-gray-400">
                {collection.count} resources
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center text-art-gray-500">
          {isPublic ? (
            <Globe className="h-4 w-4" />
          ) : (
            <Lock className="h-4 w-4" />
          )}
        </div>
      </div>
    </Link>
  )
}

export default function CollectionsPage() {
  const { id } = useParams()
  const { user } = useAuthStore()
  const api = useApi()
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  const [selectedResource, setSelectedResource] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [resources, setResources] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [orderBy, setOrderBy] = useState('collection')  // Default to collection order
  const [sort, setSort] = useState('ASC')

  // Fetch collections
  const { data: collections, isLoading: collectionsLoading } = useQuery({
    queryKey: ['collections', user?.username],
    queryFn: () => api.getUserCollections(),
    enabled: !id && !!user, // Only fetch when not viewing a specific collection and user is logged in
  })

  // Fetch specific collection resources
  const { data: collectionResources, isLoading: resourcesLoading } = useQuery({
    queryKey: ['collection-resources', id],
    queryFn: () => api.getCollectionResources(id),
    enabled: !!id,
  })

  // Viewing a specific collection
  if (id) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <Link
                to="/collections"
                className="mb-4 inline-flex items-center text-sm text-art-gray-400 hover:text-white transition-colors"
              >
                ← Back to Collections
              </Link>
              <h1 className="text-3xl font-bold text-white">Collection</h1>
            </div>
            <SortDropdown 
              value={orderBy}
              sort={sort}
              onChange={setOrderBy}
              onSortChange={setSort}
            />
          </div>
        </div>

        {resourcesLoading ? (
          <div className="animate-pulse">Loading collection...</div>
        ) : (
          <>
            <ResourceGrid
              searchParams={{
                search: `!collection${id}`,
                order_by: orderBy,
                sort: sort,
              }}
              onResourceClick={(resource, allResources, index) => {
                setSelectedResource(resource)
                setResources(allResources)
                setSelectedIndex(index)
                setModalOpen(true)
              }}
              onResourcesLoaded={useCallback((newResources) => {
                setResources(newResources)
              }, [])}
            />
            
            <ResourceModal
              resource={selectedResource}
              isOpen={modalOpen}
              onClose={() => {
                setModalOpen(false)
                setSelectedResource(null)
              }}
              onNext={() => {
                const nextIndex = selectedIndex + 1
                if (nextIndex < resources.length) {
                  setSelectedIndex(nextIndex)
                  setSelectedResource(resources[nextIndex])
                }
              }}
              onPrevious={() => {
                const prevIndex = selectedIndex - 1
                if (prevIndex >= 0) {
                  setSelectedIndex(prevIndex)
                  setSelectedResource(resources[prevIndex])
                }
              }}
              hasNext={selectedIndex < resources.length - 1}
              hasPrevious={selectedIndex > 0}
              context="collection"
            />
          </>
        )}
      </div>
    )
  }

  // Collections list view
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Collections</h1>
          <p className="mt-2 text-art-gray-400">
            Organize your resources into collections
          </p>
        </div>
        
        <button className="inline-flex items-center rounded-md bg-art-accent px-4 py-2 text-sm font-medium text-white hover:bg-art-accent/90 transition-colors">
          <Plus className="mr-2 h-4 w-4" />
          New Collection
        </button>
      </div>

      {collectionsLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-lg bg-art-gray-900 skeleton"
            />
          ))}
        </div>
      ) : collections?.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <CollectionCard key={collection.ref} collection={collection} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12">
          <Folder className="h-12 w-12 text-art-gray-600" />
          <p className="mt-4 text-art-gray-400">No collections yet</p>
          <p className="mt-2 text-sm text-art-gray-500">
            Create your first collection to organize resources
          </p>
        </div>
      )}
    </div>
  )
}