# RS Art Station

A fast, artist-friendly web UI wrapper for ResourceSpace with a companion plugin for optimized performance.

## Features

- **Modern UI**: Clean, responsive interface inspired by ArtStation
- **High-Performance**: Optimized API endpoints with caching and metadata prefetching
- **Video Support**: Full-featured video player with scrubbing and quality controls
- **Infinite Scrolling**: Smooth, performant resource browsing
- **Collections**: Organize and browse resource collections
- **Docker-Ready**: Easy deployment with Docker Compose

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Git
- Node.js 18+ (for local development)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/rs-art-station.git
cd rs-art-station
```

2. Clone the ResourceSpace Docker repository:
```bash
git clone https://github.com/resourcespace/docker.git resourcespace-docker
```

3. Update database credentials in `db.env`:
```env
MYSQL_PASSWORD=your-secure-password
MYSQL_ROOT_PASSWORD=your-root-password
MYSQL_DATABASE=resourcespace
MYSQL_USER=resourcespace_rw
```

4. Start the services:
```bash
docker compose up --build -d
```

5. Access the applications:
   - ResourceSpace: http://localhost:8080
   - RS Art Station: http://localhost:3002

### Initial Setup

1. Complete ResourceSpace setup at http://localhost:8080/setup.php
   - Use "mariadb" as the database host
   - Leave MySQL binary path empty

2. Activate the RS Art Station plugin in ResourceSpace admin

3. Configure API access in RS Art Station

## Development

### Frontend Development

```bash
cd web-ui
npm install
npm run dev
```

### Plugin Development

The ResourceSpace plugin is located at `resourcespace/plugins/rs_art_station_plugin/`

Key files:
- `config/config.php` - Plugin configuration
- `hooks/all.php` - Hook implementations
- `include/api_functions.php` - Custom API endpoints
- `pages/setup.php` - Admin configuration page

### API Endpoints

The plugin adds optimized v2 API endpoints:

- `GET /api/v2/resources/search` - Optimized search with metadata
- `GET /api/v2/resources/batch-previews` - Batch preview URLs
- `GET /api/v2/collections/{id}/resources` - Collection resources

## Architecture

### Frontend Stack
- Vite + React
- TailwindCSS for styling
- React Query for data fetching
- Video.js for video playback
- Framer Motion for animations

### Backend Integration
- ResourceSpace plugin system
- Custom hooks for API extensions
- Caching layer for performance
- Preview generation queue

## Production Deployment

1. Build the production image:
```bash
docker build -t rs-art-station .
```

2. Set environment variables:
```bash
export RS_API_URL=https://your-resourcespace.com/api
export RS_API_KEY=your-api-key
export RS_USER=your-username
```

3. Run the container:
```bash
docker run -d \
  -p 80:80 \
  -e RS_API_URL=$RS_API_URL \
  -e RS_API_KEY=$RS_API_KEY \
  -e RS_USER=$RS_USER \
  rs-art-station
```

## Configuration

### Plugin Settings

Access plugin settings at: ResourceSpace Admin > System > Manage Plugins > RS Art Station Plugin

- **Enable Optimized API**: Toggle optimized endpoints
- **Cache Duration**: Set cache TTL (default: 300s)
- **Max Page Size**: Maximum results per page
- **CORS Origin**: Configure allowed origins

### Environment Variables

- `RS_API_URL`: ResourceSpace API endpoint
- `RS_API_KEY`: API authentication key
- `RS_USER`: ResourceSpace username
- `NODE_ENV`: Environment (development/production)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.