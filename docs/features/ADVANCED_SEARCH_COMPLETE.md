# Advanced Search Modal - Complete Documentation

## Overview

The Advanced Search Modal provides a sophisticated, enterprise-grade search interface for ResourceSpace with extensive filtering capabilities. It features a responsive design, dynamic metadata field loading, and an intuitive user experience suitable for professional digital asset management.

## Key Features

### 1. Modal Design
- **Full-screen coverage**: 95% viewport width/height with backdrop
- **Responsive layout**: Adapts to mobile, tablet, and desktop screens
- **Background scroll lock**: Prevents background scrolling when modal is open
- **Smooth animations**: Framer Motion powered entrance/exit animations

### 2. Search Capabilities

#### Text Search Section
- **Search Type Toggle**: Switch between Basic and Boolean search modes
- **Basic Search**: Simple text matching with field selection
- **Boolean Search**: Advanced queries with AND/OR operators
- **Field-specific search**: Target specific fields (All fields, Title, Keywords, etc.)

#### Resource Type Filtering
- **Dynamic loading**: Resource types fetched from ResourceSpace API
- **Visual selection**: Toggle buttons with active state indication
- **Persistence**: Selected types saved to localStorage
- **Grouped display**: "Image Types" and "Other Types" organization

#### Date Range Filtering
- **Created Date Range**: Filter by resource creation date
- **Modified Date Range**: Filter by last modification date
- **Date picker interface**: Native HTML5 date inputs

#### Metadata Fields
- **Dynamic field loading**: Fields fetched based on selected resource types
- **Smart input components**: Field type determines input interface
- **Grouped organization**: Fields organized by category
- **Field descriptions**: Tooltips with field information

### 3. User Interface Components

#### Search Tips Tooltip
- Hover-activated help system
- Examples for different search types
- Boolean search operators guide

#### Expandable Filters Panel
- Collapsible sections for better organization
- Smooth expand/collapse animations
- State persistence across searches

#### Field Type Mapping
| ResourceSpace Type | Component | Features |
|-------------------|-----------|----------|
| 0 (Text) | TextField | Single line input |
| 1 (Multi-line) | TextArea | Multi-line input |
| 2 (Checkbox) | Checkboxes | Multiple selection |
| 3 (Dropdown) | Dropdown | Single selection |
| 4 (Date) | DatePicker | Date selection |
| 5 (Expiry Date) | DatePicker | Date selection |
| 6 (Date Range) | DateRange | Start/End dates |
| 7 (Category Tree) | TreeSelect | Hierarchical selection |
| 8 (Large Text) | TextArea | Multi-line input |
| 9 (Dynamic Keywords) | DynamicKeywords | Tag-style input |
| 10 (Date/Time) | DateTimePicker | Date and time |
| 12 (Radio Buttons) | RadioButtons | Single selection |

## Technical Implementation

### Component Architecture

```
AdvancedSearchModal/
├── AdvancedSearchModal.jsx (Main component)
├── hooks/
│   └── useAdvancedSearch.js (Search logic)
├── components/
│   ├── ExpandableFiltersPanel.jsx
│   ├── SearchTypeToggle.jsx
│   ├── ResourceTypeSelector.jsx
│   ├── DateRangeInputs.jsx
│   └── MetadataFieldInputs.jsx
└── context/
    └── ModalContext.jsx (Global modal management)
```

### State Management
- **Global Modal Context**: Centralized modal state management
- **Local Component State**: Form inputs and UI state
- **localStorage**: Persistence for user preferences

### API Integration

#### Resource Types Endpoint
```javascript
GET /api/resource-types
Response: Array of resource type objects with fields configuration
```

#### Search Endpoint
```javascript
POST /api/search
Body: {
  search: "query string",
  restypes: "1,2,3",
  metadata_search: 1,
  archive: 0,
  // ... other parameters
}
```

### Search Query Construction

The search query builder handles various input types and constructs ResourceSpace-compatible queries:

1. **Basic Text Search**: `field8:landscape`
2. **Boolean Search**: `field8:landscape AND field3:high`
3. **Date Range**: `startdate:2024-01-01&enddate:2024-12-31`
4. **Metadata Fields**: Dynamic based on field type

### Performance Optimizations

- **Debounced API calls**: Prevents excessive requests
- **Memoized components**: React.memo for expensive renders
- **Lazy loading**: Fields loaded only when needed
- **Efficient re-renders**: Careful state management

## Usage Examples

### Basic Search
```javascript
// Search for "sunset" in titles
{
  searchText: "sunset",
  searchType: "basic",
  selectedField: "field8"
}
```

### Advanced Boolean Search
```javascript
// Complex query with multiple conditions
{
  searchText: "sunset AND beach",
  searchType: "boolean",
  resourceTypes: ["1", "3"],
  dateCreatedFrom: "2024-01-01",
  metadata: {
    field52: "California",
    field54: ["landscape", "nature"]
  }
}
```

### Programmatic Usage
```javascript
import { useModalContext } from './contexts/ModalContext';

function MyComponent() {
  const { openAdvancedSearch } = useModalContext();
  
  const handleSearchClick = () => {
    openAdvancedSearch({
      onSearch: (results) => {
        console.log('Search results:', results);
      },
      initialFilters: {
        resourceTypes: ['1']
      }
    });
  };
}
```

## Accessibility Features

- **Keyboard Navigation**: Full tab navigation support
- **ARIA Labels**: Proper labeling for screen readers
- **Focus Management**: Trap focus within modal
- **Escape Key**: Close modal with ESC
- **High Contrast**: Supports system color preferences

## Mobile Responsiveness

### Breakpoints
- **Mobile**: < 640px (single column layout)
- **Tablet**: 640px - 1024px (two column layout)
- **Desktop**: > 1024px (three column layout)

### Mobile Optimizations
- Touch-friendly tap targets (min 44px)
- Simplified layout for small screens
- Native mobile inputs where appropriate
- Optimized scroll behavior

## Future Enhancements

1. **Saved Searches**: Allow users to save and reuse search configurations
2. **Search Templates**: Pre-configured searches for common use cases
3. **Export Options**: Export search results in various formats
4. **Advanced Operators**: Support for more complex search operators
5. **Visual Query Builder**: Drag-and-drop interface for building queries

## Version History

- **v1.0**: Initial implementation with basic features
- **v2.0**: Enhanced with dynamic metadata fields
- **v3.0**: Layout improvements and responsive design
- **v4.0**: Enterprise features and accessibility compliance