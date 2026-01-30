import React from 'react'

interface FiltersPanelProps {
    showFilters: boolean
    setShowFilters: (show: boolean) => void
    selectedDoctor: string
    setSelectedDoctor: (doctor: string) => void
    selectedNurse: string
    setSelectedNurse: (nurse: string) => void
    startDate: string
    setStartDate: (date: string) => void
    endDate: string
    setEndDate: (date: string) => void
    doctors: string[]
    nurses: string[]
    hasActiveFilters: boolean | string | null | undefined
}

export const FiltersPanel: React.FC<FiltersPanelProps> = ({
    showFilters,
    setShowFilters,
    selectedDoctor,
    setSelectedDoctor,
    selectedNurse,
    setSelectedNurse,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    doctors,
    nurses,
    hasActiveFilters
}) => {
    return (
        <div className="space-y-4 mb-6">
            <button
                onClick={() => setShowFilters(!showFilters)}
                className={`w-full px-5 py-3 rounded-2xl font-medium transition-colors flex items-center justify-between ${showFilters || hasActiveFilters ? 'bg-blue-100 text-blue-700 border-2 border-blue-200' : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'}`}
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
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 space-y-4 animate-in slide-in-from-top duration-200 text-left">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Врач</label>
                            <select
                                value={selectedDoctor}
                                onChange={(e) => setSelectedDoctor(e.target.value)}
                                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm"
                            >
                                <option value="">Все врачи</option>
                                {doctors.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Медсестра</label>
                            <select
                                value={selectedNurse}
                                onChange={(e) => setSelectedNurse(e.target.value)}
                                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm"
                            >
                                <option value="">Все медсестры</option>
                                {nurses.map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Диапазон дат записи</label>
                        <div className="flex gap-2 items-center">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="flex-1 p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm"
                            />
                            <span className="text-gray-300">—</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="flex-1 p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm"
                            />
                        </div>
                    </div>
                    {hasActiveFilters && (
                        <button
                            onClick={() => { setSelectedDoctor(''); setSelectedNurse(''); setStartDate(''); setEndDate('') }}
                            className="w-full py-3 text-red-600 font-bold text-sm bg-red-50 rounded-xl"
                        >
                            Сбросить все
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
