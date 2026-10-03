/**
 * AuthContext – manages JWT authentication state, role-based helpers,
 * and session persistence via localStorage.
 */
import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

interface UserRole {
  id: number
  name: string
  description?: string
  permissions?: Array<{ name: string; resource: string; action: string }>
}

interface User {
  id: number
  username: string
  email: string
  full_name: string
  first_name?: string
  last_name?: string
  is_active?: boolean
  roles: UserRole[]
}

interface AuthContextType {
  user: User | null
  login: (token: string, userData: User) => void
  logout: () => void
  isAuthenticated: boolean
  hasRole: (role: string) => boolean
  isAdmin: boolean
  isEngineer: boolean
  isViewer: boolean
  userRole: string
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null
    const stored = localStorage.getItem('user')
    if (!stored) return null
    try {
      return JSON.parse(stored)
    } catch {
      localStorage.removeItem('user')
      return null
    }
  })
  const navigate = useNavigate()

  const login = useCallback((token: string, userData: User) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    navigate('/', { replace: true })
  }, [navigate])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    navigate('/login', { replace: true })
  }, [navigate])

  const hasRole = useCallback(
    (role: string) => {
      if (!user) return false
      return user.roles.some((r) => r.name === role)
    },
    [user]
  )

  const isAdmin = user ? user.roles.some((r) => r.name === 'Admin') : false
  const isEngineer = user ? user.roles.some((r) => r.name === 'Engineer') : false
  const isViewer = user ? user.roles.some((r) => r.name === 'Viewer') : false
  const userRole = isAdmin ? 'Admin' : isEngineer ? 'Engineer' : 'Viewer'

  const value = useMemo<AuthContextType>(() => ({
    user,
    login,
    logout,
    isAuthenticated: !!user,
    hasRole,
    isAdmin,
    isEngineer,
    isViewer,
    userRole,
  }), [user, login, logout, hasRole, isAdmin, isEngineer, isViewer, userRole])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
