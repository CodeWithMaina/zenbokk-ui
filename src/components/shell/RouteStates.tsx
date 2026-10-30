import { Link } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { Compass, RotateCcw } from 'lucide-react'
import { ApiError } from '../../lib/api/client'
import { Button } from '../ui/button'
import { Card } from '../ui/card'

function describe(error: unknown): string {
  if (error instanceof ApiError) {
    return error.isNotFound
      ? 'That address does not belong to any business on Punched yet.'
      : error.message
  }
  if (error instanceof Error && error.message) return error.message
  return 'Something went wrong. Please try again.'
}

/** Boundary for a route that threw while rendering or loading. */
export function RouteErrorState({ error, reset }: ErrorComponentProps) {
  return (
    <main className="grid min-h-svh place-items-center px-5 py-12">
      <Card className="w-full max-w-[32rem] p-7">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="display mt-2 text-title">This page didn’t load</h1>
        <p className="mt-2 text-meta text-muted">{describe(error)}</p>
        <div className="mt-6 flex flex-wrap gap-[0.6rem]">
          <Button variant="primary" onClick={reset}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Try again
          </Button>
          <Link to="/" className="btn btn-ghost no-underline">
            Go to Punched
          </Link>
        </div>
      </Card>
    </main>
  )
}

/** Boundary for an address that matches no route. */
export function RouteNotFoundState() {
  return (
    <main className="grid min-h-svh place-items-center px-5 py-12">
      <Card className="w-full max-w-[32rem] p-7">
        <p className="eyebrow">404</p>
        <h1 className="display mt-2 text-title">Nothing here</h1>
        <p className="mt-2 text-meta text-muted">
          The address you followed doesn’t exist. Check the link, or start from the
          business’s own address.
        </p>
        <div className="mt-6">
          <Link to="/" className="btn btn-primary no-underline">
            <Compass className="size-4" aria-hidden="true" />
            Find a business
          </Link>
        </div>
      </Card>
    </main>
  )
}
