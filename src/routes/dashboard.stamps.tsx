import { createFileRoute } from '@tanstack/react-router'
import { ModulePlaceholder } from '../components/shell/ModulePlaceholder'

/** Stamping — placeholder (`stamps` module, `stamps.view`). */
export const Route = createFileRoute('/dashboard/stamps')({
  component: StampsPlaceholder,
})

function StampsPlaceholder() {
  return <ModulePlaceholder navKey="stamps" />
}
