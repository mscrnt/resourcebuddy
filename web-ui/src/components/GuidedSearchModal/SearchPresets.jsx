import { Sparkles, Image, FileText, Video, Clock, User, Camera, Download } from 'lucide-react'
import { motion } from 'framer-motion'

const SEARCH_PRESETS = [
  {
    id: 'my-uploads',
    name: 'Find My Uploads',
    description: 'All resources you\'ve uploaded',
    icon: User,
    color: 'bg-blue-500',
    data: {
      uploadedBy: 'me',
      dateRange: { from: '', to: '' },
      globalOperator: 'all'
    }
  },
  {
    id: 'recent-images',
    name: 'Recent Images',
    description: 'Photos and graphics from the last 30 days',
    icon: Image,
    color: 'bg-green-500',
    data: {
      fileTypes: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'],
      dateRange: { 
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
      },
      globalOperator: 'all'
    }
  },
  {
    id: 'videos',
    name: 'Find Videos',
    description: 'All video files in the system',
    icon: Video,
    color: 'bg-purple-500',
    data: {
      fileTypes: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv'],
      globalOperator: 'all'
    }
  },
  {
    id: 'documents',
    name: 'Find Documents',
    description: 'PDFs, Word docs, and text files',
    icon: FileText,
    color: 'bg-orange-500',
    data: {
      fileTypes: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'],
      globalOperator: 'all'
    }
  },
  {
    id: 'high-res',
    name: 'High Resolution Images',
    description: 'Images larger than 1920x1080',
    icon: Camera,
    color: 'bg-pink-500',
    data: {
      fileTypes: ['jpg', 'jpeg', 'png', 'tiff', 'raw'],
      fileAttributes: {
        dimensions: { width: '1920', height: '1080', operator: 'at least' }
      },
      globalOperator: 'all'
    }
  },
  {
    id: 'never-downloaded',
    name: 'Never Downloaded',
    description: 'Resources that haven\'t been downloaded yet',
    icon: Download,
    color: 'bg-red-500',
    data: {
      specialSearches: ['nodownloads'],
      globalOperator: 'all'
    }
  },
  {
    id: 'this-week',
    name: 'This Week\'s Uploads',
    description: 'Everything uploaded in the last 7 days',
    icon: Clock,
    color: 'bg-indigo-500',
    data: {
      dateRange: { 
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
      },
      globalOperator: 'all'
    }
  },
  {
    id: 'duplicates',
    name: 'Find Duplicates',
    description: 'Identify potential duplicate files',
    icon: Sparkles,
    color: 'bg-yellow-500',
    data: {
      specialSearches: ['duplicates'],
      globalOperator: 'all'
    }
  }
]

export default function SearchPresets({ onSelect, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-6"
    >
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white mb-2">Search Presets</h2>
        <p className="text-art-gray-400">
          Start with one of these common searches and customize from there
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {SEARCH_PRESETS.map((preset, index) => {
          const Icon = preset.icon
          return (
            <motion.button
              key={preset.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSelect(preset.data)}
              className="p-6 bg-art-gray-800 rounded-lg hover:bg-art-gray-700 transition-all hover:scale-105 text-left group"
            >
              <div className={`w-12 h-12 ${preset.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-medium text-white mb-2">{preset.name}</h3>
              <p className="text-sm text-art-gray-400">{preset.description}</p>
            </motion.button>
          )
        })}
      </div>
      
      <div className="mt-6 flex justify-end">
        <button
          onClick={onClose}
          className="px-6 py-2 text-art-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  )
}