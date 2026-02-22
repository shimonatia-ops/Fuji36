/**
 * MetricsCollector - Stores timestamps, reps, per-rep kinematics, summary stats
 */
import type {
  PerRepMetrics,
  SessionSummary,
  HandToUse,
  ExerciseMode,
  FrameFeatures
} from './conesTypes'

export class MetricsCollector {
  private exerciseId: string
  private handToUse: HandToUse
  private mode: ExerciseMode
  private durationSec: number
  private targetReps: number
  private startTime: number = 0
  private repCount = 0
  private reps: PerRepMetrics[] = []
  private currentRepStart: number = 0
  private angleSamples: Array<{
    elbow: number
    shoulderFlexion: number
    shoulderAbduction: number
  }> = []
  private timeToTargetRepsSec: number | undefined

  constructor(
    exerciseId: string,
    handToUse: HandToUse,
    mode: ExerciseMode,
    durationSec: number,
    targetReps: number
  ) {
    this.exerciseId = exerciseId
    this.handToUse = handToUse
    this.mode = mode
    this.durationSec = durationSec
    this.targetReps = targetReps
  }

  start(): void {
    this.startTime = Date.now()
    this.repCount = 0
    this.reps = []
    this.angleSamples = []
    this.timeToTargetRepsSec = undefined
  }

  recordRepStart(): void {
    this.currentRepStart = Date.now()
    this.angleSamples = []
  }

  addAngleSample(features: FrameFeatures): void {
    if (Date.now() - this.currentRepStart > 50) {
      this.angleSamples.push({
        elbow: features.angles.elbowAngleDeg,
        shoulderFlexion: features.angles.shoulderFlexionDeg,
        shoulderAbduction: features.angles.shoulderAbductionDeg
      })
    }
  }

  recordRepComplete(): void {
    const now = Date.now()
    const durationMs = now - this.currentRepStart

    const maxElbow = this.angleSamples.length
      ? Math.max(...this.angleSamples.map((s) => s.elbow))
      : 0
    const avgElbow = this.angleSamples.length
      ? this.angleSamples.reduce((a, s) => a + s.elbow, 0) / this.angleSamples.length
      : 0
    const maxShoulderFlexion = this.angleSamples.length
      ? Math.max(...this.angleSamples.map((s) => s.shoulderFlexion))
      : 0
    const maxShoulderAbduction = this.angleSamples.length
      ? Math.max(...this.angleSamples.map((s) => s.shoulderAbduction))
      : 0

    this.reps.push({
      repIndex: this.repCount,
      pickupTime: this.currentRepStart,
      releaseTime: now,
      durationMs,
      maxElbowExtension: maxElbow,
      avgElbowExtension: avgElbow,
      maxShoulderFlexion,
      maxShoulderAbduction
    })
    this.repCount++

    if (this.mode === 'TargetReps' && this.repCount >= this.targetReps && !this.timeToTargetRepsSec) {
      this.timeToTargetRepsSec = (now - this.startTime) / 1000
    }
  }

  getRepCount(): number {
    return this.repCount
  }

  getElapsedSec(): number {
    return (Date.now() - this.startTime) / 1000
  }

  getSummary(): SessionSummary {
    const elapsed = (Date.now() - this.startTime) / 1000
    const repDurations = this.reps.map((r) => r.durationMs / 1000)
    const avgRepTime = repDurations.length
      ? repDurations.reduce((a, b) => a + b, 0) / repDurations.length
      : 0
    const minRepTime = repDurations.length ? Math.min(...repDurations) : 0
    const maxRepTime = repDurations.length ? Math.max(...repDurations) : 0
    const repsPerMinute = elapsed > 0 ? (this.repCount / elapsed) * 60 : 0

    const shoulderFlexion = this.reps.length
      ? {
          max: Math.max(...this.reps.map((r) => r.maxShoulderFlexion)),
          avg: this.reps.reduce((a, r) => a + r.maxShoulderFlexion, 0) / this.reps.length
        }
      : { max: 0, avg: 0 }
    const shoulderAbduction = this.reps.length
      ? {
          max: Math.max(...this.reps.map((r) => r.maxShoulderAbduction)),
          avg: this.reps.reduce((a, r) => a + r.maxShoulderAbduction, 0) / this.reps.length
        }
      : { max: 0, avg: 0 }
    const elbowExtension = this.reps.length
      ? {
          max: Math.max(...this.reps.map((r) => r.maxElbowExtension)),
          avg: this.reps.reduce((a, r) => a + r.avgElbowExtension, 0) / this.reps.length
        }
      : { max: 0, avg: 0 }

    return {
      exerciseId: this.exerciseId,
      handToUse: this.handToUse,
      durationSec: elapsed,
      repCount: this.repCount,
      repsPerMinute,
      avgRepTimeSec: avgRepTime,
      minRepTimeSec: minRepTime,
      maxRepTimeSec: maxRepTime,
      timeToTargetRepsSec: this.timeToTargetRepsSec,
      rangeOfMotion: {
        shoulderFlexion,
        shoulderAbduction,
        elbowExtension
      }
    }
  }
}
