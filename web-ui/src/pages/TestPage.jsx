import { useState } from 'react'
import axios from 'axios'

export default function TestPage() {
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  const testBackend = async () => {
    try {
      setError('')
      setResult('Testing...')
      
      // Direct axios call to test
      const response = await axios.get('http://localhost:3003/test')
      setResult(JSON.stringify(response.data, null, 2))
    } catch (err) {
      setError(err.message)
      console.error('Test error:', err)
    }
  }

  const testLogin = async () => {
    try {
      setError('')
      setResult('Testing login...')
      
      const response = await axios.post('http://localhost:3003/api/login', {
        username: 'admin',
        password: '943fbb3d'
      })
      setResult(JSON.stringify(response.data, null, 2))
    } catch (err) {
      setError(err.message)
      console.error('Login test error:', err)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Backend Connection Test</h1>
      
      <div className="space-y-4">
        <button 
          onClick={testBackend}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Test Backend Connection
        </button>
        
        <button 
          onClick={testLogin}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 ml-4"
        >
          Test Login API
        </button>
      </div>

      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="font-bold">Result:</h3>
          <pre className="mt-2">{result}</pre>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-100 rounded">
          <h3 className="font-bold text-red-700">Error:</h3>
          <p className="mt-2 text-red-600">{error}</p>
        </div>
      )}
    </div>
  )
}