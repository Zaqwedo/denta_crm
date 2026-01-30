'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PatientData, updatePatientProfile, getPatients, addPatient, mergePatients, ignoreDuplicate } from '@/lib/supabase-db'
import { DB_COLUMNS, RECORD_STATUS, EMOJI_SET, PATIENT_STATUSES } from '@/lib/constants'
import { handleDeletePatient } from '../actions'
import { useAuth } from '../../contexts/AuthContext'
import { List, RowComponentProps } from 'react-window'
import { useDebounce } from 'use-debounce'
import { ClientInfo } from './types'
import { ClientCard } from './components/ClientCard'
import { FiltersPanel } from './components/FiltersPanel'
import { DuplicatesSection } from './components/DuplicatesSection'
import { ClientDetails } from './components/ClientDetails'

const logger = {
    log: (...args: any[]) => console.log(...args),
    error: (...args: any[]) => console.error(...args),
    warn: (...args: any[]) => console.warn(...args)
}

// Вспомогательная функция для нормализации ФИО (для сравнения)
const normalizeName = (name: string) => name.toLowerCase().replace(/[^а-яё]/g, '').trim()

export function CardIndexClient({ initialData }: { initialData: ClientInfo[] }) {
    const router = useRouter()
    const { user } = useAuth()
    const [searchTerm, setSearchTerm] = useState('')
    const [debouncedSearchTerm] = useDebounce(searchTerm, 300)
    const [selectedClient, setSelectedClient] = useState<ClientInfo | null>(null)
    const [localNotes, setLocalNotes] = useState('')
    const [showFilters, setShowFilters] = useState(false)
    const [selectedDoctor, setSelectedDoctor] = useState('')
    const [selectedNurse, setSelectedNurse] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [isAddingRecord, setIsAddingRecord] = useState(false)
    const [newRecord, setNewRecord] = useState({
        date: new Date().toISOString().split('T')[0],
        time: '',
        doctor: '',
        nurse: '',
        teeth: '',
        notes: '',
        status: PATIENT_STATUSES[0]
    })
    const [isUpdating, setIsUpdating] = useState(false)

    // Состояние для дублей
    const [showDuplicates, setShowDuplicates] = useState(false)
    const [merging, setMerging] = useState(false)
    const [previewClient, setPreviewClient] = useState<ClientInfo | null>(null)
    const [mergeConflict, setMergeConflict] = useState<{
        source: ClientInfo,
        target: ClientInfo,
        chosenName: string,
        chosenBirthDate: string | null
    } | null>(null)

    // При выборе клиента синхронизируем заметки
    useEffect(() => {
        if (selectedClient) {
            setLocalNotes(selectedClient.notes || '')
        }
    }, [selectedClient])

    // Поиск потенциальных дублей (одинаковые телефоны, но разные ФИО/ДР)
    const potentialDuplicates = useMemo(() => {
        const phoneToClients = new Map<string, ClientInfo[]>()

        initialData.forEach(client => {
            client.phones.forEach(phone => {
                const cleaned = phone.replace(/\D/g, '')
                if (cleaned.length >= 10) {
                    if (!phoneToClients.has(cleaned)) phoneToClients.set(cleaned, [])
                    phoneToClients.get(cleaned)!.push(client)
                }
            })
        })

        const groups: Array<{ label: string, clients: ClientInfo[] }> = []
        phoneToClients.forEach((groupClients, phone) => {
            const unique = Array.from(new Set(groupClients))
            if (unique.length > 1) {
                // Проверяем, не игнорировали ли мы уже эту пару
                const filtered = unique.filter((c, idx) => {
                    const others = unique.filter((_, i) => i !== idx)
                    return !others.some(other => {
                        const pairId = [`${c.name}|${c.birthDate || ''}`, `${other.name}|${other.birthDate || ''}`].sort().join(':::')
                        return c.ignoredIds.includes(pairId) || other.ignoredIds.includes(pairId)
                    })
                })

                if (filtered.length > 1) {
                    groups.push({ label: `Телефон: ${phone}`, clients: filtered })
                }
            }
        })

        return groups
    }, [initialData])

    // Фильтрация
    const filteredData = useMemo(() => {
        return initialData.filter(client => {
            // Поиск по ФИО или телефону
            const matchesSearch = debouncedSearchTerm === '' ||
                client.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                client.phones.some(p => p.includes(debouncedSearchTerm))

            if (!matchesSearch) return false

            // Фильтры
            const hasDoctor = selectedDoctor === '' || client.records.some(r => r[DB_COLUMNS.DOCTOR] === selectedDoctor)
            const hasNurse = selectedNurse === '' || client.records.some(r => r[DB_COLUMNS.NURSE] === selectedNurse)

            let matchesDate = true
            if (startDate || endDate) {
                matchesDate = client.records.some(r => {
                    const d = r[DB_COLUMNS.DATE] as string
                    if (!d) return false
                    if (startDate && d < startDate) return false
                    if (endDate && d > endDate) return false
                    return true
                })
            }

            return hasDoctor && hasNurse && matchesDate
        }).sort((a, b) => a.name.localeCompare(b.name))
    }, [initialData, debouncedSearchTerm, selectedDoctor, selectedNurse, startDate, endDate])

    const doctors = useMemo(() => {
        const set = new Set<string>()
        initialData.forEach(c => c.records.forEach(r => {
            if (r[DB_COLUMNS.DOCTOR]) set.add(r[DB_COLUMNS.DOCTOR] as string)
        }))
        return Array.from(set).sort()
    }, [initialData])

    const nurses = useMemo(() => {
        const set = new Set<string>()
        initialData.forEach(c => c.records.forEach(r => {
            if (r[DB_COLUMNS.NURSE]) set.add(r[DB_COLUMNS.NURSE] as string)
        }))
        return Array.from(set).sort()
    }, [initialData])

    const handleEmojiSelect = async (newEmoji: string) => {
        if (!selectedClient) return
        setIsUpdating(true)
        try {
            await updatePatientProfile(selectedClient.name, selectedClient.birthDate, { [DB_COLUMNS.EMOJI]: newEmoji })
            setSelectedClient({ ...selectedClient, emoji: newEmoji })
            router.refresh()
        } catch (err) {
            alert('Ошибка при сохранении')
        } finally {
            setIsUpdating(false)
        }
    }

    const handleAddRecord = async () => {
        if (!selectedClient || !newRecord.date) return
        setIsUpdating(true)
        try {
            await addPatient({
                [DB_COLUMNS.NAME]: selectedClient.name,
                [DB_COLUMNS.BIRTH_DATE]: selectedClient.birthDate || undefined,
                [DB_COLUMNS.DATE]: newRecord.date,
                [DB_COLUMNS.TIME]: newRecord.time,
                [DB_COLUMNS.DOCTOR]: newRecord.doctor,
                [DB_COLUMNS.NURSE]: newRecord.nurse,
                [DB_COLUMNS.TEETH]: newRecord.teeth,
                [DB_COLUMNS.COMMENT]: newRecord.notes,
                [DB_COLUMNS.STATUS]: newRecord.status,
                [DB_COLUMNS.EMOJI]: selectedClient.emoji || undefined,
                [DB_COLUMNS.NOTES]: selectedClient.notes || undefined,
                [DB_COLUMNS.CREATED_BY]: user?.email || ''
            })
            setIsAddingRecord(false)
            router.refresh()
            // Обновляем текущего клиента (нужно перезагрузить данные)
            alert('Запись добавлена. Обновите страницу для просмотра изменений.')
        } catch (err) {
            alert('Ошибка при добавлении записи')
        } finally {
            setIsUpdating(false)
        }
    }

    const handleDeleteRecord = async (recordId: string) => {
        setIsUpdating(true)
        try {
            const result = await handleDeletePatient(recordId, user?.email || 'unknown')
            if (result.success) {
                if (selectedClient) {
                    setSelectedClient({
                        ...selectedClient,
                        records: selectedClient.records.filter(r => r[DB_COLUMNS.ID] !== recordId)
                    })
                }
                router.refresh()
            } else {
                alert('Ошибка при удалении: ' + result.error)
            }
        } catch (err) {
            alert('Ошибка при удалении записи')
        } finally {
            setIsUpdating(false)
        }
    }

    const handleSaveNotes = async () => {
        if (!selectedClient) return
        setIsUpdating(true)
        try {
            await updatePatientProfile(selectedClient.name, selectedClient.birthDate, { [DB_COLUMNS.NOTES]: localNotes || undefined })
            setSelectedClient({ ...selectedClient, notes: localNotes })
            router.refresh()
        } catch (err) {
            alert('Ошибка при сохранении комментария')
        } finally {
            setIsUpdating(false)
        }
    }

    const handleIgnoreDuplicate = async (target: ClientInfo, source: ClientInfo) => {
        setMerging(true)
        try {
            await ignoreDuplicate(
                { name: target.name, birthDate: target.birthDate },
                { name: source.name, birthDate: source.birthDate }
            )
            router.refresh()
            alert('Дубликат проигнорирован')
        } catch (err) {
            alert('Ошибка')
        } finally {
            setMerging(false)
        }
    }

    const startMerge = async (target: ClientInfo, sources: ClientInfo[]) => {
        // Пока поддерживаем объединение только с одним источником за раз для простоты выбора ФИО
        const source = sources[0]
        if (normalizeName(source.name) !== normalizeName(target.name) || source.birthDate !== target.birthDate) {
            setMergeConflict({ source, target, chosenName: target.name, chosenBirthDate: target.birthDate })
        } else {
            await confirmAndMerge(source, target, target.name, target.birthDate)
        }
    }

    const confirmAndMerge = async (source: ClientInfo, target: ClientInfo, name: string, birthDate: string | null) => {
        setMerging(true)
        setMergeConflict(null)
        try {
            const sourceIds = source.records.map(r => r[DB_COLUMNS.ID] as string)
            await mergePatients(sourceIds, {
                name,
                birthDate,
                emoji: target.emoji || source.emoji,
                notes: (target.notes || '') + (source.notes ? '\n' + source.notes : '')
            })
            router.refresh()
            alert('Клиенты объединены')
        } catch (err) {
            alert('Ошибка объединения')
        } finally {
            setMerging(false)
        }
    }

    const hasActiveFilters = selectedDoctor || selectedNurse || startDate || endDate

    if (selectedClient) {
        return (
            <ClientDetails
                selectedClient={selectedClient}
                setSelectedClient={setSelectedClient}
                isUpdating={isUpdating}
                handleEmojiSelect={handleEmojiSelect}
                handleDeleteRecord={handleDeleteRecord}
                handleSaveNotes={handleSaveNotes}
                localNotes={localNotes}
                setLocalNotes={setLocalNotes}
                isAddingRecord={isAddingRecord}
                setIsAddingRecord={setIsAddingRecord}
                newRecord={newRecord}
                setNewRecord={setNewRecord}
                doctors={doctors}
                nurses={nurses}
                handleAddRecord={handleAddRecord}
            />
        )
    }

    return (
        <div className="max-w-4xl mx-auto pb-32">
            <div className="flex items-center justify-end mb-4 px-2">
                <p className="text-gray-500 font-medium">Всего пациентов: <span className="text-blue-600 font-bold">{initialData.length}</span></p>
            </div>

            <div className="relative mb-6">
                <input
                    type="text"
                    placeholder="Поиск по ФИО или телефону..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-5 pl-14 bg-white rounded-3xl shadow-sm border border-gray-100 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-lg font-medium"
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>

            <DuplicatesSection
                potentialDuplicates={potentialDuplicates}
                showDuplicates={showDuplicates}
                setShowDuplicates={setShowDuplicates}
                merging={merging}
                handleIgnoreDuplicate={handleIgnoreDuplicate}
                startMerge={startMerge}
                setPreviewClient={setPreviewClient}
            />

            <FiltersPanel
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                selectedDoctor={selectedDoctor}
                setSelectedDoctor={setSelectedDoctor}
                selectedNurse={selectedNurse}
                setSelectedNurse={setSelectedNurse}
                startDate={startDate}
                setStartDate={setStartDate}
                endDate={endDate}
                setEndDate={setEndDate}
                doctors={doctors}
                nurses={nurses}
                hasActiveFilters={hasActiveFilters}
            />

            <div className="min-h-[600px] bg-gray-50/50 rounded-[32px] p-2 border border-gray-100/50">
                {filteredData.length > 0 ? (
                    <List
                        rowCount={filteredData.length}
                        rowHeight={135}
                        style={{ height: 600, width: '100%' }}
                        rowProps={{ onClick: setSelectedClient, data: filteredData }}
                        rowComponent={({ index, style, onClick, data }: RowComponentProps<{
                            onClick: (client: ClientInfo) => void,
                            data: ClientInfo[]
                        }>) => (
                            <div style={{ ...style, padding: '0 4px 12px 4px' }}>
                                <ClientCard
                                    client={data[index]}
                                    onClick={onClick}
                                />
                            </div>
                        )}
                    />
                ) : (
                    <div className="text-center py-12 text-gray-400 font-bold bg-white rounded-2xl border-2 border-dashed border-gray-100 italic">
                        Никто не найден
                    </div>
                )}
            </div>

            {previewClient && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 text-left">
                    <div className="bg-white rounded-[32px] p-8 max-w-lg w-full max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">Просмотр</h3>
                            <button onClick={() => setPreviewClient(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-400">ФИО</label>
                                <div className="text-lg font-bold">{previewClient.name}</div>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-400">Телефоны</label>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {previewClient.phones.map(p => <span key={p} className="bg-gray-100 px-2 py-1 rounded-md text-sm font-bold">{p}</span>)}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-400">Дата рождения</label>
                                <div className="font-bold">{previewClient.birthDate ? new Date(previewClient.birthDate).toLocaleDateString() : '—'}</div>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-400">Последние записи</label>
                                <div className="space-y-2 mt-2">
                                    {previewClient.records.slice(0, 3).map((r, idx) => (
                                        <div key={idx} className="p-3 bg-gray-50 rounded-xl text-sm">
                                            <div className="font-bold text-gray-900">
                                                {r[DB_COLUMNS.DATE] ? new Date(r[DB_COLUMNS.DATE] as string).toLocaleDateString() : '—'}
                                                {r[DB_COLUMNS.TIME] ? ` (${(r[DB_COLUMNS.TIME] as string).split(':').slice(0, 2).join(':')})` : ''}
                                                — {r[DB_COLUMNS.DOCTOR] as string}
                                            </div>
                                            {r[DB_COLUMNS.COMMENT] && <div className="text-xs text-gray-500 mt-1 italic">{r[DB_COLUMNS.COMMENT] as string}</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {mergeConflict && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200 text-left">
                    <div className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 bg-blue-600 text-white">
                            <h4 className="font-bold text-xl mb-1">Разрешение конфликтов</h4>
                            <p className="text-blue-100 text-sm">Данные в карточках различаются. Выберите верные:</p>
                        </div>
                        <div className="p-6 space-y-6">
                            {normalizeName(mergeConflict.source.name) !== normalizeName(mergeConflict.target.name) && (
                                <div>
                                    <label className="block text-[10px] text-gray-400 uppercase font-bold mb-3 tracking-widest">Выберите ФИО</label>
                                    <div className="space-y-2">
                                        {[mergeConflict.target, mergeConflict.source].map((c, i) => (
                                            <button key={i} onClick={() => setMergeConflict({ ...mergeConflict, chosenName: c.name })} className={`w-full p-4 text-left rounded-2xl border-2 transition-all ${mergeConflict.chosenName === c.name ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 hover:border-gray-200 text-gray-700'}`}>
                                                <div className="font-bold">{c.name}</div>
                                                <div className="text-xs opacity-60">{i === 0 ? 'Из главной карточки' : 'Из дубликата'}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {mergeConflict.source.birthDate !== mergeConflict.target.birthDate && (
                                <div>
                                    <label className="block text-[10px] text-gray-400 uppercase font-bold mb-3 tracking-widest">Выберите Дату Рождения</label>
                                    <div className="space-y-2">
                                        {[mergeConflict.target, mergeConflict.source].map((c, i) => (
                                            <button key={i} onClick={() => setMergeConflict({ ...mergeConflict, chosenBirthDate: c.birthDate })} className={`w-full p-4 text-left rounded-2xl border-2 transition-all ${mergeConflict.chosenBirthDate === c.birthDate ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 hover:border-gray-200 text-gray-700'}`}>
                                                <div className="font-bold">{c.birthDate ? new Date(c.birthDate).toLocaleDateString('ru-RU') : 'Не указана'}</div>
                                                <div className="text-xs opacity-60">{i === 0 ? 'Из главной карточки' : 'Из дубликата'}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-6 bg-gray-50 flex gap-3">
                            <button onClick={() => setMergeConflict(null)} className="flex-1 py-4 text-gray-500 font-bold bg-white border border-gray-200 rounded-2xl active:scale-95 transition-all">Отмена</button>
                            <button onClick={() => confirmAndMerge(mergeConflict.source, mergeConflict.target, mergeConflict.chosenName, mergeConflict.chosenBirthDate)} className="flex-[2] py-4 text-white font-bold bg-blue-600 rounded-2xl shadow-lg active:scale-95 transition-all">Подтвердить и объединить</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
