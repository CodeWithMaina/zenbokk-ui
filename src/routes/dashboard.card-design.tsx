import { createFileRoute } from '@tanstack/react-router'
import { ModulePlaceholder } from '../components/shell/ModulePlaceholder'

/** Card design — placeholder (`customCardDesign` module, `cardDesigns.view`). */
export const Route = createFileRoute('/dashboard/card-design')({
  component: CardDesignPlaceholder,
})

function CardDesignPlaceholder() {
  return <ModulePlaceholder navKey="card-design" />
}
