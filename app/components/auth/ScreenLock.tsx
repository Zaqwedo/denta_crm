'use client'

import React, { useEffect } from 'react'
import { useAuth } from '@/app/contexts/AuthContext'
import { PinLogin } from './PinLogin'
import { Lock } from 'lucide-react'

export default function ScreenLock() {
    const { isLocked, unlock, user, logout } = useAuth()

    // Блокируем скролл основной страницы при активном экране блокировки
    useEffect(() => {
        if (isLocked) {
            document.body.style.overflow = 'hidden'
            // Предотвращаем "отпружинивание" на iOS
            document.body.style.position = 'fixed'
            document.body.style.width = '100%'
        } else {
            document.body.style.overflow = ''
            document.body.style.position = ''
            document.body.style.width = ''
        }
        return () => {
            document.body.style.overflow = ''
            document.body.style.position = ''
            document.body.style.width = ''
        }
    }, [isLocked])

    if (!isLocked || !user) return null

    return (
        <div className="fixed inset-0 z-[9999] h-[100dvh] w-screen bg-slate-100/80 dark:bg-[#0f172a]/95 backdrop-blur-md flex flex-col items-center justify-start pt-[15dvh] p-4 overscroll-none touch-none">
            <div className="w-full max-w-[340px] bg-white dark:bg-gray-800 rounded-[48px] p-8 shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col items-center">
                <div className="flex flex-col items-center mb-6 text-gray-900 dark:text-white text-center">
                    <div className="w-14 h-14 bg-blue-600/10 dark:bg-blue-500/20 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-blue-600/20 dark:ring-blue-400/30">
                        <Lock className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                    </div>
                    <h2 className="text-xl font-bold tracking-tight">Вход в систему</h2>
                    <p className="text-[11px] text-gray-400 dark:text-blue-300/60 mt-1 font-bold uppercase tracking-widest truncate max-w-[240px] border-b border-gray-100 dark:border-gray-700 pb-1">
                        {user.email || user.username || 'admin'}
                    </p>
                </div>

                <div className="w-full">
                    <PinLogin
                        email={user.username === 'admin' ? 'admin@denta-crm.local' : (user.email || user.username || 'admin@denta-crm.local')}
                        onSuccess={unlock}
                        onSwitchToPassword={logout}
                        hideHeader={true}
                    />
                </div>
            </div>

            <button
                onClick={logout}
                className="mt-8 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-white transition-colors text-[11px] font-bold uppercase tracking-widest p-2"
            >
                Выйти из аккаунта
            </button>
        </div>
    )
}
