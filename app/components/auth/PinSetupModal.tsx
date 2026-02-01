
'use client'

import { useAuth } from '@/app/contexts/AuthContext'
import { PinSetup } from './PinSetup'
import { X } from 'lucide-react'

export default function PinSetupModal() {
    const { isPinSetupOpen, setIsPinSetupOpen } = useAuth()

    if (!isPinSetupOpen) return null

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-sm">
                <button
                    onClick={() => setIsPinSetupOpen(false)}
                    className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
                >
                    <X className="w-8 h-8" />
                </button>

                <PinSetup
                    onComplete={() => setIsPinSetupOpen(false)}
                    onSkip={() => setIsPinSetupOpen(false)}
                />
            </div>
        </div>
    )
}
