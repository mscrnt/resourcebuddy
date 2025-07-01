// Detect the current context from URL and state
export function detectUploadContext(location, params) {
  const context = {
    type: 'general',
    collectionId: null,
    resourceId: null,
    searchQuery: null,
    description: 'General Upload'
  }

  const pathname = location.pathname
  
  // Check if in collection view
  if (pathname.includes('/collections/')) {
    const collectionId = params.id || pathname.split('/collections/')[1]
    if (collectionId && collectionId !== 'undefined') {
      context.type = 'collection'
      context.collectionId = collectionId
      context.description = `Collection #${collectionId}`
    }
  }
  
  // Check if in resource view
  else if (pathname.includes('/resource/')) {
    const resourceId = params.id || pathname.split('/resource/')[1]
    if (resourceId) {
      context.type = 'resource'
      context.resourceId = resourceId
      context.description = `Related to Resource #${resourceId}`
    }
  }
  
  // Check if in search results
  else if (pathname.includes('/search') && location.search) {
    const searchParams = new URLSearchParams(location.search)
    const query = searchParams.get('q')
    if (query) {
      context.type = 'search'
      context.searchQuery = query
      context.description = `Search: "${query}"`
    }
  }
  
  // Check if on my uploads page
  else if (pathname.includes('/my-uploads')) {
    context.type = 'my-uploads'
    context.description = 'My Uploads'
  }

  return context
}

// Check if user has upload permission
export async function checkUploadPermission(api, context) {
  try {
    // Check general create permission
    const hasCreatePermission = await api.checkPermission('c')
    
    if (!hasCreatePermission) {
      return {
        allowed: false,
        reason: 'You do not have permission to create resources'
      }
    }
    
    // If uploading to a specific collection, check collection permissions
    if (context.type === 'collection' && context.collectionId) {
      // Check if user can edit this collection
      const canEditCollection = await api.checkCollectionPermission(context.collectionId, 'edit')
      
      if (!canEditCollection) {
        return {
          allowed: false,
          reason: `You do not have permission to add resources to collection #${context.collectionId}`
        }
      }
    }
    
    return {
      allowed: true,
      reason: null
    }
  } catch (error) {
    console.error('Permission check failed:', error)
    return {
      allowed: false,
      reason: 'Failed to verify upload permissions'
    }
  }
}