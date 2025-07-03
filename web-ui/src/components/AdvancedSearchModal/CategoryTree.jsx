import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, Folder, FolderOpen, Check } from 'lucide-react'
import { cn } from '../../lib/utils'
import resourceSpaceApi from '../../lib/resourcespace-api-backend'

export default function CategoryTree({ field, value, onChange, sessionKey }) {
  const [nodes, setNodes] = useState([])
  const [expanded, setExpanded] = useState({})
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadNodes()
  }, [field.ref])
  
  const loadNodes = async (parentId = null) => {
    try {
      setLoading(true)
      const options = await resourceSpaceApi.getFieldOptions(field.ref, true, sessionKey)
      
      // Build tree structure
      const tree = buildTree(options || [])
      setNodes(tree)
      
      // Auto-expand if value is selected
      if (value) {
        const path = findNodePath(tree, value)
        const newExpanded = {}
        path.forEach(nodeId => {
          newExpanded[nodeId] = true
        })
        setExpanded(newExpanded)
      }
    } catch (err) {
      console.error('Failed to load category tree:', err)
    } finally {
      setLoading(false)
    }
  }
  
  const buildTree = (options) => {
    const tree = []
    const nodeMap = {}
    
    // First pass - create all nodes
    options.forEach(option => {
      nodeMap[option.ref] = {
        ...option,
        children: []
      }
    })
    
    // Second pass - build tree structure
    options.forEach(option => {
      if (option.parent && nodeMap[option.parent]) {
        nodeMap[option.parent].children.push(nodeMap[option.ref])
      } else {
        tree.push(nodeMap[option.ref])
      }
    })
    
    // Sort by order_by
    const sortNodes = (nodes) => {
      nodes.sort((a, b) => (a.order_by || 0) - (b.order_by || 0))
      nodes.forEach(node => {
        if (node.children.length > 0) {
          sortNodes(node.children)
        }
      })
    }
    
    sortNodes(tree)
    return tree
  }
  
  const findNodePath = (nodes, targetId, path = []) => {
    for (const node of nodes) {
      if (node.ref === targetId) {
        return path
      }
      if (node.children.length > 0) {
        const result = findNodePath(node.children, targetId, [...path, node.ref])
        if (result.length > path.length) {
          return result
        }
      }
    }
    return path
  }
  
  const toggleExpanded = (nodeId) => {
    setExpanded(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }))
  }
  
  const selectNode = (nodeId) => {
    // For single select
    onChange(nodeId === value ? null : nodeId)
  }
  
  const renderNode = (node, level = 0) => {
    const isExpanded = expanded[node.ref]
    const isSelected = value === node.ref
    const hasChildren = node.children && node.children.length > 0
    
    return (
      <div key={node.ref}>
        <div
          className={cn(
            "flex items-center py-1 px-2 hover:bg-art-gray-700 rounded cursor-pointer transition-colors",
            isSelected && "bg-art-gray-700 text-art-accent"
          )}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
        >
          <button
            type="button"
            onClick={() => hasChildren && toggleExpanded(node.ref)}
            className="p-1 hover:bg-art-gray-600 rounded transition-colors mr-1"
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
            ) : (
              <div className="w-3 h-3" />
            )}
          </button>
          
          <button
            type="button"
            onClick={() => selectNode(node.ref)}
            className="flex items-center gap-2 flex-1 text-left"
          >
            {hasChildren ? (
              isExpanded ? <FolderOpen className="h-4 w-4 text-art-gray-400" /> : <Folder className="h-4 w-4 text-art-gray-400" />
            ) : (
              <div className="w-4 h-4" />
            )}
            <span className="text-sm">{node.name}</span>
            {isSelected && <Check className="h-4 w-4 ml-auto" />}
          </button>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-art-accent"></div>
      </div>
    )
  }
  
  return (
    <div className="bg-art-gray-800 rounded-lg border border-art-gray-700 max-h-60 overflow-y-auto">
      {nodes.length === 0 ? (
        <div className="p-4 text-center text-sm text-art-gray-400">No categories available</div>
      ) : (
        <div className="py-1">
          {nodes.map(node => renderNode(node))}
        </div>
      )}
    </div>
  )
}