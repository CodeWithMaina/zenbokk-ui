import { useState } from 'react'
import {
  CalendarDays,
  Gift,
  LifeBuoy,
  Mail,
  MessageCircle,
  Monitor,
  Phone,
  Scissors,
  Sparkles,
} from 'lucide-react'
import {
  BottomBar,
  Button,
  Disclosure,
  Field,
  FormGrid,
  Input,
  LoyaltyCard,
  MetricGrid,
  NotificationMatrix,
  PageHeader,
  PermissionGrid,
  PremiumAction,
  PremiumHero,
  SaveBar,
  SectionCard,
  Select,
  SettingsSidebarTabs,
  StatusPill,
  SupportCard,
  Switch,
  Toast,
} from '../components/ui'
import { formatDuration, money } from '../lib/format'
import { services } from './data'
import type {
  NotificationChannel,
  NotificationEvent,
  SettingsTabItem,
} from '../components/ui'

type SectionId = 'business' | 'services' | 'loyalty' | 'notifications' | 'support'

const sections: SettingsTabItem[] = [
  {
    id: 'business',
    label: 'Business',
    description: 'Name, contact and booking rules',
    icon: CalendarDays,
  },
  {
    id: 'services',
    label: 'Services',
    description: 'Menu, pricing and availability',
    icon: Scissors,
    count: 6,
  },
  {
    id: 'loyalty',
    label: 'Loyalty',
    description: 'Stamps, rewards and tiers',
    icon: Gift,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Email, SMS and in-app alerts',
    icon: Sparkles,
  },
  {
    id: 'support',
    label: 'Support',
    description: 'Talk to the Zenbokk team',
    icon: LifeBuoy,
  },
]

const channels: NotificationChannel[] = [
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'sms', label: 'SMS', icon: MessageCircle },
  { id: 'inapp', label: 'In-app', icon: Monitor },
]

const events: NotificationEvent[] = [
  {
    id: 'booking',
    label: 'New booking',
    description: 'A client books online or the team adds an appointment.',
  },
  {
    id: 'cancellation',
    label: 'Cancellation',
    description: 'An appointment is cancelled or moved.',
  },
  {
    id: 'reward',
    label: 'Reward ready',
    description: 'A client completes their loyalty card.',
  },
  {
    id: 'summary',
    label: 'Weekly summary',
    description: 'Visits, revenue and retention every Monday.',
  },
]

const permissions = [
  { id: 'appointments', area: 'Appointments', level: 2 },
  { id: 'clients', area: 'Clients', level: 2 },
  { id: 'loyalty', area: 'Loyalty', level: 4 },
  { id: 'payments', area: 'Payments', level: 5 },
  { id: 'services', area: 'Service catalog', level: 2 },
  { id: 'settings', area: 'Settings', level: 2 },
  { id: 'stamps', area: 'Stamps', level: 3 },
  { id: 'storefront', area: 'Storefront', level: 2 },
] as const

const initialNotifications: Record<string, Record<string, boolean>> = {
  booking: { email: true, sms: true, inapp: true },
  cancellation: { email: true, sms: true, inapp: false },
  reward: { email: true, sms: false, inapp: true },
  summary: { email: true, sms: false, inapp: false },
}

