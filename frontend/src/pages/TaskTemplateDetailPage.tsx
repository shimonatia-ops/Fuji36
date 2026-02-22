import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import '../styles/App.css'
import { apiClient, type TaskTemplateResponse } from '../services/api'

export default function TaskTemplateDetailPage() {
  const { templateId } = useParams<{ templateId: string }>()
  const navigate = useNavigate()
  const [template, setTemplate] = useState<TaskTemplateResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTemplate = async () => {
      if (!templateId) {
        setError('Template ID is required')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const foundTemplate = await apiClient.getTaskTemplate(templateId)
        setTemplate(foundTemplate)
        setError(null)
      } catch (err) {
        console.error('Failed to fetch task template:', err)
        setError(err instanceof Error ? err.message : 'Failed to load task template')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTemplate()
  }, [templateId])

  const getTaskTypeName = (taskType: number): string => {
    switch (taskType) {
      case 1:
        return 'Shaping Task'
      default:
        return `Task Type ${taskType}`
    }
  }

  const renderPropertyList = (items: any): string[] => {
    if (Array.isArray(items)) {
      return items.map(item => String(item))
    }
    return []
  }

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="loading-message">Loading task template...</div>
      </div>
    )
  }

  if (error || !template) {
    return (
      <div className="page-container">
        <div className="error-message" style={{ color: '#dc2626', padding: '1rem' }}>
          {error || 'Task template not found'}
        </div>
        <button onClick={() => navigate('/solutions')} className="btn-primary">
          Back to Solutions
        </button>
      </div>
    )
  }

  const properties = template.properties || {}
  const progressionParameters = renderPropertyList(properties.progressionParameters)
  const feedbackParameters = renderPropertyList(properties.feedbackParameters)
  const movementsEmphasized = renderPropertyList(properties.movementsEmphasized)
  const instructions = properties.instructions as string | undefined
  const activityDescription = properties.activityDescription as string | undefined
  const feasibilityNotes = properties.feasibilityNotes as string | undefined
  const analysisType = properties.analysisType as string | undefined
  const analysisParameters = properties.analysisParameters as Record<string, any> | undefined

  return (
    <div className="page-container">
      <div className="task-template-detail">
        <button 
          onClick={() => navigate('/solutions')} 
          className="task-template-back-btn"
          style={{ marginBottom: '1.5rem' }}
        >
          ← Back to Solutions
        </button>

        <div className="task-template-detail-header">
          <div className="task-template-detail-title-section">
            <span className="task-template-type-badge">{getTaskTypeName(template.taskType)}</span>
            <h1>{template.name}</h1>
            {template.description && (
              <p className="task-template-detail-description">{template.description}</p>
            )}
          </div>
        </div>

        <div className="task-template-detail-content">
          {/* Left Column - Information */}
          <div className="task-template-detail-info">
            {activityDescription && (
              <section className="task-template-section">
                <h2>Activity Description</h2>
                <p>{activityDescription}</p>
              </section>
            )}

            {instructions && (
              <section className="task-template-section">
                <h2>Instructions</h2>
                <p>{instructions}</p>
              </section>
            )}

            {progressionParameters.length > 0 && (
              <section className="task-template-section">
                <h2>Potential Shaping Progressions Parameters</h2>
                <ul className="task-template-list">
                  {progressionParameters.map((param, index) => (
                    <li key={index}>{param}</li>
                  ))}
                </ul>
              </section>
            )}

            {feedbackParameters.length > 0 && (
              <section className="task-template-section">
                <h2>Potential Feedback Parameters</h2>
                <ul className="task-template-list">
                  {feedbackParameters.map((param, index) => (
                    <li key={index}>{param}</li>
                  ))}
                </ul>
              </section>
            )}

            {movementsEmphasized.length > 0 && (
              <section className="task-template-section">
                <h2>Movements Emphasized</h2>
                <ul className="task-template-list">
                  {movementsEmphasized.map((movement, index) => (
                    <li key={index}>{movement}</li>
                  ))}
                </ul>
              </section>
            )}

            {feasibilityNotes && (
              <section className="task-template-section">
                <h2>Technological Feasibility</h2>
                <p>{feasibilityNotes}</p>
              </section>
            )}

            {analysisType && (
              <section className="task-template-section">
                <h2>Analysis Type</h2>
                <p><strong>{analysisType}</strong></p>
                {analysisParameters && Object.keys(analysisParameters).length > 0 && (
                  <div className="task-template-analysis-params">
                    <h3>Analysis Parameters</h3>
                    <ul className="task-template-list">
                      {Object.entries(analysisParameters).map(([key, value]) => (
                        <li key={key}>
                          <strong>{key}:</strong> {String(value)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Center Column - Video */}
          <div className="task-template-detail-video">
            <section className="task-template-video-section">
              <h2>Video Description</h2>
              <div className="task-template-video-container">
                <div className="task-template-video-placeholder">
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                  <p>Video placeholder</p>
                  <p className="task-template-video-hint">
                    Video content will be displayed here
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column - Metadata */}
          <div className="task-template-detail-meta">
            <section className="task-template-section">
              <h2>Template Information</h2>
              <dl className="task-template-meta-list">
                <dt>Template ID:</dt>
                <dd>{template.templateId}</dd>
                
                <dt>Template Name:</dt>
                <dd>{template.templateName}</dd>
                
                <dt>Status:</dt>
                <dd>{template.isActive ? 'Active' : 'Inactive'}</dd>
                
                {template.createdAt && (
                  <>
                    <dt>Created:</dt>
                    <dd>{new Date(template.createdAt).toLocaleDateString()}</dd>
                  </>
                )}
                
                {template.updatedAt && (
                  <>
                    <dt>Last Updated:</dt>
                    <dd>{new Date(template.updatedAt).toLocaleDateString()}</dd>
                  </>
                )}
              </dl>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
