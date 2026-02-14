'use client'

import React, { useState } from 'react'
import { X, Calendar, Clock, MapPin, AlignLeft, Send } from 'lucide-react'
import { handleAddEvent, handleUpdateEvent } from './actions'
import { useAuth } from '../contexts/AuthContext'

type EditableEvent = {
    id?: string
    title?: string
    date?: string
    time?: string
    location?: string
    description?: string
}

interface EventFormProps {
    isOpen: boolean
    onClose: () => void
    event?: EditableEvent | null
}

export function EventForm({ isOpen, onClose, event }: EventFormProps) {
    const { user } = useAuth()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        formData.append('userEmail', user?.username || '')

        try {
            let result
            if (event?.id) {
                result = await handleUpdateEvent(event.id, formData)
            } else {
                result = await handleAddEvent(formData)
            }

            if (result.success) {
                onClose()
            } else {
                setError(result.error || 'Произошла ошибка')
            }
        } catch {
            setError('Произошла ошибка при сохранении')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[24px] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="px-6 py-5 bg-blue-600 flex items-center justify-between">
                    <h2 className="text-xl font-black text-white">
                        {event ? 'Редактировать событие' : 'Новое событие'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-xl text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                            Название события
                        </label>
                        <input
                            required
                            name="title"
                            defaultValue={event?.title}
                            placeholder="Напр., Конференция по имплантации"
                            className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-bold text-gray-900"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1 flex items-center gap-2">
                                <Calendar className="w-3 h-3" /> Дата
                            </label>
                            <input
                                required
                                type="date"
                                name="date"
                                defaultValue={event?.date || new Date().toISOString().split('T')[0]}
                                className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-bold text-gray-900"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1 flex items-center gap-2">
                                <Clock className="w-3 h-3" /> Время
                            </label>
                            <input
                                type="time"
                                name="time"
                                defaultValue={event?.time}
                                className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-bold text-gray-900"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1 flex items-center gap-2">
                            <MapPin className="w-3 h-3" /> Место
                        </label>
                        <input
                            name="location"
                            defaultValue={event?.location}
                            placeholder="Напр., Москва, Экспоцентр"
                            className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-bold text-gray-900"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1 flex items-center gap-2">
                            <AlignLeft className="w-3 h-3" /> Подробная информация
                        </label>
                        <textarea
                            name="description"
                            defaultValue={event?.description}
                            rows={4}
                            placeholder="Дополнительные детали..."
                            className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-bold text-gray-900 resize-none"
                        />
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-2xl font-bold text-sm text-center">
                            {error}
                        </div>
                    )}

                    <button
                        disabled={isSubmitting}
                        className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        <Send className="w-5 h-5" />
                        {isSubmitting ? 'Сохранение...' : (event ? 'Обновить событие' : 'Создать событие')}
                    </button>
                </form>
            </div>
        </div>
    )
}
