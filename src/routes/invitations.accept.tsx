import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { AcceptInvitationForm } from '../components/auth/AcceptInvitationForm'
import { AuthShell } from '../components/shell/AuthShell'
import { Alert } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Skeleton } from '../components/ui/skeleton'
import { queryKeys } from '../lib/api/query-client'
import { errorMessage } from '../lib/api/client'
import { useAuth } from '../lib/auth'
import { requirePlatformSurface } from '../lib/auth/guards'
import { invitationApi } from '../lib/invitations/api'

type AcceptSearch = { token?: string }

function validateSearch(search: Record<string, unknown>): AcceptSearch {
  const token = typeof search.token === 'string' ? search.token.trim() : ''
  return { token: token || undefined }
}

export const Route = createFileRoute('/invitations/accept')({
  validateSearch,
  beforeLoad: () => {
    requirePlatformSurface('/invitations/accept')
  },
  component: AcceptInvitationPage,
})

/**
 * Staff invitation acceptance.
 *
 * The token is the only authority: the business, the role and the invited email
 * are read from the persisted invitation by the server. Two doors, matching the
 * two endpoints:
 *
 *  - `POST …/accept` (anonymous) creates a **new** staff identity.
 *  - `POST …/accept-existing` (`[Authorize]`) joins with the identity already
 *    signed in — allowed only when the session's email is the invited one, which
 *    the server proves for itself.
 */
function AcceptInvitationPage() {
  const { token } = Route.useSearch()
  const navigate = useNavigate()
  const { user, isAuthenticated, establishSession, signOut } = useAuth()

  const invitation = useQuery({
    queryKey: queryKeys.invitation(token ?? ''),
    queryFn: () => invitationApi.validate(token ?? ''),
    enabled: Boolean(token),
    retry: false,
  })

  const join = useMutation({
    mutationFn: () => invitationApi.acceptExisting(token ?? ''),
    onSuccess: async (response) => {
      await establishSession(response)
      toast.success('Welcome to the team.')
      await navigate({ to: '/staff', replace: true })
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'We could not add you to the team.'))
    },
  })

  if (!token) {
    return (
      <AuthShell>
        <p className="eyebrow">Invitation</p>
        <h1 className="display mt-[0.4rem] text-title">This link is incomplete</h1>
        <p className="mt-[0.4rem] text-meta text-muted">
          The invitation link is missing its token. Ask the business owner to resend the invite and
          open the newest link in your email.
        </p>
        <Link to="/login" className="btn btn-ghost mt-[1.2rem] w-full no-underline">
          Back to sign in
        </Link>
      </AuthShell>
    )
  }

  if (invitation.isPending) {
    return (
      <AuthShell>
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          <span className="sr-only">Checking your invitation…</span>
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-24 rounded-card" />
        </div>
      </AuthShell>
    )
  }

  if (invitation.isError) {
    return (
      <AuthShell>
        <p className="eyebrow">Invitation</p>
        <h1 className="display mt-[0.4rem] text-title">We couldn’t check that invitation</h1>
        <Alert tone="danger" className="mt-[1.1rem]">
          {errorMessage(invitation.error, 'The invitation could not be read.')}
        </Alert>
        <Button
          variant="primary"
          size="xl"
          className="mt-[1.1rem] w-full"
          onClick={() => void invitation.refetch()}
        >
          Try again
        </Button>
      </AuthShell>
    )
  }

  const details = invitation.data

  if (!details.valid) {
    return (
      <AuthShell>
        <p className="eyebrow">Invitation</p>
        <h1 className="display mt-[0.4rem] text-title">This invitation is no longer usable</h1>
        <Alert tone="warning" className="mt-[1.1rem]">
          {details.errorMessage ?? 'The invitation has expired or been revoked.'}
        </Alert>
        <p className="mt-[1rem] text-meta text-muted">
          Ask the owner of {details.businessName || 'the business'} to send a new invitation to{' '}
          {details.email || 'your address'}.
        </p>
        <Link to="/login" className="btn btn-ghost mt-[1.2rem] w-full no-underline">
          Back to sign in
        </Link>
      </AuthShell>
    )
  }

  const emailMatches =
    isAuthenticated && user?.email && user.email.toLowerCase() === details.email.toLowerCase()

  return (
    <AuthShell>
      <p className="eyebrow">You&rsquo;re invited</p>
      <h1 className="display mt-[0.4rem] text-title">Join {details.businessName}</h1>
      <p className="mt-[0.4rem] text-meta text-muted">
        {details.businessLogoUrl ? (
          <img
            src={details.businessLogoUrl}
            alt=""
            className="mr-[0.5rem] inline-block size-6 rounded-sm object-cover align-middle"
          />
        ) : null}
        You were invited as a staff member. This invitation is for{' '}
        <b className="font-semibold text-fg">{details.email}</b>.
      </p>

      <div className="mt-[1.3rem]">
        {emailMatches ? (
          <>
            <Alert tone="info" className="mb-[1rem]">
              You&rsquo;re signed in as the invited address. One tap links this account to{' '}
              {details.businessName}.
            </Alert>
            <Button
              variant="primary"
              size="xl"
              className="w-full"
              disabled={join.isPending}
              onClick={() => join.mutate()}
            >
              {join.isPending ? 'Joining…' : `Join ${details.businessName}`}
            </Button>
          </>
        ) : isAuthenticated ? (
          <>
            <Alert tone="warning" className="mb-[1rem]">
              You&rsquo;re signed in as {user?.email}, but this invitation is for {details.email}.
              Only the invited address can accept it.
            </Alert>
            <Button
              variant="primary"
              size="xl"
              className="w-full"
              onClick={() => {
                void signOut().then(() => {
                  void navigate({ to: '/login', replace: true })
                })
              }}
            >
              Sign out and use {details.email}
            </Button>
          </>
        ) : (
          <AcceptInvitationForm
            token={token}
            invitedEmail={details.email}
            onAccepted={() => {
              toast.success(`Welcome to ${details.businessName}.`)
              void navigate({ to: '/staff', replace: true })
            }}
          />
        )}
      </div>
    </AuthShell>
  )
}
