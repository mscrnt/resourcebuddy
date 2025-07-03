import { useState, useEffect, useRef } from 'react'
import { X, Search } from 'lucide-react'
import { cn } from '../../lib/utils'
import resourceSpaceApi from '../../lib/resourcespace-api-backend'

export default function TokenInput({ field, value = [], onChange, sessionKey }) {
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)
  const searchTimeoutRef = useRef(null)
  
  // Ensure value is always an array
  const tokens = Array.isArray(value) ? value : []
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  useEffect(() => {
    // Clear timeout on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])
  
  const searchNodes = async (query) => {
    if (!query.trim()) {
      setSuggestions([])
      return
    }
    
    try {
      setLoading(true)
      const nodes = await resourceSpaceApi.getNodes(
        field.ref,
        null, // parent
        false, // recursive
        0, // offset
        50, // limit
        query,
        sessionKey
      )
      
      // Filter out already selected tokens
      const filtered = (nodes || []).filter(node => 
        !tokens.some(token => token.ref === node.ref)
      )
      
      setSuggestions(filtered)
      setShowDropdown(filtered.length > 0)
      setSelectedIndex(-1)
    } catch (err) {
      console.error('Failed to search nodes:', err)
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }
  
  const handleInputChange = (e) => {
    const query = e.target.value
    setInputValue(query)
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      searchNodes(query)
    }, 300)
  }
  
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => prev > -1 ? prev - 1 : -1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        addToken(suggestions[selectedIndex])
      } else if (inputValue.trim() && field.type !== 3) {
        // Allow free text entry for non-fixed list fields
        addToken({ ref: inputValue, name: inputValue })
      }
    } else if (e.key === 'Backspace' && !inputValue && tokens.length > 0) {
      // Remove last token
      removeToken(tokens.length - 1)
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
      setSelectedIndex(-1)
    }
  }
  
  const addToken = (node) => {
    const newTokens = [...tokens, node]
    onChange(newTokens)
    setInputValue('')
    setSuggestions([])
    setShowDropdown(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }
  
  const removeToken = (index) => {
    const newTokens = tokens.filter((_, i) => i !== index)
    onChange(newTokens)
  }
  
  const handleSuggestionClick = (suggestion) => {
    addToken(suggestion)
  }
  
  return (
    <div className="relative">
      <div className="bg-art-gray-800 rounded-lg border border-art-gray-700 focus-within:ring-2 focus-within:ring-art-accent p-2">
        <div className="flex flex-wrap gap-2 items-center">
          {tokens.map((token, index) => (
            <div
              key={token.ref || index}
              className="inline-flex items-center gap-1 px-3 py-1 bg-art-accent/20 text-art-accent rounded-full text-sm"
            >
              <span>{token.name}</span>
              <button
                type="button"
                onClick={() => removeToken(index)}
                className="hover:text-white transition-colors"
                aria-label={`Remove ${token.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => inputValue && searchNodes(inputValue)}
            placeholder={tokens.length === 0 ? "Type to search..." : ""}
            className="flex-1 min-w-[150px] bg-transparent text-white placeholder-art-gray-500 focus:outline-none"
          />
        </div>
      </div>
      
      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-art-gray-800 border border-art-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {loading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-art-accent mx-auto"></div>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="p-4 text-center text-sm text-art-gray-400">
              {inputValue ? "No matching results" : "Type to search"}
            </div>
          ) : (
            <div className="py-1">
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.ref}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-art-gray-700 transition-colors",
                    selectedIndex === index && "bg-art-gray-700 text-art-accent"
                  )}
                >
                  {suggestion.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}