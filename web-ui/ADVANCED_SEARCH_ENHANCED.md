# Enhanced Advanced Search Implementation

## Overview
The Advanced Search Modal has been completely redesigned to provide a powerful, flexible search interface that supports ResourceSpace's complex metadata system while remaining user-friendly.

## Key Features

### 1. Expanded Modal Layout (95% Viewport)
- Full-screen modal experience with organized grid layout
- Three-column design:
  - **Left**: Text search and resource types
  - **Middle**: Global metadata fields
  - **Right**: Type-specific metadata fields
- Collapsible sections with chevron indicators
- Smooth animations with Framer Motion

### 2. Dynamic Metadata Field Loading
- Uses `get_resource_type_fields` API to fetch fields with:
  - `advanced_search === true`
  - `display_field === true`
  - `active === 1`
- Fields are automatically grouped into:
  - **Global Fields**: Available for all resource types
  - **Type-Specific Fields**: Filtered based on selected resource types
- Real-time updates when resource types are selected/deselected

### 3. Smart Input Components

#### Field Type Detection
The system automatically detects field types and renders appropriate inputs:

| Field Type | RS Type IDs | Input Widget | Features |
|------------|-------------|--------------|----------|
| Text | 0, 1, 8 | Text input/Textarea | Standard text entry |
| Date | 4, 6, 10 | Date picker | Single date or date range |
| Checkbox | 7 | Radio group | Yes/No/Any/Not empty options |
| Fixed List | 2, 3 | Dropdown | Single or multi-select |
| Category | 12 | Category Tree | Hierarchical tree with expand/collapse |
| Large List | 2, 3 (>20 items) | Token Input | Autocomplete with tag-style tokens |

#### Component Features
- **CategoryTree**: Hierarchical navigation with folder icons
- **TokenInput**: Live search using `get_nodes` API, keyboard navigation
- **Dropdown**: Supports single and multi-select with checkmarks
- **Date fields**: Native date pickers with calendar icons

### 4. ResourceSpace-Compatible Query Generation
The system generates proper RS search syntax:

```
// Text modifiers
+word     // Must include
-word     // Must exclude
"phrase"  // Exact phrase

// Field searches
country:japan              // Single value
country:japan;korea        // Multiple values (OR within field)
date:2024-01-01..2024-12-31  // Date range
!empty54                   // Field 54 not empty

// Operators
AND - All conditions must match
OR - Any condition can match
```

### 5. Enhanced Filter Panel
- Displays active filters as removable chips
- Each chip shows field name and value
- Inline editing in expanded view
- Smooth expand/collapse animation
- Clear all functionality

### 6. User Experience Enhancements

#### Search Tips Tooltip
- Floating help panel with search syntax examples
- Organized by category: Text, Fields, Special, Operators
- Code examples with syntax highlighting

#### Accessibility
- Full keyboard navigation with tab trap
- ESC key to close modal
- ARIA labels and roles
- Focus management
- Screen reader support

#### Visual Feedback
- Loading spinners for async operations
- Hover states on all interactive elements
- Selected state indicators
- Smooth transitions and animations

## Technical Architecture

### Component Structure
```
AdvancedSearchModal/
├── index.jsx          // Main modal component
├── FieldInput.jsx     // Smart field renderer
├── CategoryTree.jsx   // Hierarchical tree component
├── TokenInput.jsx     // Tag-style autocomplete
└── SearchTooltip.jsx  // Help tooltip
```

### State Management
- Local state for form values
- Dynamic field loading based on resource types
- Debounced search for autocomplete
- Optimized re-renders with useMemo

### API Integration
- `getResourceTypes()` - Load available resource types
- `getResourceTypeFields()` - Load metadata fields
- `getFieldOptions()` - Load dropdown options
- `getNodes()` - Search within large lists

## Usage Example

1. User clicks "Advanced Search" button
2. Modal opens with collapsible sections
3. User selects resource types (optional)
4. Type-specific fields appear dynamically
5. User fills in search criteria using smart inputs
6. Search query is built automatically
7. Results show with filter panel below search bar
8. User can refine search using the filter panel

## Future Enhancements
- Save/load search presets
- Recent searches history
- Live result count preview
- Bulk actions on filtered results
- Export search results
- Custom field ordering