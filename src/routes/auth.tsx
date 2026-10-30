import { createFileRoute, Outlet } from '@tanstack/react-router'
import { AuthShell } from '../components/shell/AuthShell'

export const Route = createFileRoute('/auth')({
  component: AuthLayout,
})

function AuthLayout() {
  return (
    <AuthShell>
      <Outlet />
    </AuthShell>
  )
}
