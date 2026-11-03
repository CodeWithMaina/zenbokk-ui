import { describe, expect, it } from 'vitest'
import {
  isRenderableSection,
  isSectionKey,
  resolveNavigation,
  sectionLabel,
  sectionPath,
} from './sections'
import { makeLandingPage } from '../../test/fixtures'

/**
 * Entitlement-aware, owner-configured navigation.
 *
 * The storefront must show exactly the sections the owner enabled AND the plan
 * includes AND this client can render — nothing more. These are the rules that
 * decide what a business's visitors can reach, so they are asserted directly.
 */
const allCaps = (value: boolean) => () => value

describe('storefront sections', () => {
  it('shows a section only when the owner enabled it, the plan allows it and it is renderable', () => {
    const landingPage = makeLandingPage()

    const enabled = resolveNavigation(landingPage, allCaps(true))
    expect(enabled).toEqual(['services', 'booking', 'reviews', 'gallery', 'about', 'contact'])

    // A plan without the gallery module loses the gallery link.
    const withoutGallery = resolveNavigation(landingPage, (key) => key !== 'gallery')
    expect(withoutGallery).not.toContain('gallery')
    expect(withoutGallery).toContain('services')

    // The owner switching a section off removes it even when the plan allows it.
    const hidden = resolveNavigation(
      makeLandingPage({ navigation: { ...landingPage.navigation, reviews: false } }),
      allCaps(true),
    )
    expect(hidden).not.toContain('reviews')
  })

  it('never offers loyalty or the internal details section', () => {
    const navigation = resolveNavigation(
      makeLandingPage({
        navigation: { ...makeLandingPage().navigation, loyalty: true, businessinfo: true },
      }),
      allCaps(true),
    )

    expect(navigation).not.toContain('loyalty')
    expect(navigation).not.toContain('businessinfo')
    expect(isRenderableSection('loyalty')).toBe(false)
    expect(sectionPath('loyalty')).toBeNull()
  })

  it('maps each renderable section to a real page', () => {
    expect(sectionPath('services')).toBe('/services')
    expect(sectionPath('booking')).toBe('/book')
    expect(sectionPath('reviews')).toBe('/reviews')
    expect(sectionPath('gallery')).toBe('/gallery')
    expect(sectionPath('about')).toBe('/about')
    expect(sectionPath('contact')).toBe('/contact')
  })

  it('recognises the section vocabulary and labels it', () => {
    expect(isSectionKey('GALLERY')).toBe(true)
    expect(isSectionKey('nonsense')).toBe(false)
    expect(sectionLabel('gallery')).toBe('Gallery')
    expect(sectionLabel('booking')).toBe('Book')
  })
})
