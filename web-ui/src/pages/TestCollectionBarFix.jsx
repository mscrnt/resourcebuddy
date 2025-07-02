import { useState } from 'react'
import CollectionBarSlide from '../components/CollectionBarSlide'

export default function TestCollectionBarFix() {
  const [activeCollection, setActiveCollection] = useState(null)
  const [collectionBarHeight, setCollectionBarHeight] = useState(52)

  return (
    <div className="min-h-screen bg-art-dark">
      {/* Header to simulate the layout */}
      <header className="sticky top-0 z-40 bg-art-darker/95 backdrop-blur-sm border-b border-art-gray-800">
        <div className="h-16 flex items-center px-6">
          <h1 className="text-xl font-bold text-white">Collection Bar Fix Test</h1>
        </div>
      </header>

      {/* Main content with scrollable area */}
      <main className="p-6" style={{ paddingBottom: `${collectionBarHeight + 24}px` }}>
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="bg-art-gray-800 p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-white mb-2">Test Instructions</h2>
            <p className="text-art-gray-300">
              The collection bar should be fixed at the bottom of the viewport.
              It should remain visible when scrolling this content.
            </p>
          </div>

          {/* Generate content to test scrolling */}
          {Array.from({ length: 20 }, (_, i) => (
            <div key={i} className="bg-art-gray-800 p-4 rounded-lg">
              <h3 className="text-white font-medium">Content Block {i + 1}</h3>
              <p className="text-art-gray-400 mt-2">
                This is a test content block to verify that the collection bar stays fixed at the bottom
                while scrolling through the page content.
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Collection Bar */}
      <CollectionBarSlide
        collection={activeCollection}
        onClose={() => console.log('Close collection bar')}
        selectedResources={new Set()}
        onAddResources={(message) => console.log(message)}
        onCollectionChange={setActiveCollection}
        onHeightChange={setCollectionBarHeight}
      />
    </div>
  )
}