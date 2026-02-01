'use client'

import React from 'react'
import { Delete } from 'lucide-react'

interface PinPadProps {
    onNumberClick: (num: string) => void
    onDeleteClick: () => void
    disabled?: boolean
}

export const PinPad: React.FC<PinPadProps> = ({ onNumberClick, onDeleteClick, disabled }) => {
    const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete']

    return (
        <div className="grid grid-cols-3 gap-4 max-w-[280px] mx-auto">
            {numbers.map((item, index) => {
                if (item === '') return <div key={`empty-${index}`} />

                if (item === 'delete') {
                    return (
                        <button
                            key="delete"
                            onClick={onDeleteClick}
                            disabled={disabled}
                            className="flex items-center justify-center h-16 w-16 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 active:scale-90 transition-all duration-150 disabled:opacity-50"
                        >
                            <Delete size={24} />
                        </button>
                    )
                }

                return (
                    <button
                        key={item}
                        onClick={() => onNumberClick(item)}
                        disabled={disabled}
                        className="flex items-center justify-center h-16 w-16 rounded-full bg-white border border-gray-100 shadow-sm text-2xl font-semibold text-gray-700 hover:border-blue-400 hover:text-blue-600 active:scale-95 active:bg-blue-50 transition-all duration-150 disabled:opacity-50"
                    >
                        {item}
                    </button>
                )
            })}
        </div>
    )
}
