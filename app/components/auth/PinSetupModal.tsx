'use client'

import { useAuth } from '@/app/contexts/AuthContext'
import { SecuritySettings } from './SecuritySettings'
import { X } from 'lucide-react'

export default function PinSetupModal() {
    const { isPinSetupOpen, setIsPinSetupOpen } = useAuth()

    if (!isPinSetupOpen) return null

    return (
        <div className="fixed inset-0 z-[10000] h-[100dvh] w-screen bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-4 overscroll-none touch-none">
            <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-[32px] overflow-hidden shadow-2xl">
                <button
                    onClick={() => setIsPinSetupOpen(false)}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors bg-gray-100 dark:bg-gray-800 rounded-full z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-6">
                    <SecuritySettings />
                </div>
            </div>
        </div>
    )
}
