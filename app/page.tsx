import { Suspense } from 'react'
import DashboardClient from './DashboardClient'
import { GoogleAuthHandler } from './patients/GoogleAuthHandler'

export default function HomePage() {
  return (
    <>
      <Suspense fallback={null}>
        <GoogleAuthHandler />
      </Suspense>
      <DashboardClient />
    </>
  )
}
