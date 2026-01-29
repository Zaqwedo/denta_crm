'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Если мы в процессе авторизации через OAuth (Google или Yandex), не редиректим
    const isOAuthCallback = window.location.search.includes('google_auth=success') || 
                            window.location.search.includes('yandex_auth=success')
    
    if (!isLoading && !isAuthenticated && !isOAuthCallback) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  // Показываем загрузку пока проверяем аутентификацию
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Проверка доступа...</p>
        </div>
      </div>
    )
  }

  // Если не авторизован, не показываем контент, КРОМЕ случая OAuth Callback (Google или Yandex)
  const isOAuthCallback = typeof window !== 'undefined' && 
                          (window.location.search.includes('google_auth=success') || 
                           window.location.search.includes('yandex_auth=success'))
  
  if (!isAuthenticated && !isOAuthCallback) {
    return null
  }

  // Если авторизован или идет процесс Google Callback, показываем защищенный контент
  return <>{children}</>
}