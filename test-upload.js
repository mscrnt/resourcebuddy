const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BACKEND_URL = 'http://localhost:3003';

async function testUploadWithMetadata() {
  try {
    console.log('1. Testing backend connection...');
    const testResponse = await axios.get(`${BACKEND_URL}/test`);
    console.log('✓ Backend is running:', testResponse.data.message);

    console.log('\n2. Creating resource with metadata...');
    const metadata = {
      field8: 'Test Upload with Metadata',  // Title
      field3: 'test, upload, metadata',      // Keywords
      field29: 'Test description from API'   // Description
    };

    const createResponse = await axios.post(`${BACKEND_URL}/api/proxy`, {
      function: 'create_resource',
      params: {
        param1: 1,  // Image resource type
        param2: 0,  // Active archive state
        param3: '', // Empty URL for local upload
        param4: false,
        param5: false,
        param6: false,
        param7: JSON.stringify(metadata)
      }
    });

    console.log('✓ Resource created:', createResponse.data);
    const resourceRef = createResponse.data;

    if (!resourceRef || resourceRef === false) {
      throw new Error('Failed to create resource');
    }

    console.log('\n3. Creating test image file...');
    // Create a simple test image (1x1 pixel PNG)
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
      0x54, 0x08, 0xD7, 0x63, 0xF8, 0x0F, 0x00, 0x00,
      0x01, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0D,
      0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);

    console.log('\n4. Uploading file to resource...');
    const form = new FormData();
    form.append('file', pngBuffer, {
      filename: 'test-image.png',
      contentType: 'image/png'
    });
    form.append('ref', resourceRef);
    form.append('no_exif', 'false');
    form.append('revert', 'false');

    const uploadResponse = await axios.post(`${BACKEND_URL}/api/upload`, form, {
      headers: form.getHeaders()
    });

    console.log('✓ File uploaded:', uploadResponse.data);

    console.log('\n5. Updating metadata with node fields...');
    // Simulate adding node-based fields (like categories)
    const updateResponse = await axios.post(`${BACKEND_URL}/api/proxy`, {
      function: 'update_resource_field',
      params: {
        param1: resourceRef,
        param2: 3,  // Keywords field
        param3: 'api-test, automated, metadata-test'
      }
    });

    console.log('✓ Metadata updated');

    console.log('\n6. Verifying resource...');
    const verifyResponse = await axios.post(`${BACKEND_URL}/api/proxy`, {
      function: 'get_resource_data',
      params: {
        param1: resourceRef
      }
    });

    console.log('✓ Resource data:', JSON.stringify(verifyResponse.data, null, 2));

    console.log('\n✅ Upload test completed successfully!');
    console.log(`Resource created with ID: ${resourceRef}`);
    console.log(`View it at: http://localhost:3002/resource/${resourceRef}`);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testUploadWithMetadata();