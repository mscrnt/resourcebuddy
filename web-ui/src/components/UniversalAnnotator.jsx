import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MarkerArea, MarkerView, Renderer } from '@markerjs/markerjs3';
import { X, Save, Edit3, Eye, EyeOff, Download, Square, Circle, Type, Pen, ArrowRight, Highlighter } from 'lucide-react';
import { cn } from '../lib/utils';
import axios from 'axios';
import useAuthStore from '../stores/useAuthStore';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export default function UniversalAnnotator({
  resourceId,
  resourceTitle = '',
  resourceType = 'image',
  previewUrl,
  frameData = null,
  onClose,
  onSave,
  className
}) {
  const [isAnnotating, setIsAnnotating] = useState(true); // Start in annotation mode
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [annotationName, setAnnotationName] = useState('');
  const [annotationDescription, setAnnotationDescription] = useState('');
  
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const markerAreaRef = useRef(null);
  const markerViewRef = useRef(null);
  const { user } = useAuthStore();
  
  // Generate a unique 4-character hash
  const generateHash = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  
  // Initialize MarkerArea when image loads
  useEffect(() => {
    const img = imageRef.current;
    if (!img) return;
    
    const handleLoad = () => {
      if (!markerAreaRef.current) {
        initializeMarkerArea();
      }
    };
    
    if (img.complete) {
      handleLoad();
    } else {
      img.addEventListener('load', handleLoad);
      return () => img.removeEventListener('load', handleLoad);
    }
  }, []);
  
  // Initialize annotation name when dialog opens
  useEffect(() => {
    if (showNameDialog && !annotationName) { // Only set if not already set
      const hash = generateHash();
      const baseName = resourceTitle || `Resource ${resourceId}`;
      let annotationTitle = `${baseName} - Annotation ${hash}`;
      
      // If this is a video frame, add frame info to the name
      if (frameData && frameData.frame !== undefined) {
        annotationTitle = `${baseName} - Frame ${frameData.frame} @ ${frameData.timestamp || frameData.time}s - ${hash}`;
      }
      
      setAnnotationName(annotationTitle);
    }
  }, [showNameDialog, resourceTitle, resourceId, frameData]);

  const initializeMarkerArea = useCallback(() => {
    if (!imageRef.current || markerAreaRef.current) return;

    // Create MarkerArea instance
    const markerArea = new MarkerArea();
    markerArea.targetImage = imageRef.current;
    
    // Add to container
    if (containerRef.current) {
      containerRef.current.appendChild(markerArea);
    }

    markerAreaRef.current = markerArea;
    
    setIsAnnotating(true);
  }, []);


  const handleCreateMarker = (markerType) => {
    if (markerAreaRef.current) {
      markerAreaRef.current.createMarker(markerType);
    }
  };

  const handleSaveAnnotations = async (name, description) => {
    if (!markerAreaRef.current || !name) return;
    
    setIsSaving(true);
    setError(null);
    
    // Get current state
    const markerState = markerAreaRef.current.getState();
    
    // Render to image
    const renderer = new Renderer();
    renderer.targetImage = imageRef.current;
    const dataUrl = await renderer.rasterize(markerState);

    try {
      // 1. Save annotation metadata to SQLite
      const annotationData = {
        resourceId,
        resourceType,
        annotationsJson: markerState,
        frame: frameData?.frame || null,
        timestamp: frameData?.timestamp || null,
        createdBy: user?.username || null
      };

      const metadataResponse = await axios.post(
        `${BACKEND_URL}/api/annotations`,
        annotationData
      );

      if (!metadataResponse.data.success) {
        throw new Error('Failed to save annotation metadata');
      }

      // 2. Convert PNG data URL to JPEG blob
      // First create a canvas to convert PNG to JPEG
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => img.onload = resolve);
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      // Fill white background for JPEG (no transparency)
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw the image
      ctx.drawImage(img, 0, 0);
      
      // Convert to JPEG blob with good quality
      const jpegBlob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.9);
      });
      
      // 3. Upload annotated image to ResourceSpace
      const formData = new FormData();
      formData.append('resource', resourceId);
      formData.append('name', name);
      // Build description with frame data if available
      let fullDescription = description || '';
      if (frameData && frameData.frame !== undefined) {
        const frameInfo = `Frame ${frameData.frame} @ ${frameData.timestamp || frameData.time}s (${frameData.frameRate}fps)`;
        fullDescription = fullDescription 
          ? `${fullDescription}\n\n${frameInfo}` 
          : frameInfo;
      }
      fullDescription += `\n\nAnnotated by ${user?.username || 'User'} on ${new Date().toLocaleString()}`;
      
      formData.append('description', fullDescription);
      formData.append('file', jpegBlob, `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${resourceId}.jpg`);
      formData.append('alt_type', 'annotation');

      const uploadResponse = await axios.post(
        `${BACKEND_URL}/api/alternative-file`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (uploadResponse.data.success) {
        // Success callback
        if (onSave) {
          onSave({
            annotationId: metadataResponse.data.id,
            alternativeFileId: uploadResponse.data.data.ref
          });
        }
      }
    } catch (error) {
      console.error('Failed to save annotations:', error);
      console.error('Error response:', error.response?.data);
      setError(`Failed to save annotations: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsSaving(false);
    }
  };


  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (markerAreaRef.current && markerAreaRef.current.parentElement) {
        markerAreaRef.current.parentElement.removeChild(markerAreaRef.current);
        markerAreaRef.current = null;
      }
    };
  }, []);

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      {/* Frame info banner for video frames */}
      {frameData && frameData.frame !== undefined && (
        <div className="absolute top-0 left-0 right-0 bg-art-accent/20 border-b border-art-accent/50 px-4 py-2 z-50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4 text-art-accent-light">
              <span className="font-medium">Video Frame Annotation</span>
              <span>Frame: {frameData.frame}</span>
              <span>Time: {frameData.timestamp || frameData.time}s</span>
              <span>FPS: {frameData.frameRate}</span>
            </div>
            <div className="text-art-gray-400">
              {frameData.originalWidth}x{frameData.originalHeight}
            </div>
          </div>
        </div>
      )}
      
      {/* Toolbar */}
      <div className={cn(
        "absolute left-4 z-50 flex items-center gap-2 bg-black/80 backdrop-blur-sm rounded-lg p-2",
        frameData && frameData.frame !== undefined ? "top-14" : "top-4"
      )}>
        {/* Annotation Tools */}
        <div className="flex items-center gap-1 mr-2">
          <button
            onClick={() => handleCreateMarker('ArrowMarker')}
            className="p-2 rounded hover:bg-white/20 text-white transition-colors"
            title="Arrow"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleCreateMarker('FrameMarker')}
            className="p-2 rounded hover:bg-white/20 text-white transition-colors"
            title="Rectangle"
          >
            <Square className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleCreateMarker('EllipseMarker')}
            className="p-2 rounded hover:bg-white/20 text-white transition-colors"
            title="Circle"
          >
            <Circle className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleCreateMarker('TextMarker')}
            className="p-2 rounded hover:bg-white/20 text-white transition-colors"
            title="Text"
          >
            <Type className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleCreateMarker('FreehandMarker')}
            className="p-2 rounded hover:bg-white/20 text-white transition-colors"
            title="Freehand"
          >
            <Pen className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleCreateMarker('HighlightMarker')}
            className="p-2 rounded hover:bg-white/20 text-white transition-colors"
            title="Highlight"
          >
            <Highlighter className="h-4 w-4" />
          </button>
        </div>
        
        {/* Save/Cancel buttons */}
        <button
          onClick={() => setShowNameDialog(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-art-accent hover:bg-art-accent-dark text-white rounded-md transition-colors text-sm font-medium"
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save
            </>
          )}
        </button>
        
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="absolute top-16 left-4 z-50 bg-red-600 text-white px-4 py-2 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Preview image - hidden when editor/viewer is active */}
      <img
        ref={imageRef}
        src={previewUrl}
        alt={`Resource ${resourceId}`}
        className={cn(
          "w-full h-full object-contain",
          isAnnotating && "hidden"
        )}
        crossOrigin="anonymous"
      />
      
      {/* Name Dialog */}
      {showNameDialog && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 dark:bg-black/90">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Save Annotation</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={annotationName}
                onChange={(e) => setAnnotationName(e.target.value)}
                placeholder="Enter annotation name"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                autoFocus
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={annotationDescription}
                onChange={(e) => setAnnotationDescription(e.target.value)}
                placeholder="Enter annotation description (optional)"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none"
                rows={3}
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowNameDialog(false);
                  setAnnotationName('');
                  setAnnotationDescription('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (annotationName.trim()) {
                    handleSaveAnnotations(annotationName.trim(), annotationDescription.trim());
                    setShowNameDialog(false);
                    setAnnotationName('');
                    setAnnotationDescription('');
                  }
                }}
                disabled={!annotationName.trim()}
                className={cn(
                  "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors",
                  !annotationName.trim() && "opacity-50 cursor-not-allowed hover:bg-blue-600"
                )}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}