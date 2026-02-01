
'use client'

import React from 'react'
import { Lock } from 'lucide-react'
import { useAuth } from '@/app/contexts/AuthContext'

export function LockToggle() {
    const { lock } = useAuth()

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-2 shadow-sm border border-gray-100 dark:border-gray-700 inline-flex relative z-10">
            <button
                type="button"
                onClick={lock}
                className="p-2.5 rounded-xl transition-all text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 active:scale-95 shadow-sm hover:shadow-md border border-blue-100 dark:border-blue-900/30"
                title="Заблокировать"
                aria-label="Заблокировать"
            >
                <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </button>
        </div>
    )
}
