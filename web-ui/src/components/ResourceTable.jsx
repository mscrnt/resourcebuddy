import { useState, useEffect, useRef } from 'react'
import { cn } from '../lib/utils'
import { getResourcePreviewUrl } from '../lib/resourcespace-api-backend'
import { Settings2, ChevronUp, ChevronDown } from 'lucide-react'

// Default available columns
const AVAILABLE_COLUMNS = [
  { id: 'ref', label: 'ID', field: 'ref', required: true, width: 80 },
  { id: 'thumbnail', label: 'Preview', field: 'thumbnail', required: true, width: 60 },
  { id: 'title', label: 'Title', field: 'field8', required: true, width: 300 },
  { id: 'creation_date', label: 'Date Created', field: 'creation_date', width: 120 },
  { id: 'file_extension', label: 'Type', field: 'file_extension', width: 80 },
  { id: 'file_size', label: 'Size', field: 'file_size', width: 100 },
  { id: 'created_by', label: 'Created By', field: 'created_by', width: 150 },
  { id: 'rating', label: 'Rating', field: 'rating', width: 100 },
  { id: 'hit_count', label: 'Views', field: 'hit_count', width: 80 },
  { id: 'field3', label: 'Country', field: 'field3', width: 120 },
  { id: 'field12', label: 'Date', field: 'field12', width: 120 },
  { id: 'field1', label: 'Keywords', field: 'field1', width: 200 },
  { id: 'field88', label: 'Categories', field: 'field88', width: 200 },
]

