import { useState } from 'react'
import { X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import useAuthStore from '../stores/useAuthStore'

const TILE_STYLES = [
  { value: 'thmbs', label: 'Single Thumbnail', description: 'Shows one large preview image' },
  { value: 'multi', label: 'Multiple Thumbnails', description: 'Shows up to 4 preview images' },
  { value: 'blank', label: 'No Preview', description: 'Text only, no images' }
]

const TILE_COLORS = [
  { value: '#10b981', label: 'Green' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ef4444', label: 'Red' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#6b7280', label: 'Gray' }
]

export default function DashboardTileModal({ 
  isOpen, 
  onClose, 
  searchParams, 
  resources = [],
  userRef
}) {
  const navigate = useNavigate()
  const { sessionKey } = useAuthStore()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tile_style: 'thmbs',
    color: '#10b981',
    promoted_image: resources[0]?.ref || null
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      // Create tile configuration
      const tileConfig = {
        search_params: searchParams,
        promoted_image: formData.promoted_image,
        color: formData.color
      }

      // Save tile to backend
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/dashboard/tiles/${userRef}`,
        {
          title: formData.title,
          tile_type: 'search',
          tile_style: formData.tile_style,
          tile_config: tileConfig,
          size: 'normal'
        }
      )

      if (response.data.success) {
        // Navigate to dashboard
        navigate('/dashboard')
        onClose()
      }
    } catch (err) {
      console.error('Failed to create dashboard tile:', err)
      setError('Failed to create dashboard tile')
    } finally {
      setSaving(false)
    }
  }

  const getPreviewStyle = () => {
    switch (formData.tile_style) {
      case 'multi':
        return 'grid grid-cols-2 gap-1'
      case 'blank':
        return 'flex items-center justify-center h-full'
      default:
        return ''
    }
  }

  const getPreviewResources = () => {
    switch (formData.tile_style) {
      case 'multi':
        return resources.slice(0, 4)
      case 'blank':
        return []
      default:
        return resources.filter(r => r.ref === formData.promoted_image).slice(0, 1)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-art-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-art-gray-900 border-b border-art-gray-800 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Add Search to Dashboard</h2>
            <button onClick={onClose} className="text-art-gray-400 hover:text-white">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-art-gray-400 mb-2">
              Tile Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
              placeholder="e.g., Recent Uploads, Landscape Photos"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-art-gray-400 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
              placeholder="Optional description for this tile"
              rows={2}
            />
          </div>

          {/* Tile Style */}
          <div>
            <label className="block text-sm font-medium text-art-gray-400 mb-2">
              Tile Style
            </label>
            <div className="space-y-3">
              {TILE_STYLES.map(style => (
                <label
                  key={style.value}
                  className="flex items-start gap-3 cursor-pointer group"
                >
                  <input
                    type="radio"
                    name="tile_style"
                    value={style.value}
                    checked={formData.tile_style === style.value}
                    onChange={(e) => setFormData({ ...formData, tile_style: e.target.value })}
                    className="mt-1 text-art-accent focus:ring-art-accent"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-white group-hover:text-art-accent transition-colors">
                      {style.label}
                    </div>
                    <div className="text-sm text-art-gray-500">
                      {style.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Promoted Image (for thumbnail styles) */}
          {formData.tile_style === 'thmbs' && resources.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-art-gray-400 mb-2">
                Select Preview Image
              </label>
              <div className="grid grid-cols-4 gap-2">
                {resources.slice(0, 8).map(resource => (
                  <button
                    key={resource.ref}
                    type="button"
                    onClick={() => setFormData({ ...formData, promoted_image: resource.ref })}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                      formData.promoted_image === resource.ref
                        ? 'border-art-accent'
                        : 'border-transparent hover:border-art-gray-600'
                    }`}
                  >
                    <img
                      src={`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/resource/${resource.ref}/preview`}
                      alt={resource.field8 || 'Resource'}
                      className="w-full h-full object-cover"
                    />
                    {formData.promoted_image === resource.ref && (
                      <div className="absolute inset-0 bg-art-accent/20 flex items-center justify-center">
                        <i className="fas fa-check text-white text-2xl"></i>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-art-gray-400 mb-2">
              Tile Color
            </label>
            <div className="flex gap-2">
              {TILE_COLORS.map(color => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: color.value })}
                  className={`w-10 h-10 rounded-lg border-2 transition-colors ${
                    formData.color === color.value
                      ? 'border-white scale-110'
                      : 'border-transparent hover:border-art-gray-600'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-art-gray-400 mb-2">
              Preview
            </label>
            <div 
              className="relative h-48 rounded-lg overflow-hidden"
              style={{ backgroundColor: formData.color }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-transparent p-4">
                <h3 className="text-white font-semibold text-lg">
                  {formData.title || 'Untitled Tile'}
                </h3>
                {formData.description && (
                  <p className="text-white/80 text-sm mt-1">
                    {formData.description}
                  </p>
                )}
              </div>
              
              <div className={`absolute inset-0 p-4 ${getPreviewStyle()}`}>
                {formData.tile_style === 'blank' ? (
                  <div className="flex items-center justify-center h-full">
                    <i className="fas fa-search text-white/20 text-6xl"></i>
                  </div>
                ) : (
                  getPreviewResources().map(resource => (
                    <div key={resource.ref} className="relative h-full">
                      <img
                        src={`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/resource/${resource.ref}/preview`}
                        alt={resource.field8 || 'Resource'}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                  ))
                )}
              </div>
              
              <div className="absolute bottom-4 right-4 bg-black/60 text-white text-sm px-3 py-1 rounded-full">
                {resources.length} results
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 text-red-300 p-4 rounded-lg">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-art-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-art-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.title}
              className="px-6 py-2 bg-art-accent text-white rounded-lg hover:bg-art-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <i className="fas fa-plus"></i>
                  Add to Dashboard
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}