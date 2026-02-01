
'use client'

import { useAuth } from '@/app/contexts/AuthContext'
import { PinSetup } from './PinSetup'
import { X } from 'lucide-react'

export default function PinSetupModal() {
    const { isPinSetupOpen, setIsPinSetupOpen } = useAuth()

    if (!isPinSetupOpen) return null

    return (
        <div className="fixed inset-0 z-[10000] h-[100dvh] w-screen bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-4 overscroll-none touch-none">
            <div className="relative w-full max-w-sm">
                <button
                    onClick={() => setIsPinSetupOpen(false)}
                    className="absolute -top-14 right-0 p-3 text-white/70 hover:text-white transition-colors bg-white/10 rounded-full"
                >
                    <X className="w-6 h-6" />
                </button>

                <PinSetup
                    onComplete={() => setIsPinSetupOpen(false)}
                    onSkip={() => setIsPinSetupOpen(false)}
                />
            </div>
        </div>
    )
}
