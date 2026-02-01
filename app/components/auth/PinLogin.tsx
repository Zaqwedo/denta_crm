'use client'

import React, { useState, useEffect } from 'react'
import { PinPad } from './PinPad'
import { Lock, Fingerprint, History } from 'lucide-react'

interface PinLoginProps {
    email: string
    onSuccess: (userData: any) => void
    onSwitchToPassword: () => void
    hideHeader?: boolean
}

export const PinLogin: React.FC<PinLoginProps> = ({ email, onSuccess, onSwitchToPassword, hideHeader = false }) => {
    const [pin, setPin] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const handleNumberClick = (num: string) => {
        if (pin.length < 4) {
            setPin(prev => prev + num)
            setError(null)
        }
    }

    const handleDeleteClick = () => {
        setPin(prev => prev.slice(0, -1))
        setError(null)
    }

    useEffect(() => {
        if (pin.length === 4) {
            handleLogin()
        }
    }, [pin])

    const handleLogin = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/auth/pin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, pin }),
            })

            const data = await response.json()

            if (response.ok && data.success) {
                onSuccess(data.user)
            } else {
                setError(data.error || 'Неверный PIN-код')
                setPin('')
                // Вибрация или Shake эффект можно добавить здесь
            }
        } catch (err) {
            setError('Ошибка сети')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col items-center bg-transparent max-w-sm mx-auto animate-in fade-in duration-500">
            {!hideHeader && (
                <div className="mb-6 text-center text-gray-900 dark:text-white">
                    <div className="w-14 h-14 bg-blue-600/10 dark:bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-600/20 dark:border-white/20">
                        <Lock size={24} className="text-blue-600 dark:text-white" />
                    </div>
                    <h2 className="text-2xl font-bold mb-1">Введите PIN</h2>
                    <p className="text-gray-500 dark:text-white/60 text-sm font-medium">{email}</p>
                </div>
            )}

            {/* Индикаторы ввода */}
            <div className="flex gap-4 mb-4">
                {[0, 1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${pin.length > i
                            ? 'bg-blue-600 border-blue-600 dark:bg-white dark:border-white scale-110 shadow-[0_0_15px_rgba(37,99,235,0.4)] dark:shadow-[0_0_15px_rgba(255,255,255,0.5)]'
                            : 'border-gray-300 dark:border-white/30 bg-transparent'
                            }`}
                    />
                ))}
            </div>

            {error ? (
                <div className="h-4 mb-2">
                    <p className="text-red-400 text-xs font-bold">{error}</p>
                </div>
            ) : (
                <div className="h-4 mb-2" />
            )}

            <PinPad
                onNumberClick={handleNumberClick}
                onDeleteClick={handleDeleteClick}
                disabled={loading}
            />

            <div className="mt-4 flex flex-col gap-2 w-full px-4">
                <button
                    onClick={onSwitchToPassword}
                    className="flex items-center justify-center gap-2 text-gray-400 hover:text-blue-600 dark:text-white/70 dark:hover:text-white font-medium py-2 transition-colors text-sm"
                >
                    <History size={16} />
                    Войти по паролю
                </button>
            </div>
        </div>
    )
}
