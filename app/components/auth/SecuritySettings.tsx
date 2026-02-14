'use client'

import React, { useState } from 'react'
import { useAuth } from '@/app/contexts/AuthContext'
import { Shield, Fingerprint, Lock, ChevronRight, Check, AlertCircle } from 'lucide-react'
import { PinSetup } from './PinSetup'

export const SecuritySettings: React.FC = () => {
    const {
        isBiometricSupported,
        isBiometricEnabled,
        setIsBiometricEnabled
    } = useAuth()

    const [showPinSetup, setShowPinSetup] = useState(false)
    const hasPin = typeof window !== 'undefined' && localStorage.getItem('denta_has_pin') === 'true'

    if (showPinSetup) {
        return (
            <div className="animate-in slide-in-from-right-4 duration-300">
                <button
                    onClick={() => setShowPinSetup(false)}
                    className="mb-4 text-sm text-blue-600 font-bold flex items-center gap-1"
                >
                    ← Назад к настройкам
                </button>
                <PinSetup onComplete={() => setShowPinSetup(false)} />
            </div>
        )
    }

    return (
        <div className="flex flex-col w-full max-w-sm mx-auto p-2 animate-in fade-in duration-500">
            <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-4">
                    <Shield size={32} className="text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Безопасность</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Настройка доступа к приложению</p>
            </div>

            <div className="space-y-4">
                {/* Настройка PIN */}
                <button
                    onClick={() => setShowPinSetup(true)}
                    className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-750 transition-all group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-xl flex items-center justify-center">
                            <Lock size={20} className="text-orange-600 dark:text-orange-400" />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-bold text-gray-800 dark:text-white">PIN-код</p>
                            <p className="text-xs text-gray-500">
                                {hasPin ? 'Установлен и активен' : 'Не установлен'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {hasPin && <Check size={16} className="text-green-500" />}
                        <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-400" />
                    </div>
                </button>

                {/* Настройка Биометрии */}
                {isBiometricSupported ? (
                    <div className="p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                                    <Fingerprint size={20} className="text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-bold text-gray-800 dark:text-white">Face ID / Touch ID</p>
                                    <p className="text-xs text-gray-500">Быстрый вход</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={isBiometricEnabled}
                                    onChange={(e) => setIsBiometricEnabled(e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        {!isBiometricEnabled && (
                            <div className="mt-2 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl flex items-start gap-3">
                                <AlertCircle size={14} className="text-blue-600 mt-0.5 shrink-0" />
                                <p className="text-[11px] text-blue-800 dark:text-blue-300">
                                    Включите, чтобы не вводить PIN-код при каждом входе. Это устройство будет привязано к вашему аккаунту.
                                </p>
                            </div>
                        )}

                        <button
                            onClick={() => setShowPinSetup(true)} // Переиспользование логики регистрации биометрии внутри PinSetup
                            className="w-full mt-4 py-2 text-xs font-bold text-blue-600 border border-blue-600/20 rounded-xl hover:bg-blue-50 transition-colors"
                        >
                            Привязать это устройство заново
                        </button>
                    </div>
                ) : (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3 opacity-50">
                                <Fingerprint size={20} className="text-gray-400" />
                                <p className="text-xs font-medium text-gray-500">Биометрия недоступна</p>
                            </div>
                            <p className="text-[11px] text-gray-400 leading-relaxed">
                                На устройствах Apple (iPhone/iPad) биометрия в браузерах Chrome и Opera может быть ограничена. Пожалуйста, используйте <b>Safari</b> для работы с Face ID.
                            </p>
                            <button
                                onClick={() => window.location.reload()}
                                className="text-[11px] text-blue-600 font-bold hover:underline text-left mt-1"
                            >
                                Перепроверить поддержку →
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                <p className="text-[10px] text-center text-gray-400 uppercase tracking-widest font-bold">
                    Ваши данные защищены сквозным шифрованием
                </p>
            </div>
        </div>
    )
}
