'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import { handleGetDashboardStats, handleUpdateUserProfile } from './patients/actions'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Header } from './components/Header'
import { ThemeToggle } from './components/ThemeToggle'
import { LockToggle } from './components/auth/LockToggle'
import { ToastManager } from './patients/Toast'
import {
    User as UserIcon,
    Calendar,
    Users,
    Eye,
    Stethoscope,
    Activity,
    ArrowRight,
    Check,
    Edit2
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardClient() {
    const { user, login } = useAuth()
    const [stats, setStats] = useState<{
        isAdmin: boolean
        allowedDoctors: string[]
        allowedNurses: string[]
        todayCount: number
    } | null>(null)
    const [loading, setLoading] = useState(true)

    // Name editing state
    const [isEditingName, setIsEditingName] = useState(false)
    const [tempName, setTempName] = useState(user?.first_name || '')
    const [isSavingName, setIsSavingName] = useState(false)
    const [displayName, setDisplayName] = useState(user?.first_name || 'Коллега')

    useEffect(() => {
        async function loadStats() {
            if (!user?.email) return
            const res = await handleGetDashboardStats(user.email)
            if (res.success && res.data) {
                setStats(res.data)
            }
            setLoading(false)
        }
        loadStats()
    }, [user])

    useEffect(() => {
        if (user?.first_name) {
            setTempName(user.first_name)
            setDisplayName(user.first_name)
        }
    }, [user])

    const handleSaveName = async () => {
        if (!user?.email || !tempName.trim()) return

        setIsSavingName(true)
        const res = await handleUpdateUserProfile(user.email, tempName.trim())
        if (res.success) {
            // Update local context
            const storedAuthType = localStorage.getItem('denta_auth_type')
            const authType = storedAuthType === 'google' || storedAuthType === 'yandex' || storedAuthType === 'vk' || storedAuthType === 'telegram'
                ? storedAuthType
                : 'email'
            login({ ...user, first_name: tempName.trim() }, authType)
            setDisplayName(tempName.trim())
            setIsEditingName(false)
            ToastManager.success('Имя обновлено')
        } else {
            ToastManager.error('Ошибка при обновлении имени')
        }
        setIsSavingName(false)
    }

    const today = new Date()
    const formattedDate = today.toLocaleDateString('ru-RU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })

    const getGreeting = () => {
        const now = new Date()
        const mskHour = parseInt(now.toLocaleTimeString('en-US', { timeZone: 'Europe/Moscow', hour12: false, hour: 'numeric' }))

        if (mskHour >= 5 && mskHour < 12) return 'Доброе утро,'
        if (mskHour >= 12 && mskHour < 18) return 'Добрый день,'
        if (mskHour >= 18 && mskHour <= 23) return 'Добрый вечер,'
        return 'Доброй ночи,'
    }

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50 pb-32" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <div className="max-w-md mx-auto px-6 pt-8">
                    <Header
                        title={<>{getGreeting()}<br />{displayName}!</>}
                    />

                    {/* Controls */}
                    <div className="flex justify-center items-center gap-3 mb-8">
                        <ThemeToggle />
                        <LockToggle />
                    </div>

                    {/* Account Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-[32px] p-8 shadow-xl shadow-blue-900/5 dark:shadow-gray-900/20 mb-8 border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-blue-50 dark:bg-blue-900/20 rounded-full opacity-50" />

                        <div className="relative z-10">
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-start gap-4">
                                    <div className="bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-200 shrink-0">
                                        <UserIcon className="text-white w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest truncate mb-1">Учетная запись</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white truncate">{user?.email}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 py-3 px-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-600 w-full group cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-700 transition-all"
                                onClick={() => !isEditingName && setIsEditingName(true)}>
                                {isEditingName ? (
                                    <div className="flex items-center gap-2 w-full" onClick={e => e.stopPropagation()}>
                                        <input
                                            type="text"
                                            value={tempName}
                                            onChange={(e) => setTempName(e.target.value)}
                                            className="flex-1 bg-white dark:bg-gray-700 border border-blue-200 dark:border-blue-500 rounded-lg px-3 py-1 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Введите ваше имя"
                                            autoFocus
                                        />
                                        <button
                                            onClick={handleSaveName}
                                            disabled={isSavingName}
                                            className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            {isSavingName ? <Activity className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <UserIcon className="w-5 h-5 text-blue-500" />
                                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200 flex-1 truncate">
                                            {user?.first_name || 'Нажмите, чтобы ввести имя'}
                                        </span>
                                        <Edit2 className="w-4 h-4 text-gray-300 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400" />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Today Stats */}
                    <div className="bg-blue-600 rounded-[32px] p-8 text-white shadow-2xl shadow-blue-500/30 mb-8 relative overflow-hidden group text-left">
                        <div className="absolute bottom-0 right-0 -mb-4 -mr-4 w-24 h-24 bg-white/10 rounded-full group-hover:scale-110 transition-transform duration-700" />

                        <div className="flex items-center gap-3 mb-6">
                            <Calendar className="w-5 h-5 opacity-80" />
                            <p className="text-sm font-bold opacity-80 uppercase tracking-[2px]">{formattedDate}</p>
                        </div>

                        <div className="mb-8">
                            <p className="text-5xl font-black mb-1">{loading ? '...' : stats?.todayCount || 0}</p>
                            <p className="text-lg font-bold opacity-90 leading-tight">приемов назначено<br />на сегодня</p>
                        </div>

                        <Link
                            href="/calendar"
                            className="flex items-center justify-center gap-2 bg-white text-blue-600 py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-50 active:scale-95 transition-all shadow-lg text-center"
                        >
                            Открыть календарь
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex flex-col gap-4 mb-8">
                        <Link
                            href="/patients/card-index"
                            className="group bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm flex items-center justify-between hover:border-blue-200 transition-all hover:translate-x-1"
                        >
                            <div className="flex items-center gap-4">
                                <div className="bg-orange-50 p-4 rounded-2xl text-orange-600 group-hover:bg-orange-100 transition-colors">
                                    <Users className="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                    <h4 className="font-bold text-gray-900">Картотека</h4>
                                    <p className="text-xs font-medium text-gray-500">Все пациенты и группы</p>
                                </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500" />
                        </Link>
                    </div>

                    {/* Visibility Section */}
                    <div className="bg-white rounded-[32px] p-7 border border-gray-100 shadow-sm text-left">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-purple-50 p-3 rounded-2xl text-purple-600 shadow-sm border border-purple-100">
                                <Eye className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">Параметры видимости</h3>
                                <p className="text-xs font-medium text-gray-400">Данные, которые вам доступны</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-[20px] border border-gray-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <Stethoscope className="w-4 h-4 text-gray-400" />
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Врачи</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {stats?.isAdmin ? (
                                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold ring-1 ring-purple-200">Все врачи</span>
                                    ) : stats?.allowedDoctors?.length ? (
                                        stats.allowedDoctors.map(doc => (
                                            <span key={doc} className="px-3 py-1 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold shadow-sm">{doc}</span>
                                        ))
                                    ) : (
                                        <span className="text-xs font-medium text-gray-400 italic">Доступ не назначен</span>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-[20px] border border-gray-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <Activity className="w-4 h-4 text-gray-400" />
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Медсестры</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {stats?.isAdmin ? (
                                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold ring-1 ring-purple-200">Все медсестры</span>
                                    ) : stats?.allowedNurses?.length ? (
                                        stats.allowedNurses.map(nurse => (
                                            <span key={nurse} className="px-3 py-1 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold shadow-sm">{nurse}</span>
                                        ))
                                    ) : (
                                        <span className="text-xs font-medium text-gray-400 italic">Доступ не назначен</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    )
}
