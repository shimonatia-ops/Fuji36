/**
 * CameraView + CanvasOverlay
 * Shows live video + overlay graphics (zones, skeleton, guidance text)
 * Captures zone setup and calibration
 *
 * Uses deferred init (user must click Start) to avoid React Strict Mode
 * double-mount triggering MediaPipe WASM "Module.arguments" conflict.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { MediaPipePipeline, type PipelineMode } from '../../services/MediaPipePipeline'
import DraggableZoneOverlay from './DraggableZoneOverlay'
import type { FrameFeatures, NormalizedRect, HandToUse } from './conesTypes'
import '../../styles/App.css'

export interface DetectionArea {
  x: number
  y: number
  width: number
  height: number
}

export function toNormalizedRect(area: DetectionArea): NormalizedRect {
  return {
    x1: area.x,
    y1: area.y,
    x2: area.x + area.width,
    y2: area.y + area.height
  }
}

interface ConesCameraViewProps {
  handToUse: HandToUse
  startZone: NormalizedRect | null
  endZone: NormalizedRect | null
  onFrame: (features: FrameFeatures) => void
  isActive: boolean
  prompt: string
  showDebug?: boolean
  /** If true, debug panel is rendered elsewhere (e.g. right sidebar); hide it here */
  hideDebugInCamera?: boolean
  /** If true, require user to click Start before init (avoids Strict Mode WASM conflict) */
  deferInit?: boolean
  /** If true, zones are draggable/resizable. Requires onZoneChange. */
  zonesEditable?: boolean
  /** Called when user drags/resizes zones. Required when zonesEditable. */
  onZoneChange?: (startZone: NormalizedRect, endZone: NormalizedRect) => void
  /** 'alignment' = Pose for shoulder detection; 'exercise' = Hands for grip. */
  pipelineMode?: PipelineMode
}

const DEFAULT_START: NormalizedRect = { x1: 0.1, y1: 0.55, x2: 0.35, y2: 0.9 }
const DEFAULT_END: NormalizedRect = { x1: 0.6, y1: 0.55, x2: 0.9, y2: 0.9 }

