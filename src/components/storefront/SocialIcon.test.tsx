import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SocialIcon, resolveSocialGlyph, socialLabel } from './SocialIcon'

/**
 * Social resolution.
 *
 * The platform is matched loosely (name, short form and link host), so an owner
 * who typed a platform name and one who only pasted a link both get the right
 * mark; an unknown platform degrades to a neutral globe rather than an empty box.
 */
describe('social icon resolution', () => {
  it('matches a platform by name, short form and URL host', () => {
    expect(resolveSocialGlyph('Instagram')).toBe('instagram')
    expect(resolveSocialGlyph('IG')).toBe('instagram')
    expect(resolveSocialGlyph('Twitter')).toBe('x')
    expect(resolveSocialGlyph('', 'https://www.tiktok.com/@studio')).toBe('tiktok')
    expect(resolveSocialGlyph('myspace')).toBeNull()
  })

  it('always produces a readable label', () => {
    expect(socialLabel('Instagram')).toBe('Instagram')
    expect(socialLabel('Facebook')).toBe('Facebook')
    expect(socialLabel('', 'https://example.com/me')).toBe('example.com')
  })

  it('draws the brand mark when known and a globe when not', () => {
    const { container, rerender } = render(<SocialIcon platform="WhatsApp" />)
    expect(container.querySelector('[data-social="whatsapp"]')).not.toBeNull()

    rerender(<SocialIcon platform="myspace" />)
    expect(container.querySelector('[data-social]')).toBeNull()
    expect(container.querySelector('svg')).not.toBeNull()
  })
})
