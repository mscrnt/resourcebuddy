# ResourceBuddy Documentation

Welcome to the ResourceBuddy documentation. This folder contains all technical documentation, guides, and references for the project.

## Documentation Structure

### 📋 [Setup](./setup/)
Installation and configuration guides
- [Setup Guide](./setup/SETUP_GUIDE.md) - Initial setup and installation

### 🎯 [Features](./features/)
Documentation for all features and functionality
- **Search Features**
  - [Search Features Index](./features/SEARCH_FEATURES_INDEX.md) - Overview of all search capabilities
  - [Advanced Search](./features/ADVANCED_SEARCH_COMPLETE.md) - Enterprise search interface
  - [Guided Search System](./features/GUIDED_SEARCH_SYSTEM.md) - Step-by-step search wizard
  - [Metadata Click Search](./features/METADATA_CLICK_SEARCH.md) - Quick search by clicking metadata
- **UI Components**
  - [Modal Improvements](./features/MODAL_IMPROVEMENTS.md) - Enhanced modal system
  - [Resource Modal Management](./features/RESOURCE_MODAL_MANAGEMENT.md) - Resource preview modals
  - [Modal Dynamic Resize](./features/MODAL_DYNAMIC_RESIZE_IMPLEMENTATION.md) - Responsive modal sizing
  - [Metadata Panel Redesign](./features/METADATA_PANEL_REDESIGN.md) - Enhanced metadata display
  - [Metadata Panel Resize Fix](./features/METADATA_PANEL_RESIZE_FIX.md) - Panel resizing improvements
  - [Test Modal Fix](./features/TEST_MODAL_FIX.md) - Modal testing fixes
- **Other Features**
  - [Admin Panel Improvements](./features/ADMIN_PANEL_IMPROVEMENTS.md) - Admin interface enhancements
  - [Authentication Flow](./features/AUTHENTICATION_FLOW.md) - User authentication system
  - [Sorting Feature](./features/SORTING_FEATURE.md) - Resource sorting capabilities

### 🔧 [Technical](./technical/)
Technical documentation and architecture details
- [Cache System Documentation](./technical/CACHE_SYSTEM_DOCUMENTATION.md) - Caching architecture
- [Cache Performance Explained](./technical/CACHE_PERFORMANCE_EXPLAINED.md) - Performance optimization
- [Upload Workflow Changes](./technical/UPLOAD_WORKFLOW_CHANGES.md) - File upload improvements
- [Upload Fix Summary](./technical/UPLOAD_FIX_SUMMARY.md) - Upload bug fixes
- [CORS Setup](./technical/CORS_SETUP.md) - Cross-origin configuration

### 🔌 [API](./api/)
API documentation and integration guides
- [ResourceSpace Hooks and APIs](./api/RS_HOOKS_AND_APIS.md) - RS API reference
- [ResourceSpace Codebase Analysis](./api/resourcespace_codebase_analysis.md) - RS integration details

### 💻 [Development](./development/)
Development workflows and guidelines
- [Test Workflow](./development/test-workflow.md) - Testing procedures

## Quick Links

- **Getting Started**: See [Setup Guide](./setup/SETUP_GUIDE.md)
- **Search Implementation**: Start with [Search Features Index](./features/SEARCH_FEATURES_INDEX.md)
- **API Integration**: Check [ResourceSpace Hooks and APIs](./api/RS_HOOKS_AND_APIS.md)
- **Performance**: Read [Cache System Documentation](./technical/CACHE_SYSTEM_DOCUMENTATION.md)

## Project Structure

```
rs_art_station/
├── backend/          # Node.js backend server
├── web-ui/          # React frontend application
├── services/        # Microservices (cache API, etc.)
├── resourcespace/   # ResourceSpace core files
├── docker/          # Docker configuration
└── docs/           # This documentation
```

## Contributing

When adding new documentation:
1. Place it in the appropriate subfolder
2. Update this index file
3. Follow the existing naming convention (FEATURE_NAME.md)
4. Include clear headings and examples