import { useState, useCallback } from 'react'
import ResourceGrid from '../components/ResourceGrid'
import ResourceModal from '../components/ResourceModal'
import SortDropdown from '../components/SortDropdown'

export default function HomePage() {
  const [selectedResource, setSelectedResource] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [resources, setResources] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [orderBy, setOrderBy] = useState('resourceid')  // Default to newest resources by ID
  const [sort, setSort] = useState('DESC')
  
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Discover Resources</h1>
            <p className="mt-2 text-art-gray-400">
              Browse the latest uploads from our creative community
            </p>
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
          order_by: orderBy,
          sort: sort,
        }}
        onResourceClick={(resource, allResources, index) => {
          console.log('HomePage: Resource clicked', resource.ref, index)
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
        context="browse"
      />
    </div>
  )
}