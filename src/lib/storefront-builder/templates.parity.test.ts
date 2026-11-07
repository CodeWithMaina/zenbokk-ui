import { describe, expect, it } from 'vitest'
import {
  ANIMATION_OPTIONS,
  DRAWER_OPTIONS,
  FOOTER_VARIANTS,
  HEADER_VARIANTS,
  HERO_VARIANTS,
  HOVER_EFFECT_OPTIONS,
  MODE_OPTIONS,
  PAGE_TRANSITION_OPTIONS,
  SECTION_BACKGROUND_OPTIONS,
  SECTION_PADDING_OPTIONS,
  normaliseFooterLayout,
  normaliseHeaderLayout,
  normaliseHeroLayout,
} from './catalog'
import { applyTemplate, createDefaultConfig, defaultTheme } from './defaults'
import { TEMPLATES, designTheme } from './templates'

/**
 * Cross-checks the mirrored template library against the server's, value by
 * value.
 *
 * The frontend and backend cannot import each other, so the only way to stop the
 * two definitions drifting apart is to pin the *server's* numbers here and fail
 * loudly when either side changes. Every literal below is copied from
 * `PunchedApi/Application/Services/StorefrontTemplates*.cs` and
 * `StorefrontLayoutCatalog.cs`.
 */

/** id → [name, category, primary, accent, background, surface, heading, body, radiusPx, headline] */
const SERVER_DESIGNS: Record<string, [string, string, string, string, string, string, string, string, number, string]> = {
  atelier: ['Atelier', 'Beauty and Salon', '#1c1917', '#b45309', '#fffdf8', '#f5f0e6', 'Newsreader', 'Figtree', 0, 'The art of a good haircut.'],
  luxe: ['Luxe', 'Beauty and Salon', '#1a1712', '#cbb27a', '#faf7f0', '#f1ebdd', 'Playfair Display', 'Figtree', 2, 'Quiet luxury, beautifully finished.'],
  fade: ['Fade & Co', 'Barbershop', '#14213d', '#e0a526', '#ffffff', '#f1f3f7', 'DM Sans', 'DM Sans', 6, 'Sharp cuts. Straight talk.'],
  bloom: ['Bloom', 'Fitness and Wellness', '#2f5d50', '#d98b6a', '#f8faf7', '#e9efe9', 'Newsreader', 'Figtree', 14, 'Slow down. Feel like yourself.'],
  ink: ['Inkwell', 'Photography', '#111111', '#ff5a36', '#f4f4f2', '#e8e8e4', 'DM Sans', 'DM Sans', 0, 'Portraits with a point of view.'],
  table: ['Saffron Table', 'Restaurant and Hospitality', '#5b1e1e', '#c9a14a', '#fdf8f2', '#f3e9dc', 'Playfair Display', 'Figtree', 4, 'Dinner worth planning around.'],
  ledger: ['Ledger', 'Professional Services', '#1e3a5f', '#3b82f6', '#ffffff', '#f2f5f9', 'DM Sans', 'DM Sans', 8, 'Clear advice for growing businesses.'],
}

