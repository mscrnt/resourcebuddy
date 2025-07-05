import { useState, useEffect, useRef, memo } from 'react'
import { useInView } from 'react-intersection-observer'
import { cn } from '../lib/utils'

const LazyImage = memo(({ 
  src, 
  alt, 
  className, 
  onError,
  placeholderSrc = null,
  threshold = 0.1,
  rootMargin = '50px',
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imageRef = useRef(null)
  
  // Use intersection observer for lazy loading
  const { ref, inView } = useInView({
    threshold,
    rootMargin,
    triggerOnce: true
  })

  // Preload image when in view
  useEffect(() => {
    if (inView && src && !isLoaded && !hasError) {
      const img = new Image()
      img.src = src
      img.onload = () => {
        setIsLoaded(true)
      }
      img.onerror = () => {
        setHasError(true)
        if (onError) onError()
      }
    }
  }, [inView, src, isLoaded, hasError, onError])

  return (
    <div ref={ref} className={cn('relative overflow-hidden', className)}>
      {/* Placeholder/Loading state */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 animate-pulse" />
      )}
      
      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
          <div className="text-gray-400 dark:text-gray-600">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      )}
      
      {/* Actual image */}
      {inView && !hasError && (
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          onError={() => {
            setHasError(true)
            if (onError) onError()
          }}
          {...props}
        />
      )}
    </div>
  )
})

LazyImage.displayName = 'LazyImage'

export default LazyImage