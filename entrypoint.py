#!/usr/bin/env python3
"""
Production entrypoint for RS Art Station wrapper
Manages nginx and any backend services needed
"""

import os
import sys
import subprocess
import signal
import time

def signal_handler(signum, frame):
    """Handle shutdown signals gracefully"""
    print("Received shutdown signal, cleaning up...")
    sys.exit(0)

def check_resourcespace_connection():
    """Verify ResourceSpace is accessible"""
    rs_url = os.environ.get('RS_API_URL', 'http://localhost/resourcespace/api')
    try:
        import urllib.request
        response = urllib.request.urlopen(f"{rs_url}/", timeout=5)
        return response.status == 200
    except Exception as e:
        print(f"Warning: Cannot connect to ResourceSpace at {rs_url}: {e}")
        return False

def start_services():
    """Start nginx and any other required services"""
    print("Starting RS Art Station wrapper...")
    
    # Check ResourceSpace connection
    if check_resourcespace_connection():
        print("ResourceSpace API is accessible")
    else:
        print("Warning: ResourceSpace API is not accessible, some features may not work")
    
    # Start nginx in foreground
    print("Starting nginx...")
    nginx_cmd = ["nginx", "-g", "daemon off;"]
    
    try:
        subprocess.run(nginx_cmd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error starting nginx: {e}")
        sys.exit(1)

def main():
    """Main entry point"""
    # Set up signal handlers
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    
    # Ensure required environment variables are set
    required_vars = ['RS_API_URL', 'RS_API_KEY']
    missing_vars = [var for var in required_vars if not os.environ.get(var)]
    
    if missing_vars:
        print(f"Error: Missing required environment variables: {', '.join(missing_vars)}")
        print("Please set:")
        for var in missing_vars:
            print(f"  - {var}")
        sys.exit(1)
    
    # Start services
    start_services()

if __name__ == "__main__":
    main()