import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiClient, type PlanResponse } from '../services/api'
import { getPracticeComponent } from '../practices/PracticeRegistry'
import Avatar from '../components/common/Avatar'
import '../styles/App.css'

type ViewMode = 'dashboard' | 'plan' | 'practice'

const DESCRIPTION_TRUNCATE_LEN = 60

function truncateDescription(text: string, maxLen: number = DESCRIPTION_TRUNCATE_LEN): string {
  if (!text || text.length <= maxLen) return text
  return text.slice(0, maxLen).trim() + '...'
}

function getTaskMetadata(task: { properties?: Record<string, unknown> | null }): { label: string; value: string }[] {
  const props = task.properties
  const ap = props?.analysisParameters as Record<string, unknown> | undefined
  const items: { label: string; value: string }[] = []

  const goalMode = (props?.goalMode as string) ?? (ap?.goalMode as string)
  if (goalMode) {
    items.push({
      label: 'Goal Mode',
      value: goalMode === 'timeToComplete' ? 'Time to Complete' : 'Repetitions in Time'
    })
  }

  const targetCones = (props?.targetCones as number) ?? (props?.targetReps as number) ?? (ap?.targetCones as number) ?? (ap?.targetReps as number)
  if (targetCones != null && targetCones > 0) {
    items.push({ label: 'Target Reps', value: String(targetCones) })
  }

  const timeLimit = (props?.timeLimit as number) ?? (ap?.timeLimit as number)
  if (timeLimit != null && timeLimit > 0) {
    const mins = Math.round(timeLimit / 60)
    items.push({ label: 'Time Limit', value: `${mins} min` })
  }

  const preferredHand = (props?.preferredHand as string)
  if (preferredHand) {
    items.push({ label: 'Hand', value: preferredHand })
  }

  return items
}

