import { CalendarView } from '../patients/CalendarView'
import { ProtectedRoute } from '../components/ProtectedRoute'

export default function CalendarPage() {
  return (
    <ProtectedRoute>
      <div className="pb-20"> {/* Padding bottom for navigation spacing */}
        <CalendarView />
      </div>
    </ProtectedRoute>
  )
}