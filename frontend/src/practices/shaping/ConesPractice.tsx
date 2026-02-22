/**
 * Cones Practice - Physical-therapy exercise
 * Guides patient to transfer cones from Start Zone to End Zone using selected hand.
 * Tracks: Repetitions, Time, Movement quality (elbow, shoulder, wrist proxies)
 *
 * Architecture:
 * - CameraView + CanvasOverlay (ConesCameraView)
 * - MediaPipePipeline (Pose + Hands)
 * - ExerciseStateMachine
 * - MetricsCollector
 * - UI Coach / Prompt System
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import type { PracticeComponentProps, PracticeResults } from '../types'
import type {
  ExerciseConfig,
  ExerciseState,
  NormalizedRect
} from './conesTypes'
import { ExerciseStateMachine } from './ExerciseStateMachine'
import { MetricsCollector } from './MetricsCollector'
import ConesCameraView, { toNormalizedRect, type DetectionArea } from './ConesCameraView'
import '../../styles/App.css'

const DEFAULT_CONFIG = {
  minPoseConfidence: 0.5,
  minHandConfidence: 0.5,
  repCooldownMs: 500,
  holdGripThreshold: 0.12,
  releaseGripThreshold: 0.18
} as const

function getAlignmentPrompt(
  features: { poseOk?: boolean; handOk?: boolean; shoulderCenterX?: number; shoulderWidth?: number } | null,
  handToUse: string
): string {
  if (!features) return 'Position yourself in frame. Ensure shoulders and hands are visible.'
  if (!features.poseOk) return 'Step into frame. Keep your upper body visible.'
  if (!features.handOk) return `Show your ${handToUse} hand to the camera.`
  const scx = features.shoulderCenterX
  const sw = features.shoulderWidth
  if (scx !== undefined) {
    if (scx < 0.4) return 'Move slightly right.'
    if (scx > 0.6) return 'Move slightly left.'
  }
  if (sw !== undefined) {
    if (sw > 0.45) return 'Please step back.'
    if (sw < 0.2) return 'Please step closer.'
  }
  return 'Alignment OK. Proceed.'
}

function getCoachPrompt(
  state: ExerciseState,
  features: { poseOk?: boolean; handOk?: boolean; shoulderCenterX?: number; shoulderWidth?: number } | null,
  handToUse: string,
  countdownRemaining?: number,
  alignmentOk?: boolean
): string {
  switch (state) {
    case 'SETUP_ALIGNMENT':
      return alignmentOk ? 'Alignment OK. Proceed.' : getAlignmentPrompt(features, handToUse)
    case 'SETUP_ZONES':
      return 'Drag the zones to fit your setup, or use Skip for default zones.'
    case 'READY_GATE':
      return `Hold the first cone with your ${handToUse} hand. Press Ready when set.`
    case 'COUNTDOWN_3_2_1':
      return countdownRemaining !== undefined && countdownRemaining > 0
        ? `${countdownRemaining}...`
        : 'Go!'
    case 'ACTIVE':
      return 'Place cone in target zone. Good job!'
    case 'PAUSED':
      return 'Paused. Press Resume to continue.'
    case 'COMPLETED':
      return 'Exercise complete!'
    default:
      return ''
  }
}

export default function ConesPractice({ task, onComplete, onProgress }: PracticeComponentProps) {
  const [exerciseState, setExerciseState] = useState<ExerciseState>('SETUP_ALIGNMENT')
  const [alignmentOkFrames, setAlignmentOkFrames] = useState(0)
  const [, setRepState] = useState<string>('WAIT_PICKUP')
  const [repCount, setRepCount] = useState(0)
  const [countdownRemaining, setCountdownRemaining] = useState(5)
  const [startZone, setStartZone] = useState<NormalizedRect | null>(null)
  const [endZone, setEndZone] = useState<NormalizedRect | null>(null)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [lastFeatures, setLastFeatures] = useState<any>(null)
  const [showDebug, setShowDebug] = useState(true)

  const timeLimit = (task.properties?.analysisParameters?.timeLimit as number) || 300
  const targetCones = (task.properties?.targetCones as number) || (task.properties?.targetReps as number) || 10
  const preferredHand = ((task.properties?.preferredHand as string) || 'Right').toLowerCase()
  const handToUse = (preferredHand === 'left' ? 'Left' : 'Right') as 'Left' | 'Right'
  const mode: 'Timed' | 'TargetReps' = targetCones > 0 ? 'TargetReps' : 'Timed'

  const config: ExerciseConfig = {
    handToUse,
    mode,
    durationSec: timeLimit,
    targetReps: targetCones || 10,
    startZone: startZone || { x1: 0.1, y1: 0.55, x2: 0.35, y2: 0.9 },
    endZone: endZone || { x1: 0.6, y1: 0.55, x2: 0.9, y2: 0.9 },
    minPoseConfidence: DEFAULT_CONFIG.minPoseConfidence,
    minHandConfidence: DEFAULT_CONFIG.minHandConfidence,
    repCooldownMs: DEFAULT_CONFIG.repCooldownMs,
    holdGripThreshold: DEFAULT_CONFIG.holdGripThreshold,
    releaseGripThreshold: DEFAULT_CONFIG.releaseGripThreshold
  }

  const stateMachineRef = useRef<ExerciseStateMachine | null>(null)
  const metricsRef = useRef<MetricsCollector | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const exerciseStateRef = useRef(exerciseState)

  useEffect(() => {
    stateMachineRef.current = new ExerciseStateMachine(config)
    metricsRef.current = new MetricsCollector(
      task.taskId,
      handToUse,
      mode,
      timeLimit,
      targetCones || 10
    )

    stateMachineRef.current.setOnStateChange((s) => {
      setExerciseState(s)
      if (s === 'COUNTDOWN_3_2_1') {
        setCountdownRemaining(5)
        if (countdownRef.current) clearInterval(countdownRef.current)
        countdownRef.current = setInterval(() => {
          setCountdownRemaining((c) => {
            if (c <= 1) {
              if (countdownRef.current) {
                clearInterval(countdownRef.current)
                countdownRef.current = null
              }
              stateMachineRef.current?.dispatch({ type: 'COUNTDOWN_DONE' })
              return 0
            }
            stateMachineRef.current?.tickCountdown()
            return c - 1
          })
        }, 1000)
      }
      if (s === 'ACTIVE') {
        metricsRef.current?.start()
        timerRef.current = setInterval(() => {
          setElapsedSec((e) => e + 1)
        }, 1000)
      }
      if (s === 'COMPLETED') {
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
      }
    })

    stateMachineRef.current.setOnRepStart(() => {
      metricsRef.current?.recordRepStart()
    })

    stateMachineRef.current.setOnRepCounted(() => {
      metricsRef.current?.recordRepComplete()
      setRepCount((c) => c + 1)
      if (onProgress) {
        const pct = mode === 'TargetReps'
          ? Math.min(100, (repCount + 1) / (targetCones || 10) * 100)
          : Math.min(100, (elapsedSec / timeLimit) * 100)
        onProgress(task.taskId, pct)
      }
    })

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [task.taskId])

  const handleFrame = useCallback(
    (features: any) => {
      setLastFeatures(features)
      const sm = stateMachineRef.current
      if (sm) {
        sm.dispatch({ type: 'FRAME', features })
        const s = sm.getState()
        setRepState(s.repState)
        setRepCount(s.repCount)
        setAlignmentOkFrames(s.alignmentOkFrames)
        setCountdownRemaining(s.countdownRemaining)

        if (s.exerciseState === 'ACTIVE') {
          if (s.repState === 'CARRYING' || s.repState === 'WAIT_DROP') {
            metricsRef.current?.addAngleSample(features)
          }
        }
      }
    },
    []
  )

  const handleSetupComplete = useCallback((start: DetectionArea, stop: DetectionArea) => {
    if (zonesDragTimerRef.current) {
      clearTimeout(zonesDragTimerRef.current)
      zonesDragTimerRef.current = null
    }
    setStartZone(toNormalizedRect(start))
    setEndZone(toNormalizedRect(stop))
    stateMachineRef.current?.dispatch({ type: 'ZONES_CONFIRMED' })
  }, [])

  const zonesDragTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const zonesEnteredAtRef = useRef<number>(0)

  exerciseStateRef.current = exerciseState

  const handleZoneChange = useCallback((newStart: NormalizedRect, newEnd: NormalizedRect) => {
    setStartZone(newStart)
    setEndZone(newEnd)
    if (zonesDragTimerRef.current) clearTimeout(zonesDragTimerRef.current)
    zonesDragTimerRef.current = setTimeout(() => {
      zonesDragTimerRef.current = null
      if (exerciseStateRef.current !== 'SETUP_ZONES') return
      handleSetupComplete(
        { x: newStart.x1, y: newStart.y1, width: newStart.x2 - newStart.x1, height: newStart.y2 - newStart.y1 },
        { x: newEnd.x1, y: newEnd.y1, width: newEnd.x2 - newEnd.x1, height: newEnd.y2 - newEnd.y1 }
      )
    }, 2000)
  }, [])

  const handlePause = useCallback(() => {
    stateMachineRef.current?.dispatch({ type: 'PAUSE' })
  }, [])

  const handleResume = useCallback(() => {
    stateMachineRef.current?.dispatch({ type: 'RESUME' })
  }, [])

  const handleStop = useCallback(() => {
    stateMachineRef.current?.dispatch({ type: 'USER_STOP' })
    const summary = metricsRef.current?.getSummary()
    if (onComplete && summary) {
      const results: PracticeResults = {
        completed: true,
        score: mode === 'TargetReps'
          ? Math.round((repCount / (targetCones || 10)) * 100)
          : Math.round((elapsedSec / timeLimit) * 100),
        duration: Math.round(summary.durationSec),
        repetitions: repCount,
        metadata: { sessionSummary: summary, practiceType: 'cones' }
      }
      onComplete(task.taskId, results)
    }
  }, [onComplete, task.taskId, repCount, elapsedSec, mode, targetCones, timeLimit])

  useEffect(() => {
    if (exerciseState === 'SETUP_ZONES') {
      zonesEnteredAtRef.current = Date.now()
      const fallback = setTimeout(() => {
        if (zonesDragTimerRef.current) return
        if (exerciseStateRef.current !== 'SETUP_ZONES') return
        const defaultStart: DetectionArea = { x: 0.1, y: 0.55, width: 0.25, height: 0.35 }
        const defaultStop: DetectionArea = { x: 0.6, y: 0.55, width: 0.3, height: 0.35 }
        handleSetupComplete(defaultStart, defaultStop)
      }, 5000)
      return () => clearTimeout(fallback)
    }
  }, [exerciseState])

  useEffect(() => {
    if (exerciseState === 'ACTIVE') {
      if (mode === 'Timed' && elapsedSec >= timeLimit) {
        stateMachineRef.current?.dispatch({ type: 'TIME_UP' })
      }
    }
  }, [exerciseState, elapsedSec, timeLimit, mode])

  useEffect(() => {
    if (exerciseState === 'COMPLETED') {
      const summary = metricsRef.current?.getSummary()
      if (onComplete && summary) {
        const results: PracticeResults = {
          completed: true,
          score: mode === 'TargetReps'
            ? Math.round((repCount / (targetCones || 10)) * 100)
            : Math.round((elapsedSec / timeLimit) * 100),
          duration: Math.round(summary.durationSec),
          repetitions: repCount,
          metadata: { sessionSummary: summary, practiceType: 'cones' }
        }
        onComplete(task.taskId, results)
      }
    }
  }, [exerciseState, onComplete, task.taskId, repCount, elapsedSec, mode, targetCones, timeLimit])

  const prompt = getCoachPrompt(
    exerciseState,
    lastFeatures,
    handToUse,
    countdownRemaining,
    alignmentOkFrames >= 30
  )

  const movementsEmphasized = (task.properties?.movementsEmphasized as string[]) || []

  const formatTime = (sec: number) =>
    `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`

  return (
    <div className="practice-session-layout">
      {/* Left - GOAL */}
      <div className="practice-side-panel practice-goal-panel">
        <div className="practice-panel-title">GOAL</div>
        <div className="practice-goal-content">
          <div className="practice-goal-item">
            <div className="practice-goal-label">Target</div>
            <div className="practice-goal-value">
              {mode === 'TargetReps' ? `${targetCones} Cones` : formatTime(timeLimit)}
            </div>
          </div>
          <div className="practice-goal-item">
            <div className="practice-goal-label">Hand</div>
            <div className="practice-goal-value">{handToUse}</div>
          </div>
          {movementsEmphasized.length > 0 && (
            <div className="practice-goal-item">
              <div className="practice-goal-label">Focus</div>
              <div className="practice-goal-list">
                {movementsEmphasized.map((m, i) => (
                  <div key={i} className="practice-goal-movement">
                    {m}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center - Practice Area */}
      <div className="practice-center-area">
        {(exerciseState === 'SETUP_ALIGNMENT' || exerciseState === 'SETUP_ZONES' || exerciseState === 'COUNTDOWN_3_2_1' || exerciseState === 'ACTIVE' || exerciseState === 'PAUSED') && (
          <div className={`setup-zones-container ${exerciseState === 'ACTIVE' ? 'practice-active-area' : ''}`}>
            {(exerciseState === 'COUNTDOWN_3_2_1') && (
              <div className="cones-countdown-overlay">
                <div className="cones-countdown-number">
                  {countdownRemaining > 0 ? countdownRemaining : 'Go!'}
                </div>
              </div>
            )}
            <ConesCameraView
              handToUse={handToUse}
              startZone={startZone}
              endZone={endZone}
              onFrame={handleFrame}
              isActive={true}
              prompt={prompt}
              showDebug={showDebug}
              zonesEditable={exerciseState === 'SETUP_ZONES'}
              onZoneChange={handleZoneChange}
              deferInit={false}
              pipelineMode={exerciseState === 'SETUP_ALIGNMENT' ? 'alignment' : 'exercise'}
            />
            {exerciseState === 'SETUP_ALIGNMENT' && (
              <div className="setup-alignment-actions">
                {alignmentOkFrames >= 30 ? (
                  <>
                    <p className="setup-alignment-ok">Alignment OK. Proceeding to zone setup...</p>
                    <button
                      className="practice-start-exercise-btn practice-proceed-btn practice-debug-btn"
                      onClick={() => stateMachineRef.current?.dispatch({ type: 'ALIGNMENT_OK' })}
                      title="Manual advance for debug"
                    >
                      Proceed (debug)
                    </button>
                  </>
                ) : (
                  <p className="setup-alignment-hint">
                    Position yourself so shoulders and hands are visible. Hold steady for alignment.
                  </p>
                )}
              </div>
            )}
            {exerciseState === 'SETUP_ZONES' && (
              <div className="setup-zones-actions">
                <button
                  className="practice-skip-zones-btn"
                  onClick={() => {
                    const defaultStart: DetectionArea = { x: 0.1, y: 0.55, width: 0.25, height: 0.35 }
                    const defaultStop: DetectionArea = { x: 0.6, y: 0.55, width: 0.3, height: 0.35 }
                    handleSetupComplete(defaultStart, defaultStop)
                  }}
                >
                  Skip Zone Setup – Use Default Zones
                </button>
                <button
                  className="practice-start-exercise-btn practice-debug-btn"
                  onClick={() => {
                    const s = startZone ?? { x1: 0.1, y1: 0.55, x2: 0.35, y2: 0.9 }
                    const e = endZone ?? { x1: 0.6, y1: 0.55, x2: 0.9, y2: 0.9 }
                    handleSetupComplete(
                      { x: s.x1, y: s.y1, width: s.x2 - s.x1, height: s.y2 - s.y1 },
                      { x: e.x1, y: e.y1, width: e.x2 - e.x1, height: e.y2 - e.y1 }
                    )
                  }}
                  title="Manual advance for debug"
                >
                  Proceed (debug)
                </button>
              </div>
            )}
            {(exerciseState === 'ACTIVE' || exerciseState === 'PAUSED') && (
              <>
                <div className="practice-session-controls">
                  <button className="practice-pause-btn" onClick={handlePause} disabled={exerciseState === 'PAUSED'}>
                    Pause
                  </button>
                  <button className="practice-complete-btn" onClick={handleStop}>
                    Complete
                  </button>
                </div>
                {exerciseState === 'PAUSED' && (
                  <div className="cones-paused-overlay">
                    <p>{prompt}</p>
                    <button className="practice-start-exercise-btn" onClick={handleResume}>
                      Resume
                    </button>
                  </div>
                )}
                <button
                  className="cones-debug-toggle"
                  onClick={() => setShowDebug((d) => !d)}
                >
                  {showDebug ? 'Hide Debug' : 'Debug'}
                </button>
              </>
            )}
          </div>
        )}

        {exerciseState === 'COMPLETED' && (
          <div className="practice-completed-screen">
            <div className="practice-completed-icon">✓</div>
            <div className="practice-completed-title">Exercise Completed!</div>
            <div className="practice-completed-stats">
              <div className="practice-completed-stat">
                <span className="stat-label">Cones:</span>
                <span className="stat-value">
                  {repCount} / {targetCones}
                </span>
              </div>
              <div className="practice-completed-stat">
                <span className="stat-label">Time:</span>
                <span className="stat-value">{formatTime(elapsedSec)}</span>
              </div>
              <div className="practice-completed-stat">
                <span className="stat-label">Score:</span>
                <span className="stat-value">
                  {Math.round(
                    (mode === 'TargetReps'
                      ? (repCount / (targetCones || 10)) * 100
                      : (elapsedSec / timeLimit) * 100
                    )
                  )}
                  %
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right - PROGRESS */}
      <div className="practice-side-panel practice-progress-panel">
        <div className="practice-panel-title">PROGRESS</div>
        <div className="practice-progress-content">
          <div className="practice-progress-item">
            <div className="practice-progress-label">Reps</div>
            <div className="practice-progress-value">
              {repCount} / {targetCones}
            </div>
          </div>
          <div className="practice-progress-item">
            <div className="practice-progress-label">Progress</div>
            <div className="practice-progress-percentage">
              {Math.round(
                (mode === 'TargetReps'
                  ? (repCount / (targetCones || 10)) * 100
                  : (elapsedSec / timeLimit) * 100)
              )}
              %
            </div>
            <div className="practice-progress-bar-mini">
              <div
                className="practice-progress-bar-fill"
                style={{
                  width: `${Math.min(
                    100,
                    mode === 'TargetReps'
                      ? (repCount / (targetCones || 10)) * 100
                      : (elapsedSec / timeLimit) * 100
                  )}%`
                }}
              />
            </div>
          </div>
          {(exerciseState === 'ACTIVE' || exerciseState === 'PAUSED') && (
            <>
              <div className="practice-progress-item">
                <div className="practice-progress-label">Elapsed</div>
                <div className="practice-progress-value">{formatTime(elapsedSec)}</div>
              </div>
              <div className="practice-progress-item">
                <div className="practice-progress-label">Remaining</div>
                <div className="practice-progress-value">
                  {formatTime(Math.max(0, timeLimit - elapsedSec))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
