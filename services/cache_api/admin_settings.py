"""
Admin settings management for cache configuration
Persists settings to JSON file and allows runtime updates
"""

import json
import os
from typing import Dict, Any
from pathlib import Path
import logging
from pydantic import BaseModel, Field, validator
from datetime import datetime

logger = logging.getLogger(__name__)


class CacheSettings(BaseModel):
    """Cache configuration settings"""
    media_cache_ttl_days: int = Field(default=7, ge=1, le=30, description="Media file TTL in days")
    redis_enabled: bool = Field(default=False, description="Enable Redis hot cache")
    max_cache_size_mb: int = Field(default=10240, ge=100, description="Maximum cache size in MB")
    cleanup_interval_hours: int = Field(default=6, ge=1, le=24, description="Cleanup interval in hours")
    redis_ttl_seconds: int = Field(default=3600, ge=60, le=86400, description="Redis TTL in seconds")
    
    @validator('media_cache_ttl_days')
    def validate_ttl(cls, v):
        if v < 1 or v > 30:
            raise ValueError("TTL must be between 1 and 30 days")
        return v


class AdminSettingsManager:
    """Manages persistent admin settings"""
    
    def __init__(self, config_path: str):
        self.config_path = Path(config_path)
        self.settings: CacheSettings = self._load_settings()
        
    def _load_settings(self) -> CacheSettings:
        """Load settings from file or create defaults"""
        if self.config_path.exists():
            try:
                with open(self.config_path, 'r') as f:
                    data = json.load(f)
                    logger.info(f"Loaded settings from {self.config_path}")
                    return CacheSettings(**data)
            except Exception as e:
                logger.error(f"Failed to load settings: {e}")
                
        # Create default settings
        logger.info("Creating default settings")
        settings = CacheSettings()
        self._save_settings(settings)
        return settings
        
    def _save_settings(self, settings: CacheSettings) -> bool:
        """Save settings to file"""
        try:
            # Ensure directory exists
            self.config_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Add metadata
            data = settings.dict()
            data['_metadata'] = {
                'updated_at': datetime.utcnow().isoformat(),
                'version': '1.0'
            }
            
            # Write atomically
            temp_path = self.config_path.with_suffix('.tmp')
            with open(temp_path, 'w') as f:
                json.dump(data, f, indent=2)
                
            # Move to final location
            temp_path.replace(self.config_path)
            
            logger.info(f"Settings saved to {self.config_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to save settings: {e}")
            return False
            
    def get_settings(self) -> Dict[str, Any]:
        """Get current settings as dict"""
        return self.settings.dict()
        
    def update_settings(self, updates: Dict[str, Any]) -> CacheSettings:
        """Update settings with validation"""
        try:
            # Create new settings with updates
            current_data = self.settings.dict()
            current_data.update(updates)
            
            # Validate
            new_settings = CacheSettings(**current_data)
            
            # Save
            if self._save_settings(new_settings):
                self.settings = new_settings
                logger.info(f"Settings updated: {updates}")
                return new_settings
            else:
                raise ValueError("Failed to save settings")
                
        except Exception as e:
            logger.error(f"Settings update failed: {e}")
            raise
            
    def get_setting(self, key: str) -> Any:
        """Get a specific setting value"""
        return getattr(self.settings, key, None)
        
    def reload(self):
        """Reload settings from file"""
        self.settings = self._load_settings()
        logger.info("Settings reloaded")


# Create default cache_config.json if it doesn't exist
def ensure_config_file(path: str = "/app/cache_config.json"):
    """Ensure config file exists with defaults"""
    config_path = Path(path)
    if not config_path.exists():
        try:
            config_path.parent.mkdir(parents=True, exist_ok=True)
            default_settings = CacheSettings()
            with open(config_path, 'w') as f:
                data = default_settings.dict()
                data['_metadata'] = {
                    'created_at': datetime.utcnow().isoformat(),
                    'version': '1.0'
                }
                json.dump(data, f, indent=2)
            logger.info(f"Created default config at {config_path}")
        except Exception as e:
            logger.error(f"Failed to create default config: {e}")