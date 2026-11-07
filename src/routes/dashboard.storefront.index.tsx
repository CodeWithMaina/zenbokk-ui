import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowUpRight, Check, Copy, ExternalLink, LayoutTemplate, PencilRuler, Rocket } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { StatusPill } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { PageHeader } from '../components/ui/page-header'
import { useDashboardContext } from '../lib/dashboard/dashboard-context'
import { MODULE } from '../lib/entitlements'
import {
  DEFAULT_TEMPLATE_ID,
  findTemplate,
  usePublishStorefront,
  useStorefrontBuilder,
  useUnpublishStorefront,
} from '../lib/storefront-builder'

export const Route = createFileRoute('/dashboard/storefront/')({
  component: StorefrontOverview,
})

function formatDate(value: string | null): string {
  if (!value) return 'Not yet published'
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function StorefrontOverview() {
  const { business, hasModule } = useDashboardContext()
  const [copied, setCopied] = useState(false)
  const publicUrl = `${window.location.origin}/${business.slug}`

  const storefrontLive = hasModule(MODULE.storefront)
  const builder = useStorefrontBuilder(storefrontLive)
  const publish = usePublishStorefront(business.id)
  const unpublish = useUnpublishStorefront(business.id)

  const state = builder.data
  const template = findTemplate(state?.templateId ?? DEFAULT_TEMPLATE_ID)

  const checklist = [
    { label: 'Storefront module active', done: storefrontLive },
    { label: 'Template chosen', done: Boolean(state?.templateId) },
    { label: 'Sections configured', done: (state?.draft.sections.length ?? 0) > 0 },
    { label: 'Branding & typography set', done: Boolean(state?.draft.theme.primary) },
    { label: 'Footer configured', done: Boolean(state?.draft.footer.variant) },
    { label: 'Published', done: Boolean(state?.isPublished) },
  ]
  const completed = checklist.filter((item) => item.done).length

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
        description="Build, preview and publish the page customers land on before they book."
        actions={
          <div className="flex flex-wrap items-center gap-[0.5rem]">
            <Link to="/dashboard/storefront/builder" className="btn btn-primary no-underline">
              <PencilRuler className="size-[0.9rem]" aria-hidden="true" />
              Edit storefront
            </Link>
            <a href={publicUrl} target="_blank" rel="noreferrer" className="btn btn-ghost no-underline">
              Preview
              <ArrowUpRight className="size-[0.9rem]" aria-hidden="true" />
            </a>
          </div>
        }
      />

      {!storefrontLive ? (
        <Card className="mb-[1rem] p-[1.1rem]">
          <h2 className="text-heading font-bold tracking-snug">Storefront module not enabled</h2>
          <p className="mt-[0.25rem] text-meta text-muted">
            The Storefront module is part of a paid plan. Upgrade to build and publish your public page.
          </p>
          <Link to="/dashboard/settings" className="btn btn-primary mt-[0.8rem] no-underline">
            View plans
          </Link>
        </Card>
      ) : null}

      <div className="grid gap-[1rem] lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Card className="p-[1.1rem]">
          <div className="flex flex-wrap items-start justify-between gap-[0.6rem]">
            <div>
              <h2 className="text-heading font-bold tracking-snug">Publication</h2>
              <p className="mt-[0.2rem] text-meta text-muted">
                {state?.hasUnpublishedChanges
                  ? 'You have unpublished changes saved as a draft.'
                  : 'Your published storefront matches your draft.'}
              </p>
            </div>
            <StatusPill tone={state?.isPublished ? 'success' : 'neutral'}>
              {state?.isPublished ? 'Live' : 'Unpublished'}
            </StatusPill>
          </div>

          <ul className="mt-[0.8rem] divide-y divide-line">
            <li className="flex items-center justify-between gap-3 py-[0.6rem] text-meta">
              Active template
              <span className="font-semibold">{template?.name ?? '—'}</span>
            </li>
            <li className="flex items-center justify-between gap-3 py-[0.6rem] text-meta">
              Last published
              <span>{formatDate(state?.publishedAt ?? null)}</span>
            </li>
            <li className="flex items-center justify-between gap-3 py-[0.6rem] text-meta">
              Draft saved
              <span>{formatDate(state?.updatedAt ?? null)}</span>
            </li>
          </ul>

          <div className="mt-[0.9rem] flex flex-wrap gap-[0.5rem]">
            <Button
              variant="primary"
              disabled={!storefrontLive || publish.isPending || builder.isLoading}
              onClick={() =>
                publish.mutate({ config: state?.draft, expectedVersion: state?.draftVersion })
              }
            >
              <Rocket className="size-4" aria-hidden="true" />
              {publish.isPending ? 'Publishing…' : state?.isPublished ? 'Publish changes' : 'Publish storefront'}
            </Button>
            <Button disabled={!state?.isPublished || unpublish.isPending} onClick={() => unpublish.mutate()}>
              {unpublish.isPending ? 'Working…' : 'Unpublish'}
            </Button>
          </div>
        </Card>

        <Card className="p-[1.1rem]">
          <h2 className="text-heading font-bold tracking-snug">Public address</h2>
          <p className="mt-[0.25rem] text-meta text-muted">
            Share this link in your bio, receipts and messages so clients can book without an account.
          </p>
          <div className="mt-[0.8rem] flex flex-wrap items-center gap-[0.5rem]">
            <code className="min-w-0 flex-1 truncate rounded-md border border-line bg-hover px-[0.7rem] py-[0.55rem] text-meta">
              {publicUrl}
            </code>
            <Button variant="ghost" onClick={() => void copyLink()}>
              {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
              {copied ? 'Copied' : 'Copy link'}
            </Button>
          </div>
          <a href={publicUrl} target="_blank" rel="noreferrer"
            className="link mt-[0.7rem] inline-flex items-center gap-[0.3rem] text-meta font-semibold">
            Preview in a new tab
            <ExternalLink className="size-[0.85rem]" aria-hidden="true" />
          </a>
          <p className="mt-[0.6rem] text-caption text-subtle">
            Custom domains are not supported yet. The address above is your business's storefront URL.
          </p>
        </Card>
      </div>

      <div className="mt-[1rem] grid gap-[1rem] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="p-[1.1rem]">
          <h2 className="text-heading font-bold tracking-snug">Setup</h2>
          <p className="mt-[0.2rem] text-meta text-muted">{completed} of {checklist.length} complete</p>
          <div className="mt-[0.6rem] h-[0.4rem] w-full overflow-hidden rounded-round bg-hover">
            <div className="h-full rounded-round bg-[var(--accent)]"
              style={{ width: `${Math.round((completed / checklist.length) * 100)}%` }} />
          </div>
          <ul className="mt-[0.7rem] grid gap-[0.35rem]">
            {checklist.map((item) => (
              <li key={item.label} className="flex items-center gap-[0.5rem] text-meta">
                <span
                  aria-hidden="true"
                  className={
                    item.done
                      ? 'grid size-[1.1rem] place-items-center rounded-round bg-[var(--accent)] text-[var(--on-accent)]'
                      : 'size-[1.1rem] rounded-round border border-line'
                  }
                >
                  {item.done ? <Check className="size-[0.7rem]" /> : null}
                </span>
                <span className={item.done ? '' : 'text-muted'}>{item.label}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-[1.1rem]">
          <h2 className="text-heading font-bold tracking-snug">Next steps</h2>
          <p className="mt-[0.2rem] text-meta text-muted">
            Everything here edits your draft — publish when you are happy.
          </p>
          <div className="mt-[0.8rem] grid gap-[0.5rem]">
            <Link to="/dashboard/storefront/templates" className="btn btn-ghost justify-start no-underline">
              <LayoutTemplate className="size-4" aria-hidden="true" />
              Browse templates
            </Link>
            <Link to="/dashboard/storefront/builder" className="btn btn-ghost justify-start no-underline">
              <PencilRuler className="size-4" aria-hidden="true" />
              Open the editor
            </Link>
            <Link to="/dashboard/services" className="btn btn-ghost justify-start no-underline">
              Manage services
            </Link>
            <Link to="/dashboard/gallery" className="btn btn-ghost justify-start no-underline">
              Manage gallery images
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
