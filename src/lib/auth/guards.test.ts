import { describe, expect, it } from 'vitest'
import { destinationForRole, homePathForRole, postSignInDestination } from './guards'

/**
 * The sign-in redirect strategy.
 *
 * Two rules matter: every role has exactly one home (an owner's is
 * `/dashboard`), and a console role is never returned to a storefront it merely
 * signed in from. A customer, by contrast, is returned to the shop and the
 * booking draft they came from.
 */
describe('homePathForRole', () => {
  it('gives every role its own home', () => {
    expect(homePathForRole('Business')).toBe('/dashboard')
    expect(homePathForRole('Staff')).toBe('/staff')
    expect(homePathForRole('Admin')).toBe('/admin')
    expect(homePathForRole('Customer')).toBe('/')
  })
})

describe('destinationForRole', () => {
  it('keeps the admin console on its own host', () => {
    expect(destinationForRole('Admin')).toEqual({
      kind: 'external',
      href: 'http://admin.zenbokk.com/admin',
    })
  })

  it('keeps every other role in the app', () => {
    expect(destinationForRole('Business')).toEqual({ kind: 'internal', to: '/dashboard' })
    expect(destinationForRole('Staff')).toEqual({ kind: 'internal', to: '/staff' })
    expect(destinationForRole('Customer')).toEqual({ kind: 'internal', to: '/' })
  })
})

describe('postSignInDestination', () => {
  it('sends an owner to the dashboard after signing in from a storefront', () => {
    expect(postSignInDestination('Business', '/nuru-studio/book')).toEqual({
      kind: 'internal',
      to: '/dashboard',
    })
    expect(postSignInDestination('Business', '/nuru-studio')).toEqual({
      kind: 'internal',
      to: '/dashboard',
    })
  })

  it('sends an owner to the dashboard when no redirect was asked for', () => {
    expect(postSignInDestination('Business')).toEqual({ kind: 'internal', to: '/dashboard' })
  })

  it('honours a deep link inside the owner console', () => {
    expect(postSignInDestination('Business', '/dashboard/appointments')).toEqual({
      kind: 'deep-link',
      href: '/dashboard/appointments',
    })
    expect(postSignInDestination('Business', '/dashboard?tab=today')).toEqual({
      kind: 'deep-link',
      href: '/dashboard?tab=today',
    })
  })

  it('keeps staff and admins inside their own consoles', () => {
    expect(postSignInDestination('Staff', '/staff/appointments')).toEqual({
      kind: 'deep-link',
      href: '/staff/appointments',
    })
    expect(postSignInDestination('Staff', '/nuru-studio/book')).toEqual({
      kind: 'internal',
      to: '/staff',
    })
    expect(postSignInDestination('Admin', '/admin/users')).toEqual({
      kind: 'deep-link',
      href: '/admin/users',
    })
    expect(postSignInDestination('Admin', '/dashboard')).toEqual({
      kind: 'external',
      href: 'http://admin.zenbokk.com/admin',
    })
  })

  it('returns a customer to the shop and the booking draft they came from', () => {
    expect(postSignInDestination('Customer', '/nuru-studio/book')).toEqual({
      kind: 'deep-link',
      href: '/nuru-studio/book',
    })
    expect(postSignInDestination('Customer', '/book')).toEqual({
      kind: 'deep-link',
      href: '/book',
    })
  })

  it('falls back to the customer home when no deep link was asked for', () => {
    expect(postSignInDestination('Customer')).toEqual({ kind: 'internal', to: '/' })
  })

  it('does not treat a sibling path as part of the console', () => {
    expect(postSignInDestination('Business', '/dashboardish')).toEqual({
      kind: 'internal',
      to: '/dashboard',
    })
  })
})

