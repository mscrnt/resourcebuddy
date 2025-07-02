import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { cn } from '../lib/utils'

export default function SearchBar({ className }) {
  const [query, setQuery] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const navigate = useNavigate()

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

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'relative transition-all duration-300',
        isExpanded ? 'w-64 md:w-96' : 'w-10',
        className
      )}
    >
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsExpanded(true)}
          onBlur={() => !query && setIsExpanded(false)}
          placeholder="Search resources..."
          className={cn(
            'w-full rounded-full bg-art-gray-800 py-2 pl-10 pr-10 text-sm text-white placeholder-art-gray-500',
            'border border-art-gray-700 focus:border-art-accent focus:outline-none focus:ring-1 focus:ring-art-accent',
            'transition-all duration-300',
            !isExpanded && 'opacity-0 cursor-pointer'
          )}
        />
        
        <button
          type="button"
          onClick={() => isExpanded ? handleSubmit({ preventDefault: () => {} }) : setIsExpanded(true)}
          className="absolute left-0 top-0 rounded-full p-2 text-art-gray-400 hover:text-white transition-colors"
        >
          <Search className="h-5 w-5" />
        </button>

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-0 top-0 rounded-full p-2 text-art-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    </form>
  )
}