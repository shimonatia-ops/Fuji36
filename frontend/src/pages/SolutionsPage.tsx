import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import '../styles/App.css'
import { apiClient, type TaskTemplateResponse } from '../services/api'

type TaskTypeGroup = {
  taskType: number
  taskTypeName: string
  templates: TaskTemplateResponse[]
}

export default function SolutionsPage() {
  const [taskTypeGroups, setTaskTypeGroups] = useState<TaskTypeGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setIsLoading(true)
        const templates = await apiClient.getTaskTemplates(undefined, true) // Get all active templates
        
        // Group templates by task type
        const grouped = templates.reduce((acc, template) => {
          const taskTypeName = getTaskTypeName(template.taskType)
          let group = acc.find(g => g.taskType === template.taskType)
          
          if (!group) {
            group = {
              taskType: template.taskType,
              taskTypeName,
              templates: []
            }
            acc.push(group)
          }
          
          group.templates.push(template)
          return acc
        }, [] as TaskTypeGroup[])

        // Sort groups by task type and templates by name
        grouped.sort((a, b) => a.taskType - b.taskType)
        grouped.forEach(group => {
          group.templates.sort((a, b) => a.name.localeCompare(b.name))
        })

        setTaskTypeGroups(grouped)
        setError(null)
      } catch (err) {
        console.error('Failed to fetch task templates:', err)
        setError(err instanceof Error ? err.message : 'Failed to load task templates')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTemplates()
  }, [])

  const getTaskTypeName = (taskType: number): string => {
    switch (taskType) {
      case 1:
        return 'Shaping Tasks'
      default:
        return `Task Type ${taskType}`
    }
  }

  return (
    <div className="page-container">
      <section className="section solutions">
        <h1>Solutions</h1>
        <p className="section-intro">
          One integrated platform, four powerful programs — built to deliver better outcomes
          at scale.
        </p>
        <div className="solutions-grid">
          <article className="solution-card">
            <h3>Thrive</h3>
            <p>AI physical pain care from home for muscle and joint conditions.</p>
            <a href="#thrive">Learn more</a>
          </article>
          <article className="solution-card">
            <h3>Bloom</h3>
            <p>AI pelvic care for women at every life stage, from postpartum to menopause.</p>
            <a href="#bloom">Learn more</a>
          </article>
          <article className="solution-card">
            <h3>Move</h3>
            <p>Proactive movement health to reduce injury risk and improve resilience.</p>
            <a href="#move">Learn more</a>
          </article>
          <article className="solution-card">
            <h3>Predict</h3>
            <p>
              AI engine built to detect members at highest risk for avoidable surgery and
              intervene early.
            </p>
            <a href="#predict">Learn more</a>
          </article>
        </div>
      </section>

      {/* Task Templates Section */}
      <section className="section task-templates">
        <h2>Available Task Templates</h2>
        <p className="section-intro">
          Browse our comprehensive library of therapeutic task templates designed to support
          rehabilitation and skill development.
        </p>

        {isLoading && (
          <div className="loading-message">Loading task templates...</div>
        )}

        {error && (
          <div className="error-message" style={{ color: '#dc2626', padding: '1rem' }}>
            {error}
          </div>
        )}

        {!isLoading && !error && taskTypeGroups.length === 0 && (
          <div className="no-templates-message" style={{ padding: '1rem' }}>
            No task templates available.
          </div>
        )}

        {!isLoading && !error && taskTypeGroups.map((group) => (
          <div key={group.taskType} className="task-type-group">
            <h3 className="task-type-subtitle">{group.taskTypeName}</h3>
            <div className="task-templates-grid">
              {group.templates.map((template) => (
                <article key={template.templateId} className="task-template-card">
                  <h4>{template.name}</h4>
                  {template.description && (
                    <p className="task-template-description">{template.description}</p>
                  )}
                  {template.properties?.displayName && template.properties.displayName !== template.name && (
                    <p className="task-template-display-name">
                      <strong>Display Name:</strong> {template.properties.displayName as string}
                    </p>
                  )}
                  <Link to={`/task-template/${template.templateId}`} className="task-template-link">
                    Learn more
                  </Link>
                </article>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="section platform">
        <h2>Meet Fuji36</h2>
        <p className="section-intro">
          The first end‑to‑end care platform that combines artificial intelligence with
          clinical expertise to expand access to world‑class care.
        </p>
        <div className="platform-grid">
          <div className="platform-card">
            <h3>Fewer surgeries, faster recoveries</h3>
            <p>
              Digital physical therapy for MSK conditions that pairs AI motion intelligence
              with licensed clinicians — proven to reduce medical spend and speed recovery.
            </p>
          </div>
          <div className="platform-card">
            <h3>Close the care gap in women's health</h3>
            <p>
              Discreet, expert‑led programs for pelvic pain, bladder leaks, menopause symptoms,
              postpartum issues, and more.
            </p>
          </div>
          <div className="platform-card">
            <h3>Prevent injuries and get members moving</h3>
            <p>
              Personalized movement plans that build whole‑body strength, reduce injury risk,
              and help members stay healthier and more productive.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
