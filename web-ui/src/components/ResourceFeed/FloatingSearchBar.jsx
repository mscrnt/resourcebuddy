import { useState, useEffect, useRef } from 'react'
import { cn } from '../../lib/utils'
import { X, Search } from 'lucide-react'
import useAuthStore from '../../stores/useAuthStore'
import GuidedSearchModal from '../GuidedSearchModal'
import ExpandableFiltersPanel from './ExpandableFiltersPanel'
import resourceSpaceApi from '../../lib/resourcespace-api-backend'

const SORT_OPTIONS = [
  { value: 'date', label: 'Date Added', icon: 'fa-calendar' },
  { value: 'title', label: 'Title', icon: 'fa-font' },
  { value: 'rating', label: 'Rating', icon: 'fa-star' },
  { value: 'popularity', label: 'Views', icon: 'fa-eye' },
  { value: 'relevance', label: 'Relevance', icon: 'fa-search' }
]

const VIEW_MODE_OPTIONS = [
  { value: 'thumbnail', label: 'Thumbnail', icon: 'fa-th' },
  { value: 'compact', label: 'Compact', icon: 'fa-th-large' },
  { value: 'masonry', label: 'Masonry', icon: 'fa-layer-group' },
  { value: 'list', label: 'List', icon: 'fa-list' }
]

