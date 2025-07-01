import { useState, useCallback, useRef } from 'react'
import { Upload } from 'lucide-react'
import ResourceGrid from '../components/ResourceGrid'
import ResourceModal from '../components/ResourceModal'
import UploadModal from '../components/UploadModal'
import SortDropdown from '../components/SortDropdown'
import useAuthStore from '../stores/useAuthStore'

export default function MyUploadsPage() {
  const { user } = useAuthStore()
  const fileInputRef = useRef(null)
  const [selectedResource, setSelectedResource] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploadFiles, setUploadFiles] = useState([])
  const [resources, setResources] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [orderBy, setOrderBy] = useState('modified')
  const [sort, setSort] = useState('DESC')

  // Handle file selection from input
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      setUploadFiles(files)
      setUploadModalOpen(true)
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUploadClick = () => {
    // Open modal directly without files
    setUploadFiles([])
    setUploadModalOpen(true)
  }

  const handleUploadComplete = () => {
    // Refresh the grid after upload
    window.location.reload()
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">My Uploads</h1>
          <p className="mt-2 text-art-gray-400">
            Manage your uploaded resources
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <SortDropdown 
            key="sort-dropdown-v2"
            value={orderBy}
            sort={sort}
            onChange={setOrderBy}
            onSortChange={setSort}
          />
          
          <button 
            onClick={handleUploadClick}
            type="button"
            className="inline-flex items-center rounded-md bg-art-accent px-4 py-2 text-sm font-medium text-white hover:bg-art-accent/90 transition-colors"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload New
          </button>
        </div>
      </div>

      {user ? (
        <>
          <ResourceGrid 
            searchParams={{
              search: `!myuploads:${user.username === 'admin' ? '2' : (user.ref || user.id)}`,
              order_by: orderBy,
              sort: sort,
            }}
            onResourceClick={(resource, allResources, index) => {
              setSelectedResource(resource)
              setResources(allResources)
              setSelectedIndex(index)
              setModalOpen(true)
            }}
            onResourcesLoaded={useCallback((newResources) => {
              setResources(newResources)
            }, [])}
          />

          <ResourceModal
            resource={selectedResource}
            isOpen={modalOpen}
            onClose={() => {
              setModalOpen(false)
              setSelectedResource(null)
            }}
            onNext={() => {
              const nextIndex = selectedIndex + 1
              if (nextIndex < resources.length) {
                setSelectedIndex(nextIndex)
                setSelectedResource(resources[nextIndex])
              }
            }}
            onPrevious={() => {
              const prevIndex = selectedIndex - 1
              if (prevIndex >= 0) {
                setSelectedIndex(prevIndex)
                setSelectedResource(resources[prevIndex])
              }
            }}
            hasNext={selectedIndex < resources.length - 1}
            hasPrevious={selectedIndex > 0}
            context="myuploads"
          />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-art-gray-400">Please log in to view your uploads</p>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
      />

      {/* Upload Modal */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => {
          setUploadModalOpen(false)
          setUploadFiles([])
        }}
        onUploadComplete={() => {
          // Reload the page after successful uploads
          handleUploadComplete()
        }}
        files={uploadFiles}
      />
    </div>
  )
}