import { useState } from 'react'
import { Check, Copy, Loader2, UserPlus } from 'lucide-react'
import { Alert } from '../ui/alert'
import { Avatar } from '../ui/avatar'
import { StatusPill } from '../ui/badge'
import { Button } from '../ui/button'
import { Drawer } from '../ui/drawer'
import { Field, Input } from '../ui/field'
import { errorMessage } from '../../lib/api/client'
import { ROSTER_STATUS } from '../../lib/clients/api'
import { clientStatusLabel, clientStatusTone } from '../../lib/clients/mappers'
import { useClients } from '../../lib/clients/use-clients'
import { useDebouncedValue } from '../../lib/hooks/use-debounced-value'

export type AddClientDrawerProps = {
  open: boolean
  onClose: () => void
  /** Business slug, for the public enrolment link. */
  slug: string
  /** Open an existing client's page. */
  onOpenClient: (customerId: string) => void
}

/**
 * Add client.
 *
 * Punched creates client accounts through client self-enrolment: the account is
 * registered by the person themselves (storefront sign-up / QR) and the business
 * roster is derived from that enrollment. There is no owner-side "create
 * customer" endpoint — `POST /v1/auth/register` is the only route that creates a
 * customer, and it always acts for the caller.
 *
 * So this flow does the two things the API genuinely supports: it hands over the
 * business's public enrolment link, and it finds a client who has already
 * enrolled. Nothing here fabricates an account or a success message.
 */
export function AddClientDrawer({ open, onClose, slug, onOpenClient }: AddClientDrawerProps) {
  const [copied, setCopied] = useState(false)
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search.trim(), 300)

  const joinUrl =
    typeof window === 'undefined' ? `/${slug}` : `${window.location.origin}/${slug}`

  const matches = useClients(
    {
      search: debounced.length >= 3 ? debounced : null,
      status: ROSTER_STATUS.all,
      page: 1,
      pageSize: 5,
    },
    open && debounced.length >= 3,
  )

  const copyLink = () => {
    void navigator.clipboard
      ?.writeText(joinUrl)
      .then(() => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => setCopied(false))
  }

  const results = matches.data?.items ?? []

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Add client"
      description="Clients join your loyalty programme themselves."
    >
      <div className="flex flex-col gap-[1.2rem]">
        <Alert tone="info" title="Clients create their own account">
          Punched has no endpoint that lets a business create a client account, so
          new clients enrol themselves from your storefront or by scanning your QR
          code — and appear in this list straight away. Share the link below.
        </Alert>

        <section className="flex flex-col gap-[0.5rem]">
          <p className="font-semibold">Your enrolment link</p>
          <div className="flex items-center gap-[0.5rem]">
            <Input
              readOnly
              value={joinUrl}
              aria-label="Public enrolment link"
              className="font-mono text-meta"
              onFocus={(event) => event.currentTarget.select()}
            />
            <Button onClick={copyLink} className="shrink-0">
              {copied ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <p className="text-meta text-muted">
            Anyone who opens this link can sign up and join your programme. Their
            account is created by them, not by you.
          </p>
        </section>

        <section className="flex flex-col gap-[0.6rem] border-t border-line pt-[1.2rem]">
          <p className="font-semibold">Already joined? Find them</p>
          <Field
            label="Search your clients"
            hint="Name, email or phone number."
            htmlFor="add-client-search"
          >
            <Input
              id="add-client-search"
              type="search"
              value={search}
              autoComplete="off"
              placeholder="e.g. 0712 345 678"
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>

          {debounced.length > 0 && debounced.length < 3 ? (
            <p className="text-meta text-muted">
              Keep typing — three characters or more.
            </p>
          ) : null}

          {matches.isFetching ? (
            <p className="flex items-center gap-[0.4rem] text-meta text-muted">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              Searching your clients…
            </p>
          ) : null}

          {matches.isError ? (
            <Alert tone="danger" title="Search failed">
              {errorMessage(matches.error)}
            </Alert>
          ) : null}

          {debounced.length >= 3 && !matches.isFetching && results.length === 0 ? (
            <p className="text-meta text-muted">
              No client matches that yet. Send them your enrolment link above and
              they will appear here once they join.
            </p>
          ) : null}

          {results.length > 0 ? (
            <ul className="m-0 flex list-none flex-col gap-[0.4rem] p-0">
              {results.map((client) => (
                <li key={client.userId}>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenClient(client.userId)
                      onClose()
                    }}
                    className="flex w-full items-center gap-[0.7rem] rounded-lg border border-line bg-surface px-[0.8rem] py-[0.6rem] text-left transition-colors hover:border-muted hover:bg-hover focus-visible:shadow-ring focus-visible:outline-none"
                  >
                    <Avatar name={client.fullName} size="sm" decorative />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        {client.fullName}
                      </span>
                      <span className="block truncate text-caption text-muted">
                        {client.phoneNumber ?? client.email}
                      </span>
                    </span>
                    <StatusPill
                      status={client.enrollmentStatus}
                      tone={clientStatusTone(client.enrollmentStatus)}
                    >
                      {clientStatusLabel(client.enrollmentStatus)}
                    </StatusPill>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {debounced.length >= 3 &&
          matches.data &&
          matches.data.totalCount > results.length ? (
            <p className="text-meta text-muted">
              {matches.data.totalCount - results.length} more match. Refine the
              search, or open the client list.
            </p>
          ) : null}
        </section>

        <p className="flex items-center gap-[0.4rem] border-t border-line pt-[1rem] text-caption text-muted">
          <UserPlus className="size-3.5 shrink-0" aria-hidden="true" />
          Accounts are always created by the client, never on their behalf.
        </p>
      </div>
    </Drawer>
  )
}
