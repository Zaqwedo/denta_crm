'use client'

import { useState, useEffect } from 'react'
import { ToastManager } from './Toast'

export function GlobalToast() {
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = ToastManager.subscribe((message) => {
      setToastMessage(message)
    })

    return unsubscribe
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center">
      <div
        className={`bg-green-500 text-white px-6 py-4 rounded-2xl shadow-lg flex items-center gap-3 transform transition-all duration-300 ${
          toastMessage ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        <div className="text-2xl">✅</div>
        <span className="font-medium">{toastMessage || ''}</span>
      </div>
    </div>
  )
}