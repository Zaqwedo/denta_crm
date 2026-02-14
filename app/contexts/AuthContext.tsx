'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { isBiometricsAvailable } from '@/lib/biometrics'

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
  isBiometricSupported: boolean
  isBiometricEnabled: boolean
  setIsBiometricEnabled: (enabled: boolean) => void
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
  const [isBiometricSupported, setIsBiometricSupported] = useState(false)
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false)
  const [authType, setAuthType] = useState<'email' | 'google' | 'yandex' | 'vk' | 'telegram' | null>(null)
  const [, setAllowedEmails] = useState<string[]>([])

  // Проверяем поддержку биометрии при загрузке
  useEffect(() => {
    const checkSupport = async () => {
      try {
        const supported = await isBiometricsAvailable()
        const isSecure = window.isSecureContext

        console.log(`🛡️ Biometric Support: ${supported ? 'YES' : 'NO'} | Secure Context: ${isSecure ? 'YES' : 'NO'}`)
        console.log('📍 Origin:', window.location.origin)

        setIsBiometricSupported(supported && isSecure)
        setIsBiometricEnabled(localStorage.getItem('denta_biometrics_enabled') === 'true')
      } catch (err) {
        console.error('❌ Biometric check failed:', err)
      }
    }
    checkSupport()
  }, [])

  const handleSetBiometricEnabled = useCallback((enabled: boolean) => {
    setIsBiometricEnabled(enabled)
    localStorage.setItem('denta_biometrics_enabled', enabled ? 'true' : 'false')
  }, [])

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

    await supabase.auth.signOut()
  }, [])

  const login = useCallback((userData: User, authTypeParam?: 'email' | 'google' | 'yandex' | 'vk' | 'telegram') => {
    const finalAuthType = authTypeParam || 'email'
    setUser(userData)
    setAuthType(finalAuthType)
    localStorage.setItem('denta_user', JSON.stringify(userData))
    localStorage.setItem('denta_auth_timestamp', Date.now().toString())
    localStorage.setItem('denta_auth_type', finalAuthType)
  }, [])

  // Загружаем белые списки
  useEffect(() => {
    const loadAllWhitelists = async () => {
      try {
        const [emailRes, googleRes, yandexRes] = await Promise.all([
          fetch('/api/whitelist?provider=email'),
          fetch('/api/whitelist?provider=google'),
          fetch('/api/whitelist?provider=yandex'),
        ])
        const allEmails = []
        if (emailRes.ok) { allEmails.push(...((await emailRes.json()).emails || [])) }
        if (googleRes.ok) { allEmails.push(...((await googleRes.json()).emails || [])) }
        if (yandexRes.ok) { allEmails.push(...((await yandexRes.json()).emails || [])) }
        setAllowedEmails([...new Set(allEmails)])
      } catch (error) {
        console.error('Error loading whitelists:', error)
      }
    }
    loadAllWhitelists()
  }, [])

  useEffect(() => {
    const savedUser = localStorage.getItem('denta_user')
    const savedTimestamp = localStorage.getItem('denta_auth_timestamp')
    const savedAuthType = localStorage.getItem('denta_auth_type')
    const sessionLocked = sessionStorage.getItem('denta_is_locked') === 'true'
    const hasPin = localStorage.getItem('denta_has_pin') === 'true'

    if (savedUser && savedTimestamp) {
      const userData = JSON.parse(savedUser)
      const timestamp = parseInt(savedTimestamp)
      if (Date.now() - timestamp < 7 * 24 * 60 * 60 * 1000) {
        setUser(userData)
        const resolvedAuthType = savedAuthType === 'google' || savedAuthType === 'yandex' || savedAuthType === 'vk' || savedAuthType === 'telegram'
          ? savedAuthType
          : 'email'
        setAuthType(resolvedAuthType)
        if (hasPin) {
          const isUnlockedInSession = sessionStorage.getItem('denta_unlocked_in_session') === 'true'
          if (sessionLocked || !isUnlockedInSession) {
            setIsLocked(true)
          }
        }
      } else { logout() }
    }
    setIsLoading(false)
  }, [logout])

  useEffect(() => {
    if (!user || isLocked) return
    let timeoutId: NodeJS.Timeout
    const resetTimer = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        if (localStorage.getItem('denta_has_pin') === 'true') lock()
      }, 10 * 60 * 1000)
    }
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    events.forEach(event => document.addEventListener(event, resetTimer))
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && user && !isLocked && localStorage.getItem('denta_has_pin') === 'true') lock()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    resetTimer()
    return () => {
      clearTimeout(timeoutId)
      events.forEach(event => document.removeEventListener(event, resetTimer))
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user, isLocked, lock])

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    isLocked,
    isPinSetupOpen,
    setIsPinSetupOpen,
    isBiometricSupported,
    isBiometricEnabled,
    setIsBiometricEnabled: handleSetBiometricEnabled,
    authType,
    login,
    logout,
    lock,
    unlock
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
