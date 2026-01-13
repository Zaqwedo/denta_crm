'use client'

import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  isVisible: boolean
  onHide: () => void
}

export function Toast({ message, isVisible, onHide }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onHide()
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [isVisible, onHide])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100] pointer-events-none">
      <div
        className={`bg-green-500 text-white px-6 py-4 rounded-2xl shadow-lg flex items-center gap-3 transform transition-all duration-300 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        <div className="text-2xl">✅</div>
        <span className="font-medium">{message}</span>
      </div>
    </div>
  )
}

// Global toast state manager
class ToastManager {
  private static listeners: ((message: string | null) => void)[] = []

  static subscribe(listener: (message: string | null) => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  static show(message: string) {
    this.listeners.forEach(listener => listener(message))
    setTimeout(() => {
      this.listeners.forEach(listener => listener(null))
    }, 2000)
  }
}

export { ToastManager }