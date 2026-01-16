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
  email?: string
  photo_url?: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  authType: 'email' | 'google' | 'yandex' | 'vk' | 'telegram' | null
  login: (user: User, authType?: 'email' | 'google' | 'yandex' | 'vk' | 'telegram') => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authType, setAuthType] = useState<'email' | 'google' | 'yandex' | 'vk' | 'telegram' | null>(null)
  const [allowedEmails, setAllowedEmails] = useState<string[]>([])

  // Загружаем белый список для email авторизации
  useEffect(() => {
    const loadEmailWhitelist = async () => {
      try {
        const response = await fetch('/api/whitelist?provider=email')
        if (response.ok) {
          const data = await response.json()
          const emails = data.emails || []
          console.log('Loaded email whitelist:', emails)
          setAllowedEmails(emails)
        } else {
          console.error('Failed to load email whitelist:', response.status, response.statusText)
        }
      } catch (error) {
        console.error('Error loading email whitelist:', error)
      }
    }

    loadEmailWhitelist()
  }, [])

  useEffect(() => {
    // Проверяем сохраненную сессию при загрузке
    const checkAuth = () => {
      try {
        const savedUser = localStorage.getItem('denta_user')
        const savedTimestamp = localStorage.getItem('denta_auth_timestamp')
        const savedAuthType = localStorage.getItem('denta_auth_type') as 'email' | 'google' | 'yandex' | 'vk' | 'telegram' | null

        if (savedUser && savedTimestamp) {
          const userData = JSON.parse(savedUser)
          const timestamp = parseInt(savedTimestamp)
          const now = Date.now()

          // Сессия действительна 7 дней
          if (now - timestamp < 7 * 24 * 60 * 60 * 1000) {
            // Для демо режима принимаем сохраненную сессию
            setUser(userData)
            setAuthType(savedAuthType || 'email')
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

  const login = (userData: User, authTypeParam?: 'email' | 'google' | 'yandex' | 'vk' | 'telegram') => {
    const finalAuthType = authTypeParam || 'email'
    
    // Проверяем, является ли пользователь админом (по username или first_name)
    const isAdmin = userData.username === 'admin' || userData.first_name === 'Admin'
    
    // Проверка whitelist теперь выполняется на сервере в /api/auth/email-login
    // Здесь оставляем только логирование для отладки
    if (!isAdmin && finalAuthType === 'email' && allowedEmails.length > 0) {
      const userEmail = (userData.username || userData.email || '').toLowerCase().trim()
      const normalizedAllowedEmails = allowedEmails.map(e => e.toLowerCase().trim())
      
      console.log('Client-side email whitelist check (info only):', {
        userEmail,
        allowedEmails: normalizedAllowedEmails,
        isInList: normalizedAllowedEmails.includes(userEmail),
        allowedEmailsCount: normalizedAllowedEmails.length
      })
      
      // Не блокируем на клиенте - проверка уже выполнена на сервере
      // Но логируем для отладки
    }

    setUser(userData)
    setAuthType(finalAuthType)

    // Сохраняем в localStorage с указанием типа авторизации
    localStorage.setItem('denta_user', JSON.stringify(userData))
    localStorage.setItem('denta_auth_timestamp', Date.now().toString())
    localStorage.setItem('denta_auth_type', finalAuthType)
  }

  const logout = async () => {
    setUser(null)
    setAuthType(null)
    localStorage.removeItem('denta_user')
    localStorage.removeItem('denta_auth_timestamp')
    localStorage.removeItem('denta_auth_type')

    // Выходим из Supabase
    await supabase.auth.signOut()
  }

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    authType,
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