import {
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarDays,
  Globe2,
  Headphones,
  Layers,
  QrCode,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import type { FeatureInfo } from '../../components/marketing/FeatureSheet'
import type { PublicTone } from './tones'

/**
 * Marketing copy, kept out of the presentation components so the page files
 * stay layout only. Editing a benefit list or adding a module is a change here,
 * never a change to the JSX.
 */

export const LANDING_FEATURES: FeatureInfo[] = [
  {
    label: 'Loyalty',
    eyebrow: 'Customer retention',
    icon: Sparkles,
    summary:
      'Replace paper punch cards with branded digital loyalty experiences that keep customers coming back.',
    benefits: [
      'Digital stamp cards customers can access from their phones',
      'Flexible stamp-to-reward programs for different services',
      'Multiple loyalty campaigns per business',
      'Customer progress and reward history',
      'QR-based verified stamping',
    ],
    metric: 'Retention',
    metricValue: 'Digital',
  },
  {
    label: 'Appointments',
    eyebrow: 'Business operations',
    icon: CalendarDays,
    summary:
      'Give customers a simple way to discover your business, select a service, choose a staff member and book an available time.',
    benefits: [
      'Real-time appointment availability',
      'Service and staff scheduling',
      'Customer self-booking',
      'Staff appointment views',
      'Owner and manager oversight',
    ],
    metric: 'Scheduling',
    metricValue: 'Live',
  },
  {
    label: 'Customers',
    eyebrow: 'Customer management',
    icon: Users,
    summary:
      'Build a useful customer record around every visit, booking, loyalty interaction and relationship.',
    benefits: [
      'Central customer profiles',
      'Visit and booking history',
      'Loyalty activity',
      'Customer discovery through QR',
      'Walk-in customer management',
    ],
    metric: 'Customer data',
    metricValue: 'Centralised',
  },
  {
    label: 'Staff',
    eyebrow: 'Team management',
    icon: BadgeCheck,
    summary:
      'Give every member of your team the right access, tools and visibility without relying on shared accounts.',
    benefits: [
      'Individual staff accounts',
      'Role-based access',
      'Staff-specific schedules',
      'Attendance through QR',
      'Owner and manager controls',
    ],
    metric: 'Access',
    metricValue: 'Scoped',
  },
  {
    label: 'QR Infrastructure',
    eyebrow: 'Connected experiences',
    icon: QrCode,
    summary:
      'One simple technology layer connects loyalty, attendance, customer discovery and business interactions.',
    benefits: [
      'Loyalty card stamping',
      'Staff attendance',
      'Business discovery',
      'Customer enrollment',
      'Fast mobile interactions',
    ],
    metric: 'Interaction',
    metricValue: 'QR',
  },
]

/** One wash per module, in the same order as LANDING_FEATURES. */
export const FEATURE_TONES: PublicTone[] = ['pink', 'blue', 'purple', 'pink', 'beige']

export const GROWTH_STEPS: { title: string; text: string; tone: PublicTone }[] = [
  {
    title: 'Use what you need',
    text: 'Start with loyalty, appointments, staff or customer management independently.',
    tone: 'blue',
  },
  {
    title: 'Connect everything',
    text: 'Bring your core business operations together when your business is ready.',
    tone: 'pink',
  },
  {
    title: 'Make it yours',
    text: 'Extend Punched into a branded, custom business system when you need more.',
    tone: 'purple',
  },
]

export const BUSINESS_AREAS: {
  title: string
  text: string
  icon: typeof Sparkles
  tone: PublicTone
}[] = [
  {
    title: 'Customer loyalty',
    text: 'Digital stamp cards, defined rewards and a loyalty experience that carries your brand.',
    icon: Sparkles,
    tone: 'pink',
  },
  {
    title: 'Appointments',
    text: 'Customers choose services, staff and times without the back-and-forth.',
    icon: CalendarDays,
    tone: 'blue',
  },
  {
    title: 'People & staff',
    text: 'Staff accounts, permissions, schedules and attendance in one system.',
    icon: Users,
    tone: 'purple',
  },
  {
    title: 'Customer management',
    text: 'Customer details, bookings, visits and loyalty activity, connected.',
    icon: QrCode,
    tone: 'blue',
  },
]

export const ENTERPRISE_ITEMS = [
  'Custom card designs',
  'Business branding',
  'White-labelled experience',
  'Custom workflows',
  'Business-specific features',
  'Multi-location architecture',
  'Dedicated support',
  'Custom integrations',
]

export const SUPPORT_ITEMS = [
  'Implementation support',
  'Business onboarding',
  'Technical support',
  'Custom development',
]

/**
 * Support tiles cycle three washes. Declared next to SUPPORT_ITEMS so a length
 * change cannot silently desync the two.
 */
export const SUPPORT_TONES: PublicTone[] = ['blue', 'pink', 'purple', 'blue']

export const ENTERPRISE_CAPABILITIES: {
  title: string
  description: string
  icon: typeof Sparkles
}[] = [
  {
    title: 'Multi-Location',
    description:
      'Run every branch from one console. Per-location loyalty programs, staff rosters and stamp ledgers with consolidated roll-ups.',
    icon: Building2,
  },
  {
    title: 'Consolidated Analytics',
    description:
      'Cross-business dashboards for stamps, redemptions and staff performance. Export everything, own your data.',
    icon: BarChart3,
  },
  {
    title: 'Security & Compliance',
    description:
      'Cryptographically signed single-use QR tokens, role-scoped APIs and audited attribution on every stamp.',
    icon: ShieldCheck,
  },
  {
    title: 'Dedicated Support',
    description:
      'Priority channel with a named success manager, onboarding workshops and quarterly program reviews.',
    icon: Headphones,
  },
  {
    title: 'Custom Programs',
    description: 'Tiered rewards, referral engines and program stamps tailored to your brand rules.',
    icon: Layers,
  },
  {
    title: 'Built to Scale',
    description:
      'Real-time infrastructure designed for high transaction volume across regions.',
    icon: Globe2,
  },
]

/**
 * The marketing site's copyright year.
 *
 * Computed once at module load rather than during render: `new Date()` inside a
 * component body makes the render impure, which the React Compiler reports and
 * skips optimising. A footer year does not need to change mid-session.
 */
export const COPYRIGHT_YEAR = new Date().getFullYear()

export const ENTERPRISE_OUTCOMES = [
  { value: '99.9%', label: 'Platform uptime target' },
  { value: '<1s', label: 'Stamp propagation' },
  { value: '24/7', label: 'Enterprise support' },
]
