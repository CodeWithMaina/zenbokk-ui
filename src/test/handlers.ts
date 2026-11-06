import { http, HttpResponse } from 'msw'
import type { ApiEnvelope } from '../lib/api/types'
import {
  TEST_BUSINESS_ID,
  makeGallery,
  makeOpeningHours,
  makeSearchResponse,
  makeService,
  makeStaff,
} from './fixtures'
import { appointmentHandlers } from './appointment-handlers'

/**
 * MSW request handlers for the storefront's public reads.
 *
 * These are the real routes the app calls, served as the real envelope
 * (`{ success, data, error }`), so the tests exercise the actual API client —
 * URL building, the tenant header, envelope unwrapping and error mapping —
 * rather than a stubbed module. A test that needs a different answer calls
 * `server.use(...)` with its own handler.
 */

/** The success envelope every endpoint returns. */
export function ok<T>(data: T, init?: ResponseInit) {
  const envelope: ApiEnvelope<T> = { success: true, data, error: null }
  return HttpResponse.json(envelope, init)
}

/** The failure envelope, with the HTTP status the controller maps the code to. */
export function fail(code: string, message: string, status = 400) {
  const envelope: ApiEnvelope<never> = {
    success: false,
    data: null,
    error: { code, message },
  }
  return HttpResponse.json(envelope, { status })
}

const base = '*/api/v1'

export const handlers = [
  ...appointmentHandlers,

  http.get(`${base}/businesses/:businessId/gallery`, () => ok(makeGallery(3))),

  // The storefront reads the business's payment setup before the appointment exists,
  // so it can show the M-PESA instructions and collect the pasted confirmation in the
  // booking wizard. The default is "no manual M-PESA": a test that cares about the
  // channel overrides this handler with its own details.
  http.get(`${base}/businesses/:businessId/payment-details`, () =>
    ok({
      businessId: TEST_BUSINESS_ID,
      businessName: 'Test Studio',
      currency: 'KES',
      enabled: false,
      accountType: null,
      paybillNumber: null,
      paybillAccount: null,
      tillNumber: null,
      payeeName: null,
      instructions: null,
      bookingFeePercentage: 0,
      cashEnabled: true,
    }),
  ),

  http.get(`${base}/businesses/:businessId/opening-hours`, () => ok(makeOpeningHours())),

  http.get(`${base}/businesses/:businessId/search`, ({ request }) => {
    const url = new URL(request.url)
    return ok(
      makeSearchResponse({
        query: url.searchParams.get('q') ?? '',
        type: url.searchParams.get('type') ?? 'all',
        page: Number(url.searchParams.get('page') ?? '1'),
      }),
    )
  }),

  http.get(`${base}/services/:businessId`, () => ok([makeService()])),

  http.get(`${base}/services/:businessId/staff`, () => ok([makeStaff()])),

  http.post(`${base}/businesses/:businessId/enquiries`, () =>
    ok({ reference: 'ENQ-7F3A2C4D', businessName: 'Nuru Studio', receivedAt: new Date().toISOString() }),
  ),

  // Unused by default but referenced by the tenant-isolation assertions: a
  // request for another business must never be answered by these handlers.
  http.get(`${base}/businesses/by-slug/:slug/bootstrap`, () =>
    ok({
      businessId: TEST_BUSINESS_ID,
      slug: 'nuru-studio',
      moved: false,
      business: { id: TEST_BUSINESS_ID },
      landingPage: { businessId: TEST_BUSINESS_ID },
    }),
  ),
]
