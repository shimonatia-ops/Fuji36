import { useState } from 'react'
import type { FormEventHandler } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles/App.css'

export default function LoginPage() {
  const { login, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: string } }

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    setError(null)

    try {
      await login(email, password)

      const from = location.state?.from
      let target: string

      // Navigate based on where user came from or default
      if (from && from !== '/login') {
        target = from
      } else {
        // Auto-redirect based on role
        const userRole = localStorage.getItem('user_role')
        if (userRole === 'therapist') {
          target = '/therapist-care-board'
        } else if (userRole === 'patient') {
          target = '/patient-care-board'
        } else {
          target = '/dashboard'
        }
      }

      navigate(target, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Sign in to Fuji36</h1>
        <p className="auth-subtitle">
          Enter your email and password to access your account.
        </p>
        {error && (
          <div style={{ 
            padding: '0.75rem', 
            marginBottom: '1rem', 
            background: '#fee2e2', 
            color: '#dc2626', 
            borderRadius: '0.5rem',
            fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            <span>Email</span>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </label>
          <button 
            type="submit" 
            className="primary auth-submit"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <div className="auth-roles-info">
          <h2>Demo Accounts</h2>
          <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.75rem' }}>
            For development, use these test accounts:
          </p>
          <div className="demo-accounts-list">
            <div className="demo-account-item">
              <div>
                <strong>Admin:</strong> admin@example.com / Admin123!
              </div>
            </div>
            <div className="demo-account-item">
              <div>
                <strong>Reviewer:</strong> reviewer@example.com / Reviewer123!
              </div>
            </div>
            <div className="demo-account-item">
              <div>
                <strong>User:</strong> user@example.com / User123!
              </div>
            </div>
            <div className="demo-account-item">
              <div>
                <strong>Patient:</strong> patient@example.com / Patient123!
              </div>
            </div>
            <div className="demo-account-item">
              <div>
                <strong>Therapist:</strong> therapist@example.com / Therapist123!
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
