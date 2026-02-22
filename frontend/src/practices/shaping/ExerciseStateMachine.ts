/**
 * ExerciseStateMachine - Controls app steps and transitions
 * Owns logic for rep-counted events and state transitions
 */
import type { ExerciseState, RepState, FrameFeatures, ExerciseConfig } from './conesTypes'

const ALIGNMENT_OK_FRAMES = 30
const HAND_STABLE_FRAMES = 15
const ZONE_DWELL_FRAMES = 12
const COUNTDOWN_SEC = 5

export type StateTransition =
  | { type: 'ALIGNMENT_OK' }
  | { type: 'ZONES_CONFIRMED' }
  | { type: 'READY_PRESSED' }
  | { type: 'COUNTDOWN_DONE' }
  | { type: 'TIME_UP' }
  | { type: 'TARGET_REPS_REACHED' }
  | { type: 'USER_STOP' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'REP_COUNTED' }
  | { type: 'FRAME'; features: FrameFeatures }

export interface ExerciseStateMachineState {
  exerciseState: ExerciseState
  repState: RepState
  alignmentOkFrames: number
  handStableFrames: number
  startZoneDwellFrames: number
  endZoneDwellFrames: number
  enteredCarryingByDwell: boolean
  countdownRemaining: number
  repCount: number
}

export class ExerciseStateMachine {
  private config: ExerciseConfig
  private state: ExerciseStateMachineState
  private onRepCounted: (() => void) | null = null
  private onRepStart: (() => void) | null = null
  private onStateChange: ((s: ExerciseState) => void) | null = null
  private lastRepTime = 0

  constructor(config: ExerciseConfig) {
    this.config = config
    this.state = {
      exerciseState: 'SETUP_ALIGNMENT',
      repState: 'WAIT_PICKUP',
      alignmentOkFrames: 0,
      handStableFrames: 0,
      startZoneDwellFrames: 0,
      endZoneDwellFrames: 0,
      enteredCarryingByDwell: false,
      countdownRemaining: COUNTDOWN_SEC,
      repCount: 0
    }
  }

  setOnRepCounted(cb: () => void): void {
    this.onRepCounted = cb
  }

  setOnRepStart(cb: () => void): void {
    this.onRepStart = cb
  }

  setOnStateChange(cb: (s: ExerciseState) => void): void {
    this.onStateChange = cb
  }

  getState(): ExerciseStateMachineState {
    return { ...this.state }
  }

  dispatch(transition: StateTransition): void {
    const prev = this.state.exerciseState

    switch (transition.type) {
      case 'ALIGNMENT_OK':
        if (this.state.exerciseState === 'SETUP_ALIGNMENT') {
          this.setState('SETUP_ZONES')
        }
        break

      case 'ZONES_CONFIRMED':
        if (this.state.exerciseState === 'SETUP_ZONES') {
          this.setState('COUNTDOWN_3_2_1')
          this.state.countdownRemaining = COUNTDOWN_SEC
        }
        break

      case 'READY_PRESSED':
        if (this.state.exerciseState === 'READY_GATE') {
          this.setState('COUNTDOWN_3_2_1')
          this.state.countdownRemaining = COUNTDOWN_SEC
        }
        break

      case 'COUNTDOWN_DONE':
        if (this.state.exerciseState === 'COUNTDOWN_3_2_1') {
          this.setState('ACTIVE')
        }
        break

      case 'TIME_UP':
        if (this.state.exerciseState === 'ACTIVE') {
          this.setState('COMPLETED')
        }
        break

      case 'TARGET_REPS_REACHED':
        if (this.state.exerciseState === 'ACTIVE') {
          this.setState('COMPLETED')
        }
        break

      case 'USER_STOP':
        if (this.state.exerciseState === 'ACTIVE' || this.state.exerciseState === 'PAUSED') {
          this.setState('COMPLETED')
        }
        break

      case 'PAUSE':
        if (this.state.exerciseState === 'ACTIVE') {
          this.setState('PAUSED')
        }
        break

      case 'RESUME':
        if (this.state.exerciseState === 'PAUSED') {
          this.setState('ACTIVE')
        }
        break

      case 'REP_COUNTED':
        this.state.repCount++
        this.onRepCounted?.()
        this.state.repState = 'WAIT_PICKUP'
        this.state.enteredCarryingByDwell = false
        this.lastRepTime = Date.now()
        if (this.config.mode === 'TargetReps' && this.state.repCount >= this.config.targetReps) {
          this.setState('COMPLETED')
        }
        break

      case 'FRAME':
        this.processFrame(transition.features)
        break
    }
  }

