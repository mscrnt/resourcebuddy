# Resource Modal Management System

## Overview

The ResourceSpace Web UI now uses a centralized modal management system that ensures only one resource modal exists in the DOM at any time. This prevents modal stacking, maintains clean state management, and provides context-sensitive navigation.

## Key Features ✅

### 1. **Single Modal Instance**
- Only one `ResourceModalEnhanced` component exists in the DOM
- Managed by `ResourceModalContext` at the app root level
- Prevents modal stacking and DOM bloat
- Replaces content when new resource is opened

### 2. **Context-Sensitive Navigation**
- Tracks the context that opened the resource (Browse, Collection, Search, etc.)
- Maintains a queue of sibling resources from the same context
- Navigation arrows only move between resources from the same origin
- Queue is replaced when opening from a different context

### 3. **Background Interaction Lock**
- Body scroll disabled with `overflow: hidden` when modal is open
- Fixed positioning maintains scroll position
- Transparent overlay prevents pointer events on background
- All interactions restored when modal closes

### 4. **Resizable Metadata Panel** (Already Implemented)
- Horizontal resizing with min (280px) and max (600px) boundaries
- Drag handle on right edge of panel
- Responsive layout: stacks vertically when narrow, grid when wide
- Smooth spring animations for open/close

### 5. **Toggle Button Behavior** (Already Implemented)
- Info (i) button to the left of title when panel is hidden
- Click opens metadata panel with slide animation
- Close (×) button in top-right of panel
- Keyboard shortcut 'I' toggles panel

## Implementation

### ResourceModalContext

```javascript
// Provides centralized modal state management
const ResourceModalContext = createContext({
  modalState: {
    isOpen: false,
    resource: null,
    context: null,
    contextData: null,
    resources: [], // Queue from same context
    currentIndex: 0
  },
  openResource: (resource, options) => {},
  closeModal: () => {},
  navigateToResource: (direction) => {}
})
```

### Usage Examples

```javascript
// From Browse/Feed context
const { openResource } = useResourceModal()

openResource(resource, {
  context: 'browse',
  resources: searchResults,
  currentIndex: index,
  contextData: {
    searchParams: { query, filters },
    activeCollection: collection,
    collectionBarHeight: 52
  }
})

// From Collection context
openResource(resource, {
  context: 'collection',
  resources: collectionResources,
  currentIndex: index,
  contextData: {
    collectionId: collection.ref,
    activeCollection: collection,
    onRemoveFromCollection: handleRemove
  }
})
```

## Migration Guide

### Before (Multiple Modal Instances)
```javascript
// Each component managed its own modal
const [modalOpen, setModalOpen] = useState(false)
const [selectedResource, setSelectedResource] = useState(null)

<ResourceModalEnhanced
  resource={selectedResource}
  isOpen={modalOpen}
  onClose={() => setModalOpen(false)}
  // ... props
/>
```

### After (Centralized Management)
```javascript
// Use the context hook
const { openResource } = useResourceModal()

// Open modal with context
openResource(resource, {
  context: 'browse',
  resources: resources,
  currentIndex: index,
  contextData: { /* context-specific data */ }
})
```

## Benefits

1. **Performance**: Single modal instance reduces DOM complexity
2. **Consistency**: Unified behavior across all contexts
3. **State Management**: Centralized state prevents conflicts
4. **User Experience**: No modal stacking, clean transitions
5. **Maintainability**: Single source of truth for modal behavior

## Context Types

- `browse`: Default browsing/search results
- `collection`: Viewing from a collection
- `search`: Specific search results
- `uploads`: User's uploaded resources
- `featured`: Featured collections
- `share`: Direct link/shared resources

## Background Lock Implementation

When modal opens:
1. Current scroll position saved
2. Body set to `position: fixed` with negative top offset
3. Overflow hidden to prevent scroll
4. Transparent overlay added to capture clicks

When modal closes:
1. Body position and overflow restored
2. Scroll position restored
3. Overlay removed
4. All interactions re-enabled