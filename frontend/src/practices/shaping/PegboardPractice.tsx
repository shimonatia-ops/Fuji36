import { useState, useEffect, useRef } from 'react'
import type { PracticeComponentProps, PracticeResults } from '../types'
import '../../styles/App.css'

/**
 * Pegboard Practice Component
 * Task: Lift a wooden peg and place it in a designated hole on the pegboard
 * Focus: Pincer grasp, wrist extension, elbow extension, shoulder flexion
 */
export default function PegboardPractice({ task, planId, onComplete, onProgress }: PracticeComponentProps) {
  const [isActive, setIsActive] = useState(false)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [pegsPlaced, setPegsPlaced] = useState(0)
  const [targetPegs, setTargetPegs] = useState(10)
  const [isCompleted, setIsCompleted] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Extract task properties
  const instructions = task.properties?.instructions as string || 
    'Insert pegs into the board following the displayed pattern. Work from left to right, top to bottom.'
  
  const timeLimit = task.properties?.analysisParameters?.timeLimit as number || 600 // 10 minutes default
  const pegCount = task.properties?.analysisParameters?.pegCount as number || 25

  // Timer effect
  useEffect(() => {
    if (isActive && startTime) {
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000)
        setElapsedTime(elapsed)
        
        if (onProgress) {
          const progress = Math.min(100, Math.round((pegsPlaced / targetPegs) * 100))
          onProgress(task.taskId, progress)
        }

        if (elapsed >= timeLimit) {
          handleComplete()
        }
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isActive, startTime, pegsPlaced, targetPegs, timeLimit, task.taskId, onProgress])

  const handleStart = () => {
    setIsActive(true)
    setStartTime(new Date())
    setElapsedTime(0)
    setPegsPlaced(0)
    setIsCompleted(false)
  }

  const handlePause = () => {
    setIsActive(false)
  }

  const handlePegPlaced = () => {
    if (!isActive || isCompleted) return
    
    const newCount = pegsPlaced + 1
    setPegsPlaced(newCount)

    if (newCount >= targetPegs) {
      handleComplete()
    }
  }

  const handleComplete = () => {
    setIsActive(false)
    setIsCompleted(true)
    
    if (onComplete && startTime) {
      const duration = Math.floor((Date.now() - startTime.getTime()) / 1000)
      const results: PracticeResults = {
        completed: true,
        score: Math.round((pegsPlaced / targetPegs) * 100),
        duration,
        repetitions: pegsPlaced,
        metadata: {
          targetPegs,
          timeLimit,
          practiceType: 'pegboard'
        }
      }
      onComplete(task.taskId, results)
    }
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const remainingTime = timeLimit - elapsedTime
  const progressPercentage = Math.min(100, (pegsPlaced / targetPegs) * 100)

  return (
    <div className="practice-container pegboard-practice">
      <div className="practice-header">
        <h3>{task.name}</h3>
        {task.description && (
          <p className="practice-description">{task.description}</p>
        )}
      </div>

      <div className="practice-instructions-section">
        <h4>Instructions</h4>
        <p>{instructions}</p>
      </div>

      {!isActive && !isCompleted && (
        <div className="practice-controls">
          <div className="practice-settings">
            <label>
              Target Pegs:
              <input
                type="number"
                min="1"
                max={pegCount}
                value={targetPegs}
                onChange={(e) => setTargetPegs(parseInt(e.target.value) || 10)}
                disabled={isActive}
              />
            </label>
          </div>
          <button className="practice-start-btn" onClick={handleStart}>
            Start Practice
          </button>
        </div>
      )}

      {isActive && (
        <div className="practice-active-session">
          <div className="practice-stats">
            <div className="practice-stat-item">
              <span className="stat-label">Time:</span>
              <span className="stat-value">{formatTime(elapsedTime)}</span>
            </div>
            <div className="practice-stat-item">
              <span className="stat-label">Pegs Placed:</span>
              <span className="stat-value">{pegsPlaced} / {targetPegs}</span>
            </div>
            <div className="practice-stat-item">
              <span className="stat-label">Progress:</span>
              <span className="stat-value">{Math.round(progressPercentage)}%</span>
            </div>
          </div>

          <div className="practice-progress-bar">
            <div
              className="practice-progress-fill"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          <div className="practice-area pegboard-area">
            <div className="practice-area-placeholder">
              <p>📌 Practice Area</p>
              <p>Camera/AR view will be displayed here</p>
              <p>Place pegs into the pegboard holes</p>
            </div>
            
            <button
              className="practice-action-btn"
              onClick={handlePegPlaced}
              disabled={isCompleted}
            >
              ✓ Place Peg ({pegsPlaced}/{targetPegs})
            </button>
          </div>

          <div className="practice-session-controls">
            <button className="practice-pause-btn" onClick={handlePause}>
              Pause
            </button>
            <button className="practice-complete-btn" onClick={handleComplete}>
              Complete Practice
            </button>
          </div>
        </div>
      )}

      {isCompleted && (
        <div className="practice-completed">
          <div className="practice-results">
            <h4>✓ Practice Completed!</h4>
            <div className="results-summary">
              <div className="result-item">
                <span className="result-label">Pegs Placed:</span>
                <span className="result-value">{pegsPlaced} / {targetPegs}</span>
              </div>
              <div className="result-item">
                <span className="result-label">Time Taken:</span>
                <span className="result-value">{formatTime(elapsedTime)}</span>
              </div>
              <div className="result-item">
                <span className="result-label">Score:</span>
                <span className="result-value">{Math.round((pegsPlaced / targetPegs) * 100)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
