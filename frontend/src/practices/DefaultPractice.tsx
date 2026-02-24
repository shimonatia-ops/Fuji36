import { useState } from 'react'
import type { PracticeComponentProps } from './types'
import '../styles/App.css'

/**
 * Default practice component shown when no specific practice is available
 */
export default function DefaultPractice({ task, planId, onComplete, practiceMode = 'real' }: PracticeComponentProps) {
  const isDraft = practiceMode === 'draft'
  const [isStarted, setIsStarted] = useState(false)

  const handleStart = () => {
    setIsStarted(true)
  }

  const handleComplete = () => {
    if (onComplete && !isDraft) {
      onComplete(task.taskId, {
        completed: true,
        duration: 0,
        metadata: { practiceType: 'default' }
      })
    }
  }

  return (
    <div className="practice-container default-practice">
      {isDraft && (
        <div className="practice-draft-banner">
          Preview mode – try the exercise to get an impression. Results are not saved.
        </div>
      )}
      <div className="practice-header">
        <h3>{task.name}</h3>
        {task.description && <p className="practice-description">{task.description}</p>}
      </div>

      {!isStarted ? (
        <div className="practice-start-screen">
          <div className="practice-instructions">
            <h4>Instructions</h4>
            <p>This practice session is not yet implemented.</p>
            <p>Please check back later or contact your therapist for guidance.</p>
          </div>
          <button className="practice-start-btn" onClick={handleStart}>
            Start Practice
          </button>
        </div>
      ) : (
        <div className="practice-active-screen">
          <div className="practice-placeholder">
            <p>Practice session in progress...</p>
            <p>This practice component is being developed.</p>
          </div>
          <button className="practice-complete-btn" onClick={handleComplete}>
            Mark as Complete
          </button>
        </div>
      )}
    </div>
  )
}
