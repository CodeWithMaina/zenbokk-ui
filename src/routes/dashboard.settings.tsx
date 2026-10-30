import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ExternalLink, Save } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { SectionCard } from '../components/ui/card'
import { ConfirmDialog } from '../components/ui/confirm-dialog'
import { Field, FormGrid, FormGridFull, Input, Textarea } from '../components/ui/field'
import { PageHeader } from '../components/ui/page-header'
import { errorMessage } from '../lib/api/client'
import { queryKeys } from '../lib/api/query-client'
import type { UpdateBusinessRequest } from '../lib/api/types'
import { ownerApi } from '../lib/dashboard/api'
import { useOwnerConsole } from '../lib/dashboard/console-context'
import { MODULE } from '../lib/entitlements'
import { formatDate } from '../lib/format'

export const Route = createFileRoute('/dashboard/settings')({
  component: SettingsPage,
})

const MODULE_LABELS: Record<string, string> = {
  customers: 'Customers',
  staff: 'Staff',
  settings: 'Settings',
  appointments: 'Appointments',
  stamps: 'Stamping',
  notifications: 'Notifications',
  serviceCatalog: 'Service catalog',
  attendance: 'Attendance',
  payments: 'Payments',
  loyalty: 'Loyalty',
  rewards: 'Rewards',
  analytics: 'Analytics',
  programs: 'Programs',
  referral: 'Referrals',
  customCardDesign: 'Custom card design',
  reviews: 'Reviews',
  gallery: 'Gallery',
  storefront: 'Storefront',
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

type ProfileDraft = {
  name: string
  category: string
  location: string
  phoneNumber: string
  email: string
  description: string
  logoUrl: string
}

function draftFrom(business: {
  name: string
  category: string | null
  location: string | null
  phoneNumber: string | null
  email: string | null
  description: string | null
  logoUrl: string | null
}): ProfileDraft {
  return {
    name: business.name,
    category: business.category ?? '',
    location: business.location ?? '',
    phoneNumber: business.phoneNumber ?? '',
    email: business.email ?? '',
    description: business.description ?? '',
    logoUrl: business.logoUrl ?? '',
  }
}

function SettingsPage() {
  const { business, plan, entitlements, hasModule } = useOwnerConsole()
  const queryClient = useQueryClient()
  const canEdit = hasModule(MODULE.settings)

  const [draft, setDraft] = useState<ProfileDraft>(() => draftFrom(business))
  const [profileError, setProfileError] = useState<string | null>(null)
  const [slug, setSlug] = useState(business.slug)
  const [slugError, setSlugError] = useState<string | null>(null)
  const [confirmSlug, setConfirmSlug] = useState(false)

  const refreshWorkspace = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() })
  }

  const saveProfile = useMutation({
    mutationFn: (payload: UpdateBusinessRequest) => ownerApi.updateBusiness(payload),
    onSuccess: (updated) => {
      setDraft(draftFrom(updated))
      toast.success('Business profile updated.')
      refreshWorkspace()
    },
    onError: (error) => setProfileError(errorMessage(error)),
  })

  const saveSlug = useMutation({
    mutationFn: (next: string) => ownerApi.updateSlug(next),
    onSuccess: (updated) => {
      setSlug(updated.slug)
      setConfirmSlug(false)
      toast.success('Storefront address updated.')
      refreshWorkspace()
    },
    onError: (error) => {
      setConfirmSlug(false)
      setSlugError(errorMessage(error))
    },
  })

  const submitProfile = () => {
    const name = draft.name.trim()
    if (name.length < 2) {
      setProfileError('Enter your business name.')
      return
    }
    const email = draft.email.trim()
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setProfileError('Enter a valid contact email address.')
      return
    }
    setProfileError(null)
    saveProfile.mutate({
      name,
      category: draft.category.trim() || null,
      location: draft.location.trim() || null,
      phoneNumber: draft.phoneNumber.trim() || null,
      email: email || null,
      description: draft.description.trim() || null,
      logoUrl: draft.logoUrl.trim() || null,
    })
  }

  const requestSlugChange = () => {
    const next = slug.trim().toLowerCase()
    if (!slugPattern.test(next)) {
      setSlugError('Use lowercase letters, numbers and single hyphens — e.g. `kings-cuts`.')
      return
    }
    if (next === business.slug) {
      setSlugError('That is already your storefront address.')
      return
    }
    setSlugError(null)
    setConfirmSlug(true)
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(draftFrom(business))

  return (
    <div className="space-y-4">
      <PageHeader
        title="Settings"
        description="Your public business details, storefront address and plan."
      />

      {!canEdit ? (
        <Alert tone="info" title="Profile editing is locked on this plan">
          The settings module is not active for this workspace, so changes are read-only. Your
          public details still appear on the storefront exactly as shown below.
        </Alert>
      ) : null}

      <SectionCard
        title="Business profile"
        description="Shown on your storefront, booking confirmations and receipts."
        action={
          canEdit ? (
            <Button
              variant="primary"
              size="sm"
              disabled={!dirty || saveProfile.isPending}
              onClick={submitProfile}
            >
              <Save className="size-4" aria-hidden="true" />
              {saveProfile.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          ) : null
        }
        contentClassName="space-y-3"
      >
        {profileError ? <Alert tone="danger">{profileError}</Alert> : null}
        <FormGrid>
          <Field label="Business name" htmlFor="business-name">
            <Input
              id="business-name"
              value={draft.name}
              disabled={!canEdit}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
          </Field>
          <Field label="Category" htmlFor="business-category" optional>
            <Input
              id="business-category"
              value={draft.category}
              disabled={!canEdit}
              placeholder="Barbershop"
              onChange={(event) => setDraft({ ...draft, category: event.target.value })}
            />
          </Field>
          <Field label="Phone number" htmlFor="business-phone" optional>
            <Input
              id="business-phone"
              type="tel"
              value={draft.phoneNumber}
              disabled={!canEdit}
              placeholder="+254 7xx xxx xxx"
              onChange={(event) => setDraft({ ...draft, phoneNumber: event.target.value })}
            />
          </Field>
          <Field label="Contact email" htmlFor="business-email" optional>
            <Input
              id="business-email"
              type="email"
              value={draft.email}
              disabled={!canEdit}
              placeholder="hello@example.com"
              onChange={(event) => setDraft({ ...draft, email: event.target.value })}
            />
          </Field>
          <FormGridFull>
            <Field label="Location" htmlFor="business-location" optional>
              <Input
                id="business-location"
                value={draft.location}
                disabled={!canEdit}
                placeholder="Moi Avenue, Nairobi"
                onChange={(event) => setDraft({ ...draft, location: event.target.value })}
              />
            </Field>
          </FormGridFull>
          <FormGridFull>
            <Field
              label="Description"
              htmlFor="business-description"
              optional
              hint="Two or three sentences about the experience — it appears under your name on the storefront."
            >
              <Textarea
                id="business-description"
                rows={4}
                value={draft.description}
                disabled={!canEdit}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              />
            </Field>
          </FormGridFull>
          <FormGridFull>
            <Field
              label="Logo URL"
              htmlFor="business-logo"
              optional
              hint="Paste a link to your logo image. Square images look best."
            >
              <Input
                id="business-logo"
                type="url"
                value={draft.logoUrl}
                disabled={!canEdit}
                placeholder="https://…/logo.png"
                onChange={(event) => setDraft({ ...draft, logoUrl: event.target.value })}
              />
            </Field>
          </FormGridFull>
        </FormGrid>
        {dirty && canEdit ? (
          <p className="text-caption text-muted">You have unsaved changes.</p>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Storefront address"
        description="The link you share with customers. Changing it breaks old links and printed QR codes."
        contentClassName="space-y-3"
      >
        {slugError ? <Alert tone="danger">{slugError}</Alert> : null}
        <div className="flex flex-wrap items-end gap-2">
          <Field
            label="Slug"
            htmlFor="business-slug"
            className="min-w-[14rem] flex-1"
            hint={`Live at /${business.slug}`}
          >
            <Input
              id="business-slug"
              value={slug}
              disabled={!canEdit || saveSlug.isPending}
              onChange={(event) => setSlug(event.target.value)}
            />
          </Field>
          {canEdit ? (
            <Button
              disabled={slug.trim().toLowerCase() === business.slug || saveSlug.isPending}
              onClick={requestSlugChange}
            >
              Change address
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">/{business.slug}</Badge>
          <Link
            to="/$slug"
            params={{ slug: business.slug }}
            className="link inline-flex items-center gap-1 text-meta font-semibold"
          >
            Open storefront
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </SectionCard>

      <SectionCard
        title="Plan & modules"
        description="Modules are switched on per plan. Disabled modules hide their screens and stop their API calls."
      >
        <dl className="m-0 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-caption text-muted">Plan</dt>
            <dd className="m-0 mt-[0.15rem] text-label font-semibold">
              {plan ? plan.name : 'No plan attached'}
              {plan ? (
                <Badge
                  className="ml-2"
                  tone={
                    plan.status === 'active'
                      ? 'success'
                      : ['expired', 'past_due', 'suspended', 'canceled'].includes(plan.status)
                        ? 'danger'
                        : 'warning'
                  }
                >
                  {plan.status.replace('_', ' ')}
                </Badge>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="text-caption text-muted">Renews</dt>
            <dd className="m-0 mt-[0.15rem] text-label font-semibold">
              {plan?.endsAt ? formatDate(plan.endsAt) : '—'}
            </dd>
          </div>
        </dl>

        <div className="mt-4">
          <p className="text-caption text-muted">Included modules</p>
          {entitlements.length === 0 ? (
            <p className="mt-1 text-meta text-muted">
              No modules are active yet. Pick a plan from billing to unlock the console.
            </p>
          ) : (
            <ul className="mt-2 flex list-none flex-wrap gap-2 p-0">
              {entitlements.map((key) => (
                <li key={key}>
                  <Badge tone="success">{MODULE_LABELS[key] ?? key}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SectionCard>

      <ConfirmDialog
        open={confirmSlug}
        title="Change your storefront address?"
        description={`Your storefront will move from /${business.slug} to /${slug
          .trim()
          .toLowerCase()}. Old links, QR codes and saved bookmarks will stop resolving to your page.`}
        confirmLabel={saveSlug.isPending ? 'Updating…' : 'Change address'}
        onConfirm={() => saveSlug.mutate(slug.trim().toLowerCase())}
        onCancel={() => setConfirmSlug(false)}
      />
    </div>
  )
}
