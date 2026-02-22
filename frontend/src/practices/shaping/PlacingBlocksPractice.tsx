import { useState, useEffect, useRef } from 'react'
import type { PracticeComponentProps, PracticeResults } from '../types'
import '../../styles/App.css'

/**
 * Placing Blocks Onto Box Practice Component
 * Task: Place small wooden blocks from the table to the top of a box
 * Focus: Pincer grasp, wrist extension, elbow extension, shoulder flexion
 */
export default function PlacingBlocksPractice({ task, planId, onComplete, onProgress }: PracticeComponentProps) {
  const [isActive, setIsActive] = useState(false)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [blocksPlaced, setBlocksPlaced] = useState(0)
  const [targetBlocks, setTargetBlocks] = useState(6)
  const [isCompleted, setIsCompleted] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Extract task properties
  const instructions = task.properties?.instructions as string || 
    'Place small wooden blocks from the table to the top of a box. Focus on precision and steady hand movements.'
  
  const timeLimit = task.properties?.analysisParameters?.timeLimit as number || 300 // 5 minutes default

  // Timer effect
  useEffect(() => {
    if (isActive && startTime) {
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000)
        setElapsedTime(elapsed)
        
        // Update progress
        if (onProgress) {
          const progress = Math.min(100, Math.round((blocksPlaced / targetBlocks) * 100))
          onProgress(task.taskId, progress)
        }

        // Check time limit
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
  }, [isActive, startTime, blocksPlaced, targetBlocks, timeLimit, task.taskId, onProgress])

  const handleStart = () => {
    setIsActive(true)
    setStartTime(new Date())
    setElapsedTime(0)
    setBlocksPlaced(0)
    setIsCompleted(false)
  }

  const handlePause = () => {
    setIsActive(false)
  }

  const handleResume = () => {
    setIsActive(true)
    if (startTime) {
      const pausedDuration = elapsedTime
      setStartTime(new Date(Date.now() - pausedDuration * 1000))
    }
  }

  const handleBlockPlaced = () => {
    if (!isActive || isCompleted) return
    
    const newCount = blocksPlaced + 1
    setBlocksPlaced(newCount)

    if (newCount >= targetBlocks) {
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
        score: Math.round((blocksPlaced / targetBlocks) * 100),
        duration,
        repetitions: blocksPlaced,
        metadata: {
          targetBlocks,
          timeLimit,
          practiceType: 'placing_blocks'
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
  const progressPercentage = Math.min(100, (blocksPlaced / targetBlocks) * 100)

  return (
    <div className="practice-container placing-blocks-practice">
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
              Target Blocks:
              <input
                type="number"
                min="1"
                max="20"
                value={targetBlocks}
                onChange={(e) => setTargetBlocks(parseInt(e.target.value) || 6)}
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
              <span className="stat-label">Blocks Placed:</span>
              <span className="stat-value">{blocksPlaced} / {targetBlocks}</span>
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

          <div className="practice-area placing-blocks-area">
            <div className="practice-area-placeholder">
              <p>📦 Practice Area</p>
              <p>Camera/AR view will be displayed here</p>
              <p>Place blocks from table onto the box</p>
            </div>
            
            <button
              className="practice-action-btn"
              onClick={handleBlockPlaced}
              disabled={isCompleted}
            >
              ✓ Place Block ({blocksPlaced}/{targetBlocks})
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
                <span className="result-label">Blocks Placed:</span>
                <span className="result-value">{blocksPlaced} / {targetBlocks}</span>
              </div>
              <div className="result-item">
                <span className="result-label">Time Taken:</span>
                <span className="result-value">{formatTime(elapsedTime)}</span>
              </div>
              <div className="result-item">
                <span className="result-label">Score:</span>
                <span className="result-value">{Math.round((blocksPlaced / targetBlocks) * 100)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
