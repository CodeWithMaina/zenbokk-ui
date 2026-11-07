import { describe, expect, it } from 'vitest'
import { findSection } from './catalog'
import { DEFAULT_TEMPLATE_ID, applyTemplate, createDefaultConfig, mergeConfig } from './defaults'
import { TEMPLATES, canonicalTemplateId } from './templates'

/**
 * The template library.
 *
 * These assertions guard the promise the gallery makes to the owner: `Classic`
 * preserves the pre-builder storefront and is the default, a business saved
 * against an earlier revision still resolves to a live template, and each design
 * is a genuinely distinct direction (its own palette, typography and radius)
 * rather than one layout recoloured.
 *
 * The exact, byte-for-byte agreement with the server lives in
 * `templates.parity.test.ts`.
 */
describe('storefront templates', () => {
  it('offers Classic plus the seven designs', () => {
    expect(TEMPLATES.map((t) => t.id)).toEqual([
      'classic', 'atelier', 'luxe', 'fade', 'bloom', 'ink', 'table', 'ledger',
    ])
  })

  it('makes Classic the default and reproduces the pre-builder storefront', () => {
    expect(DEFAULT_TEMPLATE_ID).toBe('classic')
    const config = createDefaultConfig()
    expect(config.templateId).toBe('classic')
    expect(config.hero.variant).toBe('centered')
    expect(config.header.variant).toBe('minimal')
    expect(config.sections.map((s) => s.key)).toEqual([
      'services', 'about', 'gallery', 'testimonials', 'booking', 'contact',
    ])
    // Classic seeds no pages, so the platform default pages stand.
    expect(config.pages.map((p) => p.kind)).toEqual(['home', 'services', 'about', 'contact'])
  })

  it('gives every design its own palette, typography and radius', () => {
    const primary = new Set(TEMPLATES.map((t) => t.theme.primary))
    const headings = new Set(TEMPLATES.map((t) => t.theme.headingFont))
    expect(primary.size).toBe(TEMPLATES.length)
    expect(headings.size).toBeGreaterThan(1)
    expect(new Set(TEMPLATES.map((t) => t.swatch[0])).size).toBe(TEMPLATES.length)
  })

  it('seeds the same five-page site for every design template', () => {
    const designs = TEMPLATES.filter((t) => t.id !== 'classic')
    for (const template of designs) {
      expect(template.pages.map((p) => p.id)).toEqual([
        'home', 'services', 'about', 'gallery', 'contact',
      ])
    }
  })

  it('exposes every section variant a template uses in the catalogue', () => {
    // A blueprint variant the renderer does not know would silently fall back to
    // the section default, so the gallery would lie about the design.
    for (const template of TEMPLATES) {
      for (const entry of template.blueprint) {
        expect(findSection(entry.key), `${template.id} → ${entry.key}`).toBeTruthy()
      }
      for (const page of template.pages) {
        for (const entry of page.blueprint) {
          expect(findSection(entry.key), `${template.id}/${page.id} → ${entry.key}`).toBeTruthy()
        }
      }
    }
  })

  it('resolves legacy template ids onto their canonical replacements', () => {
    expect(canonicalTemplateId('modern-minimal')).toBe('classic')
    expect(canonicalTemplateId('luxury-premium')).toBe('luxe')
    expect(canonicalTemplateId('editorial')).toBe('atelier')
    expect(canonicalTemplateId('fitness-lifestyle')).toBe('fade')
    // The production family the design catalogue replaced.
    expect(canonicalTemplateId('minimal')).toBe('atelier')
    expect(canonicalTemplateId('professional')).toBe('ledger')
    expect(canonicalTemplateId('bold')).toBe('ink')
    expect(canonicalTemplateId('wellness')).toBe('bloom')
    expect(canonicalTemplateId('motion')).toBe('fade')
    expect(canonicalTemplateId('not-a-template')).toBeNull()
  })

  it('switches design without discarding the owner content', () => {
    const config = createDefaultConfig()
    config.sections[0].title = 'Hand-picked treatments'

    const applied = applyTemplate(config, 'atelier')

    expect(applied.templateId).toBe('atelier')
    expect(applied.header.variant).toBe('classic')
    expect(applied.hero.variant).toBe('overlay')
    expect(applied.sections.find((s) => s.key === 'services')?.title).toBe('Hand-picked treatments')
  })

  it('canonicalises a stored legacy id when merging', () => {
    expect(mergeConfig({ templateId: 'modern-minimal' }).templateId).toBe('classic')
    expect(mergeConfig({ templateId: 'wellness' }).templateId).toBe('bloom')
  })
})

