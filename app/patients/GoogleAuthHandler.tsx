'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { logger } from '@/lib/logger'
import { supabase } from '@/lib/supabase'

export function GoogleAuthHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const [allowedYandexEmails, setAllowedYandexEmails] = useState<string[]>([])
  const [allowedGoogleEmails, setAllowedGoogleEmails] = useState<string[]>([])

  // Загружаем белые списки из API
  useEffect(() => {
    const loadWhitelists = async () => {
      try {
        const [yandexRes, googleRes] = await Promise.all([
          fetch('/api/whitelist?provider=yandex'),
          fetch('/api/whitelist?provider=google'),
        ])

        if (yandexRes.ok) {
          const data = await yandexRes.json()
          setAllowedYandexEmails(data.emails || [])
        }

        if (googleRes.ok) {
          const data = await googleRes.json()
          setAllowedGoogleEmails(data.emails || [])
        }
      } catch (error) {
        console.error('Error loading whitelists:', error)
        // Fallback к статическим спискам при ошибке
        setAllowedYandexEmails(['vladosabramov@yandex.ru'])
        setAllowedGoogleEmails([])
      }
    }

    loadWhitelists()
  }, [])

  useEffect(() => {
    if (!searchParams) return

    const googleAuth = searchParams.get('google_auth')
    const userParam = searchParams.get('user')

    if (googleAuth === 'success' && userParam) {
      const handleAuth = async () => {
        try {
          console.log('🔄 GoogleAuthHandler: Начинаю обработку данных пользователя')
          const userData = JSON.parse(userParam)

          // Проверка whitelist выполняется на сервере в /api/auth/google/callback
          // Если пользователь дошел до этой точки, значит сервер его пропустил

          // Устанавливаем сессию Supabase для RLS
          await supabase.auth.signInAnonymously({
            options: {
              data: {
                email: userData.email || userData.username,
                full_name: userData.first_name + ' ' + (userData.last_name || ''),
                avatar_url: userData.photo_url,
              }
            }
          })

          login({
            id: userData.id || Date.now(),
            first_name: userData.first_name || 'User',
            last_name: userData.last_name || '',
            username: userData.username || userData.email || '',
            photo_url: userData.photo_url || '',
          }, 'google')

          console.log('✅ GoogleAuthHandler: Логин выполнен, очищаю URL')

          // Очищаем URL через window.history, чтобы не дергать лишний раз роутер
          const url = new URL(window.location.href)
          url.searchParams.delete('google_auth')
          url.searchParams.delete('user')
          window.history.replaceState({}, '', url.pathname)

          // Принудительно обновляем роутер через небольшой таймаут
          setTimeout(() => {
            router.refresh()
          }, 100)
        } catch (error) {
          console.error('❌ GoogleAuthHandler error:', error)
        }
      }

      handleAuth()
    }

    // Обработка Yandex
    const yandexAuth = searchParams.get('yandex_auth')
    const yandexUserParam = searchParams.get('user')

    if (yandexAuth === 'success' && yandexUserParam) {
      const handleYandexAuth = async () => {
        try {
          console.log('🔄 YandexAuthHandler: Начинаю обработку данных пользователя')
          const userData = JSON.parse(yandexUserParam)
          console.log('🔄 YandexAuthHandler: userData:', userData)

          // Проверка whitelist выполняется на сервере в /api/auth/yandex/callback
          // Если пользователь дошел до этой точки, значит сервер его пропустил
          console.log('✅ YandexAuthHandler: Продолжаем авторизацию')

          // Устанавливаем сессию Supabase для RLS
          await supabase.auth.signInAnonymously({
            options: {
              data: {
                email: userData.email || userData.username || `yandex_${userData.id}@yandex.ru`,
                full_name: userData.first_name + ' ' + (userData.last_name || ''),
                avatar_url: userData.photo_url,
              }
            }
          })

          login({
            id: userData.id,
            first_name: userData.first_name || 'User',
            last_name: userData.last_name || '',
            username: userData.username || userData.email || `yandex_${userData.id}`,
            photo_url: userData.photo_url || '',
          }, 'yandex')

          console.log('✅ YandexAuthHandler: Логин выполнен, очищаю URL')

          // Очищаем URL
          const url = new URL(window.location.href)
          url.searchParams.delete('yandex_auth')
          url.searchParams.delete('user')
          window.history.replaceState({}, '', url.pathname)

          setTimeout(() => {
            router.refresh()
          }, 100)
        } catch (error) {
          console.error('❌ YandexAuthHandler error:', error)
        }
      }

      handleYandexAuth()
    }
  }, [searchParams, login, router])  // УДАЛЕНЫ allowedGoogleEmails, allowedYandexEmails - они вызывают повторный запуск после очистки URL

  return null
}
