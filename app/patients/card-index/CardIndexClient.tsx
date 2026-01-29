'use client'

import { useState, useMemo, useEffect } from 'react'
import { PatientData, updatePatientProfile, mergePatients } from '@/lib/supabase-db'
import { formatTime } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface ClientInfo {
    name: string
    birthDate: string | null
    phones: string[]
    emoji: string | null
    notes: string | null
    records: PatientData[]
}

const EMOJI_SET = ['👍🏻', '⛔️', '⚠️', '✅', '😡', '❤️', '🤔']

export function CardIndexClient({ initialData }: { initialData: ClientInfo[] }) {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedClient, setSelectedClient] = useState<ClientInfo | null>(null)
    const [isUpdating, setIsUpdating] = useState(false)
    const [localNotes, setLocalNotes] = useState('')

    // Состояния для фильтров
    const [showFilters, setShowFilters] = useState(false)
    const [selectedDoctor, setSelectedDoctor] = useState('')
    const [selectedNurse, setSelectedNurse] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    // Состояния для дублей
    const [showDuplicates, setShowDuplicates] = useState(false)
    const [merging, setMerging] = useState(false)
    const [previewClient, setPreviewClient] = useState<ClientInfo | null>(null)

    useEffect(() => {
        if (selectedClient) {
            setLocalNotes(selectedClient.notes || '')
        }
    }, [selectedClient])

    // Поиск дублей по номеру телефона
    const potentialDuplicates = useMemo(() => {
        const phoneMap: Record<string, ClientInfo[]> = {}

        initialData.forEach(client => {
            client.phones.forEach(phone => {
                const cleanPhone = phone.replace(/\D/g, '')
                if (cleanPhone.length >= 10) {
                    if (!phoneMap[cleanPhone]) phoneMap[cleanPhone] = []
                    // Проверяем, чтобы не добавлять одного и того же клиента дважды в одну группу
                    if (!phoneMap[cleanPhone].find(c => c.name === client.name && c.birthDate === client.birthDate)) {
                        phoneMap[cleanPhone].push(client)
                    }
                }
            })
        })

        const duplicateGroups: Array<{ phone: string, clients: ClientInfo[] }> = []
        Object.entries(phoneMap).forEach(([phone, clients]) => {
            if (clients.length > 1) {
                duplicateGroups.push({ phone, clients })
            }
        })
        return duplicateGroups
    }, [initialData])

    const handleMerge = async (source: ClientInfo, target: ClientInfo) => {
        if (!confirm(`Объединить ${source.name} в карточку ${target.name}? Все записи будут перенесены.`)) return

        setMerging(true)
        try {
            await mergePatients(
                { name: source.name, birthDate: source.birthDate },
                { name: target.name, birthDate: target.birthDate, emoji: target.emoji || source.emoji, notes: target.notes || source.notes }
            )
            window.location.reload()
        } catch (err) {
            alert('Ошибка при объединении')
        } finally {
            setMerging(false)
        }
    }

    const doctors = useMemo(() => {
        const unique = new Set<string>()
        initialData.forEach(client => {
            client.records.forEach(r => { if (r.Доктор) unique.add(r.Доктор) })
        })
        return Array.from(unique).sort()
    }, [initialData])

    const nurses = useMemo(() => {
        const unique = new Set<string>()
        initialData.forEach(client => {
            client.records.forEach(r => { if (r.Медсестра) unique.add(r.Медсестра) })
        })
        return Array.from(unique).sort()
    }, [initialData])

    const filteredData = useMemo(() => {
        return initialData.filter(client => {
            const matchesSearch = !searchTerm ||
                client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                client.phones.some(p => p.includes(searchTerm))

            if (!matchesSearch) return false

            const hasActiveFilters = selectedDoctor || selectedNurse || startDate || endDate
            if (!hasActiveFilters) return true

            return client.records.some(record => {
                const matchesDoctor = !selectedDoctor || record.Доктор === selectedDoctor
                const matchesNurse = !selectedNurse || record.Медсестра === selectedNurse
                let matchesDate = true
                if (record['Дата записи']) {
                    const recDate = record['Дата записи']
                    if (startDate && recDate < startDate) matchesDate = false
                    if (endDate && recDate > endDate) matchesDate = false
                } else if (startDate || endDate) {
                    matchesDate = false
                }
                return matchesDoctor && matchesNurse && matchesDate
            })
        })
    }, [initialData, searchTerm, selectedDoctor, selectedNurse, startDate, endDate])

    const handleEmojiSelect = async (emoji: string) => {
        if (!selectedClient) return
        const newEmoji = selectedClient.emoji === emoji ? null : emoji
        setIsUpdating(true)
        try {
            await updatePatientProfile(selectedClient.name, selectedClient.birthDate, { emoji: newEmoji })
            setSelectedClient({ ...selectedClient, emoji: newEmoji })
            const idx = initialData.findIndex(c => c.name === selectedClient.name && c.birthDate === selectedClient.birthDate)
            if (idx !== -1) initialData[idx].emoji = newEmoji
        } catch (err) {
            alert('Ошибка при обновлении реакции')
        } finally {
            setIsUpdating(false)
        }
    }

    const handleSaveNotes = async () => {
        if (!selectedClient) return
        setIsUpdating(true)
        try {
            await updatePatientProfile(selectedClient.name, selectedClient.birthDate, { notes: localNotes })
            setSelectedClient({ ...selectedClient, notes: localNotes })
            const idx = initialData.findIndex(c => c.name === selectedClient.name && c.birthDate === selectedClient.birthDate)
            if (idx !== -1) initialData[idx].notes = localNotes
        } catch (err) {
            alert('Ошибка при сохранении комментария')
        } finally {
            setIsUpdating(false)
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
                            {selectedClient.phones.map(phone => (
                                <a key={phone} href={`tel:${phone.replace(/\D/g, '')}`} className="text-blue-600 text-lg font-bold flex items-center hover:underline">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                    </svg>
                                    {phone}
                                </a>
                            ))}
                        </div>
                    </div>

                    <div className="mb-6 pt-4 border-t border-gray-50">
                        <label className="block text-gray-400 font-medium text-[10px] uppercase tracking-wider mb-2">Написать комментарий</label>
                        <div className="flex gap-2">
                            <textarea
                                value={localNotes}
                                onChange={(e) => setLocalNotes(e.target.value)}
                                placeholder="Общая информация о пациенте..."
                                className="flex-1 p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none h-20"
                            />
                            <button
                                onClick={handleSaveNotes}
                                disabled={isUpdating || localNotes === (selectedClient.notes || '')}
                                className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-opacity flex items-center justify-center self-end"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <span className="block text-gray-400 font-medium text-[10px] uppercase tracking-wider mb-3">указать реакцию</span>
                        <div className={`flex justify-between items-center gap-2 ${isUpdating ? 'opacity-50 pointer-events-none' : ''}`}>
                            {EMOJI_SET.map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => handleEmojiSelect(emoji)}
                                    className={`text-2xl p-2 rounded-xl transition-all active:scale-90 ${selectedClient.emoji === emoji ? 'bg-blue-50 ring-2 ring-blue-100 scale-110' : 'hover:bg-gray-50'}`}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-4 px-2">История посещений</h3>
                <div className="space-y-4">
                    {selectedClient.records
                        .sort((a, b) => (b['Дата записи'] || '').localeCompare(a['Дата записи'] || ''))
                        .map((record, index) => (
                            <div
                                key={record.id || index}
                                onClick={() => router.push(`/patients/${record.id}`)}
                                className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-50 cursor-pointer hover:border-blue-200 hover:shadow-md transition-all active:scale-[0.99] group"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        {record['Дата записи'] ? new Date(record['Дата записи']).toLocaleDateString('ru-RU') : 'Дата не указана'} {record['Время записи'] ? formatTime(record['Время записи']) : ''}
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${record.Статус?.includes('Завершен') ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}`}>
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
                                        <p className="text-sm text-gray-600 leading-relaxed italic group-hover:text-gray-900 transition-colors">"{record.Комментарии}"</p>
                                    </div>
                                )}
                                <div className="mt-3 text-right text-xs text-blue-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                    Открыть запись →
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        )
    }

    const hasActiveFilters = selectedDoctor || selectedNurse || startDate || endDate

    return (
        <div className="space-y-4">
            {/* Превью дубля (Модальное окно) */}
            {previewClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[28px] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 bg-amber-50 border-b border-amber-100">
                            <h4 className="text-amber-900 font-bold text-lg mb-1">Информация о дубле</h4>
                            <p className="text-amber-700/70 text-sm">Проверьте данные перед объединением</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <span className="block text-[10px] text-gray-400 uppercase font-bold mb-1">ФИО</span>
                                <p className="text-gray-900 font-bold">{previewClient.name}</p>
                            </div>
                            <div>
                                <span className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Номер телефона</span>
                                <p className="text-blue-600 font-bold">{previewClient.phones.join(', ')}</p>
                            </div>
                            <div>
                                <span className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Дата рождения</span>
                                <p className="text-gray-900 font-medium">
                                    {previewClient.birthDate ? new Date(previewClient.birthDate).toLocaleDateString('ru-RU') : 'Не указана'}
                                </p>
                            </div>
                            {previewClient.notes && (
                                <div>
                                    <span className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Комментарий</span>
                                    <p className="text-sm text-gray-600 italic">"{previewClient.notes}"</p>
                                </div>
                            )}
                            <div>
                                <span className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Всего посещений</span>
                                <p className="text-gray-900 font-medium">{previewClient.records.length}</p>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 flex flex-col gap-2">
                            <button
                                onClick={() => setPreviewClient(null)}
                                className="w-full py-4 text-gray-700 font-bold bg-white border border-gray-200 rounded-2xl active:scale-95 transition-transform"
                            >
                                Закрыть
                            </button>
                        </div>
                    </div>
                </div>
            )}

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

            {/* Блок дублей */}
            {potentialDuplicates.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-[20px] p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-amber-800 font-bold">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Найдено дублей: {potentialDuplicates.length}
                        </div>
                        <button
                            onClick={() => setShowDuplicates(!showDuplicates)}
                            className="text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full uppercase tracking-wider"
                        >
                            {showDuplicates ? 'Скрыть' : 'Показать'}
                        </button>
                    </div>
                    {showDuplicates && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top duration-200 mt-4">
                            {potentialDuplicates.map((group, gIdx) => (
                                <div key={gIdx} className="bg-white rounded-xl p-4 border border-amber-200">
                                    <p className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-widest">Номер: {group.phone}</p>
                                    <div className="space-y-3">
                                        {group.clients.map((c, cIdx) => (
                                            <div key={cIdx} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                                                <div
                                                    onClick={() => setPreviewClient(c)}
                                                    className="cursor-pointer hover:opacity-70 transition-opacity flex-1"
                                                >
                                                    <p className="font-bold text-gray-900 text-sm">{c.name}</p>
                                                    <p className="text-xs text-gray-500">{c.birthDate || 'Без ДР'}</p>
                                                </div>
                                                {cIdx === 0 ? (
                                                    <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded uppercase">Главная</span>
                                                ) : (
                                                    <button
                                                        disabled={merging}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleMerge(c, group.clients[0]);
                                                        }}
                                                        className="z-10 text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 transition-colors disabled:opacity-50"
                                                    >
                                                        В главную
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Кнопка фильтров */}
            <button
                onClick={() => setShowFilters(!showFilters)}
                className={`w-full px-5 py-3 rounded-2xl font-medium transition-colors flex items-center justify-between ${showFilters || hasActiveFilters
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-200'
                        : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                    }`}
            >
                <div className="flex items-center gap-2">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span>Фильтры {hasActiveFilters && '(активны)'}</span>
                </div>
                <svg className={`h-5 w-5 transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {showFilters && (
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 space-y-4 animate-in slide-in-from-top duration-200">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Врач</label>
                            <select value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm">
                                <option value="">Все врачи</option>
                                {doctors.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Медсестра</label>
                            <select value={selectedNurse} onChange={(e) => setSelectedNurse(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm">
                                <option value="">Все медсестры</option>
                                {nurses.map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Диапазон дат записи</label>
                        <div className="flex gap-2 items-center">
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="flex-1 p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm" />
                            <span className="text-gray-300">—</span>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="flex-1 p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm" />
                        </div>
                    </div>
                    {hasActiveFilters && (
                        <button onClick={() => { setSelectedDoctor(''); setSelectedNurse(''); setStartDate(''); setEndDate('') }} className="w-full py-3 text-red-600 font-bold text-sm bg-red-50 rounded-xl">Сбросить все</button>
                    )}
                </div>
            )}

            <div className="space-y-3">
                {filteredData.length > 0 ? (
                    filteredData.map((client, idx) => (
                        <div key={idx} onClick={() => setSelectedClient(client)} className="bg-white p-5 rounded-[20px] shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer flex justify-between items-center group overflow-hidden relative">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    {client.emoji && <span className="text-2xl">{client.emoji}</span>}
                                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{client.name}</h3>
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
                    <div className="text-center py-12 text-gray-400">Никто не найден</div>
                )}
            </div>
        </div>
    )
}
