import { RotateCcw, ShieldAlert } from 'lucide-react'
import type { DashboardBootstrapFailureKind } from '../../lib/dashboard'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Skeleton } from '../ui/skeleton'

/**
 * Shell states shared by every console.
 *
 * Bootstrap failures are rendered in one place, so an owner and a staff member
 * see the same explanation for the same server answer, and no page has to invent
 * its own "you can't see this" screen.
 */

/** Frame shown while the business context is being resolved. */
export function ConsoleBootstrapSkeleton({ label }: { label: string }) {
  return (
    <div
      className="mx-auto flex w-full max-w-(--container-page-wide) gap-6 p-6"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{label}</span>
      <div className="hidden w-[15rem] shrink-0 space-y-3 lg:block">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="min-w-0 flex-1 space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-24 rounded-card" />
        <Skeleton className="h-24 rounded-card" />
      </div>
    </div>
  )
}

export type ConsoleUnavailableProps = {
  /** Human name of the console, e.g. "business dashboard". */
  consoleLabel: string
  kind: DashboardBootstrapFailureKind
  message: string
  onRetry: () => void
  /** Leave the console and sign in as someone else. */
  onSignInAsAnother: () => void
  /** Route to the platform sign-in door. */
  onSignIn?: () => void
}

/** Frame shown when the business context could not be resolved. */
export function ConsoleUnavailable({
  consoleLabel,
  kind,
  message,
  onRetry,
  onSignInAsAnother,
  onSignIn,
}: ConsoleUnavailableProps) {
  const title =
    kind === 'unauthenticated'
      ? 'Sign in to continue'
      : kind === 'no-business'
        ? 'No business workspace yet'
        : kind === 'unauthorized'
          ? 'Not your workspace'
          : 'Workspace unavailable'

  return (
    <main className="grid min-h-svh place-items-center px-5 py-12">
      <Card className="w-full max-w-[34rem] p-7">
        <span className="grid size-[2.4rem] place-items-center rounded-full bg-warning-soft text-warning-ink">
          <ShieldAlert className="size-[1.1rem]" aria-hidden="true" />
        </span>
        <p className="eyebrow mt-[0.9rem]">{consoleLabel}</p>
        <h1 className="display mt-2 text-title">{title}</h1>
        <p className="mt-2 text-meta text-muted">{message}</p>
        <div className="mt-6 flex flex-wrap gap-[0.5rem]">
          {kind === 'unauthenticated' && onSignIn ? (
            <Button variant="primary" onClick={onSignIn}>
              Sign in
            </Button>
          ) : (
            <Button variant="primary" onClick={onRetry}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Try again
            </Button>
          )}
          <Button variant="ghost" onClick={onSignInAsAnother}>
            Sign in with another account
          </Button>
        </div>
      </Card>
    </main>
  )
}
