import { Hands } from '@mediapipe/hands'
import { Camera } from '@mediapipe/camera_utils'
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils'

// Hand connection indices from MediaPipe
const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17], [1, 2], [2, 3], [3, 4],
  [5, 6], [6, 7], [7, 8], [9, 10],
  [10, 11], [11, 12], [13, 14], [14, 15],
  [15, 16], [17, 18], [18, 19], [19, 20],
  [17, 18], [18, 19]
]

interface Metrics {
  moveCount: number
  totalMoveTimeSec: number
  avgMoveTimeSec: number
}

interface Move {
  startTime: number
  endTime: number
  duration: number
  direction: 'LEFT' | 'RIGHT'
}

const WRIST_INDEX = 0
const MOVEMENT_THRESHOLD = 0.01 // 1% of canvas width (reduced from 5% for easier detection)
const MOVEMENT_COOLDOWN = 300 // ms between detecting moves

/**
 * MediaPipeService - Isolated module for hand tracking using @mediapipe/hands
 * Handles:
 * - Capturing camera stream
 * - Detecting hand landmarks
 * - Tracking wrist movements (LEFT/RIGHT)
 * - Computing movement metrics
 */
export class MediaPipeService {
  private hands: Hands | null = null
  private camera: Camera | null = null
  private isRunning = false
  private isInitialized = false
  private isPreviewing = false
  private rafId: ReturnType<typeof requestAnimationFrame> | null = null

  
  // Video and canvas elements
  private videoElement: HTMLVideoElement | null = null
  private canvasElement: HTMLCanvasElement | null = null
  
  // Metrics tracking
  private lastWristX: number | null = null
  private lastMoveTime = 0
  private lastDirection: 'LEFT' | 'RIGHT' | null = null
  private currentMoveStart: number | null = null
  private moves: Move[] = []
  private metrics: Metrics = {
    moveCount: 0,
    totalMoveTimeSec: 0,
    avgMoveTimeSec: 0
  }
  
  // Callback for metrics updates
  private onMetricsUpdate: ((metrics: Metrics) => void) | null = null
  
  // Hand detection callback (for setup - left/right hand)
  private onHandDetection: ((handedness: 'Left' | 'Right') => void) | null = null
  
  // Detection areas (normalized coordinates 0-1)
  private startArea: { x: number; y: number; width: number; height: number } | null = null
  private stopArea: { x: number; y: number; width: number; height: number } | null = null
  
  // Video recording
  private mediaRecorder: MediaRecorder | null = null
  private recordedChunks: Blob[] = []
  private recordingCanvas: HTMLCanvasElement | null = null
  private recordingStream: MediaStream | null = null
  private isRecording = false
  
  // Zoom functionality
  private zoomLevel = 1.0
  private minZoom = 1.0
  private maxZoom = 3.0
  private zoomStep = 0.1

