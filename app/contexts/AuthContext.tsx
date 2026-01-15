'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { logger } from '@/lib/logger'
import { supabase } from '@/lib/supabase'

// Разрешенные Email адреса
// Добавьте email адреса для ограничения доступа

const ALLOWED_EMAILS: string[] = [
  // Добавьте разрешенные email адреса
  // Например: 'admin@denta-crm.com'
]

export interface User {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (user: User, authType?: 'email' | 'google' | 'yandex' | 'vk' | 'telegram') => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Проверяем сохраненную сессию при загрузке
    const checkAuth = () => {
      try {
        const savedUser = localStorage.getItem('denta_user')
        const savedTimestamp = localStorage.getItem('denta_auth_timestamp')

        if (savedUser && savedTimestamp) {
          const userData = JSON.parse(savedUser)
          const timestamp = parseInt(savedTimestamp)
          const now = Date.now()

          // Сессия действительна 7 дней
          if (now - timestamp < 7 * 24 * 60 * 60 * 1000) {
            // Для демо режима принимаем сохраненную сессию
            setUser(userData)
          } else {
            // Сессия истекла
            logout()
          }
        }
      } catch (error) {
        logger.error('Error checking auth:', error)
        logout()
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = (userData: User, authType: 'email' = 'email') => {
    // Для демо режима принимаем любого пользователя
    // В продакшене можно добавить проверки ALLOWED_EMAILS
    if (authType === 'email' && ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(userData.username || '')) {
      throw new Error('Доступ запрещен. Ваш email не в списке разрешенных.')
    }

    setUser(userData)

    // Сохраняем в localStorage с указанием типа авторизации
    localStorage.setItem('denta_user', JSON.stringify(userData))
    localStorage.setItem('denta_auth_timestamp', Date.now().toString())
    localStorage.setItem('denta_auth_type', authType)
  }

  const logout = async () => {
    setUser(null)
    localStorage.removeItem('denta_user')
    localStorage.removeItem('denta_auth_timestamp')

    // Выходим из Supabase
    await supabase.auth.signOut()
  }

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}