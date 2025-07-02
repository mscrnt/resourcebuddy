import { useState, useEffect, useRef } from 'react'
import { Plus, X, GripVertical, Settings as SettingsIcon, ExternalLink, Search, Clock, Trash2, Eye } from 'lucide-react'
import { GridStack } from 'gridstack'
import 'gridstack/dist/gridstack.min.css'
import 'gridstack/dist/gridstack-extra.min.css'
import useAuthStore from '../stores/useAuthStore'
import { cn } from '../lib/utils'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

// Dashboard Tile Component
function DashboardTile({ tile, onRemove, onEdit, onRefresh }) {
  const [loading, setLoading] = useState(true)
  const [resources, setResources] = useState([])
  const [resourceCount, setResourceCount] = useState(0)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const { sessionKey } = useAuthStore()

  // Execute search on mount and refresh
  useEffect(() => {
    if (tile.tile_type === 'search') {
      executeSearch()
    }
  }, [tile])

  const executeSearch = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/dashboard/tiles/execute-search`,
        {
          searchParams: tile.tile_config.search_params,
          sessionKey
        }
      )

      if (response.data.success) {
        setResources(response.data.results || [])
        setResourceCount(response.data.count || 0)
      }
    } catch (err) {
      console.error('Failed to execute search:', err)
      setError('Failed to load results')
    } finally {
      setLoading(false)
    }
  }

  const handleTileClick = () => {
    // Navigate to search with the saved parameters
    const params = tile.tile_config.search_params
    const searchQuery = new URLSearchParams()
    
    if (params.search) searchQuery.set('search', params.search)
    if (params.order_by) searchQuery.set('order_by', params.order_by)
    if (params.sort) searchQuery.set('sort', params.sort)
    
    navigate(`/?${searchQuery.toString()}`)
  }

  const renderTileContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/50"></div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full text-white/60">
          <div className="text-center">
            <i className="fas fa-exclamation-triangle text-2xl mb-2"></i>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )
    }

    switch (tile.tile_style) {
      case 'multi':
        return (
          <div className="grid grid-cols-2 gap-1 h-full p-2">
            {resources.slice(0, 4).map((resource, idx) => (
              <div key={resource.ref || idx} className="relative overflow-hidden rounded">
                <img
                  src={`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/resource/${resource.ref}/preview`}
                  alt={resource.field8 || 'Resource'}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )
      
      case 'blank':
        return (
          <div className="flex items-center justify-center h-full">
            <i className="fas fa-search text-white/20 text-6xl"></i>
          </div>
        )
      
      default: // 'thmbs'
        const promotedResource = tile.tile_config.promoted_image 
          ? resources.find(r => r.ref === tile.tile_config.promoted_image) || resources[0]
          : resources[0]
          
        return promotedResource ? (
          <img
            src={`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/resource/${promotedResource.ref}/preview`}
            alt={promotedResource.field8 || 'Resource'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <i className="fas fa-image text-white/20 text-6xl"></i>
          </div>
        )
    }
  }

  return (
    <div 
      className="dashboard-tile h-full rounded-lg overflow-hidden cursor-pointer relative group"
      style={{ backgroundColor: tile.tile_config.color || '#10b981' }}
      onClick={handleTileClick}
    >
      {/* Background Content */}
      <div className="absolute inset-0">
        {renderTileContent()}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/50 p-4 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-white font-semibold text-lg leading-tight">
              {tile.title}
            </h3>
            {tile.tile_config.description && (
              <p className="text-white/80 text-sm mt-1">
                {tile.tile_config.description}
              </p>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRefresh()
                executeSearch()
              }}
              className="p-1.5 bg-black/50 rounded hover:bg-black/70 transition-colors"
              title="Refresh"
            >
              <i className="fas fa-sync-alt text-white text-sm"></i>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(tile)
              }}
              className="p-1.5 bg-black/50 rounded hover:bg-black/70 transition-colors"
              title="Edit"
            >
              <SettingsIcon className="h-4 w-4 text-white" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRemove(tile.id)
              }}
              className="p-1.5 bg-black/50 rounded hover:bg-black/70 transition-colors"
              title="Remove"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-4 text-white/60 text-sm">
            <span className="flex items-center gap-1">
              <i className="fas fa-images"></i>
              {resourceCount}
            </span>
          </div>
          <i className="fas fa-chevron-right text-white/40"></i>
        </div>
      </div>
    </div>
  )
}

// Main Dashboard component
export default function DashboardPage() {
  const { user } = useAuthStore()
  const [tiles, setTiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingTile, setEditingTile] = useState(null)
  const gridRef = useRef(null)
  const gridInstanceRef = useRef(null)

  // Fetch tiles from backend
  useEffect(() => {
    if (user?.ref) {
      fetchTiles()
    }
  }, [user])

  const fetchTiles = async () => {
    setLoading(true)
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/dashboard/tiles/${user.ref}`
      )
      
      if (response.data.success) {
        setTiles(response.data.tiles)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard tiles:', error)
    } finally {
      setLoading(false)
    }
  }

  // Initialize GridStack
  useEffect(() => {
    if (gridRef.current && !gridInstanceRef.current && tiles.length > 0) {
      gridInstanceRef.current = GridStack.init({
        cellHeight: 120,
        margin: 10,
        float: true,
        column: 12,
        animate: true,
        resizable: {
          handles: 'se, sw'
        },
        draggable: {
          handle: '.dashboard-tile'
        }
      }, gridRef.current)

      // Save positions on change
      gridInstanceRef.current.on('change', async (event, items) => {
        const positions = items.map(item => ({
          id: parseInt(item.el.dataset.tileId),
          position: item.y * 12 + item.x
        }))
        
        try {
          await axios.post(
            `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/dashboard/tiles/${user.ref}/positions`,
            { positions }
          )
        } catch (error) {
          console.error('Failed to save tile positions:', error)
        }
      })
    }

    return () => {
      if (gridInstanceRef.current) {
        gridInstanceRef.current.destroy(false)
        gridInstanceRef.current = null
      }
    }
  }, [tiles, user])

  // Remove tile
  const handleRemoveTile = async (tileId) => {
    if (!confirm('Are you sure you want to remove this tile?')) return

    try {
      const response = await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/dashboard/tiles/${user.ref}/${tileId}`
      )
      
      if (response.data.success) {
        setTiles(prev => prev.filter(tile => tile.id !== tileId))
      }
    } catch (error) {
      console.error('Failed to remove tile:', error)
    }
  }

  // Edit tile
  const handleEditTile = (tile) => {
    // TODO: Open edit modal
    console.log('Edit tile:', tile)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-art-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-art-accent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-art-dark p-6">
      <div className="mx-auto max-w-screen-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">My Dashboard</h1>
            <p className="text-art-gray-400 mt-1">
              Your saved searches and quick access tiles
            </p>
          </div>
        </div>

        {tiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <i className="fas fa-th-large text-6xl text-art-gray-600 mb-4"></i>
            <p className="text-xl text-art-gray-400 mb-2">Your dashboard is empty</p>
            <p className="text-art-gray-600 mb-6">
              Save searches from the browse page to add tiles here
            </p>
          </div>
        ) : (
          <div ref={gridRef} className="grid-stack">
            {tiles.map(tile => {
              // Calculate grid size based on tile size
              const width = tile.size === 'double' ? 6 : 4
              const height = tile.size === 'tall' ? 4 : 2
              
              return (
                <div
                  key={tile.id}
                  data-tile-id={tile.id}
                  className="grid-stack-item"
                  data-gs-w={width}
                  data-gs-h={height}
                  data-gs-x={(tile.position % 12) || 0}
                  data-gs-y={Math.floor(tile.position / 12) || 0}
                >
                  <div className="grid-stack-item-content">
                    <DashboardTile
                      tile={tile}
                      onRemove={handleRemoveTile}
                      onEdit={handleEditTile}
                      onRefresh={() => {}}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}