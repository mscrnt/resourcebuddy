# Guided Search System for ResourceBuddy

## Overview
The Guided Search System is a complete rebuild of the Advanced Search functionality, designed to make searching intuitive and powerful for both novice and advanced users. It features a step-by-step wizard interface, visual search building, and intelligent guidance throughout the process.

## Key Features

### 1. Step-by-Step Search Building
The search process is broken into 4 logical steps:

**Step 1: What are you looking for?**
- Keywords with logic options (all/any/phrase/exclude)
- File type selection with presets and custom types
- Contributor/uploader filtering

**Step 2: Add specific filters**
- Date range with quick presets
- Metadata fields with smart categorization
- File attributes (size, dimensions)
- Special searches (duplicates, never downloaded, etc.)

**Step 3: Choose filter logic**
- Visual explanation of AND vs OR logic
- Field-level logic for multi-value fields
- Real-time logic visualization

**Step 4: Review & search**
- Plain English summary with editable chips
- Save search functionality
- Technical query preview

### 2. Dual Mode Interface
- **Guided Mode**: Step-by-step wizard for beginners
- **Advanced Mode**: All options on one screen for power users
- Seamless switching between modes

### 3. Smart Field Input System
Each metadata field gets an appropriate input based on its type:
- **Text fields**: Single/multi-value with AND/OR/NOT operators
- **Date fields**: Date pickers with range support
- **List fields**: Dropdowns for small lists, token inputs for large lists
- **Category fields**: Hierarchical tree navigation
- **Checkboxes**: Yes/No/Any/Not empty options

### 4. AND/OR/NOT Logic Within Fields
Users can add multiple values to any field and control how they combine:
- `title:dragon OR phoenix` - Match either word
- `keywords:nature AND landscape` - Must have both
- `creator:!john` - Exclude this creator

### 5. Search Presets
Quick-start templates for common searches:
- Find My Uploads
- Recent Images
- High Resolution Images
- Never Downloaded
- This Week's Uploads
- Find Duplicates
- And more...

### 6. Saved Searches
- Save any search with a custom name
- Quickly reload saved searches
- Manage saved searches (view, run, delete)
- Persisted in localStorage

### 7. Dynamic Result Count
- Real-time result count as filters are added
- Helps users understand impact of each filter
- Prevents dead-end searches

### 8. Visual Search Building
- Filters displayed as removable/editable chips
- Color coding for different filter types
- Plain English summaries
- Inline editing capability

### 9. Intelligent Guidance
- Tooltips explain every feature
- Examples shown for complex syntax
- Visual indicators guide users
- No technical jargon

### 10. Full ResourceSpace Compatibility
Generates proper RS search syntax:
```
// Text modifiers
+word (must include)
-word (must exclude)
"exact phrase"

// Field searches
country:japan
country:japan;korea (OR)
date:2024-01-01..2024-12-31
!empty54

// Special searches
!duplicates
!nodownloads
```

## Technical Implementation

### Component Structure
```
GuidedSearchModal/
├── index.jsx           // Main modal orchestrator
├── StepOne.jsx        // Keywords, file types, contributors
├── StepTwo.jsx        // Filters and metadata
├── StepThree.jsx      // Logic configuration
├── StepFour.jsx       // Review and save
├── MetadataFieldInput.jsx  // Smart field input component
├── SearchPresets.jsx  // Preset templates
└── SavedSearches.jsx  // Saved search management
```

### State Management
The search state is centralized in the main modal component:
```javascript
{
  // Step 1
  keywords: '',
  keywordLogic: 'all|any|phrase|exclude',
  fileTypes: [],
  contributors: [],
  uploadedBy: 'anyone|me|specific',
  
  // Step 2
  dateRange: { from, to },
  metadataFields: { fieldId: { value, operator, logic } },
  fileAttributes: { size, dimensions },
  specialSearches: [],
  
  // Step 3
  globalOperator: 'all|any',
  fieldOperators: { fieldId: 'and|or' },
  
  // Step 4
  searchName: '',
  saveSearch: boolean
}
```

### Query Building
The system builds ResourceSpace-compatible queries:
1. Processes keywords based on logic setting
2. Adds file type filters
3. Builds metadata field queries with proper syntax
4. Includes date ranges and special searches
5. Combines with selected global operator

## User Experience Flow

### For Beginners
1. Open search → See friendly presets
2. Choose preset or start fresh
3. Follow guided steps with clear explanations
4. See search building in plain English
5. Execute search with confidence

### For Power Users
1. Switch to Advanced Mode
2. Access all fields at once
3. Use keyboard shortcuts
4. Build complex queries quickly
5. Save frequently used searches

## Benefits

### For Users
- No need to learn search syntax
- Visual feedback at every step
- Can't make syntax errors
- Discover search capabilities naturally
- Save time with presets and saved searches

### For Administrators
- Reduced support requests
- Users utilize more search features
- Better resource discovery
- Consistent search behavior
- Extensible for new field types

## Future Enhancements
- Search templates by role/department
- Shared saved searches
- Search analytics
- AI-powered search suggestions
- Bulk operations on results
- Export search results
- Search scheduling