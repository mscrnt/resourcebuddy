import { useState, useEffect } from 'react'
import { Search, User, FileType, HelpCircle } from 'lucide-react'
import { cn } from '../../lib/utils'
import Tooltip from '../TooltipPortal'

const KEYWORD_LOGIC_OPTIONS = [
  { 
    value: 'all', 
    label: 'Match all words', 
    description: 'Results must contain every word',
    example: 'cat dog → finds items with both "cat" AND "dog"'
  },
  { 
    value: 'any', 
    label: 'Match any word', 
    description: 'Results can contain any of the words',
    example: 'cat dog → finds items with "cat" OR "dog"'
  },
  { 
    value: 'phrase', 
    label: 'Exact phrase', 
    description: 'Words must appear together in order',
    example: 'black cat → finds "black cat" but not "cat black"'
  },
  { 
    value: 'exclude', 
    label: 'Exclude words', 
    description: 'Results must NOT contain these words',
    example: 'cat -dog → finds "cat" but not if "dog" appears'
  }
]

const FILE_TYPE_PRESETS = [
  { label: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'], icon: '🖼️' },
  { label: 'Videos', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'], icon: '🎬' },
  { label: 'Documents', extensions: ['pdf', 'doc', 'docx', 'txt', 'rtf'], icon: '📄' },
  { label: 'Audio', extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg'], icon: '🎵' },
  { label: 'Archives', extensions: ['zip', 'rar', '7z', 'tar', 'gz'], icon: '📦' }
]

export default function StepOne({ data, onChange, resourceTypes, loading, compact = false }) {
  const [showKeywordHelp, setShowKeywordHelp] = useState(false)
  const [customFileType, setCustomFileType] = useState('')
  const [contributorSearch, setContributorSearch] = useState('')
  
  const handleKeywordChange = (value) => {
    onChange({ keywords: value })
  }
  
  const handleKeywordLogicChange = (value) => {
    onChange({ keywordLogic: value })
  }
  
  const handleFileTypeToggle = (extensions) => {
    const currentTypes = data.fileTypes || []
    const hasAll = extensions.every(ext => currentTypes.includes(ext))
    
    if (hasAll) {
      // Remove all
      onChange({ 
        fileTypes: currentTypes.filter(ext => !extensions.includes(ext)) 
      })
    } else {
      // Add all
      onChange({ 
        fileTypes: [...new Set([...currentTypes, ...extensions])] 
      })
    }
  }
  
  const handleAddCustomFileType = () => {
    if (customFileType && !data.fileTypes.includes(customFileType)) {
      onChange({ 
        fileTypes: [...data.fileTypes, customFileType.toLowerCase()] 
      })
      setCustomFileType('')
    }
  }
  
  const handleRemoveFileType = (type) => {
    onChange({ 
      fileTypes: data.fileTypes.filter(t => t !== type) 
    })
  }
  
  const handleUploadedByChange = (value) => {
    onChange({ uploadedBy: value })
  }
  
  const handleAddContributor = (contributor) => {
    if (contributor && !data.contributors.includes(contributor)) {
      onChange({ 
        contributors: [...data.contributors, contributor] 
      })
      setContributorSearch('')
    }
  }
  
  const handleRemoveContributor = (contributor) => {
    onChange({ 
      contributors: data.contributors.filter(c => c !== contributor) 
    })
  }
  
  return (
    <div className={cn("space-y-6", compact && "space-y-4")}>
      {/* Keywords Section */}
      <div className="bg-art-gray-800/50 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <Search className="h-5 w-5 text-art-accent" />
              Keywords
            </h3>
            <p className="text-sm text-art-gray-400 mt-1">
              What words describe what you're looking for?
            </p>
          </div>
          <Tooltip content="Keywords are the main words that describe your search. You can control how they match using the options below.">
            <button className="p-1 hover:bg-art-gray-700 rounded">
              <HelpCircle className="h-4 w-4 text-art-gray-400" />
            </button>
          </Tooltip>
        </div>
        
        <div className="space-y-4">
          <input
            type="text"
            value={data.keywords || ''}
            onChange={(e) => handleKeywordChange(e.target.value)}
            placeholder="Enter keywords... (e.g., sunset beach vacation)"
            className="w-full px-4 py-3 bg-art-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent text-base"
          />
          
          <div className="grid grid-cols-2 gap-2">
            {KEYWORD_LOGIC_OPTIONS.map(option => (
              <Tooltip key={option.value} content={`${option.description}\nExample: ${option.example}`}>
                <button
                  onClick={() => handleKeywordLogicChange(option.value)}
                  className={cn(
                    "p-3 rounded-lg text-left transition-colors",
                    data.keywordLogic === option.value
                      ? "bg-art-accent text-white"
                      : "bg-art-gray-700 text-art-gray-300 hover:bg-art-gray-600"
                  )}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs opacity-80 mt-1">{option.description}</div>
                </button>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>
      
      {/* File Types Section */}
      <div className="bg-art-gray-800/50 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <FileType className="h-5 w-5 text-art-accent" />
              File Types
            </h3>
            <p className="text-sm text-art-gray-400 mt-1">
              Limit your search to specific file formats
            </p>
          </div>
          <Tooltip content="Select file types to search for. You can choose presets or add custom extensions.">
            <button className="p-1 hover:bg-art-gray-700 rounded">
              <HelpCircle className="h-4 w-4 text-art-gray-400" />
            </button>
          </Tooltip>
        </div>
        
        {/* Preset File Types */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
          {FILE_TYPE_PRESETS.map(preset => {
            const isSelected = preset.extensions.every(ext => data.fileTypes?.includes(ext))
            return (
              <button
                key={preset.label}
                onClick={() => handleFileTypeToggle(preset.extensions)}
                className={cn(
                  "p-3 rounded-lg text-left transition-colors flex items-center gap-2",
                  isSelected
                    ? "bg-art-accent text-white"
                    : "bg-art-gray-700 text-art-gray-300 hover:bg-art-gray-600"
                )}
              >
                <span className="text-xl">{preset.icon}</span>
                <div>
                  <div className="font-medium">{preset.label}</div>
                  <div className="text-xs opacity-80">{preset.extensions.slice(0, 3).join(', ')}...</div>
                </div>
              </button>
            )
          })}
        </div>
        
        {/* Custom File Types */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={customFileType}
            onChange={(e) => setCustomFileType(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddCustomFileType()}
            placeholder="Add custom extension (e.g., raw)"
            className="flex-1 px-3 py-2 bg-art-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent text-sm"
          />
          <button
            onClick={handleAddCustomFileType}
            className="px-4 py-2 bg-art-accent text-white rounded-lg hover:bg-art-accent-dark transition-colors text-sm"
          >
            Add
          </button>
        </div>
        
        {/* Selected File Types */}
        {data.fileTypes?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.fileTypes.map(type => (
              <span
                key={type}
                className="inline-flex items-center gap-1 px-3 py-1 bg-art-gray-700 text-white text-sm rounded-full"
              >
                .{type}
                <button
                  onClick={() => handleRemoveFileType(type)}
                  className="hover:text-red-400 transition-colors"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
      
      {/* Contributors Section */}
      <div className="bg-art-gray-800/50 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <User className="h-5 w-5 text-art-accent" />
              Contributors & Uploaders
            </h3>
            <p className="text-sm text-art-gray-400 mt-1">
              Who created or uploaded the files?
            </p>
          </div>
          <Tooltip content="Filter by who uploaded or contributed to the files. You can search for your own uploads or specific users.">
            <button className="p-1 hover:bg-art-gray-700 rounded">
              <HelpCircle className="h-4 w-4 text-art-gray-400" />
            </button>
          </Tooltip>
        </div>
        
        {/* Uploaded By Options */}
        <div className="space-y-3 mb-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              checked={data.uploadedBy === 'anyone'}
              onChange={() => handleUploadedByChange('anyone')}
              className="w-4 h-4 text-art-accent bg-art-gray-700 border-art-gray-600"
            />
            <span className="text-white">Anyone</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              checked={data.uploadedBy === 'me'}
              onChange={() => handleUploadedByChange('me')}
              className="w-4 h-4 text-art-accent bg-art-gray-700 border-art-gray-600"
            />
            <span className="text-white">Only my uploads</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              checked={data.uploadedBy === 'specific'}
              onChange={() => handleUploadedByChange('specific')}
              className="w-4 h-4 text-art-accent bg-art-gray-700 border-art-gray-600"
            />
            <span className="text-white">Specific contributors</span>
          </label>
        </div>
        
        {/* Contributor Search */}
        {data.uploadedBy === 'specific' && (
          <>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={contributorSearch}
                onChange={(e) => setContributorSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddContributor(contributorSearch)}
                placeholder="Enter username or email..."
                className="flex-1 px-3 py-2 bg-art-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-art-accent text-sm"
              />
              <button
                onClick={() => handleAddContributor(contributorSearch)}
                className="px-4 py-2 bg-art-accent text-white rounded-lg hover:bg-art-accent-dark transition-colors text-sm"
              >
                Add
              </button>
            </div>
            
            {/* Selected Contributors */}
            {data.contributors?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.contributors.map(contributor => (
                  <span
                    key={contributor}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-art-gray-700 text-white text-sm rounded-full"
                  >
                    {contributor}
                    <button
                      onClick={() => handleRemoveContributor(contributor)}
                      className="hover:text-red-400 transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}