  private setState(s: ExerciseState): void {
    this.state.exerciseState = s
    this.onStateChange?.(s)
  }

  private processFrame(features: FrameFeatures): void {
    if (this.state.exerciseState === 'SETUP_ALIGNMENT') {
      if (this.checkAlignment(features)) {
        this.state.alignmentOkFrames++
        if (this.state.alignmentOkFrames >= ALIGNMENT_OK_FRAMES) {
          this.dispatch({ type: 'ALIGNMENT_OK' })
        }
      } else {
        this.state.alignmentOkFrames = 0
      }
    }

    if (this.state.exerciseState === 'COUNTDOWN_3_2_1') {
      // Countdown is driven by timer in UI, not per-frame
    }

    if (this.state.exerciseState === 'ACTIVE') {
      this.processRepState(features)
    }
  }

  private checkAlignment(features: FrameFeatures): boolean {
    if (!features.poseOk || !features.handOk) return false
    if (features.confidence.pose < this.config.minPoseConfidence) return false
    if (features.confidence.hand < this.config.minHandConfidence) return false
    const scx = features.shoulderCenterX
    const sw = features.shoulderWidth
    if (scx === undefined || sw === undefined) return false
    const centerOk = scx >= 0.4 && scx <= 0.6
    const widthOk = sw >= 0.2 && sw <= 0.45
    return centerOk && widthOk
  }

  private processRepState(features: FrameFeatures): void {
    const { grip, inStartZone, inEndZone, handOk } = features
    const now = Date.now()
    const cooldownPassed = now - this.lastRepTime >= this.config.repCooldownMs

    const pickupByGrip = inStartZone && grip
    const pickupByDwell = inStartZone && handOk && (this.state.startZoneDwellFrames >= ZONE_DWELL_FRAMES)

    switch (this.state.repState) {
      case 'WAIT_PICKUP':
        if (inStartZone && handOk) {
          this.state.startZoneDwellFrames++
        } else {
          this.state.startZoneDwellFrames = 0
        }
        if (pickupByGrip || pickupByDwell) {
          this.state.repState = 'CARRYING'
          this.state.startZoneDwellFrames = 0
          this.state.enteredCarryingByDwell = pickupByDwell
          this.onRepStart?.()
        }
        break
      case 'CARRYING':
        if (!grip && !this.state.enteredCarryingByDwell) {
          this.state.startZoneDwellFrames = 0
          this.state.enteredCarryingByDwell = false
          this.state.repState = 'WAIT_PICKUP'
          break
        }
        if (!inStartZone) {
          this.state.repState = 'WAIT_DROP'
        }
        break
      case 'WAIT_DROP':
        if (!grip && !this.state.enteredCarryingByDwell && !inEndZone) {
          this.state.enteredCarryingByDwell = false
          this.state.repState = 'WAIT_PICKUP'
          break
        }
        if (inEndZone && handOk) {
          this.state.endZoneDwellFrames++
        } else {
          this.state.endZoneDwellFrames = 0
        }
        if (inEndZone && (this.state.endZoneDwellFrames >= ZONE_DWELL_FRAMES || grip)) {
          this.state.repState = 'CONFIRM_RELEASE'
        }
        break
      case 'CONFIRM_RELEASE':
        if (inEndZone && handOk) {
          this.state.endZoneDwellFrames++
        } else {
          this.state.endZoneDwellFrames = 0
        }
        const releaseByGrip = !grip && inEndZone && cooldownPassed
        const releaseByDwell = this.state.endZoneDwellFrames >= ZONE_DWELL_FRAMES && cooldownPassed
        if (releaseByGrip || releaseByDwell) {
          this.state.endZoneDwellFrames = 0
          this.dispatch({ type: 'REP_COUNTED' })
        } else if (!grip && !inEndZone) {
          this.state.repState = 'WAIT_PICKUP'
        }
        break
    }
  }

  tickCountdown(): boolean {
    if (this.state.exerciseState !== 'COUNTDOWN_3_2_1') return false
    this.state.countdownRemaining--
    if (this.state.countdownRemaining <= 0) {
      this.dispatch({ type: 'COUNTDOWN_DONE' })
      return true
    }
    return false
  }
}
