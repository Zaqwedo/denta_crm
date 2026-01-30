'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/app/components/Header'

interface WhitelistEmail {
  id: number
  email: string
  provider: 'google' | 'yandex' | 'email'
  created_at: string
  doctors?: string[]
  nurses?: string[]
}

interface RegisteredUser {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  created_at: string
  updated_at: string
  password_hash: string | null
  password_status: 'установлен' | 'сброшен'
}

export default function AdminDashboard() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Данные
  const [doctors, setDoctors] = useState<string[]>([])
  const [nurses, setNurses] = useState<string[]>([])
  const [whitelistEmails, setWhitelistEmails] = useState<WhitelistEmail[]>([])
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([])

  // Формы
  const [newDoctor, setNewDoctor] = useState('')
  const [newNurse, setNewNurse] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newEmailProvider, setNewEmailProvider] = useState<'google' | 'yandex' | 'email'>('google')
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([])
  const [selectedNurses, setSelectedNurses] = useState<string[]>([])
  const [editingEmail, setEditingEmail] = useState<WhitelistEmail | null>(null)

  // Сообщения об ошибках
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Проверка авторизации и загрузка данных
  useEffect(() => {
    const checkAuthAndLoad = async () => {
      try {
        // Проверяем авторизацию через специальный API endpoint для проверки админских прав
        const authCheckRes = await fetch('/api/admin/check-auth', { cache: 'no-store' })

        // Если не авторизован как админ (401 или 403), перенаправляем на страницу входа
        if (authCheckRes.status === 401 || authCheckRes.status === 403) {
          router.push('/admin')
          return
        }

        // Проверяем, что ответ успешный и содержит isAdmin: true
        const authData = await authCheckRes.json()
        if (!authData.isAdmin) {
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
      // Добавляем timestamp для предотвращения кеширования
      const timestamp = Date.now()
      const [doctorsRes, nursesRes, whitelistRes, usersRes] = await Promise.all([
        fetch(`/api/admin/doctors?t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/admin/nurses?t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/admin/whitelist?t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/admin/users?t=${timestamp}`, { cache: 'no-store' }),
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
        console.log('loadData: загружены whitelist emails', {
          emails: whitelistData.emails,
          count: whitelistData.emails?.length || 0,
          emailsWithData: whitelistData.emails?.map((e: any) => ({
            email: e.email,
            doctors: e.doctors,
            nurses: e.nurses,
            doctorsCount: e.doctors?.length || 0,
            nursesCount: e.nurses?.length || 0
          }))
        })
        setWhitelistEmails(whitelistData.emails || [])
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setRegisteredUsers(usersData.users || [])
      }
    } catch (err) {
      console.error('Load data error:', err)
      setError('Ошибка загрузки данных')
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/login', { method: 'DELETE' })
      // КРИТИЧНО: Принудительно обновляем страницу для загрузки данных с правильными правами доступа
      router.refresh()
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
        body: JSON.stringify({
          email: newEmail,
          provider: newEmailProvider,
          doctors: selectedDoctors,
          nurses: selectedNurses
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Ошибка добавления email')
        return
      }

      setSuccess('Email успешно добавлен в белый список')
      setNewEmail('')
      setSelectedDoctors([])
      setSelectedNurses([])
      await loadData()
    } catch (err) {
      setError('Ошибка при добавлении email')
      console.error('Add email error:', err)
    }
  }

  const handleUpdateEmailRelations = async (email: string, doctors: string[], nurses: string[]) => {
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/admin/whitelist', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, doctors, nurses }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Ошибка обновления привязок')
        return
      }

      setSuccess('Привязки успешно обновлены')
      setEditingEmail(null)
      await loadData()
    } catch (err) {
      setError('Ошибка при обновлении привязок')
      console.error('Update email relations error:', err)
    }
  }

  const toggleDoctor = (doctorName: string) => {
    setSelectedDoctors(prev =>
      prev.includes(doctorName)
        ? prev.filter(d => d !== doctorName)
        : [...prev, doctorName]
    )
  }

  const toggleNurse = (nurseName: string) => {
    setSelectedNurses(prev =>
      prev.includes(nurseName)
        ? prev.filter(n => n !== nurseName)
        : [...prev, nurseName]
    )
  }

  const handleResetPassword = async (userEmail: string) => {
    if (!confirm(`Сбросить пароль для пользователя "${userEmail}"? Пользователь сможет зарегистрироваться заново.`)) {
      return
    }

    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/admin/users?email=${encodeURIComponent(userEmail)}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Ошибка сброса пароля')
        return
      }

      setSuccess(`Пароль для пользователя "${userEmail}" успешно сброшен. Пользователь может зарегистрироваться заново.`)
      await loadData()
    } catch (err) {
      setError('Ошибка при сбросе пароля')
      console.error('Reset password error:', err)
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
        <Header
          title="Админ-панель"
          subtitle="Управление данными приложения"
          onBack={() => router.push('/patients')}
        />

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

            <form onSubmit={handleAddEmail} className="mb-4 space-y-3">
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

              {/* Выбор врачей и медсестер */}
              {(doctors.length > 0 || nurses.length > 0) && (
                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-4">
                  {doctors.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Врачи, которых может видеть этот email:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {doctors.map((doctor) => (
                          <label
                            key={doctor}
                            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedDoctors.includes(doctor)}
                              onChange={() => toggleDoctor(doctor)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{doctor}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {nurses.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Медсестры, которых может видеть этот email:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {nurses.map((nurse) => (
                          <label
                            key={nurse}
                            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedNurses.includes(nurse)}
                              onChange={() => toggleNurse(nurse)}
                              className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                            />
                            <span className="text-sm text-gray-700">{nurse}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedDoctors.length === 0 && selectedNurses.length === 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
                      <p className="text-xs text-red-700 font-medium">
                        ⚠️ Если не выбрано ни одного врача или медсестры, email не будет видеть пациентов
                      </p>
                    </div>
                  )}
                </div>
              )}
            </form>

            <div className="space-y-2">
              {whitelistEmails.length === 0 ? (
                <p className="text-gray-500 text-sm">Нет email в белых списках</p>
              ) : (
                whitelistEmails.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-gray-50 rounded-xl space-y-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-900 font-medium">{item.email}</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-lg">
                        {item.provider}
                      </span>
                    </div>

                    {/* Отображение врачей и медсестер */}
                    <div className="space-y-1">
                      {item.doctors && item.doctors.length > 0 ? (
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Врачи:</span>
                          {item.doctors.map((doctor) => (
                            <span
                              key={doctor}
                              className="px-2 py-0.5 bg-pink-50 text-pink-700 text-xs rounded-md border border-pink-100"
                            >
                              {doctor}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {item.nurses && item.nurses.length > 0 ? (
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Медсестры:</span>
                          {item.nurses.map((nurse) => (
                            <span
                              key={nurse}
                              className="px-2 py-0.5 bg-pink-50 text-pink-700 text-xs rounded-md border border-pink-100"
                            >
                              {nurse}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {(!item.doctors || item.doctors.length === 0) && (!item.nurses || item.nurses.length === 0) && (
                        <p className="text-xs text-red-600 font-medium">❌ Пациентов не видит</p>
                      )}
                    </div>

                    {/* Кнопки внизу карточки */}
                    <div className="flex gap-2 pt-2 border-t border-gray-200">
                      <button
                        onClick={() => {
                          if (editingEmail?.id === item.id) {
                            setEditingEmail(null)
                          } else {
                            // Создаем копию объекта с текущими врачами и медсестрами для редактирования
                            setEditingEmail({
                              ...item,
                              doctors: item.doctors ? [...item.doctors] : [],
                              nurses: item.nurses ? [...item.nurses] : []
                            })
                          }
                        }}
                        className="flex-1 px-2 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-lg transition-all"
                      >
                        {editingEmail?.id === item.id ? 'Отмена' : 'Изменить доступ'}
                      </button>
                      <button
                        onClick={() => handleDeleteEmail(item.email)}
                        className="flex-1 px-2 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-all"
                      >
                        Удалить
                      </button>
                    </div>

                    {/* Форма редактирования доступа */}
                    {editingEmail?.id === item.id && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="space-y-4 mb-4">
                          {doctors.length > 0 && (
                            <div>
                              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Врачи:</p>
                              <div className="flex flex-wrap gap-2">
                                {doctors.map((doctor) => (
                                  <label
                                    key={doctor}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={editingEmail.doctors?.includes(doctor) || false}
                                      onChange={() => {
                                        const currentDoctors = editingEmail.doctors || []
                                        const newDoctors = currentDoctors.includes(doctor)
                                          ? currentDoctors.filter(d => d !== doctor)
                                          : [...currentDoctors, doctor]
                                        setEditingEmail({ ...editingEmail, doctors: newDoctors })
                                      }}
                                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">{doctor}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          {nurses.length > 0 && (
                            <div>
                              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Медсестры:</p>
                              <div className="flex flex-wrap gap-2">
                                {nurses.map((nurse) => (
                                  <label
                                    key={nurse}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={editingEmail.nurses?.includes(nurse) || false}
                                      onChange={() => {
                                        const currentNurses = editingEmail.nurses || []
                                        const newNurses = currentNurses.includes(nurse)
                                          ? currentNurses.filter(n => n !== nurse)
                                          : [...currentNurses, nurse]
                                        setEditingEmail({ ...editingEmail, nurses: newNurses })
                                      }}
                                      className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                                    />
                                    <span className="text-sm text-gray-700">{nurse}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateEmailRelations(item.email, editingEmail.doctors || [], editingEmail.nurses || [])}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-all"
                          >
                            Сохранить
                          </button>
                          <button
                            onClick={() => setEditingEmail(null)}
                            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 text-sm rounded-lg transition-all"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Зарегистрированные пользователи */}
          <div className="bg-white rounded-2xl shadow-lg p-6 lg:col-span-2">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Зарегистрированные пользователи</h2>

            <div className="space-y-2">
              {registeredUsers.length === 0 ? (
                <p className="text-gray-500 text-sm">Нет зарегистрированных пользователей</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Email</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Имя</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Фамилия</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Пароль</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Дата регистрации</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registeredUsers.map((user) => {
                        const isPasswordSet = user.password_status === 'установлен'
                        return (
                          <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm text-gray-900">{user.email}</td>
                            <td className="py-3 px-4 text-sm text-gray-600">{user.first_name || '-'}</td>
                            <td className="py-3 px-4 text-sm text-gray-600">{user.last_name || '-'}</td>
                            <td className="py-3 px-4 text-sm">
                              <span className={`px-2 py-1 rounded-lg text-xs font-medium ${isPasswordSet
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-600'
                                }`}>
                                {user.password_status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {new Date(user.created_at).toLocaleDateString('ru-RU', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              <button
                                onClick={() => isPasswordSet && handleResetPassword(user.email)}
                                disabled={!isPasswordSet}
                                className={`px-3 py-1 text-sm rounded-lg transition-all ${isPasswordSet
                                  ? 'bg-orange-600 hover:bg-orange-700 text-white cursor-pointer'
                                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  }`}
                              >
                                Сброс пароля
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
