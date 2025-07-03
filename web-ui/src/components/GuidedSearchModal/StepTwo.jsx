import { useState, useEffect, useMemo } from 'react'
import { Calendar, Filter, HelpCircle, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '../../lib/utils'
import Tooltip from '../TooltipPortal'
import MetadataFieldInput from './MetadataFieldInput'

const SPECIAL_SEARCHES = [
  { 
    id: 'duplicates', 
    label: 'Find duplicates', 
    description: 'Show resources that appear to be duplicates',
    syntax: '!duplicates'
  },
  { 
    id: 'nodownloads', 
    label: 'Never downloaded', 
    description: 'Resources that have never been downloaded',
    syntax: '!nodownloads'
  },
  { 
    id: 'notused', 
    label: 'Not used', 
    description: 'Resources not used in any collections',
    syntax: '!notused'
  },
  { 
    id: 'nopreview', 
    label: 'No preview', 
    description: 'Resources without preview images',
    syntax: '!nopreview'
  }
]

const FILE_SIZE_UNITS = ['KB', 'MB', 'GB']
const DIMENSION_OPERATORS = ['exactly', 'at least', 'at most']

export default function StepTwo({ data, onChange, metadataFields, loading, compact = false }) {
  const [fieldSearch, setFieldSearch] = useState('')
  const [expandedSections, setExpandedSections] = useState({
    dates: true,
    metadata: true,
    fileAttributes: false,
    special: false
  })
  
  // Group metadata fields by category
  const groupedFields = useMemo(() => {
    const groups = {
      common: [],
      descriptive: [],
      technical: [],
      administrative: [],
      custom: []
    }
    
    const commonKeywords = ['title', 'description', 'keywords', 'tags', 'subject', 'category']
    const technicalKeywords = ['camera', 'lens', 'exposure', 'iso', 'aperture', 'model', 'make']
    const adminKeywords = ['copyright', 'license', 'rights', 'usage', 'embargo']
    
    metadataFields.forEach(field => {
      const fieldNameLower = field.name?.toLowerCase() || ''
      const titleLower = field.title?.toLowerCase() || ''
      
      if (commonKeywords.some(kw => fieldNameLower.includes(kw) || titleLower.includes(kw))) {
        groups.common.push(field)
      } else if (technicalKeywords.some(kw => fieldNameLower.includes(kw) || titleLower.includes(kw))) {
        groups.technical.push(field)
      } else if (adminKeywords.some(kw => fieldNameLower.includes(kw) || titleLower.includes(kw))) {
        groups.administrative.push(field)
      } else if (field.type === 0 || field.type === 1) {
        groups.descriptive.push(field)
      } else {
        groups.custom.push(field)
      }
    })
    
    return groups
  }, [metadataFields])
  
  // Filter fields based on search
  const filteredFields = useMemo(() => {
    if (!fieldSearch) return groupedFields
    
    const searchLower = fieldSearch.toLowerCase()
    const filtered = {}
    
    Object.entries(groupedFields).forEach(([group, fields]) => {
      filtered[group] = fields.filter(field => 
        field.name?.toLowerCase().includes(searchLower) ||
        field.title?.toLowerCase().includes(searchLower)
      )
    })
    
    return filtered
  }, [groupedFields, fieldSearch])
  
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }
  
  const handleDateChange = (field, value) => {
    onChange({
      dateRange: {
        ...data.dateRange,
        [field]: value
      }
    })
  }
  
  const handleMetadataFieldChange = (fieldId, value, operator) => {
    const newFields = { ...data.metadataFields }
    
    if (!value || (Array.isArray(value) && value.length === 0)) {
      delete newFields[fieldId]
    } else {
      newFields[fieldId] = { value, operator: operator || 'contains' }
    }
    
    onChange({ metadataFields: newFields })
  }
  
  const handleFileSizeChange = (field, value) => {
    onChange({
      fileAttributes: {
        ...data.fileAttributes,
        size: {
          ...data.fileAttributes.size,
          [field]: value
        }
      }
    })
  }
  
  const handleDimensionsChange = (field, value) => {
    onChange({
      fileAttributes: {
        ...data.fileAttributes,
        dimensions: {
          ...data.fileAttributes.dimensions,
          [field]: value
        }
      }
    })
  }
  
  const handleSpecialSearchToggle = (searchId) => {
    const current = data.specialSearches || []
    const updated = current.includes(searchId)
      ? current.filter(id => id !== searchId)
      : [...current, searchId]
    
    onChange({ specialSearches: updated })
  }
  
  return (
    <div className={cn("space-y-6", compact && "space-y-4")}>
      {/* Date Range Section */}
      <div className="bg-art-gray-800/50 rounded-lg">
        <button
          onClick={() => toggleSection('dates')}
          className="w-full p-6 flex items-center justify-between text-left hover:bg-art-gray-800/70 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-art-accent" />
            <div>
              <h3 className="text-lg font-medium text-white">Date Range</h3>
              <p className="text-sm text-art-gray-400 mt-1">Filter by when files were uploaded</p>
            </div>
          </div>
          {expandedSections.dates ? <ChevronUp className="h-5 w-5 text-art-gray-400" /> : <ChevronDown className="h-5 w-5 text-art-gray-400" />}
        </button>
        
        {expandedSections.dates && (
          <div className="px-6 pb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-art-gray-400 mb-2">
                  From date
                </label>
                <input
                  type="date"
                  value={data.dateRange?.from || ''}
                  onChange={(e) => handleDateChange('from', e.target.value)}
                  className="w-full px-3 py-2 bg-art-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-art-gray-400 mb-2">
                  To date
                </label>
                <input
                  type="date"
                  value={data.dateRange?.to || ''}
                  onChange={(e) => handleDateChange('to', e.target.value)}
                  className="w-full px-3 py-2 bg-art-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                />
              </div>
            </div>
            
            {/* Quick date presets */}
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0]
                  handleDateChange('from', today)
                  handleDateChange('to', today)
                }}
                className="px-3 py-1 bg-art-gray-700 text-art-gray-300 rounded-md hover:bg-art-gray-600 text-sm"
              >
                Today
              </button>
              <button
                onClick={() => {
                  const date = new Date()
                  date.setDate(date.getDate() - 7)
                  handleDateChange('from', date.toISOString().split('T')[0])
                  handleDateChange('to', new Date().toISOString().split('T')[0])
                }}
                className="px-3 py-1 bg-art-gray-700 text-art-gray-300 rounded-md hover:bg-art-gray-600 text-sm"
              >
                Last 7 days
              </button>
              <button
                onClick={() => {
                  const date = new Date()
                  date.setMonth(date.getMonth() - 1)
                  handleDateChange('from', date.toISOString().split('T')[0])
                  handleDateChange('to', new Date().toISOString().split('T')[0])
                }}
                className="px-3 py-1 bg-art-gray-700 text-art-gray-300 rounded-md hover:bg-art-gray-600 text-sm"
              >
                Last month
              </button>
              <button
                onClick={() => {
                  const date = new Date()
                  date.setFullYear(date.getFullYear() - 1)
                  handleDateChange('from', date.toISOString().split('T')[0])
                  handleDateChange('to', new Date().toISOString().split('T')[0])
                }}
                className="px-3 py-1 bg-art-gray-700 text-art-gray-300 rounded-md hover:bg-art-gray-600 text-sm"
              >
                Last year
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Metadata Fields Section */}
      <div className="bg-art-gray-800/50 rounded-lg">
        <button
          onClick={() => toggleSection('metadata')}
          className="w-full p-6 flex items-center justify-between text-left hover:bg-art-gray-800/70 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Filter className="h-5 w-5 text-art-accent" />
            <div>
              <h3 className="text-lg font-medium text-white">Metadata Fields</h3>
              <p className="text-sm text-art-gray-400 mt-1">Search within specific fields</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {Object.keys(data.metadataFields || {}).length > 0 && (
              <span className="px-2 py-0.5 bg-art-accent text-white text-xs rounded-full">
                {Object.keys(data.metadataFields).length}
              </span>
            )}
            {expandedSections.metadata ? <ChevronUp className="h-5 w-5 text-art-gray-400" /> : <ChevronDown className="h-5 w-5 text-art-gray-400" />}
          </div>
        </button>
        
        {expandedSections.metadata && (
          <div className="px-6 pb-6">
            {/* Field Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-art-gray-400" />
              <input
                type="text"
                value={fieldSearch}
                onChange={(e) => setFieldSearch(e.target.value)}
                placeholder="Search for fields... (e.g., title, description)"
                className="w-full pl-10 pr-4 py-2 bg-art-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent text-sm"
              />
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-art-accent"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Common Fields */}
                {filteredFields.common?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-art-gray-400 mb-3">Common Fields</h4>
                    <div className="space-y-3">
                      {filteredFields.common.map(field => (
                        <MetadataFieldInput
                          key={field.ref}
                          field={field}
                          value={data.metadataFields?.[field.ref]}
                          onChange={(value, operator) => handleMetadataFieldChange(field.ref, value, operator)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Descriptive Fields */}
                {filteredFields.descriptive?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-art-gray-400 mb-3">Descriptive Fields</h4>
                    <div className="space-y-3">
                      {filteredFields.descriptive.map(field => (
                        <MetadataFieldInput
                          key={field.ref}
                          field={field}
                          value={data.metadataFields?.[field.ref]}
                          onChange={(value, operator) => handleMetadataFieldChange(field.ref, value, operator)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Technical Fields */}
                {filteredFields.technical?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-art-gray-400 mb-3">Technical Fields</h4>
                    <div className="space-y-3">
                      {filteredFields.technical.map(field => (
                        <MetadataFieldInput
                          key={field.ref}
                          field={field}
                          value={data.metadataFields?.[field.ref]}
                          onChange={(value, operator) => handleMetadataFieldChange(field.ref, value, operator)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* File Attributes Section */}
      <div className="bg-art-gray-800/50 rounded-lg">
        <button
          onClick={() => toggleSection('fileAttributes')}
          className="w-full p-6 flex items-center justify-between text-left hover:bg-art-gray-800/70 transition-colors"
        >
          <div>
            <h3 className="text-lg font-medium text-white">File Attributes</h3>
            <p className="text-sm text-art-gray-400 mt-1">Filter by file size and dimensions</p>
          </div>
          {expandedSections.fileAttributes ? <ChevronUp className="h-5 w-5 text-art-gray-400" /> : <ChevronDown className="h-5 w-5 text-art-gray-400" />}
        </button>
        
        {expandedSections.fileAttributes && (
          <div className="px-6 pb-6 space-y-4">
            {/* File Size */}
            <div>
              <h4 className="text-sm font-medium text-art-gray-400 mb-3">File Size</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-art-gray-500 mb-1">Minimum</label>
                  <input
                    type="number"
                    value={data.fileAttributes?.size?.min || ''}
                    onChange={(e) => handleFileSizeChange('min', e.target.value)}
                    className="w-full px-3 py-2 bg-art-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-art-gray-500 mb-1">Maximum</label>
                  <input
                    type="number"
                    value={data.fileAttributes?.size?.max || ''}
                    onChange={(e) => handleFileSizeChange('max', e.target.value)}
                    className="w-full px-3 py-2 bg-art-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent text-sm"
                    placeholder="∞"
                  />
                </div>
                <div>
                  <label className="block text-xs text-art-gray-500 mb-1">Unit</label>
                  <select
                    value={data.fileAttributes?.size?.unit || 'MB'}
                    onChange={(e) => handleFileSizeChange('unit', e.target.value)}
                    className="w-full px-3 py-2 bg-art-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent text-sm"
                  >
                    {FILE_SIZE_UNITS.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            {/* Dimensions */}
            <div>
              <h4 className="text-sm font-medium text-art-gray-400 mb-3">Image Dimensions</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-art-gray-500 mb-1">Width (px)</label>
                  <input
                    type="number"
                    value={data.fileAttributes?.dimensions?.width || ''}
                    onChange={(e) => handleDimensionsChange('width', e.target.value)}
                    className="w-full px-3 py-2 bg-art-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent text-sm"
                    placeholder="Any"
                  />
                </div>
                <div>
                  <label className="block text-xs text-art-gray-500 mb-1">Height (px)</label>
                  <input
                    type="number"
                    value={data.fileAttributes?.dimensions?.height || ''}
                    onChange={(e) => handleDimensionsChange('height', e.target.value)}
                    className="w-full px-3 py-2 bg-art-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent text-sm"
                    placeholder="Any"
                  />
                </div>
                <div>
                  <label className="block text-xs text-art-gray-500 mb-1">Match</label>
                  <select
                    value={data.fileAttributes?.dimensions?.operator || 'exactly'}
                    onChange={(e) => handleDimensionsChange('operator', e.target.value)}
                    className="w-full px-3 py-2 bg-art-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent text-sm"
                  >
                    {DIMENSION_OPERATORS.map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Special Searches Section */}
      <div className="bg-art-gray-800/50 rounded-lg">
        <button
          onClick={() => toggleSection('special')}
          className="w-full p-6 flex items-center justify-between text-left hover:bg-art-gray-800/70 transition-colors"
        >
          <div>
            <h3 className="text-lg font-medium text-white">Special Searches</h3>
            <p className="text-sm text-art-gray-400 mt-1">Advanced search options</p>
          </div>
          <div className="flex items-center gap-2">
            {data.specialSearches?.length > 0 && (
              <span className="px-2 py-0.5 bg-art-accent text-white text-xs rounded-full">
                {data.specialSearches.length}
              </span>
            )}
            {expandedSections.special ? <ChevronUp className="h-5 w-5 text-art-gray-400" /> : <ChevronDown className="h-5 w-5 text-art-gray-400" />}
          </div>
        </button>
        
        {expandedSections.special && (
          <div className="px-6 pb-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {SPECIAL_SEARCHES.map(search => (
                <Tooltip key={search.id} content={`Syntax: ${search.syntax}`}>
                  <label className="flex items-start gap-3 p-3 bg-art-gray-700 rounded-lg cursor-pointer hover:bg-art-gray-600 transition-colors">
                    <input
                      type="checkbox"
                      checked={data.specialSearches?.includes(search.id) || false}
                      onChange={() => handleSpecialSearchToggle(search.id)}
                      className="w-4 h-4 mt-0.5 text-art-accent bg-art-gray-800 border-art-gray-600 rounded"
                    />
                    <div>
                      <div className="font-medium text-white">{search.label}</div>
                      <div className="text-sm text-art-gray-400">{search.description}</div>
                    </div>
                  </label>
                </Tooltip>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}