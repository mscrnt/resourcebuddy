# ResourceSpace Hooks and APIs Documentation

## Key API Functions

### Resource Management
- `do_search($search, $restypes, $order_by, $archive, $fetchrows, $sort, $access_override, $starsearch, $ignore_filters, $return_disk_usage, $recent_search_daysback, $go, $stats_logging, $return_refs_only, $editable_only, $returnsql, $excludecollections, $return_deleted_resources, $collection, $return_count, $dont_check_access)`
- `get_resource_data($ref, $cache)`
- `get_resource_path($ref, $getfilepath, $size, $generate, $extension, $scramble, $page, $watermarked, $file_modified, $alternative, $includemodified, $forcefolder)`
- `create_resource($resource_type, $archive, $user, $metadata)`
- `update_resource($ref, $data)`
- `delete_resource($ref)`
- `get_resource_types($types, $translate)`

### Collection Functions
- `get_user_collections($user, $find, $order_by, $sort, $fetchrows, $auto_create, $exclude_themes, $exclude_public, $exclude_owner)`
- `get_collection($ref)`
- `get_collection_resources($collection, $sort)`
- `add_resource_to_collection($resource, $collection, $smartadd, $size, $addtype, $user)`
- `remove_resource_from_collection($resource, $collection, $smartadd)`
- `create_collection($user, $name, $allowchanges, $cant_delete, $ref, $email, $type, $parent, $hide_from_ui, $index_collection)`
- `get_featured_collections($c, $ctx, $require_series_parent)`

### Search Functions
- `search_get_previews($search, $restypes, $order_by, $archive, $fetchrows, $sort, $access_override, $starsearch, $ignore_filters, $return_disk_usage, $recent_search_daysback, $go, $stats_logging, $return_refs_only, $editable_only, $returnsql, $excludecollections, $editable_only, $count, $return_deleted_resources, $collection, $return_count)`
- `get_advanced_search_fields($archive, $hiddenfields)`
- `get_simple_search_fields()`

### API Authentication
- `api_auth($username, $querystring, $sign)`
- `execute_api_call($api_function, $params)`

## Hook System

### Core Hook Functions
- `hook($hookname, $pagename, $params)` - Main hook execution function
- `get_plugin_path($name, $validatepath)` - Get plugin path
- `register_plugin($name)` - Register a plugin
- `activate_plugin($name)` - Activate a plugin
- `deactivate_plugin($name)` - Deactivate a plugin

### Common Hook Points

#### Resource Hooks
- `HookBeforeCreateResource` - Before resource creation
- `HookAfterCreateResource` - After resource creation
- `HookBeforeUpdateResource` - Before resource update
- `HookAfterUpdateResource` - After resource update
- `HookBeforeDeleteResource` - Before resource deletion
- `HookRenderResourcePreview` - Customize resource preview rendering
- `HookResourceDownload` - On resource download
- `HookResourceUpload` - On resource upload

#### Search Hooks
- `HookSearchBeforeSearch` - Before search execution
- `HookSearchAfterSearch` - After search results
- `HookSearchFilterResults` - Filter search results
- `HookSearchCustomSort` - Custom sorting logic

#### Collection Hooks
- `HookBeforeCreateCollection` - Before collection creation
- `HookAfterCreateCollection` - After collection creation
- `HookAddResourceToCollection` - When adding resource to collection
- `HookRemoveResourceFromCollection` - When removing resource

#### UI Hooks
- `HookViewRenderResultActions` - Add actions to search results
- `HookViewRenderCollectionActions` - Add collection actions
- `HookRenderSearchBar` - Customize search bar
- `HookRenderNavigation` - Customize navigation
- `HookViewRenderResourceTools` - Add resource tools

## Plugin Structure

```
plugins/
└── plugin_name/
    ├── plugin_name.yaml      # Plugin configuration
    ├── config/              # Configuration files
    │   └── config.php
    ├── hooks/               # Hook implementations
    │   └── all.php
    ├── include/             # Plugin functions
    │   └── plugin_functions.php
    ├── languages/           # Translations
    │   └── en.php
    ├── pages/               # Plugin pages
    │   └── setup.php
    └── dbstruct/            # Database structure
        └── table.txt
```

## Performance Optimization Functions

### Caching
- `get_resource_data()` - Caches resource metadata
- `clear_query_cache()` - Clear query cache
- `load_resource_type_field_cache()` - Cache field definitions
- `hook_cache_clear()` - Clear hook cache

### Batch Operations
- `copy_resource_nodes()` - Batch copy metadata
- `relate_all_resources()` - Batch relate resources
- `ProcessFolder()` - Batch import resources

### Background Jobs
- `job_queue_add()` - Add job to queue
- `job_queue_run()` - Process job queue
- `cron_process_jobs()` - Cron job processing

## Database Functions

### Query Execution
- `ps_query($sql, $parameters, $cache_name, $fetchrows, $logthis, $cache_specific_query)` - Prepared statement query
- `ps_value($sql, $parameters, $default, $cache)` - Get single value
- `ps_array($sql, $parameters, $cache)` - Get array result
- `sql_limit_with_total_count($sql, $start, $limit)` - Paginated queries

### Resource Metadata
- `get_resource_field_data($ref, $multi, $use_permissions, $external_access, $ord_by)` - Get all metadata
- `update_field($resource, $field, $value, $nodevalues, $logthis, $save_to_nodes)` - Update metadata
- `add_keyword_mappings($ref, $string, $resource_type_field, $partial_index, $is_date, $is_html, $is_regexp, $tokenize)` - Index keywords