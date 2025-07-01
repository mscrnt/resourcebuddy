// Mock API for demo purposes
export const mockResources = [
  {
    ref: 1,
    field8: "Mountain Landscape at Sunset",
    file_extension: "jpg",
    creation_date: "2025-06-15",
    file_size: 2048000,
    width: 1920,
    height: 1080,
    created_by_username: "demo_artist",
    previews: {
      thumbnail: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=200&fit=crop",
      preview: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
      screen: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop"
    },
    metadata: {
      title: "Mountain Landscape at Sunset",
      description: "Beautiful mountain vista captured during golden hour",
      keywords: "mountain, landscape, sunset, nature"
    },
    file_info: {
      size_formatted: "2.0 MB",
      mime_type: "image/jpeg",
      is_video: false,
      is_image: true
    }
  },
  {
    ref: 2,
    field8: "Ocean Waves Time-lapse",
    file_extension: "mp4",
    creation_date: "2025-06-14",
    file_size: 15360000,
    width: 3840,
    height: 2160,
    created_by_username: "demo_artist",
    previews: {
      thumbnail: "https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=300&h=200&fit=crop",
      preview: "https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800&h=600&fit=crop",
      screen: "https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1920&h=1080&fit=crop"
    },
    metadata: {
      title: "Ocean Waves Time-lapse",
      description: "Mesmerizing ocean waves captured in 4K",
      keywords: "ocean, waves, timelapse, water"
    },
    file_info: {
      size_formatted: "15.0 MB",
      mime_type: "video/mp4",
      is_video: true,
      is_image: false
    }
  },
  {
    ref: 3,
    field8: "Urban Architecture",
    file_extension: "jpg",
    creation_date: "2025-06-13",
    file_size: 3072000,
    width: 2400,
    height: 1600,
    created_by_username: "demo_artist",
    previews: {
      thumbnail: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=300&h=200&fit=crop",
      preview: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=600&fit=crop",
      screen: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1920&h=1080&fit=crop"
    },
    metadata: {
      title: "Urban Architecture",
      description: "Modern city skyline with dramatic lighting",
      keywords: "city, architecture, urban, buildings"
    },
    file_info: {
      size_formatted: "3.0 MB",
      mime_type: "image/jpeg",
      is_video: false,
      is_image: true
    }
  },
  {
    ref: 4,
    field8: "Forest Path",
    file_extension: "jpg",
    creation_date: "2025-06-12",
    file_size: 2560000,
    width: 2048,
    height: 1365,
    created_by_username: "demo_artist",
    previews: {
      thumbnail: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=300&h=200&fit=crop",
      preview: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop",
      screen: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop"
    },
    metadata: {
      title: "Forest Path",
      description: "Serene forest path in morning mist",
      keywords: "forest, nature, path, trees"
    },
    file_info: {
      size_formatted: "2.5 MB",
      mime_type: "image/jpeg",
      is_video: false,
      is_image: true
    }
  },
  {
    ref: 5,
    field8: "Abstract Art Animation",
    file_extension: "mp4",
    creation_date: "2025-06-11",
    file_size: 8192000,
    width: 1920,
    height: 1080,
    created_by_username: "demo_artist",
    previews: {
      thumbnail: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=300&h=200&fit=crop",
      preview: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&h=600&fit=crop",
      screen: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1920&h=1080&fit=crop"
    },
    metadata: {
      title: "Abstract Art Animation",
      description: "Colorful abstract patterns in motion",
      keywords: "abstract, art, animation, colors"
    },
    file_info: {
      size_formatted: "8.0 MB",
      mime_type: "video/mp4",
      is_video: true,
      is_image: false
    }
  },
  {
    ref: 6,
    field8: "Desert Dunes",
    file_extension: "jpg",
    creation_date: "2025-06-10",
    file_size: 1843200,
    width: 2560,
    height: 1440,
    created_by_username: "demo_artist",
    previews: {
      thumbnail: "https://images.unsplash.com/photo-1542401886-65d6c61db217?w=300&h=200&fit=crop",
      preview: "https://images.unsplash.com/photo-1542401886-65d6c61db217?w=800&h=600&fit=crop",
      screen: "https://images.unsplash.com/photo-1542401886-65d6c61db217?w=1920&h=1080&fit=crop"
    },
    metadata: {
      title: "Desert Dunes",
      description: "Sand dunes with beautiful shadow patterns",
      keywords: "desert, dunes, sand, landscape"
    },
    file_info: {
      size_formatted: "1.8 MB",
      mime_type: "image/jpeg",
      is_video: false,
      is_image: true
    }
  }
];

export const mockCollections = [
  {
    ref: 1,
    name: "Nature Photography",
    count: 3,
    type: "public"
  },
  {
    ref: 2,
    name: "Video Projects",
    count: 2,
    type: "private"
  },
  {
    ref: 3,
    name: "Urban Exploration",
    count: 1,
    type: "public"
  }
];

// Mock API implementation
export const mockApiV2 = {
  searchResources: async (params = {}) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const { offset = 0, per_page = 24 } = params;
    const start = offset;
    const end = offset + per_page;
    
    return {
      results: mockResources.slice(start, end),
      offset,
      per_page,
      total: mockResources.length,
      has_more: end < mockResources.length
    };
  },

  getUserCollections: async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockCollections;
  },

  getFeaturedCollections: async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockCollections.filter(c => c.type === 'public');
  },

  getResource: async (id) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockResources.find(r => r.ref === parseInt(id)) || null;
  },

  getResourceFieldData: async (id) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const resource = mockResources.find(r => r.ref === parseInt(id));
    if (!resource) return [];
    
    return [
      { ref: 1, name: "title", title: "Title", value: resource.metadata.title },
      { ref: 2, name: "description", title: "Description", value: resource.metadata.description },
      { ref: 3, name: "keywords", title: "Keywords", value: resource.metadata.keywords }
    ];
  }
};