import { createFileRoute } from '@tanstack/react-router'
import { ModulePlaceholder } from '../components/shell/ModulePlaceholder'

/** Programs — placeholder (`programs` module, `programs.view`). */
export const Route = createFileRoute('/dashboard/programs')({
  component: ProgramsPlaceholder,
})

function ProgramsPlaceholder() {
  return <ModulePlaceholder navKey="programs" />
}
