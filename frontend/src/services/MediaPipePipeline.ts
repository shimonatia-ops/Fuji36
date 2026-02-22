/**
 * MediaPipePipeline - Pose for alignment, Hands for exercise
 * Avoids WASM conflict by using only one at a time (Pose then Hands).
 * Alignment: shoulderCenterX, shoulderWidth, pose landmarks.
 * Exercise: hand landmarks, grip, zone checks.
 */
import { Pose } from '@mediapipe/pose'
import { Hands } from '@mediapipe/hands'
import { Camera } from '@mediapipe/camera_utils'
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils'
import type { NormalizedLandmark } from '@mediapipe/hands'
import type { FrameFeatures, NormalizedRect, HandToUse } from '../practices/shaping/conesTypes'

const L_SHOULDER = 11
const R_SHOULDER = 12
const L_ELBOW = 13
const R_ELBOW = 14
const L_WRIST = 15
const R_WRIST = 16

const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]
]
const THUMB_TIP = 4
const INDEX_TIP = 8
const WRIST = 0

function dist(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0))
}

function angleDeg(p1: NormalizedLandmark, vertex: NormalizedLandmark, p2: NormalizedLandmark): number {
  const v1 = { x: p1.x - vertex.x, y: p1.y - vertex.y }
  const v2 = { x: p2.x - vertex.x, y: p2.y - vertex.y }
  const dot = v1.x * v2.x + v1.y * v2.y
  const cross = v1.x * v2.y - v1.y * v2.x
  const rad = Math.atan2(Math.abs(cross), dot)
  return (rad * 180) / Math.PI
}

function isInRect(x: number, y: number, rect: NormalizedRect): boolean {
  const x1 = Math.min(rect.x1, rect.x2)
  const x2 = Math.max(rect.x1, rect.x2)
  const y1 = Math.min(rect.y1, rect.y2)
  const y2 = Math.max(rect.y1, rect.y2)
  return x >= x1 && x <= x2 && y >= y1 && y <= y2
}

function vis(lm: { visibility?: number } | undefined): number {
  return lm?.visibility ?? 0
}

const SELFIE_MODE = true

function flipX<T extends { x: number }>(lm: T): T {
  return { ...lm, x: 1 - lm.x } as T
}

export interface MediaPipePipelineConfig {
  handToUse: HandToUse
  minPoseConfidence: number
  minHandConfidence: number
  holdGripThreshold: number
  releaseGripThreshold: number
  startZone: NormalizedRect
  endZone: NormalizedRect
}

const DEFAULT_FEATURES: FrameFeatures = {
  poseOk: false,
  handOk: false,
  selectedHandLandmarks: null,
  wristX: 0.5,
  wristY: 0.5,
  pinchDist: 1,
  grip: false,
  inStartZone: false,
  inEndZone: false,
  angles: {
    elbowAngleDeg: 0,
    shoulderFlexionDeg: 0,
    shoulderAbductionDeg: 0,
    wristExtensionProxy: 0
  },
  confidence: { pose: 0, hand: 0 }
}

export type PipelineMode = 'alignment' | 'exercise'

export class MediaPipePipeline {
  private pose: Pose | null = null
  private hands: Hands | null = null
  private camera: Camera | null = null
  private videoElement: HTMLVideoElement | null = null
  private canvasElement: HTMLCanvasElement | null = null
  private isInitialized = false
  private isRunning = false
  private mode: PipelineMode = 'alignment'
  private config: MediaPipePipelineConfig
  private onFrameCallback: ((features: FrameFeatures) => void) | null = null
  private lastFeatures: FrameFeatures = { ...DEFAULT_FEATURES }
  private gripHysteresis = false

  constructor(config: MediaPipePipelineConfig) {
    this.config = config
  }

  getMode(): PipelineMode {
    return this.mode
  }