export default function ConesCameraView({
  handToUse,
  startZone,
  endZone,
  onFrame,
  isActive,
  prompt,
  showDebug = false,
  hideDebugInCamera = false,
  deferInit = true,
  zonesEditable = true,
  onZoneChange,
  pipelineMode = 'exercise'
}: ConesCameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pipelineRef = useRef<MediaPipePipeline | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [userStarted, setUserStarted] = useState(!deferInit)
  const [lastFeatures, setLastFeatures] = useState<FrameFeatures | null>(null)
  const onFrameRef = useRef(onFrame)
  onFrameRef.current = onFrame

  const start = startZone ?? DEFAULT_START
  const end = endZone ?? DEFAULT_END

  const handleStartZoneChange = (newStart: NormalizedRect) => {
    onZoneChange?.(newStart, end)
  }

  const handleEndZoneChange = (newEnd: NormalizedRect) => {
    onZoneChange?.(start, newEnd)
  }

  const initStartedRef = useRef(false)
  const tryAutoStart = useCallback(() => {
    if (deferInit || pipelineRef.current || initStartedRef.current) return
    if (!videoRef.current || !canvasRef.current) return
    initStartedRef.current = true
    handleStartCamera()
  }, [deferInit])

  const handleStartCamera = async () => {
    if (!videoRef.current || !canvasRef.current || pipelineRef.current) return
    setIsInitializing(true)
    try {
      const pipeline = new MediaPipePipeline({
        handToUse,
        minPoseConfidence: 0.5,
        minHandConfidence: 0.5,
        holdGripThreshold: 0.12,
        releaseGripThreshold: 0.18,
        startZone: start,
        endZone: end
      })
      await pipeline.initialize(videoRef.current, canvasRef.current)
      pipeline.setOnFrame((features) => {
        setLastFeatures(features)
        onFrameRef.current(features)
      })
      pipelineRef.current = pipeline
      setUserStarted(true)
      if (isActive) await pipeline.start()
    } catch (e) {
      console.error('Pipeline init failed:', e)
      initStartedRef.current = false
    } finally {
      setIsInitializing(false)
    }
  }

  useEffect(() => {
    return () => {
      pipelineRef.current?.cleanup()
      pipelineRef.current = null
      initStartedRef.current = false
    }
  }, [])

  // Auto-start camera when deferInit=false - use callback refs so we run when elements mount
  const setVideoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      videoRef.current = el
      if (!deferInit && el) tryAutoStart()
    },
    [deferInit, tryAutoStart]
  )
  const setCanvasRef = useCallback(
    (el: HTMLCanvasElement | null) => {
      canvasRef.current = el
      if (!deferInit && el) tryAutoStart()
    },
    [deferInit, tryAutoStart]
  )

  useEffect(() => {
    if (!deferInit) {
      const t = setTimeout(tryAutoStart, 200)
      return () => clearTimeout(t)
    }
  }, [deferInit, tryAutoStart])

  useEffect(() => {
    if (pipelineRef.current) {
      pipelineRef.current.setConfig({ startZone: start, endZone: end })
    }
  }, [start, end])

  useEffect(() => {
    const pipeline = pipelineRef.current
    if (pipeline && pipelineMode === 'exercise' && pipeline.getMode() === 'alignment') {
      pipeline.switchToExerciseMode()
      pipeline.setConfig({ startZone: start, endZone: end })
    }
  }, [pipelineMode, start, end])

  useEffect(() => {
    const pipeline = pipelineRef.current
    if (isActive && pipeline) {
      pipeline.setConfig({ startZone: start, endZone: end })
      pipeline.start()
    } else if (!isActive && pipeline) {
      pipeline.stop()
    }
  }, [isActive, userStarted, start, end])

  const needsStartButton = deferInit && !userStarted && !isInitializing

  return (
    <div className="cones-camera-view">
      <div className="cones-camera-container" style={{ display: needsStartButton ? 'none' : undefined }}>
        <video ref={setVideoRef} className="cones-video" style={{ display: 'none' }} />
        <canvas ref={setCanvasRef} className="cones-canvas" />
        {zonesEditable && onZoneChange && (
          <>
            <DraggableZoneOverlay
              zone={start}
              label="START"
              color="#2563eb"
              onZoneChange={handleStartZoneChange}
              disabled={isInitializing}
            />
            <DraggableZoneOverlay
              zone={end}
              label="END"
              color="#059669"
              onZoneChange={handleEndZoneChange}
              disabled={isInitializing}
            />
          </>
        )}
        <div className="cones-prompt-banner">{prompt}</div>
        {showDebug && !hideDebugInCamera && lastFeatures && (
          <div className="cones-debug-panel">
            <div>Pose: {lastFeatures.poseOk ? 'OK' : '—'}</div>
            <div>Hand: {lastFeatures.handOk ? 'OK' : '—'}</div>
            <div>Grip: {lastFeatures.grip ? 'Y' : 'N'} (pinch: {lastFeatures.pinchDist?.toFixed(3) ?? '—'})</div>
            <div>Start: {lastFeatures.inStartZone ? 'Y' : 'N'}</div>
            <div>End: {lastFeatures.inEndZone ? 'Y' : 'N'}</div>
            <div>Wrist: ({lastFeatures.wristX?.toFixed(2)}, {lastFeatures.wristY?.toFixed(2)})</div>
            <div>Elbow: {lastFeatures.angles.elbowAngleDeg.toFixed(0)}°</div>
          </div>
        )}
      </div>
      {needsStartButton && (
        <div className="cones-start-camera-prompt">
          <p>Click below to start the camera.</p>
          <button
            type="button"
            className="practice-start-exercise-btn"
            onClick={handleStartCamera}
          >
            Start Camera
          </button>
        </div>
      )}
      {isInitializing && (
        <div className="cones-loading">Loading camera...</div>
      )}
    </div>
  )
}

