import { useRef, useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '../lib/utils'

// Dynamic import for Plyr to avoid Vite resolution issues
let Plyr = null

export default function VideoPlayerEnhanced({ 
  src, 
  poster = null,
  title = 'Video',
  resource = null, 
  isFullscreen = false,
  className = '',
  onError = null
}) {
  const videoRef = useRef(null)
  const playerRef = useRef(null)
  const containerRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Initialize Plyr
  useEffect(() => {
    if (!videoRef.current || !src) return

    // Dynamically import Plyr
    const initializePlayer = async () => {
      try {
        if (!Plyr) {
          const PlyrModule = await import('plyr')
          Plyr = PlyrModule.default
        }

        // Plyr configuration
    const options = {
      controls: [
        'play-large',
        'restart',
        'rewind',
        'play',
        'fast-forward',
        'progress',
        'current-time',
        'duration',
        'mute',
        'volume',
        'captions',
        'settings',
        'pip',
        'airplay',
        'fullscreen'
      ],
      settings: ['captions', 'quality', 'speed', 'loop'],
      keyboard: {
        focused: true,
        global: false
      },
      tooltips: {
        controls: true,
        seek: true
      },
      speed: {
        selected: 1,
        options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
      },
      seekTime: 5,
      invertTime: true,
      displayDuration: true,
      ratio: '16:9',
      fullscreen: {
        enabled: true,
        fallback: true,
        iosNative: true
      },
      storage: {
        enabled: true,
        key: 'plyr-rs-art'
      },
      // Custom CSS variables for theming
      resetOnEnd: false,
      autoplay: false,
      autopause: true,
      clickToPlay: true,
      disableContextMenu: false,
      hideControls: true,
      captions: {
        active: false,
        language: 'auto',
        update: false
      },
      quality: {
        default: 1080,
        options: [4320, 2880, 2160, 1440, 1080, 720, 576, 480, 360, 240]
      }
    }

    try {
      // Create Plyr instance
      playerRef.current = new Plyr(videoRef.current, options)

      // Event handlers
      playerRef.current.on('ready', () => {
        setLoading(false)
        setError(null)
      })

      playerRef.current.on('error', (event) => {
        const videoError = event.detail.plyr.media.error
        console.error('Plyr error:', videoError)
        setError(videoError?.message || 'Failed to load video')
        setLoading(false)
        if (onError) onError(videoError)
      })

      playerRef.current.on('loadeddata', () => {
        setLoading(false)
      })

      // Add custom keyboard shortcuts
      const handleKeyDown = (e) => {
        if (!playerRef.current || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

        switch (e.key) {
          case '[':
            // Frame step backward (approximate)
            e.preventDefault()
            playerRef.current.currentTime = Math.max(0, playerRef.current.currentTime - (1/30))
            break
          case ']':
            // Frame step forward (approximate)
            e.preventDefault()
            playerRef.current.currentTime = Math.min(playerRef.current.duration, playerRef.current.currentTime + (1/30))
            break
          case '-':
          case '_':
            // Decrease speed
            e.preventDefault()
            const currentSpeedIndex = options.speed.options.indexOf(playerRef.current.speed)
            if (currentSpeedIndex > 0) {
              playerRef.current.speed = options.speed.options[currentSpeedIndex - 1]
            }
            break
          case '+':
          case '=':
            // Increase speed
            e.preventDefault()
            const speedIndex = options.speed.options.indexOf(playerRef.current.speed)
            if (speedIndex < options.speed.options.length - 1) {
              playerRef.current.speed = options.speed.options[speedIndex + 1]
            }
            break
        }
      }

      document.addEventListener('keydown', handleKeyDown)

      // Apply custom CSS for dark theme
      const style = document.createElement('style')
      style.textContent = `
        .plyr {
          --plyr-color-main: #f59e0b;
          --plyr-video-control-color: #ffffff;
          --plyr-video-control-color-hover: #ffffff;
          --plyr-video-control-background-hover: rgba(245, 158, 11, 0.8);
          --plyr-badge-background: #f59e0b;
          --plyr-menu-background: rgba(17, 24, 39, 0.95);
          --plyr-menu-color: #ffffff;
          --plyr-menu-border-color: rgba(255, 255, 255, 0.1);
          --plyr-menu-back-border-color: rgba(255, 255, 255, 0.1);
          --plyr-tab-focus-color: #f59e0b;
          --plyr-tooltip-background: rgba(17, 24, 39, 0.95);
          --plyr-tooltip-color: #ffffff;
          --plyr-font-family: inherit;
        }
        
        .plyr--video {
          background: #000;
        }
        
        .plyr__poster {
          background-size: cover;
        }
        
        /* Frame-stepping indicator */
        .plyr.frame-stepping::after {
          content: 'Frame Mode';
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(245, 158, 11, 0.9);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          pointer-events: none;
          z-index: 10;
        }
      `
      document.head.appendChild(style)

      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        document.head.removeChild(style)
        if (playerRef.current) {
          playerRef.current.destroy()
        }
      }
    } catch (err) {
      console.error('Failed to initialize Plyr:', err)
      setError('Failed to initialize video player')
      setLoading(false)
    }
    }

    initializePlayer()
  }, [src, onError])

  // Handle fullscreen changes
  useEffect(() => {
    if (!playerRef.current) return

    if (isFullscreen) {
      playerRef.current.fullscreen.enter()
    } else {
      playerRef.current.fullscreen.exit()
    }
  }, [isFullscreen])

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full h-full bg-black rounded-lg overflow-hidden",
        className
      )}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <p className="text-white text-lg font-medium">Video Error</p>
          <p className="text-gray-400 text-sm mt-2">{error}</p>
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full h-full"
        crossOrigin="anonymous"
        playsInline
        poster={poster}
        title={title}
      >
        <source src={src} type={`video/${resource?.file_extension || 'mp4'}`} />
        Your browser does not support the video element.
      </video>

      {/* Custom controls overlay for additional features */}
      <div className="absolute bottom-20 right-4 flex flex-col gap-2 opacity-0 hover:opacity-100 transition-opacity">
        <div className="bg-black/80 backdrop-blur-sm rounded px-3 py-2 text-xs text-white">
          <div className="font-semibold mb-1">Keyboard Shortcuts</div>
          <div className="space-y-1 text-gray-300">
            <div>←/→: Skip ±5s</div>
            <div>[/]: Frame step</div>
            <div>+/-: Speed up/down</div>
            <div>Space: Play/Pause</div>
            <div>F: Fullscreen</div>
          </div>
        </div>
      </div>
    </div>
  )
}