import { useState, type ReactNode } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles/App.css'

// Video file is in public folder, referenced with leading slash
const guyCupsVideo = '/output.mp4'

type Timeframe = 'week' | 'month' | 'later'

type CareTask = {
  id: number
  title: string
  description?: string
  timeframe: Timeframe
  done: boolean
  assignedBy?: string
  dueDate?: string
  instructions?: string
  steps?: string[]
  duration?: string
  frequency?: string
  tips?: string[]
  exerciseVideo?: string
  exerciseContent?: {
    type: 'video' | 'image' | 'text'
    content: string
    description?: string
  }
}

// This would normally come from your backend API
// For now, we'll store it here. In production, fetch by task ID
const taskDatabase: Record<number, CareTask> = {
  1: {
    id: 1,
    title: 'Daily mobility routine',
    description: '10 minutes of guided stretching exercises',
    timeframe: 'week',
    done: false,
    assignedBy: 'Dr. Smith',
    dueDate: '2024-01-15',
    instructions:
      'This daily mobility routine is designed to improve flexibility, reduce stiffness, and enhance your range of motion. Perform these exercises in a comfortable space with enough room to move freely.',
    steps: [
      'Start with 2-3 minutes of gentle warm-up movements (arm circles, leg swings)',
      'Perform neck rotations: Slowly turn your head left and right, 5 times each direction',
      'Shoulder rolls: Roll your shoulders forward 10 times, then backward 10 times',
      'Standing side bends: Reach one arm overhead and lean to the opposite side, hold for 15 seconds, repeat on other side',
      'Hip circles: Stand with hands on hips, make slow circular motions with your hips, 10 times each direction',
      'Leg swings: Hold onto a chair for support, swing one leg forward and back 10 times, then switch legs',
      'Finish with 2 minutes of deep breathing and gentle stretching',
    ],
    duration: '10 minutes',
    frequency: 'Daily, preferably in the morning',
    tips: [
      'Move slowly and smoothly - never force a stretch',
      'Stop if you feel sharp pain (mild discomfort is normal)',
      'Breathe deeply throughout the exercises',
      'Stay hydrated before and after',
      'Track your progress in the app',
    ],
    exerciseContent: {
      type: 'video',
      content: guyCupsVideo,
      description: 'Follow along with this guided mobility routine video. Perform each movement slowly and with control.',
    },
  },
  2: {
    id: 2,
    title: 'Progress check‑in',
    description: 'Video session with your therapist',
    timeframe: 'month',
    done: false,
    assignedBy: 'Dr. Smith',
    instructions:
      'This is a scheduled video consultation with your therapist to review your progress, discuss any concerns, and adjust your treatment plan as needed.',
    steps: [
      'Prepare your device (phone, tablet, or computer) with camera and microphone enabled',
      'Find a quiet, well-lit space for the session',
      'Have your exercise log and any questions ready',
      'Join the video call 5 minutes before your scheduled time',
      'During the session, discuss your progress, pain levels, and any challenges',
      'Take notes on any new exercises or modifications recommended',
    ],
    duration: '30-45 minutes',
    frequency: 'Monthly',
    tips: [
      'Test your internet connection before the session',
      'Wear comfortable clothing that allows movement',
      'Have a water bottle nearby',
      'Write down any questions beforehand',
      'Be honest about your progress and any pain you experience',
    ],
    exerciseContent: {
      type: 'text',
      content: 'Your video consultation will be scheduled through the app. You will receive a notification with the meeting link 24 hours before your appointment.\n\nDuring the session, your therapist will:\n• Review your exercise progress\n• Assess your pain levels\n• Adjust your treatment plan\n• Answer any questions you have',
      description: 'Click the "Join Session" button when it appears in your notifications to connect with your therapist.',
    },
  },
  3: {
    id: 3,
    title: 'Long‑term strength plan',
    description: 'Build up to 3x/week strength sessions',
    timeframe: 'later',
    done: false,
    assignedBy: 'Dr. Smith',
    instructions:
      'This progressive strength training program is designed to build muscle strength, improve bone density, and enhance overall physical function. Start gradually and increase intensity over time.',
    steps: [
      'Week 1-2: Begin with 1 session per week, focusing on form and technique',
      'Week 3-4: Increase to 2 sessions per week, adding light resistance',
      'Week 5+: Progress to 3 sessions per week with gradually increasing resistance',
      'Each session should include: warm-up (5 min), strength exercises (20-30 min), cool-down (5 min)',
      'Focus on major muscle groups: legs, core, back, and arms',
      'Allow at least one day of rest between strength sessions',
    ],
    duration: '30-40 minutes per session',
    frequency: 'Progressive: 1x/week → 2x/week → 3x/week',
    tips: [
      'Start with bodyweight exercises before adding resistance',
      'Focus on proper form over heavy weights',
      'Increase intensity gradually - no more than 10% per week',
      'Listen to your body and rest when needed',
      'Track your progress and celebrate milestones',
      'Consult with your therapist before making significant changes',
    ],
    exerciseContent: {
      type: 'video',
      content: guyCupsVideo,
      description: 'Follow this progressive strength training routine. Start with the beginner level and gradually progress as you build strength.',
    },
  },
  4: {
    id: 4,
    title: 'Morning breathing exercises',
    description: '5 minutes of deep breathing',
    timeframe: 'week',
    done: true,
    assignedBy: 'Dr. Smith',
    instructions:
      'Deep breathing exercises help reduce stress, improve oxygen flow, and promote relaxation. These exercises are perfect to start your day with a calm, focused mindset.',
    steps: [
      'Find a comfortable seated or lying position',
      'Place one hand on your chest and the other on your abdomen',
      'Inhale slowly through your nose for 4 counts, feeling your abdomen rise',
      'Hold your breath for 4 counts',
      'Exhale slowly through your mouth for 6 counts, feeling your abdomen fall',
      'Repeat this cycle 10 times',
      'Finish with 3 normal breaths and notice how you feel',
    ],
    duration: '5 minutes',
    frequency: 'Daily, preferably in the morning',
    tips: [
      'Practice in a quiet space without distractions',
      'Focus on the rhythm of your breath',
      'If you feel lightheaded, slow down or take a break',
      'Make this part of your morning routine',
      'You can also use these exercises anytime you feel stressed',
    ],
    exerciseContent: {
      type: 'text',
      content: 'Follow the breathing pattern: Inhale (4 counts) → Hold (4 counts) → Exhale (6 counts). Repeat 10 cycles.',
      description: 'Use the visual guide below to time your breathing. Focus on deep, diaphragmatic breathing.',
    },
  },
}

