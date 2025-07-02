import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiProvider } from './contexts/ApiContext.jsx'
import { ResourceModalProvider } from './contexts/ResourceModalContext.jsx'
import { CollectionBarProvider } from './contexts/CollectionBarContext.jsx'
import App from './App.jsx'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 10, // 10 minutes
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ApiProvider>
          <CollectionBarProvider>
            <ResourceModalProvider>
              <App />
            </ResourceModalProvider>
          </CollectionBarProvider>
        </ApiProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)