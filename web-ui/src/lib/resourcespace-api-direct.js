import axios from 'axios'
import CryptoJS from 'crypto-js'

const API_KEY = import.meta.env.VITE_RS_API_KEY
const API_USER = import.meta.env.VITE_RS_USER
const API_URL = import.meta.env.VITE_RS_API_URL

// Create axios instance for direct calls (no proxy)
const rsApiDirect = axios.create({
  baseURL: API_URL,
  timeout: 30000,
})

// Helper to sign API requests
function signRequest(query) {
  const signature = CryptoJS.SHA256(API_KEY + query).toString()
  return signature
}

// Direct login function for testing
export async function directLogin(username, password) {
  try {
    // Login function doesn't require user parameter
    const params = [
      ['function', 'login'],
      ['username', username],
      ['password', password]
    ]
    
    const queryString = params
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&')
    
    const signature = signRequest(queryString)
    const fullQuery = `${queryString}&sign=${signature}`
    
    console.log('Direct login URL:', API_URL + '?' + fullQuery)
    
    const response = await rsApiDirect.get('', {
      params: Object.fromEntries(new URLSearchParams(fullQuery))
    })
    console.log('Direct login response:', response.data)
    
    return response.data
  } catch (error) {
    console.error('Direct login error:', error)
    throw error
  }
}

export default { directLogin }