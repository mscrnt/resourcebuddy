import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Check, Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function NodeSelector({ 
  field, 
  options, 
  value, 
  onChange, 
  multiple = false,
  isTree = false 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedNodes, setExpandedNodes] = useState(new Set())
  
  // Parse current value - can be comma-separated node IDs
  const selectedNodes = value ? 
    (typeof value === 'string' ? value.split(',').map(v => v.trim()) : [value]) : 
    []
  
  // Build tree structure if needed
  const buildTree = (nodes, parentId = null) => {
    return nodes
      .filter(node => node.parent === parentId)
      .map(node => ({
        ...node,
        children: buildTree(nodes, node.ref)
      }))
  }
  
  const treeOptions = isTree ? buildTree(options) : options
  
  // Filter options based on search
  const filterOptions = (opts, query) => {
    if (!query) return opts
    
    const lowerQuery = query.toLowerCase()
    
    if (isTree) {
      // For tree structures, include parent if any child matches
      return opts.filter(opt => {
        const matches = opt.name.toLowerCase().includes(lowerQuery)
        const childMatches = opt.children && opt.children.some(child => 
          filterOptions([child], query).length > 0
        )
        return matches || childMatches
      }).map(opt => ({
        ...opt,
        children: opt.children ? filterOptions(opt.children, query) : []
      }))
    }
    
    return opts.filter(opt => opt.name.toLowerCase().includes(lowerQuery))
  }
  
  const filteredOptions = filterOptions(treeOptions, searchQuery)
  
  // Get display text for selected values
  const getDisplayText = () => {
    if (selectedNodes.length === 0) {
      return field.help_text || `Select ${field.title.toLowerCase()}`
    }
    
    const selectedNames = selectedNodes
      .map(nodeId => {
        const node = options.find(opt => opt.ref.toString() === nodeId.toString())
        return node ? node.name : nodeId
      })
      .filter(name => name)
    
    if (selectedNames.length === 0) {
      return field.help_text || `Select ${field.title.toLowerCase()}`
    }
    
    if (selectedNames.length === 1) {
      return selectedNames[0]
    }
    
    return `${selectedNames.length} selected`
  }
  
  const handleSelect = (nodeId) => {
    const nodeIdStr = nodeId.toString()
    
    if (multiple) {
      const newSelection = selectedNodes.includes(nodeIdStr)
        ? selectedNodes.filter(id => id !== nodeIdStr)
        : [...selectedNodes, nodeIdStr]
      
      onChange(newSelection.join(','))
    } else {
      onChange(nodeIdStr)
      setIsOpen(false)
    }
  }
  
  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }
  
  const renderOption = (option, level = 0) => {
    const isSelected = selectedNodes.includes(option.ref.toString())
    const hasChildren = option.children && option.children.length > 0
    const isExpanded = expandedNodes.has(option.ref)
    
    return (
      <div key={option.ref}>
        <button
          type="button"
          onClick={() => handleSelect(option.ref)}
          className={`w-full text-left px-3 py-2 hover:bg-art-gray-700 transition-colors flex items-center ${
            isSelected ? 'bg-art-accent/20 text-art-accent' : 'text-white'
          }`}
          style={{ paddingLeft: `${(level * 20) + 12}px` }}
        >
          {/* Tree expand/collapse button */}
          {hasChildren && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                toggleNode(option.ref)
              }}
              className="mr-2 p-0.5 hover:bg-white/10 rounded"
            >
              {isExpanded ? 
                <ChevronDown className="h-3 w-3" /> : 
                <ChevronRight className="h-3 w-3" />
              }
            </button>
          )}
          
          {/* Checkbox for multiple selection */}
          {multiple && (
            <div className={`w-4 h-4 mr-2 border rounded ${
              isSelected ? 'bg-art-accent border-art-accent' : 'border-art-gray-600'
            } flex items-center justify-center flex-shrink-0`}>
              {isSelected && <Check className="h-3 w-3 text-white" />}
            </div>
          )}
          
          {/* Option name */}
          <span className="flex-1">{option.name}</span>
          
          {/* Single selection indicator */}
          {!multiple && isSelected && (
            <Check className="h-4 w-4 text-art-accent ml-2" />
          )}
        </button>
        
        {/* Render children if expanded */}
        {hasChildren && isExpanded && (
          <div>
            {option.children.map(child => renderOption(child, level + 1))}
          </div>
        )}
      </div>
    )
  }
  
  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-art-gray-800 hover:bg-art-gray-700 text-white rounded-lg 
                   focus:outline-none focus:ring-2 focus:ring-art-accent flex items-center justify-between"
      >
        <span className="truncate">{getDisplayText()}</span>
        <ChevronDown className={`h-4 w-4 text-art-gray-400 transition-transform ${
          isOpen ? 'rotate-180' : ''
        }`} />
      </button>
      
      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Options list */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full mt-2 w-full max-w-md bg-art-darker rounded-lg shadow-xl 
                         border border-art-gray-800 z-50 overflow-hidden"
            >
              {/* Search */}
              {options.length > 10 && (
                <div className="p-3 border-b border-art-gray-800">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-art-gray-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={`Search ${field.title.toLowerCase()}...`}
                      className="w-full pl-10 pr-3 py-2 bg-art-gray-800 text-white rounded-lg 
                               focus:outline-none focus:ring-2 focus:ring-art-accent"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              )}
              
              {/* Options */}
              <div className="max-h-80 overflow-y-auto">
                {filteredOptions.length === 0 ? (
                  <div className="px-4 py-8 text-center text-art-gray-500">
                    No options found
                  </div>
                ) : (
                  filteredOptions.map(option => renderOption(option))
                )}
              </div>
              
              {/* Actions for multiple selection */}
              {multiple && (
                <div className="p-3 border-t border-art-gray-800 flex justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      onChange('')
                      setIsOpen(false)
                    }}
                    className="text-sm text-art-gray-400 hover:text-white"
                  >
                    Clear all
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-3 py-1 bg-art-accent hover:bg-art-accent-dark text-white rounded-lg text-sm"
                  >
                    Done
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}