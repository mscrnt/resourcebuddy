import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX,
  Maximize,
  Minimize,
  Camera,
  ChevronLeft,
  ChevronRight,
  Settings,
  Download,
  Film,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';

const VideoPlayerEnhanced = ({ 
  src, 
  poster, 
  onFrameCapture,
  onFrameChange,
  className = '',
  autoPlay = false,
  loop = false,
  muted = false,
  controls = true,
  annotations = [] // Array of annotation objects with frame/time data
}) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const progressRef = useRef(null);
  const volumeRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(muted ? 0 : 1);
  const [isMuted, setIsMuted] = useState(muted);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [frameRate, setFrameRate] = useState(30); // Default to 30fps
  const [detectedFrameRate, setDetectedFrameRate] = useState(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [frameHistory, setFrameHistory] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showAnnotationTimeline, setShowAnnotationTimeline] = useState(false);
  const [hoveredAnnotation, setHoveredAnnotation] = useState(null);
  
  // Control visibility timeout
  const controlsTimeoutRef = useRef(null);

  // Calculate frame information
  const calculateFrameInfo = useCallback(() => {
    if (videoRef.current && duration > 0) {
      const frames = Math.floor(duration * frameRate);
      setTotalFrames(frames);
      const frame = Math.floor(currentTime * frameRate);
      setCurrentFrame(frame);
      if (onFrameChange) {
        onFrameChange({ frame, time: currentTime, frameRate });
      }
    }
  }, [currentTime, duration, frameRate, onFrameChange]);

  // Enhanced frame rate detection
  useEffect(() => {
    const detectFrameRate = async () => {
      if (videoRef.current && videoRef.current.videoWidth > 0) {
        const video = videoRef.current;
        
        // Common frame rates to test
        const commonFrameRates = [23.976, 24, 25, 29.97, 30, 48, 50, 59.94, 60];
        
        // Method 1: Try to get from browser API if available
        if ('requestVideoFrameCallback' in video) {
          let lastTime = 0;
          let frameCount = 0;
          const startTime = performance.now();
          
          const calculateFps = () => {
            video.requestVideoFrameCallback((now) => {
              if (lastTime) {
                frameCount++;
                
                if (frameCount > 30) { // Sample 30 frames
                  const elapsed = (now - startTime) / 1000;
                  const detectedFps = frameCount / elapsed;
                  
                  // Find closest common frame rate
                  const closest = commonFrameRates.reduce((prev, curr) => 
                    Math.abs(curr - detectedFps) < Math.abs(prev - detectedFps) ? curr : prev
                  );
                  
                  setDetectedFrameRate(closest);
                  setFrameRate(closest);
                  return;
                }
              }
              lastTime = now;
              
              if (frameCount <= 30) {
                calculateFps();
              }
            });
          };
          
          video.play();
          calculateFps();
          setTimeout(() => video.pause(), 1500);
          
        } else {
          // Method 2: Estimate based on duration and seeking
          const testDuration = 1; // Test 1 second
          let frames = 0;
          
          video.currentTime = 0;
          
          // Try to count frames by seeking
          const countFrames = () => {
            const seekTime = 1 / 60; // Assume max 60fps
            if (video.currentTime < testDuration) {
              video.currentTime += seekTime;
              frames++;
              requestAnimationFrame(countFrames);
            } else {
              // Estimate frame rate
              const estimatedFps = frames / testDuration;
              const closest = commonFrameRates.reduce((prev, curr) => 
                Math.abs(curr - estimatedFps) < Math.abs(prev - estimatedFps) ? curr : prev
              );
              
              setDetectedFrameRate(closest);
              setFrameRate(closest);
              video.currentTime = 0;
            }
          };
          
          video.addEventListener('seeked', countFrames, { once: true });
        }
      }
    };

    if (src) {
      detectFrameRate();
    }
  }, [src]);

  // Update frame info when time changes
  useEffect(() => {
    calculateFrameInfo();
  }, [calculateFrameInfo]);

  // Handle video metadata loaded
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
    }
  };

  // Handle time update
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Play/Pause toggle
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Seek to specific time
  const seek = (time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(time, duration));
    }
  };

  // Frame navigation
  const nextFrame = () => {
    if (videoRef.current && frameRate > 0) {
      const frameTime = 1 / frameRate;
      seek(currentTime + frameTime);
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const previousFrame = () => {
    if (videoRef.current && frameRate > 0) {
      const frameTime = 1 / frameRate;
      seek(currentTime - frameTime);
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  // Skip forward/backward
  const skipForward = (seconds = 10) => {
    seek(currentTime + seconds);
  };

  const skipBackward = (seconds = 10) => {
    seek(currentTime - seconds);
  };

  // Volume control
  const handleVolumeChange = (newVolume) => {
    if (videoRef.current) {
      const vol = Math.max(0, Math.min(1, newVolume));
      videoRef.current.volume = vol;
      setVolume(vol);
      setIsMuted(vol === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = volume || 0.5;
        setIsMuted(false);
      } else {
        videoRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Enhanced frame capture with metadata
  const captureFrame = (includeMetadata = true) => {
    if (videoRef.current && !isCapturing) {
      setIsCapturing(true);
      
      const video = videoRef.current;
      let canvas;
      let ctx;
      let captureSuccessful = false;
      
      // First, try to capture the actual video frame
      try {
        canvas = document.createElement('canvas');
        const borderSize = includeMetadata ? 80 : 0;
        canvas.width = video.videoWidth + (borderSize * 2);
        canvas.height = video.videoHeight + borderSize + 40;
        
        ctx = canvas.getContext('2d');
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // This is where CORS error might occur
        ctx.drawImage(video, borderSize, borderSize, video.videoWidth, video.videoHeight);
        captureSuccessful = true;
      
      if (includeMetadata) {
        // Add metadata overlay
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px monospace';
        
        // Top left - Frame info
        ctx.textAlign = 'left';
        ctx.fillText(`Frame: ${currentFrame} / ${totalFrames}`, borderSize + 10, 30);
        
        // Top right - Time info
        ctx.textAlign = 'right';
        ctx.fillText(`Time: ${formatTimeWithMs(currentTime)}`, canvas.width - borderSize - 10, 30);
        
        // Bottom left - Frame rate
        ctx.textAlign = 'left';
        ctx.fillText(`FPS: ${detectedFrameRate || frameRate}`, borderSize + 10, canvas.height - 15);
        
        // Bottom right - Resolution
        ctx.textAlign = 'right';
        ctx.fillText(`${video.videoWidth}x${video.videoHeight}`, canvas.width - borderSize - 10, canvas.height - 15);
        
        // Draw border
        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 2;
        ctx.strokeRect(borderSize - 1, borderSize - 1, video.videoWidth + 2, video.videoHeight + 2);
      }
      
      canvas.toBlob((blob) => {
        const frameData = {
          blob,
          dataUrl: canvas.toDataURL('image/png'),
          frame: currentFrame,
          time: currentTime,
          timestamp: formatTimeWithMs(currentTime),
          frameRate: detectedFrameRate || frameRate,
          width: includeMetadata ? canvas.width : video.videoWidth,
          height: includeMetadata ? canvas.height : video.videoHeight,
          originalWidth: video.videoWidth,
          originalHeight: video.videoHeight,
          hasMetadata: includeMetadata
        };
        
        // Add to frame history
        setFrameHistory(prev => [...prev, { frame: currentFrame, time: currentTime }]);
        
        if (onFrameCapture) {
          onFrameCapture(frameData);
        } else {
          // Default: download the frame
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `frame_${currentFrame}_${Date.now()}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
        
        setIsCapturing(false);
      }, 'image/png');
      } catch (error) {
        console.error('Failed to capture frame:', error);
        captureSuccessful = false;
      }
      
      // If capture failed due to CORS, provide a simple notification
      if (!captureSuccessful) {
        console.warn('Direct frame capture failed, likely due to CORS. The video should be configured with proper CORS headers.');
        
        // Pause video and notify user
        if (video && !video.paused) {
          video.pause();
        }
        
        // Create a simple notification instead of placeholder
        const notification = document.createElement('div');
        notification.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        notification.textContent = `Frame ${currentFrame} - Use screenshot tool (Win+Shift+S / Cmd+Shift+4)`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 5000);
        
        setIsCapturing(false);
        return;
      }
      
      // Convert to blob and send to annotation workflow
      canvas.toBlob((blob) => {
        if (blob && onFrameCapture) {
          const frameData = {
            blob,
            dataUrl: canvas.toDataURL('image/png'),
            frame: currentFrame,
            time: currentTime,
            timestamp: formatTimeWithMs(currentTime),
            frameRate: detectedFrameRate || frameRate,
            width: canvas.width,
            height: canvas.height,
            originalWidth: video.videoWidth,
            originalHeight: video.videoHeight,
            hasMetadata: includeMetadata,
            isFallback: !captureSuccessful
          };
          
          // Always trigger the annotation workflow
          onFrameCapture(frameData);
        }
        setIsCapturing(false);
      }, 'image/png');
    }
  };

  // Progress bar click handler
  const handleProgressClick = (e) => {
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    seek(duration * percentage);
  };

  // Volume bar click handler
  const handleVolumeClick = (e) => {
    const rect = volumeRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    handleVolumeChange(percentage);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!videoRef.current) return;
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        // Left-hand video controls
        case 'a':
        case 'A':
          e.preventDefault();
          if (e.shiftKey) {
            // Shift+A: 10 frames backward
            previousFrame();
            for(let i = 0; i < 9; i++) {
              setTimeout(() => previousFrame(), i * 50);
            }
          } else {
            // A: 1 frame backward
            previousFrame();
          }
          break;
        case 'd':
        case 'D':
          e.preventDefault();
          if (e.shiftKey) {
            // Shift+D: 10 frames forward
            nextFrame();
            for(let i = 0; i < 9; i++) {
              setTimeout(() => nextFrame(), i * 50);
            }
          } else {
            // D: 1 frame forward
            nextFrame();
          }
          break;
        case 'w':
        case 'W':
          e.preventDefault();
          // W: Skip forward 5 seconds
          skipForward(5);
          break;
        case 's':
        case 'S':
          e.preventDefault();
          // S: Skip backward 5 seconds
          skipBackward(5);
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'q':
        case 'Q':
          e.preventDefault();
          // Q: Capture frame for annotation (without metadata)
          if (onFrameCapture) {
            captureFrame(false);
          }
          break;
        case 'e':
        case 'E':
          e.preventDefault();
          // E: Capture/Export frame with metadata
          captureFrame(true);
          break;
        case ',':
          e.preventDefault();
          previousFrame();
          break;
        case '.':
          e.preventDefault();
          nextFrame();
          break;
        case '0':
        case 'Home':
          e.preventDefault();
          seek(0);
          break;
        case 'End':
          e.preventDefault();
          seek(duration);
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          e.preventDefault();
          const percent = parseInt(e.key) * 0.1;
          seek(duration * percent);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, volume, duration, currentTime]);

  // Show/hide controls on mouse movement
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseenter', () => setShowControls(true));
      container.addEventListener('mouseleave', () => {
        if (isPlaying) setShowControls(false);
      });
    }

    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  // Format time display
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };
  
  // Format time with milliseconds
  const formatTimeWithMs = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  // Playback rate options
  const playbackRates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  return (
    <div 
      ref={containerRef}
      className={`relative bg-black rounded-lg overflow-hidden group ${className}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-contain"
        crossOrigin="anonymous"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        playsInline
      />

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Controls Overlay */}
      {controls && (
        <div className={`absolute inset-0 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}>
          {/* Gradient Background - Enhanced for better visibility */}
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/95 via-black/70 to-transparent pointer-events-none" />

          {/* Click to Play/Pause Area */}
          <div 
            className={cn(
              "absolute inset-0 z-10",
              showAnnotationTimeline && annotations.length > 0 && "bottom-[120px]" // Leave space for annotation timeline
            )}
            onClick={togglePlay}
          />

          {/* Annotation Timeline */}
          {annotations.length > 0 && showAnnotationTimeline && (
            <div className="absolute bottom-24 left-0 right-0 bg-black/80 backdrop-blur-sm border-t border-white/10 overflow-hidden transition-all duration-300 z-30">
              <div className="relative h-20">
                {/* Close button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAnnotationTimeline(false);
                  }}
                  className="absolute top-2 right-2 z-40 p-1 bg-black/50 hover:bg-black/70 rounded transition-colors"
                  title="Hide annotation timeline"
                >
                  <X size={16} className="text-white" />
                </button>
                
                {/* Timeline track with positioned thumbnails */}
                <div className="relative h-full mx-4">
                  {/* Timeline background track */}
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-white/20" />
                  
                  {/* Positioned annotation thumbnails */}
                  {annotations.map((annotation, index) => {
                    const annotationTime = annotation.time || (annotation.frame / frameRate);
                    const isActive = Math.abs(currentTime - annotationTime) < 0.5;
                    const position = duration > 0 ? (annotationTime / duration) * 100 : 0;
                    
                    return (
                      <div
                        key={annotation.id || index}
                        className="absolute bottom-0 transform -translate-x-1/2"
                        style={{ 
                          left: `${position}%`,
                          zIndex: isActive ? 30 : 20 - index // Active on top, then reverse order so later ones are on top
                        }}
                      >
                        {/* Connecting line to timeline */}
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-px h-2 bg-white/40" />
                        
                        {/* Thumbnail container */}
                        <div
                          className={cn(
                            "absolute bottom-2 left-1/2 transform -translate-x-1/2 cursor-pointer transition-all",
                            "hover:scale-110",
                            isActive ? "scale-110 z-50" : "z-20"
                          )}
                          style={{ zIndex: isActive ? 50 : 20 }}
                          onClick={() => {
                            seek(annotationTime);
                            // Pause the video
                            if (videoRef.current && !videoRef.current.paused) {
                              videoRef.current.pause();
                              setIsPlaying(false);
                            }
                          }}
                          onMouseEnter={() => setHoveredAnnotation(annotation)}
                          onMouseLeave={() => setHoveredAnnotation(null)}
                        >
                          <div className={cn(
                            "relative",
                            isActive && "ring-2 ring-art-accent rounded"
                          )}>
                            {/* Thumbnail */}
                            <div className="w-16 h-10 bg-gray-800 rounded overflow-hidden shadow-lg">
                              {annotation.thumbnailUrl ? (
                                <img 
                                  src={annotation.thumbnailUrl}
                                  alt={annotation.name || `Frame ${annotation.frame}`}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-600">
                                  <Camera size={16} />
                                </div>
                              )}
                            </div>
                            
                            {/* Active indicator arrow */}
                            {isActive && (
                              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-art-accent" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Current time indicator */}
                  <div 
                    className="absolute bottom-0 transform -translate-x-1/2 pointer-events-none"
                    style={{ left: `${(currentTime / duration) * 100}%` }}
                  >
                    <div className="w-px h-16 bg-white/60" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 z-20 bg-gradient-to-t from-art-darker/95 to-transparent backdrop-blur-sm">
            {/* Progress Bar with Annotation Ticks */}
            <div 
              ref={progressRef}
              className="relative h-1 bg-white/30 rounded-full mb-4 cursor-pointer group/progress"
              onClick={handleProgressClick}
            >
              <div 
                className="absolute h-full bg-white rounded-full"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
              
              {/* Annotation Ticks (always visible) */}
              {!showAnnotationTimeline && annotations.length > 0 && annotations.map((annotation, index) => {
                const annotationTime = annotation.time || (annotation.frame / frameRate);
                const isActive = Math.abs(currentTime - annotationTime) < 0.5;
                const position = duration > 0 ? (annotationTime / duration) * 100 : 0;
                
                return (
                  <div
                    key={annotation.id || index}
                    className="absolute top-1/2 transform -translate-y-1/2 group/tick"
                    style={{ left: `${position}%` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      seek(annotationTime);
                      if (videoRef.current && !videoRef.current.paused) {
                        videoRef.current.pause();
                        setIsPlaying(false);
                      }
                    }}
                    onMouseEnter={() => setHoveredAnnotation(annotation)}
                    onMouseLeave={() => setHoveredAnnotation(null)}
                  >
                    {/* Tick mark */}
                    <div className={cn(
                      "w-1 transition-all cursor-pointer",
                      isActive 
                        ? "h-5 bg-art-accent -mt-2" 
                        : "h-4 bg-white/40 hover:bg-white/70 -mt-1.5"
                    )} />
                  </div>
                );
              })}
              
              <div 
                className="absolute w-3 h-3 bg-white rounded-full -mt-1 transition-transform group-hover/progress:scale-125"
                style={{ left: `${(currentTime / duration) * 100}%`, transform: 'translateX(-50%)' }}
              />
            </div>

            <div className="flex items-center justify-between">
              {/* Left Controls */}
              <div className="flex items-center space-x-2">
                {/* Play/Pause */}
                <button
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  className="p-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-lg transition-all text-white"
                >
                  {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>

                {/* Frame Navigation */}
                <button
                  onClick={(e) => { e.stopPropagation(); previousFrame(); }}
                  className="p-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-lg transition-all text-white"
                  title="Previous Frame (A)"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); nextFrame(); }}
                  className="p-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-lg transition-all text-white"
                  title="Next Frame (D)"
                >
                  <ChevronRight size={20} />
                </button>

                {/* Skip Controls */}
                <button
                  onClick={(e) => { e.stopPropagation(); skipBackward(); }}
                  className="p-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-lg transition-all text-white"
                  title="Skip Backward 5s (S)"
                >
                  <SkipBack size={20} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); skipForward(); }}
                  className="p-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-lg transition-all text-white"
                  title="Skip Forward 5s (W)"
                >
                  <SkipForward size={20} />
                </button>

                {/* Volume */}
                <div className="flex items-center group/volume">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                    className="p-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-lg transition-all text-white"
                  >
                    {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                  <div className="overflow-hidden transition-all duration-300 w-0 group-hover/volume:w-24">
                    <div 
                      ref={volumeRef}
                      className="relative h-1 bg-white/30 rounded-full mx-2 cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); handleVolumeClick(e); }}
                    >
                      <div 
                        className="absolute h-full bg-white rounded-full"
                        style={{ width: `${volume * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Time Display */}
                <div className="text-sm font-mono text-white bg-black/50 backdrop-blur-sm rounded px-2 py-1 ml-2">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>

                {/* Frame Display */}
                <div className="text-sm font-mono text-white bg-black/50 backdrop-blur-sm rounded px-2 py-1 ml-2">
                  Frame {currentFrame} / {totalFrames}
                  {detectedFrameRate && (
                    <span className="text-white/70 ml-1">@ {detectedFrameRate}fps</span>
                  )}
                </div>
              </div>

              {/* Right Controls */}
              <div className="flex items-center space-x-2">
                {/* Annotation Timeline Toggle */}
                {annotations.length > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowAnnotationTimeline(!showAnnotationTimeline); }}
                    className={cn(
                      "p-2 backdrop-blur-sm rounded-lg transition-all text-white relative",
                      showAnnotationTimeline 
                        ? "bg-art-accent/20 hover:bg-art-accent/30 border border-art-accent/50" 
                        : "bg-black/50 hover:bg-black/70"
                    )}
                    title={showAnnotationTimeline ? "Hide annotation timeline" : "Show annotation timeline"}
                  >
                    <Film size={20} />
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-art-accent rounded-full text-xs flex items-center justify-center">
                      {annotations.length}
                    </span>
                  </button>
                )}
                
                {/* Capture Frame */}
                <button
                  onClick={(e) => { e.stopPropagation(); captureFrame(false); }}
                  className="p-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-lg transition-all text-white"
                  title="Capture Frame for Annotation (Q)"
                >
                  <Camera size={20} />
                </button>

                {/* Settings */}
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }}
                    className="p-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-lg transition-all text-white"
                  >
                    <Settings size={20} />
                  </button>
                  
                  {showSettings && (
                    <div className="absolute bottom-full right-0 mb-2 bg-gray-900 rounded-lg shadow-xl p-4 min-w-[200px]">
                      <h3 className="text-sm font-semibold mb-2">Playback Speed</h3>
                      <div className="grid grid-cols-2 gap-1">
                        {playbackRates.map(rate => (
                          <button
                            key={rate}
                            onClick={(e) => {
                              e.stopPropagation();
                              videoRef.current.playbackRate = rate;
                              setPlaybackRate(rate);
                            }}
                            className={`px-2 py-1 text-sm rounded ${
                              playbackRate === rate 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-700 hover:bg-gray-600 text-white/80'
                            }`}
                          >
                            {rate}x
                          </button>
                        ))}
                      </div>
                      
                      <h3 className="text-sm font-semibold mt-4 mb-2">Frame Rate</h3>
                      <div className="text-sm text-white/70">
                        <div>Current: {frameRate} fps</div>
                        {detectedFrameRate && (
                          <div className="text-xs mt-1">Detected: {detectedFrameRate} fps</div>
                        )}
                      </div>
                      
                      <h3 className="text-sm font-semibold mt-4 mb-2">Frame History</h3>
                      <div className="text-xs text-white/60 max-h-20 overflow-y-auto">
                        {frameHistory.slice(-5).map((item, idx) => (
                          <div key={idx}>Frame {item.frame} @ {formatTimeWithMs(item.time)}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Fullscreen */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                  className="p-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-lg transition-all text-white"
                  title="Fullscreen (F)"
                >
                  {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                </button>
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts Help */}
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-black/80 rounded-lg p-2 text-xs text-white/70">
              <div className="font-semibold mb-1">Left-hand Controls:</div>
              <div>A/D: Frame step back/fwd</div>
              <div>Shift+A/D: 10 frames</div>
              <div>S/W: Skip 5s back/fwd</div>
              <div>Q: Capture for annotation</div>
              <div>E: Export with metadata</div>
              <div className="mt-2 font-semibold">General:</div>
              <div>Space: Play/Pause</div>
              <div>F: Fullscreen</div>
              <div>M: Mute</div>
              <div>0-9: Seek %</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Annotation Hover Preview Overlay */}
      {hoveredAnnotation && hoveredAnnotation.thumbnailUrl && (
        <div 
          className="absolute inset-0 z-[29] pointer-events-none"
          style={{ backgroundColor: 'transparent' }}
        >
          {/* Click backdrop to close */}
          <div 
            className="absolute inset-0 bg-black/60 pointer-events-auto"
            onClick={() => setHoveredAnnotation(null)}
          />
          
          {/* Preview content */}
          <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none">
            <div className="relative bg-white/10 backdrop-blur-md rounded-lg p-4 max-w-4xl max-h-[80vh] pointer-events-auto">
              {/* Preview image */}
              <img 
                src={hoveredAnnotation.thumbnailUrl.replace('size=thm', 'size=pre')}
                alt={hoveredAnnotation.name || `Frame ${hoveredAnnotation.frame}`}
                className="max-h-[60vh] max-w-full object-contain rounded"
                onError={(e) => {
                  // Fallback to thumbnail if preview fails
                  e.target.src = hoveredAnnotation.thumbnailUrl;
                }}
              />
              
              {/* Info overlay */}
              <div className="mt-3 text-center">
                <div className="text-sm text-white font-medium">
                  {hoveredAnnotation.name || `Annotation`}
                </div>
                {hoveredAnnotation.frame && (
                  <div className="text-xs text-gray-300 mt-1">
                    Frame {hoveredAnnotation.frame} • {formatTimeWithMs(hoveredAnnotation.time || (hoveredAnnotation.frame / frameRate))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayerEnhanced;