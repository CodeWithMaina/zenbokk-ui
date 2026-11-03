import { http, HttpResponse } from 'msw'
import type { ApiEnvelope, Appointment } from '../lib/api/types'
import type { AppointmentActivityEntry } from '../lib/appointments'
import {
  makeActivity,
  makeAppointment,
  makeAppointmentDashboard,
  makeAvailability,
  makePaymentSummary,
} from './appointments'

/**
 * MSW handlers for the Appointments module.
 *
 * These are the real routes the app calls, served as the real envelope, so a
 * test exercises the API client end to end. A test that needs a different answer
 * calls `server.use(...)` with its own handler.
 */

const base = '*/api/v1'

function ok<T>(data: T, init?: ResponseInit) {
  const envelope: ApiEnvelope<T> = { success: true, data, error: null }
  return HttpResponse.json(envelope, init)
}

function fail(code: string, message: string, status = 400) {
  const envelope: ApiEnvelope<never> = { success: false, data: null, error: { code, message } }
  return HttpResponse.json(envelope, { status })
}

/** The appointment a mutation returns, with its status (or time) changed. */
function mutated(status: string, scheduledAt?: string): Appointment {
  const result = makeAppointment({ status })
  return scheduledAt ? { ...result, scheduledAt, endAt: scheduledAt } : result
}

export const appointmentHandlers = [
  http.get(`${base}/businesses/me/appointments`, () => ok(makeAppointmentDashboard())),

  http.post(`${base}/businesses/me/appointments`, async ({ request }) => {
    const body = (await request.json()) as { scheduledAt?: string }
    if (!body.scheduledAt) return fail('VALIDATION_ERROR', 'scheduledAt is required.', 422)
    return ok(makeAppointment({ status: 'booked', scheduledAt: body.scheduledAt }))
  }),

  http.get(`${base}/businesses/me/appointments/:id`, () => ok(makeAppointment())),

  http.get(`${base}/businesses/me/appointments/:id/activity`, () =>
    ok<AppointmentActivityEntry[]>([
      makeActivity(),
      makeActivity({ id: 'aaaaaaaa-3333-4333-8333-aaaaaaaaaaaa', status: 'confirmed', note: null }),
    ]),
  ),

  http.patch(`${base}/businesses/me/appointments/:id/note`, async ({ request }) => {
    const body = (await request.json()) as { note?: string | null }
    return ok(makeAppointment({ note: body.note ?? null }))
  }),

  http.post(`${base}/businesses/me/appointments/:id/confirm`, () => ok(mutated('confirmed'))),

  http.post(`${base}/businesses/me/appointments/:id/complete`, () => ok(mutated('completed'))),

  http.post(`${base}/businesses/me/appointments/:id/no-show`, () => ok(mutated('no_show'))),

  http.post(`${base}/businesses/me/appointments/:id/cancel`, () => ok(mutated('cancelled'))),

  http.post(`${base}/businesses/me/appointments/:id/reschedule`, async ({ request }) => {
    const body = (await request.json()) as { scheduledAt: string }
    return ok(mutated('confirmed', body.scheduledAt))
  }),

  http.get(`${base}/businesses/:businessId/availability`, ({ request }) => {
    const url = new URL(request.url)
    const date = url.searchParams.get('startDate') ?? '2026-05-12'
    return ok([
      makeAvailability(date),
      makeAvailability(date, { localTime: '10:00', startAtUtc: `${date}T10:00:00.000Z` }),
      makeAvailability(date, {
        localTime: '11:00',
        startAtUtc: `${date}T11:00:00.000Z`,
        status: 'booked',
        isAvailable: false,
      }),
    ])
  }),

  http.get(`${base}/payments/appointment/:appointmentId`, () => ok(makePaymentSummary())),

  // A not-found appointment, so the error path is testable without inventing one.
  http.get(`${base}/businesses/me/appointments/not-a-real-appointment`, () =>
    fail('NOT_FOUND', 'Appointment not found.', 404),
  ),
]
