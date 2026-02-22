import { useEffect, useRef, useState } from 'react'
import { mediaPipeService } from '../../services/MediaPipeService'
import '../../styles/App.css'

interface DetectionArea {
  x: number
  y: number
  width: number
  height: number
}

interface HandTrackerProps {
  onConeStacked?: () => void
  isActive: boolean
  onMetricsUpdate?: (metrics: { moveCount: number }) => void
  startArea?: DetectionArea | null
  stopArea?: DetectionArea | null
}

export default function HandTracker({ onConeStacked, isActive, onMetricsUpdate, startArea, stopArea }: HandTrackerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [liveMetrics, setLiveMetrics] = useState({ moveCount: 0, totalMoveTimeSec: 0, avgMoveTimeSec: 0 })
  const [zoom, setZoom] = useState(1.0)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const lastMoveCountRef = useRef(0)
  const isInitializedRef = useRef(false)
  
  // Store callbacks and isActive in refs to avoid re-initialization
  const onConeStackedRef = useRef(onConeStacked)
  const onMetricsUpdateRef = useRef(onMetricsUpdate)
  const isActiveRef = useRef(isActive)
  
  // Update refs when they change (without triggering re-initialization)
  useEffect(() => {
    onConeStackedRef.current = onConeStacked
    onMetricsUpdateRef.current = onMetricsUpdate
    isActiveRef.current = isActive
  }, [onConeStacked, onMetricsUpdate, isActive])

  // Keep service zoom in sync with slider
  useEffect(() => {
    mediaPipeService.setZoom(zoom)
  }, [zoom])

  const startPreview = async () => {
    if (isInitializing) {
      alert('MediaPipe is still initializing. Please wait...')
      return
    }
    try {
      await mediaPipeService.startPreview()
      setIsPreviewing(true)
    } catch (e) {
      console.error(e)
      alert(`Unable to start preview: ${String(e)}`)
    }
  }

  const stopPreview = async () => {
    try {
      await mediaPipeService.stopPreview()
      setIsPreviewing(false)
    } catch (e) {
      console.error(e)
    }
  }

  // Initialize MediaPipe on component mount (only once)
  useEffect(() => {
    // Prevent re-initialization if already initialized
    if (isInitializedRef.current) {
      console.log('MediaPipe already initialized, skipping...')
      return
    }

    const initMediaPipe = async () => {
      if (!videoRef.current || !canvasRef.current) return

      try {
        setIsInitializing(true)
        
        console.log('Starting MediaPipe initialization...')
        // Initialize service with video, canvas, and callback
        await mediaPipeService.initialize(
          videoRef.current,
          canvasRef.current,
          (metrics) => {
            // Update live metrics display
            setLiveMetrics(metrics)
            
            // Detect when a new move is completed (cone stacked)
            // Use ref to get current isActive state (always up-to-date)
            if (metrics.moveCount > lastMoveCountRef.current && isActiveRef.current) {
              lastMoveCountRef.current = metrics.moveCount
              // Trigger cone stacked callback using ref
              if (onConeStackedRef.current) {
                onConeStackedRef.current()
              }
            }
            
            // Update parent metrics using ref
            if (onMetricsUpdateRef.current) {
              onMetricsUpdateRef.current({ moveCount: metrics.moveCount })
            }
          }
        )
        isInitializedRef.current = true
        console.log('MediaPipe initialization complete!')
      } catch (error) {
        console.error('Failed to initialize MediaPipe:', error)
        const errorMsg = error instanceof Error ? error.message : String(error)
        alert(`Failed to load MediaPipe:\n${errorMsg}\n\nPlease check:\n1. Internet connection\n2. Browser console (F12) for details`)
      } finally {
        setIsInitializing(false)
      }
    }

    initMediaPipe()

    return () => {
      // Only cleanup on unmount, not on every render
      if (isInitializedRef.current) {
        mediaPipeService.cleanup()
        isInitializedRef.current = false
      }
    }
  }, []) // Empty dependencies - only run once on mount

  // Set detection areas when provided
  useEffect(() => {
    if (startArea && stopArea) {
      mediaPipeService.setDetectionAreas(startArea, stopArea)
    }
  }, [startArea, stopArea])

  // Start/stop tracking based on isActive prop
  useEffect(() => {
    if (isActive && !isInitializing) {
      const startTracking = async () => {
        try {
          mediaPipeService.resetMetrics()
          setLiveMetrics({ moveCount: 0, totalMoveTimeSec: 0, avgMoveTimeSec: 0 })
          lastMoveCountRef.current = 0
          await mediaPipeService.start()
        } catch (error) {
          console.error('Error starting tracking:', error)
        }
      }
      startTracking()
    } else if (!isActive) {
      const stopTracking = async () => {
        try {
          await mediaPipeService.stop()
        } catch (error) {
          console.error('Error stopping tracking:', error)
        }
      }
      stopTracking()
    }
  }, [isActive, isInitializing])

  return (
    <div className="hand-tracker">
      <div className="tracker-container">
        <video 
          ref={videoRef} 
          className="video-feed"
          style={{ display: 'none' }}
        />
        <canvas ref={canvasRef} className="hand-canvas" />
        
        {/* Live Metrics Overlay */}
        {isActive && (
          <div className="metrics-overlay">
            <div className="metric">
              <div className="metric-label">Moves Detected</div>
              <div className="metric-value">{liveMetrics.moveCount}</div>
            </div>
          </div>
        )}
      </div>
      
      <div className="tracker-controls">
        {isInitializing && <span className="initializing">Loading MediaPipe...</span>}
        
        {/* Camera Setup */}
        <div className="camera-setup">
          <button
            onClick={startPreview}
            disabled={isInitializing || isActive || isPreviewing}
            className="practice-control-btn"
          >
            Preview Camera
          </button>

          <button
            onClick={stopPreview}
            disabled={isInitializing || isActive || !isPreviewing}
            className="practice-control-btn"
          >
            Stop Preview
          </button>

          <div className="zoom-controls">
            <span>Zoom: {zoom.toFixed(1)}x</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              disabled={isActive}
            />
            <button 
              onClick={() => setZoom(z => Math.max(1, +(z - 0.1).toFixed(1)))} 
              disabled={isActive}
              className="practice-control-btn-small"
            >
              -
            </button>
            <button 
              onClick={() => setZoom(z => Math.min(3, +(z + 0.1).toFixed(1)))} 
              disabled={isActive}
              className="practice-control-btn-small"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
