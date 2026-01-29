'use client'

import { useState, useMemo, useEffect } from 'react'
import { PatientData, updatePatientProfile, mergePatients, ignoreDuplicate } from '@/lib/supabase-db'
import { formatTime } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { DB_COLUMNS, RECORD_STATUS, EMOJI_SET } from '@/lib/constants'

interface ClientInfo {
    name: string
    birthDate: string | null
    phones: string[]
    emoji: string | null
    notes: string | null
    ignoredIds: string[]
    records: PatientData[]
}

// Вспомогательная функция для нормализации ФИО (для сравнения)
const normalizeName = (name: string) => {
    return name
        .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2700}-\u{27BF}]|[\u{2600}-\u{26FF}]/gu, '') // Удаляем эмодзи
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
}

// Проверка на схожесть имен (входит ли одно в другое или есть общие слова)
const isNamesSimilar = (name1: string, name2: string) => {
    const n1 = normalizeName(name1)
    const n2 = normalizeName(name2)
    if (!n1 || !n2) return false

    // Если одно имя содержит другое (например "Иван" и "Иван Иванович")
    if (n1.includes(n2) || n2.includes(n1)) return true

    // Проверка по словам (если хотя бы два слова длиннее 3 букв совпадают)
    const words1 = n1.split(' ').filter(w => w.length > 3)
    const words2 = n2.split(' ').filter(w => w.length > 3)

    const commonWords = words1.filter(w => words2.includes(w))
    return commonWords.length >= 1
}

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

    // Загружаем состояние развернутости дублей
    useEffect(() => {
        const saved = localStorage.getItem('showDuplicates')
        if (saved === 'true') setShowDuplicates(true)
    }, [])

    // Сохраняем состояние при изменении
    useEffect(() => {
        localStorage.setItem('showDuplicates', showDuplicates.toString())
    }, [showDuplicates])
    const [merging, setMerging] = useState(false)
    const [previewClient, setPreviewClient] = useState<ClientInfo | null>(null)

    // Состояние для разрешения конфликтов при объединении
    const [mergeConflict, setMergeConflict] = useState<{
        source: ClientInfo,
        target: ClientInfo,
        chosenName: string,
        chosenBirthDate: string | null
    } | null>(null)

    useEffect(() => {
        if (selectedClient) {
            setLocalNotes(selectedClient.notes || '')
        }
    }, [selectedClient])

    // Поиск дублей
    const potentialDuplicates = useMemo(() => {
        console.log('Поиск дублей среди:', initialData.length, 'пациентов');
        const groups: ClientInfo[][] = []

        // 1. Группировка по телефону
        const phoneMap: Record<string, ClientInfo[]> = {}
        initialData.forEach(client => {
            client.phones.forEach(phone => {
                const cleanPhone = phone.replace(/\D/g, '')
                if (cleanPhone.length >= 10) {
                    if (!phoneMap[cleanPhone]) phoneMap[cleanPhone] = []
                    if (!phoneMap[cleanPhone].some(c => c.name === client.name && c.birthDate === client.birthDate)) {
                        phoneMap[cleanPhone].push(client)
                    }
                }
            })
        })
        Object.values(phoneMap).forEach(group => {
            if (group.length > 1) groups.push(group)
        })

        // 2. Группировка по имени (даже если есть небольшие отличия)
        const nameMap: Record<string, ClientInfo[]> = {}
        initialData.forEach(client => {
            const normalized = normalizeName(client.name)
            if (normalized.length > 2) {
                // Группируем по первому слову (например "Иван")
                const firstWord = normalized.split(' ')[0]
                if (firstWord.length > 2) {
                    if (!nameMap[firstWord]) nameMap[firstWord] = []
                    nameMap[firstWord].push(client)
                }
            }
        })

        Object.values(nameMap).forEach(group => {
            if (group.length > 1) {
                const processedSubGroups: ClientInfo[][] = []
                group.forEach(c1 => {
                    let foundGroup = false
                    for (const subGroup of processedSubGroups) {
                        if (subGroup.some(c2 => isNamesSimilar(c1.name, c2.name))) {
                            subGroup.push(c1)
                            foundGroup = true
                            break
                        }
                    }
                    if (!foundGroup) processedSubGroups.push([c1])
                })
                processedSubGroups.forEach(sub => {
                    if (sub.length > 1) groups.push(sub)
                })
            }
        })

        // Очистка и фильтрация дублей
        const finalGroups: Array<{ label: string, clients: ClientInfo[] }> = []
        const seenGroupKeys = new Set<string>()

        groups.forEach(group => {
            const sortedClients = [...group].sort((a, b) => a.name.localeCompare(b.name))
            const groupKey = sortedClients.map(c => `${c.name}|${c.birthDate || ''}`).join(':::')

            if (seenGroupKeys.has(groupKey)) return
            seenGroupKeys.add(groupKey)

            const target = sortedClients[0]
            const targetTag = `${target.name}|${target.birthDate || ''}`

            const activeClients = sortedClients.filter((c, idx) => {
                if (idx === 0) return true
                const cTag = `${c.name}|${c.birthDate || ''}`
                const pairTag = [cTag, targetTag].sort().join(':::')
                return !c.ignoredIds.includes(pairTag) && !target.ignoredIds.includes(pairTag)
            })

            if (activeClients.length > 1) {
                let label = activeClients[0].name
                finalGroups.push({ label, clients: activeClients })
            }
        })

        console.log('Найдено групп дублей:', finalGroups.length);
        return finalGroups
    }, [initialData])

    const startMerge = (source: ClientInfo, target: ClientInfo) => {
        const hasConflict = normalizeName(source.name) !== normalizeName(target.name) || source.birthDate !== target.birthDate

        if (hasConflict) {
            setMergeConflict({
                source,
                target,
                chosenName: target.name,
                chosenBirthDate: target.birthDate
            })
        } else {
            confirmAndMerge(source, target, target.name, target.birthDate)
        }
    }

    const confirmAndMerge = async (source: ClientInfo, target: ClientInfo, finalName: string, finalBirth: string | null) => {
        // Собираем ID вообще всех записей: и из дубля, и из основной карточки
        // Это важно, так как если мы выбрали новые ФИО/ДР, их нужно прописать везде
        const allIds = [
            ...source.records.map(r => r.id),
            ...target.records.map(r => r.id)
        ].filter((id): id is string => !!id)

        console.log('Подготовка к объединению:', {
            sourceName: source.name,
            targetName: target.name,
            finalName,
            finalBirth,
            totalRecordsToUpdate: allIds.length
        })

        if (!confirm(`Объединить все записи (${allIds.length} шт.) в одну карточку ${finalName}?`)) return

        setMerging(true)
        try {
            await mergePatients(
                allIds, // Отправляем все ID
                {
                    name: finalName,
                    birthDate: finalBirth,
                    emoji: target.emoji || source.emoji,
                    notes: target.notes || source.notes
                }
            )
            console.log('Объединение завершено успешно');
            setMergeConflict(null)

            // В Next.js router.refresh() обновляет данные без полной перезагрузки страницы
            // Это сохраняет скролл и состояние открытых меню
            router.refresh();
        } catch (err) {
            console.error('Ошибка в CardIndexClient при объединении:', err);
            alert('Ошибка при объединении. Проверьте консоль браузера.');
        } finally {
            setMerging(false)
        }
    }

    const handleIgnoreDuplicate = async (source: ClientInfo, target: ClientInfo) => {
        if (!confirm(`Больше не показывать ${source.name} и ${target.name} как дубликаты?`)) return

        setMerging(true)
        try {
            await ignoreDuplicate(
                { name: source.name, birthDate: source.birthDate },
                { name: target.name, birthDate: target.birthDate }
            )
            router.refresh();
        } catch (err) {
            alert('Ошибка при сохранении');
        } finally {
            setMerging(false)
        }
    }

    // Сократим остальной код для краткости, оставив UI без изменений
    const doctors = useMemo(() => {
        const unique = new Set<string>()
        initialData.forEach(client => {
            client.records.forEach(r => { if (r[DB_COLUMNS.DOCTOR]) unique.add(r[DB_COLUMNS.DOCTOR] as string) })
        })
        return Array.from(unique).sort()
    }, [initialData])

    const nurses = useMemo(() => {
        const unique = new Set<string>()
        initialData.forEach(client => {
            client.records.forEach(r => { if (r[DB_COLUMNS.NURSE]) unique.add(r[DB_COLUMNS.NURSE] as string) })
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
                const matchesDoctor = !selectedDoctor || record[DB_COLUMNS.DOCTOR] === selectedDoctor
                const matchesNurse = !selectedNurse || record[DB_COLUMNS.NURSE] === selectedNurse
                let matchesDate = true
                if (record[DB_COLUMNS.DATE]) {
                    const recDate = record[DB_COLUMNS.DATE] as string
                    if (startDate && recDate < startDate) matchesDate = false
                    if (endDate && recDate > endDate) matchesDate = false
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
            await updatePatientProfile(selectedClient.name, selectedClient.birthDate, { [DB_COLUMNS.EMOJI]: newEmoji || undefined })
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
            await updatePatientProfile(selectedClient.name, selectedClient.birthDate, { [DB_COLUMNS.NOTES]: localNotes || undefined })
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

                <div className="bg-white rounded-[24px] p-6 shadow-sm mb-6 border border-gray-100 relative overflow-hidden text-left">
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
                                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 00.117-1.408l-7-14z" />
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

                <h3 className="text-xl font-bold text-gray-900 mb-4 px-2 text-left">История посещений</h3>
                <div className="space-y-4">
                    {selectedClient.records
                        .sort((a, b) => ((b[DB_COLUMNS.DATE] as string) || '').localeCompare((a[DB_COLUMNS.DATE] as string) || ''))
                        .map((record, index) => (
                            <div
                                key={record[DB_COLUMNS.ID] || index}
                                onClick={() => router.push(`/patients/${record[DB_COLUMNS.ID]}`)}
                                className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-50 cursor-pointer hover:border-blue-200 hover:shadow-md transition-all active:scale-[0.99] group text-left"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        {record[DB_COLUMNS.DATE] ? new Date(record[DB_COLUMNS.DATE] as string).toLocaleDateString('ru-RU') : 'Дата не указана'} {record[DB_COLUMNS.TIME] ? formatTime(record[DB_COLUMNS.TIME] as string) : ''}
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${record[DB_COLUMNS.STATUS]?.includes(RECORD_STATUS.COMPLETED) ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}`}>
                                        {record[DB_COLUMNS.STATUS] || RECORD_STATUS.WAITING}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <span className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Врач</span>
                                        <span className="text-sm font-medium text-gray-800">{record[DB_COLUMNS.DOCTOR] || '—'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Медсестра</span>
                                        <span className="text-sm font-medium text-gray-800">{record[DB_COLUMNS.NURSE] || '—'}</span>
                                    </div>
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
            {/* Модальное окно разрешения конфликтов */}
            {mergeConflict && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200 text-left">
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

            {/* Предпросмотр дубля */}
            {previewClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 text-left">
                    <div className="bg-white rounded-[28px] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 bg-amber-50 border-b border-amber-100">
                            <h4 className="text-amber-900 font-bold text-lg mb-1">Информация о дубле</h4>
                        </div>
                        <div className="p-6 space-y-4">
                            <div><span className="block text-[10px] text-gray-400 uppercase font-bold mb-1">ФИО</span><p className="text-gray-900 font-bold">{previewClient.name}</p></div>
                            <div><span className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Номер телефона</span><p className="text-blue-600 font-bold">{previewClient.phones.join(', ')}</p></div>
                            <div><span className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Дата рождения</span><p className="text-gray-900 font-medium">{previewClient.birthDate ? new Date(previewClient.birthDate).toLocaleDateString('ru-RU') : 'Не указана'}</p></div>
                        </div>
                        <div className="p-4 bg-gray-50"><button onClick={() => setPreviewClient(null)} className="w-full py-4 text-gray-700 font-bold bg-white border border-gray-200 rounded-2xl active:scale-95 transition-transform">Закрыть</button></div>
                    </div>
                </div>
            )}

            {/* Поиск */}
            <div className="relative">
                <input type="text" placeholder="Поиск по имени или телефону..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-5 py-4 pl-12 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>

            {/* Блок дублей */}
            {potentialDuplicates.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-[20px] p-5 shadow-sm text-left">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-amber-800 font-bold">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            Найдено дублей: {potentialDuplicates.length}
                        </div>
                        <button onClick={() => setShowDuplicates(!showDuplicates)} className="text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full uppercase tracking-wider">{showDuplicates ? 'Скрыть' : 'Показать'}</button>
                    </div>
                    {showDuplicates && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top duration-200 mt-4">
                            {potentialDuplicates.map((group, gIdx) => (
                                <div key={gIdx} className="bg-white rounded-xl p-4 border border-amber-200">
                                    <p className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-widest">{group.label}</p>
                                    <div className="space-y-3">
                                        {group.clients.map((c, cIdx) => (
                                            <div key={cIdx} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg gap-2">
                                                <div onClick={() => setPreviewClient(c)} className="cursor-pointer hover:opacity-70 transition-opacity flex-1 min-w-0">
                                                    <p className="font-bold text-gray-900 text-sm truncate">{c.name}</p>
                                                    <p className="text-xs text-gray-500">{c.birthDate || 'Без ДР'}</p>
                                                </div>
                                                {cIdx === 0 ? (
                                                    <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded uppercase shrink-0">Главная</span>
                                                ) : (
                                                    <div className="flex gap-2 shrink-0">
                                                        <button disabled={merging} onClick={(e) => { e.stopPropagation(); handleIgnoreDuplicate(c, group.clients[0]); }} className="text-[10px] font-bold text-gray-400 hover:text-red-500 px-2 py-1 transition-colors">Не объед.</button>
                                                        <button disabled={merging} onClick={(e) => { e.stopPropagation(); startMerge(c, group.clients[0]); }} className="text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg active:scale-95 transition-all">Объединить</button>
                                                    </div>
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

            {/* Основной список */}
            <button onClick={() => setShowFilters(!showFilters)} className={`w-full px-5 py-3 rounded-2xl font-medium transition-colors flex items-center justify-between ${showFilters || hasActiveFilters ? 'bg-blue-100 text-blue-700 border-2 border-blue-200' : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'}`}>
                <div className="flex items-center gap-2">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                    <span>Фильтры {hasActiveFilters && '(активны)'}</span>
                </div>
                <svg className={`h-5 w-5 transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showFilters && (
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 space-y-4 animate-in slide-in-from-top duration-200 text-left">
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
                        <div key={idx} onClick={() => setSelectedClient(client)} className="bg-white p-5 rounded-[20px] shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer flex justify-between items-center group overflow-hidden relative text-left">
                            <div className="flex-1"><div className="flex items-center gap-2 mb-1">{client.emoji && <span className="text-2xl">{client.emoji}</span>}<h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{client.name}</h3></div><p className="text-sm text-gray-500 font-medium ml-1">{client.birthDate ? new Date(client.birthDate).toLocaleDateString('ru-RU') : 'Дата рождения не указана'}</p><div className="flex gap-2 mt-2 ml-1"><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-bold text-left">{client.records.length} {client.records.length === 1 ? 'посещение' : client.records.length < 5 ? 'посещения' : 'посещений'}</span></div></div><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-300 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 text-gray-400">Никто не найден</div>
                )}
            </div>
        </div>
    )
}
