'use client'

import { useAuth } from '@/app/contexts/AuthContext'
import { PinLogin } from './PinLogin'
import { Lock } from 'lucide-react'

export default function ScreenLock() {
    const { isLocked, unlock, user, logout } = useAuth()

    if (!isLocked || !user) return null

    return (
        <div className="fixed inset-0 z-[9999] h-[100dvh] w-screen bg-blue-50/95 dark:bg-blue-300/10 backdrop-blur-xl flex flex-col items-center justify-center p-4 overscroll-none touch-none">
            <div className="w-full max-w-sm flex flex-col items-center">
                <div className="flex flex-col items-center mb-6 text-gray-900 dark:text-white text-center">
                    <div className="w-16 h-16 bg-blue-600/10 dark:bg-blue-500/20 rounded-full flex items-center justify-center mb-4 ring-2 ring-blue-600/20 dark:ring-blue-400/30">
                        <Lock className="w-8 h-8 text-blue-600 dark:text-blue-300" />
                    </div>
                    <h2 className="text-xl font-bold">Введите PIN-код</h2>
                    <p className="text-sm text-gray-500 dark:text-blue-200 mt-1 font-medium">{user.email || user.username || user.first_name}</p>
                </div>

                <div className="w-full bg-white dark:bg-gray-800 rounded-[32px] p-6 shadow-2xl border border-white dark:border-gray-700">
                    <PinLogin
                        email={user.username === 'admin' ? 'admin@denta-crm.local' : (user.email || user.username || 'admin@denta-crm.local')}
                        onSuccess={unlock}
                        onSwitchToPassword={logout}
                    />
                </div>

                <button
                    onClick={logout}
                    className="mt-8 text-gray-500 dark:text-blue-200 hover:text-blue-600 dark:hover:text-white transition-colors text-sm font-bold p-2"
                >
                    Войти под другим аккаунтом
                </button>
            </div>
        </div>
    )
}
