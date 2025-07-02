# Metadata Panel Dynamic Resize Fix

## Issue
The metadata side panel was not resizing dynamically with the collection bar. The collection bar was overlapping the metadata panel instead of the panel adjusting its height.

## Solution Implemented

### 1. Modal Container Adjustment
Updated the main modal container to account for collection bar height:
```jsx
// ResourceModalEnhanced.jsx - line 571
<motion.div
  className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm"
  style={{
    bottom: activeCollection ? `${collectionBarHeight || 52}px` : 0
  }}
>
```

### 2. Metadata Panel Height Fix
Changed the metadata panel to use relative height (100%) instead of calculating viewport height:
```jsx
// ResourceModalEnhanced.jsx - line 598
<motion.div
  className="relative bg-art-gray-900/95 backdrop-blur-sm border-r border-art-gray-800 overflow-hidden flex-shrink-0 shadow-2xl"
  style={{ 
    width: `${metadataWidth}px`,
    height: '100%'  // Changed from calc(100vh - collectionBarHeight)
  }}
>
```

### 3. Media Container Adjustment
Removed double-accounting for collection bar in media container:
```jsx
// ResourceModalEnhanced.jsx - line 969
style={{
  top: isImageFullscreen ? 0 : '45px',
  bottom: 0,  // Changed from activeCollection && !isImageFullscreen ? collectionBarHeight : 0
  left: 0,
  right: 0,
  padding: 0
}}
```

### 4. Content Scrolling
Ensured the metadata panel content has proper scrolling:
```jsx
// ResourceModalEnhanced.jsx - line 620
<div className={cn(
  "pt-12 px-4 pb-6 h-full overflow-y-auto",  // overflow-y-auto ensures scrolling
  metadataWidth > 400 ? "px-6" : "px-4"
)}>
```

## Z-Index Hierarchy
- Collection Bar: z-index 60 (highest)
- Resource Modal: z-index 50
- This ensures collection bar stays above modal but doesn't interfere with metadata panel

## Result
1. The entire modal (including metadata panel) now adjusts its bottom position based on collection bar height
2. Metadata panel fills the available height within the adjusted modal
3. Collection bar can overlap the media preview but not the metadata panel
4. Metadata panel content scrolls properly when needed
5. Dynamic resizing works when collection bar height changes