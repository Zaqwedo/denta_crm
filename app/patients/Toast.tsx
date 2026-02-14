'use client'

export type ToastType = 'success' | 'error' | 'info'

interface ToastOptions {
  message: string
  type?: ToastType
  duration?: number
}

// Global toast state manager
class ToastManager {
  private static listeners: ((options: ToastOptions | null) => void)[] = []

  static subscribe(listener: (options: ToastOptions | null) => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  static success(message: string, duration = 3000) {
    this.show({ message, type: 'success', duration })
  }

  static error(message: string, duration = 4000) {
    this.show({ message, type: 'error', duration })
  }

  static info(message: string, duration = 3000) {
    this.show({ message, type: 'info', duration })
  }

  private static show(options: ToastOptions) {
    this.listeners.forEach(listener => listener(options))
  }

  static hide() {
    this.listeners.forEach(listener => listener(null))
  }
}

export { ToastManager }
