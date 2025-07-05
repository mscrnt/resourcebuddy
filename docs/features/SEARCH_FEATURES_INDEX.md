# Search Features Documentation Index

## Overview
ResourceBuddy provides multiple search interfaces to accommodate different user needs and skill levels. This index helps you navigate to the appropriate documentation for each search feature.

## Search Features

### 1. [Advanced Search Modal](./ADVANCED_SEARCH_COMPLETE.md)
**Purpose**: Enterprise-grade search interface with extensive filtering capabilities  
**Best For**: Power users who need precise control over search parameters  
**Key Features**:
- Full metadata field filtering
- Boolean search operators
- Date range filtering
- Resource type selection
- Field-specific searches

### 2. [Guided Search System](./GUIDED_SEARCH_SYSTEM.md)
**Purpose**: Step-by-step wizard interface for building complex searches  
**Best For**: Users who want guidance through the search process  
**Key Features**:
- 4-step search building process
- Visual search construction
- Search presets and templates
- Plain English summaries
- Dual mode (Guided/Advanced)

### 3. [Metadata Click Search](./METADATA_CLICK_SEARCH.md)
**Purpose**: Quick search by clicking on metadata values  
**Best For**: Exploratory searching and finding similar resources  
**Key Features**:
- Click any metadata value to search
- Instant navigation to filtered results
- Visual feedback on hover

## Feature Comparison

| Feature | Advanced Search | Guided Search | Click Search |
|---------|----------------|---------------|--------------|
| Learning Curve | Medium-High | Low | None |
| Search Complexity | Very High | High | Low |
| User Guidance | Tooltips | Step-by-step | None |
| Best Use Case | Precise queries | Complex searches | Quick exploration |
| Interface Type | Single modal | Wizard | Inline |
| Saves Searches | No | Yes | No |
| Presets | No | Yes | No |

## Implementation Timeline

1. **Phase 1**: Basic Advanced Search implementation
2. **Phase 2**: Enhanced with dynamic metadata fields
3. **Phase 3**: Layout and responsiveness improvements
4. **Phase 4**: Enterprise features and polish
5. **Phase 5**: Guided Search System introduction
6. **Phase 6**: Metadata Click Search addition

## Technical Architecture

All search features integrate with the ResourceSpace API through a unified backend:

```
Frontend Components
    ↓
resourcespace-api-backend.js
    ↓
Backend API (/api/search)
    ↓
ResourceSpace do_search API
```

## Search Syntax Reference

All search features ultimately generate ResourceSpace-compatible search queries:

- **Keywords**: `+must -exclude "exact phrase"`
- **Fields**: `fieldname:value` or `fieldname:value1;value2`
- **Dates**: `fieldname:rangestart2024-01-01end2024-12-31`
- **Special**: `!duplicates`, `!nodownloads`, `!empty54`
- **Attributes**: `extension:jpg`, `filesize:>1048576`

## Getting Started

- **New Users**: Start with [Guided Search](./GUIDED_SEARCH_SYSTEM.md)
- **Power Users**: Use [Advanced Search](./ADVANCED_SEARCH_COMPLETE.md)
- **Exploring**: Try [Click Search](./METADATA_CLICK_SEARCH.md) on any resource

## Support

For implementation details, API references, or troubleshooting, refer to the individual documentation files linked above.