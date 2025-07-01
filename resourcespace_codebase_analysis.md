# ResourceSpace Codebase Analysis

## Overview
ResourceSpace is a Digital Asset Management (DAM) system built in PHP. The codebase is well-structured with clear separation of concerns and a plugin architecture for extensibility.

## Directory Structure

### Core Directories
- **`/include/`** - Core PHP functions and system files
- **`/pages/`** - Web-accessible pages and UI components
- **`/plugins/`** - Modular plugins extending core functionality
- **`/api/`** - API endpoints and handlers
- **`/batch/`** - Batch processing and cron jobs
- **`/css/`** - Stylesheets and UI themes
- **`/js/`** - JavaScript files
- **`/languages/`** - Internationalization files
- **`/lib/`** - Third-party libraries
- **`/dbstruct/`** - Database structure definitions

## Key Function Files

### 1. Resource Functions (`/include/resource_functions.php`)
Core functions for managing resources (digital assets):
- `get_resource_path()` - Get file paths/URLs for resources
- Resource creation, editing, and indexing functions
- File handling and preview generation
- Support for alternative files and multiple sizes

### 2. Collection Functions (`/include/collections_functions.php`)
Functions for managing collections of resources:
- `get_user_collections()` - Retrieve user's collections
- Collection creation, sharing, and management
- Support for different collection types (standard, public, featured)
- Collection-based permissions

### 3. Search Functions (`/include/search_functions.php`)
Search and discovery functionality:
- `resolve_soundex()` - Phonetic keyword matching
- `suggest_refinement()` - Search refinement suggestions
- `get_advanced_search_fields()` - Advanced search field management
- Full-text and metadata search capabilities

### 4. API Functions (`/include/api_functions.php`, `/include/api_bindings.php`)
RESTful API implementation:
- `get_api_key()` - Generate API keys for users
- `check_api_key()` - Validate API requests
- `execute_api_call()` - Process API function calls
- API bindings for core functions like:
  - `api_do_search()` - Search resources
  - `api_search_get_previews()` - Get preview URLs
  - `api_get_resource_field_data()` - Get resource metadata
  - `api_create_resource()` - Create new resources

## Hook System

ResourceSpace implements a powerful hook system for extensibility:

### Hook Function (`/include/general_functions.php`)
```php
function hook($name, $pagename = "", $params = array(), $last_hook_value_wins = false)
```

### Hook Naming Convention
- Format: `Hook[PluginName][PageName][HookName]`
- Example: `HookAction_datesAllInitialise()`
- "All" hooks run on every page

### Hook Features
- **Caching**: Hook results are cached for performance
- **Parameter passing**: Hooks receive parameters from calling code
- **Return value handling**: Supports merging results from multiple hooks
- **Global return value**: `$GLOBALS['hook_return_value']` for direct manipulation

## Plugin Architecture

### Plugin Structure
Each plugin contains:
- **`[plugin_name].yaml`** - Plugin metadata and configuration
- **`/config/`** - Configuration files
- **`/hooks/`** - Hook implementations
- **`/include/`** - Plugin-specific functions
- **`/languages/`** - Plugin translations
- **`/pages/`** - Plugin UI pages
- **`/dbstruct/`** - Database schema additions

### Example Plugin: Action Dates
- Scheduled resource actions based on date fields
- Implements cron hooks for automated processing
- Adds workflow capabilities for resource lifecycle management

## Database Functions (`/include/database_functions.php`)

### Prepared Statements
- `PreparedStatementQuery` class for SQL building
- Parameter binding for security
- Support for complex queries with joins

### Database Abstraction
- `ps_query()` - Execute prepared queries
- `ps_value()` - Get single value
- `ps_array()` - Get array of values
- Transaction support

## Performance & Caching

### Caching Mechanisms
1. **Hook Cache** - Caches hook function lookups
2. **Resource Path Cache** - Caches file paths
3. **User Permission Cache** - Caches permission checks
4. **Search Cache** - Caches search results
5. **Configuration Cache** - Caches system configuration

### Performance Features
- Lazy loading of resources
- Batch processing capabilities
- Background job queue system
- Optimized database queries with indexes

## Security Features

1. **Permission System**
   - User and group-based permissions
   - Resource-level access control
   - Field-level permissions

2. **API Security**
   - SHA256-based request signing
   - Session and user key authentication
   - Rate limiting capabilities

3. **Input Validation**
   - Prepared statements for SQL
   - File extension validation
   - Path traversal prevention

## Key Global Variables
- `$baseurl` - Base URL of installation
- `$storagedir` - File storage directory
- `$scramble_key` - Key for scrambling file paths
- `$plugins` - Active plugins array
- `$lang` - Language strings

## Workflow Integration Points

### Resource Lifecycle
1. Upload/Creation hooks
2. Metadata editing hooks
3. Download/Access hooks
4. Deletion/Archive hooks

### Collection Management
1. Collection creation/deletion
2. Resource addition/removal
3. Sharing and permissions

### Search & Discovery
1. Search preprocessing
2. Result filtering
3. Faceted search hooks

## Best Practices for Extension Development

1. **Use Hooks** - Don't modify core files
2. **Follow Naming Conventions** - Use plugin prefix
3. **Implement Permissions** - Check user permissions
4. **Handle Errors Gracefully** - Use try/catch blocks
5. **Cache When Possible** - Use built-in caching
6. **Document Your Code** - Add PHPDoc comments
7. **Test Thoroughly** - Test with different user types

## Integration Opportunities

1. **External Storage** - Hook into file storage functions
2. **Authentication** - SSO via authentication hooks
3. **Workflow Automation** - Use cron and action hooks
4. **Custom Metadata** - Add custom fields via plugins
5. **API Extensions** - Add custom API endpoints
6. **UI Customization** - Override templates and add pages