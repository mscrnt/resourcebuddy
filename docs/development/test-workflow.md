# RS Art Station Upload Workflow Test

## Expected Workflow

1. **Drag & Drop Files**
   - User drags files onto the page
   - Global drag-drop overlay appears
   - Files are accepted and modal opens

2. **Step 1: Files & Options**
   - Files are grouped by resource type (Image, Video, Document, etc.)
   - Each file shows appropriate icon and preview
   - User can:
     - Select collection to upload to
     - Choose to relate files to each other
     - Choose to relate to current resource (if applicable)

3. **Step 2: Metadata Entry**
   - For single file: Shows metadata form for that resource type
   - For multiple files: User chooses between:
     - **Locked fields mode**: Enter metadata once, locked fields apply to all
     - **Individual mode**: Enter metadata for each file separately
   - Form shows all editable fields for the resource type
   - Auto-populates date fields

4. **Step 3: Upload Progress**
   - Shows upload progress for each file
   - Creates resources with metadata
   - Uploads files
   - Updates relationships

5. **Step 4: Results**
   - Shows successfully uploaded resources
   - Option to view all uploads in search

## Test Scenarios

### Single Image Upload
1. Drag a PNG/JPG file
2. Should default to Image resource type
3. Metadata form shows image-specific fields
4. Upload creates resource with metadata

### Multiple Mixed Files
1. Drag 2 images, 1 PDF, 1 video
2. Files grouped by type in preview
3. Choose locked metadata mode
4. Enter title/keywords - locks apply to all
5. All files uploaded with shared metadata

### Individual Metadata Mode
1. Drag 3 different files
2. Choose individual metadata mode
3. Enter unique metadata for each file
4. Navigate between files with Next/Previous
5. All files have unique metadata

## API Calls Made

1. `get_resource_types` - Load available types
2. `check_permission` - Verify upload permission
3. `get_resource_type_fields` - Get fields for resource type
4. `get_field_options` - Get options for dropdown fields
5. `create_resource` - Create with initial metadata
6. `upload_file` or `upload_multipart` - Upload file content
7. `add_resource_nodes` - Add node-based field values
8. `add_resource_to_collection` - Add to collection
9. `relate_resources` - Create relationships