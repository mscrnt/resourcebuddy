import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import DynamicMeta from './components/DynamicMeta'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import BrowsePage from './pages/BrowsePage'
import MyUploadsPage from './pages/MyUploadsPage'
import CollectionsPage from './pages/CollectionsPage'
import FeaturedPage from './pages/FeaturedPage'
import SearchPage from './pages/SearchPage'
import AdminPage from './pages/AdminPage'
import TestPage from './pages/TestPage'
import TestCollectionBar from './pages/TestCollectionBar'
import TestCollectionBarFix from './pages/TestCollectionBarFix'
import DebugPage from './pages/DebugPage'
import SharePage from './pages/SharePage'
import TestModalPage from './pages/TestModalPage'

function App() {
  return (
    <>
      <DynamicMeta />
      <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/test" element={<TestPage />} />
      <Route path="/test-collection-bar" element={<TestCollectionBar />} />
      <Route path="/test-collection-bar-fix" element={<TestCollectionBarFix />} />
      <Route path="/share" element={<SharePage />} />
      
      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<BrowsePage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="my-uploads" element={<MyUploadsPage />} />
        <Route path="collections" element={<CollectionsPage />} />
        <Route path="collections/:id" element={<CollectionsPage />} />
        <Route path="featured" element={<FeaturedPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="debug" element={<DebugPage />} />
        <Route path="test-modal" element={<TestModalPage />} />
      </Route>
    </Routes>
    </>
  )
}

export default App