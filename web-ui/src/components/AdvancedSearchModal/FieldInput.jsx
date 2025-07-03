import { useState, useEffect, useRef } from 'react'
import { Calendar, ChevronDown, X, Search, Check } from 'lucide-react'
import { cn } from '../../lib/utils'
import resourceSpaceApi from '../../lib/resourcespace-api-backend'
import CategoryTree from './CategoryTree'
import TokenInput from './TokenInput'

export default function FieldInput({ field, value, onChange, sessionKey }) {
  const [loading, setLoading] = useState(false)
  const [options, setOptions] = useState([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  
  // Determine field type and input widget
  const getFieldWidget = () => {
    // Date fields
    if (field.type === 4 || field.type === 6 || field.type === 10) {
      return 'date'
    }
    
    // Checkbox fields
    if (field.type === 7) {
      return 'checkbox'
    }
    
    // Fixed list fields
    if (field.type === 2 || field.type === 3 || field.type === 12) {
      // Check if it's a hierarchical field
      if (field.type === 12) {
        return 'category-tree'
      }
      
      // Check if it has many options (more than 20)
      if (field.option_count > 20) {
        return 'token-autocomplete'
      }
      
      return 'dropdown'
    }
    
    // Large text fields
    if (field.type === 1 || field.type === 8) {
      return 'textarea'
    }
    
    // Default to text input
    return 'text'
  }
  
  const widget = getFieldWidget()
  
  // Load options for dropdown fields
  useEffect(() => {
    if (widget === 'dropdown' && dropdownOpen && options.length === 0) {
      loadOptions()
    }
  }, [dropdownOpen, widget])
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  const loadOptions = async () => {
    try {
      setLoading(true)
      const opts = await resourceSpaceApi.getFieldOptions(field.ref, true, sessionKey)
      setOptions(opts || [])
    } catch (err) {
      console.error('Failed to load field options:', err)
    } finally {
      setLoading(false)
    }
  }
  
  const handleTextChange = (e) => {
    onChange(e.target.value)
  }
  
  const handleDropdownSelect = (optionValue) => {
    if (field.type === 3) {
      // Multi-select
      const currentValues = value || []
      const newValues = currentValues.includes(optionValue)
        ? currentValues.filter(v => v !== optionValue)
        : [...currentValues, optionValue]
      onChange(newValues)
    } else {
      // Single select
      onChange(optionValue)
      setDropdownOpen(false)
    }
  }
  
  const handleDateChange = (e, type = 'single') => {
    if (type === 'single') {
      onChange(e.target.value)
    } else if (type === 'from') {
      onChange({ ...(value || {}), from: e.target.value })
    } else if (type === 'to') {
      onChange({ ...(value || {}), to: e.target.value })
    }
  }
  
  const handleCheckboxChange = (val) => {
    onChange(val)
  }
  
  const renderLabel = () => (
    <label className="block text-sm font-medium text-art-gray-400 mb-2">
      {field.title}
      {field.required === 1 && <span className="text-red-500 ml-1">*</span>}
      {field.help_text && (
        <span className="ml-2 text-xs text-art-gray-500" title={field.help_text}>
          <i className="fas fa-info-circle"></i>
        </span>
      )}
    </label>
  )
  
  // Render different input types
  switch (widget) {
    case 'date':
      return (
        <div>
          {renderLabel()}
          {field.type === 10 ? ( // Date range
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <input
                  type="date"
                  value={value?.from || ''}
                  onChange={(e) => handleDateChange(e, 'from')}
                  className="w-full px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent pr-8"
                  placeholder="From"
                />
                <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-art-gray-400 pointer-events-none" />
              </div>
              <div className="relative">
                <input
                  type="date"
                  value={value?.to || ''}
                  onChange={(e) => handleDateChange(e, 'to')}
                  className="w-full px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent pr-8"
                  placeholder="To"
                />
                <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-art-gray-400 pointer-events-none" />
              </div>
            </div>
          ) : (
            <div className="relative">
              <input
                type="date"
                value={value || ''}
                onChange={(e) => handleDateChange(e, 'single')}
                className="w-full px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent pr-8"
              />
              <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-art-gray-400 pointer-events-none" />
            </div>
          )}
        </div>
      )
    
    case 'checkbox':
      return (
        <div>
          {renderLabel()}
          <div className="space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name={`field-${field.ref}`}
                checked={value === ''}
                onChange={() => handleCheckboxChange('')}
                className="w-4 h-4 text-art-accent bg-art-gray-800 border-art-gray-600"
              />
              <span className="text-sm text-white">Any</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name={`field-${field.ref}`}
                checked={value === 'yes'}
                onChange={() => handleCheckboxChange('yes')}
                className="w-4 h-4 text-art-accent bg-art-gray-800 border-art-gray-600"
              />
              <span className="text-sm text-white">Yes</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name={`field-${field.ref}`}
                checked={value === 'no'}
                onChange={() => handleCheckboxChange('no')}
                className="w-4 h-4 text-art-accent bg-art-gray-800 border-art-gray-600"
              />
              <span className="text-sm text-white">No</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name={`field-${field.ref}`}
                checked={value === '!empty'}
                onChange={() => handleCheckboxChange('!empty')}
                className="w-4 h-4 text-art-accent bg-art-gray-800 border-art-gray-600"
              />
              <span className="text-sm text-white">Not empty</span>
            </label>
          </div>
        </div>
      )
    
    case 'dropdown':
      return (
        <div ref={dropdownRef}>
          {renderLabel()}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent flex items-center justify-between"
            >
              <span className="truncate">
                {field.type === 3 && Array.isArray(value) && value.length > 0
                  ? `${value.length} selected`
                  : value
                  ? options.find(opt => opt.ref === value)?.name || value
                  : 'Select...'}
              </span>
              <ChevronDown className={cn(
                "h-4 w-4 text-art-gray-400 transition-transform",
                dropdownOpen && "rotate-180"
              )} />
            </button>
            
            {dropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-art-gray-800 border border-art-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-art-accent mx-auto"></div>
                  </div>
                ) : options.length === 0 ? (
                  <div className="p-4 text-center text-sm text-art-gray-400">No options available</div>
                ) : (
                  <div className="py-1">
                    {field.type !== 3 && (
                      <button
                        type="button"
                        onClick={() => handleDropdownSelect('')}
                        className="w-full px-3 py-2 text-left text-sm text-art-gray-400 hover:bg-art-gray-700 transition-colors"
                      >
                        Clear selection
                      </button>
                    )}
                    {options.map(option => (
                      <button
                        key={option.ref}
                        type="button"
                        onClick={() => handleDropdownSelect(option.ref)}
                        className={cn(
                          "w-full px-3 py-2 text-left text-sm hover:bg-art-gray-700 transition-colors flex items-center justify-between",
                          field.type === 3 && Array.isArray(value) && value.includes(option.ref)
                            ? "text-art-accent"
                            : value === option.ref
                            ? "text-art-accent"
                            : "text-white"
                        )}
                      >
                        <span>{option.name}</span>
                        {(field.type === 3 && Array.isArray(value) && value.includes(option.ref)) ||
                         (field.type !== 3 && value === option.ref) ? (
                          <Check className="h-4 w-4" />
                        ) : null}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )
    
    case 'category-tree':
      return (
        <div>
          {renderLabel()}
          <CategoryTree
            field={field}
            value={value}
            onChange={onChange}
            sessionKey={sessionKey}
          />
        </div>
      )
    
    case 'token-autocomplete':
      return (
        <div>
          {renderLabel()}
          <TokenInput
            field={field}
            value={value}
            onChange={onChange}
            sessionKey={sessionKey}
          />
        </div>
      )
    
    case 'textarea':
      return (
        <div>
          {renderLabel()}
          <textarea
            value={value || ''}
            onChange={handleTextChange}
            rows={3}
            className="w-full px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent resize-none"
            placeholder={field.placeholder_text || ''}
          />
        </div>
      )
    
    default:
      return (
        <div>
          {renderLabel()}
          <input
            type="text"
            value={value || ''}
            onChange={handleTextChange}
            className="w-full px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
            placeholder={field.placeholder_text || ''}
          />
        </div>
      )
  }
}