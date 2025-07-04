"""
Configuration for ResourceSpace Cache API
"""

from pydantic_settings import BaseSettings
from typing import List, Optional


class Settings(BaseSettings):
    """Application settings"""
    
    # ResourceSpace API settings
    RS_API_URL: str = "http://resourcespace:80/api/"
    RS_API_KEY: str = ""
    RS_USER: str = "admin"
    
    # Cache settings
    CACHE_DIR: str = "/app/cache"
    CACHE_TTL_DAYS: int = 7
    MAX_CACHE_SIZE_GB: float = 10.0
    MIN_FREE_SPACE_GB: float = 5.0
    
    # Redis settings
    REDIS_ENABLED: bool = False
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: Optional[str] = None
    REDIS_TTL_SECONDS: int = 3600  # 1 hour for hot cache
    
    # Cleanup settings
    CLEANUP_INTERVAL_HOURS: int = 6
    
    # Admin settings
    CONFIG_FILE_PATH: str = "/app/config/cache_config.json"
    
    # CORS settings
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://rs-art-station:3000",
        "http://rs-art-station-backend:3003"
    ]
    
    # API settings
    API_TITLE: str = "ResourceSpace Cache API"
    API_VERSION: str = "1.0.0"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Create settings instance
settings = Settings()