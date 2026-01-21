'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [changePasswordEmail, setChangePasswordEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const { login, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()

  // Автоматический редирект, если пользователь уже авторизован
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/patients')
    }
  }, [isAuthenticated, authLoading, router])

  // Проверяем ошибки из URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const errorParam = urlParams.get('error')
      if (errorParam) {
        // Очищаем URL от параметра ошибки
        const newUrl = window.location.pathname
        window.history.replaceState({}, '', newUrl)
        
        // Показываем понятное сообщение об ошибке
        if (errorParam === 'google_oauth_not_configured') {
          setError('Google OAuth не настроен. Проверьте переменные окружения GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET в Vercel.')
        } else if (errorParam === 'missing_code') {
          // Это нормально - пользователь перешел на callback напрямую
          // Не показываем ошибку, просто очищаем URL
          setError(null)
        } else if (errorParam === 'token_exchange_failed') {
          setError('Ошибка при обмене кода авторизации. Попробуйте войти через Google еще раз.')
        } else if (errorParam === 'user_info_failed') {
          setError('Ошибка при получении данных пользователя. Попробуйте войти через Google еще раз.')
        } else if (errorParam === 'oauth_error') {
          setError('Ошибка авторизации через Google. Попробуйте еще раз.')
        } else if (errorParam === 'yandex_oauth_not_configured') {
          setError('Yandex OAuth не настроен. Проверьте переменные окружения YANDEX_CLIENT_ID и YANDEX_CLIENT_SECRET.')
        } else if (errorParam === 'missing_code_yandex') {
          setError(null) // Нормально - пользователь перешел на callback напрямую
        } else if (errorParam === 'yandex_token_exchange_failed') {
          setError('Ошибка при обмене кода авторизации Яндекс. Попробуйте войти через Яндекс еще раз.')
        } else if (errorParam === 'yandex_user_info_failed') {
          setError('Ошибка при получении данных пользователя Яндекс. Попробуйте войти через Яндекс еще раз.')
        } else if (errorParam === 'yandex_oauth_error') {
          setError('Ошибка авторизации через Яндекс. Попробуйте еще раз.')
        } else if (errorParam === 'yandex_access_denied') {
          setError('Доступ запрещен. Вы отменили авторизацию через Яндекс.')
        } else if (errorParam === 'yandex_invalid_request') {
          setError('Неверный запрос к Yandex OAuth. Проверьте настройки приложения.')
        } else if (errorParam === 'yandex_unauthorized_client') {
          setError('Неавторизованный клиент. Проверьте YANDEX_CLIENT_ID в настройках.')
        } else if (errorParam === 'yandex_unsupported_response_type') {
          setError('Неподдерживаемый тип ответа Yandex OAuth. Обратитесь к администратору.')
        } else if (errorParam === 'yandex_invalid_scope') {
          const detailsParam = urlParams.get('details')
          const details = detailsParam ? decodeURIComponent(detailsParam) : ''
          setError(details || 'Неверный scope для Yandex OAuth. Если scope правильно настроены в приложении, попробуйте не указывать их явно в запросе (убедитесь, что переменная YANDEX_OAUTH_SCOPE не установлена).')
        } else if (errorParam === 'yandex_email_not_allowed') {
          setError('Доступ ограничен. Пожалуйста, обратитесь к администратору для добавления вашего Yandex аккаунта в список разрешенных пользователей.')
        } else {
          setError(decodeURIComponent(errorParam))
        }
      }
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/auth/email-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() || undefined, password }),
      })

      // Проверяем, является ли ответ JSON
      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        setError('Ошибка: сервер вернул неверный формат ответа')
        return
      }

      if (response.ok && data.success) {
        if (data.isAdmin) {
          login({ id: 1, first_name: 'Admin', username: 'admin', last_name: '' }, 'email')
        } else {
          login(data.user, 'email')
        }
        // КРИТИЧНО: Принудительно обновляем страницу для загрузки данных с правильными правами доступа
        // Это гарантирует, что закешированные данные от предыдущего пользователя не будут использованы
        router.refresh()
        router.push('/patients')
      } else {
        setError(data.error || 'Ошибка входа')
      }
    } catch (error: any) {
      // Более детальная обработка ошибок
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setError('Ошибка подключения к серверу. Проверьте, запущен ли сервер.')
      } else if (error.message) {
        setError(`Ошибка при входе: ${error.message}`)
      } else {
        setError('Ошибка при входе. Попробуйте еще раз.')
      }
      console.error('Login error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: registerEmail,
          password: registerPassword,
          confirmPassword,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess(data.message)
        setIsRegistering(false)
        setRegisterEmail('')
        setRegisterPassword('')
        setConfirmPassword('')
      } else {
        setError(data.error || 'Ошибка регистрации')
      }
    } catch (error) {
      setError('Ошибка при регистрации')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: changePasswordEmail,
          currentPassword,
          newPassword,
          confirmPassword: confirmNewPassword,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess(data.message)
        setShowChangePassword(false)
        setChangePasswordEmail('')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmNewPassword('')
      } else {
        setError(data.error || 'Ошибка при смене пароля')
      }
    } catch (error) {
      setError('Ошибка при смене пароля')
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Denta CRM</h1>
          <p className="text-gray-600">Система управления записями пациентов</p>
        </div>

        <div className="bg-white rounded-[20px] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-center mb-6 text-gray-900">
            {isRegistering ? 'Регистрация' : 'Вход в систему'}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm text-center">
              {success}
            </div>
          )}

          {!isRegistering ? (
            <>

          {/* Кнопка Google OAuth - основной способ входа */}
          <button
            type="button"
            onClick={() => {
              try {
                window.location.href = '/api/auth/google'
              } catch (err) {
                setError('Ошибка при переходе к авторизации Google')
                console.error('Google OAuth error:', err)
              }
            }}
            className="w-full bg-white hover:bg-gray-50 text-gray-900 font-semibold py-4 rounded-xl transition-all border-2 border-gray-300 hover:border-gray-400 flex items-center justify-center gap-3 shadow-sm hover:shadow-md mb-4"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Войти через Google</span>
          </button>

          {/* Кнопка Yandex OAuth */}
          <button
            type="button"
            onClick={() => {
              try {
                window.location.href = '/api/auth/yandex'
              } catch (err) {
                setError('Ошибка при переходе к авторизации Яндекс')
                console.error('Yandex OAuth error:', err)
              }
            }}
            className="w-full bg-[#FF0000] hover:bg-[#CC0000] text-white font-semibold py-4 rounded-xl transition-all flex items-center justify-center shadow-sm hover:shadow-md mb-3"
          >
            Войти через Яндекс
          </button>

          {/* Разделитель */}
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">или</span>
            </div>
          </div>

              {/* Форма входа */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="Введите ваш email"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Пароль
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="Введите ваш пароль"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                >
                  {isLoading ? 'Вход...' : 'Войти'}
                </button>
              </form>

              <div className="mt-4 flex justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setIsRegistering(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Зарегистрироваться
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={() => setShowChangePassword(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Сменить пароль
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Форма регистрации */}
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label htmlFor="registerEmail" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    id="registerEmail"
                    type="email"
                    autoComplete="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="registerPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Пароль (минимум 6 символов)
                  </label>
                  <input
                    id="registerPassword"
                    type="password"
                    autoComplete="new-password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Повторите пароль
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="Повторите пароль"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                >
                  {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(false)
                    setError(null)
                    setSuccess(null)
                  }}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Вернуться к входу
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Модальное окно смены пароля */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Смена пароля</h2>
              <button
                onClick={() => {
                  setShowChangePassword(false)
                  setError(null)
                  setSuccess(null)
                  setChangePasswordEmail('')
                  setCurrentPassword('')
                  setNewPassword('')
                  setConfirmNewPassword('')
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4">
                {success}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label htmlFor="changePasswordEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="changePasswordEmail"
                  type="email"
                  autoComplete="email"
                  value={changePasswordEmail}
                  onChange={(e) => setChangePasswordEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Текущий пароль
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Новый пароль (минимум 6 символов)
                </label>
                <input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Повторите новый пароль
                </label>
                <input
                  id="confirmNewPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                >
                  {isLoading ? 'Смена пароля...' : 'Сменить пароль'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePassword(false)
                    setError(null)
                    setSuccess(null)
                    setChangePasswordEmail('')
                    setCurrentPassword('')
                    setNewPassword('')
                    setConfirmNewPassword('')
                  }}
                  className="px-6 bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold py-3 rounded-xl transition-all"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}