import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function UploadProgress({ percent, status, error }) {
  const getStatusIcon = () => {
    switch (status) {
      case 'creating':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'complete':
        return <CheckCircle className="h-4 w-4" />
      case 'error':
        return <XCircle className="h-4 w-4" />
      default:
        return null
    }
  }
  
  const getStatusColor = () => {
    switch (status) {
      case 'complete':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-art-accent'
    }
  }
  
  const getStatusText = () => {
    switch (status) {
      case 'creating':
        return 'Creating resource...'
      case 'uploading':
        return `Uploading: ${Math.round(percent)}%`
      case 'processing':
        return 'Processing...'
      case 'complete':
        return 'Complete'
      case 'error':
        return error || 'Failed'
      default:
        return 'Pending'
    }
  }
  
  return (
    <div className="absolute inset-0 bg-black/70 rounded-lg flex flex-col items-center justify-center p-2">
      {/* Progress bar */}
      {status !== 'complete' && status !== 'error' && (
        <div className="w-full bg-white/20 rounded-full h-1 mb-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.3 }}
            className={`h-full ${getStatusColor()}`}
          />
        </div>
      )}
      
      {/* Status */}
      <div className={`flex items-center space-x-1 text-xs ${
        status === 'error' ? 'text-red-400' : 
        status === 'complete' ? 'text-green-400' : 
        'text-white'
      }`}>
        {getStatusIcon()}
        <span className="truncate max-w-[100px]">{getStatusText()}</span>
      </div>
    </div>
  )
}