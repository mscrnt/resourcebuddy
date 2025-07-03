import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Search, ChevronRight, ChevronLeft, HelpCircle, Sparkles, Clock, Save, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../lib/utils'
import useAuthStore from '../../stores/useAuthStore'
import resourceSpaceApi from '../../lib/resourcespace-api-backend'
import { useCollectionBar } from '../../contexts/CollectionBarContext'

// Import step components
import StepOne from './StepOne'
import StepTwo from './StepTwo'
import StepThree from './StepThree'
import StepFour from './StepFour'
import SearchPresets from './SearchPresets'
import SavedSearches from './SavedSearches'

const STEPS = [
  { id: 1, title: "What are you looking for?", description: "Start with keywords, file types, or contributors" },
  { id: 2, title: "Add specific filters", description: "Narrow down with dates, metadata, and attributes" },
  { id: 3, title: "Choose filter logic", description: "How should your filters work together?" },
  { id: 4, title: "Review & search", description: "See your search in plain English" }
]

export default function GuidedSearchModal({ 
  isOpen, 
  onClose, 
  onSearch,
  initialFilters = {},
  mode = 'guided' // 'guided' or 'advanced'
}) {
  const modalRef = useRef(null)
  const { sessionKey } = useAuthStore()
  const { collectionBarHeight, isCollectionBarVisible } = useCollectionBar()
  
  // State
  const [currentStep, setCurrentStep] = useState(1)
  const [searchMode, setSearchMode] = useState(mode)
  const [showPresets, setShowPresets] = useState(false)
  const [showSavedSearches, setShowSavedSearches] = useState(false)
  const [resultCount, setResultCount] = useState(null)
  const [isCountLoading, setIsCountLoading] = useState(false)
  const [savedSearches, setSavedSearches] = useState([])
  
  // Search state organized by steps
  const [searchData, setSearchData] = useState({
    // Step 1: Basic search
    keywords: '',
    keywordLogic: 'all', // all, any, phrase, exclude
    fileTypes: [],
    contributors: [],
    uploadedBy: 'anyone', // anyone, me, specific
    
    // Step 2: Filters
    dateRange: { from: '', to: '' },
    metadataFields: {}, // fieldId: { value, operator }
    fileAttributes: {
      size: { min: '', max: '', unit: 'MB' },
      dimensions: { width: '', height: '', operator: 'exactly' }
    },
    specialSearches: [], // duplicates, nodownloads, empty fields
    
    // Step 3: Logic
    globalOperator: 'all', // all (AND) or any (OR)
    fieldOperators: {}, // fieldId: 'and' or 'or' for multi-value fields
    
    // Step 4: Review
    searchName: '',
    saveSearch: false,
    
    ...initialFilters
  })
  
  // Resource types and metadata fields
  const [resourceTypes, setResourceTypes] = useState([])
  const [metadataFields, setMetadataFields] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY
      
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      
      return () => {
        document.body.style.overflow = ''
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        
        window.scrollTo(0, scrollY)
      }
    }
  }, [isOpen])
  
  // Load data on mount
  useEffect(() => {
    if (isOpen) {
      loadInitialData()
      loadSavedSearches()
    }
  }, [isOpen])
  
  // Update result count when search changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isOpen && hasAnyFilters()) {
        updateResultCount()
      }
    }, 500)
    
    return () => clearTimeout(timeoutId)
  }, [searchData])
  
  const loadInitialData = async () => {
    try {
      setLoadingData(true)
      
      // Load resource types
      const types = await resourceSpaceApi.getResourceTypes(sessionKey)
      setResourceTypes(types || [])
      
      // Load metadata fields
      const fields = await resourceSpaceApi.getResourceTypeFields('', sessionKey)
      const searchableFields = fields.filter(field => 
        field.advanced_search === 1 && 
        field.display_field === 1 && 
        field.active === 1
      )
      setMetadataFields(searchableFields)
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoadingData(false)
    }
  }
  
  const loadSavedSearches = () => {
    try {
      const saved = localStorage.getItem('guidedSearches')
      if (saved) {
        setSavedSearches(JSON.parse(saved))
      }
    } catch (err) {
      console.error('Failed to load saved searches:', err)
    }
  }
  
  const hasAnyFilters = () => {
    return searchData.keywords || 
           searchData.fileTypes.length > 0 ||
           searchData.contributors.length > 0 ||
           Object.keys(searchData.metadataFields).length > 0 ||
           searchData.dateRange.from || searchData.dateRange.to
  }
  
  const updateResultCount = async () => {
    try {
      setIsCountLoading(true)
      // Build search query and get actual count from API
      const query = buildSearchQuery()
      console.log('Getting result count for query:', query)
      
      // Use doSearch with fetchrows=0 to get just the count
      const results = await resourceSpaceApi.doSearch(
        query,
        '', // all resource types
        'relevance',
        0, // active resources
        0, // fetchrows=0 returns count only
        'desc',
        0,
        sessionKey
      )
      
      console.log('Result count response:', results)
      
      // ResourceSpace returns total count when fetchrows=0
      const count = typeof results === 'number' ? results : (Array.isArray(results) ? results.length : 0)
      setResultCount(count)
    } catch (err) {
      console.error('Failed to get result count:', err)
      setResultCount(null)
    } finally {
      setIsCountLoading(false)
    }
  }
  
  const buildSearchQuery = () => {
    let searchParts = []
    
    // Special searches must come first
    if (searchData.specialSearches?.length > 0) {
      searchData.specialSearches.forEach(search => {
        searchParts.push(`!${search}`)
      })
    }
    
    // Keywords
    if (searchData.keywords) {
      switch (searchData.keywordLogic) {
        case 'all':
          // ResourceSpace behavior:
          // - Single word: no prefix needed (implicit AND)
          // - Multiple words: each needs + prefix for AND
          const words = searchData.keywords.trim().split(/\s+/).filter(w => w)
          if (words.length === 1) {
            searchParts.push(words[0])
          } else if (words.length > 1) {
            searchParts.push(words.map(w => `+${w}`).join(' '))
          }
          break
        case 'any':
          // Just the words, no prefix needed
          searchParts.push(searchData.keywords)
          break
        case 'phrase':
          // Exact phrase in quotes
          searchParts.push(`"${searchData.keywords}"`)
          break
        case 'exclude':
          // Each word prefixed with -
          searchParts.push(searchData.keywords.split(' ').map(w => `-${w}`).join(' '))
          break
      }
    }
    
    // File types - using extension field
    if (searchData.fileTypes?.length > 0) {
      searchParts.push(`extension:${searchData.fileTypes.join(';')}`)
    }
    
    // Contributors - need to use proper field name
    if (searchData.uploadedBy === 'me') {
      // This would need to be handled by checking current user
      searchParts.push('contributedby:me')
    } else if (searchData.uploadedBy === 'specific' && searchData.contributors?.length > 0) {
      searchParts.push(`contributedby:${searchData.contributors.join(';')}`)
    }
    
    // Date range
    if (searchData.dateRange?.from || searchData.dateRange?.to) {
      if (searchData.dateRange.from && searchData.dateRange.to) {
        searchParts.push(`createdate:rangestart${searchData.dateRange.from}end${searchData.dateRange.to}`)
      } else if (searchData.dateRange.from) {
        searchParts.push(`createdate:rangestart${searchData.dateRange.from}`)
      } else if (searchData.dateRange.to) {
        searchParts.push(`createdate:rangeend${searchData.dateRange.to}`)
      }
    }
    
    // Metadata fields
    Object.entries(searchData.metadataFields || {}).forEach(([fieldId, fieldData]) => {
      const field = metadataFields.find(f => f.ref === parseInt(fieldId))
      if (!field || !fieldData) return
      
      const fieldShortname = field.name || `field${fieldId}`
      
      if (fieldData.operator === 'empty') {
        searchParts.push(`!empty${fieldId}`)
      } else if (fieldData.operator === 'notempty') {
        searchParts.push(`!hasdata${fieldId}`)
      } else if (fieldData.value) {
        if (Array.isArray(fieldData.value)) {
          // Multiple values use semicolon for OR within field
          const values = fieldData.value.filter(v => v).join(';')
          if (values) {
            if (fieldData.operator === 'not') {
              // For NOT, we need to exclude each value
              fieldData.value.forEach(val => {
                if (val) searchParts.push(`-${fieldShortname}:"${val}"`)
              })
            } else {
              searchParts.push(`${fieldShortname}:${values}`)
            }
          }
        } else {
          // Single value
          if (fieldData.operator === 'not') {
            searchParts.push(`-${fieldShortname}:"${fieldData.value}"`)
          } else {
            searchParts.push(`${fieldShortname}:"${fieldData.value}"`)
          }
        }
      }
    })
    
    // File size - need to convert to bytes
    if (searchData.fileAttributes?.size?.min || searchData.fileAttributes?.size?.max) {
      const { min, max, unit } = searchData.fileAttributes.size
      const multiplier = { KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 }[unit] || 1024 * 1024
      
      if (min && max) {
        searchParts.push(`filesize:${min * multiplier}..${max * multiplier}`)
      } else if (min) {
        searchParts.push(`filesize:>${min * multiplier}`)
      } else if (max) {
        searchParts.push(`filesize:<${max * multiplier}`)
      }
    }
    
    // Image dimensions
    if (searchData.fileAttributes?.dimensions?.width || searchData.fileAttributes?.dimensions?.height) {
      const { width, height, operator } = searchData.fileAttributes.dimensions
      
      if (width) {
        switch (operator) {
          case 'at least':
            searchParts.push(`imagewidth:>${width}`)
            break
          case 'at most':
            searchParts.push(`imagewidth:<${width}`)
            break
          default:
            searchParts.push(`imagewidth:${width}`)
        }
      }
      
      if (height) {
        switch (operator) {
          case 'at least':
            searchParts.push(`imageheight:>${height}`)
            break
          case 'at most':
            searchParts.push(`imageheight:<${height}`)
            break
          default:
            searchParts.push(`imageheight:${height}`)
        }
      }
    }
    
    // Join with spaces (ResourceSpace uses spaces between different criteria)
    return searchParts.join(' ')
  }
  
  const handleStepChange = (step) => {
    setCurrentStep(step)
  }
  
  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }
  
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }
  
  const handleSearchDataChange = (updates) => {
    setSearchData(prev => ({ ...prev, ...updates }))
  }
  
  const handlePresetSelect = (preset) => {
    setSearchData(prev => ({ ...prev, ...preset }))
    setShowPresets(false)
    setCurrentStep(2) // Skip to filters
  }
  
  const handleSavedSearchSelect = (search) => {
    setSearchData(search.data)
    setShowSavedSearches(false)
    setCurrentStep(4) // Go to review
  }
  
  const handleSaveSearch = () => {
    if (!searchData.searchName) return
    
    const newSearch = {
      id: Date.now(),
      name: searchData.searchName,
      data: searchData,
      createdAt: new Date().toISOString()
    }
    
    const updatedSearches = [...savedSearches, newSearch]
    setSavedSearches(updatedSearches)
    localStorage.setItem('guidedSearches', JSON.stringify(updatedSearches))
  }
  
  const handleDeleteSavedSearch = (id) => {
    const updatedSearches = savedSearches.filter(s => s.id !== id)
    setSavedSearches(updatedSearches)
    localStorage.setItem('guidedSearches', JSON.stringify(updatedSearches))
  }
  
  const handleExecuteSearch = () => {
    const query = buildSearchQuery()
    
    // Debug log to help troubleshoot
    console.log('Executing search with query:', query)
    console.log('Search data:', searchData)
    
    if (searchData.saveSearch && searchData.searchName) {
      handleSaveSearch()
    }
    
    onSearch({
      query,
      filters: searchData,
      mode: searchMode
    })
    
    onClose()
  }
  
  const handleClose = () => {
    // Reset state if needed
    onClose()
  }
  
  if (!isOpen) return null
  
  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-start justify-center pt-16"
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose()
        }}
        aria-modal="true"
        role="dialog"
        aria-labelledby="guided-search-title"
      >
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ 
            type: "spring",
            damping: 25,
            stiffness: 300
          }}
          className="relative bg-art-gray-900 rounded-xl shadow-2xl w-[98vw] max-w-[1800px] flex flex-col"
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            height: isCollectionBarVisible 
              ? `calc(100vh - 64px - ${collectionBarHeight}px - 16px)`
              : 'calc(100vh - 64px - 16px)',
            maxHeight: 'calc(100vh - 80px)'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-art-gray-800 flex-shrink-0 rounded-t-xl">
            <div className="flex items-center gap-6">
              <h2 id="guided-search-title" className="text-2xl font-semibold text-white">
                {searchMode === 'guided' ? 'Guided Search' : 'Advanced Search'}
              </h2>
              
              {/* Mode Toggle */}
              <div className="flex bg-art-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setSearchMode('guided')}
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                    searchMode === 'guided' 
                      ? "bg-art-accent text-white" 
                      : "text-art-gray-400 hover:text-white"
                  )}
                >
                  <Sparkles className="inline-block w-4 h-4 mr-2" />
                  Guided
                </button>
                <button
                  onClick={() => setSearchMode('advanced')}
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                    searchMode === 'advanced' 
                      ? "bg-art-accent text-white" 
                      : "text-art-gray-400 hover:text-white"
                  )}
                >
                  Advanced
                </button>
              </div>
              
              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPresets(!showPresets)}
                  className="px-4 py-2 text-sm text-art-gray-400 hover:text-white transition-colors flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Presets
                </button>
                <button
                  onClick={() => setShowSavedSearches(!showSavedSearches)}
                  className="px-4 py-2 text-sm text-art-gray-400 hover:text-white transition-colors flex items-center gap-2"
                >
                  <Clock className="w-4 h-4" />
                  Saved ({savedSearches.length})
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Result Count */}
              {resultCount !== null && (
                <div className="text-sm text-art-gray-400">
                  {isCountLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-art-accent"></div>
                  ) : (
                    <span>
                      {resultCount} result{resultCount !== 1 ? 's' : ''} found
                    </span>
                  )}
                </div>
              )}
              
              <button
                onClick={handleClose}
                className="p-2 hover:bg-art-gray-800 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="h-5 w-5 text-art-gray-400" />
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {searchMode === 'guided' ? (
              <>
                {/* Step Progress */}
                <div className="px-6 py-4 border-b border-art-gray-800">
                  <div className="flex items-center justify-between">
                    {STEPS.map((step, index) => (
                      <div
                        key={step.id}
                        className="flex items-center cursor-pointer"
                        onClick={() => handleStepChange(step.id)}
                      >
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors",
                            currentStep === step.id
                              ? "bg-art-accent text-white"
                              : currentStep > step.id
                              ? "bg-art-accent/20 text-art-accent"
                              : "bg-art-gray-800 text-art-gray-400"
                          )}
                        >
                          {currentStep > step.id ? '✓' : step.id}
                        </div>
                        <div className="ml-3 mr-8">
                          <p className={cn(
                            "text-sm font-medium",
                            currentStep === step.id ? "text-white" : "text-art-gray-400"
                          )}>
                            {step.title}
                          </p>
                          <p className="text-xs text-art-gray-500">{step.description}</p>
                        </div>
                        {index < STEPS.length - 1 && (
                          <ChevronRight className="h-5 w-5 text-art-gray-600 mx-4" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Step Content */}
                <div className="flex-1 overflow-y-auto">
                  <AnimatePresence mode="wait">
                    {showPresets ? (
                      <SearchPresets
                        onSelect={handlePresetSelect}
                        onClose={() => setShowPresets(false)}
                      />
                    ) : showSavedSearches ? (
                      <SavedSearches
                        searches={savedSearches}
                        onSelect={handleSavedSearchSelect}
                        onDelete={handleDeleteSavedSearch}
                        onClose={() => setShowSavedSearches(false)}
                      />
                    ) : (
                      <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="p-6"
                      >
                        {currentStep === 1 && (
                          <StepOne
                            data={searchData}
                            onChange={handleSearchDataChange}
                            resourceTypes={resourceTypes}
                            loading={loadingData}
                          />
                        )}
                        {currentStep === 2 && (
                          <StepTwo
                            data={searchData}
                            onChange={handleSearchDataChange}
                            metadataFields={metadataFields}
                            loading={loadingData}
                          />
                        )}
                        {currentStep === 3 && (
                          <StepThree
                            data={searchData}
                            onChange={handleSearchDataChange}
                            metadataFields={metadataFields}
                          />
                        )}
                        {currentStep === 4 && (
                          <StepFour
                            data={searchData}
                            onChange={handleSearchDataChange}
                            metadataFields={metadataFields}
                            resourceTypes={resourceTypes}
                          />
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Footer Navigation */}
                <div className="flex items-center justify-between p-6 border-t border-art-gray-800 flex-shrink-0 rounded-b-xl">
                  <button
                    onClick={handlePrevious}
                    disabled={currentStep === 1}
                    className={cn(
                      "px-6 py-2 rounded-lg flex items-center gap-2 transition-colors",
                      currentStep === 1
                        ? "bg-art-gray-800 text-art-gray-600 cursor-not-allowed"
                        : "bg-art-gray-800 text-white hover:bg-art-gray-700"
                    )}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleClose}
                      className="px-6 py-2 bg-art-gray-800 text-white rounded-lg hover:bg-art-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    
                    {currentStep < STEPS.length ? (
                      <button
                        onClick={handleNext}
                        className="px-6 py-2 bg-art-accent text-white rounded-lg hover:bg-art-accent-dark transition-colors flex items-center gap-2"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={handleExecuteSearch}
                        className="px-8 py-2 bg-art-accent text-white rounded-lg hover:bg-art-accent-dark transition-colors flex items-center gap-2"
                      >
                        <Search className="h-4 w-4" />
                        Search
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              // Advanced mode - show all fields at once
              <>
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {/* All steps content in advanced mode */}
                    <div className="space-y-6">
                      <StepOne
                        data={searchData}
                        onChange={handleSearchDataChange}
                        resourceTypes={resourceTypes}
                        loading={loadingData}
                        compact
                      />
                    </div>
                    <div className="space-y-6">
                      <StepTwo
                        data={searchData}
                        onChange={handleSearchDataChange}
                        metadataFields={metadataFields}
                        loading={loadingData}
                        compact
                      />
                    </div>
                    <div className="space-y-6">
                      <StepThree
                        data={searchData}
                        onChange={handleSearchDataChange}
                        metadataFields={metadataFields}
                        compact
                      />
                      <StepFour
                        data={searchData}
                        onChange={handleSearchDataChange}
                        metadataFields={metadataFields}
                        resourceTypes={resourceTypes}
                        compact
                      />
                    </div>
                  </div>
                </div>
                
                {/* Footer for Advanced Mode */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-art-gray-800 flex-shrink-0 rounded-b-xl">
                  <button
                    onClick={handleClose}
                    className="px-6 py-2 bg-art-gray-800 text-white rounded-lg hover:bg-art-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecuteSearch}
                    className="px-8 py-2 bg-art-accent text-white rounded-lg hover:bg-art-accent-dark transition-colors flex items-center gap-2"
                  >
                    <Search className="h-4 w-4" />
                    Search
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}