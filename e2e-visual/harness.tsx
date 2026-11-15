/**
 * A visual harness for the appointments surfaces.
 *
 * This is a DEVELOPMENT-ONLY page (not part of the app bundle's entry graph): it mounts
 * the real components with fixture data so a headless browser can measure their layout
 * at real viewport widths. It exists because the full dashboard needs an API, a
 * database and an authenticated tenant, none of which a layout check should require.
 *
 * Pick a surface with `?surface=`:
 *   timeline-day | timeline-week | timeline-month | calendar-day | calendar-week |
 *   calendar-month | table | filters
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  AppointmentCalendar,
  AppointmentFilters,
  AppointmentTable,
  AppointmentTimeline,
} from '../src/components/appointments'
import type { AppointmentRow } from '../src/lib/appointments'
import { DEFAULT_APPOINTMENT_FILTERS } from '../src/lib/appointments'
import type {
  PublicOpeningHours,
  ServiceDashboardItem,
  StaffDashboardItem,
} from '../src/lib/api/types'
import '../src/index.css'

const BUSINESS = 'biz-1'
const DAY = '2026-05-12' // a Tuesday
const STAFF: StaffDashboardItem[] = [
  { userId: 'staff-1', fullName: 'Amara Okafor', email: 'amara@example.test', avatarUrl: null, phoneNumber: null },
  { userId: 'staff-2', fullName: 'Brian Mwangi', email: 'brian@example.test', avatarUrl: null, phoneNumber: null },
]
const SERVICES: ServiceDashboardItem[] = [
  { id: 'svc-1', name: 'Signature treatment', description: null, durationMinutes: 60, price: 3500, isActive: true, showcase: true },
  { id: 'svc-2', name: 'Express trim', description: null, durationMinutes: 30, price: 1200, isActive: true, showcase: true },
]

const HOURS: PublicOpeningHours = {
  businessId: BUSINESS,
  timeZoneId: 'Africa/Nairobi',
  hasStaffSchedule: true,
  days: [
    { day: 'sunday', dayOfWeek: 0, isClosed: true, periods: [] },
    ...['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map((day, index) => ({
      day,
      dayOfWeek: index + 1,
      isClosed: false,
      periods: [{ opensAt: '09:00', closesAt: '18:00', breakStartsAt: null, breakEndsAt: null }],
    })),
    {
      day: 'saturday',
      dayOfWeek: 6,
      isClosed: false,
      periods: [{ opensAt: '10:00', closesAt: '14:00', breakStartsAt: null, breakEndsAt: null }],
    },
  ],
  specialHours: [],
}

/** `hour` is business-local (Nairobi, UTC+3). */
function at(
  date: string,
  hour: string,
  minute: number,
  durationMinutes: number,
  index: number,
  status = 'booked',
  staff = 0,
): AppointmentRow {
  const local = new Date(`${date}T${hour}:${String(minute).padStart(2, '0')}:00+03:00`)
  const start = local.toISOString()
  const end = new Date(local.getTime() + durationMinutes * 60_000).toISOString()
  const service = SERVICES[index % SERVICES.length]
  return {
    id: `appt-${index}`,
    businessId: BUSINESS,
    scheduledAt: start,
    endAt: end,
    status,
    customerId: `cus-${index}`,
    customerName: `Client ${index + 1} With A Long Name`,
    customerEmail: `client${index}@example.test`,
    customerPhone: '+254712000000',
    customerAvatarUrl: null,
    customerType: index % 3 === 0 ? 'guest' : 'registered',
    staffUserId: STAFF[staff].userId,
    staffName: STAFF[staff].fullName,
    staffEmail: STAFF[staff].email,
    staffAvatarUrl: null,
    serviceId: service.id,
    serviceName: service.name,
    durationMinutes: service.durationMinutes,
    price: service.price,
    multiService: false,
  }
}

const ROWS: AppointmentRow[] = [
  at(DAY, '07', 0, 30, 0),
  at(DAY, '09', 0, 60, 1),
  at(DAY, '09', 30, 60, 2),
  at(DAY, '11', 0, 30, 3),
  at(DAY, '13', 0, 60, 4),
  at(DAY, '15', 0, 60, 5, 'confirmed', 0),
  at(DAY, '15', 0, 30, 6, 'booked', 1),
  at(DAY, '16', 30, 60, 7, 'completed'),
  at('2026-05-13', '10', 0, 60, 8),
  at('2026-05-17', '11', 0, 60, 9),
]

const noop = () => undefined

function Surface({ surface }: { surface: string }) {
  if (surface === 'timeline-week' || surface === 'timeline-month') {
    return (
      <AppointmentTimeline
        rows={ROWS}
        scope={surface === 'timeline-week' ? 'week' : 'month'}
        anchor={DAY}
        hours={HOURS}
        timeZone={HOURS.timeZoneId}
        onOpen={noop}
        onAction={noop}
        onOpenCalendarDay={noop}
        onShowMore={noop}
        totalCount={ROWS.length + 6}
      />
    )
  }
  if (surface.startsWith('timeline')) {
    return (
      <AppointmentTimeline
        rows={ROWS}
        scope="day"
        anchor={DAY}
        hours={HOURS}
        timeZone={HOURS.timeZoneId}
        onOpen={noop}
        onAction={noop}
        onOpenCalendarDay={noop}
        onShowMore={noop}
        totalCount={ROWS.length + 6}
      />
    )
  }
  if (surface.startsWith('calendar')) {
    const mode = surface.replace('calendar-', '') as 'day' | 'week' | 'month'
    return (
      <AppointmentCalendar
        mode={mode}
        anchor={new Date(2026, 4, 12)}
        rows={ROWS}
        staff={STAFF}
        hours={HOURS}
        timeZone={HOURS.timeZoneId}
        onSelect={noop}
        onCreateAt={noop}
        onReschedule={noop}
        onSelectDate={noop}
        onOpenWeek={noop}
        onOpenDay={noop}
        onModeChange={noop}
      />
    )
  }
  if (surface === 'table') {
    return (
      <AppointmentTable
        rows={ROWS}
        totalCount={ROWS.length}
        page={1}
        pageCount={1}
        pageSize={25}
        pageSizeOptions={[10, 25, 50]}
        onPageChange={noop}
        onPageSizeChange={noop}
        selected={new Set<string>()}
        onSelectionChange={noop}
        onOpen={noop}
        onAction={noop}
        onBulkConfirm={noop}
        onBulkCancel={noop}
      />
    )
  }
  return (
    <AppointmentFilters
      open
      onClose={noop}
      filters={{ ...DEFAULT_APPOINTMENT_FILTERS, payment: 'awaiting' }}
      onChange={noop}
      onReset={noop}
      staff={STAFF}
      services={SERVICES}
      resultCount={12}
    />
  )
}

const params = new URLSearchParams(window.location.search)
const surface = params.get('surface') ?? 'timeline-day'

createRoot(document.getElementById('harness-root')!).render(
  <StrictMode>
    <QueryClientProvider client={new QueryClient()}>
      <div data-surface={surface} className="min-h-dvh bg-bg p-[1rem] text-fg">
        <Surface surface={surface} />
      </div>
    </QueryClientProvider>
  </StrictMode>,
)
