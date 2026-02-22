import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiClient, type PlanResponse } from '../services/api'
import { getPracticeComponent } from '../practices/PracticeRegistry'
import type { PracticeComponentProps } from '../practices/types'
import '../styles/App.css'

type ViewMode = 'dashboard' | 'plan' | 'practice'

export default function PatientCareBoardPage() {
  const { isAuthenticated, role, userId } = useAuth()
  const [plans, setPlans] = useState<PlanResponse[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPlanDetailsModal, setShowPlanDetailsModal] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  useEffect(() => {
    const loadPatientPlans = async () => {
      if (!isAuthenticated || role !== 'patient' || !userId) return

      try {
        setIsLoading(true)
        setError(null)

        // Get patient by userId
        const patient = await apiClient.getPatientByUserId(userId)
        
        // Get patient's plans
        const plansData = await apiClient.getPatientPlans(patient.patientId)
        console.log('Loaded patient plans:', plansData)
        setPlans(plansData)

        // Auto-select first plan if available
        if (plansData.length > 0 && !selectedPlanId) {
          setSelectedPlanId(plansData[0].planId)
          setViewMode('plan')
          // Auto-select first task if available
          if (plansData[0].tasks.length > 0) {
            setSelectedTaskId(plansData[0].tasks[0].taskId)
          }
        }
      } catch (err) {
        console.error('Failed to load patient plans:', err)
        setError(err instanceof Error ? err.message : 'Failed to load plans')
      } finally {
        setIsLoading(false)
      }
    }

    loadPatientPlans()
  }, [isAuthenticated, role, userId])

  if (!isAuthenticated || role !== 'patient') {
    return <Navigate to="/login" replace />
  }

  const selectedPlan = plans.find(p => p.planId === selectedPlanId)

  const handlePlanSelect = (planId: string) => {
    setSelectedPlanId(planId)
    setViewMode('plan')
    // Auto-select first task of the plan
    const plan = plans.find(p => p.planId === planId)
    if (plan && plan.tasks.length > 0) {
      setSelectedTaskId(plan.tasks[0].taskId)
    } else {
      setSelectedTaskId(null)
    }
  }

  const handleDashboardClick = () => {
    setViewMode('dashboard')
    setSelectedPlanId(null)
    setSelectedTaskId(null)
  }

  const handleStartPractice = () => {
    if (selectedPlan && selectedPlan.tasks.length > 0) {
      // Ensure a task is selected
      if (!selectedTaskId && selectedPlan.tasks[0]) {
        setSelectedTaskId(selectedPlan.tasks[0].taskId)
      }
      setViewMode('practice')
    }
  }

  const handleBackToPlan = () => {
    setViewMode('plan')
  }

  // Group plans by status
  const planStatusGroups = [
    { key: 'active', title: 'Active Plans', status: 'Active' },
    { key: 'draft', title: 'Draft Plans', status: 'Draft' },
    { key: 'completed', title: 'Completed Plans', status: 'Completed' },
  ]

  const getProgressColor = (percentage: number) => {
    if (percentage >= 75) return '#10b981' // green
    if (percentage >= 50) return '#3b82f6' // blue
    if (percentage >= 25) return '#f59e0b' // yellow
    return '#ef4444' // red
  }

  return (
    <div className="patient-page">
      {/* Side Navigation */}
      <aside className="patient-side-nav">
        <div className="patient-side-nav-header">
          <h2>My Care Plans</h2>
        </div>
        <nav className="patient-side-nav-menu">
          <button
            className={`patient-nav-item ${viewMode === 'dashboard' ? 'active' : ''}`}
            onClick={handleDashboardClick}
          >
            <span className="patient-nav-icon">📊</span>
            <span>Dashboard</span>
          </button>
          <div className="patient-nav-divider"></div>
          
          {isLoading ? (
            <div className="patient-nav-empty">Loading plans...</div>
          ) : error ? (
            <div className="patient-nav-empty error-message">{error}</div>
          ) : plans.length === 0 ? (
            <div className="patient-nav-empty">No plans available</div>
          ) : (
            planStatusGroups.map((group) => {
              const groupPlans = plans.filter(p => String(p.status) === group.status)
              if (groupPlans.length === 0) return null

              return (
                <div key={group.key} className="patient-nav-section">
                  <div className="patient-nav-section-title">{group.title} ({groupPlans.length})</div>
                  {groupPlans.map((plan) => (
                    <button
                      key={plan.planId}
                      className={`patient-nav-item ${
                        viewMode === 'plan' && selectedPlanId === plan.planId ? 'active' : ''
                      }`}
                      onClick={() => handlePlanSelect(plan.planId)}
                      title={plan.planName || 'Unnamed Plan'}
                    >
                      <span className="patient-nav-text">
                        {plan.planName || 'Unnamed Plan'}
                      </span>
                      <span className="patient-nav-progress">
                        {plan.progressPercentage}%
                      </span>
                    </button>
                  ))}
                </div>
              )
            })
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="patient-main-content">
        {isLoading ? (
          <div className="patient-loading">
            <p>Loading your care plans...</p>
          </div>
        ) : error ? (
          <div className="patient-error">
            <p>{error}</p>
          </div>
        ) : viewMode === 'dashboard' ? (
          <div className="patient-dashboard">
            <h1>My Care Dashboard</h1>
            <p className="section-intro">
              Overview of all your care plans and progress.
            </p>
            <div className="patient-dashboard-stats">
              <div className="patient-stat-card">
                <div className="patient-stat-number">{plans.length}</div>
                <div className="patient-stat-label">Total Plans</div>
              </div>
              <div className="patient-stat-card">
                <div className="patient-stat-number">
                  {plans.filter(p => String(p.status) === 'Active').length}
                </div>
                <div className="patient-stat-label">Active Plans</div>
              </div>
              <div className="patient-stat-card">
                <div className="patient-stat-number">
                  {plans.reduce((sum, p) => sum + p.tasks.length, 0)}
                </div>
                <div className="patient-stat-label">Total Tasks</div>
              </div>
              <div className="patient-stat-card">
                <div className="patient-stat-number">
                  {plans.length > 0 
                    ? Math.round(plans.reduce((sum, p) => sum + p.progressPercentage, 0) / plans.length)
                    : 0}%
                </div>
                <div className="patient-stat-label">Average Progress</div>
              </div>
            </div>
          </div>
        ) : selectedPlan ? (
          viewMode === 'practice' ? (
            /* Practice Session View */
            <div className="patient-practice-section">
              {selectedTaskId ? (() => {
                const selectedTask = selectedPlan.tasks.find(t => t.taskId === selectedTaskId) || selectedPlan.tasks[0]
                const PracticeComponent = selectedTask ? getPracticeComponent(selectedTask) : null

                if (!selectedTask || !PracticeComponent) {
                  return (
                    <div className="practice-not-found">
                      <p>Practice component not found for: {selectedTask?.name || 'Unknown'}</p>
                      <button className="practice-back-btn" onClick={handleBackToPlan}>
                        ← Back to Plan
                      </button>
                    </div>
                  )
                }

                return (
                  <PracticeComponent
                    task={selectedTask}
                    planId={selectedPlan.planId}
                    onComplete={(taskId, results) => {
                      console.log('Task completed:', taskId, results)
                      // TODO: Update task status via API
                      // TODO: Save practice results
                    }}
                    onProgress={(taskId, progress) => {
                      console.log('Progress update:', taskId, progress)
                      // TODO: Update task progress via API
                    }}
                  />
                )
              })() : (
                <div className="practice-placeholder">
                  <p>No tasks available in this plan. Please contact your therapist.</p>
                  <button className="practice-back-btn" onClick={handleBackToPlan}>
                    ← Back to Plan
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Plan Details View */
            <div className="patient-plan-view">
              {/* Plan Header with Info Button */}
              <div className="patient-plan-header">
                <div className="patient-plan-header-main">
                  <div>
                    <h1>{selectedPlan.planName || 'Unnamed Plan'}</h1>
                    <p className="section-intro">
                      {selectedPlan.description || 'No description available'}
                    </p>
                  </div>
                  <div className="patient-plan-header-actions">
                    <div className="patient-plan-status-badge">
                      <span className={`plan-status status-${String(selectedPlan.status).toLowerCase()}`}>
                        {String(selectedPlan.status)}
                      </span>
                    </div>
                    <button
                      className="patient-plan-info-btn"
                      onClick={() => setShowPlanDetailsModal(true)}
                      title="View plan details"
                    >
                      <span className="patient-plan-info-icon">ℹ️</span>
                      <span>Plan Info & Tasks</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Plan Details Content */}
              <div className="patient-plan-details-content">
                <div className="patient-plan-info-card">
                  <h3>Plan Information</h3>
                  <div className="patient-plan-info-grid">
                    <div className="patient-plan-info-item">
                      <label>Progress</label>
                      <div className="patient-plan-progress-container">
                        <div className="patient-plan-progress-bar">
                          <div
                            className="patient-plan-progress-fill"
                            style={{
                              width: `${selectedPlan.progressPercentage}%`,
                              backgroundColor: getProgressColor(selectedPlan.progressPercentage),
                            }}
                          />
                        </div>
                        <span className="patient-plan-progress-text">
                          {selectedPlan.progressPercentage}%
                        </span>
                      </div>
                    </div>
                    <div className="patient-plan-info-item">
                      <label>Frequency</label>
                      <span>{String(selectedPlan.frequency)}</span>
                    </div>
                    {selectedPlan.startDate && (
                      <div className="patient-plan-info-item">
                        <label>Start Date</label>
                        <span>{new Date(selectedPlan.startDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {selectedPlan.dueDate && (
                      <div className="patient-plan-info-item">
                        <label>Due Date</label>
                        <span>{new Date(selectedPlan.dueDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedPlan.goals.length > 0 && (
                  <div className="patient-plan-info-card">
                    <h3>Goals</h3>
                    <ul className="patient-plan-goals-list">
                      {selectedPlan.goals.map((goal, idx) => (
                        <li key={idx}>{goal}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedPlan.tasks.length > 0 && (
                  <div className="patient-plan-info-card">
                    <h3>Tasks ({selectedPlan.tasks.length})</h3>
                    <div className="patient-plan-tasks-list">
                      {selectedPlan.tasks.map((task) => (
                        <div key={task.taskId} className="patient-plan-task-item">
                          <div className="patient-plan-task-header">
                            <span className="patient-plan-task-name">{task.name}</span>
                            <span className={`patient-plan-task-status status-${String(task.status).toLowerCase()}`}>
                              {task.status === 0 ? 'Not Started' : 
                               task.status === 1 ? 'In Progress' : 
                               task.status === 2 ? 'Completed' : 'Skipped'}
                            </span>
                          </div>
                          {task.description && (
                            <p className="patient-plan-task-description">{task.description}</p>
                          )}
                          {task.dueDate && (
                            <div className="patient-plan-task-due">
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Start Practice Button */}
                <div className="patient-plan-actions">
                  {selectedPlan.tasks.length > 0 && (
                    <>
                      {selectedPlan.tasks.length > 1 && (
                        <div className="practice-task-selector">
                          <label htmlFor="task-select-practice">Select Task to Practice:</label>
                          <select
                            id="task-select-practice"
                            value={selectedTaskId || selectedPlan.tasks[0].taskId}
                            onChange={(e) => setSelectedTaskId(e.target.value)}
                          >
                            {selectedPlan.tasks.map((task) => (
                              <option key={task.taskId} value={task.taskId}>
                                {task.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <button className="patient-start-practice-btn" onClick={handleStartPractice}>
                        Setup
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Plan Details Modal */}
              {showPlanDetailsModal && (
              <div className="patient-plan-modal-overlay" onClick={() => setShowPlanDetailsModal(false)}>
                <div className="patient-plan-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="patient-plan-modal-header">
                    <h2>Plan Information & Tasks</h2>
                    <button
                      className="patient-plan-modal-close"
                      onClick={() => setShowPlanDetailsModal(false)}
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                  <div className="patient-plan-modal-content">
                    <div className="patient-plan-info-card">
                      <h3>Plan Information</h3>
                      <div className="patient-plan-info-grid">
                        <div className="patient-plan-info-item">
                          <label>Progress</label>
                          <div className="patient-plan-progress-container">
                            <div className="patient-plan-progress-bar">
                              <div
                                className="patient-plan-progress-fill"
                                style={{
                                  width: `${selectedPlan.progressPercentage}%`,
                                  backgroundColor: getProgressColor(selectedPlan.progressPercentage),
                                }}
                              />
                            </div>
                            <span className="patient-plan-progress-text">
                              {selectedPlan.progressPercentage}%
                            </span>
                          </div>
                        </div>
                        <div className="patient-plan-info-item">
                          <label>Frequency</label>
                          <span>{String(selectedPlan.frequency)}</span>
                        </div>
                        {selectedPlan.startDate && (
                          <div className="patient-plan-info-item">
                            <label>Start Date</label>
                            <span>{new Date(selectedPlan.startDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        {selectedPlan.dueDate && (
                          <div className="patient-plan-info-item">
                            <label>Due Date</label>
                            <span>{new Date(selectedPlan.dueDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedPlan.goals.length > 0 && (
                      <div className="patient-plan-info-card">
                        <h3>Goals</h3>
                        <ul className="patient-plan-goals-list">
                          {selectedPlan.goals.map((goal, idx) => (
                            <li key={idx}>{goal}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedPlan.tasks.length > 0 && (
                      <div className="patient-plan-info-card">
                        <h3>Tasks ({selectedPlan.tasks.length})</h3>
                        <div className="patient-plan-tasks-list">
                          {selectedPlan.tasks.map((task) => (
                            <div key={task.taskId} className="patient-plan-task-item">
                              <div className="patient-plan-task-header">
                                <span className="patient-plan-task-name">{task.name}</span>
                                <span className={`patient-plan-task-status status-${String(task.status).toLowerCase()}`}>
                                  {task.status === 0 ? 'Not Started' : 
                                   task.status === 1 ? 'In Progress' : 
                                   task.status === 2 ? 'Completed' : 'Skipped'}
                                </span>
                              </div>
                              {task.description && (
                                <p className="patient-plan-task-description">{task.description}</p>
                              )}
                              {task.dueDate && (
                                <div className="patient-plan-task-due">
                                  Due: {new Date(task.dueDate).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            </div>
          )
        ) : (
          <div className="patient-empty-state">
            <p>No plan selected. Please select a plan from the side navigation.</p>
          </div>
        )}
      </main>
    </div>
  )
}
