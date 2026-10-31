import { createFileRoute } from '@tanstack/react-router'
import { ModulePlaceholder } from '../components/shell/ModulePlaceholder'

/**
 * Attendance — placeholder.
 *
 * Gated by the `attendance` module and the `attendance.view` permission.
 */
export const Route = createFileRoute('/dashboard/attendance')({
  component: AttendancePlaceholder,
})

function AttendancePlaceholder() {
  return <ModulePlaceholder navKey="attendance" />
}
