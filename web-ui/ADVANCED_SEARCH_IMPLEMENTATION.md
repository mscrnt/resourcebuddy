# Advanced Search Implementation

## Overview
This implementation improves the search bar UX by adding a dedicated Advanced Search modal and an expandable filters panel that shows active search criteria.

## Key Features

### 1. Advanced Search Button
- Replaced the toggle icon with a visible "Advanced Search" text button
- Located at the right side of the search controls bar
- Styled consistently with other controls

### 2. Advanced Search Modal
Features include:
- **Text Search Options**:
  - All of these words (AND logic)
  - This exact phrase
  - Any of these words (OR logic)
  - None of these words (exclusion)
- **Resource Type Selection**: Checkboxes for all available resource types
- **Date Range**: From/To date pickers
- **Metadata Fields**:
  - Title
  - Description
  - Keywords/Tags
  - Creator/Contributor
  - Country
  - Original Filename
  - File Extension
- **Search Operator**: AND/OR toggle for combining conditions
- **Actions**: Search, Clear, Cancel buttons

### 3. Expandable Filters Panel
- Appears below the search bar when advanced filters are active
- Shows all applied filters as removable chips
- Collapsed view shows first 3 filters with count
- Expanded view allows inline editing of filters
- Smooth animation for expand/collapse
- Clear all button to reset filters

### 4. Search Synchronization
- Modal search updates the main search bar
- Filters are converted to search query syntax
- Panel stays in sync with current search state
- Supports URL parameter updates

### 5. Accessibility Features
- Full keyboard navigation support
- Tab trap in modal
- Escape key to close modal
- ARIA labels and roles
- Focus management
- Screen reader support

## Technical Implementation

### Components Created:
1. **AdvancedSearchModal.jsx** - The modal dialog for advanced search
2. **ExpandableFiltersPanel.jsx** - The inline filters display panel

### Modified Components:
1. **FloatingSearchBar.jsx** - Updated to integrate new features

### Search Query Format
The system builds search queries using this syntax:
- `+word` - Must contain word
- `-word` - Must not contain word
- `"exact phrase"` - Exact phrase match
- `field:"value"` - Field-specific search
- `date:2024-01-01..2024-12-31` - Date range
- Terms joined with space = AND
- Terms joined with OR = OR logic

## Usage Flow
1. User clicks "Advanced Search" button
2. Modal opens with search form
3. User fills in desired criteria
4. Clicking "Search" closes modal and:
   - Updates main search bar with query
   - Shows filters panel if filters applied
   - Executes search
5. User can modify filters in the panel
6. Changes are immediately reflected in results

## Future Enhancements
- Save search presets
- Search history
- More metadata fields based on resource types
- Export search results
- Batch operations on filtered results