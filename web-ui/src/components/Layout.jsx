import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { Upload, Folder, Star, User, Menu, X, LogOut, Settings, MoreVertical, Sun, Moon, LayoutDashboard } from 'lucide-react'
import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { cn } from '../lib/utils'
import HeaderSearchBar from './HeaderSearchBar'
import useAuthStore from '../stores/useAuthStore'
import useSettingsStore from '../stores/useSettingsStore'
// Logo is now in public directory at /logo.png
import DragDropOverlay from './DragDropOverlay'
import UploadModal from './UploadModal'
import UserProfileModal from './UserProfileModal'

const navigation = [
  { name: 'Browse', href: '/', icon: null, faIcon: 'fa-compass' },
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, faIcon: 'fa-th-large' },
  { name: 'My Uploads', href: '/my-uploads', icon: Upload, faIcon: 'fa-cloud-upload-alt' },
  { name: 'Collections', href: '/collections', icon: Folder, faIcon: 'fa-folder' },
  { name: 'Featured', href: '/featured', icon: Star, faIcon: 'fa-star' },
]

const Layout = memo(() => {
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [adminMenuOpen, setAdminMenuOpen] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploadFiles, setUploadFiles] = useState([])
  const [hasAdminPermission, setHasAdminPermission] = useState(false)
  const [userMetadata, setUserMetadata] = useState(null)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [currentTheme, setCurrentTheme] = useState('dark')
  const { user, logout } = useAuthStore()
  const { settings, fetchSettings, applyTheme, updateSettings } = useSettingsStore()
  const userMenuRef = useRef(null)
  const adminMenuRef = useRef(null)
  
  const handleLogout = useCallback(() => {
    logout()
    navigate('/login')
  }, [logout, navigate])
  
  const handleThemeToggle = useCallback(async () => {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark'
    setCurrentTheme(newTheme)
    
    // Apply theme to UI
    if (newTheme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      document.documentElement.classList.add('dark')
    }
    
    // Save to localStorage for immediate persistence
    localStorage.setItem('user-theme-preference', newTheme)
    
    // Also update the settings store theme
    if (settings.theme !== newTheme) {
      await updateSettings({ ...settings, theme: newTheme })
    }
    
    // Save theme preference to backend
    if (userMetadata?.ref) {
      try {
        await fetch(
          `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/user-profile/${userMetadata.ref}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...userMetadata,
              theme_preference: newTheme
            })
          }
        )
      } catch (error) {
        console.error('Failed to save theme preference:', error)
      }
    }
  }, [currentTheme, settings, updateSettings, userMetadata])
  
  // Fetch settings on mount
  useEffect(() => {
    // Check localStorage first for immediate theme application
    const savedTheme = localStorage.getItem('user-theme-preference') || 'dark'
    setCurrentTheme(savedTheme)
    
    // Apply initial theme class
    if (savedTheme === 'light' && settings.enableLightTheme !== false) {
      document.documentElement.classList.remove('dark')
    } else {
      document.documentElement.classList.add('dark')
    }
    
    fetchSettings().then(() => {
      applyTheme()
    })
  }, [])
  
  // Fetch user metadata and check admin permission
  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.username && user?.sessionKey) {
        try {
          // Fetch user metadata
          const metadataResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/user-metadata`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user.username })
          })
          
          if (metadataResponse.ok) {
            const metadataData = await metadataResponse.json()
            if (metadataData.success) {
              setUserMetadata(metadataData.user)
              
              // Apply user's theme preference
              if (metadataData.user.theme_preference) {
                setCurrentTheme(metadataData.user.theme_preference)
                if (metadataData.user.theme_preference === 'light' && settings.enableLightTheme !== false) {
                  document.documentElement.classList.remove('dark')
                } else {
                  document.documentElement.classList.add('dark')
                }
              }
            }
          }
          
          // Check admin permission
          const permissionResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/check-permission`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ permission: 'a', sessionKey: user.sessionKey })
          })
          const permissionData = await permissionResponse.json()
          setHasAdminPermission(permissionData.hasPermission)
        } catch (error) {
          console.error('Failed to fetch user data:', error)
        }
      }
    }
    fetchUserData()
  }, [user, settings.enableLightTheme])
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false)
      }
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target)) {
        setAdminMenuOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Handle file drop
  const handleFileDrop = (files) => {
    setUploadFiles(files)
    setUploadModalOpen(true)
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-theme-secondary/95 backdrop-blur-sm border-b border-theme-primary">
        <div className="mx-auto px-6 sm:px-8 lg:px-12 xl:px-16">
          <div className="flex h-16 items-center justify-between">
            {/* Logo and Desktop Nav */}
            <div className="flex items-center">
              <Link 
                to="/" 
                className="flex-shrink-0 flex items-center space-x-3"
                onClick={(e) => {
                  // Clear search params when clicking logo
                  if (location.pathname === '/' && window.location.search) {
                    e.preventDefault()
                    navigate('/', { replace: true })
                  }
                }}
              >
                {(settings.logoDarkUrl || settings.logoLightUrl || settings.logoUrl) ? (
                  <img 
                    src={
                      currentTheme === 'dark' 
                        ? (settings.logoDarkUrl || settings.logoUrl || '/logo-dark.png')
                        : (settings.logoLightUrl || settings.logoUrl || '/logo-light.png')
                    } 
                    alt={settings.appTitle || "ResourceBuddy"} 
                    className="h-14 w-auto object-contain" 
                  />
                ) : (
                  <h1 className="text-2xl font-bold text-theme-primary">{settings.appTitle || "ResourceBuddy"}</h1>
                )}
              </Link>
              
              {/* Desktop Navigation */}
              <nav className="hidden md:ml-10 md:flex md:space-x-8">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href || 
                    (item.href === '/' && location.pathname === '/')
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={(e) => {
                        // Clear search params when clicking Browse
                        if (item.href === '/' && location.pathname === '/' && window.location.search) {
                          e.preventDefault()
                          navigate('/', { replace: true })
                        }
                      }}
                      className={cn(
                        'inline-flex items-center px-1 pt-1 text-xl font-medium transition-colors relative',
                        isActive
                          ? 'text-theme-primary'
                          : 'text-theme-secondary hover:text-theme-primary'
                      )}
                    >
                      {item.faIcon && <i className={`fas ${item.faIcon} mr-2 text-lg`} />}
                      {item.name}
                      {isActive && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-art-accent transition-all duration-300" />
                      )}
                    </Link>
                  )
                })}
              </nav>
            </div>

            {/* Search and User Menu */}
            <div className="flex items-center gap-3 md:gap-4">
              <HeaderSearchBar />
              
              {/* Theme Toggle */}
              {settings.enableLightTheme !== false && (
                <button
                  onClick={handleThemeToggle}
                  className="p-2 rounded-lg text-theme-secondary hover:text-theme-primary bg-theme-hover focus:outline-none focus:ring-2 focus:ring-art-accent focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-200 flex-shrink-0"
                  aria-label={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`}
                  title={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  {currentTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>
              )}
              
              {/* User Menu */}
              <div className="flex items-center gap-2">
                <div className="relative" ref={userMenuRef}>
                  <button 
                    className="flex items-center gap-2 rounded-full p-2 text-theme-secondary hover:text-theme-primary bg-theme-hover focus:outline-none focus:ring-2 focus:ring-art-accent focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-200"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    aria-label="User menu"
                    aria-expanded={userMenuOpen}
                  >
                    <User className="h-5 w-5" />
                    {userMetadata && (
                      <span className="hidden md:inline text-sm">{userMetadata.fullname || user.username}</span>
                    )}
                  </button>
                
                {/* User Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md dropdown-theme py-1">
                    {userMetadata && (
                      <div className="px-4 py-2 text-sm text-theme-secondary border-b border-theme-primary">
                        <div className="font-medium text-theme-primary">{userMetadata.fullname || user.username}</div>
                        <div className="text-xs">{user.username}</div>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setUserMenuOpen(false)
                        setProfileModalOpen(true)
                      }}
                      className="flex w-full items-center px-4 py-2 text-sm text-theme-secondary bg-theme-hover"
                    >
                      <User className="mr-3 h-4 w-4" />
                      My Profile
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center px-4 py-2 text-sm text-theme-secondary bg-theme-hover"
                    >
                      <LogOut className="mr-3 h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                )}
                </div>
                
                {/* Admin Hamburger Menu */}
                {hasAdminPermission && (
                  <div className="relative" ref={adminMenuRef}>
                    <button 
                      className="p-2 rounded-lg text-theme-secondary hover:text-theme-primary bg-theme-hover focus:outline-none focus:ring-2 focus:ring-art-accent focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-200"
                      onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                      aria-label="Admin menu"
                      aria-expanded={adminMenuOpen}
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                    
                    {adminMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 rounded-md dropdown-theme py-1">
                        <Link
                          to="/admin"
                          onClick={() => setAdminMenuOpen(false)}
                          className="flex w-full items-center px-4 py-2 text-sm text-theme-secondary bg-theme-hover"
                        >
                          <Settings className="mr-3 h-4 w-4" />
                          Admin Panel
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Mobile menu button */}
              <button
                className="md:hidden rounded-md p-2 text-theme-secondary hover:text-theme-primary"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden bg-theme-secondary border-t border-theme-primary">
            <div className="space-y-1 px-2 pb-3 pt-2">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href || 
                  (item.href === '/' && location.pathname === '/')
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={(e) => {
                      setMobileMenuOpen(false)
                      // Clear search params when clicking Browse
                      if (item.href === '/' && location.pathname === '/' && window.location.search) {
                        e.preventDefault()
                        navigate('/', { replace: true })
                      }
                    }}
                    className={cn(
                      'block rounded-md px-3 py-2 text-lg font-medium transition-colors',
                      isActive
                        ? 'bg-art-accent text-white'
                        : 'text-theme-secondary bg-theme-hover'
                    )}
                  >
                    <span className="flex items-center">
                      {item.faIcon && <i className={`fas ${item.faIcon} mr-3 text-xl`} />}
                      {item.name}
                    </span>
                  </Link>
                )
              })}
            </div>
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-theme-secondary border-t border-theme-primary mt-auto">
        <div className="mx-auto px-6 py-6 sm:px-8 lg:px-12 xl:px-16">
          <p className="text-center text-sm text-theme-tertiary">
            Powered by ResourceSpace
          </p>
        </div>
      </footer>
      
      {/* Global Drag and Drop */}
      <DragDropOverlay onDrop={handleFileDrop} />
      
      {/* Upload Modal */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => {
          setUploadModalOpen(false)
          setUploadFiles([])
        }}
        files={uploadFiles}
      />
      
      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        userMetadata={userMetadata}
        onProfileUpdate={(updatedData) => {
          setUserMetadata(updatedData)
        }}
      />
    </div>
  )
})

Layout.displayName = 'Layout'

export default Layout