'use client'

import React, { useState, useEffect } from 'react'
import { PinPad } from './PinPad'
import { ShieldCheck, ArrowRight, CheckCircle2, Fingerprint, Smartphone } from 'lucide-react'
import { useAuth } from '@/app/contexts/AuthContext'
import { bufferToBase64 } from '@/lib/biometrics'

interface PinSetupProps {
    onComplete: () => void
    onSkip?: () => void
}

export const PinSetup: React.FC<PinSetupProps> = ({ onComplete, onSkip }) => {
    const { isBiometricSupported, setIsBiometricEnabled } = useAuth()
    const [step, setStep] = useState<'enter' | 'confirm' | 'biometric'>('enter')
    const [pin, setPin] = useState('')
    const [confirmPin, setConfirmPin] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    const handleNumberClick = (num: string) => {
        if (step === 'enter' && pin.length < 4) {
            setPin(prev => prev + num)
            setError(null)
        } else if (step === 'confirm' && confirmPin.length < 4) {
            setConfirmPin(prev => prev + num)
            setError(null)
        }
    }

    const handleDeleteClick = () => {
        if (step === 'enter') {
            setPin(prev => prev.slice(0, -1))
        } else {
            setConfirmPin(prev => prev.slice(0, -1))
        }
        setError(null)
    }

    useEffect(() => {
        if (step === 'enter' && pin.length === 4) {
            setTimeout(() => setStep('confirm'), 300)
        } else if (step === 'confirm' && confirmPin.length === 4) {
            if (pin === confirmPin) {
                savePin()
            } else {
                setError('PIN-коды не совпадают')
                setConfirmPin('')
                setTimeout(() => setStep('enter'), 1000)
                setPin('')
            }
        }
    }, [pin, confirmPin, step])

    const savePin = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/auth/setup-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin }),
            })

            if (response.ok) {
                localStorage.setItem('denta_has_pin', 'true')
                if (isBiometricSupported) {
                    setStep('biometric')
                } else {
                    setSuccess(true)
                    setTimeout(() => onComplete(), 1500)
                }
            } else {
                const data = await response.json()
                setError(data.error || 'Ошибка при сохранении')
            }
        } catch (err) {
            setError('Ошибка сети')
        } finally {
            setLoading(false)
        }
    }

    const handleBiometricSetup = async () => {
        setLoading(true)
        setError(null)
        try {
            // 1. Получаем challenge
            const challengeRes = await fetch('/api/auth/biometric/register-challenge')
            if (!challengeRes.ok) throw new Error('Не удалось получить challenge')
            const { challenge, user } = await challengeRes.json()

            // 2. Создаем credentials
            const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
                challenge: Uint8Array.from(atob(challenge.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
                rp: {
                    name: "Denta CRM",
                    id: window.location.hostname,
                },
                user: {
                    id: Uint8Array.from(user.id, (c: string) => c.charCodeAt(0)),
                    name: user.name,
                    displayName: user.displayName,
                },
                pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
                authenticatorSelection: {
                    authenticatorAttachment: "platform",
                    userVerification: "required",
                },
                timeout: 60000,
                attestation: "none",
            };

            const credential = await navigator.credentials.create({
                publicKey: publicKeyCredentialCreationOptions
            }) as PublicKeyCredential;

            if (!credential) throw new Error('Биометрия не настроена')

            // 3. Отправляем на верификацию
            const response = await credential.response as AuthenticatorAttestationResponse;

            // В современных браузерах можно получить публичный ключ напрямую
            let publicKeyBase64 = '';
            if ('getPublicKey' in response) {
                const pk = (response as any).getPublicKey();
                publicKeyBase64 = bufferToBase64(pk);
            }

            const verifyRes = await fetch('/api/auth/biometric/register-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    credentialId: credential.id,
                    publicKey: publicKeyBase64,
                    challenge: challenge
                }),
            })

            if (verifyRes.ok) {
                setIsBiometricEnabled(true)
                setSuccess(true)
                setTimeout(() => onComplete(), 1500)
            } else {
                const data = await verifyRes.json()
                setError(data.error || 'Ошибка верификации')
            }
        } catch (err: any) {
            console.error('Biometric setup error:', err)
            setError(err.name === 'NotAllowedError' ? 'Операция отменена' : 'Ошибка при настройке биометрии')
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500 min-h-[400px]">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 size={40} className="text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Готово!</h2>
                <p className="text-gray-500 dark:text-gray-400">Настройка успешно завершена.</p>
            </div>
        )
    }

    if (step === 'biometric') {
        return (
            <div className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-[32px] shadow-xl border border-gray-100 dark:border-gray-700 max-w-sm mx-auto animate-in slide-in-from-bottom-4 duration-500 min-h-[400px] justify-center">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-6">
                    <Fingerprint size={32} className="text-blue-600 dark:text-blue-400" />
                </div>

                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 text-center">
                    Включить Face ID?
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-10 text-center px-4">
                    Используйте биометрию для еще более быстрого и безопасного входа.
                </p>

                {error && (
                    <p className="text-red-500 text-sm font-medium mb-6 text-center animate-bounce">{error}</p>
                )}

                <div className="flex flex-col w-full gap-3">
                    <button
                        onClick={handleBiometricSetup}
                        disabled={loading}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? 'Подключение...' : 'Включить'}
                    </button>
                    <button
                        onClick={onComplete}
                        disabled={loading}
                        className="w-full py-4 text-gray-400 hover:text-gray-600 font-bold transition-colors"
                    >
                        Позже
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-[32px] shadow-xl border border-gray-100 dark:border-gray-700 max-w-sm mx-auto animate-in slide-in-from-bottom-4 duration-500 min-h-[500px]">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-6">
                <ShieldCheck size={32} className="text-blue-600 dark:text-blue-400" />
            </div>

            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 text-center">
                {step === 'enter' ? 'Установите PIN' : 'Подтвердите PIN'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 text-center px-4">
                {step === 'enter'
                    ? 'Используйте быстрый 4-значный код для мгновенного входа в систему.'
                    : 'Пожалуйста, введите код еще раз для подтверждения.'}
            </p>

            {/* Индикаторы ввода */}
            <div className="flex gap-4 mb-10">
                {[0, 1, 2, 3].map((i) => {
                    const filled = step === 'enter' ? pin.length > i : confirmPin.length > i
                    return (
                        <div
                            key={i}
                            className={`w-4 h-4 rounded-full transition-all duration-200 ${filled ? 'bg-blue-600 scale-110 shadow-lg shadow-blue-200 dark:shadow-blue-900/40' : 'bg-gray-200 dark:bg-gray-700'
                                }`}
                        />
                    )
                })}
            </div>

            {error ? (
                <p className="text-red-500 text-sm font-medium mb-6 animate-bounce">{error}</p>
            ) : (
                <div className="h-11 mb-0" />
            )}

            <PinPad
                onNumberClick={handleNumberClick}
                onDeleteClick={handleDeleteClick}
                disabled={loading}
            />

            <div className="mt-8 w-full flex flex-col gap-3">
                {onSkip && step === 'enter' && pin.length === 0 && (
                    <button
                        onClick={onSkip}
                        className="text-gray-400 font-medium hover:text-gray-600 py-2 transition-colors"
                    >
                        Пропустить сейчас
                    </button>
                )}
            </div>
        </div>
    )
}
