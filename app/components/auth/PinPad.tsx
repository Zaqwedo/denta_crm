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
        <div className="grid grid-cols-3 gap-2 max-w-[260px] mx-auto">
            {numbers.map((item, index) => {
                if (item === '') return <div key={`empty-${index}`} />

                if (item === 'delete') {
                    return (
                        <button
                            key="delete"
                            onClick={onDeleteClick}
                            disabled={disabled}
                            className="flex items-center justify-center h-14 w-14 rounded-full text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-90 transition-all duration-150 disabled:opacity-50"
                        >
                            <Delete size={22} />
                        </button>
                    )
                }

                return (
                    <button
                        key={item}
                        onClick={() => onNumberClick(item)}
                        disabled={disabled}
                        className="flex items-center justify-center h-14 w-14 rounded-full bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 shadow-sm text-2xl font-bold text-gray-700 dark:text-white hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 active:scale-95 active:bg-blue-50 dark:active:bg-blue-900/30 transition-all duration-150 disabled:opacity-50"
                    >
                        {item}
                    </button>
                )
            })}
        </div>
    )
}