  async initialize(
    videoElement: HTMLVideoElement,
    canvasElement: HTMLCanvasElement
  ): Promise<void> {
    if (this.isInitialized) return

    this.videoElement = videoElement
    this.canvasElement = canvasElement

    this.pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    })
    this.pose.setOptions({
      modelComplexity: 1,
      minDetectionConfidence: this.config.minPoseConfidence,
      minTrackingConfidence: this.config.minPoseConfidence,
      selfieMode: true
    })
    await this.pose.initialize()

    this.hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    })
    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: this.config.minHandConfidence,
      minTrackingConfidence: this.config.minHandConfidence,
      selfieMode: true
    })
    await this.hands.initialize()

    this.camera = new Camera(this.videoElement, {
      onFrame: async () => {
        if (!this.isRunning || !this.videoElement) return
        try {
          if (this.mode === 'alignment' && this.pose && this.hands) {
            await this.processAlignmentFrame()
          } else if (this.mode === 'exercise' && this.hands) {
            await this.processHandsFrame()
          }
        } catch (e) {
          console.warn('Frame processing error:', e)
        }
      },
      width: 640,
      height: 480
    })

    canvasElement.width = 640
    canvasElement.height = 480
    this.isInitialized = true
  }

  async switchToExerciseMode(): Promise<void> {
    if (this.mode === 'exercise') return
    if (this.pose) {
      await this.pose.close()
      this.pose = null
    }
    this.mode = 'exercise'
  }

  setConfig(config: Partial<MediaPipePipelineConfig>): void {
    this.config = { ...this.config, ...config }
  }

  setOnFrame(callback: (features: FrameFeatures) => void): void {
    this.onFrameCallback = callback
  }

  private async processAlignmentFrame(): Promise<void> {
    if (!this.videoElement || !this.pose || !this.hands || !this.canvasElement) return

    let poseLandmarks: Array<{ x: number; y: number; z?: number; visibility?: number }> | null = null
    let handLandmarks: NormalizedLandmark[] | null = null
    let handedness: 'Left' | 'Right' | null = null
    let handConfidence = 0

    await new Promise<void>((resolve) => {
      this.pose!.onResults((results: { poseLandmarks?: Array<{ x: number; y: number; z?: number; visibility?: number }> }) => {
        poseLandmarks = results.poseLandmarks ?? null
        resolve()
      })
      this.pose!.send({ image: this.videoElement })
    })

    await new Promise<void>((resolve) => {
      this.hands!.onResults((results: { multiHandLandmarks?: NormalizedLandmark[][]; multiHandedness?: Array<{ label: string; score?: number }> }) => {
        const multiHand = results.multiHandLandmarks
        const multiHandedness = results.multiHandedness
        if (multiHand?.length && multiHandedness?.length) {
          const wantLeft = this.config.handToUse === 'Left'
          const idx = multiHandedness.findIndex((h) => (h.label === 'Left') === wantLeft)
          if (idx >= 0) {
            handLandmarks = multiHand[idx]
            handedness = multiHandedness[idx].label as 'Left' | 'Right'
            handConfidence = multiHandedness[idx].score ?? 0.5
          } else {
            handLandmarks = multiHand[0]
            handedness = multiHandedness[0].label as 'Left' | 'Right'
            handConfidence = multiHandedness[0].score ?? 0.5
          }
        }
        resolve()
      })
      this.hands!.send({ image: this.videoElement })
    })

    const features = this.computeAlignmentFeatures(poseLandmarks, handLandmarks, handedness, handConfidence)
    this.lastFeatures = features
    this.drawAlignmentOverlay(poseLandmarks, handLandmarks)
    if (this.onFrameCallback) this.onFrameCallback(features)
  }

  private computeAlignmentFeatures(
    poseLandmarks: Array<{ x: number; y: number; z?: number; visibility?: number }> | null,
    handLandmarks: NormalizedLandmark[] | null,
    handedness: 'Left' | 'Right' | null,
    handConfidence: number
  ): FrameFeatures {
    const features: FrameFeatures = { ...DEFAULT_FEATURES }
    const minVis = 0.5

    const handOk = !!handLandmarks && handLandmarks.length >= 9 && !!handedness
    const correctHand = handedness === this.config.handToUse
    const handsHandOk = handOk && correctHand
    if (handsHandOk) {
      features.handOk = true
      features.confidence.hand = handConfidence
      features.wristX = handLandmarks![WRIST].x
      features.wristY = handLandmarks![WRIST].y
      features.selectedHandLandmarks = handLandmarks!.map((l) => [l.x, l.y, l.z || 0])
    }

    if (!poseLandmarks || poseLandmarks.length < 17) {
      return features
    }

    const lShoulder = poseLandmarks[L_SHOULDER]
    const rShoulder = poseLandmarks[R_SHOULDER]
    const lElbow = poseLandmarks[L_ELBOW]
    const rElbow = poseLandmarks[R_ELBOW]
    const lWrist = poseLandmarks[L_WRIST]
    const rWrist = poseLandmarks[R_WRIST]

    const shouldersVisible = vis(lShoulder) >= minVis && vis(rShoulder) >= minVis
    const elbowsVisible = vis(lElbow) >= minVis && vis(rElbow) >= minVis
    const wristsVisible = vis(lWrist) >= minVis && vis(rWrist) >= minVis

    features.poseOk = shouldersVisible && elbowsVisible && wristsVisible

    const wantLeft = this.config.handToUse === 'Left'
    const exerciseWrist = wantLeft ? lWrist : rWrist
    const poseHandVisible = vis(exerciseWrist) >= minVis
    const otherWrist = wantLeft ? rWrist : lWrist
    const otherHandVisible = vis(otherWrist) >= minVis
    const poseHandOk = poseHandVisible || (poseHandVisible && otherHandVisible)
    if (!features.handOk) features.handOk = poseHandOk
    if (features.confidence.hand === 0 && poseHandVisible) features.confidence.hand = 0.8

    features.confidence.pose = shouldersVisible ? 0.8 : 0

    if (shouldersVisible && lShoulder && rShoulder) {
      features.shoulderCenterX = (lShoulder.x + rShoulder.x) / 2
      features.shoulderWidth = Math.abs(lShoulder.x - rShoulder.x)
    }

    if (!handsHandOk && poseHandVisible && exerciseWrist) {
      features.wristX = exerciseWrist.x
      features.wristY = exerciseWrist.y
    }

    return features
  }

  private drawAlignmentOverlay(
    poseLandmarks: Array<{ x: number; y: number }> | null,
    handLandmarks: NormalizedLandmark[] | null
  ): void {
    if (!this.canvasElement || !this.videoElement) return
    const ctx = this.canvasElement.getContext('2d')
    if (!ctx) return
    const w = this.canvasElement.width
    const h = this.canvasElement.height
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(this.videoElement, 0, 0, w, h)

    if (poseLandmarks?.length && poseLandmarks.length > 16) {
      const fx = (p: { x: number; y: number }) => (SELFIE_MODE ? (1 - p.x) * w : p.x * w)
      const fy = (p: { x: number; y: number }) => p.y * h
      ctx.strokeStyle = '#00ff00'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(fx(poseLandmarks[11]), fy(poseLandmarks[11]))
      ctx.lineTo(fx(poseLandmarks[12]), fy(poseLandmarks[12]))
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(fx(poseLandmarks[11]), fy(poseLandmarks[11]))
      ctx.lineTo(fx(poseLandmarks[13]), fy(poseLandmarks[13]))
      ctx.lineTo(fx(poseLandmarks[15]), fy(poseLandmarks[15]))
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(fx(poseLandmarks[12]), fy(poseLandmarks[12]))
      ctx.lineTo(fx(poseLandmarks[14]), fy(poseLandmarks[14]))
      ctx.lineTo(fx(poseLandmarks[16]), fy(poseLandmarks[16]))
      ctx.stroke()
    }

    if (handLandmarks?.length) {
      const flipped = SELFIE_MODE ? handLandmarks.map(flipX) : handLandmarks
      drawConnectors(ctx, flipped, HAND_CONNECTIONS, { color: '#ff00ff', lineWidth: 2 })
      drawLandmarks(ctx, flipped, { color: '#ff0000', lineWidth: 2, radius: 4 })
    }
  }

  private async processHandsFrame(): Promise<void> {
    if (!this.videoElement || !this.hands || !this.canvasElement) return

    let handLandmarks: NormalizedLandmark[] | null = null
    let handedness: 'Left' | 'Right' | null = null
    let handConfidence = 0

    await new Promise<void>((resolve) => {
      this.hands!.onResults((results: { multiHandLandmarks?: NormalizedLandmark[][]; multiHandedness?: Array<{ label: string; score?: number }> }) => {
        const multiHand = results.multiHandLandmarks
        const multiHandedness = results.multiHandedness
        if (multiHand?.length && multiHandedness?.length) {
          const wantLeft = this.config.handToUse === 'Left'
          const idx = multiHandedness.findIndex((h) => (h.label === 'Left') === wantLeft)
          if (idx >= 0) {
            handLandmarks = multiHand[idx]
            handedness = multiHandedness[idx].label as 'Left' | 'Right'
            handConfidence = multiHandedness[idx].score ?? 0.5
          } else {
            handLandmarks = multiHand[0]
            handedness = multiHandedness[0].label as 'Left' | 'Right'
            handConfidence = multiHandedness[0].score ?? 0.5
          }
        }
        resolve()
      })
      this.hands!.send({ image: this.videoElement })
    })

    const features = this.computeHandsFeatures(handLandmarks, handedness, handConfidence)
    this.lastFeatures = features
    this.drawOverlay(handLandmarks)
    if (this.onFrameCallback) this.onFrameCallback(features)
  }

  private computeHandsFeatures(
    handLandmarks: NormalizedLandmark[] | null,
    handedness: 'Left' | 'Right' | null,
    handConfidence: number
  ): FrameFeatures {
    const features: FrameFeatures = { ...DEFAULT_FEATURES }
    features.confidence = { pose: 0, hand: handConfidence }

    const handOk = !!handLandmarks && handLandmarks.length >= 9 && !!handedness
    const correctHand = handedness === this.config.handToUse

    features.handOk = handOk && correctHand
    features.poseOk = handOk
    features.selectedHandLandmarks = handLandmarks
      ? handLandmarks.map((l) => [l.x, l.y, l.z || 0])
      : null

    if (handLandmarks && handLandmarks.length > INDEX_TIP) {
      const wrist = handLandmarks[WRIST]
      const thumb = handLandmarks[THUMB_TIP]
      const index = handLandmarks[INDEX_TIP]
      features.wristX = wrist.x
      features.wristY = wrist.y
      features.pinchDist = dist(thumb, index)

      const gripThreshold = this.config.holdGripThreshold
      const releaseThreshold = this.config.releaseGripThreshold
      if (features.pinchDist < gripThreshold) {
        this.gripHysteresis = true
        features.grip = true
      } else if (features.pinchDist > releaseThreshold) {
        this.gripHysteresis = false
        features.grip = false
      } else {
        features.grip = this.gripHysteresis
      }

      const zoneX = SELFIE_MODE ? 1 - features.wristX : features.wristX
      features.inStartZone = isInRect(zoneX, features.wristY, this.config.startZone)
      features.inEndZone = isInRect(zoneX, features.wristY, this.config.endZone)

      if (handLandmarks.length > 9) {
        const middleMcp = handLandmarks[9]
        const diff = { x: middleMcp.x - wrist.x, y: middleMcp.y - wrist.y }
        features.angles.wristExtensionProxy = Math.atan2(diff.y, diff.x) * (180 / Math.PI)
      }

      if (handLandmarks.length >= 5) {
        const thumbIp = handLandmarks[3]
        const indexPip = handLandmarks[6]
        features.angles.elbowAngleDeg = angleDeg(thumbIp, wrist, indexPip)
      }
    }

    return features
  }

  private drawOverlay(handLandmarks: NormalizedLandmark[] | null): void {
    if (!this.canvasElement || !this.videoElement) return
    const ctx = this.canvasElement.getContext('2d')
    if (!ctx) return

    const w = this.canvasElement.width
    const h = this.canvasElement.height
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(this.videoElement, 0, 0, w, h)

    const rect = this.config.startZone
    ctx.strokeStyle = '#2563eb'
    ctx.lineWidth = 3
    ctx.strokeRect(rect.x1 * w, rect.y1 * h, (rect.x2 - rect.x1) * w, (rect.y2 - rect.y1) * h)
    ctx.fillStyle = 'rgba(37, 99, 235, 0.15)'
    ctx.fillRect(rect.x1 * w, rect.y1 * h, (rect.x2 - rect.x1) * w, (rect.y2 - rect.y1) * h)

    const endRect = this.config.endZone
    ctx.strokeStyle = '#059669'
    ctx.strokeRect(endRect.x1 * w, endRect.y1 * h, (endRect.x2 - endRect.x1) * w, (endRect.y2 - endRect.y1) * h)
    ctx.fillStyle = 'rgba(5, 150, 105, 0.15)'
    ctx.fillRect(endRect.x1 * w, endRect.y1 * h, (endRect.x2 - endRect.x1) * w, (endRect.y2 - endRect.y1) * h)

    if (handLandmarks?.length) {
      const flipped = SELFIE_MODE ? handLandmarks.map(flipX) : handLandmarks
      drawConnectors(ctx, flipped, HAND_CONNECTIONS, { color: '#ff00ff', lineWidth: 2 })
      drawLandmarks(ctx, flipped, { color: '#ff0000', lineWidth: 2, radius: 4 })
    }
  }

  async start(): Promise<void> {
    if (!this.isInitialized || !this.camera) throw new Error('Not initialized')
    this.isRunning = true
    await this.camera.start()
  }

  async stop(): Promise<void> {
    this.isRunning = false
    if (this.camera) await this.camera.stop()
  }

  getLastFeatures(): FrameFeatures {
    return this.lastFeatures
  }

  cleanup(): void {
    this.isRunning = false
    this.camera?.stop().catch(() => {})
    this.pose?.close?.()
    this.pose = null
    this.hands?.close?.()
    this.hands = null
    this.camera = null
    this.isInitialized = false
  }
}
