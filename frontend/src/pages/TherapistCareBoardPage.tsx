import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiClient, type PatientResponse, type PlanResponse, type TherapistResponse, type TaskTemplateResponse, taskTypeToString, planFrequencyToString } from '../services/api'
import Avatar from '../components/common/Avatar'
import '../styles/App.css'

type ViewMode = 'dashboard' | 'patient'

export default function TherapistCareBoardPage() {
  const { isAuthenticated, role, userId } = useAuth()
  const [, setTherapist] = useState<TherapistResponse | null>(null)
  const [patients, setPatients] = useState<PatientResponse[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [plans, setPlans] = useState<PlanResponse[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      if (!isAuthenticated || role !== 'therapist' || !userId) return

      try {
        setIsLoading(true)
        setError(null)

        // Get therapist info
        try {
          const therapistData = await apiClient.getTherapistByUserId(userId)
          setTherapist(therapistData)

          // Get therapist's patients
          const patientsData = await apiClient.getTherapistPatients(therapistData.therapistId)
          console.log('Received patients data:', patientsData)
          console.log('First patient sample:', patientsData[0])
          setPatients(patientsData)

          // Auto-select first patient if available
          if (patientsData.length > 0 && !selectedPatientId) {
            setSelectedPatientId(patientsData[0].patientId)
            setViewMode('patient')
          }
        } catch (therapistErr) {
          // Therapist might not exist yet - that's okay, just show empty state
          console.warn('Therapist not found:', therapistErr)
          setPatients([])
        }

      } catch (err) {
        console.error('Failed to load therapist data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [isAuthenticated, role, userId])

  useEffect(() => {
    const loadPatientPlans = async () => {
      if (!selectedPatientId) {
        console.log('No selectedPatientId, clearing plans')
        setPlans([])
        return
      }

      try {
        console.log('Loading plans for patient:', selectedPatientId)
        const plansData = await apiClient.getPatientPlans(selectedPatientId)
        console.log('Received plans data:', plansData)
        console.log('Plans count:', plansData.length)
        console.log('Plans with status breakdown:', {
          active: plansData.filter(p => String(p.status) === 'Active' || p.status === 1).length,
          draft: plansData.filter(p => String(p.status) === 'Draft' || p.status === 0).length,
          completed: plansData.filter(p => String(p.status) === 'Completed' || p.status === 2).length,
          other: plansData.filter(p => {
            const status = String(p.status)
            return status !== 'Active' && status !== 'Draft' && status !== 'Completed' && 
                   p.status !== 1 && p.status !== 0 && p.status !== 2
          }).length
        })
        plansData.forEach((plan, idx) => {
          console.log(`Plan ${idx + 1}:`, {
            planId: plan.planId,
            planName: plan.planName,
            status: plan.status,
            statusType: typeof plan.status
          })
        })
        setPlans(plansData)
      } catch (err) {
        console.error('Failed to load patient plans:', err)
        setError(err instanceof Error ? err.message : 'Failed to load plans')
        setPlans([])
      }
    }

    loadPatientPlans()
  }, [selectedPatientId])

  if (!isAuthenticated || role !== 'therapist') {
    return <Navigate to="/login" replace />
  }

  const selectedPatient = patients.find(p => p.patientId === selectedPatientId)

  const handlePatientSelect = (patientId: string) => {
    setSelectedPatientId(patientId)
    setViewMode('patient')
  }

  const handleDashboardClick = () => {
    setViewMode('dashboard')
    setSelectedPatientId(null)
  }

  return (
    <div className="therapist-page">
      {/* Side Navigation */}
      <aside className="therapist-side-nav">
        <div className="therapist-side-nav-header">
          <h2>Therapist Workspace</h2>
        </div>
        <nav className="therapist-side-nav-menu">
          <button
            className={`therapist-nav-item ${viewMode === 'dashboard' ? 'active' : ''}`}
            onClick={handleDashboardClick}
          >
            <span className="therapist-nav-icon">📊</span>
            <span>Manage All My Patients</span>
          </button>
          <div className="therapist-nav-divider"></div>
          <div className="therapist-nav-section">
            <div className="therapist-nav-section-title">Patients</div>
            {patients.length === 0 ? (
              <div className="therapist-nav-empty">No patients assigned</div>
            ) : (
              patients.map((patient) => {
                // Debug: Log patient data
                if (!patient.firstName && !patient.lastName) {
                  console.log('Patient missing name data:', patient)
                }
                
                const displayName = [patient.firstName, patient.lastName]
                  .filter(Boolean)
                  .join(' ') || (patient.userExternalId || patient.userId)
                
                // Show: FirstName LastName (userExternalId) or just userExternalId/userId if no name
                const userIdToShow = patient.userExternalId || patient.userId
                const fullDisplay = displayName !== userIdToShow 
                  ? `${displayName} (${userIdToShow})`
                  : userIdToShow
                
                return (
                  <button
                    key={patient.patientId}
                    className={`therapist-nav-item ${
                      viewMode === 'patient' && selectedPatientId === patient.patientId ? 'active' : ''
                    }`}
                    onClick={() => handlePatientSelect(patient.patientId)}
                    title={`Patient ID: ${patient.patientId}, User ID: ${patient.userId}, External ID: ${patient.userExternalId || 'N/A'}`}
                  >
                    <Avatar
                      firstName={patient.firstName}
                      lastName={patient.lastName}
                      email={patient.userExternalId || patient.userId}
                      avatarUrl={patient.avatarUrl}
                      size="small"
                      className="therapist-nav-avatar"
                    />
                    <span className="therapist-nav-text">{fullDisplay}</span>
                  </button>
                )
              })
            )}
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="therapist-main-content">
        {isLoading ? (
          <div className="therapist-loading">
            <p>Loading...</p>
          </div>
        ) : error ? (
          <div className="therapist-error">
            <p>{error}</p>
          </div>
        ) : viewMode === 'dashboard' ? (
          <div className="therapist-dashboard">
            <h1>Manage All My Patients</h1>
            <p className="section-intro">
              Overview of all your patients. This dashboard will show aggregated statistics and quick actions.
            </p>
            <div className="therapist-dashboard-stats">
              <div className="therapist-stat-card">
                <div className="therapist-stat-number">{patients.length}</div>
                <div className="therapist-stat-label">Total Patients</div>
              </div>
              <div className="therapist-stat-card">
                <div className="therapist-stat-number">
                  {plans.reduce((sum, p) => sum + p.tasks.length, 0)}
                </div>
                <div className="therapist-stat-label">Total Tasks</div>
              </div>
            </div>
          </div>
        ) : selectedPatient ? (
          <PatientKanbanBoard
            patient={selectedPatient}
            plans={plans}
            onPlansUpdate={() => {
              // Reload plans when updated
              if (selectedPatientId) {
                apiClient.getPatientPlans(selectedPatientId).then(setPlans).catch(console.error)
              }
            }}
          />
        ) : null}
      </main>
    </div>
  )
}

type PatientKanbanBoardProps = {
  patient: PatientResponse
  plans: PlanResponse[]
  onPlansUpdate: () => void
}

function PatientKanbanBoard({ patient, plans, onPlansUpdate }: PatientKanbanBoardProps) {
  const [showCreatePlan, setShowCreatePlan] = useState(false)
  const [newPlanName, setNewPlanName] = useState('')
  const [newPlanDescription, setNewPlanDescription] = useState('')
  const [newPlanFrequency, setNewPlanFrequency] = useState<number>(1) // Daily
  const [newPlanGoals, setNewPlanGoals] = useState<string[]>([''])
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplateResponse[]>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const [newPlanTasks, setNewPlanTasks] = useState<Array<{
    templateId: string | null
    taskType: number
    name: string
    description: string
    dueDate: string | null
    properties: Record<string, any> | null
  }>>([{
    templateId: null,
    taskType: 1, // ShapingTask
    name: '',
    description: '',
    dueDate: null,
    properties: null
  }])
  const [isCreating, setIsCreating] = useState(false)
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set())

  // Load task templates when form is shown
  useEffect(() => {
    const loadTemplates = async () => {
      if (showCreatePlan && taskTemplates.length === 0) {
        try {
          setIsLoadingTemplates(true)
          const templates = await apiClient.getTaskTemplates(1, true) // Get active ShapingTask templates
          setTaskTemplates(templates)
        } catch (err) {
          console.error('Failed to load task templates:', err)
        } finally {
          setIsLoadingTemplates(false)
        }
      }
    }

    loadTemplates()
  }, [showCreatePlan, taskTemplates.length])

  // Group plans by status for kanban columns
  // Note: Backend returns status as string enum values ("Active", "Draft", "Completed")
  const planColumns = [
    { key: 'active', title: 'Active Plans', status: 'Active' }, // PlanStatus.Active
    { key: 'draft', title: 'Draft Plans', status: 'Draft' }, // PlanStatus.Draft
    { key: 'completed', title: 'Completed Plans', status: 'Completed' }, // PlanStatus.Completed
  ]

  const handleAddGoal = () => {
    setNewPlanGoals([...newPlanGoals, ''])
  }

  const handleGoalChange = (index: number, value: string) => {
    const updated = [...newPlanGoals]
    updated[index] = value
    setNewPlanGoals(updated)
  }

  const handleRemoveGoal = (index: number) => {
    setNewPlanGoals(newPlanGoals.filter((_, i) => i !== index))
  }

  const handleAddTask = () => {
    setNewPlanTasks([...newPlanTasks, {
      templateId: null,
      taskType: 1, // ShapingTask
      name: '',
      description: '',
      dueDate: null,
      properties: null
    }])
  }

  const handleRemoveTask = (index: number) => {
    if (newPlanTasks.length > 1) {
      setNewPlanTasks(newPlanTasks.filter((_, i) => i !== index))
    }
  }

  const handleTaskTemplateSelect = (index: number, templateId: string) => {
    const template = taskTemplates.find(t => t.templateId === templateId)
    if (!template) return

    const updated = [...newPlanTasks]
    updated[index] = {
      templateId: template.templateId,
      taskType: template.taskType,
      name: template.name,
      description: template.description || '',
      dueDate: null,
      properties: template.properties ? { ...template.properties } : null
    }
    setNewPlanTasks(updated)
  }

  const handleTaskChange = (index: number, field: string, value: any) => {
    const updated = [...newPlanTasks]
    updated[index] = { ...updated[index], [field]: value }
    setNewPlanTasks(updated)
  }

  const handleTaskPropertyChange = (index: number, propertyKey: string, value: any) => {
    const updated = [...newPlanTasks]
    if (!updated[index].properties) {
      updated[index].properties = {}
    }
    updated[index].properties = {
      ...updated[index].properties,
      [propertyKey]: value
    }
    setNewPlanTasks(updated)
  }

  const handleCreatePlan = async () => {
    if (!newPlanName.trim()) {
      alert('Plan name is required')
      return
    }

    // Validate tasks
    const validTasks = newPlanTasks.filter(t => t.templateId && t.name.trim())
    if (validTasks.length === 0) {
      alert('At least one task template must be selected')
      return
    }

    try {
      setIsCreating(true)
      
      const frequencyStr = planFrequencyToString(newPlanFrequency)
      const requestPayload = {
        patientId: patient.patientId,
        planName: newPlanName.trim(),
        frequency: frequencyStr, // Convert number to enum string name
        goals: newPlanGoals.filter(g => g.trim()).map(g => g.trim()),
        startDate: new Date().toISOString(),
        dueDate: null,
        description: newPlanDescription.trim() || null,
        tasks: validTasks.map(t => ({
          taskType: taskTypeToString(t.taskType), // Convert number to enum string name
          name: t.name.trim(),
          description: t.description.trim() || null,
          dueDate: t.dueDate || null,
          properties: t.properties
        }))
      }
      
      console.log('Creating plan with payload:', JSON.stringify(requestPayload, null, 2))
      console.log('Frequency value:', frequencyStr, 'Type:', typeof frequencyStr)
      
      await apiClient.createPlan(requestPayload)

      // Reset form
      setNewPlanName('')
      setNewPlanDescription('')
      setNewPlanFrequency(1)
      setNewPlanGoals([''])
      setNewPlanTasks([{
        templateId: null,
        taskType: 1,
        name: '',
        description: '',
        dueDate: null,
        properties: null
      }])
      setShowCreatePlan(false)

      // Reload plans
      onPlansUpdate()
    } catch (err) {
      console.error('Failed to create plan:', err)
      alert(err instanceof Error ? err.message : 'Failed to create plan')
    } finally {
      setIsCreating(false)
    }
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 75) return '#10b981' // green
    if (percentage >= 50) return '#3b82f6' // blue
    if (percentage >= 25) return '#f59e0b' // yellow
    return '#ef4444' // red
  }

  const togglePlanExpanded = (planId: string) => {
    setExpandedPlans(prev => {
      const newSet = new Set(prev)
      if (newSet.has(planId)) {
        newSet.delete(planId)
      } else {
        newSet.add(planId)
      }
      return newSet
    })
  }

  const getTaskStatusName = (status: number): string => {
    switch (status) {
      case 0: return 'Not Started'
      case 1: return 'In Progress'
      case 2: return 'Completed'
      case 3: return 'Skipped'
      default: return 'Unknown'
    }
  }

  const getTaskStatusColor = (status: number): string => {
    switch (status) {
      case 0: return '#94a3b8' // gray - not started
      case 1: return '#3b82f6' // blue - in progress
      case 2: return '#10b981' // green - completed
      case 3: return '#f59e0b' // amber - skipped
      default: return '#64748b'
    }
  }

  return (
    <div className="patient-kanban-board">
      <div className="kanban-header">
        <div>
          <h1>
            Patient: {[patient.firstName, patient.lastName].filter(Boolean).join(' ') || (patient.userExternalId || patient.userId)}
            {(patient.firstName || patient.lastName) && (
              <span className="patient-user-id"> ({patient.userExternalId || patient.userId})</span>
            )}
          </h1>
          <p className="section-intro">
            Manage plans and tasks for this patient. Drag and drop plans between columns to update status.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreatePlan(!showCreatePlan)}>
          {showCreatePlan ? 'Cancel' : '+ Create New Plan'}
        </button>
      </div>

      {showCreatePlan && (
        <div className="create-plan-form">
          <h3>Create New Plan</h3>
          <div className="form-group">
            <label>Plan Name *</label>
            <input
              type="text"
              value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
              placeholder="e.g., Upper Body Rehabilitation"
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={newPlanDescription}
              onChange={(e) => setNewPlanDescription(e.target.value)}
              placeholder="Plan description..."
              rows={3}
            />
          </div>
          <div className="form-group">
            <label>Frequency</label>
            <select
              value={newPlanFrequency}
              onChange={(e) => setNewPlanFrequency(Number(e.target.value))}
            >
              <option value={1}>Daily</option>
              <option value={2}>Weekly</option>
              <option value={3}>Monthly</option>
              <option value={4}>Continuous</option>
            </select>
          </div>
          <div className="form-group">
            <label>Goals</label>
            {newPlanGoals.map((goal, index) => (
              <div key={index} className="goal-input-group">
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => handleGoalChange(index, e.target.value)}
                  placeholder={`Goal ${index + 1}`}
                />
                {newPlanGoals.length > 1 && (
                  <button
                    type="button"
                    className="remove-goal-btn"
                    onClick={() => handleRemoveGoal(index)}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="add-goal-btn" onClick={handleAddGoal}>
              + Add Goal
            </button>
          </div>

          <div className="form-group">
            <label>Tasks *</label>
            <p className="form-hint">Select task templates from the dropdown. At least one task is required.</p>
            {isLoadingTemplates && (
              <p className="form-hint" style={{ color: '#64748b' }}>Loading task templates...</p>
            )}
            {newPlanTasks.map((task, index) => (
              <div key={index} className="task-input-group">
                <div className="task-input-header">
                  <h4>Task {index + 1}</h4>
                  {newPlanTasks.length > 1 && (
                    <button
                      type="button"
                      className="remove-task-btn"
                      onClick={() => handleRemoveTask(index)}
                    >
                      Remove Task
                    </button>
                  )}
                </div>
                <div className="task-input-fields">
                  <div className="form-group-inline">
                    <label>Select Task Template *</label>
                    <select
                      value={task.templateId || ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleTaskTemplateSelect(index, e.target.value)
                        } else {
                          handleTaskChange(index, 'templateId', null)
                          handleTaskChange(index, 'name', '')
                          handleTaskChange(index, 'description', '')
                          handleTaskChange(index, 'properties', null)
                        }
                      }}
                    >
                      <option value="">-- Select a task template --</option>
                      {taskTemplates.map((template) => (
                        <option key={template.templateId} value={template.templateId}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {task.templateId && (
                    <>
                      <div className="form-group-inline">
                        <label>Task Name *</label>
                        <input
                          type="text"
                          value={task.name}
                          onChange={(e) => handleTaskChange(index, 'name', e.target.value)}
                          placeholder="Task name"
                        />
                      </div>
                      <div className="form-group-inline">
                        <label>Description</label>
                        <textarea
                          value={task.description || ''}
                          onChange={(e) => handleTaskChange(index, 'description', e.target.value)}
                          placeholder="Task description (editable)"
                          rows={3}
                        />
                      </div>
                      <div className="form-group-inline">
                        <label>Due Date (optional)</label>
                        <input
                          type="date"
                          value={task.dueDate ? task.dueDate.split('T')[0] : ''}
                          onChange={(e) => {
                            const dateValue = e.target.value
                            handleTaskChange(index, 'dueDate', dateValue ? new Date(dateValue).toISOString() : null)
                          }}
                        />
                      </div>

                      {/* Editable Properties */}
                      {task.properties && Object.keys(task.properties).length > 0 && (
                        <div className="task-properties-section">
                          <label className="task-properties-label">Task Parameters (Editable)</label>
                          {Object.entries(task.properties).map(([key, value]) => {
                            // Skip complex nested objects for now, focus on simple properties
                            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                              return null
                            }
                            
                            return (
                              <div key={key} className="task-property-input">
                                <label className="task-property-key">
                                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                                </label>
                                {Array.isArray(value) ? (
                                  <div className="task-property-array">
                                    {value.map((item: any, idx: number) => (
                                      <div key={idx} className="task-property-array-item">
                                        <input
                                          type="text"
                                          value={typeof item === 'string' ? item : JSON.stringify(item)}
                                          onChange={(e) => {
                                            const newArray = [...(value as any[])]
                                            newArray[idx] = e.target.value
                                            handleTaskPropertyChange(index, key, newArray)
                                          }}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                ) : typeof value === 'boolean' ? (
                                  <select
                                    value={value ? 'true' : 'false'}
                                    onChange={(e) => handleTaskPropertyChange(index, key, e.target.value === 'true')}
                                  >
                                    <option value="true">Yes</option>
                                    <option value="false">No</option>
                                  </select>
                                ) : typeof value === 'number' ? (
                                  <input
                                    type="number"
                                    value={value}
                                    onChange={(e) => handleTaskPropertyChange(index, key, Number(e.target.value))}
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    value={value as string}
                                    onChange={(e) => handleTaskPropertyChange(index, key, e.target.value)}
                                  />
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
            <button type="button" className="add-task-btn" onClick={handleAddTask}>
              + Add Task
            </button>
          </div>

          <button
            className="btn-primary"
            onClick={handleCreatePlan}
            disabled={isCreating || !newPlanName.trim()}
          >
            {isCreating ? 'Creating...' : 'Create Plan'}
          </button>
        </div>
      )}

      {/* Kanban Board */}
      <div className="kanban-board">
        {planColumns.map((column) => {
          // Backend returns status as string enum values, so compare as strings
          const columnPlans = plans.filter((p) => {
            // Convert status to string for comparison (handles both string and number)
            const planStatus = String(p.status)
            const columnStatus = String(column.status)
            return planStatus === columnStatus
          })
          
          return (
            <div key={column.key} className="kanban-column">
              <div className="kanban-column-header">
                <h2>{column.title}</h2>
                <span className="kanban-column-count">{columnPlans.length}</span>
              </div>
              <div className="kanban-column-content">
                {columnPlans.length === 0 ? (
                  <div className="kanban-empty-state">No plans in this status</div>
                ) : (
                  columnPlans.map((plan) => (
                    <div key={plan.planId} className="kanban-card">
                      <div className="kanban-card-header">
                        <h3>{plan.planName || 'Unnamed Plan'}</h3>
                        <span className={`kanban-card-status status-${String(plan.status).toLowerCase()}`}>
                          {String(plan.status)}
                        </span>
                      </div>
                      {plan.description && (
                        <p className="kanban-card-description">{plan.description}</p>
                      )}
                      <div className="kanban-card-progress">
                        <div className="kanban-card-progress-bar">
                          <div
                            className="kanban-card-progress-fill"
                            style={{
                              width: `${plan.progressPercentage}%`,
                              backgroundColor: getProgressColor(plan.progressPercentage),
                            }}
                          />
                        </div>
                        <span className="kanban-card-progress-text">
                          {plan.progressPercentage}%
                        </span>
                      </div>
                      {plan.goals.length > 0 && (
                        <div className="kanban-card-goals">
                          <strong>Goals:</strong>
                          <ul>
                            {plan.goals.map((goal, idx) => (
                              <li key={idx}>{goal}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="kanban-card-meta">
                        <div className="kanban-card-tasks">
                          <span>📋 {plan.tasks.length} tasks</span>
                        </div>
                        {plan.dueDate && (
                          <div className="kanban-card-due">
                            <span>📅 Due: {new Date(plan.dueDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Task List - Expandable */}
                      {plan.tasks.length > 0 && (
                        <div className="kanban-card-tasks-section">
                          <button
                            className="kanban-card-toggle-tasks"
                            onClick={() => togglePlanExpanded(plan.planId)}
                          >
                            <span>{expandedPlans.has(plan.planId) ? '▼' : '▶'}</span>
                            <span>Tasks ({plan.tasks.length})</span>
                          </button>
                          {expandedPlans.has(plan.planId) && (
                            <div className="kanban-card-task-list">
                              {plan.tasks.map((task) => (
                                <div key={task.taskId} className="kanban-task-item">
                                  <div className="kanban-task-header">
                                    <span className="kanban-task-name">{task.name}</span>
                                    <span 
                                      className="kanban-task-status"
                                      style={{ 
                                        backgroundColor: getTaskStatusColor(task.status) + '20',
                                        color: getTaskStatusColor(task.status)
                                      }}
                                    >
                                      {getTaskStatusName(task.status)}
                                    </span>
                                  </div>
                                  {task.description && (
                                    <p className="kanban-task-description">{task.description}</p>
                                  )}
                                  {task.dueDate && (
                                    <div className="kanban-task-due">
                                      Due: {new Date(task.dueDate).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="kanban-card-footer">
                        <button
                          className="kanban-card-action-btn"
                          onClick={() => {
                            // TODO: Navigate to plan detail or edit
                            console.log('View plan:', plan.planId)
                          }}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
