# ResourceBuddy (RS Art Station)

A modern, high-performance web interface for ResourceSpace digital asset management system with extensive features for professional media management.

## 🚀 Key Features

### Core Functionality
- **Modern UI**: Clean, responsive interface with dark/light theme support
- **High-Performance**: Redis caching, lazy loading, and optimized API calls
- **Advanced Search**: Multiple search interfaces including guided wizard and enterprise search
- **Collections**: Full collection management with multiple view modes
- **Annotations**: Universal annotation system with drawing tools for images and videos
- **Video Support**: Professional video player with frame-by-frame navigation
- **Batch Operations**: Efficient handling of multiple resources

### Search Capabilities
- **Quick Search**: Instant search from header bar
- **Advanced Search Modal**: Enterprise-grade filtering with metadata fields
- **Guided Search Wizard**: Step-by-step search building for complex queries
- **Metadata Click Search**: Quick filtering by clicking any metadata value
- **Search Presets**: Pre-built search templates
- **Saved Searches**: Save and reuse complex searches

### Resource Management
- **Upload System**: Drag-and-drop file uploads with progress tracking
- **Metadata Editing**: In-place editing with field validation
- **Alternative Files**: Manage different versions and annotations
- **Download Options**: Multiple format and size options
- **Related Resources**: Automatic discovery of similar content

### User Features
- **Custom Dashboard**: Drag-and-drop tile arrangement
- **User Profiles**: Profile pictures and bio management
- **Theme Preferences**: Persistent dark/light mode
- **Saved Collections**: Personal collection management
- **Upload History**: Track and manage your uploads

### Admin Features
- **Admin Panel**: Comprehensive settings management
- **Branding**: Custom logos and color schemes
- **System Monitoring**: Cache stats and ResourceSpace health
- **Layout Control**: Toggle features on/off
- **User Management**: Control access and permissions

## 🛠️ Tech Stack

### Frontend
- **React 18** with Vite for fast development
- **TailwindCSS** for responsive styling
- **Framer Motion** for smooth animations
- **React Query** for efficient data fetching
- **Video.js** for professional video playback
- **MarkerJS 3** for annotation tools

### Backend
- **Node.js** with Express
- **Redis** for high-performance caching
- **SQLite** for local data storage
- **Docker** for containerization
- **Nginx** for production serving

## 📦 Installation

### Prerequisites
- Docker and Docker Compose
- Git
- Node.js 18+ (for local development only)

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/rs-art-station.git
cd rs-art-station
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your ResourceSpace credentials
```

3. **Start with Docker Compose**
```bash
docker-compose up -d
```

4. **Access the application**
- ResourceBuddy: http://localhost:3002
- Backend API: http://localhost:3003
- Cache API: http://localhost:8000

### Manual Setup (Development)

1. **Backend Setup**
```bash
cd backend
npm install
npm run dev
```

2. **Frontend Setup**
```bash
cd web-ui
npm install
npm run dev
```

3. **Cache Service** (Optional)
```bash
cd services/cache_api
pip install -r requirements.txt
python main.py
```

## 🔧 Configuration

### Environment Variables

The main `.env` file in the root directory contains all configuration. Key variables:

- `RS_API_URL`: Your ResourceSpace API endpoint
- `RS_API_KEY`: ResourceSpace API key (get from user account)
- `RS_USER`: ResourceSpace username
- `VITE_BACKEND_URL`: Backend server URL
- `VITE_DEMO_MODE`: Enable demo mode without ResourceSpace

See `.env.example` for all available options.

### Docker Configuration

The `docker-compose.yml` includes:
- Frontend web UI (port 3002)
- Backend API server (port 3003)
- Redis cache (port 6379)
- Cache API service (port 8000)

## 📚 Documentation

All project documentation is organized in the [`/docs`](./docs/) folder:

- **[Setup Guide](./docs/setup/)** - Detailed installation and configuration
- **[Features](./docs/features/)** - Feature documentation and user guides
- **[Technical Docs](./docs/technical/)** - Architecture and implementation details
- **[API Reference](./docs/api/)** - API documentation and integration guides
- **[Development](./docs/development/)** - Development workflows and testing

See the [Documentation Index](./docs/README.md) for a complete overview.

## 🔌 ResourceSpace Integration

This project requires a ResourceSpace installation. It can work with:
- Self-hosted ResourceSpace
- ResourceSpace cloud instances
- Docker-based ResourceSpace

The integration uses ResourceSpace's API for all operations, ensuring compatibility with existing workflows and permissions.

## 🚢 Production Deployment

### Using Docker (Recommended)

1. **Build the production image**
```bash
docker build -t resourcebuddy .
```

2. **Run with environment variables**
```bash
docker run -d \
  -p 80:80 \
  --env-file .env \
  --name resourcebuddy \
  resourcebuddy
```

### Manual Deployment

1. **Build the frontend**
```bash
cd web-ui
npm run build
```

2. **Set up the backend**
```bash
cd backend
npm install --production
NODE_ENV=production node server.js
```

3. **Configure Nginx** (see `config/nginx.conf`)

## 🔒 Security

- API keys are never exposed to the frontend
- All ResourceSpace API calls are proxied through the backend
- User sessions are managed securely
- CORS is properly configured
- Input validation on all user inputs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built for the ResourceSpace community
- Inspired by modern DAM interfaces
- Special thanks to all contributors

## 🐛 Known Issues

- Alternative file thumbnails may not display if ResourceSpace preview generation is slow
- Some metadata field types may need additional configuration
- Video annotations are experimental

## 📞 Support

- Create an issue on GitHub
- Check the [documentation](./docs/)
- Join the ResourceSpace community forums