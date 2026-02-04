import React from 'react'
import { DB_COLUMNS } from '@/lib/constants'
import { NewRecord } from '../types'

interface AddRecordModalProps {
    isAddingRecord: boolean
    setIsAddingRecord: (show: boolean) => void
    newRecord: NewRecord
    setNewRecord: (record: NewRecord) => void
    doctors: string[]
    nurses: string[]
    handleAddRecord: () => Promise<void>
    isUpdating: boolean
}

export const AddRecordModal: React.FC<AddRecordModalProps> = ({
    isAddingRecord,
    setIsAddingRecord,
    newRecord,
    setNewRecord,
    doctors,
    nurses,
    handleAddRecord,
    isUpdating
}) => {
    if (!isAddingRecord) return null

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
            <div
                className="bg-white w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-500 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-bold text-gray-900">Добавить запись</h3>
                    <button onClick={() => setIsAddingRecord(false)} className="text-gray-400 hover:text-gray-600 p-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Дата</label>
                            <input
                                type="date"
                                value={newRecord.date}
                                onChange={(e) => setNewRecord({ ...newRecord, date: e.target.value })}
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-blue-500 transition-all outline-none appearance-none min-h-[56px] text-gray-900"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Время</label>
                            <input
                                type="time"
                                value={newRecord.time}
                                onChange={(e) => setNewRecord({ ...newRecord, time: e.target.value })}
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-blue-500 transition-all outline-none appearance-none min-h-[56px] text-gray-900"
                                style={{ WebkitAppearance: 'none' }}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Врач</label>
                            <select
                                value={newRecord.doctor}
                                onChange={(e) => setNewRecord({ ...newRecord, doctor: e.target.value })}
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl appearance-none focus:bg-white focus:border-blue-500 transition-all outline-none"
                            >
                                <option value="">Не выбран</option>
                                {doctors.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Медсестра</label>
                            <select
                                value={newRecord.nurse}
                                onChange={(e) => setNewRecord({ ...newRecord, nurse: e.target.value })}
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl appearance-none focus:bg-white focus:border-blue-500 transition-all outline-none"
                            >
                                <option value="">Не выбрана</option>
                                {nurses.map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Статус</label>
                        <select
                            value={newRecord.status}
                            onChange={(e) => setNewRecord({ ...newRecord, status: e.target.value })}
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl appearance-none focus:bg-white focus:border-blue-500 transition-all outline-none"
                        >
                            <option value="Ожидает">Ожидает</option>
                            <option value="Подтвержден">Подтвержден</option>
                            <option value="Отменен">Отменен</option>
                            <option value="Завершен">Завершен</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Комментарий к приему</label>
                        <textarea
                            rows={3}
                            value={newRecord.notes}
                            onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-blue-500 transition-all outline-none resize-none"
                        />
                    </div>

                    <button
                        onClick={handleAddRecord}
                        disabled={isUpdating || !newRecord.date}
                        className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-[0.98]"
                    >
                        {isUpdating ? 'Добавление...' : 'Подтвердить запись'}
                    </button>
                </div>
            </div>
        </div>
    )
}
