import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { Search, Upload, Folder, Star, User, Menu, X, LogOut } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { cn } from '../lib/utils'
import SearchBar from './SearchBar'
import useAuthStore from '../stores/useAuthStore'
import logo from '../assets/logo.png'
import DragDropOverlay from './DragDropOverlay'
import UploadModal from './UploadModal'

const navigation = [
  { name: 'Home', href: '/', icon: null },
  { name: 'My Uploads', href: '/my-uploads', icon: Upload },
  { name: 'Collections', href: '/collections', icon: Folder },
  { name: 'Featured', href: '/featured', icon: Star },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploadFiles, setUploadFiles] = useState([])
  const { user, logout } = useAuthStore()
  const userMenuRef = useRef(null)
  
  const handleLogout = () => {
    logout()
    navigate('/login')
  }
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false)
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
    <div className="min-h-screen bg-art-dark">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-art-darker/95 backdrop-blur-sm border-b border-art-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo and Desktop Nav */}
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0 flex items-center space-x-3">
                <img src={logo} alt="RS Art Station" className="h-10 w-10" />
                <h1 className="text-2xl font-bold text-white">RS Art Station</h1>
              </Link>
              
              {/* Desktop Navigation */}
              <nav className="hidden md:ml-10 md:flex md:space-x-8">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        'inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors',
                        isActive
                          ? 'text-white border-b-2 border-art-accent'
                          : 'text-art-gray-400 hover:text-white'
                      )}
                    >
                      {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
            </div>

            {/* Search and User Menu */}
            <div className="flex items-center gap-4">
              <SearchBar />
              
              {/* User Menu */}
              <div className="relative" ref={userMenuRef}>
                <button 
                  className="flex items-center gap-2 rounded-full p-2 text-art-gray-400 hover:text-white transition-colors"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <User className="h-5 w-5" />
                  {user && (
                    <span className="hidden md:inline text-sm">{user.username}</span>
                  )}
                </button>
                
                {/* User Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md bg-art-gray-900 py-1 shadow-lg ring-1 ring-black ring-opacity-5">
                    {user && (
                      <div className="px-4 py-2 text-sm text-art-gray-400 border-b border-art-gray-800">
                        Signed in as {user.username}
                      </div>
                    )}
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center px-4 py-2 text-sm text-art-gray-300 hover:bg-art-gray-800 hover:text-white"
                    >
                      <LogOut className="mr-3 h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile menu button */}
              <button
                className="md:hidden rounded-md p-2 text-art-gray-400 hover:text-white"
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
          <nav className="md:hidden bg-art-darker border-t border-art-gray-800">
            <div className="space-y-1 px-2 pb-3 pt-2">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'block rounded-md px-3 py-2 text-base font-medium transition-colors',
                      isActive
                        ? 'bg-art-gray-800 text-white'
                        : 'text-art-gray-400 hover:bg-art-gray-800 hover:text-white'
                    )}
                  >
                    <span className="flex items-center">
                      {item.icon && <item.icon className="mr-3 h-5 w-5" />}
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
      <footer className="bg-art-darker border-t border-art-gray-800 mt-auto">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-art-gray-500">
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
    </div>
  )
}