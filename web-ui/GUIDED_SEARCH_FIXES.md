# Guided Search System - Fixes and Updates

## Overview
Updated the Guided Search system to properly implement ResourceSpace's search syntax and API integration based on the official documentation.

## Key Changes

### 1. Search/Cancel Buttons in Advanced Mode
- Added footer with Search and Cancel buttons to Advanced mode
- Users can now clearly see how to execute searches in both Guided and Advanced modes
- Consistent UI experience across both modes

### 2. Tooltip Overflow Fix
- Changed tooltip component to use React Portal rendering to document body
- Increased z-index to 10000 to ensure tooltips appear above all content
- Tooltips now properly overflow modal boundaries without being cut off
- Smart positioning to keep tooltips within viewport

### 3. ResourceSpace Search Syntax Implementation

#### Query Building Logic
Updated to follow ResourceSpace's exact syntax requirements:

**Special Searches** (must come first):
- `!duplicates` - Find duplicate resources
- `!nodownloads` - Never downloaded resources
- `!empty[fieldId]` - Resources with empty field
- `!hasdata[fieldId]` - Resources with data in field

**Keywords**:
- All words: `+word1 +word2` (each word prefixed with +)
- Any words: `word1 word2` (no prefix needed)
- Exact phrase: `"exact phrase"`
- Exclude: `-word1 -word2` (each word prefixed with -)

**Field-Specific Searches**:
- Single value: `fieldname:"value"`
- Multiple values (OR): `fieldname:value1;value2;value3`
- Exclude value: `-fieldname:"value"`
- Date range: `fieldname:rangestart2019-01-01end2019-12-31`
- Date after: `fieldname:rangestart2019-01-01`
- Date before: `fieldname:rangeend2019-12-31`

**File Attributes**:
- File types: `extension:jpg;png;pdf`
- File size range: `filesize:1048576..10485760` (in bytes)
- File size min: `filesize:>1048576`
- File size max: `filesize:<10485760`
- Image width: `imagewidth:1920` or `imagewidth:>1920`
- Image height: `imageheight:1080` or `imageheight:<1080`

**Contributors**:
- Uploaded by me: `contributedby:me`
- Specific users: `contributedby:user1;user2`

### 4. API Integration
Added `doSearch` function to resourcespace-api-backend.js:
```javascript
doSearch(search, restypes, orderBy, archive, fetchrows, sort, offset, sessionKey)
```

Parameters match ResourceSpace's do_search API:
- `search`: Search string in RS format
- `restypes`: Resource type IDs (e.g., "1,2")
- `orderBy`: relevance, popularity, rating, date, etc.
- `archive`: 0=active, 1=pending archive, etc.
- `fetchrows`: Max rows or "offset,limit" for pagination
- `sort`: "asc" or "desc"
- `offset`: Starting offset

### 5. Metadata Field Handling
- Field references now properly use field shortnames
- Multiple values within a field use semicolon (;) separator
- AND/OR logic properly implemented for field values
- Empty/not empty field searches use `!empty[id]` and `!hasdata[id]`

## Search Examples

### Simple Search
- Photos from Japan: `+photo +japan`
- Marketing but not advertising: `marketing -advertising`

### Field-Specific Search
- Country is Spain or Italy: `country:spain;italy`
- Title contains dragon: `title:"dragon"`
- High resolution images: `imagewidth:>1920 imageheight:>1080`

### Date Range Search
- Last month: `createdate:rangestart2024-02-01end2024-02-29`
- After January 2024: `createdate:rangestart2024-01-01`

### Complex Search
```
!duplicates +photo country:spain;italy createdate:rangestart2024-01-01 extension:jpg;png imagewidth:>1920
```

This searches for:
- Duplicate detection
- Must contain "photo"
- From Spain or Italy
- Created after Jan 1, 2024
- JPG or PNG format
- Width greater than 1920px

## Benefits
1. **Proper RS Integration**: Searches now use exact ResourceSpace syntax
2. **Better UX**: Clear action buttons in both modes
3. **No UI Bugs**: Tooltips display properly without cutoff
4. **Reliable Searches**: Query building follows RS documentation exactly
5. **Future-Proof**: Easy to extend with new RS search features