type AccordionItem = {
  id: string
  title: string
  content: ReactNode
}

export default function ExercisePage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const { isAuthenticated, role } = useAuth()
  const [openAccordions, setOpenAccordions] = useState<Set<string>>(new Set())

  if (!isAuthenticated || role !== 'patient') {
    return <Navigate to="/login" replace />
  }

  if (!taskId) {
    return <Navigate to="/patient-care-board" replace />
  }

  const task = taskDatabase[parseInt(taskId, 10)]

  if (!task) {
    return (
      <div className="section">
        <h1>Exercise not found</h1>
        <p>The requested exercise could not be found.</p>
        <button className="primary" onClick={() => navigate('/patient-care-board')}>
          Back to Care Plan
        </button>
      </div>
    )
  }

  const toggleAccordion = (id: string) => {
    setOpenAccordions((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const accordionItems: AccordionItem[] = []

  if (task.instructions) {
    accordionItems.push({
      id: 'overview',
      title: 'Overview',
      content: <p className="exercise-instructions">{task.instructions}</p>,
    })
  }

  if (task.steps && task.steps.length > 0) {
    accordionItems.push({
      id: 'steps',
      title: 'Step-by-step instructions',
      content: (
        <ol className="exercise-steps">
          {task.steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      ),
    })
  }

  if (task.tips && task.tips.length > 0) {
    accordionItems.push({
      id: 'tips',
      title: 'Tips for success',
      content: (
        <ul className="exercise-tips">
          {task.tips.map((tip, index) => (
            <li key={index}>{tip}</li>
          ))}
        </ul>
      ),
    })
  }

  return (
    <div className="section exercise-page">
      <button className="exercise-back-button" onClick={() => navigate('/patient-care-board')}>
        ← Back to Care Plan
      </button>

      <div className="exercise-header">
        <div className="exercise-status">
          {task.done ? (
            <span className="exercise-status-badge completed">Completed</span>
          ) : (
            <span className="exercise-status-badge pending">In Progress</span>
          )}
        </div>
        <h1>{task.title}</h1>
        {task.description && <p className="exercise-subtitle">{task.description}</p>}
        <div className="exercise-meta">
          {task.assignedBy && (
            <div className="exercise-meta-item">
              <strong>Assigned by:</strong> {task.assignedBy}
            </div>
          )}
          {task.dueDate && (
            <div className="exercise-meta-item">
              <strong>Due date:</strong> {new Date(task.dueDate).toLocaleDateString()}
            </div>
          )}
          {task.duration && (
            <div className="exercise-meta-item">
              <strong>Duration:</strong> {task.duration}
            </div>
          )}
          {task.frequency && (
            <div className="exercise-meta-item">
              <strong>Frequency:</strong> {task.frequency}
            </div>
          )}
        </div>
      </div>

      <div className="exercise-layout">
        <div className="exercise-accordion-panel">
          <h2 className="exercise-accordion-title">Information</h2>
          <div className="exercise-accordions">
            {accordionItems.map((item) => {
              const isOpen = openAccordions.has(item.id)
              return (
                <div key={item.id} className="exercise-accordion">
                  <button
                    className="exercise-accordion-header"
                    onClick={() => toggleAccordion(item.id)}
                  >
                    <span>{item.title}</span>
                    <span className="exercise-accordion-icon">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && (
                    <div className="exercise-accordion-content">{item.content}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="exercise-main-panel">
          <h2 className="exercise-main-title">Exercise</h2>
          <div className="exercise-display">
            {task.exerciseContent ? (
              <>
                {task.exerciseContent.type === 'video' && (
                  <div className="exercise-video-container">
                    <video
                      src={task.exerciseContent.content}
                      controls
                      className="exercise-video"
                      preload="metadata"
                    >
                      Your browser does not support the video tag.
                    </video>
                    {task.exerciseContent.description && (
                      <p className="exercise-content-description">
                        {task.exerciseContent.description}
                      </p>
                    )}
                  </div>
                )}
                {task.exerciseContent.type === 'text' && (
                  <div className="exercise-text-content">
                    <div className="exercise-text-display">
                      {task.exerciseContent.content}
                    </div>
                    {task.exerciseContent.description && (
                      <p className="exercise-content-description">
                        {task.exerciseContent.description}
                      </p>
                    )}
                  </div>
                )}
                {task.exerciseContent.type === 'image' && (
                  <div className="exercise-image-content">
                    <img
                      src={task.exerciseContent.content}
                      alt="Exercise demonstration"
                      className="exercise-image"
                    />
                    {task.exerciseContent.description && (
                      <p className="exercise-content-description">
                        {task.exerciseContent.description}
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="exercise-placeholder">
                <p>Exercise content will be displayed here.</p>
                <p className="exercise-placeholder-subtitle">
                  Your therapist will add video, images, or interactive content for this exercise.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="exercise-actions">
        <button className="primary" onClick={() => navigate('/patient-care-board')}>
          Return to Care Plan
        </button>
      </div>
    </div>
  )
}
