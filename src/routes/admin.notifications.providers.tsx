import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { Plug } from 'lucide-react'
import { HealthBadge, channelLabel, formatCount, formatTimestamp, humanize } from '../components/admin/notifications/shared'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { SectionCard } from '../components/ui/card'
import { DescriptionList, DescriptionRow } from '../components/ui/description-list'
import { EmptyState } from '../components/ui/empty-state'
import { Note } from '../components/ui/note'
import { Skeleton } from '../components/ui/skeleton'
import {
  useAdminNotificationProviders,
  useTestNotificationProvider,
} from '../lib/admin/use-admin-notifications'
import { errorMessage } from '../lib/api/client'

export const Route = createFileRoute('/admin/notifications/providers')({
  component: AdminNotificationProviders,
})

/**
 * Platform provider configuration.
 *
 * Credentials are never returned: the API reports only whether a value exists
 * and its last four characters. Secrets are managed through the deployment's
 * secure configuration, so this page proves connectivity instead of exposing it.
 */
function AdminNotificationProviders() {
  const query = useAdminNotificationProviders()
  const test = useTestNotificationProvider()
  const [results, setResults] = useState<Record<string, { succeeded: boolean; message: string }>>({})

  const runTest = async (channel: string) => {
    try {
      const result = await test.mutateAsync(channel)
      setResults((current) => ({
        ...current,
        [channel]: { succeeded: result.succeeded, message: result.message },
      }))
      if (result.succeeded) toast.success(result.message)
      else toast.error(result.message)
    } catch (error) {
      toast.error(errorMessage(error, 'The connection test could not be run.'))
    }
  }

  if (query.isError) {
    return (
      <Alert tone="danger" title="We could not load provider configuration">
        {errorMessage(query.error, 'Try again in a moment.')}
      </Alert>
    )
  }

  const providers = query.data ?? []

  return (
    <div className="flex flex-col gap-[1rem]">
      <Note>
        Provider credentials are platform-owned. They are never returned to a browser, never shown to a
        business, and are changed through the deployment&rsquo;s secure configuration — not from here.
      </Note>

      {query.isPending ? (
        <Skeleton className="h-64 rounded-card" />
      ) : providers.length === 0 ? (
        <EmptyState
          icon={<Plug className="size-5" />}
          title="No notification channels registered"
          description="This deployment has not registered any delivery channels."
        />
      ) : (
        providers.map((provider) => (
          <SectionCard
            key={provider.channel}
            title={channelLabel(provider.channel)}
            description={provider.health.evidence}
            action={
              <div className="flex items-center gap-2">
                <HealthBadge state={provider.health.state} />
                <Badge tone={provider.configured ? 'info' : 'neutral'}>
                  {humanize(provider.status)}
                </Badge>
              </div>
            }
          >
            <DescriptionList>
              {Object.entries(provider.settings).map(([key, value]) => (
                <DescriptionRow key={key} label={humanize(key)} value={value || '—'} />
              ))}
              {Object.entries(provider.maskedCredentials).map(([key, value]) => (
                <DescriptionRow
                  key={key}
                  label={humanize(key)}
                  description="Stored in the deployment's secure configuration"
                  value={<span className="tabular">{value}</span>}
                />
              ))}
              <DescriptionRow
                label="Recent attempts (24h)"
                value={formatCount(provider.health.recentAttempts)}
              />
              <DescriptionRow
                label="Recent failures (24h)"
                value={formatCount(provider.health.recentFailures)}
              />
              <DescriptionRow
                label="Last successful delivery"
                value={formatTimestamp(provider.health.lastSuccessfulDeliveryAtUtc)}
              />
            </DescriptionList>

            <div className="mt-[0.9rem] flex flex-wrap items-center gap-[0.7rem]">
              {provider.supportsConnectionTest ? (
                <Button
                  size="sm"
                  variant="primary"
                  disabled={test.isPending}
                  onClick={() => void runTest(provider.channel)}
                >
                  {test.isPending ? 'Testing…' : 'Test connection'}
                </Button>
              ) : (
                <span className="text-caption text-muted">
                  No connectivity test is required for this channel.
                </span>
              )}
              {results[provider.channel] ? (
                <span
                  className={
                    results[provider.channel].succeeded
                      ? 'text-meta text-success-ink'
                      : 'text-meta text-danger-ink'
                  }
                >
                  {results[provider.channel].message}
                </span>
              ) : null}
            </div>
          </SectionCard>
        ))
      )}
    </div>
  )
}
