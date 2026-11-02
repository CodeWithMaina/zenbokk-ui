import { BookOpen, Mail, MessageCircle, Phone } from 'lucide-react'
import { errorMessage } from '../../lib/api/client'
import { useSupportContact } from '../../lib/settings'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { SectionCard } from '../ui/card'
import { Skeleton } from '../ui/skeleton'
import { SupportCard } from '../ui/support-card'
import type { SupportChannel } from '../ui/support-card'

/** `+254 700 000 000` → `+254700000000` for `tel:` and `wa.me` links. */
function phoneHref(value: string): string {
  return `tel:${value.replace(/[^+\d]/g, '')}`
}

/** `wa.me` wants the number without a leading `+`. */
function whatsAppHref(value: string): string {
  return `https://wa.me/${value.replace(/\D/g, '')}`
}

/**
 * Support section.
 *
 * Every value comes from `GET /v1/support`, which resolves the `Support`
 * configuration section server-side — so the channels, numbers and hours are
 * real and operator-editable rather than demonstration copy. A channel that is
 * not configured is omitted instead of rendering a dead link. There is no
 * support-ticket API, so these are honest mailto / tel / wa.me / help-centre
 * links and nothing pretends to submit a request.
 */
export function SupportSettings() {
  const query = useSupportContact()

  if (query.isPending) {
    return (
      <SectionCard title="Talk to the Punched team">
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading support details">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </SectionCard>
    )
  }

  if (query.isError || !query.data) {
    return (
      <Alert
        tone="danger"
        title="We could not load the support details"
        onDismiss={() => void query.refetch()}
      >
        {errorMessage(query.error, 'Try again in a moment.')}
      </Alert>
    )
  }

  const support = query.data
  const firstHours = support.hours[0]
  const hoursSummary = firstHours ? `${firstHours.days}, ${firstHours.hours}` : undefined

  const channels: SupportChannel[] = []
  if (support.email) {
    channels.push({
      id: 'email',
      title: 'Email support',
      description: support.responseNote || 'Email the team',
      icon: <Mail className="size-4" />,
      href: `mailto:${support.email}`,
    })
  }
  if (support.whatsApp) {
    channels.push({
      id: 'whatsapp',
      title: 'WhatsApp',
      description: 'Quick responses during support hours',
      icon: <MessageCircle className="size-4" />,
      href: whatsAppHref(support.whatsApp),
    })
  }
  if (support.phone) {
    channels.push({
      id: 'phone',
      title: 'Call us',
      description: hoursSummary ?? 'Speak to the team',
      icon: <Phone className="size-4" />,
      href: phoneHref(support.phone),
    })
  }
  if (support.helpCenterUrl) {
    channels.push({
      id: 'help',
      title: 'Help center',
      description: 'Guides and documentation',
      icon: <BookOpen className="size-4" />,
      href: support.helpCenterUrl,
    })
  }

  const primary = channels[0]
  const hours = support.hours.filter((row) => row.days || row.hours)

  return (
    <div className="grid gap-[1rem] md:grid-cols-2">
      <SectionCard
        title="Talk to the Punched team"
        description={support.responseNote || 'We’re here to help.'}
      >
        {channels.length > 0 ? (
          <SupportCard
            title="Reach us"
            description={primary ? `Fastest: ${String(primary.title)}` : undefined}
            channels={channels}
            className="border-0 bg-transparent p-0"
          />
        ) : (
          <p className="text-meta text-muted">
            No support channels are configured for this deployment yet.
          </p>
        )}
      </SectionCard>

      <div className="flex flex-col gap-[1rem]">
        <SectionCard
          title="Support hours"
          description={support.hoursTimeZone ? `All times are ${support.hoursTimeZone}.` : undefined}
        >
          {hours.length > 0 ? (
            <dl className="m-0">
              {hours.map((row, index) => (
                <div
                  key={`${row.days}-${index}`}
                  className="flex items-center justify-between gap-4 border-b border-line py-[0.7rem] last:border-b-0"
                >
                  <dt className="text-meta text-muted">{row.days}</dt>
                  <dd className="m-0 text-right font-semibold">{row.hours}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-meta text-muted">Support hours are not published yet.</p>
          )}
        </SectionCard>

        <SectionCard title="Find an answer yourself" description="Quick answers to common questions.">
          {support.helpCenterUrl ? (
            <Button
              className="w-full"
              onClick={() => window.open(support.helpCenterUrl, '_blank', 'noopener')}
            >
              Browse FAQs
            </Button>
          ) : (
            <p className="text-meta text-muted">The help center is not configured yet.</p>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
