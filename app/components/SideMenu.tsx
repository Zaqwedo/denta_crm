'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import {
    Home,
    List,
    Calendar,
    Users,
    History,
    Shield,
    LogOut,
    X,
    ChevronRight
} from 'lucide-react'

interface SideMenuProps {
    isOpen: boolean
    onClose: () => void
    isAdmin: boolean
}

export function SideMenu({ isOpen, onClose, isAdmin }: SideMenuProps) {
    const pathname = usePathname()
    const router = useRouter()
    const { logout, setIsPinSetupOpen } = useAuth()

    const menuItems = [
        { name: 'Главная', href: '/', icon: Home },
        { name: 'Записи', href: '/patients', icon: List },
        { name: 'Календарь', href: '/calendar', icon: Calendar },
        { name: 'Картотека', href: '/patients/card-index', icon: Users },
        { name: 'Изменения', href: '/patients/changes', icon: History },
        ...(isAdmin ? [{ name: 'Админ панель', href: '/admin/dashboard', icon: Shield }] : []),
    ]

    const handleLogout = () => {
        logout()
        router.push('/login')
        onClose()
    }

    const isActive = (href: string) => {
        if (!pathname) return false

        // Для главной страницы - точное совпадение
        if (href === '/') return pathname === '/'

        // Находим все пункты меню, которые совпадают с текущим путем
        const matchingItems = menuItems.filter(item => {
            if (item.href === '/') return false // Главную уже проверили
            return pathname.startsWith(item.href)
        })

        // Если нет совпадений, возвращаем false
        if (matchingItems.length === 0) return false

        // Находим самый длинный (наиболее специфичный) путь
        const mostSpecific = matchingItems.reduce((prev, current) =>
            current.href.length > prev.href.length ? current : prev
        )

        // Активен только самый специфичный путь
        return href === mostSpecific.href
    }

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000] transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={onClose}
            />

            {/* Sidebar */}
            <div
                className={`fixed top-0 left-0 bottom-0 w-80 bg-white z-[1001] shadow-2xl transform transition-transform duration-500 ease-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {/* Header */}
                <div className="p-5 border-b border-gray-50 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-blue-600">Denta CRM</h2>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Stomatology System</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto py-4 px-3">
                    <nav className="space-y-1">
                        {menuItems.map((item) => {
                            const Icon = item.icon
                            const active = isActive(item.href)
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={onClose}
                                    className={`flex items-center justify-between p-3 rounded-2xl transition-all duration-200 group ${active
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                        : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-400 group-hover:text-blue-500'}`} />
                                        <span className="font-bold text-sm">{item.name}</span>
                                    </div>
                                    <ChevronRight className={`w-4 h-4 ${active ? 'opacity-50' : 'opacity-0'}`} />
                                </Link>
                            )
                        })}
                    </nav>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-gray-50 space-y-1">
                    <button
                        onClick={() => {
                            onClose()
                            setIsPinSetupOpen(true)
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-2xl text-blue-600 font-bold hover:bg-blue-50 transition-colors text-sm"
                    >
                        <Shield className="w-5 h-5" />
                        <span>Безопасность (PIN)</span>
                    </button>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 p-3 rounded-2xl text-red-500 font-bold hover:bg-red-50 transition-colors text-sm"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Выйти из аккаунта</span>
                    </button>
                </div>
            </div>
        </>
    )
}
