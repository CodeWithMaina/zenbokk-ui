import { describe, expect, it } from 'vitest'
import {
  applyTemplate,
  createDefaultConfig,
  makeSection,
  mergeConfig,
  resequence,
  slugify,
} from './defaults'
import { SECTION_CATALOG, normaliseVariant } from './catalog'
import { TEMPLATES } from './templates'

/**
 * The Storefront Builder's client-side configuration logic.
 *
 * These mirror the server's merge/apply-template rules, so a disagreement here
 * would show the owner a preview that the published storefront never matches.
 */
describe('storefront builder defaults', () => {
  it('produces a complete, non-empty default configuration', () => {
    const config = createDefaultConfig()
    expect(config.templateId).toBe('classic')
    expect(config.sections.length).toBeGreaterThan(0)
    expect(config.pages.map((p) => p.kind)).toEqual(['home', 'services', 'about', 'contact'])
    expect(config.theme.primary).toMatch(/^#/)
    // The design's motion controls are present with their documented defaults.
    expect(config.theme.mode).toBe('light')
    expect(config.theme.durationMs).toBe(600)
  })

  it('preserves the pre-builder storefront as the default Classic template', () => {
    // The default business storefront must render exactly as it did before the
    // builder shipped: a full-bleed centred hero, minimal header/footer and the
    // same section arrangement.
    const config = createDefaultConfig()
    expect(config.templateId).toBe('classic')
    expect(config.header.variant).toBe('minimal')
    expect(config.hero.variant).toBe('centered')
    expect(config.footer.variant).toBe('minimal')
    expect(config.sections.map((s) => `${s.key}:${s.variant}`)).toEqual([
      'services:list', 'about:centered', 'gallery:grid',
      'testimonials:quote', 'booking:minimal', 'contact:minimal',
    ])
  })

  it('offers eight genuinely distinct designs', () => {
    expect(TEMPLATES).toHaveLength(8)
    // The designs share a page structure but never a palette.
    expect(new Set(TEMPLATES.map((t) => t.theme.primary)).size).toBe(TEMPLATES.length)
  })

  it('normalises an unknown variant to the section default', () => {
    expect(normaliseVariant('services', 'not-a-variant')).toBe('cards')
    expect(normaliseVariant('services', null)).toBe('cards')
    expect(normaliseVariant('services', 'scroller')).toBe('scroller')
  })

  it('merges a partial config over the defaults and drops unknown sections', () => {
    const merged = mergeConfig({
      sections: [
        { id: 'a', key: 'services', variant: 'grid', enabled: true, order: 5, title: 'Our menu', description: null, settings: {}, columns: 3, background: 'default', padding: 'normal', alignment: 'left', animation: 'inherit' },
        { id: 'b', key: 'not-a-real-section', variant: 'x', enabled: true, order: 9, title: null, description: null, settings: {}, columns: 3, background: 'default', padding: 'normal', alignment: 'left', animation: 'inherit' },
      ],
    })
    expect(merged.sections).toHaveLength(1)
    expect(merged.sections[0].key).toBe('services')
    expect(merged.sections[0].title).toBe('Our menu')
    // Untouched keys fall back to the platform defaults.
    expect(merged.theme.primary).toBe(createDefaultConfig().theme.primary)
  })

  it('switches template design while preserving owner content', () => {
    const config = createDefaultConfig()
    config.sections = [makeSection('services', 'grid')]
    config.sections[0].title = 'Hand-picked treatments'
    config.sections[0].settings = { note: 'keep me' }

    const applied = applyTemplate(config, 'luxe')

    expect(applied.templateId).toBe('luxe')
    expect(applied.header.variant).toBe('classic')
    expect(applied.hero.variant).toBe('overlay')
    // The owner's content survived the design change.
    const services = applied.sections.find((s) => s.key === 'services')
    expect(services?.title).toBe('Hand-picked treatments')
    expect(services?.settings.note).toBe('keep me')
  })

  it('normalises the design’s new theme, section and footer fields on merge', () => {
    const merged = mergeConfig({
      theme: { ...createDefaultConfig().theme, mode: 'sepia', durationMs: 9999, hoverEffect: 'lift' },
      footer: { ...createDefaultConfig().footer, padding: 999 },
      sections: [makeSection('services')],
    })
    // An unknown enum falls back to the default; a numeric range is clamped.
    expect(merged.theme.mode).toBe('light')
    expect(merged.theme.durationMs).toBe(1500)
    expect(merged.footer.padding).toBe(120)
    expect(merged.sections[0].animation).toBe('inherit')
    expect(merged.sections[0].columns).toBe(3)
  })

  it('seeds the whole five-page site when a design template is applied', () => {
    const applied = applyTemplate(createDefaultConfig(), 'bloom')
    expect(applied.pages.map((p) => p.slug)).toEqual(['', 'services', 'about', 'gallery', 'contact'])
    // The home page never carries its own hero/sections — the storefront-wide
    // pair is its single source of truth.
    const home = applied.pages.find((p) => p.kind === 'home')
    expect(home?.hero).toBeNull()
    expect(home?.sections).toBeNull()
    // Every other page carries its own hero copy and section list.
    const about = applied.pages.find((p) => p.kind === 'about')
    expect(about?.hero?.heading).toBe('The people behind the studio')
    expect(about?.sections?.map((s) => s.key)).toEqual(['about', 'richtext', 'testimonials'])
  })

  it('resolves a legacy template id onto its canonical replacement', () => {
    const config = createDefaultConfig()
    // A business saved against an earlier revision still resolves to a template.
    expect(mergeConfig({ templateId: 'luxury-premium' }).templateId).toBe('luxe')
    expect(mergeConfig({ templateId: 'modern-minimal' }).templateId).toBe('classic')
    expect(applyTemplate(config, 'editorial').templateId).toBe('atelier')
  })

  it('re-sequences section order to 10, 20, 30…', () => {
    const ordered = resequence([makeSection('stats'), makeSection('faq'), makeSection('contact')])
    expect(ordered.map((s) => s.order)).toEqual([10, 20, 30])
  })

  it('every catalogued section exposes at least one variant', () => {
    for (const section of SECTION_CATALOG) {
      expect(section.variants.length).toBeGreaterThan(0)
      expect(section.variants.some((v) => v.value === section.defaultVariant)).toBe(true)
    }
  })

  it('slugifies page titles', () => {
    expect(slugify('Our Treatments & Prices')).toBe('our-treatments-prices')
  })
})
