'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { logger } from '@/lib/logger'

export function GoogleAuthHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()

  // Используем ref для отслеживания, был ли уже обработан OAuth callback
  const processedRef = useRef(false)

  useEffect(() => {
    if (!searchParams || processedRef.current) return

    const googleAuth = searchParams.get('google_auth')
    const userParam = searchParams.get('user')

    if (googleAuth === 'success' && userParam) {
      // Помечаем как обработанный ДО вызова login
      processedRef.current = true

      const handleAuth = async () => {
        try {
          console.log('🔄 GoogleAuthHandler: Обработка OAuth callback')
          const userData = JSON.parse(userParam)

          // Сервер уже:
          // 1. Проверил whitelist
          // 2. Установил HttpOnly cookies (denta_auth, denta_user_email)
          // 3. Перенаправил сюда с данными пользователя

          // Сохраняем данные пользователя в localStorage для UI
          login({
            id: userData.id || Date.now(),
            first_name: userData.first_name || 'User',
            last_name: userData.last_name || '',
            username: userData.username || userData.email || '',
            photo_url: userData.photo_url || '',
          }, 'google')

          console.log('✅ GoogleAuthHandler: Пользователь авторизован')

          // Очищаем OAuth параметры из URL
          const url = new URL(window.location.href)
          url.searchParams.delete('google_auth')
          url.searchParams.delete('user')
          window.history.replaceState({}, '', url.pathname)
        } catch (error) {
          console.error('❌ GoogleAuthHandler error:', error)
          logger.error('GoogleAuthHandler error:', error)
          processedRef.current = false // Сбрасываем при ошибке
          // При ошибке редиректим на login
          router.push('/login?error=auth_handler_failed')
        }
      }

      handleAuth()
    }

    // Обработка Yandex OAuth
    const yandexAuth = searchParams.get('yandex_auth')
    const yandexUserParam = searchParams.get('user')

    if (yandexAuth === 'success' && yandexUserParam) {
      // Помечаем как обработанный ДО вызова login
      processedRef.current = true

      const handleYandexAuth = async () => {
        try {
          console.log('🔄 YandexAuthHandler: Начинаю обработку данных пользователя')
          const userData = JSON.parse(yandexUserParam)
          console.log('🔄 YandexAuthHandler: Обработка OAuth callback')

          // Сервер уже:
          // 1. Проверил whitelist
          // 2. Установил HttpOnly cookies (denta_auth, denta_user_email)
          // 3. Перенаправил сюда с данными пользователя

          // Сохраняем данные пользователя в localStorage для UI
          login({
            id: userData.id,
            first_name: userData.first_name || 'User',
            last_name: userData.last_name || '',
            username: userData.username || userData.email || `yandex_${userData.id}`,
            photo_url: userData.photo_url || '',
          }, 'yandex')

          console.log('✅ YandexAuthHandler: Пользователь авторизован')

          // Очищаем OAuth параметры из URL
          const url = new URL(window.location.href)
          url.searchParams.delete('yandex_auth')
          url.searchParams.delete('user')
          window.history.replaceState({}, '', url.pathname)
        } catch (error) {
          console.error('❌ YandexAuthHandler error:', error)
          logger.error('YandexAuthHandler error:', error)
          processedRef.current = false // Сбрасываем при ошибке
          // При ошибке редиректим на login
          router.push('/login?error=auth_handler_failed')
        }
      }

      handleYandexAuth()
    }
  }, [searchParams, login, router])

  return null
}
