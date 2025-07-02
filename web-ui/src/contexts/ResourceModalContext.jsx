import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import ResourceModalEnhanced from '../components/ResourceModalEnhanced'

const ResourceModalContext = createContext(null)

export const ResourceModalProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    resource: null,
    context: null,
    contextData: null, // Store context-specific data
    resources: [], // Queue of resources from the same context
    currentIndex: 0
  })

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (modalState.isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY
      
      // Lock body scroll
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      
      // Add overlay to prevent background interaction
      const overlay = document.createElement('div')
      overlay.id = 'modal-overlay'
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 40;
        pointer-events: auto;
        background: transparent;
      `
      document.body.appendChild(overlay)

      return () => {
        // Restore scroll
        const body = document.body
        const scrollY = body.style.top
        body.style.overflow = ''
        body.style.position = ''
        body.style.top = ''
        body.style.width = ''
        window.scrollTo(0, parseInt(scrollY || '0') * -1)
        
        // Remove overlay
        const overlay = document.getElementById('modal-overlay')
        if (overlay) overlay.remove()
      }
    }
  }, [modalState.isOpen])

  const openResource = useCallback((resource, options = {}) => {
    const {
      context = 'browse',
      contextData = null,
      resources = [],
      currentIndex = 0
    } = options

    setModalState({
      isOpen: true,
      resource,
      context,
      contextData,
      resources,
      currentIndex
    })
  }, [])

  const closeModal = useCallback(() => {
    setModalState(prev => ({
      ...prev,
      isOpen: false,
      resource: null
    }))
  }, [])

  const navigateToResource = useCallback((direction) => {
    setModalState(prev => {
      const { resources, currentIndex } = prev
      let newIndex = currentIndex

      if (direction === 'next' && currentIndex < resources.length - 1) {
        newIndex = currentIndex + 1
      } else if (direction === 'previous' && currentIndex > 0) {
        newIndex = currentIndex - 1
      }

      if (newIndex !== currentIndex && resources[newIndex]) {
        return {
          ...prev,
          currentIndex: newIndex,
          resource: resources[newIndex]
        }
      }

      return prev
    })
  }, [])

  const contextValue = {
    modalState,
    openResource,
    closeModal,
    navigateToResource
  }

  return (
    <ResourceModalContext.Provider value={contextValue}>
      {children}
      {/* Single modal instance */}
      {modalState.isOpen && modalState.resource && (
        <ResourceModalEnhanced
          resource={modalState.resource}
          isOpen={modalState.isOpen}
          onClose={closeModal}
          onNext={() => navigateToResource('next')}
          onPrevious={() => navigateToResource('previous')}
          hasNext={modalState.currentIndex < modalState.resources.length - 1}
          hasPrevious={modalState.currentIndex > 0}
          context={modalState.context}
          searchParams={modalState.contextData?.searchParams}
          collectionId={modalState.contextData?.collectionId}
          activeCollection={modalState.contextData?.activeCollection}
          onAddToCollection={modalState.contextData?.onAddToCollection}
          onRemoveFromCollection={modalState.contextData?.onRemoveFromCollection}
          collectionBarHeight={modalState.contextData?.collectionBarHeight || 52}
        />
      )}
    </ResourceModalContext.Provider>
  )
}

export const useResourceModal = () => {
  const context = useContext(ResourceModalContext)
  if (!context) {
    throw new Error('useResourceModal must be used within ResourceModalProvider')
  }
  return context
}

export default ResourceModalContext