import { useSearchParams } from 'react-router-dom'
import ResourceFeed from '../components/ResourceFeed/ResourceFeed'

export default function BrowsePage() {
  const [searchParams] = useSearchParams()
  const searchQuery = searchParams.get('search') || searchParams.get('q') || ''
  
  return (
    <ResourceFeed
      context="browse"
      defaultViewMode="grid"
      showBreadcrumbs={false}
      initialQuery={searchQuery}
    />
  )
}