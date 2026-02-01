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
        <div className="fixed inset-0 z-[9999] h-[100dvh] w-screen bg-[#F8F9FC] dark:bg-[#0f172a] flex flex-col items-center justify-center p-4 overscroll-none touch-none">
            <div className="w-full max-w-sm flex flex-col items-center">
                <div className="flex flex-col items-center mb-4 text-gray-900 dark:text-white text-center">
                    <div className="w-14 h-14 bg-blue-600/10 dark:bg-blue-500/20 rounded-full flex items-center justify-center mb-3 ring-2 ring-blue-600/20 dark:ring-blue-400/30">
                        <Lock className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                    </div>
                    <h2 className="text-xl font-black tracking-tight">ВВЕДИТЕ PIN</h2>
                    <p className="text-xs text-gray-400 dark:text-blue-300/60 mt-1 font-bold uppercase tracking-widest">{user.email || user.username || 'admin'}</p>
                </div>

                <div className="w-full bg-white dark:bg-gray-800 rounded-[32px] p-6 shadow-2xl border border-gray-100 dark:border-gray-700">
                    <PinLogin
                        email={user.username === 'admin' ? 'admin@denta-crm.local' : (user.email || user.username || 'admin@denta-crm.local')}
                        onSuccess={unlock}
                        onSwitchToPassword={logout}
                        hideHeader={true}
                    />
                </div>

                <button
                    onClick={logout}
                    className="mt-6 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-white transition-colors text-xs font-black uppercase tracking-widest p-2"
                >
                    Выйти из аккаунта
                </button>
            </div>
        </div>
    )
}
