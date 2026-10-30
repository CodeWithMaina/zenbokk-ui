import type { AppointmentCardData } from '../components/ui/appointment-card'
import type { ActivityEntry } from '../components/ui/activity-timeline'
import type { ClientSummary } from '../components/ui/client-card'
import type { ServiceSummary } from '../components/ui/service-card'

/** Gradient placeholder photos so the gallery works offline. */
function photo(label: string, from: string, to: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${from}"/>
        <stop offset="1" stop-color="${to}"/>
      </linearGradient>
    </defs>
    <rect width="800" height="1000" fill="url(#g)"/>
    <circle cx="640" cy="220" r="190" fill="#ffffff" opacity="0.08"/>
    <circle cx="180" cy="820" r="260" fill="#ffffff" opacity="0.06"/>
    <text x="60" y="900" fill="#ffffff" opacity="0.9" font-family="Manrope, sans-serif" font-size="44" font-weight="600">${label}</text>
  </svg>`

  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export const clients: ClientSummary[] = [
  {
    id: 'c1',
    name: 'Amina Wanjiku',
    phone: '+254 712 445 908',
    status: 'active',
    statusLabel: 'Active',
    stamps: 6,
    stampGoal: 8,
    vip: true,
    tint: 1,
    lastVisit: '2 days ago',
  },
  {
    id: 'c2',
    name: 'Grace Muthoni',
    phone: '+254 733 208 114',
    status: 'active',
    statusLabel: 'Active',
    stamps: 3,
    stampGoal: 8,
    tint: 2,
    lastVisit: 'Yesterday',
  },
  {
    id: 'c3',
    name: 'Brian Otieno',
    phone: '+254 701 992 337',
    status: 'pending',
    statusLabel: 'Pending',
    stamps: 0,
    stampGoal: 8,
    tint: 3,
    lastVisit: 'Never',
  },
  {
    id: 'c4',
    name: 'Nadia Hassan',
    phone: '+254 720 331 552',
    status: 'active',
    statusLabel: 'Active',
    stamps: 8,
    stampGoal: 8,
    vip: true,
    tint: 2,
    lastVisit: 'Today',
  },
  {
    id: 'c5',
    name: 'Peter Kimani',
    phone: '+254 715 764 209',
    status: 'paused',
    statusLabel: 'Paused',
    stamps: 2,
    stampGoal: 8,
    tint: 1,
    lastVisit: '3 weeks ago',
  },
  {
    id: 'c6',
    name: 'Lynn Achieng',
    phone: '+254 745 887 021',
    status: 'active',
    statusLabel: 'Active',
    stamps: 5,
    stampGoal: 8,
    tint: 3,
    lastVisit: '5 days ago',
  },
]

export const services: ServiceSummary[] = [
  {
    id: 's1',
    name: 'Signature Facial',
    duration: 60,
    price: 5200,
    status: 'active',
    statusLabel: 'Active',
    image: photo('Signature Facial', '#2f6b4f', '#8fb59d'),
  },
  {
    id: 's2',
    name: 'Deep Tissue Massage',
    duration: 90,
    price: 6800,
    status: 'active',
    statusLabel: 'Active',
    image: photo('Deep Tissue', '#7a5a3a', '#cbb27a'),
  },
  {
    id: 's3',
    name: 'Gel Manicure',
    duration: 45,
    price: 2400,
    status: 'active',
    statusLabel: 'Active',
    image: photo('Gel Manicure', '#7b4a5a', '#d7a8b4'),
  },
  {
    id: 's4',
    name: 'Scalp Ritual',
    duration: 40,
    price: 3100,
    status: 'paused',
    statusLabel: 'Paused',
    image: photo('Scalp Ritual', '#3c5a6e', '#9db7c6'),
  },
  {
    id: 's5',
    name: 'Bridal Makeup',
    duration: 120,
    price: 12500,
    status: 'active',
    statusLabel: 'Active',
    image: photo('Bridal Makeup', '#5b3f4e', '#c9a3a8'),
  },
  {
    id: 's6',
    name: 'Beard Sculpt',
    duration: 30,
    price: 1500,
    status: 'active',
    statusLabel: 'Active',
    image: photo('Beard Sculpt', '#39393b', '#9c9c9e'),
  },
]

export const galleryByService: Record<string, { src: string; alt: string }[]> = {
  s1: [
    { src: photo('Facial · studio', '#244d3b', '#79a88c'), alt: 'Treatment room' },
    { src: photo('Facial · ritual', '#3b5a4b', '#a7c2b2'), alt: 'Facial treatment' },
    { src: photo('Facial · finish', '#1f3d30', '#cbb27a'), alt: 'Finished facial' },
  ],
  s2: [
    { src: photo('Massage · room', '#5d442c', '#c1a27c'), alt: 'Massage room' },
    { src: photo('Massage · oils', '#6f5132', '#d8c3a1'), alt: 'Massage oils' },
  ],
  s3: [
    { src: photo('Manicure · colour', '#6b3f4c', '#d9b0b9'), alt: 'Nail colours' },
    { src: photo('Manicure · set', '#7b4a5a', '#e2c2ca'), alt: 'Finished manicure' },
  ],
}

export const appointments: AppointmentCardData[] = [
  {
    id: 'a1',
    day: '18',
    month: 'Oct',
    weekday: 'Friday, 18 October',
    time: '10:30',
    status: 'confirmed',
    statusLabel: 'Confirmed',
    services: [
      { name: 'Signature Facial', duration: 60, price: 5200 },
      { name: 'Scalp Ritual', duration: 40, price: 3100 },
    ],
  },
  {
    id: 'a2',
    day: '02',
    month: 'Oct',
    weekday: 'Wednesday, 2 October',
    time: '14:00',
    status: 'completed',
    statusLabel: 'Completed',
    services: [{ name: 'Gel Manicure', duration: 45, price: 2400 }],
  },
  {
    id: 'a3',
    day: '12',
    month: 'Sep',
    weekday: 'Thursday, 12 September',
    time: '09:00',
    status: 'cancelled',
    statusLabel: 'Cancelled',
    services: [{ name: 'Deep Tissue Massage', duration: 90, price: 6800 }],
  },
]

export const activity: ActivityEntry[] = [
  {
    id: 'e1',
    title: 'Stamp collected',
    description: 'Signature Facial · 6 of 8',
    time: '2 days ago',
    tone: 'success',
  },
  {
    id: 'e2',
    title: 'Appointment confirmed',
    description: 'Friday, 18 October at 10:30',
    time: '4 days ago',
    tone: 'info',
  },
  {
    id: 'e3',
    title: 'Reward redeemed',
    description: 'KES 1,800 credit applied',
    time: '3 weeks ago',
    tone: 'warning',
  },
]
