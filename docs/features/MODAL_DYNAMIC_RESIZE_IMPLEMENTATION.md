# Resource Modal Dynamic Resize Implementation

## Problem
The resource modal was not dynamically resizing based on the collection bar height. The modal should always touch the top of the collection bar and resize its content accordingly.

## Solution

### 1. Created CollectionBarContext
A new context to globally track collection bar state:

```jsx
// src/contexts/CollectionBarContext.jsx
const CollectionBarContext = createContext({
  collectionBarHeight: 52,
  isCollectionBarVisible: false,
  setCollectionBarHeight: () => {},
  setIsCollectionBarVisible: () => {}
})
```

### 2. Updated CollectionBarFooter
The collection bar now reports its height to the global context:

```jsx
// src/components/CollectionBarFooter.jsx
const { setCollectionBarHeight, setIsCollectionBarVisible } = useCollectionBar()

// Update context whenever height or visibility changes
useEffect(() => {
  if (isEnabled) {
    setCollectionBarHeight(currentHeight)
    setIsCollectionBarVisible(true)
  } else {
    setIsCollectionBarVisible(false)
  }
}, [currentHeight, isEnabled, setCollectionBarHeight, setIsCollectionBarVisible])
```

### 3. Updated ResourceModalEnhanced
The modal now uses the global collection bar state:

```jsx
// src/components/ResourceModalEnhanced.jsx
const { collectionBarHeight, isCollectionBarVisible } = useCollectionBar()

// Modal container adjusts bottom based on collection bar
<motion.div
  className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm"
  style={{
    bottom: isCollectionBarVisible ? `${collectionBarHeight}px` : 0
  }}
>
```

### 4. Content Resizing
- Metadata panel: Uses relative height (100%) within the adjusted modal container
- Image viewer: Calculates available space accounting for collection bar
- Video player: Contained within the adjusted modal bounds

## Key Features

1. **Dynamic Height Tracking**: Collection bar height changes are immediately reflected in the modal
2. **No Overlap**: Modal always sits perfectly on top of collection bar
3. **Content Adaptation**: All modal content (metadata, media) adjusts to available space
4. **Smooth Transitions**: Height changes animate smoothly
5. **Visibility Aware**: Modal extends to bottom when collection bar is hidden

## Testing
1. Open a resource modal with collection bar visible
2. Resize collection bar by dragging the handle
3. Toggle collection bar visibility
4. Verify modal adjusts dynamically in all cases