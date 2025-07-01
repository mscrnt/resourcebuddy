import { useEffect, useState } from 'react'
import { X, ChevronLeft, FileText, Calendar, User, Tag, Folder, Download } from 'lucide-react'
import { motion } from 'framer-motion'
import { useApi } from '../contexts/ApiContext'

export default function MetadataPanel({ resource, isOpen, onClose }) {
  const api = useApi()
  const [metadata, setMetadata] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (resource && isOpen) {
      loadMetadata()
    }
  }, [resource?.ref, isOpen])

  const loadMetadata = async () => {
    setLoading(true)
    try {
      // Get detailed metadata
      const fieldData = await api.getResourceFieldData(resource.ref)
      // Convert array of field objects to a key-value object
      const metadataObj = {}
      if (Array.isArray(fieldData)) {
        fieldData.forEach(field => {
          if (field.value) {
            metadataObj[`field${field.ref}`] = field.value
          }
        })
      }
      setMetadata(metadataObj)
    } catch (err) {
      console.error('Failed to load metadata:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown'
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Common metadata fields
  const commonFields = [
    { icon: FileText, label: 'Title', value: resource.field8 || 'Untitled' },
    { icon: FileText, label: 'Description', value: metadata.field18 || resource.field18 || 'No description' },
    { icon: Tag, label: 'Keywords', value: metadata.field1 || resource.field1 || 'No keywords' },
    { icon: User, label: 'Creator', value: metadata.field179 || resource.field179 || 'Unknown' },
    { icon: Folder, label: 'Brand', value: metadata.field181 || resource.field181 || 'N/A' },
    { icon: Calendar, label: 'Date Created', value: formatDate(resource.creation_date) },
  ]

  const technicalFields = [
    { label: 'Resource ID', value: resource.ref },
    { label: 'File Type', value: resource.file_extension?.toUpperCase() || 'Unknown' },
    { label: 'File Size', value: formatFileSize(resource.file_size) },
    { label: 'Dimensions', value: resource.width && resource.height ? `${resource.width} × ${resource.height}` : 'N/A' },
    { label: 'Downloads', value: resource.download_count || 0 },
  ]

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: isOpen ? 0 : '100%' }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="absolute top-0 right-0 h-full w-80 bg-art-darker border-l border-art-gray-800 shadow-2xl overflow-hidden z-30"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="sticky top-0 bg-art-darker border-b border-art-gray-800 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Resource Details</h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-y-auto h-[calc(100%-64px)] custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {/* Common Metadata */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-art-gray-400 uppercase tracking-wider">Metadata</h4>
              {commonFields.map((field, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center space-x-2 text-art-gray-500">
                    <field.icon className="h-4 w-4" />
                    <span className="text-sm">{field.label}</span>
                  </div>
                  <p className="text-white text-sm leading-relaxed pl-6">
                    {String(field.value)}
                  </p>
                </div>
              ))}
            </div>

            {/* Technical Details */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-art-gray-400 uppercase tracking-wider">Technical Details</h4>
              <div className="space-y-2">
                {technicalFields.map((field, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-art-gray-500">{field.label}</span>
                    <span className="text-sm text-white font-mono">{field.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Fields */}
            {Object.keys(metadata).length > 0 && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-art-gray-400 uppercase tracking-wider">Additional Fields</h4>
                <div className="space-y-2">
                  {Object.entries(metadata)
                    .filter(([key, value]) => 
                      value && 
                      !['field8', 'field18', 'field1', 'field179', 'field181'].includes(key)
                    )
                    .map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <span className="text-xs text-art-gray-500">{key.replace('field', 'Field ')}</span>
                        <p className="text-sm text-white">{String(value)}</p>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2 pt-4 border-t border-art-gray-800">
              <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-art-primary hover:bg-art-primary-dark text-white rounded-lg transition-colors">
                <Download className="h-4 w-4" />
                <span>Download Original</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}