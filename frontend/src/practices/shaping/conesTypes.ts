/**
 * Cones Exercise - Types and Configuration
 * Physical-therapy exercise: transfer cones from Start Zone to End Zone
 */

/** Normalized rectangle (0-1) */
export interface NormalizedRect {
  x1: number
  y1: number
  x2: number
  y2: number
}

/** Exercise mode: timed or target reps */
export type ExerciseMode = 'Timed' | 'TargetReps'

/** Hand to use for the exercise */
export type HandToUse = 'Left' | 'Right'

/** Therapist-configurable exercise parameters */
export interface ExerciseConfig {
  handToUse: HandToUse
  mode: ExerciseMode
  durationSec: number
  targetReps: number
  startZone: NormalizedRect
  endZone: NormalizedRect
  zoneMinDistanceRule?: number
  minPoseConfidence: number
  minHandConfidence: number
  repCooldownMs: number
  holdGripThreshold: number
  releaseGripThreshold: number
}

/** Main exercise state machine states */
export type ExerciseState =
  | 'SETUP_ALIGNMENT'
  | 'SETUP_ZONES'
  | 'READY_GATE'
  | 'COUNTDOWN_3_2_1'
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'

/** Rep counting sub-state machine */
export type RepState =
  | 'WAIT_PICKUP'
  | 'CARRYING'
  | 'WAIT_DROP'
  | 'CONFIRM_RELEASE'

/** Unified frame features from MediaPipe Pose + Hands */
export interface FrameFeatures {
  poseOk: boolean
  handOk: boolean
  selectedHandLandmarks: number[][] | null
  wristX: number
  wristY: number
  pinchDist: number
  grip: boolean
  inStartZone: boolean
  inEndZone: boolean
  /** From Pose: center of shoulders in normalized X (0-1). Used for alignment. */
  shoulderCenterX?: number
  /** From Pose: shoulder width in normalized coords. Used for alignment (too close/far). */
  shoulderWidth?: number
  angles: {
    elbowAngleDeg: number
    shoulderFlexionDeg: number
    shoulderAbductionDeg: number
    wristExtensionProxy: number
  }
  confidence: {
    pose: number
    hand: number
  }
}

/** Per-rep metrics */
export interface PerRepMetrics {
  repIndex: number
  pickupTime: number
  releaseTime: number
  durationMs: number
  maxElbowExtension: number
  avgElbowExtension: number
  maxShoulderFlexion: number
  maxShoulderAbduction: number
}

/** Session summary for storage */
export interface SessionSummary {
  exerciseId: string
  handToUse: HandToUse
  durationSec: number
  repCount: number
  repsPerMinute: number
  avgRepTimeSec: number
  minRepTimeSec: number
  maxRepTimeSec: number
  timeToTargetRepsSec?: number
  rangeOfMotion: {
    shoulderFlexion: { max: number; avg: number }
    shoulderAbduction: { max: number; avg: number }
    elbowExtension: { max: number; avg: number }
  }
  rawEvents?: Array<{ timestamp: number; repIndex?: number; event: string }>
}