export default function PatientCareBoardPage() {
  const { isAuthenticated, role, userId, name: patientName, firstName, lastName, email, avatarUrl } = useAuth()
  const [plans, setPlans] = useState<PlanResponse[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [editingTaskProgress, setEditingTaskProgress] = useState<Record<string, number>>({})
  const [isSideNavCollapsed, setIsSideNavCollapsed] = useState(false)

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 968) setIsSideNavCollapsed(false)
    }
    window.addEventListener('resize', onResize)
    onResize()
    return () => window.removeEventListener('resize', onResize)
  }, [])

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

  const refreshPlans = async () => {
    if (!userId) return
    try {
      const patient = await apiClient.getPatientByUserId(userId)
      const plansData = await apiClient.getPatientPlans(patient.patientId)
      setPlans(plansData)
    } catch (err) {
      console.error('Failed to refresh plans:', err)
    }
  }

  const handleUpdateTaskProgress = async (planId: string, taskId: string, progressPercentage: number, status: number) => {
    try {
      await apiClient.updateTaskStatus(planId, taskId, { status, progressPercentage })
      setEditingTaskProgress(prev => {
        const next = { ...prev }
        delete next[taskId]
        return next
      })
      await refreshPlans()
    } catch (err) {
      console.error('Failed to update task progress:', err)
      alert(err instanceof Error ? err.message : 'Failed to update task progress')
    }
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
      <aside className={`patient-side-nav ${isSideNavCollapsed ? 'patient-side-nav-collapsed' : ''}`}>
        <div className="patient-side-nav-profile">
          <div className="patient-side-nav-profile-main">
            <Avatar
              firstName={firstName}
              lastName={lastName}
              email={email}
              avatarUrl={avatarUrl}
              size="medium"
              className="patient-profile-avatar"
            />
            {!isSideNavCollapsed && (
              <div className="patient-side-nav-profile-info">
                <span className="patient-profile-role">PATIENT</span>
                <span className="patient-profile-name">{patientName || 'Patient'}</span>
              </div>
            )}
            <button
              type="button"
              className="patient-side-nav-toggle"
              onClick={() => setIsSideNavCollapsed(!isSideNavCollapsed)}
              aria-label={isSideNavCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={isSideNavCollapsed ? 'Expand' : 'Collapse'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={isSideNavCollapsed ? 'M9 18l6-6-6-6' : 'M15 18l-6-6 6-6'} />
              </svg>
            </button>
          </div>
        </div>
        <nav className="patient-side-nav-menu">
          <div className="patient-nav-section">
            {!isSideNavCollapsed && <div className="patient-nav-section-title">Main</div>}
            <div className="patient-nav-item-wrapper">
              <button
                className={`patient-nav-item ${viewMode === 'dashboard' ? 'active' : ''}`}
                onClick={handleDashboardClick}
                title="Dashboard"
              >
                <span className="patient-nav-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3v18h18" />
                    <path d="M18 17V9" />
                    <path d="M13 17V5" />
                    <path d="M8 17v-3" />
                  </svg>
                </span>
                {!isSideNavCollapsed && <span className="patient-nav-text">Dashboard</span>}
              </button>
            </div>
            <div className="patient-nav-section-title-spacer" />
            {!isSideNavCollapsed && <div className="patient-nav-section-title">Plans</div>}
            {isLoading ? (
              !isSideNavCollapsed && (
                <div className="patient-nav-empty">Loading plans...</div>
              )
            ) : error ? (
              !isSideNavCollapsed && (
                <div className="patient-nav-empty error-message">{error}</div>
              )
            ) : plans.length === 0 ? (
              !isSideNavCollapsed && (
                <div className="patient-nav-empty">No plans available</div>
              )
            ) : (
              planStatusGroups.map((group) => {
                const groupPlans = plans.filter(p => String(p.status) === group.status)
                if (groupPlans.length === 0) return null

                return (
                  <div key={group.key} className="patient-nav-section">
                    {!isSideNavCollapsed && (
                      <div className="patient-nav-section-title">{group.title} ({groupPlans.length})</div>
                    )}
                    {groupPlans.map((plan) => {
                      const isActive = viewMode === 'plan' && selectedPlanId === plan.planId
                      const displayName = plan.planName || 'Unnamed Plan'
                      return (
                        <div key={plan.planId} className="patient-nav-item-wrapper">
                          <button
                            className={`patient-nav-item patient-nav-item-plan ${isActive ? 'active' : ''}`}
                            onClick={() => handlePlanSelect(plan.planId)}
                            title={`${displayName} (${plan.progressPercentage}%)`}
                          >
                            <span className="patient-nav-icon">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                              </svg>
                            </span>
                            {!isSideNavCollapsed && (
                              <>
                                <span className="patient-nav-text">{displayName}</span>
                                <span className="patient-nav-progress">{plan.progressPercentage}%</span>
                              </>
                            )}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )
              })
            )}
          </div>
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
              {selectedPlan.tasks.length === 0 ? (
                <div className="practice-placeholder">
                  <p>No tasks available in this plan. Please contact your therapist.</p>
                  <button className="practice-back-btn" onClick={handleBackToPlan}>
                    ← Back to Plan
                  </button>
                </div>
              ) : (() => {
                const effectiveTaskId = selectedTaskId || selectedPlan.tasks[0]?.taskId
                const selectedTask = selectedPlan.tasks.find(t => t.taskId === effectiveTaskId) || selectedPlan.tasks[0]
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

                const planStatus = String(selectedPlan.status)
                const isDraftPlan = planStatus === 'Draft'
                const practiceMode = isDraftPlan ? 'draft' : 'real'

                return (
                  <PracticeComponent
                    task={selectedTask}
                    planId={selectedPlan.planId}
                    planName={selectedPlan.planName}
                    taskName={selectedTask.name}
                    practiceMode={practiceMode}
                    onBackToPlan={handleBackToPlan}
                    onComplete={practiceMode === 'real' ? async (taskId, results) => {
                      try {
                        await apiClient.updateTaskStatus(selectedPlan.planId, taskId, {
                          status: 2, // Completed
                          progressPercentage: 100
                        })
                        await refreshPlans()
                      } catch (err) {
                        console.error('Failed to save practice results:', err)
                      }
                    } : undefined}
                    onProgress={practiceMode === 'real' ? async (taskId, progress) => {
                      try {
                        const task = selectedPlan.tasks.find(t => t.taskId === taskId)
                        if (task) {
                          await apiClient.updateTaskStatus(selectedPlan.planId, taskId, {
                            status: progress >= 100 ? 2 : 1, // Completed or InProgress
                            progressPercentage: Math.round(progress)
                          })
                          await refreshPlans()
                        }
                      } catch (err) {
                        console.error('Failed to update progress:', err)
                      }
                    } : undefined}
                  />
                )
              })()}
            </div>
          ) : (
            /* Plan Details View */
            <div className="patient-plan-view">
              {/* Plan Header: title, subtitle, status, task selector & Go to Practice */}
              <div className="patient-plan-header">
                <div className="patient-plan-header-main">
                  <div className="patient-plan-header-left">
                    <h1>{selectedPlan.planName || 'Unnamed Plan'}</h1>
                    <p className="patient-plan-subtitle">
                      {selectedPlan.description || 'No description available'}
                    </p>
                  </div>
                  <div className="patient-plan-header-right">
                    <div className="patient-plan-status-badge">
                      <span className={`plan-status status-${String(selectedPlan.status).toLowerCase()}`}>
                        {String(selectedPlan.status)}
                      </span>
                    </div>
                    {String(selectedPlan.status) !== 'Completed' && selectedPlan.tasks.length > 0 && (
                      <div className="patient-plan-practice-cta">
                        {selectedPlan.tasks.length > 1 && (
                          <select
                            id="task-select-practice"
                            className="patient-task-select"
                            value={selectedTaskId || selectedPlan.tasks[0].taskId}
                            onChange={(e) => setSelectedTaskId(e.target.value)}
                          >
                            {selectedPlan.tasks.map((task) => (
                              <option key={task.taskId} value={task.taskId}>
                                {task.name}
                              </option>
                            ))}
                          </select>
                        )}
                        <button
                          className="patient-goto-practice-btn"
                          onClick={handleStartPractice}
                        >
                          {String(selectedPlan.status) === 'Draft' ? 'Try in Arena' : 'Go to Practice'}
                        </button>
                      </div>
                    )}
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
                              {(task.status === 0 || task.status === '0' || task.status === 'NotStarted') ? 'Not Started' :
                               (task.status === 1 || task.status === '1' || task.status === 'InProgress') ? 'In Progress' :
                               (task.status === 2 || task.status === '2' || task.status === 'Completed') ? 'Completed' : 'Skipped'}
                            </span>
                          </div>
                          {task.description && (
                            <p
                              className={`patient-plan-task-description ${task.description.length > DESCRIPTION_TRUNCATE_LEN ? 'patient-plan-task-description-truncated' : ''}`}
                              title={task.description.length > DESCRIPTION_TRUNCATE_LEN ? task.description : undefined}
                            >
                              {truncateDescription(task.description)}
                            </p>
                          )}
                          {(() => {
                            const meta = getTaskMetadata(task)
                            if (meta.length === 0) return null
                            return (
                              <div className="patient-plan-task-meta">
                                {meta.map(({ label, value }) => (
                                  <span key={label} className="patient-plan-task-meta-item">
                                    <span className="patient-plan-task-meta-label">{label}:</span> {value}
                                  </span>
                                ))}
                              </div>
                            )
                          })()}
                          <div className="patient-plan-task-progress-row">
                            <label>Progress</label>
                            <div className="patient-plan-task-progress-control">
                              <input
                                type="range"
                                min={0}
                                max={100}
                                value={editingTaskProgress[task.taskId] ?? task.progressPercentage ?? 0}
                                onChange={String(selectedPlan.status) === 'Completed' ? undefined : (e) => setEditingTaskProgress(prev => ({ ...prev, [task.taskId]: parseInt(e.target.value, 10) }))}
                                onMouseUp={String(selectedPlan.status) === 'Completed' ? undefined : (e) => {
                                  const pct = parseInt((e.target as HTMLInputElement).value, 10)
                                  handleUpdateTaskProgress(selectedPlan.planId, task.taskId, pct, task.status as number)
                                }}
                                onTouchEnd={String(selectedPlan.status) === 'Completed' ? undefined : (e) => {
                                  const pct = parseInt((e.target as HTMLInputElement).value, 10)
                                  handleUpdateTaskProgress(selectedPlan.planId, task.taskId, pct, task.status as number)
                                }}
                                disabled={String(selectedPlan.status) === 'Completed'}
                              />
                              <span className="patient-plan-task-progress-value">{editingTaskProgress[task.taskId] ?? task.progressPercentage ?? 0}%</span>
                            </div>
                          </div>
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
