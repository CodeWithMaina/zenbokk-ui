import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { ok } from '../../test/handlers'
import { server } from '../../test/server'
import { financeClaimsApi } from './claims'

/**
 * The Finance reconciliation client.
 *
 * These are the contract assertions for the board's one job: reading the claim queue, and
 * taking the three decisions. What matters here is *what the browser sends* — the filter it
 * puts on the wire, and the fact that verifying states the owner's confirmations rather than
 * a bare "yes". The server still owns every rule; the client must not invent a shortcut.
 */
const base = '*/api/v1'
const CLAIM_ID = '9f1c2d3e-4a5b-6c7d-8e9f-000000000001'

describe('financeClaimsApi', () => {
  it('lists claims on the Finance route with the filters that were asked for', async () => {
    const seen: { url?: URL } = {}

    server.use(
      http.get(`${base}/finances/reconciliation/claims`, ({ request }) => {
        seen.url = new URL(request.url)
        return ok({
          items: [],
          page: 1,
          pageSize: 20,
          totalCount: 0,
          awaitingCount: 0,
          awaitingAmount: 0,
          submittedCount: 0,
          flaggedCount: 0,
          underReviewCount: 0,
          verifiedCount: 0,
          rejectedCount: 0,
        })
      }),
    )

    const queue = await financeClaimsApi.list({
      status: 'awaiting',
      search: 'QJK42',
      minAmount: 100,
      page: 2,
      pageSize: 20,
    })

    expect(queue.totalCount).toBe(0)
    expect(seen.url?.pathname).toBe('/api/v1/finances/reconciliation/claims')
    expect(seen.url?.searchParams.get('status')).toBe('awaiting')
    expect(seen.url?.searchParams.get('search')).toBe('QJK42')
    expect(seen.url?.searchParams.get('minAmount')).toBe('100')
    expect(seen.url?.searchParams.get('page')).toBe('2')
  })

  it('does not put an empty filter on the wire', async () => {
    const seen: { url?: URL } = {}

    server.use(
      http.get(`${base}/finances/reconciliation/claims`, ({ request }) => {
        seen.url = new URL(request.url)
        return ok({
          items: [],
          page: 1,
          pageSize: 20,
          totalCount: 0,
          awaitingCount: 0,
          awaitingAmount: 0,
          submittedCount: 0,
          flaggedCount: 0,
          underReviewCount: 0,
          verifiedCount: 0,
          rejectedCount: 0,
        })
      }),
    )

    await financeClaimsApi.list({ status: 'awaiting', search: '   ' })

    expect(seen.url?.searchParams.has('search')).toBe(false)
  })

  it('sends the owner’s confirmations when verifying', async () => {
    const captured: { body?: Record<string, unknown> } = {}

    server.use(
      http.post(`${base}/finances/reconciliation/claims/${CLAIM_ID}/verify`, async ({ request }) => {
        captured.body = (await request.json()) as Record<string, unknown>
        return ok({ id: CLAIM_ID, status: 'verified' })
      }),
    )

    await financeClaimsApi.verify({
      paymentId: CLAIM_ID,
      note: 'Found it on the till.',
      receivedAmount: 500,
      transactionReference: 'QJK42NUM01',
      transactionExists: true,
      amountMatches: true,
      codeMatches: true,
      belongsToBusiness: true,
    })

    expect(captured.body?.transactionExists).toBe(true)
    expect(captured.body?.belongsToBusiness).toBe(true)
    expect(captured.body?.receivedAmount).toBe(500)
    expect(captured.body?.note).toBe('Found it on the till.')
    // The id belongs in the path, never duplicated into the body.
    expect(captured.body).not.toHaveProperty('paymentId')
  })

  it('sends a rejection reason and a flagging note', async () => {
    const rejected: { body?: Record<string, unknown> } = {}
    const flagged: { body?: Record<string, unknown> } = {}

    server.use(
      http.post(`${base}/finances/reconciliation/claims/${CLAIM_ID}/reject`, async ({ request }) => {
        rejected.body = (await request.json()) as Record<string, unknown>
        return ok({ id: CLAIM_ID, status: 'rejected' })
      }),
      http.post(`${base}/finances/reconciliation/claims/${CLAIM_ID}/flag`, async ({ request }) => {
        flagged.body = (await request.json()) as Record<string, unknown>
        return ok({ id: CLAIM_ID, status: 'flagged' })
      }),
    )

    await financeClaimsApi.reject(CLAIM_ID, 'Not in our account.')
    await financeClaimsApi.flag(CLAIM_ID, 'Payer name does not match.')

    expect(rejected.body?.reason).toBe('Not in our account.')
    expect(flagged.body?.note).toBe('Payer name does not match.')
  })

  it('clears a flag through the review route', async () => {
    const seen: { called?: boolean } = {}

    server.use(
      http.post(`${base}/finances/reconciliation/claims/${CLAIM_ID}/under-review`, () => {
        seen.called = true
        return ok({ id: CLAIM_ID, status: 'under_review' })
      }),
    )

    await financeClaimsApi.clearFlag(CLAIM_ID)

    expect(seen.called).toBe(true)
  })

  it('surfaces a refusal as an error the screen can show', async () => {
    server.use(
      http.post(`${base}/finances/reconciliation/claims/${CLAIM_ID}/verify`, () =>
        HttpResponse.json(
          {
            success: false,
            data: null,
            error: {
              code: 'MPESA_CODE_ALREADY_USED',
              message: 'That M-PESA code has already been used.',
            },
          },
          { status: 409 },
        ),
      ),
    )

    await expect(
      financeClaimsApi.verify({
        paymentId: CLAIM_ID,
        transactionExists: true,
        amountMatches: true,
        codeMatches: true,
        belongsToBusiness: true,
      }),
    ).rejects.toMatchObject({ status: 409 })
  })
})
