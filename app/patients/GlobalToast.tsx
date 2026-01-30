'use client'

import { useState, useEffect } from 'react'
import { ToastManager, ToastType } from './Toast'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

export function GlobalToast() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const unsubscribe = ToastManager.subscribe((options) => {
      if (options) {
        setToast({ message: options.message, type: options.type || 'success' })
        setIsVisible(true)

        const timer = setTimeout(() => {
          setIsVisible(false)
          setTimeout(() => setToast(null), 300) // Cleanup after animation
        }, options.duration || 3000)

        return () => clearTimeout(timer)
      } else {
        setIsVisible(false)
        setTimeout(() => setToast(null), 300)
      }
    })

    return unsubscribe
  }, [])

  if (!toast) return null

  const config = {
    success: {
      bg: 'bg-white',
      border: 'border-green-100',
      icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
      textColor: 'text-gray-800'
    },
    error: {
      bg: 'bg-white',
      border: 'border-red-100',
      icon: <AlertCircle className="w-5 h-5 text-red-500" />,
      textColor: 'text-gray-800'
    },
    info: {
      bg: 'bg-white',
      border: 'border-blue-100',
      icon: <Info className="w-5 h-5 text-blue-500" />,
      textColor: 'text-gray-800'
    }
  }[toast.type]

  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[999] pointer-events-none px-4 w-full max-w-sm">
      <div
        className={`${config.bg} ${config.border} border shadow-2xl rounded-2xl p-4 flex items-center gap-3 transform transition-all duration-500 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] ${isVisible ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95'
          }`}
      >
        <div className="flex-shrink-0">
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${config.textColor} leading-tight`}>
            {toast.message}
          </p>
        </div>
        <button
          onClick={() => ToastManager.hide()}
          className="flex-shrink-0 p-1 hover:bg-gray-50 rounded-full transition-colors pointer-events-auto"
        >
          <X className="w-4 h-4 text-gray-300" />
        </button>
      </div>
    </div>
  )
}