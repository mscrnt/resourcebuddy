import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Save, Upload, Palette, Layout, Code, Eye, EyeOff, RefreshCw } from 'lucide-react'
import useSettingsStore from '../stores/useSettingsStore'
import useAuthStore from '../stores/useAuthStore'
import { cn } from '../lib/utils'

export default function AdminPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { settings, updateSettings, applyTheme, isLoading, error } = useSettingsStore()
  const [hasPermission, setHasPermission] = useState(false)
  const [activeTab, setActiveTab] = useState('branding')
  const [localSettings, setLocalSettings] = useState(settings)
  const [showPreview, setShowPreview] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef(null)
  
  // Check admin permission
  useEffect(() => {
    const checkPermission = async () => {
      if (!user?.sessionKey) {
        navigate('/login')
        return
      }
      
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/check-permission`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ permission: 'a', sessionKey: user.sessionKey })
        })
        const data = await response.json()
        
        if (!data.hasPermission) {
          navigate('/')
          return
        }
        
        setHasPermission(true)
      } catch (error) {
        console.error('Failed to check permission:', error)
        navigate('/')
      }
    }
    
    checkPermission()
  }, [user, navigate])
  
  // Initialize local settings when settings change
  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])
  
  const handleSave = async () => {
    setIsSaving(true)
    const success = await updateSettings(localSettings)
    if (success) {
      applyTheme()
      // Show success message
      setTimeout(() => setIsSaving(false), 1000)
    } else {
      setIsSaving(false)
    }
  }
  
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      // For now, we'll use a data URL. In production, you'd upload to a server
      const reader = new FileReader()
      reader.onloadend = () => {
        setLocalSettings({ ...localSettings, logoUrl: reader.result })
      }
      reader.readAsDataURL(file)
    }
  }
  
  const handleColorChange = (key, value) => {
    setLocalSettings({ ...localSettings, [key]: value })
    if (showPreview) {
      // Apply preview in real-time
      document.documentElement.style.setProperty(`--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value)
    }
  }
  
  const tabs = [
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'theme', label: 'Theme Colors', icon: Palette },
    { id: 'layout', label: 'Layout', icon: Layout },
    { id: 'advanced', label: 'Advanced', icon: Code },
  ]
  
  if (!hasPermission) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-white">Checking permissions...</div>
    </div>
  }
  
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
        <p className="mt-2 text-art-gray-400">
          Customize your RS Art Station instance
        </p>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
          Error: {error}
        </div>
      )}
      
      <div className="bg-art-gray-900 rounded-lg">
        {/* Tabs */}
        <div className="border-b border-art-gray-800">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                    activeTab === tab.id
                      ? "border-art-accent text-white"
                      : "border-transparent text-art-gray-400 hover:text-white hover:border-art-gray-600"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>
        
        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'branding' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Application Title
                </label>
                <input
                  type="text"
                  value={localSettings.appTitle || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, appTitle: e.target.value })}
                  className="w-full px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                  placeholder="RS Art Station"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Logo (Dark Mode)
                  </label>
                  <div className="flex items-center gap-4">
                    {localSettings.logoDarkUrl && (
                      <img 
                        src={localSettings.logoDarkUrl} 
                        alt="Dark logo preview" 
                        className="h-16 w-16 object-contain bg-art-gray-800 rounded-lg p-2"
                      />
                    )}
                    <div className="flex-1">
                      <input
                        type="text"
                        value={localSettings.logoDarkUrl || ''}
                        onChange={(e) => setLocalSettings({ ...localSettings, logoDarkUrl: e.target.value })}
                        className="w-full px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                        placeholder="Dark mode logo URL"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Logo (Light Mode)
                  </label>
                  <div className="flex items-center gap-4">
                    {localSettings.logoLightUrl && (
                      <img 
                        src={localSettings.logoLightUrl} 
                        alt="Light logo preview" 
                        className="h-16 w-16 object-contain bg-white rounded-lg p-2"
                      />
                    )}
                    <div className="flex-1">
                      <input
                        type="text"
                        value={localSettings.logoLightUrl || ''}
                        onChange={(e) => setLocalSettings({ ...localSettings, logoLightUrl: e.target.value })}
                        className="w-full px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                        placeholder="Light mode logo URL"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-medium text-white mb-2">
                  Legacy Logo URL (Optional)
                </label>
                <input
                  type="text"
                  value={localSettings.logoUrl || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, logoUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                  placeholder="Fallback logo URL"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 flex items-center gap-2 px-4 py-2 bg-art-gray-800 hover:bg-art-gray-700 text-white rounded-lg transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Upload Logo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </div>
            </div>
          )}
          
          {activeTab === 'theme' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">Theme Colors</h3>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-2 px-3 py-1 bg-art-gray-800 hover:bg-art-gray-700 text-white rounded-lg transition-colors text-sm"
                >
                  {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showPreview ? 'Hide' : 'Show'} Preview
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Primary Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={localSettings.primaryColor || '#10b981'}
                      onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                      className="h-10 w-20 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={localSettings.primaryColor || '#10b981'}
                      onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                      className="flex-1 px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={localSettings.accentColor || '#10b981'}
                      onChange={(e) => handleColorChange('accentColor', e.target.value)}
                      className="h-10 w-20 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={localSettings.accentColor || '#10b981'}
                      onChange={(e) => handleColorChange('accentColor', e.target.value)}
                      className="flex-1 px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Dark Background
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={localSettings.darkBackground || '#0a0a0a'}
                      onChange={(e) => handleColorChange('darkBackground', e.target.value)}
                      className="h-10 w-20 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={localSettings.darkBackground || '#0a0a0a'}
                      onChange={(e) => handleColorChange('darkBackground', e.target.value)}
                      className="flex-1 px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Dark Secondary Background
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={localSettings.darkBackgroundSecondary || '#171717'}
                      onChange={(e) => handleColorChange('darkBackgroundSecondary', e.target.value)}
                      className="h-10 w-20 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={localSettings.darkBackgroundSecondary || '#171717'}
                      onChange={(e) => handleColorChange('darkBackgroundSecondary', e.target.value)}
                      className="flex-1 px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                    />
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-art-gray-800">
                <label className="flex items-center gap-3 text-white">
                  <input
                    type="checkbox"
                    checked={localSettings.enableLightTheme || false}
                    onChange={(e) => setLocalSettings({ ...localSettings, enableLightTheme: e.target.checked })}
                    className="rounded text-art-accent focus:ring-art-accent"
                  />
                  <span>Enable Light Theme (Users can switch between dark and light)</span>
                </label>
              </div>
            </div>
          )}
          
          {activeTab === 'layout' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Default View
                </label>
                <select
                  value={localSettings.defaultView || 'grid'}
                  onChange={(e) => setLocalSettings({ ...localSettings, defaultView: e.target.value })}
                  className="w-full px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                >
                  <option value="grid">Grid View</option>
                  <option value="list">List View</option>
                  <option value="masonry">Masonry View</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Grid Columns
                </label>
                <select
                  value={localSettings.gridColumns || 'auto'}
                  onChange={(e) => setLocalSettings({ ...localSettings, gridColumns: e.target.value })}
                  className="w-full px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                >
                  <option value="auto">Auto (Responsive)</option>
                  <option value="2">2 Columns</option>
                  <option value="3">3 Columns</option>
                  <option value="4">4 Columns</option>
                  <option value="5">5 Columns</option>
                  <option value="6">6 Columns</option>
                </select>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-white">Feature Toggles</h4>
                {[
                  { key: 'enableSearch', label: 'Enable Search' },
                  { key: 'enableCollections', label: 'Enable Collections' },
                  { key: 'enableCollectionBar', label: 'Enable Collection Bar (Bottom panel for managing collections)' },
                  { key: 'enableSharing', label: 'Enable Sharing' },
                  { key: 'enableDownload', label: 'Enable Download' },
                  { key: 'enableUpload', label: 'Enable Upload' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-3 text-white">
                    <input
                      type="checkbox"
                      checked={localSettings[key] !== false}
                      onChange={(e) => setLocalSettings({ ...localSettings, [key]: e.target.checked })}
                      className="rounded text-art-accent focus:ring-art-accent"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          
          {activeTab === 'advanced' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Custom CSS
                </label>
                <textarea
                  value={localSettings.customCss || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, customCss: e.target.value })}
                  className="w-full h-64 px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent font-mono text-sm"
                  placeholder="/* Add custom CSS here */&#10;.my-custom-class {&#10;  color: #fff;&#10;}"
                />
                <p className="mt-2 text-sm text-art-gray-400">
                  Add custom CSS to further customize the appearance. Use with caution.
                </p>
              </div>
              
              <div>
                <button
                  onClick={() => {
                    if (confirm('Reset all settings to default values?')) {
                      window.location.reload()
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reset to Defaults
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Save Button */}
        <div className="px-6 py-4 border-t border-art-gray-800 flex items-center justify-end gap-4">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 text-art-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-art-accent hover:bg-art-accent-dark text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}