import { useQuery } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { useApi } from '../contexts/ApiContext'
import ResourceGrid from '../components/ResourceGrid'

export default function FeaturedPage() {
  const api = useApi()
  const { data: featuredCollections, isLoading } = useQuery({
    queryKey: ['featured-collections'],
    queryFn: () => api.getFeaturedCollections(),
  })

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center">
          <Star className="mr-3 h-8 w-8 text-yellow-500" />
          Featured Resources
        </h1>
        <p className="mt-2 text-art-gray-400">
          Curated collections showcasing the best content
        </p>
      </div>

      {isLoading ? (
        <div className="animate-pulse">Loading featured collections...</div>
      ) : featuredCollections?.length > 0 ? (
        <div className="space-y-12">
          {featuredCollections.map((collection) => (
            <div key={collection.ref} className="space-y-4">
              <h2 className="text-xl font-semibold text-white">
                {collection.name}
              </h2>
              {collection.description && (
                <p className="text-art-gray-400">{collection.description}</p>
              )}
              <ResourceGrid
                searchParams={{
                  collection: collection.ref,
                }}
                pageSize={12}
              />
            </div>
          ))}
        </div>
      ) : (
        <ResourceGrid
          searchParams={{
            promoted: true, // Fallback to promoted resources
            order_by: 'rating',
            sort: 'DESC',
          }}
        />
      )}
    </div>
  )
}