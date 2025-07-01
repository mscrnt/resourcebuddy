import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Download, Share2, Heart, Folder, ChevronLeft } from 'lucide-react'
import { useApi } from '../contexts/ApiContext'
import VideoPlayer from '../components/VideoPlayer'
import { formatDate, formatFileSize } from '../lib/utils'
import { toast } from '../components/ui/Toaster'

export default function ResourceViewPage() {
  const { id } = useParams()
  const api = useApi()
  
  const { data: resource, isLoading, error } = useQuery({
    queryKey: ['resource', id],
    queryFn: () => api.getResource(id),
  })

  const { data: metadata } = useQuery({
    queryKey: ['resource-metadata', id],
    queryFn: () => api.getResourceFieldData(id),
    enabled: !!resource,
  })

  const isVideo = resource?.file_extension && 
    ['mp4', 'mov', 'avi', 'webm'].includes(resource.file_extension.toLowerCase())

  const handleDownload = async () => {
    try {
      const downloadUrl = await api.getResourcePath(id, 'original')
      window.open(downloadUrl, '_blank')
      toast({
        title: 'Download started',
        description: 'Your file is being downloaded',
      })
    } catch (error) {
      toast({
        title: 'Download failed',
        description: error.message,
        variant: 'error',
      })
    }
  }

  const handleShare = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    toast({
      title: 'Link copied',
      description: 'Resource link copied to clipboard',
    })
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 w-64 bg-art-gray-800 rounded mb-4" />
          <div className="aspect-video bg-art-gray-900 rounded-lg" />
        </div>
      </div>
    )
  }

  if (error || !resource) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <p className="text-art-gray-400">Resource not found</p>
          <Link
            to="/"
            className="mt-4 inline-flex items-center text-art-accent hover:text-art-accent/80"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back button */}
      <Link
        to="/"
        className="mb-6 inline-flex items-center text-sm text-art-gray-400 hover:text-white transition-colors"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Back
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <h1 className="text-3xl font-bold text-white">
            {resource.field8 || `Resource ${resource.ref}`}
          </h1>

          {/* Media viewer */}
          <div className="overflow-hidden rounded-lg bg-black">
            {isVideo ? (
              <VideoPlayer
                src={resource.preview_url || resource.file_path}
                poster={resource.thumb_url}
              />
            ) : (
              <img
                src={resource.preview_url || resource.file_path}
                alt={resource.field8}
                className="w-full h-auto"
              />
            )}
          </div>

          {/* Description */}
          {resource.field1 && (
            <div className="prose prose-invert max-w-none">
              <h2 className="text-xl font-semibold text-white mb-2">Description</h2>
              <p className="text-art-gray-300 whitespace-pre-wrap">{resource.field1}</p>
            </div>
          )}

          {/* Metadata */}
          {metadata && metadata.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Details</h2>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {metadata.map((field) => (
                  <div key={field.ref} className="border-l-2 border-art-gray-800 pl-4">
                    <dt className="text-sm text-art-gray-500">{field.title}</dt>
                    <dd className="mt-1 text-sm text-white">{field.value || '-'}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="rounded-lg bg-art-gray-900 p-6 space-y-4">
            <button
              onClick={handleDownload}
              className="w-full flex items-center justify-center rounded-md bg-art-accent px-4 py-2 text-sm font-medium text-white hover:bg-art-accent/90 transition-colors"
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </button>
            
            <div className="flex gap-2">
              <button
                onClick={handleShare}
                className="flex-1 flex items-center justify-center rounded-md bg-art-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-art-gray-700 transition-colors"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </button>
              
              <button className="flex-1 flex items-center justify-center rounded-md bg-art-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-art-gray-700 transition-colors">
                <Heart className="mr-2 h-4 w-4" />
                Like
              </button>
              
              <button className="flex-1 flex items-center justify-center rounded-md bg-art-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-art-gray-700 transition-colors">
                <Folder className="mr-2 h-4 w-4" />
                Save
              </button>
            </div>
          </div>

          {/* File info */}
          <div className="rounded-lg bg-art-gray-900 p-6 space-y-3">
            <h3 className="font-semibold text-white">File Information</h3>
            
            <div className="space-y-2 text-sm">
              {resource.file_extension && (
                <div className="flex justify-between">
                  <span className="text-art-gray-500">Format</span>
                  <span className="text-white uppercase">{resource.file_extension}</span>
                </div>
              )}
              
              {resource.file_size && (
                <div className="flex justify-between">
                  <span className="text-art-gray-500">Size</span>
                  <span className="text-white">{formatFileSize(resource.file_size)}</span>
                </div>
              )}
              
              {resource.width && resource.height && (
                <div className="flex justify-between">
                  <span className="text-art-gray-500">Dimensions</span>
                  <span className="text-white">{resource.width} × {resource.height}</span>
                </div>
              )}
              
              {resource.creation_date && (
                <div className="flex justify-between">
                  <span className="text-art-gray-500">Uploaded</span>
                  <span className="text-white">{formatDate(resource.creation_date)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Creator info */}
          {resource.created_by_username && (
            <div className="rounded-lg bg-art-gray-900 p-6">
              <h3 className="font-semibold text-white mb-3">Created by</h3>
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-art-gray-700 flex items-center justify-center">
                  <span className="text-white font-medium">
                    {resource.created_by_username[0].toUpperCase()}
                  </span>
                </div>
                <div className="ml-3">
                  <p className="text-white font-medium">{resource.created_by_username}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}