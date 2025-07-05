import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { cn } from '../lib/utils'

export default function SearchBar({ className }) {
  const [query, setQuery] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const navigate = useNavigate()
  const blurTimeoutRef = useRef(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`)
      setQuery('')
      setIsExpanded(false)
    }
  }

  const handleClear = () => {
    setQuery('')
  }

  const handleBlur = () => {
    // Delay the blur to allow clicks on other elements to register
    blurTimeoutRef.current = setTimeout(() => {
      if (!query) {
        setIsExpanded(false)
      }
    }, 200)
  }

  const handleFocus = () => {
    // Clear any pending blur timeout
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
    }
    setIsExpanded(true)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current)
      }
    }
  }, [])

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'relative transition-all duration-300 overflow-hidden',
        isExpanded ? 'w-64 md:w-96' : 'w-10',
        className
      )}
    >
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Search resources..."
          tabIndex={isExpanded ? 0 : -1}
          className={cn(
            'w-full rounded-full input-theme py-2 pl-10 pr-10 text-sm',
            'border focus:border-art-accent focus:outline-none focus:ring-1 focus:ring-art-accent',
            'transition-all duration-300',
            !isExpanded && 'opacity-0 pointer-events-none'
          )}
        />
        
        <button
          type="button"
          onClick={() => isExpanded ? handleSubmit({ preventDefault: () => {} }) : setIsExpanded(true)}
          className="absolute left-0 top-0 rounded-full p-2 btn-theme-ghost focus:outline-none focus:ring-2 focus:ring-art-accent focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-200"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-0 top-0 rounded-full p-2 btn-theme-ghost focus:outline-none focus:ring-2 focus:ring-art-accent focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-200"
            aria-label="Clear search"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    </form>
  )
}