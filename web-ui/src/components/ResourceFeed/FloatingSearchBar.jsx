import { useState, useEffect, useRef } from 'react'
import { cn } from '../../lib/utils'
import useAuthStore from '../../stores/useAuthStore'

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
  const { user } = useAuthStore()
  const [searchValue, setSearchValue] = useState(initialQuery)
  const [advancedFilters, setAdvancedFilters] = useState({
    title: '',
    description: '',
    contributor: '',
    field1: '',
    field8: '',
    operator: 'AND'
  })
  const [actionsOpen, setActionsOpen] = useState(false)
  const actionsRef = useRef(null)

  useEffect(() => {
    setSearchValue(initialQuery)
  }, [initialQuery])

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

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (advancedMode) {
      onAdvancedSearch(advancedFilters)
    } else {
      onSearch(searchValue)
    }
  }

  const handleSortChange = (field) => {
    if (field === sortField) {
      onSort(field, sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      onSort(field, 'desc')
    }
  }

  const handleFilterChange = (field, value) => {
    setAdvancedFilters(prev => ({ ...prev, [field]: value }))
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
            {/* Simple Search */}
            {!advancedMode ? (
              <div className="flex items-center gap-4">
                <div className="flex-1 flex items-center gap-4">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      placeholder="Search resources..."
                      className="w-full pl-10 pr-4 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                    />
                    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-art-gray-400"></i>
                  </div>

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

                  {/* Advanced Toggle */}
                  <button
                    type="button"
                    onClick={onToggleAdvanced}
                    className="px-4 py-2 text-art-gray-400 hover:text-white transition-colors"
                    title="Advanced Search"
                  >
                    <i className="fas fa-sliders-h"></i>
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
            ) : (
              /* Advanced Search */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white">Advanced Search</h3>
                  <button
                    type="button"
                    onClick={onToggleAdvanced}
                    className="text-art-gray-400 hover:text-white transition-colors"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-art-gray-400 mb-1">Title</label>
                    <input
                      type="text"
                      value={advancedFilters.title}
                      onChange={(e) => handleFilterChange('title', e.target.value)}
                      className="w-full px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-art-gray-400 mb-1">Description</label>
                    <input
                      type="text"
                      value={advancedFilters.description}
                      onChange={(e) => handleFilterChange('description', e.target.value)}
                      className="w-full px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-art-gray-400 mb-1">Contributor</label>
                    <input
                      type="text"
                      value={advancedFilters.contributor}
                      onChange={(e) => handleFilterChange('contributor', e.target.value)}
                      className="w-full px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-art-gray-400 mb-1">Keywords (Field 1)</label>
                    <input
                      type="text"
                      value={advancedFilters.field1}
                      onChange={(e) => handleFilterChange('field1', e.target.value)}
                      className="w-full px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-art-gray-400 mb-1">Caption (Field 8)</label>
                    <input
                      type="text"
                      value={advancedFilters.field8}
                      onChange={(e) => handleFilterChange('field8', e.target.value)}
                      className="w-full px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-art-gray-400 mb-1">Operator</label>
                    <select
                      value={advancedFilters.operator}
                      onChange={(e) => handleFilterChange('operator', e.target.value)}
                      className="w-full px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                    >
                      <option value="AND">AND (all conditions)</option>
                      <option value="OR">OR (any condition)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters({
                        title: '',
                        description: '',
                        contributor: '',
                        field1: '',
                        field8: '',
                        operator: 'AND'
                      })
                    }}
                    className="px-4 py-2 text-art-gray-400 hover:text-white transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-art-accent text-white rounded-lg hover:bg-art-accent-dark transition-colors"
                  >
                    <i className="fas fa-search mr-2"></i>
                    Search
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}