export default function FloatingSearchBar({
  initialQuery = '',
  onSearch,
  onSort,
  sortField,
  sortOrder,
  viewMode,
  onViewModeChange,
  advancedMode,
  onToggleAdvanced,
  onAdvancedSearch,
  showBreadcrumbs,
  breadcrumbs = [],
  onConfigColumns,
  onSaveToDashboard,
  currentSearchParams,
  selectedCount = 0,
  selectionMode = false,
  onSelectAll,
  onClearSelection,
  onAddToCollection
}) {
  const { user, sessionKey } = useAuthStore()
  const [searchValue, setSearchValue] = useState(initialQuery)
  const [advancedFilters, setAdvancedFilters] = useState({
    allWords: '',
    phrase: '',
    anyWords: '',
    withoutWords: '',
    resourceTypes: [],
    dateFrom: '',
    dateTo: '',
    title: '',
    description: '',
    keywords: '',
    creator: '',
    country: '',
    originalFilename: '',
    fileExtension: '',
    operator: 'AND'
  })
  const [showAdvancedModal, setShowAdvancedModal] = useState(false)
  const [showFiltersPanel, setShowFiltersPanel] = useState(false)
  const [filtersPanelExpanded, setFiltersPanelExpanded] = useState(false)
  const [resourceTypes, setResourceTypes] = useState([])
  const [actionsOpen, setActionsOpen] = useState(false)
  const actionsRef = useRef(null)

  useEffect(() => {
    setSearchValue(initialQuery)
  }, [initialQuery])

  // Load resource types
  useEffect(() => {
    loadResourceTypes()
  }, [])

  // Close actions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target)) {
        setActionsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadResourceTypes = async () => {
    try {
      const types = await resourceSpaceApi.getResourceTypes(sessionKey)
      setResourceTypes(types || [])
    } catch (err) {
      console.error('Failed to load resource types:', err)
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    onSearch(searchValue)
  }

  const handleAdvancedSearch = (searchData) => {
    // Set the search value
    setSearchValue(searchData.query)
    
    // Update filters
    setAdvancedFilters(searchData.filters)
    
    // Show filters panel if there are active filters
    const hasActiveFilters = Object.entries(searchData.filters).some(([key, value]) => {
      if (key === 'operator') return false
      if (key === 'resourceTypes') return value.length > 0
      return value && value !== ''
    })
    
    if (hasActiveFilters) {
      setShowFiltersPanel(true)
      setFiltersPanelExpanded(false)
    }
    
    // Perform search
    onSearch(searchData.query)
    if (onAdvancedSearch) {
      onAdvancedSearch(searchData.filters)
    }
  }

  const handleFiltersChange = (newFilters) => {
    setAdvancedFilters(newFilters)
    
    // Rebuild search query from filters
    let searchParts = []
    
    if (newFilters.allWords) {
      searchParts.push(newFilters.allWords.split(' ').map(w => `+${w}`).join(' '))
    }
    
    if (newFilters.phrase) {
      searchParts.push(`"${newFilters.phrase}"`)
    }
    
    if (newFilters.anyWords) {
      searchParts.push(newFilters.anyWords)
    }
    
    if (newFilters.withoutWords) {
      searchParts.push(newFilters.withoutWords.split(' ').map(w => `-${w}`).join(' '))
    }
    
    if (newFilters.title) {
      searchParts.push(`title:"${newFilters.title}"`)
    }
    
    if (newFilters.description) {
      searchParts.push(`description:"${newFilters.description}"`)
    }
    
    if (newFilters.keywords) {
      searchParts.push(`keywords:${newFilters.keywords}`)
    }
    
    if (newFilters.creator) {
      searchParts.push(`creator:"${newFilters.creator}"`)
    }
    
    if (newFilters.country) {
      searchParts.push(`country:"${newFilters.country}"`)
    }
    
    if (newFilters.originalFilename) {
      searchParts.push(`filename:"${newFilters.originalFilename}"`)
    }
    
    if (newFilters.fileExtension) {
      searchParts.push(`extension:${newFilters.fileExtension}`)
    }
    
    if (newFilters.dateFrom || newFilters.dateTo) {
      if (newFilters.dateFrom && newFilters.dateTo) {
        searchParts.push(`date:${newFilters.dateFrom}..${newFilters.dateTo}`)
      } else if (newFilters.dateFrom) {
        searchParts.push(`date:>=${newFilters.dateFrom}`)
      } else if (newFilters.dateTo) {
        searchParts.push(`date:<=${newFilters.dateTo}`)
      }
    }
    
    const searchQuery = searchParts.join(newFilters.operator === 'OR' ? ' OR ' : ' ')
    setSearchValue(searchQuery)
    onSearch(searchQuery)
    if (onAdvancedSearch) {
      onAdvancedSearch(newFilters)
    }
  }

  const handleClearFilters = () => {
    setAdvancedFilters({
      allWords: '',
      phrase: '',
      anyWords: '',
      withoutWords: '',
      resourceTypes: [],
      dateFrom: '',
      dateTo: '',
      title: '',
      description: '',
      keywords: '',
      creator: '',
      country: '',
      originalFilename: '',
      fileExtension: '',
      operator: 'AND'
    })
    setShowFiltersPanel(false)
    setSearchValue('')
    onSearch('')
  }

  const handleSortChange = (field) => {
    if (field === sortField) {
      onSort(field, sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      onSort(field, 'desc')
    }
  }


  const currentSortOption = SORT_OPTIONS.find(opt => opt.value === sortField)

  return (
    <div className="fixed top-16 left-0 right-0 z-30 bg-art-darker/95 backdrop-blur-sm border-b border-art-gray-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        {showBreadcrumbs && breadcrumbs.length > 0 && (
          <div className="py-2 flex items-center text-sm text-art-gray-400">
            <i className="fas fa-home mr-2"></i>
            {breadcrumbs.map((crumb, index) => (
              <span key={index} className="flex items-center">
                {index > 0 && <i className="fas fa-chevron-right mx-2 text-xs"></i>}
                {crumb.link ? (
                  <a href={crumb.link} className="hover:text-white transition-colors">
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-white">{crumb.label}</span>
                )}
              </span>
            ))}
          </div>
        )}

        {/* Search Bar */}
        <div className="py-4">
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            {/* Search Bar */}
            <div className="flex items-center gap-4">
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      placeholder="Search resources..."
                      className="w-full pl-4 pr-10 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                    />
                    {/* Clear button inside input */}
                    {searchValue && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchValue('')
                          onSearch('')
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-art-gray-400 hover:text-white transition-colors"
                        aria-label="Clear search"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  {/* Search button outside input */}
                  <button
                    type="submit"
                    className="px-4 py-2 bg-art-accent text-white rounded-lg hover:bg-art-accent-dark transition-colors flex items-center gap-2"
                    aria-label="Search"
                  >
                    <Search className="h-5 w-5" />
                  </button>

                  {/* Sort Dropdown */}
                  <div className="relative group">
                    <button
                      type="button"
                      className="flex items-center gap-2 px-4 py-2 bg-art-gray-800 text-white rounded-lg hover:bg-art-gray-700 transition-colors"
                    >
                      <i className={`fas ${currentSortOption?.icon || 'fa-sort'}`}></i>
                      <span className="hidden sm:inline">{currentSortOption?.label || 'Sort'}</span>
                      <i className={`fas fa-chevron-${sortOrder === 'asc' ? 'up' : 'down'} text-xs`}></i>
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-art-gray-900 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                      {SORT_OPTIONS.map(option => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleSortChange(option.value)}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-art-gray-800 transition-colors",
                            sortField === option.value ? "text-art-accent" : "text-white"
                          )}
                        >
                          <i className={`fas ${option.icon} w-4`}></i>
                          {option.label}
                          {sortField === option.value && (
                            <i className={`fas fa-chevron-${sortOrder === 'asc' ? 'up' : 'down'} ml-auto text-xs`}></i>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex bg-art-gray-800 rounded-lg p-1">
                    {VIEW_MODE_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => onViewModeChange(option.value)}
                        className={cn(
                          "px-3 py-1.5 rounded transition-colors",
                          viewMode === option.value
                            ? "bg-art-accent text-white"
                            : "text-art-gray-400 hover:text-white"
                        )}
                        title={option.label}
                      >
                        <i className={`fas ${option.icon}`}></i>
                      </button>
                    ))}
                  </div>

                  {/* Advanced Search Button */}
                  <button
                    type="button"
                    onClick={() => setShowAdvancedModal(true)}
                    className="px-4 py-2 bg-art-gray-800 text-white rounded-lg hover:bg-art-gray-700 transition-colors flex items-center gap-2"
                  >
                    <i className="fas fa-search-plus"></i>
                    <span className="hidden sm:inline">Advanced Search</span>
                  </button>

                  {/* Actions Dropdown */}
                  <div className="relative" ref={actionsRef}>
                    <button
                      type="button"
                      onClick={() => setActionsOpen(!actionsOpen)}
                      className="px-4 py-2 bg-art-gray-800 text-white rounded-lg hover:bg-art-gray-700 transition-colors flex items-center gap-2"
                      title="Actions"
                    >
                      <i className="fas fa-ellipsis-v"></i>
                      <span className="hidden sm:inline">Actions</span>
                      {selectedCount > 0 && (
                        <span className="bg-art-accent text-white text-xs px-2 py-0.5 rounded-full">
                          {selectedCount}
                        </span>
                      )}
                    </button>
                    {actionsOpen && (
                      <div className="absolute right-0 mt-2 w-64 bg-art-gray-900 rounded-lg shadow-lg z-50 divide-y divide-art-gray-800">
                        {/* Selection Actions */}
                        {selectionMode && (
                          <div className="py-2">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectAll()
                                setActionsOpen(false)
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2 text-left text-white hover:bg-art-gray-800 transition-colors"
                            >
                              <i className="fas fa-check-square text-art-gray-400"></i>
                              <span>Select All</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onClearSelection()
                                setActionsOpen(false)
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2 text-left text-white hover:bg-art-gray-800 transition-colors"
                            >
                              <i className="fas fa-times text-art-gray-400"></i>
                              <span>Clear Selection</span>
                            </button>
                          </div>
                        )}
                        
                        {/* Collection Actions */}
                        {selectedCount > 0 && (
                          <div className="py-2">
                            <button
                              type="button"
                              onClick={() => {
                                onAddToCollection && onAddToCollection()
                                setActionsOpen(false)
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2 text-left text-white hover:bg-art-gray-800 transition-colors"
                            >
                              <i className="fas fa-folder-plus text-art-gray-400"></i>
                              <span>Add to Collection ({selectedCount})</span>
                            </button>
                          </div>
                        )}
                        
                        {/* View Actions */}
                        {viewMode === 'list' && onConfigColumns && (
                          <div className="py-2">
                            <button
                              type="button"
                              onClick={() => {
                                onConfigColumns()
                                setActionsOpen(false)
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2 text-left text-white hover:bg-art-gray-800 transition-colors"
                            >
                              <i className="fas fa-cog text-art-gray-400"></i>
                              <span>Configure Columns</span>
                            </button>
                          </div>
                        )}
                        
                        {/* Search Actions */}
                        {currentSearchParams && (
                          <div className="py-2">
                            <button
                              type="button"
                              onClick={() => {
                                onSaveToDashboard()
                                setActionsOpen(false)
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2 text-left text-white hover:bg-art-gray-800 transition-colors"
                            >
                              <i className="fas fa-plus-square text-art-accent"></i>
                              <div>
                                <div className="font-medium">Save to Dashboard</div>
                                <div className="text-xs text-art-gray-400">Add this search as a tile</div>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
          </form>
        </div>
        
        {/* Expandable Filters Panel */}
        {showFiltersPanel && (
          <ExpandableFiltersPanel
            filters={advancedFilters}
            onChange={handleFiltersChange}
            onClear={handleClearFilters}
            isExpanded={filtersPanelExpanded}
            onToggleExpand={() => setFiltersPanelExpanded(!filtersPanelExpanded)}
            resourceTypes={resourceTypes}
          />
        )}
      </div>
      
      {/* Guided Search Modal */}
      <GuidedSearchModal
        isOpen={showAdvancedModal}
        onClose={() => setShowAdvancedModal(false)}
        onSearch={handleAdvancedSearch}
        initialFilters={advancedFilters}
        mode="guided"
      />
    </div>
  )
}