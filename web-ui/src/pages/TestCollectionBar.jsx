import { useState } from 'react'
import CollectionBar from '../components/CollectionBar'
import useSettingsStore from '../stores/useSettingsStore'

export default function TestCollectionBar() {
  const [showBar, setShowBar] = useState(false)
  const { getSetting, updateSetting } = useSettingsStore()
  const enableCollectionBar = getSetting('enableCollectionBar')
  
  const testCollection = {
    ref: 1,
    name: 'Test Collection'
  }
  
  return (
    <div className="min-h-screen bg-art-dark p-8">
      <h1 className="text-2xl font-bold text-white mb-8">Collection Bar Test Page</h1>
      
      <div className="space-y-4 max-w-xl">
        <div className="bg-art-gray-900 p-4 rounded-lg">
          <h2 className="text-lg font-semibold text-white mb-2">Settings</h2>
          <label className="flex items-center gap-2 text-white">
            <input
              type="checkbox"
              checked={enableCollectionBar !== false}
              onChange={(e) => updateSetting('enableCollectionBar', e.target.checked)}
              className="resource-checkbox"
            />
            Enable Collection Bar (current: {String(enableCollectionBar)})
          </label>
        </div>
        
        <div className="bg-art-gray-900 p-4 rounded-lg">
          <h2 className="text-lg font-semibold text-white mb-2">Test Controls</h2>
          <button
            onClick={() => setShowBar(!showBar)}
            className="px-4 py-2 bg-art-accent text-white rounded hover:bg-art-accent-dark"
          >
            {showBar ? 'Hide' : 'Show'} Collection Bar
          </button>
          <p className="text-sm text-art-gray-400 mt-2">
            Bar visible: {String(showBar)}
          </p>
        </div>
        
        <div className="bg-art-gray-900 p-4 rounded-lg">
          <h2 className="text-lg font-semibold text-white mb-2">Debug Info</h2>
          <pre className="text-xs text-art-gray-400 overflow-x-auto">
{JSON.stringify({
  enableCollectionBar,
  showBar,
  testCollection
}, null, 2)}
          </pre>
        </div>
      </div>
      
      {/* Add padding at bottom to see collection bar */}
      <div className="h-64"></div>
      
      {/* Collection Bar */}
      {showBar && (
        <CollectionBar
          collection={testCollection}
          onClose={() => setShowBar(false)}
          selectedResources={new Set([1, 2, 3])}
          onAddResources={(message) => {
            console.log('Resources added:', message)
            alert(message)
          }}
        />
      )}
    </div>
  )
}