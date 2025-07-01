// ResourceSpace default resource type mappings based on common extensions
// Reference: ResourceSpace typically uses these IDs
export const RESOURCE_TYPES = {
  PHOTO: 1,
  DOCUMENT: 2,
  VIDEO: 3,
  AUDIO: 4,
  // These may vary by installation
  ARCHIVE: 5,
  COLLECTION: 6,
  // Add more as discovered from API
}

// Extension to resource type mapping
const extensionMappings = {
  // Images (Type 1)
  jpg: RESOURCE_TYPES.PHOTO,
  jpeg: RESOURCE_TYPES.PHOTO,
  png: RESOURCE_TYPES.PHOTO,
  gif: RESOURCE_TYPES.PHOTO,
  bmp: RESOURCE_TYPES.PHOTO,
  tiff: RESOURCE_TYPES.PHOTO,
  tif: RESOURCE_TYPES.PHOTO,
  webp: RESOURCE_TYPES.PHOTO,
  svg: RESOURCE_TYPES.PHOTO,
  raw: RESOURCE_TYPES.PHOTO,
  cr2: RESOURCE_TYPES.PHOTO,
  nef: RESOURCE_TYPES.PHOTO,
  dng: RESOURCE_TYPES.PHOTO,
  
  // Documents (Type 2)
  pdf: RESOURCE_TYPES.DOCUMENT,
  doc: RESOURCE_TYPES.DOCUMENT,
  docx: RESOURCE_TYPES.DOCUMENT,
  txt: RESOURCE_TYPES.DOCUMENT,
  rtf: RESOURCE_TYPES.DOCUMENT,
  odt: RESOURCE_TYPES.DOCUMENT,
  xls: RESOURCE_TYPES.DOCUMENT,
  xlsx: RESOURCE_TYPES.DOCUMENT,
  ppt: RESOURCE_TYPES.DOCUMENT,
  pptx: RESOURCE_TYPES.DOCUMENT,
  
  // Videos (Type 3)
  mp4: RESOURCE_TYPES.VIDEO,
  avi: RESOURCE_TYPES.VIDEO,
  mov: RESOURCE_TYPES.VIDEO,
  wmv: RESOURCE_TYPES.VIDEO,
  flv: RESOURCE_TYPES.VIDEO,
  mkv: RESOURCE_TYPES.VIDEO,
  webm: RESOURCE_TYPES.VIDEO,
  mpg: RESOURCE_TYPES.VIDEO,
  mpeg: RESOURCE_TYPES.VIDEO,
  m4v: RESOURCE_TYPES.VIDEO,
  
  // Audio (Type 4)
  mp3: RESOURCE_TYPES.AUDIO,
  wav: RESOURCE_TYPES.AUDIO,
  flac: RESOURCE_TYPES.AUDIO,
  aac: RESOURCE_TYPES.AUDIO,
  ogg: RESOURCE_TYPES.AUDIO,
  wma: RESOURCE_TYPES.AUDIO,
  m4a: RESOURCE_TYPES.AUDIO,
  opus: RESOURCE_TYPES.AUDIO,
  
  // Archives (Type 5 - if available)
  zip: RESOURCE_TYPES.ARCHIVE,
  rar: RESOURCE_TYPES.ARCHIVE,
  '7z': RESOURCE_TYPES.ARCHIVE,
  tar: RESOURCE_TYPES.ARCHIVE,
  gz: RESOURCE_TYPES.ARCHIVE,
  bz2: RESOURCE_TYPES.ARCHIVE,
}

/**
 * Get resource type from file extension
 * @param {File} file - The file object
 * @param {number} defaultType - Default resource type if extension not found
 * @returns {number} Resource type ID
 */
export function getResourceTypeFromFile(file, defaultType = RESOURCE_TYPES.PHOTO) {
  // First try by extension
  const ext = file.name.split('.').pop().toLowerCase()
  if (extensionMappings[ext]) {
    return extensionMappings[ext]
  }
  
  // Then try by MIME type
  const mimeType = file.type.toLowerCase()
  if (mimeType.startsWith('image/')) {
    return RESOURCE_TYPES.PHOTO
  } else if (mimeType.startsWith('video/')) {
    return RESOURCE_TYPES.VIDEO
  } else if (mimeType.startsWith('audio/')) {
    return RESOURCE_TYPES.AUDIO
  } else if (mimeType === 'application/pdf') {
    return RESOURCE_TYPES.DOCUMENT
  } else if (mimeType.includes('document') || mimeType.includes('text')) {
    return RESOURCE_TYPES.DOCUMENT
  }
  
  return defaultType
}

/**
 * Get icon component for resource type
 */
export function getResourceTypeIcon(resourceType) {
  switch (resourceType) {
    case RESOURCE_TYPES.PHOTO:
      return 'Image'
    case RESOURCE_TYPES.DOCUMENT:
      return 'FileText'
    case RESOURCE_TYPES.VIDEO:
      return 'Film'
    case RESOURCE_TYPES.AUDIO:
      return 'Music'
    case RESOURCE_TYPES.ARCHIVE:
      return 'Archive'
    default:
      return 'File'
  }
}

/**
 * Get display name for resource type
 */
export function getResourceTypeDisplayName(resourceType) {
  switch (resourceType) {
    case RESOURCE_TYPES.PHOTO:
      return 'Image'
    case RESOURCE_TYPES.DOCUMENT:
      return 'Document'
    case RESOURCE_TYPES.VIDEO:
      return 'Video'
    case RESOURCE_TYPES.AUDIO:
      return 'Audio'
    case RESOURCE_TYPES.ARCHIVE:
      return 'Archive'
    default:
      return 'File'
  }
}

/**
 * Group files by resource type
 */
export function groupFilesByResourceType(files) {
  const grouped = {}
  
  files.forEach(file => {
    const resourceType = getResourceTypeFromFile(file)
    if (!grouped[resourceType]) {
      grouped[resourceType] = []
    }
    grouped[resourceType].push(file)
  })
  
  return grouped
}