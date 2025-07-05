import { useState, useEffect } from 'react'
import { X, ChevronDown, ChevronUp, Calendar, Filter } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../lib/utils'

export default function ExpandableFiltersPanel({
  filters,
  onChange,
  onClear,
  isExpanded,
  onToggleExpand,
  resourceTypes = [],
  metadataFields = []
}) {
  const [localFilters, setLocalFilters] = useState(filters)
  
  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])
  
  const handleChange = (field, value) => {
    const newFilters = { ...localFilters, [field]: value }
    setLocalFilters(newFilters)
    onChange(newFilters)
  }
  
  const handleResourceTypeToggle = (typeId) => {
    const newTypes = localFilters.resourceTypes.includes(typeId)
      ? localFilters.resourceTypes.filter(id => id !== typeId)
      : [...localFilters.resourceTypes, typeId]
    
    handleChange('resourceTypes', newTypes)
  }
  
  const handleRemoveFilter = (field) => {
    const newFilters = { ...localFilters }
    
    // Handle metadata fields
    if (field.startsWith('field_')) {
      const fieldRef = field.substring(6)
      if (newFilters.fields) {
        delete newFilters.fields[fieldRef]
      }
    } else {
      // Reset field to default value
      switch (field) {
        case 'resourceTypes':
          newFilters.resourceTypes = []
          break
        case 'dateFrom':
        case 'dateTo':
          newFilters[field] = ''
          break
        default:
          newFilters[field] = ''
      }
    }
    
    setLocalFilters(newFilters)
    onChange(newFilters)
  }
  
  // Count active filters
  const activeFilterCount = Object.entries(localFilters).filter(([key, value]) => {
    if (key === 'operator') return false
    if (key === 'resourceTypes') return value.length > 0
    return value && value !== ''
  }).length
  
  // Generate filter chips for display
  const filterChips = []
  
  if (localFilters.allWords) {
    filterChips.push({ field: 'allWords', label: 'All words', value: localFilters.allWords })
  }
  
  if (localFilters.phrase) {
    filterChips.push({ field: 'phrase', label: 'Exact phrase', value: localFilters.phrase })
  }
  
  if (localFilters.anyWords) {
    filterChips.push({ field: 'anyWords', label: 'Any words', value: localFilters.anyWords })
  }
  
  if (localFilters.withoutWords) {
    filterChips.push({ field: 'withoutWords', label: 'Without', value: localFilters.withoutWords })
  }
  
  // Add dynamic metadata fields
  if (localFilters.fields) {
    Object.entries(localFilters.fields).forEach(([fieldRef, value]) => {
      if (!value || (Array.isArray(value) && value.length === 0)) return
      
      let displayValue = value
      if (Array.isArray(value)) {
        displayValue = value.map(v => v.name || v).join(', ')
      } else if (typeof value === 'object' && value.from) {
        displayValue = value.to ? `${value.from} to ${value.to}` : `From ${value.from}`
      } else if (typeof value === 'object' && value.name) {
        displayValue = value.name
      }
      
      // Find the field metadata to get the proper name
      const field = metadataFields.find(f => f.ref === parseInt(fieldRef))
      const fieldLabel = field?.title || field?.name || `Field ${fieldRef}`
      
      filterChips.push({ 
        field: `field_${fieldRef}`, 
        label: fieldLabel,
        value: displayValue 
      })
    })
  }
  
  if (localFilters.resourceTypes?.length > 0) {
    const typeNames = localFilters.resourceTypes
      .map(typeId => resourceTypes.find(t => t.ref === typeId)?.name || `Type ${typeId}`)
      .join(', ')
    filterChips.push({ field: 'resourceTypes', label: 'Types', value: typeNames })
  }
  
  if (activeFilterCount === 0) return null
  
  return (
    <div className="border-t border-theme-primary">
      {/* Collapsed View - Filter Chips */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center gap-2 text-sm text-theme-secondary">
            <Filter className="h-4 w-4" />
            <span>{activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} applied</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {filterChips.slice(0, isExpanded ? filterChips.length : 3).map((chip, index) => (
              <div
                key={`${chip.field}-${index}`}
                className="inline-flex items-center gap-1 px-3 py-1 bg-theme-tertiary text-theme-primary text-sm rounded-full"
              >
                <span className="text-theme-secondary">{chip.label}:</span>
                <span className="max-w-[150px] truncate">{chip.value}</span>
                <button
                  onClick={() => handleRemoveFilter(chip.field)}
                  className="ml-1 hover:text-art-accent transition-colors"
                  aria-label={`Remove ${chip.label} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            
            {!isExpanded && filterChips.length > 3 && (
              <span className="text-sm text-theme-secondary">
                +{filterChips.length - 3} more
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onClear}
            className="px-3 py-1 text-sm text-art-gray-400 hover:text-white transition-colors"
          >
            Clear all
          </button>
          
          <button
            onClick={onToggleExpand}
            className="p-1 hover:bg-art-gray-800 rounded transition-colors"
            aria-label={isExpanded ? 'Collapse filters' : 'Expand filters'}
          >
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-art-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-art-gray-400" />
            )}
          </button>
        </div>
      </div>
      
      {/* Expanded View - Editable Fields */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-art-gray-800">
              {/* Quick edit fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
                {localFilters.allWords && (
                  <div>
                    <label className="block text-xs font-medium text-theme-secondary mb-1">
                      All words
                    </label>
                    <input
                      type="text"
                      value={localFilters.allWords}
                      onChange={(e) => handleChange('allWords', e.target.value)}
                      className="w-full px-2 py-1 input-theme text-sm rounded focus:outline-none focus:ring-1 focus:ring-art-accent"
                    />
                  </div>
                )}
                
                {localFilters.keywords && (
                  <div>
                    <label className="block text-xs font-medium text-theme-secondary mb-1">
                      Keywords
                    </label>
                    <input
                      type="text"
                      value={localFilters.keywords}
                      onChange={(e) => handleChange('keywords', e.target.value)}
                      className="w-full px-2 py-1 input-theme text-sm rounded focus:outline-none focus:ring-1 focus:ring-art-accent"
                    />
                  </div>
                )}
                
                {(localFilters.dateFrom || localFilters.dateTo) && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-theme-secondary mb-1">
                        From Date
                      </label>
                      <input
                        type="date"
                        value={localFilters.dateFrom}
                        onChange={(e) => handleChange('dateFrom', e.target.value)}
                        className="w-full px-2 py-1 input-theme text-sm rounded focus:outline-none focus:ring-1 focus:ring-art-accent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-theme-secondary mb-1">
                        To Date
                      </label>
                      <input
                        type="date"
                        value={localFilters.dateTo}
                        onChange={(e) => handleChange('dateTo', e.target.value)}
                        className="w-full px-2 py-1 input-theme text-sm rounded focus:outline-none focus:ring-1 focus:ring-art-accent"
                      />
                    </div>
                  </>
                )}
                
                {localFilters.resourceTypes?.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-theme-secondary mb-1">
                      Resource Types
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {resourceTypes.map(type => (
                        <label
                          key={type.ref}
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded cursor-pointer transition-colors",
                            localFilters.resourceTypes.includes(type.ref)
                              ? "bg-art-accent text-white"
                              : "bg-theme-tertiary text-theme-secondary hover:text-theme-primary"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={localFilters.resourceTypes.includes(type.ref)}
                            onChange={() => handleResourceTypeToggle(type.ref)}
                            className="sr-only"
                          />
                          {type.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Operator */}
              <div className="flex items-center gap-4">
                <span className="text-xs text-theme-secondary">Search operator:</span>
                <div className="flex gap-2">
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="operator"
                      value="AND"
                      checked={localFilters.operator === 'AND'}
                      onChange={(e) => handleChange('operator', e.target.value)}
                      className="w-3 h-3 text-art-accent bg-theme-tertiary border-theme-secondary"
                    />
                    <span className="text-sm text-theme-primary">AND</span>
                  </label>
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="operator"
                      value="OR"
                      checked={localFilters.operator === 'OR'}
                      onChange={(e) => handleChange('operator', e.target.value)}
                      className="w-3 h-3 text-art-accent bg-theme-tertiary border-theme-secondary"
                    />
                    <span className="text-sm text-theme-primary">OR</span>
                  </label>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}