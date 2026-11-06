import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { FileText, Lock } from 'lucide-react'
import {
  NOTIFICATION_CHANNELS,
  channelLabel,
  humanize,
} from '../components/admin/notifications/shared'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, SectionCard } from '../components/ui/card'
import { Drawer } from '../components/ui/drawer'
import { DescriptionList, DescriptionRow } from '../components/ui/description-list'
import { EmptyState } from '../components/ui/empty-state'
import { Input, Select } from '../components/ui/field'
import { Note } from '../components/ui/note'
import { Skeleton } from '../components/ui/skeleton'
import { Toolbar } from '../components/ui/toolbar'
import { useAdminNotificationTemplates } from '../lib/admin/use-admin-notifications'
import type { AdminNotificationTemplate } from '../lib/admin/notifications-api'
import { errorMessage } from '../lib/api/client'
import { pluralize } from '../lib/format'

export const Route = createFileRoute('/admin/notifications/templates')({
  component: AdminNotificationTemplates,
})

/**
 * Global (platform) template catalogue.
 *
 * The templates are code-defined and versioned with the deployment; this page
 * makes them inspectable and shows which businesses override them. Protected
 * system messages (verification codes) are flagged as non-customisable.
 */
function AdminNotificationTemplates() {
  const query = useAdminNotificationTemplates()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [channel, setChannel] = useState('')
  const [selected, setSelected] = useState<AdminNotificationTemplate | null>(null)

  const templates = query.data ?? []

  const categories = useMemo(
    () => [...new Set(templates.map((template) => template.category))].sort(),
    [templates],
  )

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return templates.filter((template) => {
      if (category && template.category !== category) return false
      if (channel && template.channel !== channel) return false
      if (!needle) return true
      return (
        template.type.toLowerCase().includes(needle) ||
        template.title.toLowerCase().includes(needle) ||
        template.subject.toLowerCase().includes(needle)
      )
    })
  }, [templates, search, category, channel])

  return (
    <div className="flex flex-col gap-[1rem]">
      <Card className="p-card">
        <Toolbar>
          <Input
            aria-label="Search templates"
            placeholder="Search by type, subject or title"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="max-w-[20rem]"
          />
          <Select
            aria-label="Filter by category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((value) => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by channel"
            value={channel}
            onChange={(event) => setChannel(event.target.value)}
          >
            <option value="">All channels</option>
            {NOTIFICATION_CHANNELS.map((value) => (
              <option key={value} value={value}>
                {channelLabel(value)}
              </option>
            ))}
          </Select>
        </Toolbar>
      </Card>

      <SectionCard
        title="Platform templates"
        description={query.isPending ? undefined : pluralize(filtered.length, 'template', 'templates')}
      >
        {query.isError ? (
          <Alert tone="danger">
            {errorMessage(query.error, 'The template catalogue did not load.')}
          </Alert>
        ) : query.isPending ? (
          <Skeleton className="h-40 rounded-card" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<FileText className="size-5" />}
            title="No templates match"
            description="Adjust the filters to see the platform templates."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full" aria-label="Platform notification templates">
              <thead>
                <tr>
                  <th scope="col">Type</th>
                  <th scope="col">Category</th>
                  <th scope="col">Channel</th>
                  <th scope="col">Title</th>
                  <th scope="col">Overrides</th>
                  <th scope="col">Access</th>
                  <th scope="col" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((template) => (
                  <tr key={`${template.type}-${template.channel}`}>
                    <td className="font-semibold">{humanize(template.type)}</td>
                    <td>{humanize(template.category)}</td>
                    <td>{channelLabel(template.channel)}</td>
                    <td className="max-w-[20rem] truncate" title={template.title}>
                      {template.title}
                    </td>
                    <td className="tabular">{template.overrideCount}</td>
                    <td>
                      {template.protected ? (
                        <Badge tone="warning">Protected</Badge>
                      ) : (
                        <Badge tone="info">Customisable</Badge>
                      )}
                    </td>
                    <td>
                      <Button size="sm" variant="ghost" onClick={() => setSelected(template)}>
                        Preview
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? humanize(selected.type) : 'Template'}
        description={
          selected ? `${humanize(selected.category)} · ${channelLabel(selected.channel)}` : undefined
        }
      >
        {selected ? (
          <div className="flex flex-col gap-[1rem]">
            {selected.protected ? (
              <Alert tone="warning" title="Protected system message">
                This template carries security content (for example a verification code). Businesses
                cannot override it and platform branding always applies.
              </Alert>
            ) : null}

            <DescriptionList>
              <DescriptionRow label="Subject" value={selected.subject} />
              <DescriptionRow label="Title" value={selected.title} />
              <DescriptionRow
                label="Default channels"
                value={selected.defaultChannels.map(channelLabel).join(', ')}
              />
              <DescriptionRow label="Business overrides" value={selected.overrideCount} />
            </DescriptionList>

            <div>
              <h3 className="mb-[0.4rem] text-meta font-semibold">Body</h3>
              <p className="rounded-md bg-sunken p-[0.7rem] text-meta">{selected.body}</p>
            </div>

            <div>
              <h3 className="mb-[0.4rem] text-meta font-semibold">Available variables</h3>
              <div className="flex flex-wrap gap-[0.35rem]">
                {selected.availableVariables.map((variable) => (
                  <Badge key={variable} tone="neutral">{`{{${variable}}}`}</Badge>
                ))}
              </div>
            </div>

            <Note className="flex items-start gap-2">
              <Lock className="mt-[0.1rem] size-[0.9rem] shrink-0" aria-hidden="true" />
              Templates are code-defined, so a change ships with a deployment rather than being edited
              here. Businesses may override the customisable ones from their own console.
            </Note>
          </div>
        ) : null}
      </Drawer>
    </div>
  )
}
