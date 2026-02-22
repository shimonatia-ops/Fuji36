import { useEffect, useRef, useState } from 'react'
import { mediaPipeService } from '../../services/MediaPipeService'
import '../../styles/App.css'

interface DetectionArea {
  x: number
  y: number
  width: number
  height: number
}

interface SetupTrackerProps {
  onSetupComplete: (startArea: DetectionArea, stopArea: DetectionArea) => void
  preferredHand?: 'left' | 'right' // From task properties
}

export default function SetupTracker({ onSetupComplete, preferredHand }: SetupTrackerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [zoom, setZoom] = useState(1.0)
  const [setupStep, setSetupStep] = useState<'start' | 'stop' | 'complete'>('start')
  const [startArea, setStartArea] = useState<DetectionArea | null>(null)
  const [stopArea, setStopArea] = useState<DetectionArea | null>(null)
  const [detectedHand, setDetectedHand] = useState<'left' | 'right' | null>(null)
  const [handPositions, setHandPositions] = useState<Array<{ x: number; y: number; timestamp: number }>>([])
  const [isDetecting, setIsDetecting] = useState(false)
  const detectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInitializedRef = useRef(false)
  const handPositionCallbackRef = useRef<((x: number, y: number) => void) | null>(null)

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
      // Enable hand detection after preview starts
      await mediaPipeService.enableHandDetection((handedness: 'Left' | 'Right') => {
        setDetectedHand(handedness.toLowerCase() as 'left' | 'right')
      })
      setIsPreviewing(true)
      // Start automatic area detection
      startAutoDetection()
    } catch (e) {
      console.error(e)
      alert(`Unable to start preview: ${String(e)}`)
    }
  }

  const startAutoDetection = () => {
    setIsDetecting(true)
    setHandPositions([])
    
    // Set up callback to collect hand positions
    handPositionCallbackRef.current = (x: number, y: number) => {
      if (setupStep === 'start' || setupStep === 'stop') {
        setHandPositions(prev => {
          const newPositions = [...prev, { x, y, timestamp: Date.now() }]
          // Keep only last 3 seconds of positions
          const threeSecondsAgo = Date.now() - 3000
          return newPositions.filter(p => p.timestamp > threeSecondsAgo)
        })
      }
    }

    // Auto-detect area after 3 seconds of stable hand position
    if (detectionTimeoutRef.current) {
      clearTimeout(detectionTimeoutRef.current)
    }
    
    detectionTimeoutRef.current = setTimeout(() => {
      detectAreaFromPositions()
    }, 3000)
  }

  const detectAreaFromPositions = () => {
    if (handPositions.length < 10) {
      // Not enough data, try again
      if (detectionTimeoutRef.current) {
        clearTimeout(detectionTimeoutRef.current)
      }
      detectionTimeoutRef.current = setTimeout(() => {
        detectAreaFromPositions()
      }, 2000)
      return
    }

    // Calculate average position and create area around it
    const avgX = handPositions.reduce((sum, p) => sum + p.x, 0) / handPositions.length
    const avgY = handPositions.reduce((sum, p) => sum + p.y, 0) / handPositions.length
    
    // Calculate standard deviation to determine area size
    const stdX = Math.sqrt(
      handPositions.reduce((sum, p) => sum + Math.pow(p.x - avgX, 2), 0) / handPositions.length
    )
    const stdY = Math.sqrt(
      handPositions.reduce((sum, p) => sum + Math.pow(p.y - avgY, 2), 0) / handPositions.length
    )
    
    // Create area: center at average position, size based on standard deviation (min 0.1, max 0.3)
    const areaSize = Math.max(0.1, Math.min(0.3, Math.max(stdX, stdY) * 3))
    
    const area: DetectionArea = {
      x: Math.max(0, Math.min(1, avgX - areaSize / 2)),
      y: Math.max(0, Math.min(1, avgY - areaSize / 2)),
      width: Math.min(1 - Math.max(0, avgX - areaSize / 2), areaSize),
      height: Math.min(1 - Math.max(0, avgY - areaSize / 2), areaSize)
    }
    
    if (setupStep === 'start') {
      setStartArea(area)
      setHandPositions([])
      setSetupStep('stop')
      // Continue detecting for stop area
      if (detectionTimeoutRef.current) {
        clearTimeout(detectionTimeoutRef.current)
      }
      detectionTimeoutRef.current = setTimeout(() => {
        detectAreaFromPositions()
      }, 3000)
    } else if (setupStep === 'stop') {
      setStopArea(area)
      setSetupStep('complete')
      setIsDetecting(false)
      if (detectionTimeoutRef.current) {
        clearTimeout(detectionTimeoutRef.current)
      }
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

  // Initialize MediaPipe on component mount
  useEffect(() => {
    if (isInitializedRef.current) {
      console.log('MediaPipe already initialized, skipping...')
      return
    }

    const initMediaPipe = async () => {
      if (!videoRef.current || !canvasRef.current) return

      try {
        setIsInitializing(true)
        
        console.log('Starting MediaPipe initialization for setup...')
        
        // Create callback for hand position tracking
        const handPositionCallback = (x: number, y: number) => {
          if (handPositionCallbackRef.current) {
            handPositionCallbackRef.current(x, y)
          }
        }
        handPositionCallbackRef.current = handPositionCallback
        
        await mediaPipeService.initialize(
          videoRef.current,
          canvasRef.current,
          undefined // No metrics callback for setup
        )
        
        // Enable hand position tracking
        await mediaPipeService.enableHandPositionTracking(handPositionCallback)
        
        // Hand detection will be enabled when preview starts
        
        isInitializedRef.current = true
        console.log('MediaPipe initialization complete!')
      } catch (error) {
        console.error('Failed to initialize MediaPipe:', error)
        const errorMsg = error instanceof Error ? error.message : String(error)
        alert(`Failed to load MediaPipe:\n${errorMsg}`)
      } finally {
        setIsInitializing(false)
      }
    }

    initMediaPipe()

    return () => {
      if (isInitializedRef.current) {
        mediaPipeService.cleanup()
        isInitializedRef.current = false
      }
    }
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (detectionTimeoutRef.current) {
        clearTimeout(detectionTimeoutRef.current)
      }
    }
  }, [])

  const redrawCanvas = () => {
    // This will be handled by MediaPipe's drawing, we just need to overlay our areas
    if (!canvasRef.current) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const canvasWidth = canvas.width
    const canvasHeight = canvas.height
    
    // Draw start area
    if (startArea) {
      ctx.strokeStyle = '#00ff00'
      ctx.lineWidth = 3
      ctx.setLineDash([])
      ctx.strokeRect(
        startArea.x * canvasWidth,
        startArea.y * canvasHeight,
        startArea.width * canvasWidth,
        startArea.height * canvasHeight
      )
      ctx.fillStyle = 'rgba(0, 255, 0, 0.2)'
      ctx.fillRect(
        startArea.x * canvasWidth,
        startArea.y * canvasHeight,
        startArea.width * canvasWidth,
        startArea.height * canvasHeight
      )
    }
    
    // Draw stop area
    if (stopArea) {
      ctx.strokeStyle = '#ff0000'
      ctx.lineWidth = 3
      ctx.setLineDash([])
      ctx.strokeRect(
        stopArea.x * canvasWidth,
        stopArea.y * canvasHeight,
        stopArea.width * canvasWidth,
        stopArea.height * canvasHeight
      )
      ctx.fillStyle = 'rgba(255, 0, 0, 0.2)'
      ctx.fillRect(
        stopArea.x * canvasWidth,
        stopArea.y * canvasHeight,
        stopArea.width * canvasWidth,
        stopArea.height * canvasHeight
      )
    }
  }

  // Redraw areas when they change
  useEffect(() => {
    if (isPreviewing) {
      // Use requestAnimationFrame to redraw after MediaPipe draws
      requestAnimationFrame(() => {
        redrawCanvas()
      })
    }
  }, [startArea, stopArea, isPreviewing])

  const handleCompleteSetup = () => {
    if (startArea && stopArea) {
      onSetupComplete(startArea, stopArea)
    }
  }

  const handleReset = () => {
    setStartArea(null)
    setStopArea(null)
    setSetupStep('start')
    setHandPositions([])
    setIsDetecting(false)
    if (detectionTimeoutRef.current) {
      clearTimeout(detectionTimeoutRef.current)
    }
    if (isPreviewing) {
      startAutoDetection()
    }
  }

  return (
    <div className="setup-tracker">
      <div className="setup-instructions">
        <h3>Automatic Area Detection</h3>
        {setupStep === 'start' && (
          <p>
            <strong>Step 1:</strong> Position your hand in the START area (where cones begin) and hold it steady for 3 seconds.
            {isDetecting && <span className="detecting-indicator"> 🔍 Detecting...</span>}
          </p>
        )}
        {setupStep === 'stop' && (
          <p>
            <strong>Step 2:</strong> Move your hand to the STOP area (where cones are stacked) and hold it steady for 3 seconds.
            {isDetecting && <span className="detecting-indicator"> 🔍 Detecting...</span>}
          </p>
        )}
        {setupStep === 'complete' && (
          <p className="setup-complete">
            ✓ Areas detected! Click "Complete Setup" to proceed.
          </p>
        )}
        {preferredHand && (
          <p className="hand-indicator">
            Expected Hand: <strong>{preferredHand === 'left' ? 'Left' : 'Right'}</strong>
            {detectedHand && (
              <span className={detectedHand === preferredHand ? 'hand-match' : 'hand-mismatch'}>
                {' '}(Detected: {detectedHand === 'left' ? 'Left' : 'Right'})
              </span>
            )}
          </p>
        )}
      </div>

      <div className="tracker-container">
        <video 
          ref={videoRef} 
          className="video-feed"
          style={{ display: 'none' }}
        />
        <canvas 
          ref={canvasRef} 
          className="hand-canvas"
        />
        
        {/* Area labels */}
        {startArea && (
          <div 
            className="area-label start-area-label"
            style={{
              left: `${startArea.x * 100}%`,
              top: `${startArea.y * 100}%`,
            }}
          >
            START
          </div>
        )}
        {stopArea && (
          <div 
            className="area-label stop-area-label"
            style={{
              left: `${stopArea.x * 100}%`,
              top: `${stopArea.y * 100}%`,
            }}
          >
            STOP
          </div>
        )}
      </div>
      
      <div className="tracker-controls">
        {isInitializing && <span className="initializing">Loading MediaPipe...</span>}
        
        <div className="camera-setup">
          <button
            onClick={startPreview}
            disabled={isInitializing || isPreviewing}
            className="practice-control-btn"
          >
            Start Camera
          </button>

          <button
            onClick={stopPreview}
            disabled={isInitializing || !isPreviewing}
            className="practice-control-btn"
          >
            Stop Camera
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
            />
            <button 
              onClick={() => setZoom(z => Math.max(1, +(z - 0.1).toFixed(1)))} 
              className="practice-control-btn-small"
            >
              -
            </button>
            <button 
              onClick={() => setZoom(z => Math.min(3, +(z + 0.1).toFixed(1)))} 
              className="practice-control-btn-small"
            >
              +
            </button>
          </div>
        </div>

        <div className="setup-actions">
          <button
            onClick={handleReset}
            className="practice-control-btn"
            disabled={!startArea && !stopArea}
          >
            Reset Areas
          </button>
          <button
            onClick={handleCompleteSetup}
            className="practice-start-btn"
            disabled={!startArea || !stopArea || !isPreviewing}
          >
            Complete Setup
          </button>
        </div>
      </div>
    </div>
  )
}
