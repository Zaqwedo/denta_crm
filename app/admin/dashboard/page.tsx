'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface WhitelistEmail {
  id: number
  email: string
  provider: 'google' | 'yandex' | 'email'
  created_at: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Данные
  const [doctors, setDoctors] = useState<string[]>([])
  const [nurses, setNurses] = useState<string[]>([])
  const [whitelistEmails, setWhitelistEmails] = useState<WhitelistEmail[]>([])

  // Формы
  const [newDoctor, setNewDoctor] = useState('')
  const [newNurse, setNewNurse] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newEmailProvider, setNewEmailProvider] = useState<'google' | 'yandex' | 'email'>('google')

  // Сообщения об ошибках
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Проверка авторизации и загрузка данных
  useEffect(() => {
    const checkAuthAndLoad = async () => {
      try {
        // Проверяем авторизацию через API
        const doctorsRes = await fetch('/api/admin/doctors')
        if (doctorsRes.status === 401) {
          router.push('/admin')
          return
        }

        setIsAuthenticated(true)
        await loadData()
      } catch (err) {
        console.error('Auth check error:', err)
        router.push('/admin')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuthAndLoad()
  }, [router])

  const loadData = async () => {
    try {
      const [doctorsRes, nursesRes, whitelistRes] = await Promise.all([
        fetch('/api/admin/doctors'),
        fetch('/api/admin/nurses'),
        fetch('/api/admin/whitelist'),
      ])

      if (doctorsRes.ok) {
        const doctorsData = await doctorsRes.json()
        setDoctors(doctorsData.doctors || [])
      }

      if (nursesRes.ok) {
        const nursesData = await nursesRes.json()
        setNurses(nursesData.nurses || [])
      }

      if (whitelistRes.ok) {
        const whitelistData = await whitelistRes.json()
        setWhitelistEmails(whitelistData.emails || [])
      }
    } catch (err) {
      console.error('Load data error:', err)
      setError('Ошибка загрузки данных')
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/login', { method: 'DELETE' })
      router.push('/patients')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/admin/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDoctor }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Ошибка добавления врача')
        return
      }

      setSuccess('Врач успешно добавлен')
      setNewDoctor('')
      await loadData()
    } catch (err) {
      setError('Ошибка при добавлении врача')
      console.error('Add doctor error:', err)
    }
  }

  const handleDeleteDoctor = async (name: string) => {
    if (!confirm(`Удалить врача "${name}"?`)) return

    try {
      const response = await fetch(`/api/admin/doctors?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        setError('Ошибка удаления врача')
        return
      }

      setSuccess('Врач успешно удален')
      await loadData()
    } catch (err) {
      setError('Ошибка при удалении врача')
      console.error('Delete doctor error:', err)
    }
  }

  const handleAddNurse = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/admin/nurses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newNurse }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Ошибка добавления медсестры')
        return
      }

      setSuccess('Медсестра успешно добавлена')
      setNewNurse('')
      await loadData()
    } catch (err) {
      setError('Ошибка при добавлении медсестры')
      console.error('Add nurse error:', err)
    }
  }

  const handleDeleteNurse = async (name: string) => {
    if (!confirm(`Удалить медсестру "${name}"?`)) return

    try {
      const response = await fetch(`/api/admin/nurses?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        setError('Ошибка удаления медсестры')
        return
      }

      setSuccess('Медсестра успешно удалена')
      await loadData()
    } catch (err) {
      setError('Ошибка при удалении медсестры')
      console.error('Delete nurse error:', err)
    }
  }

  // Автоматическое определение провайдера по домену email
  const detectProviderFromEmail = (email: string): 'google' | 'yandex' | 'email' => {
    if (!email || !email.includes('@')) {
      return 'google' // значение по умолчанию
    }

    const domain = email.toLowerCase().split('@')[1]
    
    // Google домены
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
      return 'google'
    }
    
    // Yandex домены
    if (domain === 'yandex.ru' || domain === 'yandex.com' || domain === 'ya.ru') {
      return 'yandex'
    }
    
    // Для остальных доменов используем 'email'
    return 'email'
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value
    setNewEmail(email)
    
    // Автоматически определяем провайдера по домену
    if (email && email.includes('@')) {
      const detectedProvider = detectProviderFromEmail(email)
      setNewEmailProvider(detectedProvider)
    }
  }

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/admin/whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, provider: newEmailProvider }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Ошибка добавления email')
        return
      }

      setSuccess('Email успешно добавлен в белый список')
      setNewEmail('')
      await loadData()
    } catch (err) {
      setError('Ошибка при добавлении email')
      console.error('Add email error:', err)
    }
  }

  const handleDeleteEmail = async (email: string) => {
    if (!confirm(`Удалить email "${email}" из белого списка?`)) return

    try {
      const response = await fetch(`/api/admin/whitelist?email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        setError('Ошибка удаления email')
        return
      }

      setSuccess('Email успешно удален из белого списка')
      await loadData()
    } catch (err) {
      setError('Ошибка при удалении email')
      console.error('Delete email error:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#f2f2f7] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <button
            onClick={() => router.push('/patients')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all mb-4"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Назад к списку пациентов
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Админ-панель</h1>
            <p className="text-gray-600">Управление данными приложения</p>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Врачи */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Врачи</h2>
            
            <form onSubmit={handleAddDoctor} className="mb-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newDoctor}
                  onChange={(e) => setNewDoctor(e.target.value)}
                  placeholder="ФИО врача"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all whitespace-nowrap"
                >
                  Добавить
                </button>
              </div>
            </form>

            <div className="space-y-2">
              {doctors.length === 0 ? (
                <p className="text-gray-500 text-sm">Нет врачей</p>
              ) : (
                doctors.map((doctor) => (
                  <div
                    key={doctor}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-xl"
                  >
                    <span className="text-gray-900">{doctor}</span>
                    <button
                      onClick={() => handleDeleteDoctor(doctor)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-all"
                    >
                      Удалить
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Медсестры */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Медсестры</h2>
            
            <form onSubmit={handleAddNurse} className="mb-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newNurse}
                  onChange={(e) => setNewNurse(e.target.value)}
                  placeholder="ФИО медсестры"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all whitespace-nowrap"
                >
                  Добавить
                </button>
              </div>
            </form>

            <div className="space-y-2">
              {nurses.length === 0 ? (
                <p className="text-gray-500 text-sm">Нет медсестер</p>
              ) : (
                nurses.map((nurse) => (
                  <div
                    key={nurse}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-xl"
                  >
                    <span className="text-gray-900">{nurse}</span>
                    <button
                      onClick={() => handleDeleteNurse(nurse)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-all"
                    >
                      Удалить
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Белые списки */}
          <div className="bg-white rounded-2xl shadow-lg p-6 lg:col-span-2">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Белые списки email</h2>
            
            <form onSubmit={handleAddEmail} className="mb-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={handleEmailChange}
                  placeholder="email@example.com"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
                <select
                  value={newEmailProvider}
                  onChange={(e) => setNewEmailProvider(e.target.value as 'google' | 'yandex' | 'email')}
                  className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none sm:w-auto w-full"
                >
                  <option value="google">Google</option>
                  <option value="yandex">Yandex</option>
                  <option value="email">Email/Password</option>
                </select>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all whitespace-nowrap sm:w-auto w-full"
                >
                  Добавить
                </button>
              </div>
            </form>

            <div className="space-y-2">
              {whitelistEmails.length === 0 ? (
                <p className="text-gray-500 text-sm">Нет email в белых списках</p>
              ) : (
                whitelistEmails.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-900">{item.email}</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-lg">
                        {item.provider}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteEmail(item.email)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-all"
                    >
                      Удалить
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
