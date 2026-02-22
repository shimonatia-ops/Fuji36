import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import '../styles/App.css'
import { useAuth } from '../context/AuthContext'

export default function RoleDashboardPage() {
  const { isAuthenticated, role, name, isLoading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="section role-dashboard">
        <p>Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated || !role) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return (
    <div className="section role-dashboard">
      <h1>Welcome, {name}</h1>
      <p className="section-intro">
        You are signed in as <strong>{role}</strong>. This page represents what a future
        dashboard could look like for this role once it is backed by your C# .NET Core
        services.
      </p>
      <div className="role-panels">
        {role === 'admin' && (
          <div className="role-panel">
            <h2>Admin console</h2>
            <p>Manage tenants, programs, and clinical teams.</p>
          </div>
        )}
        {role === 'user' && (
          <div className="role-panel">
            <h2>User overview</h2>
            <p>View your active programs, progress, and recommendations.</p>
          </div>
        )}
        {role === 'guest' && (
          <div className="role-panel">
            <h2>Guest preview</h2>
            <p>Explore a limited set of content and example journeys.</p>
          </div>
        )}
        {role === 'patient' && (
          <div className="role-panel">
            <h2>Patient workspace</h2>
            <p>Access your exercise plans, appointments, and clinician messages.</p>
            <button
              className="btn-primary"
              onClick={() => navigate('/patient-care-board')}
              style={{ marginTop: '1rem' }}
            >
              View My Care Plan
            </button>
          </div>
        )}
        {role === 'therapist' && (
          <div className="role-panel">
            <h2>Therapist workspace</h2>
            <p>Monitor patient progress and adjust treatment plans.</p>
            <button
              className="btn-primary"
              onClick={() => navigate('/therapist-care-board')}
              style={{ marginTop: '1rem' }}
            >
              Manage Patient Plans
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
