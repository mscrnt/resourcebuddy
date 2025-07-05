#!/usr/bin/env node

// Script to update hardcoded dark theme classes to theme-aware classes

const replacements = [
  // Background colors
  { from: /\bbg-art-dark\b/g, to: 'bg-theme-primary' },
  { from: /\bbg-art-darker\b/g, to: 'bg-theme-secondary' },
  { from: /\bbg-art-gray-900\b/g, to: 'bg-theme-elevated' },
  { from: /\bbg-art-gray-800\b/g, to: 'bg-theme-tertiary' },
  { from: /\bhover:bg-art-gray-800\b/g, to: 'bg-theme-hover' },
  { from: /\bhover:bg-art-gray-700\b/g, to: 'bg-theme-hover' },
  
  // Text colors
  { from: /\btext-white\b/g, to: 'text-theme-primary' },
  { from: /\btext-art-gray-400\b/g, to: 'text-theme-secondary' },
  { from: /\btext-art-gray-500\b/g, to: 'text-theme-tertiary' },
  { from: /\btext-art-gray-600\b/g, to: 'text-theme-tertiary' },
  { from: /\btext-art-gray-300\b/g, to: 'text-theme-secondary' },
  { from: /\bhover:text-white\b/g, to: 'hover:text-theme-primary' },
  
  // Border colors
  { from: /\bborder-art-gray-800\b/g, to: 'border-theme-primary' },
  { from: /\bborder-art-gray-700\b/g, to: 'border-theme-secondary' },
  { from: /\bborder-art-gray-600\b/g, to: 'border-theme-secondary' },
  { from: /\bdivide-art-gray-800\b/g, to: 'divide-theme-primary' },
  
  // Input specific
  { from: /\bbg-art-gray-800\s+(?=.*text-white.*input|.*placeholder)/g, to: 'input-theme ' },
];

const componentsToUpdate = [
  'src/components/ResourceFeed/FloatingSearchBar.jsx',
  'src/components/ResourceFeed/ExpandableFiltersPanel.jsx',
  'src/components/ResourceCard.jsx',
  'src/components/ResourceTable.jsx',
  'src/components/DashboardTileModal.jsx',
  'src/components/CollectionSelectModal.jsx',
  'src/components/ResourceModalEnhanced.jsx',
  'src/components/MetadataPanel.jsx',
  'src/components/CollectionBar.jsx',
  'src/components/CollectionBarEnhanced.jsx',
  'src/components/CollectionBarCompact.jsx',
  'src/components/CollectionBarFooter.jsx',
  'src/components/CollectionBarVertical.jsx',
  'src/components/CollectionBarSlide.jsx',
  'src/components/UploadModal.jsx',
  'src/components/UserProfileModal.jsx',
  'src/components/DragDropOverlay.jsx',
  'src/components/SortDropdown.jsx',
  'src/components/ResourceGrid.jsx',
  'src/components/NodeSelector.jsx',
  'src/components/MetadataForm.jsx',
  'src/components/UploadedResourcesGrid.jsx',
  'src/components/CollectionSelector.jsx',
];

console.log('Theme class replacements to be made:');
replacements.forEach(r => {
  console.log(`  ${r.from} → ${r.to}`);
});

console.log('\nFiles to update:');
componentsToUpdate.forEach(f => console.log(`  ${f}`));

console.log('\nNote: This is a dry run. Actual implementation would require file system operations.');