  /**
   * Initialize MediaPipe Hands with camera access
   */
  async initialize(videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement, onMetricsUpdate?: (metrics: Metrics) => void): Promise<void> {
    if (this.isInitialized) {
      console.log('MediaPipe already initialized')
      return
    }

    try {
      this.videoElement = videoElement
      this.canvasElement = canvasElement
      this.onMetricsUpdate = onMetricsUpdate || null

      // Load MediaPipe libraries
      console.log('🚀 Initializing MediaPipe Hands...')

      // Create Hands instance
      console.log('Creating Hands instance...')
      this.hands = new Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        }
      })

      // Configure Hands
      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      })

      // Register callback
      this.hands.onResults(this.onHandsResults.bind(this))
      console.log('✅ Hands instance created')

      // Initialize camera
      console.log('Creating Camera instance...')
      let frameCount = 0
      this.camera = new Camera(this.videoElement, {
        onFrame: async () => {
          frameCount++
          if (frameCount % 30 === 0) {
            console.log(`📹 Camera frames processed: ${frameCount}`)
          }
          
          if (this.hands && this.isRunning && this.videoElement) {
            try {
              await this.hands.send({ image: this.videoElement })
            } catch (error) {
              console.error('Error processing frame:', error)
            }
          }
        },
        width: 640,
        height: 480
      })
      console.log('✅ Camera instance created')

      // Set initial canvas size
      canvasElement.width = 640
      canvasElement.height = 480
      console.log('Canvas size set to 640x480')
      
      // Setup recording canvas
      this.setupRecordingCanvas()

      this.isInitialized = true
      console.log('✅✅✅ MediaPipe Hands fully initialized and ready!')
    } catch (error) {
      console.error('❌ Failed to initialize MediaPipe Hands:', error)
      this.isInitialized = false
      throw error
    }
  }

  async startPreview(): Promise<void> {
    if (!this.isInitialized) throw new Error('Not initialized')

    if (!this.videoElement) throw new Error('Video element missing')
    if (!this.camera) throw new Error('Camera not initialized')

    this.isPreviewing = true

    // start webcam stream (Camera util)
    await this.camera.start()

    // Process frames with MediaPipe for hand detection during preview
    const processFrame = async () => {
      if (!this.isPreviewing || !this.videoElement || !this.canvasElement) return
      if (!this.hands) return

      try {
        // Process frame with MediaPipe to detect hands
        await this.hands.send({ image: this.videoElement })
      } catch (error) {
        console.error('Error processing frame in preview:', error)
      }
    }

    // Process frames periodically during preview (for hand detection)
    const frameInterval = setInterval(() => {
      if (this.isPreviewing && this.videoElement) {
        processFrame()
      } else {
        clearInterval(frameInterval)
      }
    }, 100) // Process every 100ms

    // draw loop (with mediapipe processing for hand detection)
    const drawLoop = () => {
      if (!this.isPreviewing || !this.videoElement || !this.canvasElement) return

      const ctx = this.canvasElement.getContext('2d')
      if (!ctx) return

      // keep canvas in sync
      const vw = this.videoElement.videoWidth || 640
      const vh = this.videoElement.videoHeight || 480
      if (this.canvasElement.width !== vw || this.canvasElement.height !== vh) {
        this.canvasElement.width = vw
        this.canvasElement.height = vh
      }

      const w = this.canvasElement.width
      const h = this.canvasElement.height

      ctx.clearRect(0, 0, w, h)

      // apply zoom
      const cx = w / 2
      const cy = h / 2
      ctx.save()
      ctx.translate(cx, cy)
      ctx.scale(this.zoomLevel, this.zoomLevel)
      ctx.translate(-cx, -cy)

      ctx.drawImage(this.videoElement, 0, 0, w, h)
      ctx.restore()

      this.rafId = requestAnimationFrame(drawLoop)
    }

    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.rafId = requestAnimationFrame(drawLoop)
  }

  setZoom(level: number) {
    this.zoomLevel = Math.min(this.maxZoom, Math.max(this.minZoom, level))
  }

  getZoom() {
    return this.zoomLevel
  }

  async stopPreview(): Promise<void> {
    this.isPreviewing = false
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }

    // If not tracking, stop the camera stream
    if (!this.isRunning && this.camera) {
      await this.camera.stop()
    }
  }

  /**
   * Setup canvas for video recording
   */
  private setupRecordingCanvas(): void {
    if (!this.canvasElement) return
    
    try {
      this.recordingCanvas = this.canvasElement
      const stream = this.recordingCanvas.captureStream(30) // 30 fps
      this.recordingStream = stream
      
      // Setup MediaRecorder with WebM codec
      const options: MediaRecorderOptions = {
        mimeType: 'video/webm;codecs=vp8,opus'
      }
      
      // Fallback if WebM not supported
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options.mimeType = 'video/webm'
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options.mimeType = 'video/mp4'
      }
      
      this.mediaRecorder = new MediaRecorder(stream, options)
      
      // Handle data available event
      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data)
        }
      }
      
      console.log('📹 Recording canvas setup complete')
    } catch (error) {
      console.warn('Video recording not supported:', error)
    }
  }

  /**
   * Callback when hands are detected
   */
  private onHandsResults(results: any): void {
    if (!this.canvasElement || !this.videoElement) return

    // Ensure canvas has proper dimensions
    if (this.canvasElement.width !== this.videoElement.videoWidth || 
        this.canvasElement.height !== this.videoElement.videoHeight) {
      this.canvasElement.width = this.videoElement.videoWidth
      this.canvasElement.height = this.videoElement.videoHeight
    }

    const ctx = this.canvasElement.getContext('2d')
    if (!ctx) return

    // Draw camera frame
    ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height)
    
    // Apply zoom transformation
    const centerX = this.canvasElement.width / 2
    const centerY = this.canvasElement.height / 2
    
    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.scale(this.zoomLevel, this.zoomLevel)
    ctx.translate(-centerX, -centerY)
    
    ctx.drawImage(this.videoElement, 0, 0, this.canvasElement.width, this.canvasElement.height)
    
    // Get landmarks and handedness from the correct property
    const landmarks = results.multiHandLandmarks?.[0] || results.landmarks?.[0]
    const handedness = results.multiHandedness?.[0]?.displayName || results.handedness?.[0]?.displayName

    // Call hand detection callback if provided (for setup mode)
    if (handedness && this.onHandDetection) {
      this.onHandDetection(handedness as 'Left' | 'Right')
    }

    // Draw hand landmarks
    if (landmarks && landmarks.length > 0) {
      drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
        color: '#00FF00',
        lineWidth: 2
      })
      drawLandmarks(ctx, landmarks, {
        color: '#FF0000',
        lineWidth: 2,
        radius: 4
      })

      // Get wrist position (normalized 0-1)
      const wrist = landmarks[WRIST_INDEX]
      const wristX = wrist.x
      const wristY = wrist.y

      // Call hand position callback if provided (for setup mode)
      if (this.onHandPosition) {
        this.onHandPosition(wristX, wristY)
      }

      // Detect movement only when tracking is running
      if (this.isRunning) {
        this.detectMovement(landmarks)
      }
    }
    
    ctx.restore()
  }

  /**
   * Detect hand movements based on wrist position changes
   */
  private detectMovement(landmarks: any[]): void {
    if (landmarks.length < 1) return

    const wrist = landmarks[WRIST_INDEX]
    const wristX = wrist.x

    // Initialize wrist position
    if (this.lastWristX === null) {
      this.lastWristX = wristX
      console.log(`📍 Initial wrist X: ${wristX.toFixed(3)}`)
      return
    }

    const wristMovement = Math.abs(wristX - this.lastWristX)
    const now = Date.now()

    // Log wrist movement every 30 frames for debugging
    if (Math.random() < 0.03) {
      console.log(`📊 Wrist movement: ${wristMovement.toFixed(4)}, threshold: ${MOVEMENT_THRESHOLD}, lastDirection: ${this.lastDirection}`)
    }

    // Detect direction change if movement exceeds threshold and cooldown passed
    if (wristMovement > MOVEMENT_THRESHOLD && now - this.lastMoveTime > MOVEMENT_COOLDOWN) {
      const isMovingRight = wristX > this.lastWristX
      const direction: 'LEFT' | 'RIGHT' = isMovingRight ? 'RIGHT' : 'LEFT'

      console.log(`🔍 Movement detected: ${wristMovement.toFixed(4)} > ${MOVEMENT_THRESHOLD}, direction: ${direction}, lastDirection: ${this.lastDirection}`)

      // If direction changed
      if (direction !== this.lastDirection) {
        // End previous move if exists
        if (this.currentMoveStart !== null && this.lastDirection !== null) {
          const move: Move = {
            startTime: this.currentMoveStart,
            endTime: now,
            duration: now - this.currentMoveStart,
            direction: this.lastDirection
          }
          this.moves.push(move)
          this.metrics.moveCount++
          this.metrics.totalMoveTimeSec += move.duration / 1000
          console.log(`✅ Move recorded: ${this.lastDirection}, duration: ${move.duration}ms`)
        }

        // Start new move
        this.currentMoveStart = now
        this.lastDirection = direction
        this.lastMoveTime = now

        // Update average
        if (this.metrics.moveCount > 0) {
          this.metrics.avgMoveTimeSec = this.metrics.totalMoveTimeSec / this.metrics.moveCount
        }

        // Trigger callback
        this.triggerMetricsUpdate()

        console.log(`🔄 Move detected: ${direction} (count: ${this.metrics.moveCount})`)
      }
    }

    this.lastWristX = wristX
  }

  /**
   * Trigger metrics update callback
   */
  private triggerMetricsUpdate(): void {
    if (this.onMetricsUpdate) {
      this.onMetricsUpdate({ ...this.metrics })
    }
  }

  /**
   * Start hand tracking
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('MediaPipeService not initialized. Call initialize() first.')
    }

    try {
      this.isPreviewing = false
      if (this.rafId) {
        cancelAnimationFrame(this.rafId)
        this.rafId = null
      }
      this.isRunning = true
      
      // Start video recording
      if (this.mediaRecorder && this.mediaRecorder.state === 'inactive') {
        this.recordedChunks = []
        this.mediaRecorder.start()
        this.isRecording = true
        console.log('📹 Video recording started')
      }
      
      if (!this.camera) {
        throw new Error('Camera not initialized')
      }
      await this.camera.start()
      console.log('▶️ Hand tracking started')
    } catch (error) {
      console.error('❌ Failed to start tracking:', error)
      throw error
    }
  }

  /**
   * Stop hand tracking and finalize metrics
   */
  async stop(): Promise<Metrics> {
    if (!this.isRunning) {
      return this.metrics
    }

    try {
      this.isRunning = false
      
      if (this.camera) {
        await this.camera.stop()
      }

      // Stop video recording
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        await this.stopRecording()
      }

      // End the last move if one was in progress
      if (this.currentMoveStart !== null && this.lastDirection !== null) {
        const now = Date.now()
        const move: Move = {
          startTime: this.currentMoveStart,
          endTime: now,
          duration: now - this.currentMoveStart,
          direction: this.lastDirection
        }
        this.moves.push(move)
        this.metrics.moveCount++
        this.metrics.totalMoveTimeSec += move.duration / 1000
      }

      // Calculate final average
      if (this.metrics.moveCount > 0) {
        this.metrics.avgMoveTimeSec = this.metrics.totalMoveTimeSec / this.metrics.moveCount
      }

      console.log('⏹️ Hand tracking stopped. Final metrics:', {
        moveCount: this.metrics.moveCount,
        totalMoveTimeSec: this.metrics.totalMoveTimeSec.toFixed(2),
        avgMoveTimeSec: this.metrics.avgMoveTimeSec.toFixed(2),
        moves: this.moves
      })

      return { ...this.metrics }
    } catch (error) {
      console.error('❌ Failed to stop tracking:', error)
      throw error
    }
  }

  /**
   * Stop recording and save video to local computer
   */
  private stopRecording(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve()
        return
      }

      // Wait for stop event to get all chunks
      this.mediaRecorder.onstop = async () => {
        this.isRecording = false
        
        // Create blob from recorded chunks
        const webmBlob = new Blob(this.recordedChunks, { type: 'video/webm' })
        
        // Try to convert to AVI via backend
        let downloadBlob = webmBlob
        let downloadExt = 'webm'
        
        try {
          console.log('📤 Uploading video for conversion...')
          
          const formData = new FormData()
          formData.append('video', webmBlob, 'session.webm')
          
          const response = await fetch('/api/convert-to-avi', {
            method: 'POST',
            body: formData
          })
          
          if (response.ok) {
            downloadBlob = await response.blob()
            downloadExt = 'avi'
            console.log('✅ Converted to AVI format')
          } else {
            console.warn('Conversion not available, saving as WebM')
          }
        } catch (error) {
          console.warn('Could not convert to AVI, saving as WebM:', error)
        }
        
        // Download file
        const url = URL.createObjectURL(downloadBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `hand-practice-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.${downloadExt}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        
        console.log(`✅ Video saved: ${link.download}`)
        this.recordedChunks = []
        resolve()
      }

      this.mediaRecorder.stop()
    })
  }

  /**
   * Reset metrics for a new session
   */
  resetMetrics(): void {
    this.moves = []
    this.metrics = {
      moveCount: 0,
      totalMoveTimeSec: 0,
      avgMoveTimeSec: 0
    }
    this.lastWristX = null
    this.lastMoveTime = 0
    this.lastDirection = null
    this.currentMoveStart = null
  }

  /**
   * Get current metrics
   */
  getMetrics(): Metrics {
    return { ...this.metrics }
  }

  /**
   * Get detailed move history
   */
  getMoves(): Move[] {
    return [...this.moves]
  }

  // Hand position tracking callback (for automatic area detection)
  private onHandPosition: ((x: number, y: number) => void) | null = null

  /**
   * Enable hand detection callback (for setup mode)
   */
  async enableHandDetection(callback: (handedness: 'Left' | 'Right') => void): Promise<void> {
    this.onHandDetection = callback
    // Start processing frames to detect hand
    if (this.camera && !this.isRunning && !this.isPreviewing) {
      await this.camera.start()
    }
  }

  /**
   * Enable hand position tracking (for automatic area detection)
   */
  async enableHandPositionTracking(callback: (x: number, y: number) => void): Promise<void> {
    this.onHandPosition = callback
  }

  /**
   * Set detection areas (normalized coordinates 0-1)
   */
  setDetectionAreas(startArea: { x: number; y: number; width: number; height: number }, 
                    stopArea: { x: number; y: number; width: number; height: number }): void {
    this.startArea = startArea
    this.stopArea = stopArea
  }

  /**
   * Check if wrist is in a detection area
   */
  private isWristInArea(wristX: number, wristY: number, area: { x: number; y: number; width: number; height: number }): boolean {
    return wristX >= area.x && 
           wristX <= area.x + area.width &&
           wristY >= area.y && 
           wristY <= area.y + area.height
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Stop recording if active
    if (this.isRecording && this.mediaRecorder) {
      this.mediaRecorder.stop()
    }
    
    if (this.camera) {
      this.camera.stop().catch(() => {})
      this.camera = null
    }
    if (this.hands) {
      this.hands.close()
      this.hands = null
    }
    
    // Clean up recording resources
    if (this.recordingStream) {
      this.recordingStream.getTracks().forEach(track => track.stop())
      this.recordingStream = null
    }
    
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    
    this.isRunning = false
    this.isInitialized = false
    this.isPreviewing = false
  }
}

// Export singleton instance
export const mediaPipeService = new MediaPipeService()
