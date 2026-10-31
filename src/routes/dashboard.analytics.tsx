import { createFileRoute } from '@tanstack/react-router'
import { ModulePlaceholder } from '../components/shell/ModulePlaceholder'

/**
 * Analytics — placeholder.
 *
 * The route, the sidebar entry and the module/permission gates are wired to the
 * backend (`analytics` module, `analytics.view`). The dashboards themselves are
 * implemented in a later session.
 */
export const Route = createFileRoute('/dashboard/analytics')({
  component: AnalyticsPlaceholder,
})

function AnalyticsPlaceholder() {
  return <ModulePlaceholder navKey="analytics" />
}
