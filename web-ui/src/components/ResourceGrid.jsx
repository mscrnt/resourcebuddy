import { useEffect, useCallback } from 'react'
import { useInView } from 'react-intersection-observer'
import { useInfiniteQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Loader2, Image as ImageIcon, Film } from 'lucide-react'
import { cn } from '../lib/utils'
import { useApi } from '../contexts/ApiContext'

const ResourceCard = ({ resource, index, onClick }) => {
  const isVideo = resource.file_extension && ['mp4', 'mov', 'avi', 'webm'].includes(resource.file_extension.toLowerCase())
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-art-gray-900"
    >
      <button 
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          console.log('ResourceCard clicked:', resource.ref, onClick)
          if (onClick) {
            onClick()
          }
        }}
        className="block h-full w-full text-left cursor-pointer">
        {/* Thumbnail */}
        {resource.previews?.thumbnail || resource.preview_url ? (
          <img
            src={resource.previews?.thumbnail || resource.preview_url}
            alt={resource.field8 || `Resource ${resource.ref}`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-art-gray-800">
            <ImageIcon className="h-12 w-12 text-art-gray-600" />
          </div>
        )}
        
        {/* Video indicator */}
        {isVideo && (
          <div className="absolute top-2 right-2 rounded bg-black/70 p-1">
            <Film className="h-4 w-4 text-white" />
          </div>
        )}
        
        {/* Archive status indicator - only show on My Uploads page */}
        {window.location.pathname === '/my-uploads' && resource.archive !== undefined && resource.archive !== 0 && (
          <div className="absolute top-2 left-2 rounded bg-black/70 px-2 py-1">
            <span className="text-xs text-white">
              {resource.archive === -2 && 'Pending Review'}
              {resource.archive === -1 && 'Pending Submission'}
              {resource.archive === 1 && 'Archived'}
              {resource.archive === 2 && 'Archived - User Contributed'}
              {resource.archive === 3 && 'Deleted'}
              {resource.archive > 3 && `Archive ${resource.archive}`}
            </span>
          </div>
        )}
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-sm font-semibold text-white line-clamp-2">
              {resource.field8 || `Resource ${resource.ref}`}
            </h3>
            {resource.file_size && (
              <p className="mt-1 text-xs text-art-gray-300">
                {(resource.file_size / 1024 / 1024).toFixed(1)} MB
              </p>
            )}
          </div>
        </div>
      </button>
    </motion.div>
  )
}

const ResourceGridSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
    {[...Array(12)].map((_, i) => (
      <div
        key={i}
        className="aspect-[4/3] overflow-hidden rounded-lg bg-art-gray-900 skeleton"
      />
    ))}
  </div>
)

export default function ResourceGrid({ 
  searchParams = {}, 
  className = '',
  pageSize = 24,
  onResourceClick,
  onResourcesLoaded,
}) {
  const api = useApi()
  const { ref, inView } = useInView({
    threshold: 0.1,
    rootMargin: '100px',
  })

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['resources', searchParams],
    queryFn: async ({ pageParam = 0 }) => {
      // Use ResourceSpace API
      const results = await api.searchResources(
        searchParams.search || '',
        {
          ...searchParams,
          offset: pageParam,
          fetchrows: pageSize,
        }
      )
      
      // Process results and get preview URLs
      const resources = Array.isArray(results) ? results : []
      
      // Fetch preview URLs for resources
      const resourcesWithPreviews = await Promise.all(
        resources.map(async (resource) => {
          try {
            // Get thumbnail URL
            const thumbnailUrl = await api.getResourcePath(resource.ref, 'thm')
            // Get larger preview URL
            const previewUrl = await api.getResourcePath(resource.ref, 'pre')
            
            console.log(`Resource ${resource.ref} thumbnail:`, thumbnailUrl)
            
            return {
              ...resource,
              preview_url: thumbnailUrl,
              previews: {
                thumbnail: thumbnailUrl,
                preview: previewUrl,
              }
            }
          } catch (error) {
            console.error(`Failed to get preview for resource ${resource.ref}:`, error)
            return {
              ...resource,
              preview_url: null,
              previews: {
                thumbnail: null,
                preview: null,
              }
            }
          }
        })
      )
      
      return {
        resources: resourcesWithPreviews,
        nextOffset: pageParam + pageSize,
        hasMore: resources.length === pageSize,
      }
    },
    getNextPageParam: (lastPage) => 
      lastPage.hasMore ? lastPage.nextOffset : undefined,
  })

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const allResources = data?.pages.flatMap(page => page.resources) || []

  useEffect(() => {
    if (onResourcesLoaded && allResources.length > 0) {
      onResourcesLoaded(allResources)
    }
  }, [data?.pages, onResourcesLoaded])

  if (isLoading) {
    return <ResourceGridSkeleton />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-art-gray-400">Failed to load resources</p>
        <p className="mt-2 text-sm text-art-gray-500">{error.message}</p>
      </div>
    )
  }

  if (allResources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <ImageIcon className="h-12 w-12 text-art-gray-600" />
        <p className="mt-4 text-art-gray-400">No resources found</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-8', className)}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {allResources.map((resource, index) => (
          <ResourceCard
            key={`${resource.ref}-${index}`}
            resource={resource}
            index={index % pageSize}
            onClick={() => onResourceClick?.(resource, allResources, index)}
          />
        ))}
      </div>

      {/* Loading indicator */}
      <div ref={ref} className="flex justify-center py-8">
        {isFetchingNextPage && (
          <Loader2 className="h-8 w-8 animate-spin text-art-gray-500" />
        )}
        {!hasNextPage && allResources.length > 0 && (
          <p className="text-sm text-art-gray-500">
            No more resources to load
          </p>
        )}
      </div>
    </div>
  )
}