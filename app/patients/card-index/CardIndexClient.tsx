'use client'

import { useState } from 'react'
import { PatientData, updatePatientEmoji } from '@/lib/supabase-db'
import { formatTime } from '@/lib/utils'

interface ClientInfo {
    name: string
    birthDate: string | null
    phones: string[]
    emoji: string | null
    records: PatientData[]
}

const EMOJI_SET = ['👍🏻', '⛔️', '⚠️', '✅', '😡', '❤️', '🤔']

export function CardIndexClient({ initialData }: { initialData: ClientInfo[] }) {
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedClient, setSelectedClient] = useState<ClientInfo | null>(null)
    const [isUpdatingEmoji, setIsUpdatingEmoji] = useState(false)

    const filteredData = initialData.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phones.some(p => p.includes(searchTerm))
    )

    const handleEmojiSelect = async (emoji: string) => {
        if (!selectedClient) return

        // Если кликнули на уже выбранный смайлик — снимаем его
        const newEmoji = selectedClient.emoji === emoji ? null : emoji

        setIsUpdatingEmoji(true)
        try {
            await updatePatientEmoji(selectedClient.name, selectedClient.birthDate, newEmoji)
            setSelectedClient({ ...selectedClient, emoji: newEmoji })

            // Обновляем эмодзи в общем списке initialData (локально)
            const clientIdx = initialData.findIndex(c => c.name === selectedClient.name && c.birthDate === selectedClient.birthDate)
            if (clientIdx !== -1) {
                initialData[clientIdx].emoji = newEmoji
            }
        } catch (err) {
            alert('Не удалось обновить смайлик')
        } finally {
            setIsUpdatingEmoji(false)
        }
    }

    if (selectedClient) {
        return (
            <div className="animate-in fade-in slide-in-from-right duration-300">
                <button
                    onClick={() => setSelectedClient(null)}
                    className="mb-6 flex items-center text-blue-600 font-medium"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Назад к списку
                </button>

                {/* Блок 1: Основная информация */}
                <div className="bg-white rounded-[24px] p-6 shadow-sm mb-6 border border-gray-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4">
                        <div className="text-4xl">{selectedClient.emoji}</div>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 mb-4 pr-12">{selectedClient.name}</h2>

                    <div className="space-y-3 mb-6">
                        {selectedClient.birthDate && (
                            <div className="flex items-center text-gray-600">
                                <span className="w-32 text-gray-400 font-medium text-sm uppercase tracking-wider">Дата рожд.</span>
                                <span className="text-lg font-medium">{new Date(selectedClient.birthDate).toLocaleDateString('ru-RU')}</span>
                            </div>
                        )}
                        <div className="flex flex-col gap-2">
                            <span className="text-gray-400 font-medium text-sm uppercase tracking-wider">Контакты</span>
                            {selectedClient.phones.length > 0 ? (
                                selectedClient.phones.map(phone => (
                                    <a
                                        key={phone}
                                        href={`tel:${phone.replace(/\D/g, '')}`}
                                        className="text-blue-600 text-lg font-bold flex items-center hover:underline"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                        </svg>
                                        {phone}
                                    </a>
                                ))
                            ) : (
                                <span className="text-gray-400">Номер не указан</span>
                            )}
                        </div>
                    </div>

                    {/* Панель выбора смайлика */}
                    <div className="border-t pt-4">
                        <span className="block text-gray-400 font-medium text-[10px] uppercase tracking-wider mb-3">Указать статус пациента</span>
                        <div className={`flex justify-between items-center gap-2 ${isUpdatingEmoji ? 'opacity-50 pointer-events-none' : ''}`}>
                            {EMOJI_SET.map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => handleEmojiSelect(emoji)}
                                    className={`text-2xl p-2 rounded-xl transition-all active:scale-90 ${selectedClient.emoji === emoji ? 'bg-blue-50 ring-2 ring-blue-100 scale-110' : 'hover:bg-gray-50'
                                        }`}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Блок 2: История посещений */}
                <h3 className="text-xl font-bold text-gray-900 mb-4 px-2">История посещений</h3>
                <div className="space-y-4">
                    {selectedClient.records
                        .sort((a, b) => {
                            const dateA = a['Дата записи'] || ''
                            const dateB = b['Дата записи'] || ''
                            return dateB.localeCompare(dateA)
                        })
                        .map((record, index) => (
                            <div key={record.id || index} className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-50">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">
                                        {record['Дата записи'] ? new Date(record['Дата записи']).toLocaleDateString('ru-RU') : 'Дата не указана'} {record['Время записи'] ? formatTime(record['Время записи']) : ''}
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${record.Статус?.includes('Завершен') ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'
                                        }`}>
                                        {record.Статус || 'Ожидает'}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <span className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Врач</span>
                                        <span className="text-sm font-medium text-gray-800">{record.Доктор || '—'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Медсестра</span>
                                        <span className="text-sm font-medium text-gray-800">{record.Медсестра || '—'}</span>
                                    </div>
                                </div>

                                {record.Зубы && (
                                    <div className="mb-3 bg-gray-50 p-2 rounded-lg">
                                        <span className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Зубы</span>
                                        <span className="text-sm font-bold text-blue-800">{record.Зубы}</span>
                                    </div>
                                )}

                                {record.Комментарии && (
                                    <div>
                                        <span className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Комментарий</span>
                                        <p className="text-sm text-gray-600 leading-relaxed italic">"{record.Комментарии}"</p>
                                    </div>
                                )}
                            </div>
                        ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Поиск */}
            <div className="relative">
                <input
                    type="text"
                    placeholder="Поиск по имени или телефону..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-5 py-4 pl-12 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>

            {/* Список клиентов */}
            <div className="space-y-3">
                {filteredData.length > 0 ? (
                    filteredData.map((client, idx) => (
                        <div
                            key={idx}
                            onClick={() => setSelectedClient(client)}
                            className="bg-white p-5 rounded-[20px] shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer flex justify-between items-center group overflow-hidden relative"
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    {client.emoji && <span className="text-2xl">{client.emoji}</span>}
                                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                        {client.name}
                                    </h3>
                                </div>
                                <p className="text-sm text-gray-500 font-medium ml-1">
                                    {client.birthDate ? new Date(client.birthDate).toLocaleDateString('ru-RU') : 'Дата рождения не указана'}
                                </p>
                                <div className="flex gap-2 mt-2 ml-1">
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-bold">
                                        {client.records.length} {client.records.length === 1 ? 'посещение' : client.records.length < 5 ? 'посещения' : 'посещений'}
                                    </span>
                                </div>
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-300 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 text-gray-400">
                        Никто не найден
                    </div>
                )}
            </div>
        </div>
    )
}
