import { CalendarView } from '../patients/CalendarView'
import { TabBar } from '../patients/TabBar'
import { ProtectedRoute } from '../components/ProtectedRoute'

export default function CalendarPage() {
  return (
    <ProtectedRoute>
      <div className="pb-20"> {/* Padding bottom for tab bar */}
        <CalendarView />
        <TabBar />
      </div>
    </ProtectedRoute>
  )
}