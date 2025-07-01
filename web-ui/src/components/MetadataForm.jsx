import { useState, useEffect } from 'react'
import { Calendar, Lock, Unlock, Tag, FileText, List, Hash, ToggleLeft, ToggleRight } from 'lucide-react'
import { useApi } from '../contexts/ApiContext'
import { motion } from 'framer-motion'
import NodeSelector from './NodeSelector'

export default function MetadataForm({ 
  resourceType, 
  fileCount, 
  onMetadataChange,
  initialMetadata = {}
}) {
  const api = useApi()
  const [fields, setFields] = useState([])
  const [metadata, setMetadata] = useState(initialMetadata)
  const [lockedFields, setLockedFields] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [fieldOptions, setFieldOptions] = useState({})
  
  // Field type constants from ResourceSpace
  const FIELD_TYPES = {
    TEXT_BOX_SINGLE_LINE: 0,
    TEXT_BOX_MULTI_LINE: 1,
    CHECK_BOX_LIST: 2,
    DROP_DOWN_LIST: 3,
    DATE: 4,
    DATE_AND_OPTIONAL_TIME: 6,
    DATE_AND_TIME: 10,
    DATE_RANGE: 8,
    EXPIRY_DATE: 5,
    CATEGORY_TREE: 7,
    DYNAMIC_KEYWORDS_LIST: 9,
    RADIO_BUTTONS: 12,
    WARNING_MESSAGE: 13
  }
  
  // Fixed list field types that use nodes
  const FIXED_LIST_FIELD_TYPES = [
    FIELD_TYPES.CHECK_BOX_LIST,
    FIELD_TYPES.DROP_DOWN_LIST,
    FIELD_TYPES.CATEGORY_TREE,
    FIELD_TYPES.DYNAMIC_KEYWORDS_LIST,
    FIELD_TYPES.RADIO_BUTTONS
  ]
  
  // Load metadata fields for the resource type
  useEffect(() => {
    loadFields()
  }, [resourceType])
  
  // Auto-populate certain fields
  useEffect(() => {
    if (fields.length > 0) {
      const autoPopulated = {}
      
      fields.forEach(field => {
        // Auto-populate date fields with current date
        if ([FIELD_TYPES.DATE, FIELD_TYPES.DATE_AND_TIME, FIELD_TYPES.DATE_AND_OPTIONAL_TIME].includes(field.type)) {
          if (field.name === 'date' || field.name === 'creation_date' || field.name === 'date_uploaded') {
            autoPopulated[field.ref] = new Date().toISOString().split('T')[0]
            setLockedFields(prev => new Set([...prev, field.ref]))
          }
        }
      })
      
      setMetadata(prev => ({ ...prev, ...autoPopulated }))
    }
  }, [fields])
  
  // Notify parent of metadata changes
  useEffect(() => {
    onMetadataChange(metadata, lockedFields)
  }, [metadata, lockedFields, onMetadataChange])
  
  const loadFields = async () => {
    setLoading(true)
    try {
      // Get all fields for this resource type
      const allFields = await api.getResourceTypeFields(resourceType)
      
      // Filter to only editable fields
      const editableFields = allFields.filter(field => 
        field.active && 
        !field.read_only && 
        !field.hide_when_uploading &&
        field.type !== FIELD_TYPES.WARNING_MESSAGE
      )
      
      setFields(editableFields)
      
      // Load options for fixed list fields
      const optionsToLoad = editableFields.filter(field => 
        FIXED_LIST_FIELD_TYPES.includes(field.type)
      )
      
      const optionsPromises = optionsToLoad.map(async field => {
        try {
          const options = await api.getFieldOptions(field.ref, true)
          return { fieldId: field.ref, options }
        } catch (error) {
          console.error(`Failed to load options for field ${field.ref}:`, error)
          return { fieldId: field.ref, options: [] }
        }
      })
      
      const loadedOptions = await Promise.all(optionsPromises)
      const optionsMap = {}
      loadedOptions.forEach(({ fieldId, options }) => {
        optionsMap[fieldId] = options
      })
      
      setFieldOptions(optionsMap)
    } catch (error) {
      console.error('Failed to load fields:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleFieldChange = (fieldId, value) => {
    setMetadata(prev => ({
      ...prev,
      [fieldId]: value
    }))
  }
  
  const toggleFieldLock = (fieldId) => {
    setLockedFields(prev => {
      const newSet = new Set(prev)
      if (newSet.has(fieldId)) {
        newSet.delete(fieldId)
      } else {
        newSet.add(fieldId)
      }
      return newSet
    })
  }
  
  const renderFieldInput = (field) => {
    const value = metadata[field.ref] || ''
    const isLocked = lockedFields.has(field.ref)
    
    switch (field.type) {
      case FIELD_TYPES.TEXT_BOX_SINGLE_LINE:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.ref, e.target.value)}
            className="w-full px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
            placeholder={field.help_text || `Enter ${field.title.toLowerCase()}`}
          />
        )
        
      case FIELD_TYPES.TEXT_BOX_MULTI_LINE:
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(field.ref, e.target.value)}
            className="w-full px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent resize-y"
            rows={3}
            placeholder={field.help_text || `Enter ${field.title.toLowerCase()}`}
          />
        )
        
      case FIELD_TYPES.DATE:
      case FIELD_TYPES.DATE_AND_OPTIONAL_TIME:
      case FIELD_TYPES.DATE_AND_TIME:
        return (
          <input
            type={field.type === FIELD_TYPES.DATE ? "date" : "datetime-local"}
            value={value}
            onChange={(e) => handleFieldChange(field.ref, e.target.value)}
            className="w-full px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
          />
        )
        
      case FIELD_TYPES.CHECK_BOX_LIST:
        return (
          <NodeSelector
            field={field}
            options={fieldOptions[field.ref] || []}
            value={value}
            onChange={(newValue) => handleFieldChange(field.ref, newValue)}
            multiple={true}
          />
        )
        
      case FIELD_TYPES.DROP_DOWN_LIST:
      case FIELD_TYPES.RADIO_BUTTONS:
        return (
          <NodeSelector
            field={field}
            options={fieldOptions[field.ref] || []}
            value={value}
            onChange={(newValue) => handleFieldChange(field.ref, newValue)}
            multiple={false}
          />
        )
        
      case FIELD_TYPES.CATEGORY_TREE:
        return (
          <NodeSelector
            field={field}
            options={fieldOptions[field.ref] || []}
            value={value}
            onChange={(newValue) => handleFieldChange(field.ref, newValue)}
            multiple={field.type === FIELD_TYPES.CHECK_BOX_LIST}
            isTree={true}
          />
        )
        
      case FIELD_TYPES.DYNAMIC_KEYWORDS_LIST:
        return (
          <DynamicKeywordInput
            value={value}
            onChange={(newValue) => handleFieldChange(field.ref, newValue)}
            placeholder={field.help_text || "Add keywords..."}
          />
        )
        
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.ref, e.target.value)}
            className="w-full px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
            placeholder={`Unsupported field type: ${field.type}`}
          />
        )
    }
  }
  
  const getFieldIcon = (field) => {
    switch (field.type) {
      case FIELD_TYPES.DATE:
      case FIELD_TYPES.DATE_AND_TIME:
      case FIELD_TYPES.DATE_AND_OPTIONAL_TIME:
        return <Calendar className="h-4 w-4" />
      case FIELD_TYPES.CHECK_BOX_LIST:
      case FIELD_TYPES.DROP_DOWN_LIST:
        return <List className="h-4 w-4" />
      case FIELD_TYPES.DYNAMIC_KEYWORDS_LIST:
        return <Tag className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">
          Metadata for {fileCount} {fileCount === 1 ? 'file' : 'files'}
        </h3>
        {fileCount > 1 && (
          <p className="text-sm text-art-gray-400">
            Locked fields will apply to all files
          </p>
        )}
      </div>
      
      {/* Fields */}
      <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar pr-2">
        {fields.map((field, index) => {
          const isLocked = lockedFields.has(field.ref)
          const isRequired = field.required
          
          return (
            <motion.div
              key={field.ref}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="space-y-2"
            >
              {/* Field label and lock toggle */}
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 text-sm font-medium text-art-gray-300">
                  {getFieldIcon(field)}
                  <span>
                    {field.title}
                    {isRequired && <span className="text-red-400 ml-1">*</span>}
                  </span>
                </label>
                
                {fileCount > 1 && (
                  <button
                    type="button"
                    onClick={() => toggleFieldLock(field.ref)}
                    className={`p-1 rounded transition-colors ${
                      isLocked 
                        ? 'text-art-accent hover:text-art-accent-dark' 
                        : 'text-art-gray-500 hover:text-art-gray-400'
                    }`}
                    title={isLocked ? 'Unlock field' : 'Lock field for all files'}
                  >
                    {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                  </button>
                )}
              </div>
              
              {/* Field input */}
              <div className={`relative ${fileCount > 1 && isLocked ? 'ring-2 ring-art-accent/50 rounded-lg' : ''}`}>
                {renderFieldInput(field)}
              </div>
              
              {/* Help text */}
              {field.help_text && (
                <p className="text-xs text-art-gray-500">{field.help_text}</p>
              )}
            </motion.div>
          )
        })}
        
        {fields.length === 0 && (
          <p className="text-center text-art-gray-500 py-8">
            No editable metadata fields available for this resource type.
          </p>
        )}
      </div>
    </div>
  )
}

// Dynamic keyword input component
function DynamicKeywordInput({ value, onChange, placeholder }) {
  const [inputValue, setInputValue] = useState('')
  const keywords = value ? value.split(',').map(k => k.trim()).filter(k => k) : []
  
  const handleAddKeyword = (keyword) => {
    if (keyword && !keywords.includes(keyword)) {
      const newKeywords = [...keywords, keyword]
      onChange(newKeywords.join(', '))
      setInputValue('')
    }
  }
  
  const handleRemoveKeyword = (keyword) => {
    const newKeywords = keywords.filter(k => k !== keyword)
    onChange(newKeywords.join(', '))
  }
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      handleAddKeyword(inputValue.trim())
    }
  }
  
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {keywords.map((keyword, index) => (
          <span
            key={index}
            className="inline-flex items-center px-2 py-1 bg-art-accent/20 text-art-accent rounded-full text-sm"
          >
            {keyword}
            <button
              type="button"
              onClick={() => handleRemoveKeyword(keyword)}
              className="ml-1 hover:text-art-accent-dark"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => handleAddKeyword(inputValue.trim())}
        className="w-full px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
        placeholder={placeholder}
      />
    </div>
  )
}