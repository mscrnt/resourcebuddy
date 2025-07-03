import { useState } from 'react'
import { Eye, Save, Edit2, X, Check } from 'lucide-react'
import { cn } from '../../lib/utils'

export default function StepFour({ data, onChange, metadataFields, resourceTypes, compact = false }) {
  const [editingChip, setEditingChip] = useState(null)
  const [editValue, setEditValue] = useState('')
  
  // Build human-readable summary
  const buildSummary = () => {
    const parts = []
    
    // Keywords
    if (data.keywords) {
      switch (data.keywordLogic) {
        case 'all':
          parts.push({ 
            type: 'keywords', 
            label: 'Contains all words', 
            value: data.keywords,
            editable: true 
          })
          break
        case 'any':
          parts.push({ 
            type: 'keywords', 
            label: 'Contains any word', 
            value: data.keywords,
            editable: true 
          })
          break
        case 'phrase':
          parts.push({ 
            type: 'keywords', 
            label: 'Exact phrase', 
            value: `"${data.keywords}"`,
            editable: true 
          })
          break
        case 'exclude':
          parts.push({ 
            type: 'keywords', 
            label: 'Excludes', 
            value: data.keywords,
            editable: true,
            negative: true 
          })
          break
      }
    }
    
    // File types
    if (data.fileTypes?.length > 0) {
      parts.push({
        type: 'fileTypes',
        label: 'File type',
        value: data.fileTypes.join(', '),
        editable: false
      })
    }
    
    // Contributors
    if (data.uploadedBy === 'me') {
      parts.push({
        type: 'uploadedBy',
        label: 'Uploaded by',
        value: 'Me',
        editable: false
      })
    } else if (data.uploadedBy === 'specific' && data.contributors?.length > 0) {
      parts.push({
        type: 'contributors',
        label: 'Uploaded by',
        value: data.contributors.join(', '),
        editable: false
      })
    }
    
    // Date range
    if (data.dateRange?.from || data.dateRange?.to) {
      let dateStr = ''
      if (data.dateRange.from && data.dateRange.to) {
        dateStr = `${formatDate(data.dateRange.from)} to ${formatDate(data.dateRange.to)}`
      } else if (data.dateRange.from) {
        dateStr = `After ${formatDate(data.dateRange.from)}`
      } else {
        dateStr = `Before ${formatDate(data.dateRange.to)}`
      }
      parts.push({
        type: 'dateRange',
        label: 'Date',
        value: dateStr,
        editable: false
      })
    }
    
    // Metadata fields
    Object.entries(data.metadataFields || {}).forEach(([fieldId, fieldData]) => {
      const field = metadataFields.find(f => f.ref === parseInt(fieldId))
      if (!field) return
      
      let value = fieldData.value
      if (Array.isArray(value)) {
        value = value.join(fieldData.logic === 'and' ? ' AND ' : ' OR ')
      }
      
      parts.push({
        type: `field_${fieldId}`,
        label: field.title || field.name,
        value: value,
        operator: fieldData.operator,
        editable: true,
        negative: fieldData.operator === 'not'
      })
    })
    
    // Special searches
    if (data.specialSearches?.length > 0) {
      data.specialSearches.forEach(search => {
        const specialSearch = {
          duplicates: 'Show duplicates',
          nodownloads: 'Never downloaded',
          notused: 'Not used',
          nopreview: 'No preview'
        }[search]
        
        if (specialSearch) {
          parts.push({
            type: `special_${search}`,
            label: 'Special',
            value: specialSearch,
            editable: false,
            special: true
          })
        }
      })
    }
    
    return parts
  }
  
  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }
  
  const handleEditChip = (chip, index) => {
    setEditingChip(index)
    setEditValue(chip.value)
  }
  
  const handleSaveEdit = () => {
    if (editingChip === null) return
    
    const chip = summary[editingChip]
    
    // Update the corresponding data field
    if (chip.type === 'keywords') {
      onChange({ keywords: editValue })
    } else if (chip.type.startsWith('field_')) {
      const fieldId = chip.type.replace('field_', '')
      onChange({
        metadataFields: {
          ...data.metadataFields,
          [fieldId]: {
            ...data.metadataFields[fieldId],
            value: editValue
          }
        }
      })
    }
    
    setEditingChip(null)
    setEditValue('')
  }
  
  const handleRemoveChip = (chip) => {
    if (chip.type === 'keywords') {
      onChange({ keywords: '' })
    } else if (chip.type === 'fileTypes') {
      onChange({ fileTypes: [] })
    } else if (chip.type === 'uploadedBy') {
      onChange({ uploadedBy: 'anyone' })
    } else if (chip.type === 'contributors') {
      onChange({ contributors: [], uploadedBy: 'anyone' })
    } else if (chip.type === 'dateRange') {
      onChange({ dateRange: { from: '', to: '' } })
    } else if (chip.type.startsWith('field_')) {
      const fieldId = chip.type.replace('field_', '')
      const newFields = { ...data.metadataFields }
      delete newFields[fieldId]
      onChange({ metadataFields: newFields })
    } else if (chip.type.startsWith('special_')) {
      const searchId = chip.type.replace('special_', '')
      onChange({ 
        specialSearches: data.specialSearches.filter(s => s !== searchId) 
      })
    }
  }
  
  const summary = buildSummary()
  const hasFilters = summary.length > 0
  
  return (
    <div className={cn("space-y-6", compact && "space-y-4")}>
      {/* Search Summary */}
      <div className="bg-art-gray-800/50 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <Eye className="h-5 w-5 text-art-accent" />
              Your search in plain English
            </h3>
            <p className="text-sm text-art-gray-400 mt-1">
              Review and edit your search criteria
            </p>
          </div>
        </div>
        
        {hasFilters ? (
          <div className="space-y-3">
            <p className="text-white">
              Find resources that {data.globalOperator === 'all' ? 'match ALL' : 'match ANY'} of these criteria:
            </p>
            
            <div className="flex flex-wrap gap-2">
              {summary.map((chip, index) => (
                <div
                  key={index}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm",
                    chip.negative ? "bg-red-500/20 text-red-300 border border-red-500/30" :
                    chip.special ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" :
                    "bg-art-accent/20 text-art-accent border border-art-accent/30"
                  )}
                >
                  <span className="font-medium">{chip.label}:</span>
                  
                  {editingChip === index ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                        className="bg-transparent border-b border-current focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveEdit}
                        className="p-1 hover:bg-white/10 rounded"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingChip(null)
                          setEditValue('')
                        }}
                        className="p-1 hover:bg-white/10 rounded"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span>{chip.value}</span>
                      {chip.editable && (
                        <button
                          onClick={() => handleEditChip(chip, index)}
                          className="p-1 hover:bg-white/10 rounded"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveChip(chip)}
                        className="p-1 hover:bg-white/10 rounded"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
            
            {/* Logic indicator */}
            <div className="mt-4 p-3 bg-art-gray-900/50 rounded-lg">
              <p className="text-sm text-art-gray-400">
                Search logic: <span className="text-white font-medium">
                  {data.globalOperator === 'all' ? 'ALL filters must match' : 'ANY filter can match'}
                </span>
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-art-gray-400">No search criteria set. Add some filters in the previous steps.</p>
          </div>
        )}
      </div>
      
      {/* Save Search Option */}
      <div className="bg-art-gray-800/50 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-medium text-white flex items-center gap-2 mb-4">
              <Save className="h-5 w-5 text-art-accent" />
              Save this search for later?
            </h3>
            
            <label className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                checked={data.saveSearch || false}
                onChange={(e) => onChange({ saveSearch: e.target.checked })}
                className="w-4 h-4 text-art-accent bg-art-gray-700 border-art-gray-600 rounded"
              />
              <span className="text-white">Save this search</span>
            </label>
            
            {data.saveSearch && (
              <div>
                <label className="block text-sm font-medium text-art-gray-400 mb-2">
                  Search name
                </label>
                <input
                  type="text"
                  value={data.searchName || ''}
                  onChange={(e) => onChange({ searchName: e.target.value })}
                  placeholder="e.g., Photos from Japan 2020"
                  className="w-full px-4 py-2 bg-art-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                />
                <p className="text-xs text-art-gray-500 mt-2">
                  Give your search a memorable name so you can run it again later
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Search Preview */}
      <div className="bg-art-gray-800/50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-white mb-4">Technical search preview</h3>
        <div className="p-4 bg-art-gray-900 rounded-lg font-mono text-sm text-art-gray-300 overflow-x-auto">
          <pre className="whitespace-pre-wrap break-words">
            {buildSearchQuery(data, metadataFields)}
          </pre>
        </div>
        <p className="text-xs text-art-gray-500 mt-2">
          This is the actual search query that will be sent to ResourceSpace
        </p>
      </div>
    </div>
  )
}

// Helper function to build the search query
function buildSearchQuery(data, metadataFields) {
  let searchParts = []
  
  // Special searches must come first
  if (data.specialSearches?.length > 0) {
    data.specialSearches.forEach(search => {
      searchParts.push(`!${search}`)
    })
  }
  
  // Keywords
  if (data.keywords) {
    switch (data.keywordLogic) {
      case 'all':
        // ResourceSpace behavior:
        // - Single word: no prefix needed (implicit AND)
        // - Multiple words: each needs + prefix for AND
        const words = data.keywords.trim().split(/\s+/).filter(w => w)
        if (words.length === 1) {
          searchParts.push(words[0])
        } else if (words.length > 1) {
          searchParts.push(words.map(w => `+${w}`).join(' '))
        }
        break
      case 'any':
        searchParts.push(data.keywords)
        break
      case 'phrase':
        searchParts.push(`"${data.keywords}"`)
        break
      case 'exclude':
        searchParts.push(data.keywords.split(' ').map(w => `-${w}`).join(' '))
        break
    }
  }
  
  // File types
  if (data.fileTypes?.length > 0) {
    searchParts.push(`extension:${data.fileTypes.join(';')}`)
  }
  
  // Contributors
  if (data.uploadedBy === 'me') {
    searchParts.push('contributedby:me')
  } else if (data.uploadedBy === 'specific' && data.contributors?.length > 0) {
    searchParts.push(`contributedby:${data.contributors.join(';')}`)
  }
  
  // Date range
  if (data.dateRange?.from || data.dateRange?.to) {
    if (data.dateRange.from && data.dateRange.to) {
      searchParts.push(`createdate:rangestart${data.dateRange.from}end${data.dateRange.to}`)
    } else if (data.dateRange.from) {
      searchParts.push(`createdate:rangestart${data.dateRange.from}`)
    } else if (data.dateRange.to) {
      searchParts.push(`createdate:rangeend${data.dateRange.to}`)
    }
  }
  
  // Metadata fields
  Object.entries(data.metadataFields || {}).forEach(([fieldId, fieldData]) => {
    const field = metadataFields.find(f => f.ref === parseInt(fieldId))
    if (!field || !fieldData) return
    
    const fieldShortname = field.name || `field${fieldId}`
    
    if (fieldData.operator === 'empty') {
      searchParts.push(`!empty${fieldId}`)
    } else if (fieldData.operator === 'notempty') {
      searchParts.push(`!hasdata${fieldId}`)
    } else if (fieldData.value) {
      if (Array.isArray(fieldData.value)) {
        const values = fieldData.value.filter(v => v).join(';')
        if (values) {
          if (fieldData.operator === 'not') {
            fieldData.value.forEach(val => {
              if (val) searchParts.push(`-${fieldShortname}:"${val}"`)
            })
          } else {
            searchParts.push(`${fieldShortname}:${values}`)
          }
        }
      } else {
        if (fieldData.operator === 'not') {
          searchParts.push(`-${fieldShortname}:"${fieldData.value}"`)
        } else {
          searchParts.push(`${fieldShortname}:"${fieldData.value}"`)
        }
      }
    }
  })
  
  // File size
  if (data.fileAttributes?.size?.min || data.fileAttributes?.size?.max) {
    const { min, max, unit } = data.fileAttributes.size
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
  if (data.fileAttributes?.dimensions?.width || data.fileAttributes?.dimensions?.height) {
    const { width, height, operator } = data.fileAttributes.dimensions
    
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