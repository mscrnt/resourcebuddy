/**
 * Cache API Integration Module
 * Provides functions to interact with the Python cache microservice
 */

const axios = require('axios');

const CACHE_API_URL = process.env.CACHE_API_URL || 'http://cache_api:8000';

// Create axios instance with default config
const cacheClient = axios.create({
  baseURL: CACHE_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Check if cache API is available
 */
async function checkCacheHealth() {
  try {
    const response = await cacheClient.get('/health');
    return response.data.status === 'healthy';
  } catch (error) {
    console.error('Cache API health check failed:', error.message);
    return false;
  }
}

/**
 * Get resource metadata from cache
 */
async function getCachedResource(resourceId) {
  try {
    const response = await cacheClient.get(`/resource/${resourceId}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return null; // Not in cache
    }
    console.error(`Failed to get cached resource ${resourceId}:`, error.message);
    throw error;
  }
}

/**
 * Get resource file from cache
 */
async function getCachedFile(resourceId) {
  try {
    const response = await cacheClient.get(`/file/${resourceId}`, {
      responseType: 'stream'
    });
    return {
      stream: response.data,
      headers: response.headers
    };
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    console.error(`Failed to get cached file ${resourceId}:`, error.message);
    throw error;
  }
}

/**
 * Get resource preview from cache
 */
async function getCachedPreview(resourceId, size = 'thm') {
  try {
    const response = await cacheClient.get(`/preview/${resourceId}/${size}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    console.error(`Failed to get cached preview ${resourceId}:`, error.message);
    throw error;
  }
}

/**
 * Search resources through cache
 */
async function searchWithCache(query, resourceTypes = null, limit = 100) {
  try {
    const response = await cacheClient.post('/search', {
      query,
      resource_types: resourceTypes,
      limit
    });
    return response.data;
  } catch (error) {
    console.error('Cache search failed:', error.message);
    throw error;
  }
}

/**
 * Prefetch resources into cache
 */
async function prefetchResources(resourceIds, includeFiles = false) {
  try {
    const response = await cacheClient.post('/prefetch', {
      resource_ids: resourceIds,
      include_files: includeFiles
    });
    return response.data;
  } catch (error) {
    console.error('Prefetch failed:', error.message);
    throw error;
  }
}

/**
 * Get cache statistics
 */
async function getCacheStats() {
  try {
    const response = await cacheClient.get('/debug/cache-status');
    return response.data;
  } catch (error) {
    console.error('Failed to get cache stats:', error.message);
    throw error;
  }
}

/**
 * Manually evict a resource from cache
 */
async function evictResource(resourceId) {
  try {
    const response = await cacheClient.delete(`/cache/${resourceId}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to evict resource ${resourceId}:`, error.message);
    throw error;
  }
}

module.exports = {
  checkCacheHealth,
  getCachedResource,
  getCachedFile,
  getCachedPreview,
  searchWithCache,
  prefetchResources,
  getCacheStats,
  evictResource,
  CACHE_API_URL
};