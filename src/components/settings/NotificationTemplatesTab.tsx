import { useMemo, useState } from 'react'
import { FileText } from 'lucide-react'
import { Alert } from '../ui/alert'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, SectionCard } from '../ui/card'
import { EmptyState } from '../ui/empty-state'
import { Input, Select } from '../ui/field'
import { Skeleton } from '../ui/skeleton'
import { Toolbar } from '../ui/toolbar'
import { TemplateEditorDrawer } from './NotificationTemplateEditorDrawer'
import { useBusinessNotificationTemplates } from '../../lib/notifications/use-business-notifications'
import type { BusinessNotificationTemplate } from '../../lib/notifications/business-api'
import { errorMessage } from '../../lib/api/client'
import { categoryLabel, channelLabel } from '../../lib/settings'

/**
 * Template catalogue.
 *
 * Edits are written through the platform's template-override endpoint, which
 * validates every token against the type's payload schema and stores a durable
 * version — so a save here changes what the delivery pipeline actually sends.
 * Protected (security) templates are read-only.
 */
export function NotificationTemplatesTab({ businessId }: { businessId: string }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [channel, setChannel] = useState('')
  const [editing, setEditing] = useState<BusinessNotificationTemplate | null>(null)

  const query = useBusinessNotificationTemplates(businessId, {
    search: search.trim() || null,
    category: category || null,
    channel: channel || null,
  })

  const templates = query.data ?? []
  const categories = useMemo(
    () => [...new Set(templates.map((entry) => entry.category))].sort(),
    [templates],
  )

  return (
    <div className="flex flex-col gap-[1rem]">
      <Card className="p-card">
        <Toolbar>
          <Input
            aria-label="Search templates"
            placeholder="Search templates"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="max-w-[18rem]"
          />
          <Select
            aria-label="Filter by category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((value) => (
              <option key={value} value={value}>
                {categoryLabel(value)}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by channel"
            value={channel}
            onChange={(event) => setChannel(event.target.value)}
          >
            <option value="">All channels</option>
            {['email', 'sms', 'push', 'in_app'].map((value) => (
              <option key={value} value={value}>
                {channelLabel(value)}
              </option>
            ))}
          </Select>
        </Toolbar>
      </Card>

      <SectionCard title="Templates" description="Customise what your customers read.">
        {query.isError ? (
          <Alert tone="danger">{errorMessage(query.error, 'The templates did not load.')}</Alert>
        ) : query.isPending ? (
          <Skeleton className="h-40 rounded-card" />
        ) : templates.length === 0 ? (
          <EmptyState
            icon={<FileText className="size-5" />}
            title="No templates match"
            description="Adjust the filters to see the templates available to you."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full" aria-label="Notification templates">
              <thead>
                <tr>
                  <th scope="col">Event</th>
                  <th scope="col">Channel</th>
                  <th scope="col">Source</th>
                  <th scope="col">Version</th>
                  <th scope="col">Last modified</th>
                  <th scope="col" />
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={`${template.type}-${template.channel}`}>
                    <td>
                      <span className="font-semibold">{template.title || template.type}</span>
                      <span className="block text-caption text-muted">{template.type}</span>
                    </td>
                    <td>{channelLabel(template.channel)}</td>
                    <td>
                      {template.protected ? (
                        <Badge tone="warning">Platform</Badge>
                      ) : template.source === 'override' ? (
                        <Badge tone="info">Customised</Badge>
                      ) : (
                        <Badge tone="neutral">Default</Badge>
                      )}
                    </td>
                    <td className="tabular">{template.version ?? '—'}</td>
                    <td>
                      {template.updatedAtUtc
                        ? new Date(template.updatedAtUtc).toLocaleDateString()
                        : '—'}
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={template.protected}
                        onClick={() => setEditing(template)}
                      >
                        {template.protected ? 'Protected' : 'Edit'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <TemplateEditorDrawer
        businessId={businessId}
        template={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          void query.refetch()
          setEditing(null)
        }}
      />
    </div>
  )
}
