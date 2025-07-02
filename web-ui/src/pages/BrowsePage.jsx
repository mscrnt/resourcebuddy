import ResourceFeed from '../components/ResourceFeed/ResourceFeed'

export default function BrowsePage() {
  return (
    <ResourceFeed
      context="browse"
      defaultViewMode="grid"
      showBreadcrumbs={false}
    />
  )
}