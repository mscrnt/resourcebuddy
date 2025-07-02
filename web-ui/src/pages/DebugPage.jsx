import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import CollectionBar from '../components/CollectionBar'
import ResourceCard from '../components/ResourceCard'
import useSettingsStore from '../stores/useSettingsStore'
import useAuthStore from '../stores/useAuthStore'
import axios from 'axios'

export default function DebugPage() {
  const [showCollectionBar, setShowCollectionBar] = useState(false)
  const [selectedResources, setSelectedResources] = useState(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [dashboardTiles, setDashboardTiles] = useState([])
  const [testResources, setTestResources] = useState([])
  const navigate = useNavigate()
  
  const { getSetting, updateSetting, fetchSettings } = useSettingsStore()
  const { user, sessionKey } = useAuthStore()
  const enableCollectionBar = getSetting('enableCollectionBar')
  
  useEffect(() => {
    fetchSettings()
    fetchDashboardTiles()
    createTestResources()
  }, [])
  
  const fetchDashboardTiles = async () => {
    if (!user?.ref) return
    
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/dashboard/tiles/${user.ref}`
      )
      
      if (response.data.success) {
        setDashboardTiles(response.data.tiles)
      }
    } catch (error) {
      console.error('Failed to fetch tiles:', error)
    }
  }
  
  const createTestResources = () => {
    // Create fake resources for testing
    const resources = []
    for (let i = 1; i <= 6; i++) {
      resources.push({
        ref: i,
        field8: `Test Resource ${i}`,
        creation_date: new Date().toISOString(),
        created_by: 'Test User',
        file_extension: 'jpg',
        preview_extension: 'jpg',
        file_size: 1024 * 1024 * (i + 1),
        field88: 'Test, Debug, Sample'
      })
    }
    setTestResources(resources)
  }
  
  const handleResourceSelect = (resourceRef, index, event) => {
    const newSelected = new Set(selectedResources)
    
    if (newSelected.has(resourceRef)) {
      newSelected.delete(resourceRef)
    } else {
      newSelected.add(resourceRef)
    }
    
    setSelectedResources(newSelected)
    
    if (newSelected.size > 0) {
      setSelectionMode(true)
    } else {
      setSelectionMode(false)
    }
  }
  
  const testCollection = {
    ref: 1,
    name: 'Debug Test Collection'
  }
  
  return (
    <div className="min-h-screen bg-art-dark p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Debug & Test Page</h1>
        
        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-art-gray-900 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-white mb-2">1. Dashboard Status</h2>
            <p className="text-art-gray-400 mb-2">Tiles found: {dashboardTiles.length}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-art-accent text-white rounded hover:bg-art-accent-dark"
            >
              Go to Dashboard
            </button>
          </div>
          
          <div className="bg-art-gray-900 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-white mb-2">2. Collection Bar</h2>
            <p className="text-art-gray-400 mb-2">
              Setting: {String(enableCollectionBar)}
            </p>
            <label className="flex items-center gap-2 text-white mb-2">
              <input
                type="checkbox"
                checked={enableCollectionBar !== false}
                onChange={(e) => updateSetting('enableCollectionBar', e.target.checked)}
                className="resource-checkbox"
              />
              Enable Collection Bar
            </label>
            <button
              onClick={() => setShowCollectionBar(!showCollectionBar)}
              className="px-4 py-2 bg-art-accent text-white rounded hover:bg-art-accent-dark"
            >
              {showCollectionBar ? 'Hide' : 'Show'} Collection Bar
            </button>
          </div>
          
          <div className="bg-art-gray-900 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-white mb-2">3. Resource Selection</h2>
            <p className="text-art-gray-400 mb-2">
              Selected: {selectedResources.size} resources
            </p>
            <p className="text-art-gray-400 mb-2">
              Selection Mode: {String(selectionMode)}
            </p>
            <button
              onClick={() => {
                setSelectedResources(new Set())
                setSelectionMode(false)
              }}
              className="px-4 py-2 bg-art-accent text-white rounded hover:bg-art-accent-dark"
            >
              Clear Selection
            </button>
          </div>
        </div>
        
        {/* Test Resources Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Test Resources (Check hover behavior)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {testResources.map((resource, index) => (
              <ResourceCard
                key={resource.ref}
                resource={resource}
                viewMode="thumbnail"
                showUser={true}
                onClick={(event) => console.log('Resource clicked:', resource.ref)}
                selected={selectedResources.has(resource.ref)}
                selectionMode={selectionMode}
                onSelect={(event) => handleResourceSelect(resource.ref, index, event)}
              />
            ))}
          </div>
        </div>
        
        {/* Debug Info */}
        <div className="bg-art-gray-900 p-4 rounded-lg">
          <h2 className="text-lg font-semibold text-white mb-2">Debug Information</h2>
          <pre className="text-xs text-art-gray-400 overflow-x-auto">
{JSON.stringify({
  user: user ? { ref: user.ref, name: user.name } : null,
  sessionKey: sessionKey ? 'present' : 'missing',
  enableCollectionBar,
  showCollectionBar,
  selectedResources: Array.from(selectedResources),
  selectionMode,
  dashboardTiles: dashboardTiles.length,
  testCollection
}, null, 2)}
          </pre>
        </div>
        
        {/* Add padding at bottom to see collection bar */}
        <div className="h-64"></div>
      </div>
      
      {/* Collection Bar */}
      {showCollectionBar && (
        <CollectionBar
          collection={testCollection}
          onClose={() => setShowCollectionBar(false)}
          selectedResources={selectedResources}
          onAddResources={(message) => {
            console.log('Resources added:', message)
            alert(message)
          }}
        />
      )}
    </div>
  )
}