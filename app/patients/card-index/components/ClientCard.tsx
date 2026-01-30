import React from 'react'
import { ClientInfo } from '../types'

interface ClientCardProps {
    client: ClientInfo
    onClick: (client: ClientInfo) => void
}

export const ClientCard: React.FC<ClientCardProps> = ({ client, onClick }) => {
    return (
        <div
            onClick={() => onClick(client)}
            className="bg-white p-5 rounded-[20px] shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer flex justify-between items-center group overflow-hidden relative text-left h-full"
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
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-bold text-left">
                        {client.records.length} {client.records.length === 1 ? 'посещение' : client.records.length < 5 ? 'посещения' : 'посещений'}
                    </span>
                </div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-300 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
        </div>
    )
}
