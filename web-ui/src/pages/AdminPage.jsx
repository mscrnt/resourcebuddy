import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Save, Upload, Palette, Layout, Code, Eye, EyeOff, RefreshCw, Server, Activity, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import useSettingsStore from '../stores/useSettingsStore'
import useAuthStore from '../stores/useAuthStore'
import { cn } from '../lib/utils'
import { resourceSpaceApi } from '../lib/resourcespace-api-backend'

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
  
  // System tab states
  const [systemStatus, setSystemStatus] = useState(null)
  const [cacheStatus, setCacheStatus] = useState(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'failures', 'warnings'
  const [showJsonPayload, setShowJsonPayload] = useState(false)
  
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
  
  // Load cache settings on mount
  useEffect(() => {
    const loadCacheSettings = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_CACHE_URL || 'http://localhost:8000'}/admin/settings`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.settings) {
            setLocalSettings(prev => ({
              ...prev,
              redisEnabled: data.settings.redis_enabled,
              mediaCacheTtlDays: data.settings.media_cache_ttl_days,
              maxCacheSizeMb: data.settings.max_cache_size_mb
            }))
          }
        }
      } catch (error) {
        console.error('Failed to load cache settings:', error)
      }
    }
    
    if (hasPermission) {
      loadCacheSettings()
    }
  }, [hasPermission])
  
  // Fetch system status when on system tab
  useEffect(() => {
    if (activeTab === 'system') {
      fetchSystemStatuses()
    }
  }, [activeTab, user])
  
  const fetchSystemStatuses = async () => {
    setIsLoadingStatus(true)
    
    try {
      // Fetch ResourceSpace system status
      const rsStatus = await resourceSpaceApi.getSystemStatus(user?.sessionKey)
      setSystemStatus(rsStatus)
      
      // Fetch cache API status
      const cacheResponse = await fetch(`${import.meta.env.VITE_CACHE_URL || 'http://localhost:8000'}/debug/cache-status`)
      if (cacheResponse.ok) {
        const cacheData = await cacheResponse.json()
        setCacheStatus(cacheData)
      }
    } catch (error) {
      console.error('Failed to fetch system status:', error)
    } finally {
      setIsLoadingStatus(false)
    }
  }
  
  const handleSave = async () => {
    setIsSaving(true)
    
    try {
      // Save main settings
      const success = await updateSettings(localSettings)
      
      // If on system tab, also save cache settings
      if (activeTab === 'system' && (localSettings.redisEnabled !== undefined || localSettings.mediaCacheTtlDays || localSettings.maxCacheSizeMb)) {
        const cacheSettings = {}
        
        if (localSettings.redisEnabled !== undefined) {
          cacheSettings.redis_enabled = localSettings.redisEnabled
        }
        if (localSettings.mediaCacheTtlDays) {
          cacheSettings.media_cache_ttl_days = localSettings.mediaCacheTtlDays
        }
        if (localSettings.maxCacheSizeMb) {
          cacheSettings.max_cache_size_mb = localSettings.maxCacheSizeMb
        }
        
        // Update cache API settings
        await fetch(`${import.meta.env.VITE_CACHE_URL || 'http://localhost:8000'}/admin/settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cacheSettings)
        })
      }
      
      if (success) {
        applyTheme()
        // Show success message
        setTimeout(() => setIsSaving(false), 1000)
      } else {
        setIsSaving(false)
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      setIsSaving(false)
    }
  }
  
  const handleLogoUpload = (e, logoType = 'logoUrl') => {
    const file = e.target.files?.[0]
    if (file) {
      // Convert to data URL for immediate preview and storage
      const reader = new FileReader()
      reader.onloadend = () => {
        setLocalSettings({ ...localSettings, [logoType]: reader.result })
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
    { id: 'system', label: 'System', icon: Server },
  ]
  
  if (!hasPermission) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-white">Checking permissions...</div>
    </div>
  }
  
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-theme-primary">Admin Panel</h1>
        <p className="mt-2 text-theme-secondary">
          Customize your RS Art Station instance
        </p>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
          Error: {error}
        </div>
      )}
      
      <div className="card-theme rounded-lg">
        {/* Tabs */}
        <div className="border-b border-theme-primary">
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
                      ? "border-art-accent text-theme-primary"
                      : "border-transparent text-theme-secondary hover:text-theme-primary hover:border-theme-secondary"
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
                <label className="block text-sm font-medium text-theme-primary mb-2">
                  Application Title
                </label>
                <input
                  type="text"
                  value={localSettings.appTitle || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, appTitle: e.target.value })}
                  className="w-full px-3 py-2 input-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                  placeholder="RS Art Station"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-theme-primary mb-2">
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
                        className="w-full px-3 py-2 input-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                        placeholder="Dark mode logo URL"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleLogoUpload(e, 'logoDarkUrl')}
                        className="hidden"
                        id="logoDarkUpload"
                      />
                      <button
                        onClick={() => document.getElementById('logoDarkUpload')?.click()}
                        className="mt-2 flex items-center gap-2 px-3 py-1 btn-theme-secondary rounded text-sm transition-colors"
                      >
                        <Upload className="h-3 w-3" />
                        Upload
                      </button>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-primary mb-2">
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
                        className="w-full px-3 py-2 input-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                        placeholder="Light mode logo URL"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleLogoUpload(e, 'logoLightUrl')}
                        className="hidden"
                        id="logoLightUpload"
                      />
                      <button
                        onClick={() => document.getElementById('logoLightUpload')?.click()}
                        className="mt-2 flex items-center gap-2 px-3 py-1 btn-theme-secondary rounded text-sm transition-colors"
                      >
                        <Upload className="h-3 w-3" />
                        Upload
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-medium text-theme-primary mb-2">
                  Legacy Logo URL (Optional)
                </label>
                <input
                  type="text"
                  value={localSettings.logoUrl || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, logoUrl: e.target.value })}
                  className="w-full px-3 py-2 input-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
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
                  <label className="block text-sm font-medium text-theme-primary mb-2">
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
                      className="flex-1 px-3 py-2 input-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-primary mb-2">
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
                      className="flex-1 px-3 py-2 input-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-primary mb-2">
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
                      className="flex-1 px-3 py-2 input-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-primary mb-2">
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
                      className="flex-1 px-3 py-2 input-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
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
                <label className="block text-sm font-medium text-theme-primary mb-2">
                  Default View
                </label>
                <select
                  value={localSettings.defaultView || 'grid'}
                  onChange={(e) => setLocalSettings({ ...localSettings, defaultView: e.target.value })}
                  className="w-full px-3 py-2 input-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                >
                  <option value="grid">Grid View</option>
                  <option value="list">List View</option>
                  <option value="masonry">Masonry View</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-2">
                  Grid Columns
                </label>
                <select
                  value={localSettings.gridColumns || 'auto'}
                  onChange={(e) => setLocalSettings({ ...localSettings, gridColumns: e.target.value })}
                  className="w-full px-3 py-2 input-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
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
                <h4 className="text-sm font-medium text-theme-primary">Feature Toggles</h4>
                {[
                  { key: 'enableSearch', label: 'Enable Search' },
                  { key: 'enableCollections', label: 'Enable Collections' },
                  { key: 'enableCollectionBar', label: 'Enable Collection Bar (Bottom panel for managing collections)' },
                  { key: 'enableSharing', label: 'Enable Sharing' },
                  { key: 'enableDownload', label: 'Enable Download' },
                  { key: 'enableUpload', label: 'Enable Upload' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-3 text-theme-primary">
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
                <label className="block text-sm font-medium text-theme-primary mb-2">
                  Custom CSS
                </label>
                <textarea
                  value={localSettings.customCss || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, customCss: e.target.value })}
                  className="w-full h-64 px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent font-mono text-sm"
                  placeholder="/* Add custom CSS here */&#10;.my-custom-class {&#10;  color: #fff;&#10;}"
                />
                <p className="mt-2 text-sm text-theme-secondary">
                  Add custom CSS to further customize the appearance. Use with caution.
                </p>
              </div>
              
              <div>
                <button
                  onClick={() => {
                    if (confirm('Reset all settings to default values?')) {
                      // Reset to default settings
                      const defaultSettings = {
                        appTitle: 'ResourceBuddy',
                        logoUrl: '/logo.png',
                        logoDarkUrl: '/logo-dark.png',
                        logoLightUrl: '/logo-light.png',
                        primaryColor: '#10b981',
                        accentColor: '#10b981',
                        darkBackground: '#0a0a0a',
                        darkBackgroundSecondary: '#171717',
                        enableLightTheme: false,
                        defaultView: 'grid',
                        gridColumns: 'auto',
                        enableSearch: true,
                        enableCollections: true,
                        enableCollectionBar: true,
                        enableSharing: true,
                        enableDownload: true,
                        enableUpload: true,
                        customCss: '',
                        redisEnabled: false,
                        redisHost: 'localhost',
                        redisPort: '6379',
                        redisPassword: '',
                        mediaCacheTtlDays: 7,
                        maxCacheSizeMb: 10240
                      }
                      setLocalSettings(defaultSettings)
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
          
          {activeTab === 'system' && (
            <div className="space-y-6">
              {/* Redis Configuration */}
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Redis Configuration</h3>
                <div className="space-y-4 p-4 bg-art-gray-800 rounded-lg">
                  <label className="flex items-center gap-3 text-white">
                    <input
                      type="checkbox"
                      checked={localSettings.redisEnabled || false}
                      onChange={(e) => setLocalSettings({ ...localSettings, redisEnabled: e.target.checked })}
                      className="rounded text-art-accent focus:ring-art-accent"
                    />
                    <span>Enable Redis Cache</span>
                  </label>
                  
                  {localSettings.redisEnabled && (
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-theme-primary mb-2">
                          Redis Host
                        </label>
                        <input
                          type="text"
                          value={localSettings.redisHost || 'localhost'}
                          onChange={(e) => setLocalSettings({ ...localSettings, redisHost: e.target.value })}
                          className="w-full px-3 py-2 input-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                          placeholder="localhost"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-theme-primary mb-2">
                          Redis Port
                        </label>
                        <input
                          type="text"
                          value={localSettings.redisPort || '6379'}
                          onChange={(e) => setLocalSettings({ ...localSettings, redisPort: e.target.value })}
                          className="w-full px-3 py-2 input-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                          placeholder="6379"
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-theme-primary mb-2">
                          Redis Password (Optional)
                        </label>
                        <input
                          type="password"
                          value={localSettings.redisPassword || ''}
                          onChange={(e) => setLocalSettings({ ...localSettings, redisPassword: e.target.value })}
                          className="w-full px-3 py-2 input-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                          placeholder="Leave empty if no password"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Redis Status from Cache API */}
                  {cacheStatus?.redis_status && (
                    <div className="mt-4 p-3 bg-theme-tertiary rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          cacheStatus.redis_status.connected ? "bg-green-500" : "bg-red-500"
                        )} />
                        <span className="text-sm text-white">
                          Redis: {cacheStatus.redis_status.connected ? 'Connected' : 'Disconnected'}
                        </span>
                        {cacheStatus.redis_status.connected && (
                          <span className="text-sm text-theme-secondary">
                            ({cacheStatus.redis_status.keys} keys, {(cacheStatus.redis_status.memory_used / 1024 / 1024).toFixed(1)} MB)
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Cache Settings */}
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Cache Settings</h3>
                <div className="grid grid-cols-2 gap-4 p-4 bg-art-gray-800 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-theme-primary mb-2">
                      Media Cache TTL (days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={localSettings.mediaCacheTtlDays || 7}
                      onChange={(e) => setLocalSettings({ ...localSettings, mediaCacheTtlDays: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 input-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-theme-primary mb-2">
                      Max Cache Size (MB)
                    </label>
                    <input
                      type="number"
                      min="100"
                      value={localSettings.maxCacheSizeMb || 10240}
                      onChange={(e) => setLocalSettings({ ...localSettings, maxCacheSizeMb: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 input-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent"
                    />
                  </div>
                </div>
              </div>
              
              {/* System Status */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-theme-primary">System Status</h3>
                  <div className="flex items-center gap-2">
                    {/* Filter buttons */}
                    <div className="flex gap-1 bg-theme-tertiary rounded-lg p-1">
                      {['all', 'failures', 'warnings'].map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setStatusFilter(filter)}
                          className={cn(
                            "px-3 py-1 text-sm rounded transition-colors capitalize",
                            statusFilter === filter
                              ? "bg-art-accent text-white"
                              : "text-theme-secondary hover:text-theme-primary"
                          )}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                    
                    <button
                      onClick={fetchSystemStatuses}
                      disabled={isLoadingStatus}
                      className="p-2 btn-theme-secondary rounded-lg transition-colors"
                    >
                      {isLoadingStatus ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                
                {/* System Status Cards */}
                {isLoadingStatus ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-art-accent" />
                  </div>
                ) : systemStatus?.results ? (
                  <div className="grid gap-3">
                    {Object.entries(systemStatus.results)
                      .filter(([_, value]) => {
                        if (statusFilter === 'all') return true
                        if (statusFilter === 'failures') return value.status === 'FAIL'
                        if (statusFilter === 'warnings') return value.severity === 'warning'
                        return true
                      })
                      .map(([key, value]) => (
                        <div
                          key={key}
                          className="p-4 bg-theme-tertiary rounded-lg border border-theme-secondary"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                {value.status === 'OK' ? (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                ) : (
                                  <AlertCircle className="h-5 w-5 text-red-500" />
                                )}
                                <h4 className="font-medium text-theme-primary">{value.name || key}</h4>
                                <span className={cn(
                                  "px-2 py-0.5 text-xs rounded-full",
                                  value.status === 'OK' 
                                    ? "bg-green-500/20 text-green-400"
                                    : "bg-red-500/20 text-red-400"
                                )}>
                                  {value.status}
                                </span>
                                {value.severity && (
                                  <span className={cn(
                                    "px-2 py-0.5 text-xs rounded-full",
                                    value.severity === 'warning'
                                      ? "bg-yellow-500/20 text-yellow-400"
                                      : "bg-gray-500/20 text-gray-400"
                                  )}>
                                    {value.severity}
                                  </span>
                                )}
                              </div>
                              {value.info && (
                                <p className="mt-1 text-sm text-theme-secondary">{value.info}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center p-8 text-theme-secondary">
                    Click refresh to load system status
                  </div>
                )}
                
                {/* Cache Status Summary */}
                {cacheStatus && (
                  <div className="mt-6 p-4 bg-theme-tertiary rounded-lg">
                    <h4 className="font-medium text-white mb-3">Cache Status</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-2xl font-bold text-white">
                          {cacheStatus.cache_stats.total_resources}
                        </div>
                        <div className="text-sm text-theme-secondary">Cached Resources</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">
                          {cacheStatus.cache_stats.total_hits}
                        </div>
                        <div className="text-sm text-theme-secondary">Cache Hits</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">
                          {(cacheStatus.cache_stats.cache_directory_size / 1024 / 1024).toFixed(1)} MB
                        </div>
                        <div className="text-sm text-theme-secondary">Disk Usage</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">
                          {cacheStatus.cache_stats.cached_files.count}
                        </div>
                        <div className="text-sm text-theme-secondary">Media Files</div>
                      </div>
                    </div>
                    
                    {/* Redis Performance */}
                    {cacheStatus.redis_status && cacheStatus.redis_status.enabled && (
                      <div className="mt-4 pt-4 border-t border-art-gray-700">
                        <h5 className="text-sm font-medium text-white mb-2">Redis Performance</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <div className="text-lg font-bold text-green-400">
                              {cacheStatus.redis_status.hits}
                            </div>
                            <div className="text-xs text-theme-secondary">Redis Hits</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-yellow-400">
                              {cacheStatus.redis_status.misses}
                            </div>
                            <div className="text-xs text-theme-secondary">Redis Misses</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-blue-400">
                              {cacheStatus.redis_status.keys}
                            </div>
                            <div className="text-xs text-theme-secondary">Cached Keys</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-purple-400">
                              {((cacheStatus.redis_status.hits / (cacheStatus.redis_status.hits + cacheStatus.redis_status.misses)) * 100).toFixed(1)}%
                            </div>
                            <div className="text-xs text-theme-secondary">Redis Hit Rate</div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-4 text-xs text-theme-secondary">
                      <p>💡 Hit rate improves over time as more resources are cached. First-time resource views are always misses.</p>
                    </div>
                  </div>
                )}
                
                {/* JSON Payload Debug */}
                {systemStatus && (
                  <div className="mt-4">
                    <button
                      onClick={() => setShowJsonPayload(!showJsonPayload)}
                      className="text-sm text-theme-secondary hover:text-white transition-colors"
                    >
                      {showJsonPayload ? 'Hide' : 'Show'} JSON Payload
                    </button>
                    {showJsonPayload && (
                      <pre className="mt-2 p-4 bg-art-gray-900 rounded-lg text-xs text-theme-secondary overflow-auto">
                        {JSON.stringify(systemStatus, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Save Button */}
        <div className="px-6 py-4 border-t border-art-gray-800 flex items-center justify-end gap-4">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 text-theme-secondary hover:text-theme-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || isSaving}
            className="flex items-center gap-2 px-6 py-2 btn-theme-primary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}