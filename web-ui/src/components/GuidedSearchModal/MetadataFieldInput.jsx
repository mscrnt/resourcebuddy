import { useState, useEffect } from 'react'
import { Plus, X, HelpCircle } from 'lucide-react'
import { cn } from '../../lib/utils'
import Tooltip from '../TooltipPortal'
import useAuthStore from '../../stores/useAuthStore'
import resourceSpaceApi from '../../lib/resourcespace-api-backend'

const OPERATORS = {
  text: [
    { value: 'contains', label: 'Contains', description: 'Field contains this text' },
    { value: 'exact', label: 'Exactly matches', description: 'Field is exactly this text' },
    { value: 'starts', label: 'Starts with', description: 'Field begins with this text' },
    { value: 'ends', label: 'Ends with', description: 'Field ends with this text' },
    { value: 'not', label: 'Does not contain', description: 'Field does not have this text' },
    { value: 'empty', label: 'Is empty', description: 'Field has no value' },
    { value: 'notempty', label: 'Is not empty', description: 'Field has any value' }
  ],
  list: [
    { value: 'any', label: 'Any of these', description: 'Matches if any value is selected' },
    { value: 'all', label: 'All of these', description: 'Must match all selected values' },
    { value: 'not', label: 'None of these', description: 'Must not match any selected value' }
  ],
  date: [
    { value: 'exact', label: 'On this date', description: 'Exactly this date' },
    { value: 'before', label: 'Before', description: 'Before this date' },
    { value: 'after', label: 'After', description: 'After this date' },
    { value: 'between', label: 'Between', description: 'Between two dates' }
  ]
}

