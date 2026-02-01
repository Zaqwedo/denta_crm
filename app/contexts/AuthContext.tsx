'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
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
  isLocked: boolean
  isPinSetupOpen: boolean
  setIsPinSetupOpen: (isOpen: boolean) => void
  login: (user: User, authType?: 'email' | 'google' | 'yandex' | 'vk' | 'telegram') => void
  logout: () => void
  lock: () => void
  unlock: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLocked, setIsLocked] = useState(false)
  const [isPinSetupOpen, setIsPinSetupOpen] = useState(false)
  const [authType, setAuthType] = useState<'email' | 'google' | 'yandex' | 'vk' | 'telegram' | null>(null)
  const [allowedEmails, setAllowedEmails] = useState<string[]>([])

  const lock = useCallback(() => {
    setIsLocked(true)
    sessionStorage.setItem('denta_is_locked', 'true')
  }, [])

  const unlock = useCallback(() => {
    setIsLocked(false)
    sessionStorage.setItem('denta_is_locked', 'false')
    sessionStorage.setItem('denta_unlocked_in_session', 'true')
  }, [])

  const logout = useCallback(async () => {
    setUser(null)
    setAuthType(null)
    setIsLocked(false)
    localStorage.removeItem('denta_user')
    localStorage.removeItem('denta_auth_timestamp')
    localStorage.removeItem('denta_auth_type')
    localStorage.removeItem('denta_last_email')
    localStorage.removeItem('denta_has_pin')
    localStorage.removeItem('denta_pin_skipped')
    sessionStorage.removeItem('denta_is_locked')
    sessionStorage.removeItem('denta_unlocked_in_session')

    // Выходим из Supabase
    await supabase.auth.signOut()
  }, [])

  const login = useCallback((userData: User, authTypeParam?: 'email' | 'google' | 'yandex' | 'vk' | 'telegram') => {
    const finalAuthType = authTypeParam || 'email'
    const isAdmin = userData.username === 'admin' || userData.first_name === 'Admin'

    if (!isAdmin && finalAuthType === 'email' && allowedEmails.length > 0) {
      const userEmail = (userData.username || userData.email || '').toLowerCase().trim()
      const normalizedAllowedEmails = allowedEmails.map(e => e.toLowerCase().trim())
      console.log('Client-side email whitelist check (info only):', {
        userEmail,
        isInList: normalizedAllowedEmails.includes(userEmail)
      })
    }

    setUser(userData)
    setAuthType(finalAuthType)
    localStorage.setItem('denta_user', JSON.stringify(userData))
    localStorage.setItem('denta_auth_timestamp', Date.now().toString())
    localStorage.setItem('denta_auth_type', finalAuthType)
  }, [allowedEmails])

  // Загружаем белые списки для ВСЕХ провайдеров (email, google, yandex)
  useEffect(() => {
    const loadAllWhitelists = async () => {
      try {
        // Проверяем кэш в sessionStorage
        const cachedData = sessionStorage.getItem('whitelist_cache')
        const cacheTimestamp = sessionStorage.getItem('whitelist_cache_timestamp')

        if (cachedData && cacheTimestamp) {
          const age = Date.now() - parseInt(cacheTimestamp)
          // Кэш действителен 5 минут
          if (age < 5 * 60 * 1000) {
            const cached = JSON.parse(cachedData)
            console.log('Using cached whitelist:', { count: cached.length })
            setAllowedEmails(cached)
            return
          }
        }

        // Загружаем whitelist для всех провайдеров параллельно
        const [emailRes, googleRes, yandexRes] = await Promise.all([
          fetch('/api/whitelist?provider=email'),
          fetch('/api/whitelist?provider=google'),
          fetch('/api/whitelist?provider=yandex'),
        ])

        const allEmails = []

        if (emailRes.ok) {
          const data = await emailRes.json()
          allEmails.push(...(data.emails || []))
        }

        if (googleRes.ok) {
          const data = await googleRes.json()
          allEmails.push(...(data.emails || []))
        }

        if (yandexRes.ok) {
          const data = await yandexRes.json()
          allEmails.push(...(data.emails || []))
        }

        // Убираем дубликаты
        const uniqueEmails = [...new Set(allEmails)]

        console.log('Loaded whitelists from all providers:', {
          email: emailRes.ok,
          google: googleRes.ok,
          yandex: yandexRes.ok,
          total: uniqueEmails.length,
          emails: uniqueEmails
        })

        // Сохраняем в кэш
        sessionStorage.setItem('whitelist_cache', JSON.stringify(uniqueEmails))
        sessionStorage.setItem('whitelist_cache_timestamp', Date.now().toString())

        setAllowedEmails(uniqueEmails)
      } catch (error) {
        console.error('Error loading whitelists:', error)
      }
    }

    loadAllWhitelists()
  }, [])

  useEffect(() => {
    // Проверяем сохраненную сессию при загрузке
    const checkAuth = () => {
      try {
        const savedUser = localStorage.getItem('denta_user')
        const savedTimestamp = localStorage.getItem('denta_auth_timestamp')
        const savedAuthType = localStorage.getItem('denta_auth_type') as 'email' | 'google' | 'yandex' | 'vk' | 'telegram' | null

        // Проверяем, был ли экран заблокирован в этой сессии
        const sessionLocked = sessionStorage.getItem('denta_is_locked') === 'true'
        const hasPin = localStorage.getItem('denta_has_pin') === 'true'

        if (savedUser && savedTimestamp) {
          const userData = JSON.parse(savedUser)
          const timestamp = parseInt(savedTimestamp)
          const now = Date.now()

          // Сессия действительна 7 дней
          if (now - timestamp < 7 * 24 * 60 * 60 * 1000) {
            setUser(userData)
            setAuthType(savedAuthType || 'email')

            // Если есть PIN и сессия помечена как заблокированная (или это новое открытие вкладки)
            if (hasPin) {
              // Если это новое открытие вкладки (нет флага разблокировки в sessionStorage), блокируем
              const isUnlockedInSession = sessionStorage.getItem('denta_unlocked_in_session') === 'true'
              if (sessionLocked || !isUnlockedInSession) {
                setIsLocked(true)
              }
            }
          } else {
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

  // Автоблокировка при бездействии
  useEffect(() => {
    if (!user || isLocked) return

    let timeoutId: NodeJS.Timeout
    const INACTIVITY_TIME = 10 * 60 * 1000 // 10 минут

    const resetTimer = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        const hasPin = localStorage.getItem('denta_has_pin') === 'true'
        if (hasPin) {
          lock()
        }
      }, INACTIVITY_TIME)
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    events.forEach(event => document.addEventListener(event, resetTimer))

    resetTimer()

    return () => {
      clearTimeout(timeoutId)
      events.forEach(event => document.removeEventListener(event, resetTimer))
    }
  }, [user, isLocked, lock])

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    isLocked,
    isPinSetupOpen,
    setIsPinSetupOpen,
    authType,
    login,
    logout,
    lock,
    unlock
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