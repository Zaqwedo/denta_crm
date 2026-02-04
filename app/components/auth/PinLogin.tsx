'use client'

import React, { useState, useEffect } from 'react'
import { PinPad } from './PinPad'
import { Lock, Fingerprint, History } from 'lucide-react'
import { useAuth } from '@/app/contexts/AuthContext'

interface PinLoginProps {
    email: string
    onSuccess: (userData: any) => void
    onSwitchToPassword: () => void
    hideHeader?: boolean
}

export const PinLogin: React.FC<PinLoginProps> = ({ email, onSuccess, onSwitchToPassword, hideHeader = false }) => {
    const { isBiometricSupported, isBiometricEnabled } = useAuth()
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

    // Автоматически запускаем биометрию при входе, если она включена
    useEffect(() => {
        if (isBiometricEnabled && isBiometricSupported && !loading) {
            // Небольшая задержка для плавности появления
            const timer = setTimeout(() => {
                handleBiometricLogin()
            }, 500)
            return () => clearTimeout(timer)
        }
    }, [isBiometricEnabled, isBiometricSupported])

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
            }
        } catch (err) {
            setError('Ошибка сети')
        } finally {
            setLoading(false)
        }
    }

    const handleBiometricLogin = async () => {
        setLoading(true)
        setError(null)
        try {
            // 1. Получаем challenge
            const challengeRes = await fetch('/api/auth/biometric/login-challenge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })

            if (!challengeRes.ok) {
                const data = await challengeRes.json()
                throw new Error(data.error || 'Ошибка получения challenge')
            }

            const { challenge, allowCredentials } = await challengeRes.json()

            // 2. Запрашиваем подпись у устройства
            const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
                challenge: Uint8Array.from(atob(challenge.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
                allowCredentials: allowCredentials.map((cred: any) => ({
                    ...cred,
                    id: Uint8Array.from(atob(cred.id.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
                })),
                userVerification: "required",
                timeout: 60000,
            };

            const assertion = await navigator.credentials.get({
                publicKey: publicKeyCredentialRequestOptions
            }) as PublicKeyCredential;

            if (!assertion) throw new Error('Ошибка биометрии')

            // 3. Отправляем на верификацию
            const response = assertion.response as AuthenticatorAssertionResponse;

            const verifyRes = await fetch('/api/auth/biometric/login-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    credentialId: assertion.id,
                    challenge: challenge
                    // authenticatorData, clientDataJSON, signature - можно добавить для полноценной проверки
                }),
            })

            if (verifyRes.ok) {
                const data = await verifyRes.json()
                onSuccess(data.user)
            } else {
                const data = await verifyRes.json()
                setError(data.error || 'Ошибка биометрии')
            }
        } catch (err: any) {
            console.error('Biometric login error:', err)
            // Не показываем ошибку, если пользователь просто отменил
            if (err.name !== 'NotAllowedError') {
                setError('Ошибка биометрии')
            }
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
            <div className="flex gap-6 mb-4">
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
                <div className="h-4 mb-2 text-center">
                    <p className="text-red-400 text-xs font-bold animate-pulse">{error}</p>
                </div>
            ) : (
                <div className="h-4 mb-2" />
            )}

            <PinPad
                onNumberClick={handleNumberClick}
                onDeleteClick={handleDeleteClick}
                disabled={loading}
                leftAction={isBiometricEnabled && isBiometricSupported ? (
                    <button
                        onClick={handleBiometricLogin}
                        disabled={loading}
                        className="flex items-center justify-center h-14 w-14 rounded-full text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 active:scale-90 transition-all duration-150"
                        title="Вход по Face ID / Touch ID"
                    >
                        <Fingerprint size={28} />
                    </button>
                ) : null}
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
