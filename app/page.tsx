import DashboardClient from './DashboardClient'
import { GoogleAuthHandler } from './patients/GoogleAuthHandler'

export default function HomePage() {
  return (
    <>
      <GoogleAuthHandler />
      <DashboardClient />
    </>
  )
}
