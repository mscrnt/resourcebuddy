import { useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import ResourceGrid from '../components/ResourceGrid'
import ResourceModal from '../components/ResourceModal'
import SortDropdown from '../components/SortDropdown'

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const [selectedResource, setSelectedResource] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [resources, setResources] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [orderBy, setOrderBy] = useState('relevance')  // Default to relevance for search
  const [sort, setSort] = useState('DESC')

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center">
              <Search className="mr-3 h-8 w-8 text-art-gray-500" />
              Search Results
            </h1>
            {query && (
              <p className="mt-2 text-art-gray-400">
                Showing results for "<span className="text-white">{query}</span>"
              </p>
            )}
          </div>
          <SortDropdown 
            value={orderBy}
            sort={sort}
            onChange={setOrderBy}
            onSortChange={setSort}
          />
        </div>
      </div>

      <ResourceGrid 
        searchParams={{
          search: query,
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
        context="search"
      />
    </div>
  )
}