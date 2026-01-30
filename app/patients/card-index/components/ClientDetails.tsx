import React from 'react'
import Link from 'next/link'
import { ClientInfo } from '../types'
import { EMOJI_SET, DB_COLUMNS } from '@/lib/constants'
import { AddRecordModal } from './AddRecordModal'

interface ClientDetailsProps {
    selectedClient: ClientInfo
    setSelectedClient: (client: ClientInfo | null) => void
    isUpdating: boolean
    handleEmojiSelect: (newEmoji: string) => Promise<void>
    handleDeleteRecord: (id: string) => Promise<void>
    handleSaveNotes: () => Promise<void>
    localNotes: string
    setLocalNotes: (notes: string) => void
    isAddingRecord: boolean
    setIsAddingRecord: (show: boolean) => void
    newRecord: {
        date: string
        time: string
        doctor: string
        nurse: string
        teeth: string
        notes: string
        status: string
    }
    setNewRecord: (record: any) => void
    doctors: string[]
    nurses: string[]
    handleAddRecord: () => Promise<void>
}

export const ClientDetails: React.FC<ClientDetailsProps> = ({
    selectedClient,
    setSelectedClient,
    isUpdating,
    handleEmojiSelect,
    handleDeleteRecord,
    handleSaveNotes,
    localNotes,
    setLocalNotes,
    isAddingRecord,
    setIsAddingRecord,
    newRecord,
    setNewRecord,
    doctors,
    nurses,
    handleAddRecord
}) => {
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
                            <span className="font-bold">{new Date(selectedClient.birthDate).toLocaleDateString('ru-RU')}</span>
                        </div>
                    )}
                    <div className="flex items-start text-gray-600">
                        <span className="w-32 text-gray-400 font-medium text-sm uppercase tracking-wider pt-1">Телефоны</span>
                        <div className="flex flex-wrap gap-2">
                            {selectedClient.phones.map(p => (
                                <span key={p} className="bg-gray-100 px-3 py-1 rounded-lg text-sm font-bold text-gray-700">{p}</span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-50 pt-6 mt-6">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-3 tracking-widest">Личная реакция</label>
                    <div className="flex flex-wrap gap-3">
                        {EMOJI_SET.map(e => (
                            <button
                                key={e}
                                onClick={() => handleEmojiSelect(e)}
                                className={`text-2xl p-2 rounded-xl transition-all hover:scale-125 ${selectedClient.emoji === e ? 'bg-blue-50 ring-2 ring-blue-500 scale-110' : 'hover:bg-gray-50'}`}
                            >
                                {e}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[24px] p-6 shadow-sm mb-6 border border-gray-100 text-left">
                <div className="flex items-center justify-between mb-4">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Заметки о пациенте</label>
                    <button
                        onClick={handleSaveNotes}
                        disabled={isUpdating || (localNotes || '') === (selectedClient.notes || '')}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 disabled:opacity-30"
                    >
                        Сохранить
                    </button>
                </div>
                <textarea
                    value={localNotes || ''}
                    onChange={(e) => setLocalNotes(e.target.value)}
                    placeholder="Напишите особенности пациента, аллергии или важные нюансы..."
                    className="w-full min-h-[100px] p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-blue-500 transition-all outline-none text-gray-700 leading-relaxed"
                />
            </div>

            <div className="mb-6 flex items-center justify-between px-2">
                <h3 className="text-xl font-bold text-gray-900">История приемов</h3>
                <button
                    onClick={() => setIsAddingRecord(true)}
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Добавить запись
                </button>
            </div>

            <div className="space-y-4 mb-20">
                {selectedClient.records.sort((a, b) => {
                    const dateA = (a[DB_COLUMNS.DATE] as string) || '';
                    const dateB = (b[DB_COLUMNS.DATE] as string) || '';
                    return dateB.localeCompare(dateA);
                }).map((record, idx) => (
                    <div key={record[DB_COLUMNS.ID] || idx} className="bg-white rounded-[24px] shadow-sm border border-gray-100 relative group text-left transition-all hover:shadow-md hover:border-blue-100">
                        <Link href={`/patients/${record[DB_COLUMNS.ID]}`} className="block p-6">
                            <div className="flex justify-between items-start mb-4 pr-8">
                                <div>
                                    <div className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                                        {record[DB_COLUMNS.DATE] ? new Date(record[DB_COLUMNS.DATE] as string).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Дата не указана'}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">
                                            {(record[DB_COLUMNS.TIME] as string || '').split(':').slice(0, 2).join(':')}
                                        </span>
                                        <span className="text-sm text-gray-400 font-medium">Статус: <span className="text-gray-900 font-bold">{record[DB_COLUMNS.STATUS] || '—'}</span></span>
                                    </div>
                                </div>
                                <div className="text-blue-400 opacity-0 group-hover:opacity-100 transition-all">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-50/50">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Врач</label>
                                    <div className="text-sm font-bold text-gray-700 truncate">{record[DB_COLUMNS.DOCTOR] || '—'}</div>
                                </div>
                                <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-50/50">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Медсестра</label>
                                    <div className="text-sm font-bold text-gray-700 truncate">{record[DB_COLUMNS.NURSE] || '—'}</div>
                                </div>
                            </div>

                            {record[DB_COLUMNS.COMMENT] && (
                                <div className="bg-blue-50/30 p-4 rounded-xl text-sm text-gray-600 leading-relaxed italic border-l-4 border-blue-200">
                                    {record[DB_COLUMNS.COMMENT]}
                                </div>
                            )}
                        </Link>

                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (confirm('Вы уверены, что хотите удалить эту запись?')) {
                                    handleDeleteRecord(record[DB_COLUMNS.ID] as string)
                                }
                            }}
                            className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-all p-2 z-10 bg-white/80 rounded-full hover:bg-red-50"
                            title="Удалить запись"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                ))}
            </div>

            <AddRecordModal
                isAddingRecord={isAddingRecord}
                setIsAddingRecord={setIsAddingRecord}
                newRecord={newRecord}
                setNewRecord={setNewRecord}
                doctors={doctors}
                nurses={nurses}
                handleAddRecord={handleAddRecord}
                isUpdating={isUpdating}
            />
        </div>
    )
}
