'use client'

import { useState, useEffect } from 'react'
import { Menu } from 'lucide-react'
import { SideMenu } from './SideMenu'
import { handleGetDashboardStats } from '../patients/actions'

interface HeaderProps {
    title?: React.ReactNode
    subtitle?: string
    onBack?: () => void
}

export function Header({ title, subtitle, onBack }: HeaderProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isAdmin, setIsAdmin] = useState(false)

    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const res = await handleGetDashboardStats()
                if (res.success && res.data) {
                    setIsAdmin(res.data.isAdmin)
                }
            } catch (e) {
                console.error('Error checking admin status in Header:', e)
            }
        }
        checkAdmin()
    }, [])

    return (
        <>
            <SideMenu
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                isAdmin={isAdmin}
            />
            <div className="flex items-center gap-3 mb-8">
                {onBack ? (
                    <button
                        onClick={onBack}
                        className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 text-gray-600 hover:text-blue-600 transition-colors shrink-0"
                        aria-label="Назад"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                ) : (
                    <button
                        onClick={() => setIsMenuOpen(true)}
                        className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 text-gray-600 hover:text-blue-600 transition-colors shrink-0"
                        aria-label="Открыть меню"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                )}
                <div className="flex-1 min-w-0">
                    <div className="text-2xl font-black text-gray-900 leading-tight">
                        {title}
                    </div>
                    {subtitle && (
                        <p className="text-gray-600 text-base mt-1">
                            {subtitle}
                        </p>
                    )}
                </div>
                {onBack && (
                    <button
                        onClick={() => setIsMenuOpen(true)}
                        className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 text-gray-600 hover:text-blue-600 transition-colors shrink-0"
                        aria-label="Открыть меню"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                )}
            </div>
        </>
    )
}
