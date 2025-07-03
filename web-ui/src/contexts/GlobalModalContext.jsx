import { createContext, useContext, useState, useCallback, useEffect } from 'react'

// Modal types enum
export const MODAL_TYPES = {
  RESOURCE: 'resource',
  ADVANCED_SEARCH: 'advanced_search',
  UPLOAD: 'upload',
  USER_PROFILE: 'user_profile',
  COLLECTION_SELECT: 'collection_select',
  DASHBOARD_TILE: 'dashboard_tile'
}

const GlobalModalContext = createContext({
  activeModal: null,
  modalData: null,
  openModal: () => {},
  closeModal: () => {},
  isModalOpen: () => false
})

export const GlobalModalProvider = ({ children }) => {
  const [activeModal, setActiveModal] = useState(null)
  const [modalData, setModalData] = useState(null)
  
  // Prevent body scroll when any modal is open
  useEffect(() => {
    if (activeModal) {
      const scrollY = window.scrollY
      
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      
      return () => {
        document.body.style.overflow = ''
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        
        window.scrollTo(0, scrollY)
      }
    }
  }, [activeModal])
  
  const openModal = useCallback((modalType, data = null) => {
    // Close any existing modal before opening a new one
    setActiveModal(modalType)
    setModalData(data)
  }, [])
  
  const closeModal = useCallback(() => {
    setActiveModal(null)
    setModalData(null)
  }, [])
  
  const isModalOpen = useCallback((modalType) => {
    return activeModal === modalType
  }, [activeModal])
  
  const contextValue = {
    activeModal,
    modalData,
    openModal,
    closeModal,
    isModalOpen
  }
  
  return (
    <GlobalModalContext.Provider value={contextValue}>
      {children}
    </GlobalModalContext.Provider>
  )
}

export const useGlobalModal = () => {
  const context = useContext(GlobalModalContext)
  if (!context) {
    throw new Error('useGlobalModal must be used within GlobalModalProvider')
  }
  return context
}

export default GlobalModalContext