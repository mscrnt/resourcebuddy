# ResourceSpace Setup Guide

## Quick Start

1. **Start the services** (already running):
   ```bash
   docker compose -f docker-compose-simple.yml up -d
   ```

2. **Wait for setup to complete** (5-10 minutes):
   - The ResourceSpace container is installing dependencies and PHP extensions
   - You can monitor progress with: `docker logs -f resourcespace`

3. **Access ResourceSpace Setup**:
   - Once ready, visit: http://localhost:8080/setup.php
   - You'll see the ResourceSpace installation wizard

## Initial ResourceSpace Configuration

When you reach the setup page:

### Database Configuration
- **MySQL Server**: `mariadb` (not localhost!)
- **MySQL Username**: `resourcespace`
- **MySQL Password**: `rspass123`
- **MySQL Database**: `resourcespace`

### Admin User
- Create your admin username and password
- This will be used to log into ResourceSpace

### Base URL
- Set to: `http://localhost:8080`

## After Setup

1. **Login to ResourceSpace**:
   - URL: http://localhost:8080
   - Use the admin credentials you created

2. **Create API User** (for RS Art Station):
   - Go to: System > Manage Users
   - Create a new user for API access
   - Generate an API key for this user
   - Note down the username and API key

3. **Upload Test Images**:
   - Click "Upload" in the top menu
   - Drag and drop some images
   - Add metadata (title, description, etc.)
   - Submit to create resources

4. **Create Collections**:
   - Go to "My Collections"
   - Create a new collection
   - Add your uploaded resources to it

## Connect RS Art Station

1. **Configure API Access**:
   Create a `.env` file in the project root:
   ```env
   RS_API_KEY=your-api-key-here
   RS_USER=your-api-username
   ```

2. **Access RS Art Station**:
   - URL: http://localhost:3002
   - You should now see your uploaded resources!

## Troubleshooting

### ResourceSpace won't start
- Check logs: `docker logs resourcespace`
- Ensure port 8080 is not in use: `lsof -i:8080`

### Can't connect to database
- Ensure MariaDB is running: `docker ps | grep mariadb`
- Check database logs: `docker logs rs-mariadb`

### RS Art Station can't connect to API
- Verify ResourceSpace is accessible: `curl http://localhost:8080/api/`
- Check API credentials are correct
- Ensure CORS is enabled in ResourceSpace

## Useful Commands

```bash
# View all containers
docker ps -a

# Stop all services
docker compose -f docker-compose-simple.yml down

# Restart a specific service
docker restart resourcespace

# View logs
docker logs -f resourcespace
docker logs -f rs-art-station

# Access ResourceSpace container
docker exec -it resourcespace bash

# Access MariaDB
docker exec -it rs-mariadb mysql -u resourcespace -prspass123 resourcespace
```