import { useState, useEffect } from 'react'
import { ChevronDown, ArrowUpDown, Calendar, Star, Hash, Clock, FileType, TrendingUp, Type, MapPin } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const sortOptions = [
  { value: 'relevance', label: 'Relevance', icon: Star, desc: 'Most relevant first' },
  { value: 'date', label: 'Date', icon: Calendar, desc: 'By date field' },
  { value: 'modified', label: 'Modified', icon: Clock, desc: 'Recently modified first' },
  { value: 'resourceid', label: 'Resource ID', icon: Hash, desc: 'By resource number' },
  { value: 'popularity', label: 'Popularity', icon: TrendingUp, desc: 'Most popular first' },
  { value: 'rating', label: 'Rating', icon: Star, desc: 'Highest rated first' },
  { value: 'title', label: 'Title', icon: Type, desc: 'Alphabetical by title' },
  { value: 'resourcetype', label: 'Resource Type', icon: FileType, desc: 'Group by type' },
  { value: 'status', label: 'Archive Status', icon: ArrowUpDown, desc: 'By archive state' },
  { value: 'country', label: 'Country', icon: MapPin, desc: 'By country field' },
]

export default function SortDropdown({ value, sort, onChange, onSortChange }) {
  const [isOpen, setIsOpen] = useState(false)
  
  const currentOption = sortOptions.find(opt => opt.value === value) || sortOptions[0]
  const Icon = currentOption.icon
  
  // Default sorts for each option (based on ResourceSpace behavior)
  const defaultSorts = {
    relevance: 'DESC',
    date: 'DESC',
    modified: 'DESC',
    resourceid: 'DESC',
    popularity: 'DESC',
    rating: 'DESC',
    title: 'ASC',
    resourcetype: 'ASC',
    status: 'ASC',
    country: 'ASC',
  }
  
  // When order_by changes, update sort to the default for that option
  useEffect(() => {
    const defaultSort = defaultSorts[value] || 'DESC'
    if (sort !== defaultSort) {
      onSortChange(defaultSort)
    }
  }, [value])
  
  const handleSelect = (option) => {
    onChange(option.value)
    setIsOpen(false)
  }
  
  const toggleSort = (e) => {
    e.stopPropagation()
    onSortChange(sort === 'ASC' ? 'DESC' : 'ASC')
  }
  
  return (
    <div className="relative flex items-center space-x-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-art-gray-800 hover:bg-art-gray-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-art-accent"
      >
        <Icon className="h-4 w-4 text-art-gray-400" />
        <span className="text-sm">{currentOption.label}</span>
        <ChevronDown className={`h-4 w-4 text-art-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <button
        onClick={toggleSort}
        className="p-2 bg-art-gray-800 hover:bg-art-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-art-accent"
        title={`Sort ${sort === 'ASC' ? 'ascending' : 'descending'}`}
      >
        <ArrowUpDown className={`h-4 w-4 text-white transition-transform ${sort === 'DESC' ? 'rotate-180' : ''}`} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 mt-2 w-64 bg-art-darker rounded-lg shadow-xl border border-art-gray-800 z-50 overflow-hidden"
            >
              <div className="py-2">
                {sortOptions.map((option) => {
                  const OptionIcon = option.icon
                  const isSelected = option.value === value
                  
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleSelect(option)}
                      className={`w-full px-4 py-3 flex items-start hover:bg-art-gray-800 transition-colors ${
                        isSelected ? 'bg-art-accent/20 text-art-accent' : 'text-white'
                      }`}
                    >
                      <OptionIcon className={`h-5 w-5 mt-0.5 mr-3 flex-shrink-0 ${
                        isSelected ? 'text-art-accent' : 'text-art-gray-500'
                      }`} />
                      <div className="text-left">
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-art-gray-500 mt-0.5">{option.desc}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}