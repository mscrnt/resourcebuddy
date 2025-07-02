import { createContext, useContext, useState, useCallback } from 'react'

const CollectionBarContext = createContext({
  collectionBarHeight: 52,
  isCollectionBarVisible: false,
  setCollectionBarHeight: () => {},
  setIsCollectionBarVisible: () => {}
})

export const CollectionBarProvider = ({ children }) => {
  const [collectionBarHeight, setCollectionBarHeight] = useState(52)
  const [isCollectionBarVisible, setIsCollectionBarVisible] = useState(false)

  const updateCollectionBarHeight = useCallback((height) => {
    setCollectionBarHeight(height)
  }, [])

  const updateIsCollectionBarVisible = useCallback((visible) => {
    setIsCollectionBarVisible(visible)
  }, [])

  const contextValue = {
    collectionBarHeight,
    isCollectionBarVisible,
    setCollectionBarHeight: updateCollectionBarHeight,
    setIsCollectionBarVisible: updateIsCollectionBarVisible
  }

  return (
    <CollectionBarContext.Provider value={contextValue}>
      {children}
    </CollectionBarContext.Provider>
  )
}

export const useCollectionBar = () => {
  const context = useContext(CollectionBarContext)
  if (!context) {
    throw new Error('useCollectionBar must be used within CollectionBarProvider')
  }
  return context
}

export default CollectionBarContext