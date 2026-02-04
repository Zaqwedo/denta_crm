'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Calendar, MapPin, Clock, Edit2, Trash2, Search, Info } from 'lucide-react'
import { Header } from '../components/Header'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { handleGetEvents, handleDeleteEvent } from './actions'
import { useAuth } from '../contexts/AuthContext'
import { EventForm } from './EventForm'

export function EventsViewClient() {
    const { user } = useAuth()
    const [events, setEvents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingEvent, setEditingEvent] = useState<any>(null)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        if (user?.username) {
            loadEvents()
        }
    }, [user?.username])

    const loadEvents = async () => {
        setLoading(true)
        const data = await handleGetEvents(user?.username || '')
        setEvents(data)
        setLoading(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Вы уверены, что хотите удалить это событие?')) return
        const result = await handleDeleteEvent(id, user?.username || '')
        if (result.success) {
            loadEvents()
        }
    }

    const filteredEvents = events.filter(e =>
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-[#f8faff] pb-24">
                <div className="max-w-4xl mx-auto px-4 pt-8">
                    <Header title="События" />

                    {/* Action Bar */}
                    <div className="mt-8 flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                placeholder="Поиск событий..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-white border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 transition-all font-bold text-gray-900"
                            />
                        </div>
                        <button
                            onClick={() => {
                                setEditingEvent(null)
                                setIsFormOpen(true)
                            }}
                            className="w-full md:w-auto px-8 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <Plus className="w-6 h-6" />
                            Добавить событие
                        </button>
                    </div>

                    {/* Events List */}
                    <div className="mt-8 space-y-4">
                        {loading ? (
                            <div className="py-20 text-center">
                                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-gray-400 font-bold">Загрузка ваших событий...</p>
                            </div>
                        ) : filteredEvents.length > 0 ? (
                            filteredEvents.map((event) => (
                                <div
                                    key={event.id}
                                    className="group bg-white rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-transparent hover:border-blue-100"
                                >
                                    <div className="flex flex-col md:flex-row justify-between gap-4">
                                        <div className="space-y-3">
                                            <h3 className="text-xl font-black text-gray-900 group-hover:text-blue-600 transition-colors">
                                                {event.title}
                                            </h3>

                                            <div className="flex flex-wrap gap-4 text-gray-500">
                                                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-xl">
                                                    <Calendar className="w-4 h-4 text-blue-500" />
                                                    <span className="text-sm font-bold">{new Date(event.date).toLocaleDateString('ru-RU')}</span>
                                                </div>
                                                {event.time && (
                                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-xl">
                                                        <Clock className="w-4 h-4 text-blue-500" />
                                                        <span className="text-sm font-bold">{event.time.slice(0, 5)}</span>
                                                    </div>
                                                )}
                                                {event.location && (
                                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-xl">
                                                        <MapPin className="w-4 h-4 text-blue-500" />
                                                        <span className="text-sm font-bold truncate max-w-[200px]">{event.location}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {event.description && (
                                                <div className="mt-4 p-4 bg-gray-50 rounded-2xl flex items-start gap-3">
                                                    <Info className="w-5 h-5 text-gray-400 mt-1 shrink-0" />
                                                    <p className="text-gray-600 font-medium text-sm leading-relaxed whitespace-pre-line">
                                                        {event.description}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex md:flex-col gap-2 shrink-0">
                                            <button
                                                onClick={() => {
                                                    setEditingEvent(event)
                                                    setIsFormOpen(true)
                                                }}
                                                className="flex-1 p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                                <span className="md:hidden font-bold">Изменить</span>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(event.id)}
                                                className="flex-1 p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                                <span className="md:hidden font-bold">Удалить</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="bg-white rounded-[40px] p-12 text-center border-4 border-dashed border-gray-100">
                                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600">
                                    <Calendar className="w-10 h-10" />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 mb-2">Нет предстоящих событий</h3>
                                <p className="text-gray-500 font-bold mb-8">Добавьте курсы, конференции или другие важные дела</p>
                                <button
                                    onClick={() => {
                                        setEditingEvent(null)
                                        setIsFormOpen(true)
                                    }}
                                    className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all"
                                >
                                    Создать свое первое событие
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <EventForm
                    isOpen={isFormOpen}
                    onClose={() => {
                        setIsFormOpen(false)
                        loadEvents()
                    }}
                    event={editingEvent}
                />
            </div>
        </ProtectedRoute>
    )
}
