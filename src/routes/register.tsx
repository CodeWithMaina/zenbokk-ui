import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { BusinessRegisterForm } from '../components/auth/BusinessRegisterForm'
import { AuthShell } from '../components/shell/AuthShell'
import { requireAnonymous, requireMarketingSurface } from '../lib/auth/guards'

/**
 * Business owner onboarding.
 *
 * Registration and the owner's sign-in both live on the marketing host: a
 * business host that receives `/register` is sent to the canonical platform
 * address instead of rendering platform onboarding inside a tenant.
 *
 * The whole journey happens on this page — the wizard registers the account,
 * verifies the email and creates the business — because public registration is
 * customer-only and ownership only exists once the business does.
 */
export const Route = createFileRoute('/register')({
  beforeLoad: async () => {
    requireMarketingSurface('/register')
    await requireAnonymous()
  },
  component: RegisterPage,
})

function RegisterPage() {
  const navigate = useNavigate()

  return (
    <AuthShell>
      <p className="eyebrow">For business</p>
      <h1 className="display mt-[0.4rem] text-title">Set up your workspace</h1>
      <p className="mt-[0.4rem] text-meta text-muted">
        One account for your storefront, your calendar, your staff and your regulars. We&rsquo;ll
        confirm your email before anything goes live.
      </p>

      <div className="mt-[1.3rem]">
        <BusinessRegisterForm
          onComplete={() => {
            void navigate({ to: '/dashboard', replace: true })
          }}
        />
      </div>

      <p className="mt-[1.2rem] text-center text-meta text-muted">
        Already have a workspace?{' '}
        <Link to="/login" className="link font-semibold">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
