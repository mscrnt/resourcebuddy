import { useState, useEffect, useCallback, useRef } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import ResourceCard from '../ResourceCard'
import ResourceTable from '../ResourceTable'
import ResourceModalEnhanced from '../ResourceModalEnhanced'
import FloatingSearchBar from './FloatingSearchBar'
import DashboardTileModal from '../DashboardTileModal'
import CollectionSelectModal from '../CollectionSelectModal'
import CollectionBarFooter from '../CollectionBarFooter'
import { cn } from '../../lib/utils'
import resourceSpaceApi from '../../lib/resourcespace-api-backend'
import useAuthStore from '../../stores/useAuthStore'
import useSettingsStore from '../../stores/useSettingsStore'

const VIEW_MODES = {
  THUMBNAIL: 'thumbnail',
  LIST: 'list',
  COMPACT: 'compact',
  MASONRY: 'masonry'
}

const ITEMS_PER_PAGE = 48

export default function ResourceFeed({
  initialQuery = '',
  defaultViewMode = VIEW_MODES.THUMBNAIL,
  userFilter = null,
  context = 'browse',
  showBreadcrumbs = false,
  breadcrumbs = []
}) {
  const [viewMode, setViewMode] = useState(() => {
    // Load saved view mode preference
    const saved = localStorage.getItem('resourceViewMode')
    return saved || defaultViewMode
  })
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [sortField, setSortField] = useState('date')
  const [sortOrder, setSortOrder] = useState('desc')
  const [advancedSearch, setAdvancedSearch] = useState(false)
  const [advancedFilters, setAdvancedFilters] = useState({})
  const observerRef = useRef(null)
  const loadMoreRef = useRef(null)
  
  // Modal state
  const [selectedResource, setSelectedResource] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [dashboardTileModalOpen, setDashboardTileModalOpen] = useState(false)
  const [selectedResources, setSelectedResources] = useState(new Set())
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [collectionModalOpen, setCollectionModalOpen] = useState(false)
  const [activeCollection, setActiveCollection] = useState(null)
  const [collectionBarHeight, setCollectionBarHeight] = useState(52)
  const { user, sessionKey } = useAuthStore()
  const { fetchSettings, getSetting } = useSettingsStore()

  // Build search params based on current filters
  const buildSearchParams = useCallback((pageParam = 0) => {
    let search = searchQuery || ''
    
    // Add user filter if specified
    if (userFilter) {
      search = search ? `${search} contributor:${userFilter}` : `contributor:${userFilter}`
    }
    
    // Add advanced filters
    if (advancedSearch && Object.keys(advancedFilters).length > 0) {
      const filterStrings = Object.entries(advancedFilters)
        .filter(([_, value]) => value)
        .map(([field, value]) => {
          if (field === 'contributor') {
            return `contributor:${value}`
          }
          return `${field}:${value}`
        })
      
      if (filterStrings.length > 0) {
        search += ' ' + filterStrings.join(' ')
      }
    }
    
    return {
      search: search.trim(),
      order_by: sortField,
      sort: sortOrder,
      archive: 0,
      per_page: ITEMS_PER_PAGE,
      offset: pageParam * ITEMS_PER_PAGE
    }
  }, [searchQuery, userFilter, sortField, sortOrder, advancedSearch, advancedFilters])

  // Fetch settings and load active collection on mount
  useEffect(() => {
    fetchSettings()
    loadActiveCollection()
  }, [])
  
  const loadActiveCollection = async () => {
    // Load the user's first collection or a default collection
    try {
      const collections = await resourceSpaceApi.getUserCollections(sessionKey)
      if (collections && collections.length > 0) {
        setActiveCollection(collections[0])
      }
    } catch (err) {
      console.error('Failed to load collections:', err)
    }
  }

  // Infinite query for resources
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading,
    refetch
  } = useInfiniteQuery({
    queryKey: ['resources', searchQuery, sortField, sortOrder, userFilter, advancedFilters],
    queryFn: async ({ pageParam = 0 }) => {
      const params = buildSearchParams(pageParam)
      const result = await resourceSpaceApi.searchResources(params.search, {
        order_by: params.order_by,
        sort: params.sort,
        archive: params.archive,
        fetchrows: params.per_page,
        offset: params.offset
      })
      
      // Handle the response - it could be an array or an object with data/total
      let resources = []
      if (Array.isArray(result)) {
        resources = result
      } else if (result && result.data) {
        resources = result.data
      }
      
      return {
        resources: resources,
        hasMore: resources.length === ITEMS_PER_PAGE,
        page: pageParam
      }
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined
    },
    refetchOnWindowFocus: false
  })

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()

    observerRef.current = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect()
    }
  }, [hasNextPage, fetchNextPage, isFetchingNextPage])

  // Flatten resources from infinite query pages
  const resources = data?.pages.flatMap(page => page.resources) || []

  const handleSearch = (query) => {
    setSearchQuery(query)
  }

  const handleSort = (field, order) => {
    setSortField(field)
    setSortOrder(order)
  }

  const handleViewModeChange = (mode) => {
    setViewMode(mode)
    localStorage.setItem('resourceViewMode', mode)
  }

  const handleAdvancedSearch = (filters) => {
    setAdvancedFilters(filters)
  }
  
  const handleResourceClick = (resource, index, event) => {
    // If in selection mode or holding ctrl/cmd, handle selection
    if (selectionMode || event?.ctrlKey || event?.metaKey) {
      handleResourceSelection(resource.ref, index, event)
    } else {
      setSelectedResource(resource)
      setSelectedIndex(index)
      setModalOpen(true)
    }
  }
  
  const handleResourceSelection = (resourceRef, index, event) => {
    const newSelected = new Set(selectedResources)
    
    if (event?.shiftKey && lastSelectedIndex !== null) {
      // Shift+click: select range
      const start = Math.min(lastSelectedIndex, index)
      const end = Math.max(lastSelectedIndex, index)
      
      for (let i = start; i <= end; i++) {
        if (resources[i]) {
          newSelected.add(resources[i].ref)
        }
      }
    } else {
      // Regular click: toggle selection
      if (newSelected.has(resourceRef)) {
        newSelected.delete(resourceRef)
      } else {
        newSelected.add(resourceRef)
      }
      setLastSelectedIndex(index)
    }
    
    setSelectedResources(newSelected)
    
    // Enter selection mode if any resources are selected
    if (newSelected.size > 0) {
      setSelectionMode(true)
    } else {
      setSelectionMode(false)
    }
  }
  
  const handleLongPress = (resource, index) => {
    setSelectionMode(true)
    handleResourceSelection(resource.ref, index)
  }
  
  const handleSelectAll = () => {
    const allRefs = new Set(resources.map(r => r.ref))
    setSelectedResources(allRefs)
    setSelectionMode(true)
  }
  
  const handleClearSelection = () => {
    setSelectedResources(new Set())
    setSelectionMode(false)
    setLastSelectedIndex(null)
  }
  
  const handleSaveToDashboard = () => {
    setDashboardTileModalOpen(true)
  }
  
  const handleAddToCollection = () => {
    setCollectionModalOpen(true)
  }
  
  const handleSelectCollection = (collection) => {
    console.log('Selected collection:', collection)
    setActiveCollection(collection)
    setCollectionModalOpen(false)
  }
  
  const handleCollectionBarClose = () => {
    setActiveCollection(null)
  }

  // Get current search params for dashboard tile
  const getCurrentSearchParams = () => {
    const params = buildSearchParams(0)
    return {
      search: params.search,
      order_by: params.order_by,
      sort: params.sort,
      archive: params.archive,
      restypes: '', // Add resource types if you have them
      fetchrows: params.per_page
    }
  }

  // Different grid classes based on view mode
  const getGridClasses = () => {
    switch (viewMode) {
      case VIEW_MODES.COMPACT:
        return 'grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 2xl:grid-cols-14 gap-1'
      case VIEW_MODES.MASONRY:
        return 'columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 2xl:columns-8 gap-4'
      default:
        return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 lg:gap-6'
    }
  }

  return (
    <div className="min-h-screen bg-art-dark">
      {/* Floating Search Bar */}
      <FloatingSearchBar
        initialQuery={searchQuery}
        onSearch={handleSearch}
        onSort={handleSort}
        sortField={sortField}
        sortOrder={sortOrder}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        advancedMode={advancedSearch}
        onToggleAdvanced={() => setAdvancedSearch(!advancedSearch)}
        onAdvancedSearch={handleAdvancedSearch}
        showBreadcrumbs={showBreadcrumbs}
        breadcrumbs={breadcrumbs}
        onConfigColumns={() => setConfigModalOpen(true)}
        onSaveToDashboard={handleSaveToDashboard}
        currentSearchParams={searchQuery || sortField !== 'date' || sortOrder !== 'desc' ? getCurrentSearchParams() : null}
        selectedCount={selectedResources.size}
        selectionMode={selectionMode}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onAddToCollection={handleAddToCollection}
      />

      {/* Resources Grid */}
      <div 
        className="mx-auto px-6 sm:px-8 lg:px-12 xl:px-16 pt-32"
        style={{ 
          paddingBottom: getSetting('enableCollectionBar') !== false ? `${collectionBarHeight + 16}px` : '32px'
        }}>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-art-accent"></div>
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-12">
            <i className="fas fa-search text-6xl text-art-gray-600 mb-4"></i>
            <p className="text-xl text-art-gray-400">No resources found</p>
            <p className="text-art-gray-600 mt-2">Try adjusting your search or filters</p>
          </div>
        ) : viewMode === VIEW_MODES.LIST ? (
          <>
            <ResourceTable
              resources={resources}
              showUser={!userFilter}
              onSort={handleSort}
              sortField={sortField}
              sortOrder={sortOrder}
              onResourceClick={handleResourceClick}
              configModalOpen={configModalOpen}
              onConfigModalClose={() => setConfigModalOpen(false)}
            />
            
            {/* Load more trigger */}
            <div
              ref={loadMoreRef}
              className="h-20 flex items-center justify-center"
            >
              {isFetchingNextPage && (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-art-accent"></div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className={getGridClasses()}>
              {resources.map((resource, index) => (
                <ResourceCard
                  key={resource.ref}
                  resource={resource}
                  viewMode={viewMode}
                  showUser={!userFilter}
                  onClick={(event) => handleResourceClick(resource, index, event)}
                  onLongPress={() => handleLongPress(resource, index)}
                  selected={selectedResources.has(resource.ref)}
                  selectionMode={selectionMode}
                  onSelect={(event) => handleResourceSelection(resource.ref, index, event)}
                  selectedResources={selectedResources}
                  allResources={resources}
                />
              ))}
            </div>

            {/* Load more trigger */}
            <div
              ref={loadMoreRef}
              className="h-20 flex items-center justify-center"
            >
              {isFetchingNextPage && (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-art-accent"></div>
              )}
            </div>
          </>
        )}
      </div>
      
      {/* Enhanced Resource Modal */}
      <ResourceModalEnhanced
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
        context={context}
        searchParams={searchQuery || sortField !== 'date' || sortOrder !== 'desc' ? getCurrentSearchParams() : null}
        collectionId={activeCollection?.ref}
        activeCollection={activeCollection}
        collectionBarHeight={collectionBarHeight}
        onAddToCollection={(resource) => {
          // Collection bar will handle refresh
          console.log('Added to collection:', resource.ref)
        }}
        onRemoveFromCollection={(resourceRef) => {
          // Collection bar will handle refresh
          console.log('Removed from collection:', resourceRef)
        }}
      />
      
      {/* Dashboard Tile Modal */}
      <DashboardTileModal
        isOpen={dashboardTileModalOpen}
        onClose={() => setDashboardTileModalOpen(false)}
        searchParams={getCurrentSearchParams()}
        resources={resources.slice(0, 8)} // First 8 resources for preview
        userRef={user?.ref}
      />
      
      {/* Collection Select Modal */}
      <CollectionSelectModal
        isOpen={collectionModalOpen}
        onClose={() => setCollectionModalOpen(false)}
        onSelectCollection={handleSelectCollection}
        selectedResourceCount={selectedResources.size}
      />
      
      {/* Collection Bar - Always visible when enabled */}
      {getSetting('enableCollectionBar') !== false && (
        <CollectionBarFooter
          collection={activeCollection}
          onClose={handleCollectionBarClose}
          selectedResources={selectedResources}
          onAddResources={(message) => {
            handleClearSelection()
            // TODO: Show success toast
            console.log(message)
          }}
          onCollectionChange={setActiveCollection}
          isModalOpen={modalOpen}
          onHeightChange={setCollectionBarHeight}
        />
      )}
    </div>
  )
}