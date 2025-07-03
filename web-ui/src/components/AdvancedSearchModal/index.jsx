import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Search, RotateCcw, Calendar, ChevronDown, ChevronRight, Info, HelpCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../lib/utils'
import useAuthStore from '../../stores/useAuthStore'
import resourceSpaceApi from '../../lib/resourcespace-api-backend'
import FieldInput from './FieldInput'
import SearchTooltip from './SearchTooltip'
import { useGlobalModal, MODAL_TYPES } from '../../contexts/GlobalModalContext'
import { useCollectionBar } from '../../contexts/CollectionBarContext'

export default function AdvancedSearchModal({ 
  isOpen, 
  onClose, 
  onSearch,
  initialFilters = {} 
}) {
  const modalRef = useRef(null)
  const firstInputRef = useRef(null)
  const { sessionKey } = useAuthStore()
  const { collectionBarHeight, isCollectionBarVisible } = useCollectionBar()
  
  // Load persisted resource types from localStorage
  const getPersistedResourceTypes = () => {
    try {
      const stored = localStorage.getItem('advancedSearchResourceTypes')
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (e) {
      console.error('Failed to load persisted resource types:', e)
    }
    return null
  }

  // State for form fields
  const [filters, setFilters] = useState({
    allWords: '',
    phrase: '',
    anyWords: '',
    withoutWords: '',
    resourceTypes: getPersistedResourceTypes() || [],
    operator: 'AND',
    fields: {}, // Dynamic metadata fields
    ...initialFilters
  })
  
  const [resourceTypes, setResourceTypes] = useState([])
  const [metadataFields, setMetadataFields] = useState([])
  const [loadingTypes, setLoadingTypes] = useState(true)
  const [loadingFields, setLoadingFields] = useState(true)
  const [expandedSections, setExpandedSections] = useState({
    textSearch: true,
    resourceTypes: true,
    globalFields: true,
    typeSpecificFields: true,
    contributorFields: false,
    mediaFields: false
  })
  
  // Group fields by category
  const groupedFields = useMemo(() => {
    const global = []
    const typeSpecific = []
    const contributor = []
    const media = []
    
    // Keywords that identify field categories
    const contributorKeywords = ['creator', 'contributor', 'author', 'photographer', 'artist', 'credit', 'copyright', 'owner']
    const mediaKeywords = ['size', 'dimensions', 'width', 'height', 'format', 'extension', 'duration', 'resolution', 'dpi', 'color', 'orientation']
    
    metadataFields.forEach(field => {
      const fieldNameLower = field.name?.toLowerCase() || ''
      const titleLower = field.title?.toLowerCase() || ''
      
      // Check if it's a contributor/access field
      if (contributorKeywords.some(keyword => fieldNameLower.includes(keyword) || titleLower.includes(keyword))) {
        contributor.push(field)
      }
      // Check if it's a media/file attribute field
      else if (mediaKeywords.some(keyword => fieldNameLower.includes(keyword) || titleLower.includes(keyword))) {
        media.push(field)
      }
      // Otherwise, group by global/type-specific
      else if (field.global === 1 || field.global === '1') {
        global.push(field)
      } else {
        typeSpecific.push(field)
      }
    })
    
    return { global, typeSpecific, contributor, media }
  }, [metadataFields])
  
  // Filter type-specific fields based on selected resource types
  const visibleTypeSpecificFields = useMemo(() => {
    if (filters.resourceTypes.length === 0) {
      return groupedFields.typeSpecific
    }
    
    return groupedFields.typeSpecific.filter(field => {
      const fieldTypes = field.resource_types ? field.resource_types.split(',').map(t => parseInt(t)) : []
      return filters.resourceTypes.some(selectedType => fieldTypes.includes(selectedType))
    })
  }, [groupedFields.typeSpecific, filters.resourceTypes])
  
  // Load resource types and fields
  useEffect(() => {
    if (isOpen) {
      loadResourceTypes()
      loadMetadataFields()
    }
  }, [isOpen])
  
  // Reload fields when resource types change
  useEffect(() => {
    if (isOpen && filters.resourceTypes.length > 0) {
      loadMetadataFields()
    }
  }, [filters.resourceTypes])
  
  // Check if we should use global modal context
  const globalModal = typeof useGlobalModal === 'function' ? useGlobalModal() : null
  const isModalActive = globalModal?.isModalOpen(MODAL_TYPES.ADVANCED_SEARCH) || isOpen
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      
      return () => {
        // Restore body scroll
        document.body.style.overflow = ''
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        
        // Restore scroll position
        window.scrollTo(0, scrollY)
      }
    }
  }, [isOpen])
  
  // Focus trap and escape key handler
  useEffect(() => {
    if (!isOpen) return
    
    // Focus first input when modal opens
    setTimeout(() => {
      firstInputRef.current?.focus()
    }, 100)
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
      
      // Tab trap
      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'input, button, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (!focusableElements?.length) return
        
        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]
        
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])
  
  const loadResourceTypes = async () => {
    try {
      setLoadingTypes(true)
      const types = await resourceSpaceApi.getResourceTypes(sessionKey)
      setResourceTypes(types || [])
      
      // If no persisted selection and no initial filters, default to all types selected
      if (!getPersistedResourceTypes() && filters.resourceTypes.length === 0) {
        const allTypeIds = (types || []).map(t => t.ref)
        setFilters(prev => ({ ...prev, resourceTypes: allTypeIds }))
        // Save the default selection
        localStorage.setItem('advancedSearchResourceTypes', JSON.stringify(allTypeIds))
      }
    } catch (err) {
      console.error('Failed to load resource types:', err)
    } finally {
      setLoadingTypes(false)
    }
  }
  
  const loadMetadataFields = async () => {
    try {
      setLoadingFields(true)
      
      // Get fields for all types or specific types
      const typeParam = filters.resourceTypes.length > 0 ? filters.resourceTypes.join(',') : ''
      const fields = await resourceSpaceApi.getResourceTypeFields(typeParam, sessionKey)
      
      // Filter for advanced search fields
      const advancedFields = fields.filter(field => 
        field.advanced_search === 1 && 
        field.display_field === 1 && 
        field.active === 1
      )
      
      setMetadataFields(advancedFields)
    } catch (err) {
      console.error('Failed to load metadata fields:', err)
    } finally {
      setLoadingFields(false)
    }
  }
  
  const handleChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }
  
  const handleFieldChange = (fieldRef, value) => {
    setFilters(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [fieldRef]: value
      }
    }))
  }
  
  const handleResourceTypeToggle = (typeId) => {
    setFilters(prev => {
      const newTypes = prev.resourceTypes.includes(typeId)
        ? prev.resourceTypes.filter(id => id !== typeId)
        : [...prev.resourceTypes, typeId]
      
      // Persist to localStorage
      localStorage.setItem('advancedSearchResourceTypes', JSON.stringify(newTypes))
      
      return {
        ...prev,
        resourceTypes: newTypes
      }
    })
  }
  
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }
  
  const buildSearchQuery = () => {
    let searchParts = []
    
    // Text search fields
    if (filters.allWords) {
      searchParts.push(filters.allWords.split(' ').map(w => `+${w}`).join(' '))
    }
    
    if (filters.phrase) {
      searchParts.push(`"${filters.phrase}"`)
    }
    
    if (filters.anyWords) {
      searchParts.push(filters.anyWords)
    }
    
    if (filters.withoutWords) {
      searchParts.push(filters.withoutWords.split(' ').map(w => `-${w}`).join(' '))
    }
    
    // Metadata fields
    Object.entries(filters.fields).forEach(([fieldRef, value]) => {
      if (!value || (Array.isArray(value) && value.length === 0)) return
      
      const field = metadataFields.find(f => f.ref === parseInt(fieldRef))
      if (!field) return
      
      // Build field-specific search syntax
      if (Array.isArray(value)) {
        // Multiple values - use OR within field
        if (value.length > 0) {
          const values = value.map(v => `"${v}"`).join(';')
          searchParts.push(`${field.name}:${values}`)
        }
      } else if (typeof value === 'object' && value.from) {
        // Date range
        if (value.from && value.to) {
          searchParts.push(`${field.name}:${value.from}..${value.to}`)
        } else if (value.from) {
          searchParts.push(`${field.name}:>=${value.from}`)
        } else if (value.to) {
          searchParts.push(`${field.name}:<=${value.to}`)
        }
      } else if (value === '!empty') {
        // Not empty
        searchParts.push(`!empty${fieldRef}`)
      } else if (typeof value === 'string' && value.trim()) {
        // Single value
        searchParts.push(`${field.name}:"${value.trim()}"`)
      }
    })
    
    // Join with operator
    const query = searchParts.join(filters.operator === 'OR' ? ' OR ' : ' ')
    
    return query
  }
  
  const handleSubmit = (e) => {
    e.preventDefault()
    
    const searchQuery = buildSearchQuery()
    
    onSearch({
      query: searchQuery,
      filters: filters,
      resourceTypes: filters.resourceTypes
    })
    
    onClose()
  }
  
  const handleClear = () => {
    // Clear persisted resource types
    localStorage.removeItem('advancedSearchResourceTypes')
    
    setFilters({
      allWords: '',
      phrase: '',
      anyWords: '',
      withoutWords: '',
      resourceTypes: [],
      operator: 'AND',
      fields: {}
    })
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
          if (e.target === e.currentTarget) onClose()
        }}
        aria-modal="true"
        role="dialog"
        aria-labelledby="advanced-search-title"
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
          className="relative bg-art-gray-900 rounded-xl shadow-2xl w-[98vw] max-w-[1800px] overflow-hidden flex flex-col"
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            height: isCollectionBarVisible 
              ? `calc(100vh - 64px - ${collectionBarHeight}px - 16px)` // 64px navbar + collection bar + 16px total gaps
              : 'calc(100vh - 64px - 16px)', // 64px navbar + 16px bottom gap
            maxHeight: 'calc(100vh - 80px)' // Safety max height
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-art-gray-800 flex-shrink-0">
            <div className="flex items-center gap-4">
              <h2 id="advanced-search-title" className="text-xl font-semibold text-white">Advanced Search</h2>
              <SearchTooltip />
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-art-gray-800 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="h-5 w-5 text-art-gray-400" />
            </button>
          </div>
          
          {/* Form - Scrollable Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
              {/* Text Search & Resource Types Section */}
              <div className="space-y-6 md:col-span-2 xl:col-span-1">
                {/* Text Search Section */}
                <div className="bg-art-gray-800/50 rounded-lg p-4">
                  <button
                    type="button"
                    onClick={() => toggleSection('textSearch')}
                    className="flex items-center justify-between w-full mb-4 text-left"
                  >
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                      {expandedSections.textSearch ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      Text Search
                    </h3>
                  </button>
                  
                  <AnimatePresence>
                    {expandedSections.textSearch && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ 
                          duration: 0.3,
                          ease: [0.4, 0, 0.2, 1]
                        }}
                        className="space-y-4"
                      >
                        <div>
                          <label className="block text-sm font-medium text-art-gray-400 mb-2">
                            All of these words
                          </label>
                          <input
                            ref={firstInputRef}
                            type="text"
                            value={filters.allWords}
                            onChange={(e) => handleChange('allWords', e.target.value)}
                            placeholder="word1 word2 word3"
                            className="w-full px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-art-gray-400 mb-2">
                            This exact phrase
                          </label>
                          <input
                            type="text"
                            value={filters.phrase}
                            onChange={(e) => handleChange('phrase', e.target.value)}
                            placeholder="exact phrase to search"
                            className="w-full px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-art-gray-400 mb-2">
                            Any of these words
                          </label>
                          <input
                            type="text"
                            value={filters.anyWords}
                            onChange={(e) => handleChange('anyWords', e.target.value)}
                            placeholder="word1 OR word2 OR word3"
                            className="w-full px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-art-gray-400 mb-2">
                            None of these words
                          </label>
                          <input
                            type="text"
                            value={filters.withoutWords}
                            onChange={(e) => handleChange('withoutWords', e.target.value)}
                            placeholder="exclude1 exclude2"
                            className="w-full px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-art-gray-400 mb-2">
                            Search Operator
                          </label>
                          <select
                            value={filters.operator}
                            onChange={(e) => handleChange('operator', e.target.value)}
                            className="w-full px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                          >
                            <option value="AND">AND (all conditions must match)</option>
                            <option value="OR">OR (any condition can match)</option>
                          </select>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Resource Types Section */}
                <div className="bg-art-gray-800/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      type="button"
                      onClick={() => toggleSection('resourceTypes')}
                      className="flex items-center gap-2 text-left"
                    >
                      <h3 className="text-lg font-medium text-white flex items-center gap-2">
                        {expandedSections.resourceTypes ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        Resource Types
                        {filters.resourceTypes.length > 0 && (
                          <span className="text-xs bg-art-accent px-2 py-0.5 rounded-full">
                            {filters.resourceTypes.length}
                          </span>
                        )}
                      </h3>
                    </button>
                    
                    {expandedSections.resourceTypes && resourceTypes.length > 0 && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const allTypeIds = resourceTypes.map(t => t.ref)
                            setFilters(prev => ({ ...prev, resourceTypes: allTypeIds }))
                            localStorage.setItem('advancedSearchResourceTypes', JSON.stringify(allTypeIds))
                          }}
                          className="text-xs text-art-gray-400 hover:text-white transition-colors"
                        >
                          Select All
                        </button>
                        <span className="text-xs text-art-gray-600">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFilters(prev => ({ ...prev, resourceTypes: [] }))
                            localStorage.setItem('advancedSearchResourceTypes', JSON.stringify([]))
                          }}
                          className="text-xs text-art-gray-400 hover:text-white transition-colors"
                        >
                          Clear All
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <AnimatePresence>
                    {expandedSections.resourceTypes && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ 
                          duration: 0.3,
                          ease: [0.4, 0, 0.2, 1]
                        }}
                      >
                        {loadingTypes ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-art-accent"></div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {resourceTypes.map(type => (
                              <label
                                key={type.ref}
                                className="flex items-center space-x-2 cursor-pointer hover:bg-art-gray-700/50 p-2 rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={filters.resourceTypes.includes(type.ref)}
                                  onChange={() => handleResourceTypeToggle(type.ref)}
                                  className="w-4 h-4 text-art-accent bg-art-gray-800 border-art-gray-600 rounded focus:ring-art-accent focus:ring-2"
                                />
                                <span className="text-sm text-white">{type.name}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              
              {/* Global Fields Section */}
              <div className="space-y-6 md:col-span-1 xl:col-span-1">
                <div className="bg-art-gray-800/50 rounded-lg p-4">
                  <button
                    type="button"
                    onClick={() => toggleSection('globalFields')}
                    className="flex items-center justify-between w-full mb-4 text-left"
                  >
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                      {expandedSections.globalFields ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      Global Fields
                    </h3>
                  </button>
                  
                  <AnimatePresence>
                    {expandedSections.globalFields && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ 
                          duration: 0.3,
                          ease: [0.4, 0, 0.2, 1]
                        }}
                      >
                        {loadingFields ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-art-accent"></div>
                          </div>
                        ) : groupedFields.global.length === 0 ? (
                          <p className="text-sm text-art-gray-400">No global fields available</p>
                        ) : (
                          <div className="space-y-4">
                            {groupedFields.global.map(field => (
                              <FieldInput
                                key={field.ref}
                                field={field}
                                value={filters.fields[field.ref]}
                                onChange={(value) => handleFieldChange(field.ref, value)}
                                sessionKey={sessionKey}
                              />
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              
              {/* Type-Specific Fields Section */}
              <div className="space-y-6 md:col-span-2 xl:col-span-1">
                <div className="bg-art-gray-800/50 rounded-lg p-4">
                  <button
                    type="button"
                    onClick={() => toggleSection('typeSpecificFields')}
                    className="flex items-center justify-between w-full mb-4 text-left"
                  >
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                      {expandedSections.typeSpecificFields ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      Type-Specific Fields
                      {filters.resourceTypes.length === 0 && (
                        <span className="text-xs text-art-gray-400">(Select resource types first)</span>
                      )}
                    </h3>
                  </button>
                  
                  <AnimatePresence>
                    {expandedSections.typeSpecificFields && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ 
                          duration: 0.3,
                          ease: [0.4, 0, 0.2, 1]
                        }}
                      >
                        {loadingFields ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-art-accent"></div>
                          </div>
                        ) : visibleTypeSpecificFields.length === 0 ? (
                          <p className="text-sm text-art-gray-400">
                            {filters.resourceTypes.length === 0 
                              ? "Select resource types to see available fields"
                              : "No type-specific fields available"}
                          </p>
                        ) : (
                          <div className="space-y-4">
                            {visibleTypeSpecificFields.map(field => (
                              <FieldInput
                                key={field.ref}
                                field={field}
                                value={filters.fields[field.ref]}
                                onChange={(value) => handleFieldChange(field.ref, value)}
                                sessionKey={sessionKey}
                              />
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              
              {/* Contributor & Access Fields Section */}
              <div className="space-y-6 md:col-span-1 xl:col-span-1">
                <div className="bg-art-gray-800/50 rounded-lg p-4">
                  <button
                    type="button"
                    onClick={() => toggleSection('contributorFields')}
                    className="flex items-center justify-between w-full mb-4 text-left"
                  >
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                      {expandedSections.contributorFields ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      Contributor & Access
                      {groupedFields.contributor.length > 0 && (
                        <span className="text-xs bg-art-accent px-2 py-0.5 rounded-full">
                          {groupedFields.contributor.length}
                        </span>
                      )}
                    </h3>
                  </button>
                  
                  <AnimatePresence>
                    {expandedSections.contributorFields && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ 
                          duration: 0.3,
                          ease: [0.4, 0, 0.2, 1]
                        }}
                      >
                        {groupedFields.contributor.length === 0 ? (
                          <p className="text-sm text-art-gray-400">No contributor fields available</p>
                        ) : (
                          <div className="space-y-4">
                            {groupedFields.contributor.map(field => (
                              <FieldInput
                                key={field.ref}
                                field={field}
                                value={filters.fields[field.ref]}
                                onChange={(value) => handleFieldChange(field.ref, value)}
                                sessionKey={sessionKey}
                              />
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              
              {/* Media/File Attributes Section */}
              <div className="space-y-6 md:col-span-1 xl:col-span-1">
                <div className="bg-art-gray-800/50 rounded-lg p-4">
                  <button
                    type="button"
                    onClick={() => toggleSection('mediaFields')}
                    className="flex items-center justify-between w-full mb-4 text-left"
                  >
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                      {expandedSections.mediaFields ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      Media & File Attributes
                      {groupedFields.media.length > 0 && (
                        <span className="text-xs bg-art-accent px-2 py-0.5 rounded-full">
                          {groupedFields.media.length}
                        </span>
                      )}
                    </h3>
                  </button>
                  
                  <AnimatePresence>
                    {expandedSections.mediaFields && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ 
                          duration: 0.3,
                          ease: [0.4, 0, 0.2, 1]
                        }}
                      >
                        {groupedFields.media.length === 0 ? (
                          <p className="text-sm text-art-gray-400">No media fields available</p>
                        ) : (
                          <div className="space-y-4">
                            {groupedFields.media.map(field => (
                              <FieldInput
                                key={field.ref}
                                field={field}
                                value={filters.fields[field.ref]}
                                onChange={(value) => handleFieldChange(field.ref, value)}
                                sessionKey={sessionKey}
                              />
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </form>
          
          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-art-gray-800 flex-shrink-0">
            <div className="text-sm text-art-gray-400">
              {Object.keys(filters.fields).filter(k => filters.fields[k]).length} metadata fields selected
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2 text-art-gray-400 hover:text-white transition-colors flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Clear All
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-art-gray-800 text-white rounded-lg hover:bg-art-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                className="px-6 py-2 bg-art-accent text-white rounded-lg hover:bg-art-accent-dark transition-colors flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                Search
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}