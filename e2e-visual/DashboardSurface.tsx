/**
 * The dashboard, mounted with fixture data for the visual harness.
 *
 * DEVELOPMENT ONLY. It renders the real dashboard components (and the real CSS) so a
 * headless browser can measure and screenshot the page at every width and in both
 * themes without an API, a database or a signed-in tenant. The fixture mirrors the
 * reference dashboard's shape: a morning of completed work, three pending bookings
 * and two confirmed ones, all on one fixed business day in Nairobi.
 */
import { Link } from '@tanstack/react-router'
import {
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  CreditCard,
  Globe,
  PencilRuler,
  Plus,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react'
import {
  ActivityPanel,
  AttentionPanel,
  DashboardHero,
  PerformersPanel,
  SchedulePanel,
  StatisticsPanel,
  TeamPanel,
  WebsitePreviewFrame,
} from '../src/components/dashboard'
import type {
  ActivityEntry,
  AttentionItem,
  HeroStat,
  StatGroup,
  StatMetric,
} from '../src/components/dashboard'
import { PageHeader } from '../src/components/ui/page-header'
import { StatusPill } from '../src/components/ui/badge'
import { SectionCard } from '../src/components/ui/card'
import type { AppointmentDashboardItem, StaffMember } from '../src/lib/api/types'

const noop = () => undefined

/** A fixed business day, so every screenshot is deterministic. */
const DAY_KEY = '2026-11-08'
const TODAY_KEY = '2026-11-08'
const TIME_ZONE = 'Africa/Nairobi'
/** 15:10 on the business clock (Nairobi is UTC+3 all year). */
const NOW = new Date('2026-11-08T12:10:00.000Z')

const STAFF = [
  { id: 'staff-1', name: 'Amina Hassan' },
  { id: 'staff-2', name: 'John Kipchoge' },
  { id: 'staff-3', name: 'Grace Wanjiru' },
  { id: 'staff-4', name: 'Brian Otieno' },
  { id: 'staff-5', name: 'Faith Achieng' },
]

/** An instant at a business-local wall clock on the fixture day. */
function at(hour: number, minute: number, duration: number) {
  const start = new Date(
    Date.UTC(2026, 10, 8, hour - 3, minute, 0, 0),
  )
  const end = new Date(start.getTime() + duration * 60_000)
  return { scheduledAt: start.toISOString(), endAt: end.toISOString() }
}

let sequence = 0
function appointment(
  hour: number,
  minute: number,
  duration: number,
  customer: string,
  service: string,
  status: string,
  staff: number,
  paid: number,
  balance: number,
  paymentStatus: string,
): AppointmentDashboardItem {
  sequence += 1
  const member = STAFF[staff]
  return {
    id: `appt-${sequence}`,
    businessId: 'biz-1',
    ...at(hour, minute, duration),
    status,
    serviceId: `svc-${staff}`,
    serviceName: service,
    customerId: `cus-${sequence}`,
    customerName: customer,
    customerEmail: `${customer.toLowerCase().replace(/\s+/g, '.')}@example.test`,
    customerPhone: '+254712000000',
    customerAvatarUrl: null,
    customerType: 'registered',
    staffUserId: member.id,
    staffName: member.name,
    staffEmail: `${member.name.toLowerCase().replace(/\s+/g, '.')}@example.test`,
    staffAvatarUrl: null,
    createdAt: at(10, 15, 60).scheduledAt,
    updatedAt: at(10, 15, 60).scheduledAt,
    amountPaid: paid,
    balance,
    paymentStatus,
  }
}

const ITEMS: AppointmentDashboardItem[] = [
  appointment(9, 0, 60, 'Jane Muthoni', 'Hair cut', 'completed', 1, 1800, 0, 'paid'),
  appointment(10, 30, 90, 'Ruth Ochieng', 'Braiding', 'completed', 4, 3000, 0, 'paid'),
  appointment(11, 0, 90, 'Aisha Barasa', 'Bridal trial', 'completed', 0, 4000, 0, 'paid'),
  appointment(12, 0, 60, 'Mary Wairimu', 'Deep tissue massage', 'completed', 2, 4500, 0, 'paid'),
  appointment(13, 0, 60, 'Kevin Otieno', 'Hair cut', 'completed', 3, 1800, 0, 'paid'),
  appointment(13, 0, 30, 'Sam Kariuki', 'Shave', 'cancelled', 1, 0, 0, 'refunded'),
  appointment(14, 0, 60, 'Lucy Akinyi', 'Facial', 'completed', 2, 2800, 0, 'paid'),
  appointment(15, 0, 60, 'Dan Mutua', 'Hair cut', 'booked', 3, 0, 1800, 'unpaid'),
  appointment(15, 30, 45, 'Peter Mwangi', 'Beard trim', 'booked', 1, 0, 900, 'unpaid'),
  appointment(16, 0, 120, 'Nancy Chebet', 'Braiding', 'pending_payment', 4, 1200, 2400, 'partially_paid'),
  appointment(16, 30, 90, 'Sarah Kimani', 'Bridal hair', 'confirmed', 0, 2500, 5000, 'partially_paid'),
  appointment(17, 0, 60, 'Joy Mbugua', 'Relaxing massage', 'confirmed', 2, 4000, 0, 'paid'),
]

const STAFF_ROSTER: StaffMember[] = STAFF.map((member, index) => ({
  userId: member.id,
  fullName: member.name,
  email: `${member.name.toLowerCase().replace(/\s+/g, '.')}@example.test`,
  avatarUrl: null,
  stampsIssued: 0,
  dailyGoalOverride: null,
  dailyGoal: 8,
  dailyGoalType: 'appointments',
  appointmentDailyGoalOverride: null,
  appointmentDailyGoal: 4,
  appointmentsToday: 2 + (index % 3),
  status: 'Active',
  appointmentsLast7d: 12 + index,
}))

const HERO_STATS: HeroStat[] = [
  { value: '3,300', label: 'Pending today' },
  { value: '15,200', label: 'Yesterday' },
  { value: '95,600', label: '7 days' },
  { value: '287,500', label: 'Month' },
]

const ATTENTION: AttentionItem[] = [
  {
    key: 'balances',
    icon: <Wallet aria-hidden="true" />,
    tone: 'danger',
    title: '5 unpaid balances',
    detail: 'KES 12,500 outstanding',
    cta: 'Review',
  },
  {
    key: 'confirm',
    icon: <CalendarClock aria-hidden="true" />,
    tone: 'warning',
    title: '3 bookings to confirm',
    detail: 'First at 15:00',
    cta: 'Review',
  },
  {
    key: 'verify',
    icon: <ShieldCheck aria-hidden="true" />,
    tone: 'info',
    title: '3 payments to verify',
    detail: 'KES 3,300 waiting for your check',
    cta: 'Verify',
  },
]

const PRIMARY_STATS: StatMetric[] = [
  {
    key: 'bookings',
    label: 'Bookings today',
    value: '12',
    note: '2 confirmed · 3 awaiting',
    onSelect: noop,
  },
  { key: 'completed', label: 'Completed', value: '6', note: '50% of the day' },
  { key: 'upcoming', label: 'Still to come', value: '4', note: 'Next at 15:30' },
]

const STAT_GROUPS: StatGroup[] = [
  {
    key: 'money',
    label: 'Money',
    metrics: [
      { key: 'ticket', label: 'Average ticket', value: 'KES 3,083', onSelect: noop },
      { key: 'verify', label: 'To verify', value: '3', tone: 'danger', onSelect: noop },
    ],
  },
  {
    key: 'customers',
    label: 'Customers',
    metrics: [
      { key: 'clients', label: 'Total', value: '92', onSelect: noop },
      { key: 'new', label: 'New this week', value: '24' },
    ],
  },
  {
    key: 'loyalty',
    label: 'Loyalty',
    metrics: [
      { key: 'stamps', label: 'Stamps today', value: '38', onSelect: noop },
      { key: 'rewards', label: 'Rewards ready', value: '7', onSelect: noop },
    ],
  },
  {
    key: 'team',
    label: 'Team',
    metrics: [
      { key: 'on-duty', label: 'On duty', value: '5', onSelect: noop },
      { key: 'active', label: 'Active this week', value: '4' },
    ],
  },
]


const ACTIVITY: ActivityEntry[] = [
  {
    key: 'a',
    icon: <CalendarDays aria-hidden="true" />,
    tone: 'success',
    title: 'Ruth Ochieng booked braiding',
    detail: 'booked 14:15',
    time: 'Tomorrow 10:00',
  },
  {
    key: 'b',
    icon: <CreditCard aria-hidden="true" />,
    tone: 'info',
    title: 'M-Pesa verified · Jane Muthoni',
    detail: 'M-Pesa till',
    time: '14:00',
    amount: '+KES 5,500',
  },
  {
    key: 'c',
    icon: <Users aria-hidden="true" />,
    tone: 'warning',
    title: 'Emily Njeri joined',
    detail: 'First booking, 6 Nov',
    time: '13:20',
  },
  {
    key: 'd',
    icon: <CreditCard aria-hidden="true" />,
    tone: 'neutral',
    title: 'Aisha Barasa left 5 stars',
    detail: 'Bridal trial',
    time: '12:40',
  },
]

const PERFORMERS = [
  { key: 'p1', label: 'Amina Hassan · staff', value: '18.1%', percent: 100 },
  { key: 'p2', label: 'Bridal hair · staff', value: '15.6%', percent: 86 },
  { key: 'p3', label: 'Hair extension · staff', value: '13.4%', percent: 74 },
  { key: 'p4', label: 'Returning clients · staff', value: '42%', percent: 62 },
  { key: 'p5', label: 'M-Pesa · staff', value: '71%', percent: 55 },
]

/** The website card's shell, composed the way the dashboard composes it. */
function WebsiteCard() {
  return (
    <SectionCard
      icon={<Globe />}
      iconTone="info"
      title="Your website"
      titleClassName="font-display font-normal"
      description={<span className="block truncate">maisha.zenbokk.com</span>}
      className="w-full max-w-[44rem] min-w-0 self-start p-[clamp(0.7rem,1vw,1rem)] min-[60rem]:max-w-none"
      contentClassName="mt-[0.65rem]"
      action={<StatusPill tone="success">Live</StatusPill>}
    >
      <WebsitePreviewFrame
        src="/e2e-visual/storefront-sample.html"
        address="maisha.zenbokk.com"
        label="Maisha Salon & Spa — live website preview"
      />
      <div className="mt-[0.7rem] flex flex-wrap items-center gap-x-[0.7rem] gap-y-[0.45rem]">
        <span className="text-caption text-subtle">Updated 8 Nov 2026, 09:12</span>
        <div className="ml-auto flex flex-wrap items-center gap-[0.45rem]">
          <a href="#" className="btn btn-primary btn-sm no-underline">
            Open website
            <ArrowUpRight className="size-[0.85rem]" aria-hidden="true" />
          </a>
          <Link to="/dashboard/storefront/builder" className="btn btn-ghost btn-sm no-underline">
            <PencilRuler className="size-[0.85rem]" aria-hidden="true" />
            Manage
          </Link>
        </div>
      </div>
    </SectionCard>
  )
}

/** The page composition, at the widths the dashboard is expected to work at. */
export function DashboardSurface({ calendar = true }: { calendar?: boolean }) {
  return (
    <div>
      <PageHeader
        title="Good afternoon"
        titleClassName="font-display font-normal"
        description="Maisha Salon & Spa · Sunday 8 November"
        actions={
          <Link to="/dashboard/appointments" className="btn btn-primary no-underline">
            <Plus className="size-4" aria-hidden="true" />
            New booking
          </Link>
        }
      />

      <div className="grid gap-[0.9rem]">
        <DashboardHero
          kicker="Collected today"
          currency="KES"
          amount="18,500"
          delta={{ percent: 21.7, caption: 'vs yesterday' }}
          progress={{
            label: 'Verified share of today’s income',
            percent: 70,
            detail:
              'Gross verified income · KES 3,300 awaiting verification · refunds tracked separately',
          }}
          live={
            <Link to="/$slug" params={{ slug: 'maisha' }} className="dash-hero-link">
              <i aria-hidden="true" />
              Storefront live ↗
            </Link>
          }
          stats={HERO_STATS}
        />

        <AttentionPanel items={ATTENTION} onSelect={noop} />

        <StatisticsPanel
          description="Today at a glance"
          primary={PRIMARY_STATS}
          groups={STAT_GROUPS}
          action={
            <Link to="/dashboard/analytics" className="link text-meta font-semibold">
              Insights
            </Link>
          }
        />

        <div className="grid gap-[0.9rem] min-[60rem]:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <SchedulePanel
            items={ITEMS}
            dayKey={DAY_KEY}
            todayKey={TODAY_KEY}
            timeZone={TIME_ZONE}
            now={NOW}
            canConfirm
            initialView={calendar ? 'calendar' : 'list'}
            onConfirm={noop}
            onDayChange={noop}
          />
          <WebsiteCard />
        </div>

        <div className="grid items-start gap-[0.9rem] min-[52rem]:grid-cols-[repeat(auto-fit,minmax(17rem,1fr))]">
          <TeamPanel staff={STAFF_ROSTER} items={ITEMS} now={NOW} timeZone={TIME_ZONE} />
          <ActivityPanel
            entries={ACTIVITY}
            action={
              <Link to="/dashboard/finances/cashbook" className="link text-meta font-semibold">
                View all
              </Link>
            }
          />
          <PerformersPanel rows={PERFORMERS} description="This month · revenue" />
        </div>
      </div>
    </div>
  )
}

