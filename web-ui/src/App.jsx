import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import DynamicMeta from './components/DynamicMeta'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import MyUploadsPage from './pages/MyUploadsPage'
import CollectionsPage from './pages/CollectionsPage'
import FeaturedPage from './pages/FeaturedPage'
import SearchPage from './pages/SearchPage'
import AdminPage from './pages/AdminPage'
import TestPage from './pages/TestPage'

function App() {
  return (
    <>
      <DynamicMeta />
      <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/test" element={<TestPage />} />
      
      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="my-uploads" element={<MyUploadsPage />} />
        <Route path="collections" element={<CollectionsPage />} />
        <Route path="collections/:id" element={<CollectionsPage />} />
        <Route path="featured" element={<FeaturedPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="admin" element={<AdminPage />} />
      </Route>
    </Routes>
    </>
  )
}

export default App