import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowUpRight, Check, Copy, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { StatusPill } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { PageHeader } from '../components/ui/page-header'
import { useOwnerConsole } from '../lib/dashboard/console-context'
import { MODULE } from '../lib/entitlements'

export const Route = createFileRoute('/dashboard/storefront')({
  component: StorefrontOverview,
})

function StorefrontOverview() {
  const { business, hasModule } = useOwnerConsole()
  const [copied, setCopied] = useState(false)
  const publicUrl = `${window.location.origin}/${business.slug}`
  const storefrontLive = hasModule(MODULE.storefront)
  const bookingLive = hasModule(MODULE.appointments)
  const servicesLive = hasModule(MODULE.serviceCatalog)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      toast.success('Storefront link copied.')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Copy the link from the address field instead.')
    }
  }

  return (
    <div>
      <PageHeader
        title="Storefront"
        description="The public page customers land on before they book."
        actions={
          <Link
            to="/$slug"
            params={{ slug: business.slug }}
            className="btn btn-primary no-underline"
          >
            Open storefront
            <ArrowUpRight className="size-[0.9rem]" aria-hidden="true" />
          </Link>
        }
      />

      <div className="grid gap-[1rem] lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Card className="p-[1.1rem]">
          <h2 className="text-heading font-bold tracking-snug">Public address</h2>
          <p className="mt-[0.25rem] text-meta text-muted">
            Put this link in your bio, receipts and messages so clients can book
            without an account.
          </p>
          <div className="mt-[0.8rem] flex flex-wrap items-center gap-[0.5rem]">
            <code className="min-w-0 flex-1 truncate rounded-md border border-line bg-hover px-[0.7rem] py-[0.55rem] text-meta">
              {publicUrl}
            </code>
            <Button variant="ghost" onClick={() => void copyLink()}>
              {copied ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
              {copied ? 'Copied' : 'Copy link'}
            </Button>
          </div>
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="link mt-[0.7rem] inline-flex items-center gap-[0.3rem] text-meta font-semibold"
          >
            Preview in a new tab
            <ExternalLink className="size-[0.85rem]" aria-hidden="true" />
          </a>
        </Card>

        <Card className="p-[1.1rem]">
          <h2 className="text-heading font-bold tracking-snug">What customers see</h2>
          <ul className="mt-[0.5rem] divide-y divide-line">
            <li className="flex items-center justify-between gap-3 py-[0.6rem] text-meta">
              Public page
              <StatusPill tone={storefrontLive ? 'success' : 'neutral'}>
                {storefrontLive ? 'Live' : 'Off'}
              </StatusPill>
            </li>
            <li className="flex items-center justify-between gap-3 py-[0.6rem] text-meta">
              Online booking
              <StatusPill tone={bookingLive ? 'success' : 'neutral'}>
                {bookingLive ? 'Open' : 'Not enabled'}
              </StatusPill>
            </li>
            <li className="flex items-center justify-between gap-3 py-[0.6rem] text-meta">
              Service menu
              <StatusPill tone={servicesLive ? 'success' : 'neutral'}>
                {servicesLive ? 'Published' : 'Not enabled'}
              </StatusPill>
            </li>
          </ul>
          <p className="mt-[0.7rem] text-caption text-subtle">
            Visibility follows your plan. Change what you offer from the service
            catalog and brand the page in settings.
          </p>
          <div className="mt-[0.8rem] flex flex-wrap gap-[0.5rem]">
            <Link to="/dashboard/services" className="btn btn-ghost no-underline">
              Manage services
            </Link>
            <Link to="/dashboard/settings" className="btn btn-ghost no-underline">
              Branding
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
