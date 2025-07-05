import { useState, useRef, useEffect } from 'react'
import { X, Camera, Save, ExternalLink } from 'lucide-react'
import { cn } from '../lib/utils'

export default function UserProfileModal({ isOpen, onClose, userMetadata, onProfileUpdate }) {
  const [bio, setBio] = useState(userMetadata?.bio || '')
  const [profilePicture, setProfilePicture] = useState(userMetadata?.profile_picture || '')
  const [rsProfilePicture, setRsProfilePicture] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [useRsProfile, setUseRsProfile] = useState(true)
  const fileInputRef = useRef(null)
  
  useEffect(() => {
    if (userMetadata) {
      setBio(userMetadata.bio || '')
      setProfilePicture(userMetadata.profile_picture || '')
      setPreviewUrl(null)
      
      // Fetch ResourceSpace profile image
      if (userMetadata.ref) {
        fetchRsProfileImage()
      }
    }
  }, [userMetadata])
  
  const fetchRsProfileImage = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/user-profile/${userMetadata.ref}/rs-picture`
      )
      
      if (response.ok) {
        const data = await response.json()
        if (data.profileImageUrl) {
          setRsProfilePicture(data.profileImageUrl)
        }
      }
    } catch (error) {
      console.error('Failed to fetch ResourceSpace profile image:', error)
    }
  }
  
  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }
  
  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Upload profile picture if changed
      let newProfilePicturePath = profilePicture
      
      if (fileInputRef.current?.files[0]) {
        const formData = new FormData()
        formData.append('picture', fileInputRef.current.files[0])
        
        const uploadResponse = await fetch(
          `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/user-profile/${userMetadata.ref}/picture`,
          {
            method: 'POST',
            body: formData
          }
        )
        
        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json()
          newProfilePicturePath = uploadData.path
        }
      }
      
      // Update profile data
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}/api/user-profile/${userMetadata.ref}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: userMetadata.username,
            bio,
            profile_picture: newProfilePicturePath,
            theme_preference: userMetadata.theme_preference
          })
        }
      )
      
      if (response.ok) {
        const data = await response.json()
        onProfileUpdate({ ...userMetadata, bio, profile_picture: newProfilePicturePath })
        onClose()
      }
    } catch (error) {
      console.error('Failed to save profile:', error)
    } finally {
      setIsSaving(false)
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-art-darker rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-art-gray-800">
          <h2 className="text-xl font-semibold text-white">My Profile</h2>
          <button
            onClick={onClose}
            className="p-1 text-art-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Profile Picture */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="h-24 w-24 rounded-full bg-art-gray-800 overflow-hidden">
                {(previewUrl || rsProfilePicture || profilePicture) ? (
                  <img 
                    src={previewUrl || rsProfilePicture || `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'}${profilePicture}`}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Camera className="h-8 w-8 text-art-gray-600" />
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 bg-art-accent rounded-full text-white hover:bg-art-accent-dark transition-colors"
                title="Upload custom profile picture"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            {/* ResourceSpace Profile Note */}
            <div className="mt-3 text-center">
              <p className="text-xs text-art-gray-400">
                {rsProfilePicture ? (
                  <>Using your ResourceSpace profile picture</>
                ) : (
                  <>To set a profile picture in ResourceSpace,</>
                )}
              </p>
              <a 
                href={`${import.meta.env.VITE_RS_API_URL?.replace('/api/', '')}/pages/user/user_profile_edit.php`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-art-accent hover:text-art-accent-light inline-flex items-center gap-1 mt-1"
              >
                {rsProfilePicture ? 'Change in ResourceSpace' : 'Go to ResourceSpace settings'}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          
          {/* User Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-art-gray-400 mb-1">
                Full Name
              </label>
              <div className="text-white">{userMetadata?.fullname}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-art-gray-400 mb-1">
                Username
              </label>
              <div className="text-white">{userMetadata?.username}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-art-gray-400 mb-1">
                User Group
              </label>
              <div className="text-white">Group {userMetadata?.usergroup}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-art-gray-400 mb-1">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={4}
                className="w-full px-3 py-2 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent resize-none"
              />
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-art-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-art-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              "flex items-center gap-2 px-4 py-2 bg-art-accent text-white rounded-lg transition-colors",
              isSaving ? "opacity-50 cursor-not-allowed" : "hover:bg-art-accent-dark"
            )}
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}