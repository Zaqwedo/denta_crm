'use client'

import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()

    const themes = [
        { value: 'light' as const, icon: Sun, label: 'Светлая' },
        { value: 'dark' as const, icon: Moon, label: 'Темная' },
        { value: 'system' as const, icon: Monitor, label: 'Системная' },
    ]

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-2 shadow-sm border border-gray-100 dark:border-gray-700 inline-flex gap-1 relative z-10">
            {themes.map(({ value, icon: Icon, label }) => (
                <button
                    type="button"
                    key={value}
                    onClick={() => {
                        console.log('🔘 Theme button clicked:', value)
                        setTheme(value)
                    }}
                    className={`p-2.5 rounded-xl transition-all ${theme === value
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    title={label}
                    aria-label={label}
                >
                    <Icon className="w-5 h-5" />
                </button>
            ))}
        </div>
    )
}
