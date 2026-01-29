import type { Metadata } from 'next'
import './globals.css'
import { GlobalToast } from './patients/GlobalToast'
import { AuthProvider } from './contexts/AuthContext'

export const metadata: Metadata = {
  title: 'Denta CRM',
  description: 'Система управления записями пациентов',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body>
        <AuthProvider>
          {children}
          <GlobalToast />
        </AuthProvider>
      </body>
    </html>
  )
}