// Column configuration modal
function ColumnConfigModal({ isOpen, onClose, columns, onSave }) {
  const [selectedColumns, setSelectedColumns] = useState(columns)
  
  const toggleColumn = (columnId) => {
    const column = AVAILABLE_COLUMNS.find(col => col.id === columnId)
    if (column.required) return // Can't toggle required columns
    
    setSelectedColumns(prev => {
      if (prev.find(col => col.id === columnId)) {
        return prev.filter(col => col.id !== columnId)
      } else {
        const newColumn = AVAILABLE_COLUMNS.find(col => col.id === columnId)
        return [...prev, { ...newColumn }]
      }
    })
  }
  
  const moveColumn = (index, direction) => {
    const newColumns = [...selectedColumns]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    
    // Don't move beyond bounds
    if (targetIndex < 0 || targetIndex >= newColumns.length) return
    
    // Swap columns
    [newColumns[index], newColumns[targetIndex]] = [newColumns[targetIndex], newColumns[index]]
    setSelectedColumns(newColumns)
  }
  
  const handleSave = () => {
    onSave(selectedColumns)
    onClose()
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-art-gray-900 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <h2 className="text-xl font-bold text-white mb-4">Configure Table Columns</h2>
        
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-2 mb-4">
            <h3 className="text-sm font-medium text-art-gray-400">Active Columns</h3>
            {selectedColumns.map((col, index) => (
              <div key={col.id} className="flex items-center justify-between bg-art-gray-800 p-3 rounded">
                <span className="text-white">
                  {col.label}
                  {col.required && <span className="text-art-gray-500 text-xs ml-2">(Required)</span>}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => moveColumn(index, 'up')}
                    disabled={index === 0}
                    className="p-1 text-art-gray-400 hover:text-white disabled:opacity-50"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => moveColumn(index, 'down')}
                    disabled={index === selectedColumns.length - 1}
                    className="p-1 text-art-gray-400 hover:text-white disabled:opacity-50"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-art-gray-400">Available Columns</h3>
            {AVAILABLE_COLUMNS.filter(col => !col.required).map(col => (
              <label
                key={col.id}
                className="flex items-center gap-3 bg-art-gray-800 p-3 rounded cursor-pointer hover:bg-art-gray-700"
              >
                <input
                  type="checkbox"
                  checked={selectedColumns.some(c => c.id === col.id)}
                  onChange={() => toggleColumn(col.id)}
                  className="rounded text-art-accent focus:ring-art-accent"
                />
                <span className="text-white">{col.label}</span>
              </label>
            ))}
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-art-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-art-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-art-accent text-white rounded hover:bg-art-accent-dark transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ResourceTable({ resources, showUser = true, onSort, sortField, sortOrder, onResourceClick, configModalOpen, onConfigModalClose, onColumnSave }) {
  const [columns, setColumns] = useState(() => {
    // Load saved columns from localStorage or use defaults
    const saved = localStorage.getItem('resourceTableColumns')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Failed to parse saved columns:', e)
      }
    }
    // Default columns with their widths
    return AVAILABLE_COLUMNS.filter(col => 
      ['ref', 'thumbnail', 'title', 'creation_date', 'file_extension', 'created_by'].includes(col.id)
    ).map(col => ({ ...col }))
  })
  const [resizing, setResizing] = useState(null)
  const tableRef = useRef(null)
  const columnRefs = useRef({})
  
  // Handle column resize
  const handleMouseDown = (index) => (e) => {
    e.preventDefault()
    e.stopPropagation()
    setResizing({ index, startX: e.clientX, startWidth: columns[index].width })
  }
  
  // Handle double-click to auto-fit
  const handleDoubleClick = (index) => (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    const column = columns[index]
    const cells = document.querySelectorAll(`[data-column="${column.id}"]`)
    let maxWidth = 0
    
    // Measure all cells in this column
    cells.forEach(cell => {
      // Temporarily remove truncation to measure
      const originalStyles = {
        overflow: cell.style.overflow,
        textOverflow: cell.style.textOverflow,
        whiteSpace: cell.style.whiteSpace
      }
      
      cell.style.overflow = 'visible'
      cell.style.textOverflow = 'initial'
      cell.style.whiteSpace = 'nowrap'
      
      const width = cell.scrollWidth + 32 // Add padding
      maxWidth = Math.max(maxWidth, width)
      
      // Restore original styles
      cell.style.overflow = originalStyles.overflow
      cell.style.textOverflow = originalStyles.textOverflow
      cell.style.whiteSpace = originalStyles.whiteSpace
    })
    
    // Set the new width
    const newColumns = [...columns]
    newColumns[index] = { ...newColumns[index], width: Math.max(50, Math.min(maxWidth, 600)) }
    setColumns(newColumns)
    localStorage.setItem('resourceTableColumns', JSON.stringify(newColumns))
  }
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!resizing) return
      
      const diff = e.clientX - resizing.startX
      const newWidth = Math.max(50, resizing.startWidth + diff)
      
      setColumns(prev => {
        const newColumns = [...prev]
        newColumns[resizing.index] = { ...newColumns[resizing.index], width: newWidth }
        return newColumns
      })
    }
    
    const handleMouseUp = () => {
      if (resizing) {
        // Save column widths
        localStorage.setItem('resourceTableColumns', JSON.stringify(columns))
        setResizing(null)
      }
    }
    
    if (resizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [resizing, columns])
  
  const handleColumnSaveInternal = (newColumns) => {
    // Preserve width settings from current columns
    const columnsWithWidths = newColumns.map(newCol => {
      const existingCol = columns.find(col => col.id === newCol.id)
      return {
        ...newCol,
        width: existingCol ? existingCol.width : newCol.width
      }
    })
    setColumns(columnsWithWidths)
    localStorage.setItem('resourceTableColumns', JSON.stringify(columnsWithWidths))
    if (onColumnSave) onColumnSave(columnsWithWidths)
  }
  
  const formatFileSize = (bytes) => {
    if (!bytes) return '-'
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }
  
  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString()
  }
  
  const getCellValue = (resource, field) => {
    switch (field) {
      case 'thumbnail':
        return null // Handled separately
      case 'file_size':
        return formatFileSize(resource.file_size)
      case 'creation_date':
      case 'field12':
        return formatDate(resource[field])
      case 'rating':
        return resource.rating || '-'
      case 'hit_count':
        return resource.hit_count || '0'
      default:
        return resource[field] || '-'
    }
  }
  
  const handleSort = (field) => {
    if (field === 'thumbnail') return // Can't sort by thumbnail
    
    if (sortField === field) {
      onSort(field, sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      onSort(field, 'desc')
    }
  }
  
  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <table ref={tableRef} className="w-full bg-art-gray-900 rounded-lg overflow-hidden table-fixed">
          <thead>
            <tr className="bg-art-gray-800 border-b border-art-gray-700">
              {columns.map((col, index) => (
                <th
                  key={col.id}
                  className="relative px-4 py-3 text-left text-sm font-medium text-art-gray-300"
                  style={{ width: col.width }}
                >
                  <div
                    className={cn(
                      "flex items-center gap-2 pr-4",
                      col.field !== 'thumbnail' && "cursor-pointer hover:text-white"
                    )}
                    onClick={() => col.field !== 'thumbnail' && handleSort(col.field)}
                  >
                    <span className="truncate">{col.label}</span>
                    {sortField === col.field && (
                      <i className={`fas fa-chevron-${sortOrder === 'asc' ? 'up' : 'down'} text-xs flex-shrink-0`} />
                    )}
                  </div>
                  
                  {/* Resize handle */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-4 cursor-col-resize group flex items-center justify-center"
                    onMouseDown={handleMouseDown(index)}
                    onDoubleClick={handleDoubleClick(index)}
                  >
                    <div className="w-0.5 h-full bg-art-gray-600 group-hover:bg-art-accent transition-colors" />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {resources.map((resource, index) => (
              <tr
                key={resource.ref}
                className="border-b border-art-gray-800 hover:bg-art-gray-800/50 transition-colors"
              >
                {columns.map(col => (
                  <td 
                    key={col.id} 
                    className="px-4 py-2 overflow-hidden"
                    data-column={col.id}
                  >
                    {col.field === 'thumbnail' ? (
                      <button
                        onClick={() => onResourceClick && onResourceClick(resource, index)}
                        className="block w-12 h-12 bg-art-gray-800 rounded overflow-hidden"
                      >
                        <img
                          src={getResourcePreviewUrl(resource.ref, 'thm')}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </button>
                    ) : col.field === 'field8' || col.field === 'title' ? (
                      <button
                        onClick={() => onResourceClick && onResourceClick(resource, index)}
                        className="text-white hover:text-art-accent transition-colors block truncate text-left w-full"
                        title={getCellValue(resource, col.field)}
                      >
                        {getCellValue(resource, col.field)}
                      </button>
                    ) : (
                      <span className="text-art-gray-300 text-sm block truncate" title={getCellValue(resource, col.field)}>
                        {getCellValue(resource, col.field)}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <ColumnConfigModal
        isOpen={configModalOpen || false}
        onClose={onConfigModalClose}
        columns={columns}
        onSave={handleColumnSaveInternal}
      />
    </div>
  )
}