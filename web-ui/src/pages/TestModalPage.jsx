import { useState } from 'react'
import ResourceModalEnhanced from '../components/ResourceModalEnhanced'

export default function TestModalPage() {
  const [modalOpen, setModalOpen] = useState(false)
  
  // Test resource data
  const testResource = {
    ref: 1,
    field8: 'Test Resource - Modal Enhancement Demo',
    resource_type: 1,
    file_extension: 'jpg',
    creation_date: new Date().toISOString(),
    created_by: 'Test User',
    file_size: 2048576,
    has_image: 1,
    preview_extension: 'jpg',
    file_modified: new Date().toISOString()
  }
  
  return (
    <div className="min-h-screen bg-art-dark p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Enhanced Resource Modal Test</h1>
        
        <div className="bg-art-gray-900 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Modal Features</h2>
          <ul className="space-y-2 text-art-gray-300">
            <li>✓ Metadata sidebar moved to the left</li>
            <li>✓ Inline metadata editing with permissions</li>
            <li>✓ Custom thumbnail upload support</li>
            <li>✓ Alternative file (variant) management</li>
            <li>✓ Expandable/collapsible sidebar with memory</li>
            <li>✓ Clickable metadata values for search</li>
            <li>✓ Context-aware share button</li>
            <li>✓ Related resources in bottom-right</li>
            <li>✓ Resource type changing capability</li>
            <li>✓ Automatic data refresh on resource switch</li>
          </ul>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={() => setModalOpen(true)}
            className="px-6 py-3 bg-art-accent text-white rounded-lg hover:bg-art-accent-dark transition-colors"
          >
            Open Enhanced Modal
          </button>
          
          <div className="bg-art-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-art-gray-400 mb-2">Test Resource Details</h3>
            <pre className="text-xs text-art-gray-300 overflow-x-auto">
{JSON.stringify(testResource, null, 2)}
            </pre>
          </div>
        </div>
      </div>
      
      <ResourceModalEnhanced
        resource={testResource}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onNext={() => console.log('Next resource')}
        onPrevious={() => console.log('Previous resource')}
        hasNext={false}
        hasPrevious={false}
        context="test"
      />
    </div>
  )
}