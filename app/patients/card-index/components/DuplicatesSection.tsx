import React from 'react'
import { ClientInfo } from '../types'

interface DuplicatesSectionProps {
    potentialDuplicates: Array<{ label: string, clients: ClientInfo[] }>
    showDuplicates: boolean
    setShowDuplicates: (show: boolean) => void
    merging: boolean
    handleIgnoreDuplicate: (target: ClientInfo, source: ClientInfo) => Promise<void>
    startMerge: (target: ClientInfo, sources: ClientInfo[]) => Promise<void>
    setPreviewClient: (client: ClientInfo | null) => void
}

export const DuplicatesSection: React.FC<DuplicatesSectionProps> = ({
    potentialDuplicates,
    showDuplicates,
    setShowDuplicates,
    merging,
    handleIgnoreDuplicate,
    startMerge,
    setPreviewClient
}) => {
    if (potentialDuplicates.length === 0) return null

    return (
        <div className="mb-8 overflow-hidden rounded-[24px] border border-yellow-200">
            <button
                onClick={() => setShowDuplicates(!showDuplicates)}
                className={`w-full p-4 flex items-center justify-between text-left transition-colors ${showDuplicates ? 'bg-yellow-50 text-yellow-800' : 'bg-yellow-100 text-yellow-900'}`}
            >
                <div className="flex items-center gap-3">
                    <div className="bg-yellow-400 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold animate-pulse">
                        {potentialDuplicates.length}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Возможные дубликаты</h3>
                        <p className="text-xs opacity-75 font-medium underline decoration-dotted">Посмотреть и объединить</p>
                    </div>
                </div>
                <svg className={`h-6 w-6 transition-transform ${showDuplicates ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {showDuplicates && (
                <div className="bg-yellow-50/50 p-6 space-y-6 animate-in slide-in-from-top duration-300">
                    {potentialDuplicates.map((group, gIdx) => (
                        <div key={gIdx} className="bg-white rounded-[20px] p-5 shadow-sm border border-yellow-100 space-y-4">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-bold text-gray-900 border-l-4 border-yellow-400 pl-3">Группа: {group.label}</h4>
                                <div className="flex gap-2">
                                    <button
                                        disabled={merging}
                                        onClick={() => startMerge(group.clients[0], group.clients.slice(1))}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95"
                                    >
                                        Объединить всех
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {group.clients.map((client, cIdx) => (
                                    <div key={cIdx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                                        <div className="flex items-center gap-4 mb-3 sm:mb-0">
                                            <span className="text-2xl">{client.emoji}</span>
                                            <div className="text-left">
                                                <div className="font-bold text-gray-900">{client.name}</div>
                                                <div className="text-xs text-gray-500 font-medium">Тел: {client.phones.join(', ')}</div>
                                                <div className="text-xs text-gray-500 font-medium">ДР: {client.birthDate ? new Date(client.birthDate).toLocaleDateString() : '—'}</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                            <button
                                                onClick={() => setPreviewClient(client)}
                                                className="px-3 py-1.5 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg text-xs font-bold transition-colors"
                                            >
                                                Просмотр
                                            </button>
                                            {cIdx > 0 && (
                                                <button
                                                    disabled={merging}
                                                    onClick={() => handleIgnoreDuplicate(group.clients[0], client)}
                                                    className="px-3 py-1.5 bg-white text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg text-xs font-bold transition-all"
                                                >
                                                    Это не дубль
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
