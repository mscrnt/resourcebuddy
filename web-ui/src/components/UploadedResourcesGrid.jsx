import { useState, useEffect } from 'react'
import { Eye, ExternalLink, CheckCircle, Loader2 } from 'lucide-react'
import { useApi } from '../contexts/ApiContext'
import { motion } from 'framer-motion'

export default function UploadedResourcesGrid({ resources, onViewResource }) {
  const api = useApi()
  const [previews, setPreviews] = useState({})
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    if (resources.length > 0) {
      loadPreviews()
    }
  }, [resources])
  
  const loadPreviews = async () => {
    setLoading(true)
    try {
      // Get all resource refs
      const refs = resources.map(r => r.ref).join(',')
      
      // Search for these specific resources
      const searchResults = await api.searchResources(`ref:${refs}`, {
        getsizes: 'thm,scr',
        fetchrows: resources.length
      })
      
      // Map previews by ref
      const previewMap = {}
      if (Array.isArray(searchResults)) {
        for (const result of searchResults) {
          try {
            const thumbUrl = await api.getResourcePath(result.ref, 'thm')
            const screenUrl = await api.getResourcePath(result.ref, 'scr')
            previewMap[result.ref] = {
              thumb: thumbUrl,
              screen: screenUrl,
              metadata: result
            }
          } catch (error) {
            console.error(`Failed to get preview for resource ${result.ref}:`, error)
          }
        }
      }
      
      setPreviews(previewMap)
    } catch (error) {
      console.error('Failed to load previews:', error)
    } finally {
      setLoading(false)
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-art-gray-500" />
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white flex items-center">
          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
          Successfully Uploaded {resources.length} {resources.length === 1 ? 'File' : 'Files'}
        </h3>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {resources.map((resource, index) => {
          const preview = previews[resource.ref]
          const metadata = preview?.metadata || {}
          
          return (
            <motion.div
              key={resource.ref}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="group relative"
            >
              <div className="aspect-square rounded-lg overflow-hidden bg-art-gray-900">
                {preview?.thumb ? (
                  <img
                    src={preview.thumb}
                    alt={metadata.field8 || resource.file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Eye className="h-8 w-8 text-art-gray-600" />
                  </div>
                )}
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-sm font-medium truncate">
                      {metadata.field8 || resource.file.name}
                    </p>
                    <p className="text-art-gray-300 text-xs">
                      Resource #{resource.ref}
                    </p>
                  </div>
                </div>
                
                {/* Action button */}
                <button
                  onClick={() => onViewResource(resource.ref)}
                  className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  title="View resource"
                >
                  <ExternalLink className="h-4 w-4 text-white" />
                </button>
              </div>
            </motion.div>
          )
        })}
      </div>
      
      <div className="text-center text-art-gray-400 text-sm">
        <p>All files have been uploaded successfully.</p>
        <p>You can close this modal or view all uploaded resources.</p>
      </div>
    </div>
  )
}