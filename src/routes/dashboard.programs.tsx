import { createFileRoute, Outlet } from '@tanstack/react-router'

/**
 * Programs section layout.
 *
 * Carries no chrome of its own — the dashboard shell already provides the
 * sidebar and page frame. It exists so `/dashboard/programs` and
 * `/dashboard/programs/$programId` are sibling routes under one path, which
 * keeps the Programs entry in the sidebar active on both.
 */
export const Route = createFileRoute('/dashboard/programs')({
  component: ProgramsLayout,
})

function ProgramsLayout() {
  return <Outlet />
}

