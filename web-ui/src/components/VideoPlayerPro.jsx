import { useRef, useEffect, useState } from 'react'
import videojs from 'video.js'
import 'video.js/dist/video-js.css'
import { AlertCircle } from 'lucide-react'
import { cn } from '../lib/utils'

export default function VideoPlayerPro({ 
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

  // Initialize Video.js
  useEffect(() => {
    // Make sure we have a video element and src
    if (!videoRef.current || !src) return

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      // Double-check the element is still there and in DOM
      if (!videoRef.current || !document.body.contains(videoRef.current)) {
        console.error('Video element not found in DOM')
        setError('Video element not properly mounted')
        setLoading(false)
        return
      }

      // Video.js configuration
    const options = {
      autoplay: false,
      controls: true,
      responsive: true,
      fluid: true,
      playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
      controlBar: {
        volumePanel: {
          inline: false
        },
        pictureInPictureToggle: true,
        fullscreenToggle: true,
        playToggle: true,
        progressControl: {
          seekBar: {
            playProgressBar: {
              timeTooltip: true
            }
          }
        },
        remainingTimeDisplay: true,
        playbackRateMenuButton: {
          displayValue: 'Playback Rate',
          playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
        }
      },
      html5: {
        vhs: {
          overrideNative: true
        },
        nativeVideoTracks: false,
        nativeAudioTracks: false,
        nativeTextTracks: false
      },
      poster: poster,
      preload: 'auto'
    }

    try {
      console.log('Initializing video player with src:', src)
      console.log('Video element:', videoRef.current)
      
      // Create Video.js instance
      playerRef.current = videojs(videoRef.current, options, function onPlayerReady() {
        console.log('Video.js player ready')
        console.log('Player source:', this.currentSrc())
        setLoading(false)
        setError(null)

        const player = this

        // Add custom keyboard event handler
        const handleKeyPress = (e) => {
          // Don't handle if typing in an input
          if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

          switch(e.key) {
            case ' ':
              e.preventDefault()
              if (player.paused()) {
                player.play()
              } else {
                player.pause()
              }
              break
            case 'ArrowLeft':
              e.preventDefault()
              player.currentTime(Math.max(0, player.currentTime() - 5))
              break
            case 'ArrowRight':
              e.preventDefault()
              player.currentTime(Math.min(player.duration(), player.currentTime() + 5))
              break
            case '[':
              e.preventDefault()
              // Frame step backward (assuming 30fps)
              player.currentTime(Math.max(0, player.currentTime() - (1/30)))
              break
            case ']':
              e.preventDefault()
              // Frame step forward (assuming 30fps)
              player.currentTime(Math.min(player.duration(), player.currentTime() + (1/30)))
              break
            case '-':
            case '_':
              e.preventDefault()
              // Decrease speed
              const currentRate = player.playbackRate()
              const currentIndex = options.playbackRates.indexOf(currentRate)
              if (currentIndex > 0) {
                player.playbackRate(options.playbackRates[currentIndex - 1])
              }
              break
            case '+':
            case '=':
              e.preventDefault()
              // Increase speed
              const rate = player.playbackRate()
              const index = options.playbackRates.indexOf(rate)
              if (index < options.playbackRates.length - 1) {
                player.playbackRate(options.playbackRates[index + 1])
              }
              break
            case 'f':
            case 'F':
              e.preventDefault()
              if (player.isFullscreen()) {
                player.exitFullscreen()
              } else {
                player.requestFullscreen()
              }
              break
            case 'm':
            case 'M':
              e.preventDefault()
              player.muted(!player.muted())
              break
            case '0':
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
              e.preventDefault()
              const percent = parseInt(e.key) * 10
              player.currentTime(player.duration() * percent / 100)
              break
          }
        }

        // Add event listener to the player element
        player.el().addEventListener('keydown', handleKeyPress)

        // Store the handler for cleanup
        player.hotkeyHandler = handleKeyPress
      })

      // Event handlers
      playerRef.current.on('error', (e) => {
        const videoError = playerRef.current.error()
        console.error('Video.js error:', videoError)
        setError(videoError?.message || 'Failed to load video')
        setLoading(false)
        if (onError) onError(videoError)
      })

      playerRef.current.on('loadeddata', () => {
        setLoading(false)
      })

      // Apply custom styles for dark theme
      playerRef.current.addClass('vjs-theme-dark')

      return () => {
        clearTimeout(timer)
        if (playerRef.current) {
          // Remove keyboard event listener
          if (playerRef.current.hotkeyHandler) {
            playerRef.current.el().removeEventListener('keydown', playerRef.current.hotkeyHandler)
          }
          playerRef.current.dispose()
          playerRef.current = null
        }
      }
    } catch (err) {
      console.error('Failed to initialize Video.js:', err)
      setError('Failed to initialize video player')
      setLoading(false)
    }
    }, 100) // 100ms delay to ensure DOM is ready

    return () => {
      clearTimeout(timer)
      if (playerRef.current) {
        playerRef.current.dispose()
        playerRef.current = null
      }
    }
  }, [src, resource, poster, onError])

  // Handle fullscreen changes
  useEffect(() => {
    if (!playerRef.current) return

    if (isFullscreen && !playerRef.current.isFullscreen()) {
      playerRef.current.requestFullscreen()
    } else if (!isFullscreen && playerRef.current.isFullscreen()) {
      playerRef.current.exitFullscreen()
    }
  }, [isFullscreen])

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full h-full bg-black rounded-lg overflow-hidden",
        "video-js-container",
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
        className="video-js vjs-big-play-centered vjs-theme-dark w-full h-full"
        playsInline
        preload="auto"
      >
        <source src={src} type={getVideoMimeType(resource?.file_extension || 'mp4')} />
        <p className="vjs-no-js">
          To view this video please enable JavaScript, and consider upgrading to a web browser that
          supports HTML5 video.
        </p>
      </video>

      {/* Custom controls overlay for keyboard shortcuts help */}
      <div className="absolute bottom-20 right-4 flex flex-col gap-2 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
        <div className="bg-black/80 backdrop-blur-sm rounded px-3 py-2 text-xs text-white">
          <div className="font-semibold mb-1">Keyboard Shortcuts</div>
          <div className="space-y-1 text-gray-300">
            <div>←/→: Skip ±5s</div>
            <div>[/]: Frame step</div>
            <div>+/-: Speed up/down</div>
            <div>Space: Play/Pause</div>
            <div>F: Fullscreen</div>
            <div>M: Mute</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper function to get proper MIME type for video
function getVideoMimeType(extension) {
  const mimeTypes = {
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'mkv': 'video/x-matroska',
    'flv': 'video/x-flv',
    'wmv': 'video/x-ms-wmv',
    'm4v': 'video/mp4',
    'ogv': 'video/ogg'
  }
  return mimeTypes[extension.toLowerCase()] || 'video/mp4'
}