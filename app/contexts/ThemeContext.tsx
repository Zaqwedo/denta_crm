'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
    theme: Theme
    setTheme: (theme: Theme) => void
    effectiveTheme: 'light' | 'dark' // Реальная тема с учетом системной
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('system')
    const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light')

    // Определяем системную тему
    const getSystemTheme = (): 'light' | 'dark' => {
        if (typeof window === 'undefined') return 'light'
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }

    // Вычисляем эффективную тему
    const calculateEffectiveTheme = (currentTheme: Theme): 'light' | 'dark' => {
        if (currentTheme === 'system') {
            return getSystemTheme()
        }
        return currentTheme
    }

    // Загружаем сохраненную тему при монтировании
    useEffect(() => {
        console.log('🚀 ThemeProvider mounted')
        const savedTheme = localStorage.getItem('denta_theme') as Theme
        console.log('💾 Saved theme from localStorage:', savedTheme)

        if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
            console.log('✅ Valid saved theme, using:', savedTheme)
            setThemeState(savedTheme)
            const effective = calculateEffectiveTheme(savedTheme)
            console.log('🎯 Calculated effective theme:', effective)
            setEffectiveTheme(effective)
        } else {
            console.log('⚠️ No valid saved theme, using system theme')
            const systemTheme = getSystemTheme()
            console.log('🖥️ System theme:', systemTheme)
            setEffectiveTheme(systemTheme)
        }
    }, [])

    // Слушаем изменения системной темы
    useEffect(() => {
        if (typeof window === 'undefined') return

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

        const handleChange = () => {
            if (theme === 'system') {
                setEffectiveTheme(getSystemTheme())
            }
        }

        mediaQuery.addEventListener('change', handleChange)
        return () => mediaQuery.removeEventListener('change', handleChange)
    }, [theme])

    // Применяем тему к документу
    useEffect(() => {
        const root = document.documentElement

        console.log('📄 Applying theme to document:', effectiveTheme)

        if (effectiveTheme === 'dark') {
            root.classList.add('dark')
            console.log('✅ Added dark class to html')
        } else {
            root.classList.remove('dark')
            console.log('✅ Removed dark class from html')
        }

        console.log('📄 Current html classes:', root.className)
    }, [effectiveTheme])

    const setTheme = (newTheme: Theme) => {
        console.log('🎨 Switching theme to:', newTheme)
        setThemeState(newTheme)
        const effective = calculateEffectiveTheme(newTheme)
        console.log('🎨 Effective theme:', effective)
        setEffectiveTheme(effective)
        localStorage.setItem('denta_theme', newTheme)
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme, effectiveTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }
    return context
}