export function SettingsDemo() {
  const [section, setSection] = useState<SectionId>('business')
  const [businessName, setBusinessName] = useState('Aurelia Studio')
  const [phone, setPhone] = useState('+254 711 204 550')
  const [email, setEmail] = useState('hello@aurelia.studio')
  const [onlineBooking, setOnlineBooking] = useState(true)
  const [waitlist, setWaitlist] = useState(false)
  const [notifications, setNotifications] = useState(initialNotifications)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toastOpen, setToastOpen] = useState(false)

  const save = () => {
    setSaving(true)
    window.setTimeout(() => {
      setSaving(false)
      setDirty(false)
      setToastOpen(true)
    }, 500)
  }

  const changeNotification = (
    eventId: string,
    channelId: string,
    enabled: boolean,
  ) => {
    setNotifications((current) => ({
      ...current,
      [eventId]: { ...current[eventId], [channelId]: enabled },
    }))
    setDirty(true)
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Studio identity, service rules, loyalty and notifications."
        actions={<Button onClick={() => setToastOpen(true)}>Export data</Button>}
      />

      <div className="mt-[0.6rem] grid gap-[1rem] md:grid-cols-[15rem_minmax(0,1fr)] md:gap-[1.5rem]">
        <SettingsSidebarTabs
          tabs={sections}
          activeId={section}
          onSelect={(id) => setSection(id as SectionId)}
          panelId="settings-panel"
          className="md:sticky md:top-[1.2rem] md:self-start"
        />

        <div
          id="settings-panel"
          role="tabpanel"
          aria-label={sections.find((item) => item.id === section)?.label as string}
          className="min-w-0"
        >
          {section === 'business' ? (
            <div className="flex flex-col gap-[1rem]">
              <SectionCard
                title="Business details"
              description="Shown on receipts, reminders and the booking page."
            >
              <FormGrid>
                <Field label="Studio name">
                  <Input
                    value={businessName}
                    onChange={(event) => {
                      setBusinessName(event.target.value)
                      setDirty(true)
                    }}
                  />
                </Field>
                <Field label="Phone">
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(event) => {
                      setPhone(event.target.value)
                      setDirty(true)
                    }}
                  />
                </Field>
                <Field label="Email">
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value)
                      setDirty(true)
                    }}
                  />
                </Field>
                <Field label="Currency">
                  <Select defaultValue="KES">
                    <option value="KES">KES · Kenyan shilling</option>
                    <option value="USD">USD · US dollar</option>
                    <option value="EUR">EUR · Euro</option>
                  </Select>
                </Field>
              </FormGrid>

              <div className="mt-[1.2rem] flex flex-col divide-y divide-line border-t border-line">
                <div className="flex items-center justify-between gap-4 py-[0.8rem]">
                  <div className="min-w-0">
                    <p className="font-semibold">Online booking</p>
                    <p className="text-meta text-muted">
                      Let clients pick their own time from the menu.
                    </p>
                  </div>
                  <Switch
                    checked={onlineBooking}
                    onCheckedChange={(next) => {
                      setOnlineBooking(next)
                      setDirty(true)
                    }}
                    label="Online booking"
                  />
                </div>
                <div className="flex items-center justify-between gap-4 py-[0.8rem]">
                  <div className="min-w-0">
                    <p className="font-semibold">Waitlist</p>
                    <p className="text-meta text-muted">
                      Offer cancelled slots to the next client.
                    </p>
                  </div>
                  <Switch
                    checked={waitlist}
                    onCheckedChange={(next) => {
                      setWaitlist(next)
                      setDirty(true)
                    }}
                    label="Waitlist"
                  />
                </div>
              </div>

              <SaveBar
                dirty={dirty}
                saving={saving}
                onSave={save}
                onDiscard={() => setDirty(false)}
                className="max-md:hidden"
              />
              </SectionCard>

              <SectionCard
                title="Your access"
                description="Owner permissions across every module in the workspace."
              >
                <MetricGrid
                  items={[
                    { value: '43', label: 'Permissions' },
                    { value: '10', label: 'Modules' },
                    { value: 'Owner', label: 'Role' },
                  ]}
                />
                <Disclosure
                  summary="See permissions by area"
                  className="mt-[0.9rem] border-t border-line pt-[0.7rem]"
                >
                  <PermissionGrid
                    permissions={permissions.map((permission) => ({
                      id: permission.id,
                      area: permission.area,
                      level: `(${permission.level})`,
                    }))}
                  />
                </Disclosure>
              </SectionCard>
            </div>
          ) : null}

          {section === 'services' ? (
            <SectionCard
              title="Service menu"
              description="Pause a service to hide it from online booking."
              action={<Button size="sm">Add service</Button>}
            >
              <ul className="divide-y divide-line">
                {services.map((service) => (
                  <li
                    key={service.id}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-[0.35rem] py-[0.75rem]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{service.name}</p>
                      <p className="text-meta text-muted">
                        {formatDuration(service.duration)} · {money(service.price)}
                      </p>
                    </div>
                    <StatusPill status={service.status}>
                      {service.statusLabel}
                    </StatusPill>
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}

          {section === 'loyalty' ? (
            <div className="flex flex-col gap-[1rem]">
              <PremiumHero
                title="Reward the clients who keep coming back."
                description="Eight visits earn a credit, and VIP clients unlock early access to seasonal treatments."
                action={
                  <PremiumAction onClick={() => setToastOpen(true)}>
                    Edit programme
                  </PremiumAction>
                }
                footnote="1 stamp per completed visit · Reward expires after 90 days"
              />

              <div className="grid gap-[1rem] lg:grid-cols-[1.1fr_1fr]">
                <LoyaltyCard
                  memberName="Amina Wanjiku"
                  stamps={6}
                  goal={8}
                  reward="KES 1,800 credit"
                />
                <SectionCard title="Programme rules">
                  <ul className="flex list-disc flex-col gap-[0.45rem] pl-[1.1rem] text-meta text-muted">
                    <li>One stamp per completed appointment, regardless of price.</li>
                    <li>Rewards can be combined with a birthday offer.</li>
                    <li>Team members can add a stamp from the client page.</li>
                    <li>Rewards are paused for 30 days after a no-show.</li>
                  </ul>
                  <Button className="mt-[0.9rem]" onClick={() => setToastOpen(true)}>
                    View redemption history
                  </Button>
                </SectionCard>
              </div>
            </div>
          ) : null}

          {section === 'notifications' ? (
            <SectionCard
              title="Notifications"
              description="Choose how the studio hears about each event."
            >
              <NotificationMatrix
                channels={channels}
                events={events}
                value={notifications}
                onChange={changeNotification}
              />
              <p className="mt-[0.6rem] text-caption text-muted">
                Weekly summaries are sent Mondays at 7am EAT.
              </p>

              <SaveBar
                dirty={dirty}
                saving={saving}
                onSave={save}
                onDiscard={() => {
                  setNotifications(initialNotifications)
                  setDirty(false)
                }}
                className="max-md:hidden"
              />
            </SectionCard>
          ) : null}

          {section === 'support' ? (
            <div className="flex flex-col gap-[1rem]">
              <SupportCard
                channels={[
                  {
                    id: 'chat',
                    title: 'Chat with us',
                    description: 'Mon–Sat, 8am–6pm EAT',
                    icon: <MessageCircle className="size-4" />,
                    onClick: () => setToastOpen(true),
                  },
                  {
                    id: 'email',
                    title: 'Email support',
                    description: 'hello@zenbokk.com',
                    icon: <Mail className="size-4" />,
                    href: 'mailto:hello@zenbokk.com',
                  },
                  {
                    id: 'phone',
                    title: 'Call the studio line',
                    description: '+254 711 000 000',
                    icon: <Phone className="size-4" />,
                    href: 'tel:+254711000000',
                  },
                ]}
              />

              <SectionCard title="System" description="Workspace and data controls">
                <dl className="flex flex-col">
                  <div className="row">
                    <dt>Plan</dt>
                    <dd className="font-semibold">Studio · annual</dd>
                  </div>
                  <div className="row">
                    <dt>Data region</dt>
                    <dd>Nairobi (af-east-1)</dd>
                  </div>
                  <div className="row last:border-b-0">
                    <dt>Last export</dt>
                    <dd>12 October 2026</dd>
                  </div>
                </dl>
              </SectionCard>
            </div>
          ) : null}

        </div>
      </div>

      <BottomBar label="Settings actions" className="mt-[1rem]">
        <Button className="flex-1" onClick={() => setSection('support')}>
          Support
        </Button>
        <Button
          variant="primary"
          className="flex-1"
          disabled={!dirty || saving}
          onClick={save}
        >
          Save changes
        </Button>
      </BottomBar>

      <Toast
        open={toastOpen}
        action={
          <Button
            variant="ghost"
            size="sm"
            className="text-on-inverse"
            onClick={() => setToastOpen(false)}
          >
            Dismiss
          </Button>
        }
      >
        Demo action — nothing was saved.
      </Toast>
    </>
  )
}
