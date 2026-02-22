import type { ReactNode } from 'react'
import { createContext, useContext, useState, useEffect } from 'react'
import { apiClient } from '../services/api'

export type UserRole = 'admin' | 'user' | 'guest' | 'patient' | 'therapist'

type AuthState = {
  isAuthenticated: boolean
  role: UserRole | null
  name: string | null
  email: string | null
  userId: string | null
  firstName: string | null
  lastName: string | null
  avatarUrl: string | null
  isLoading: boolean
}

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// Map backend roles to frontend roles
function mapRole(backendRole: string): UserRole {
  const roleMap: Record<string, UserRole> = {
    admin: 'admin',
    user: 'user',
    guest: 'guest',
    patient: 'patient',
    therapist: 'therapist',
    reviewer: 'user', // Map reviewer to user role
  }
  return roleMap[backendRole.toLowerCase()] || 'guest'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    role: null,
    name: null,
    email: null,
    userId: null,
    firstName: null,
    lastName: null,
    avatarUrl: null,
    isLoading: true,
  })

  // Check if user is already authenticated on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      refreshUser().catch(() => {
        // If refresh fails, clear token and set loading to false
        apiClient.setToken(null)
        setState((prev) => ({ ...prev, isLoading: false }))
      })
    } else {
      setState((prev) => ({ ...prev, isLoading: false }))
    }
  }, [])

  const refreshUser = async () => {
    try {
      const me = await apiClient.getMe()
      const primaryRole = me.roles.length > 0 ? mapRole(me.roles[0]) : 'guest'
      const displayName = me.firstName && me.lastName 
        ? `${me.firstName} ${me.lastName}`
        : me.firstName || me.lastName || me.email.split('@')[0]
      
      setState({
        isAuthenticated: true,
        role: primaryRole,
        name: displayName,
        email: me.email,
        userId: me.userId,
        firstName: me.firstName || null,
        lastName: me.lastName || null,
        avatarUrl: me.avatarUrl || null,
        isLoading: false,
      })
      
      // Store user ID and role in localStorage for redirect logic
      localStorage.setItem('user_id', me.userId)
      localStorage.setItem('user_role', primaryRole)
    } catch (error) {
      console.error('Failed to refresh user:', error)
      throw error
    }
  }

  const login = async (email: string, password: string) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }))
      const response = await apiClient.login({ email, password })
      apiClient.setToken(response.accessToken)
      
      // Fetch user info after login
      await refreshUser()
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }))
      throw error
    }
  }

  const logout = () => {
    apiClient.setToken(null)
    localStorage.removeItem('user_id')
    localStorage.removeItem('user_role')
    setState({
      isAuthenticated: false,
      role: null,
      name: null,
      email: null,
      userId: null,
      firstName: null,
      lastName: null,
      avatarUrl: null,
      isLoading: false,
    })
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