export default function MetadataFieldInput({ field, value, onChange }) {
  const { sessionKey } = useAuthStore()
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  
  // Multi-value support
  const [values, setValues] = useState(value?.value ? (Array.isArray(value.value) ? value.value : [value.value]) : [])
  const [operator, setOperator] = useState(value?.operator || 'contains')
  const [logicOperator, setLogicOperator] = useState(value?.logic || 'or') // or, and, not
  
  // Determine field type and available operators
  const fieldType = getFieldType(field)
  const availableOperators = OPERATORS[fieldType] || OPERATORS.text
  
  useEffect(() => {
    if ((field.type === 2 || field.type === 3 || field.type === 7 || field.type === 12) && !options.length) {
      loadFieldOptions()
    }
  }, [field])
  
  useEffect(() => {
    // Update parent when values or operators change
    if (values.length > 0 || operator === 'empty' || operator === 'notempty') {
      onChange({
        value: values.length === 1 ? values[0] : values,
        operator,
        logic: values.length > 1 ? logicOperator : undefined
      })
    } else {
      onChange(null)
    }
  }, [values, operator, logicOperator])
  
  function getFieldType(field) {
    if (field.type === 4 || field.type === 6 || field.type === 10) return 'date'
    if (field.type === 2 || field.type === 3 || field.type === 7 || field.type === 12) return 'list'
    return 'text'
  }
  
  const loadFieldOptions = async () => {
    try {
      setLoading(true)
      const fieldOptions = await resourceSpaceApi.getFieldOptions(field.ref, sessionKey)
      setOptions(fieldOptions || [])
    } catch (err) {
      console.error('Failed to load field options:', err)
    } finally {
      setLoading(false)
    }
  }
  
  const handleAddValue = (newValue) => {
    if (newValue && !values.includes(newValue)) {
      setValues([...values, newValue])
      setSearchTerm('')
      setShowDropdown(false)
    }
  }
  
  const handleRemoveValue = (index) => {
    setValues(values.filter((_, i) => i !== index))
  }
  
  const filteredOptions = options.filter(opt => 
    opt.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  const renderInput = () => {
    // Special operators that don't need input
    if (operator === 'empty' || operator === 'notempty') {
      return null
    }
    
    switch (fieldType) {
      case 'date':
        return (
          <div className="flex gap-2">
            <input
              type="date"
              value={values[0] || ''}
              onChange={(e) => setValues([e.target.value])}
              className="flex-1 px-3 py-2 bg-art-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent text-sm"
            />
            {operator === 'between' && (
              <input
                type="date"
                value={values[1] || ''}
                onChange={(e) => setValues([values[0] || '', e.target.value])}
                className="flex-1 px-3 py-2 bg-art-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent text-sm"
                placeholder="End date"
              />
            )}
          </div>
        )
        
      case 'list':
        return (
          <div className="space-y-2">
            {/* Selected values */}
            {values.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {values.map((val, index) => {
                  const option = options.find(opt => opt.ref === val || opt.name === val)
                  return (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-art-accent/20 text-art-accent text-sm rounded-full"
                    >
                      {option?.name || val}
                      <button
                        onClick={() => handleRemoveValue(index)}
                        className="hover:text-red-400 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )
                })}
                {values.length > 1 && (
                  <select
                    value={logicOperator}
                    onChange={(e) => setLogicOperator(e.target.value)}
                    className="px-2 py-1 bg-art-gray-700 text-white text-sm rounded-lg"
                  >
                    <option value="or">OR</option>
                    <option value="and">AND</option>
                  </select>
                )}
              </div>
            )}
            
            {/* Option selector */}
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setShowDropdown(true)
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search options..."
                className="w-full px-3 py-2 bg-art-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent text-sm"
              />
              
              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-art-gray-800 rounded-lg shadow-lg z-10">
                  {loading ? (
                    <div className="p-4 text-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-art-accent mx-auto"></div>
                    </div>
                  ) : filteredOptions.length > 0 ? (
                    filteredOptions.map(option => (
                      <button
                        key={option.ref}
                        onClick={() => handleAddValue(option.ref)}
                        className="w-full px-3 py-2 text-left text-white hover:bg-art-gray-700 transition-colors text-sm"
                      >
                        {option.name}
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-art-gray-400 text-sm">No options found</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )
        
      default: // text
        return (
          <div className="space-y-2">
            {/* Text values */}
            {values.map((val, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={val}
                  onChange={(e) => {
                    const newValues = [...values]
                    newValues[index] = e.target.value
                    setValues(newValues)
                  }}
                  placeholder="Enter text..."
                  className="flex-1 px-3 py-2 bg-art-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent text-sm"
                />
                {values.length > 1 && (
                  <>
                    {index === 0 && (
                      <select
                        value={logicOperator}
                        onChange={(e) => setLogicOperator(e.target.value)}
                        className="px-2 py-1 bg-art-gray-700 text-white text-sm rounded-lg"
                      >
                        <option value="or">OR</option>
                        <option value="and">AND</option>
                      </select>
                    )}
                    <button
                      onClick={() => handleRemoveValue(index)}
                      className="p-2 text-red-400 hover:text-red-300 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            ))}
            
            {/* Add another value button */}
            {operator !== 'exact' && (
              <button
                onClick={() => setValues([...values, ''])}
                className="flex items-center gap-2 px-3 py-1 text-sm text-art-gray-400 hover:text-white transition-colors"
              >
                <Plus className="h-3 w-3" />
                Add another value
              </button>
            )}
          </div>
        )
    }
  }
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-white flex items-center gap-2">
          {field.title || field.name}
          <Tooltip content={`Field type: ${field.type} | Search in this specific field`}>
            <HelpCircle className="h-3 w-3 text-art-gray-400" />
          </Tooltip>
        </label>
        <select
          value={operator}
          onChange={(e) => setOperator(e.target.value)}
          className="px-2 py-1 bg-art-gray-700 text-white text-xs rounded-lg"
        >
          {availableOperators.map(op => (
            <option key={op.value} value={op.value}>{op.label}</option>
          ))}
        </select>
      </div>
      
      {renderInput()}
      
      {/* Show example syntax */}
      {values.length > 0 && operator !== 'empty' && operator !== 'notempty' && (
        <div className="text-xs text-art-gray-500 italic">
          {values.length > 1 ? (
            <span>
              Syntax: {field.name}:{values.join(';')}
            </span>
          ) : (
            <span>
              Syntax: {operator === 'not' ? '-' : ''}{field.name}:"{values[0]}"
            </span>
          )}
        </div>
      )}
    </div>
  )
}