describe('storefront template parity', () => {
  it('lists Classic followed by exactly the seven server designs', () => {
    expect(TEMPLATES.map((t) => t.id)).toEqual(['classic', ...Object.keys(SERVER_DESIGNS)])
  })

  it('matches every design’s name, category, palette, typography and radius', () => {
    for (const [id, spec] of Object.entries(SERVER_DESIGNS)) {
      const [name, category, primary, accent, background, surface, headingFont, bodyFont, radiusPx, headline] = spec
      const template = TEMPLATES.find((t) => t.id === id)!
      expect(template.name, id).toBe(name)
      expect(template.category, id).toBe(category)
      expect(template.theme.primary, id).toBe(primary)
      expect(template.theme.accent, id).toBe(accent)
      expect(template.theme.background, id).toBe(background)
      expect(template.theme.surface, id).toBe(surface)
      expect(template.theme.headingFont, id).toBe(headingFont)
      expect(template.theme.bodyFont, id).toBe(bodyFont)
      expect(template.theme.radiusPx, id).toBe(radiusPx)
      expect(template.pages.find((p) => p.kind === 'home')?.heroHeading, id).toBe(headline)
      expect(template.swatch, id).toEqual([primary, accent, background])
    }
  })

  it('derives design tokens exactly as the server’s DesignTheme does', () => {
    for (const [id, spec] of Object.entries(SERVER_DESIGNS)) {
      const [, , primary, accent, background, surface, headingFont, bodyFont, radiusPx] = spec
      const expected = designTheme({ primary, accent, background, surface, headingFont, bodyFont, radiusPx })
      const template = TEMPLATES.find((t) => t.id === id)!
      expect(template.theme, id).toEqual(expected)
    }
  })

  it('produces the server’s full theme when a design template is applied', () => {
    const applied = applyTemplate(createDefaultConfig(), 'ink')
    expect(applied.theme).toEqual({
      ...defaultTheme(),
      ...designTheme({
        primary: '#111111', accent: '#ff5a36', background: '#f4f4f2', surface: '#e8e8e4',
        headingFont: 'DM Sans', bodyFont: 'DM Sans', radiusPx: 0,
      }),
    })
  })

  it('exposes the server’s header, hero and footer layout vocabularies', () => {
    expect(HEADER_VARIANTS.map((v) => v.value)).toEqual([
      'classic', 'centered', 'split', 'minimal', 'pill', 'glass', 'utility', 'bar',
    ])
    expect(HERO_VARIANTS.map((v) => v.value)).toEqual([
      'overlay', 'centered', 'split', 'split-reverse', 'minimal', 'gradient', 'facts', 'collage', 'booking',
    ])
    expect(FOOTER_VARIANTS.map((v) => v.value)).toEqual([
      'columns', 'newsletter', 'centered', 'minimal', 'wordmark', 'split',
    ])
  })

  it('exposes the server’s motion and control vocabularies', () => {
    expect(MODE_OPTIONS.map((v) => v.value)).toEqual(['light', 'dark'])
    expect(ANIMATION_OPTIONS.map((v) => v.value)).toEqual(['inherit', 'none', 'fade', 'up', 'left', 'zoom', 'blur'])
    expect(HOVER_EFFECT_OPTIONS.map((v) => v.value)).toEqual(['none', 'lift', 'glow', 'zoom'])
    expect(PAGE_TRANSITION_OPTIONS.map((v) => v.value)).toEqual(['none', 'fade', 'slide'])
    expect(DRAWER_OPTIONS.map((v) => v.value)).toEqual(['left', 'right', 'top', 'full'])
    expect(SECTION_BACKGROUND_OPTIONS.map((v) => v.value)).toEqual(['default', 'surface', 'primary', 'accent'])
    expect(SECTION_PADDING_OPTIONS.map((v) => v.value)).toEqual(['compact', 'normal', 'generous'])
  })

  it('resolves a stored legacy layout to the same canonical layout as the server', () => {
    expect(normaliseHeaderLayout('solid')).toBe('classic')
    expect(normaliseHeaderLayout('floating')).toBe('pill')
    expect(normaliseHeaderLayout('sticky-compact')).toBe('classic')
    expect(normaliseHeaderLayout('mobile-first')).toBe('minimal')
    expect(normaliseHeroLayout('full-image')).toBe('overlay')
    expect(normaliseHeroLayout('splitr')).toBe('split-reverse')
    // An unknown value falls back to the server's fallback.
    expect(normaliseHeaderLayout('nonsense')).toBe('classic')
    expect(normaliseHeroLayout('nonsense')).toBe('overlay')
    expect(normaliseFooterLayout('nonsense')).toBe('columns')
  })
})
