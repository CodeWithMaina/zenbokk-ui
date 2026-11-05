import { describe, expect, it } from 'vitest'
import { findSection } from './catalog'
import { DEFAULT_TEMPLATE_ID, applyTemplate, createDefaultConfig, mergeConfig } from './defaults'
import { TEMPLATES, canonicalTemplateId } from './templates'

/**
 * The template library.
 *
 * These assertions guard the promise the gallery makes to the owner: the designs
 * are genuinely different (not one layout recoloured), `Classic` preserves the
 * pre-builder storefront and is the default, and a business saved against an
 * earlier revision still resolves to a live template.
 */
describe('storefront templates', () => {
  it('offers the eight requested designs', () => {
    expect(TEMPLATES.map((t) => t.id)).toEqual([
      'classic', 'luxe', 'minimal', 'atelier', 'bold', 'professional', 'wellness', 'motion',
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
  })

  it('gives every template a distinct header/hero/footer + blueprint signature', () => {
    const signatures = TEMPLATES.map(
      (t) => `${t.headerVariant}|${t.heroVariant}|${t.footerVariant}|${t.blueprint.map((b) => `${b.key}:${b.variant}`).join(',')}`,
    )
    expect(new Set(signatures).size).toBe(TEMPLATES.length)
    // ...and each carries its own palette, so the previews cannot look alike.
    expect(new Set(TEMPLATES.map((t) => t.swatch[0])).size).toBeGreaterThan(6)
  })

  it('exposes every section variant a template uses in the catalogue', () => {
    // A blueprint variant that the renderer does not know would silently fall
    // back to the section default, so the gallery would lie about the design.
    for (const template of TEMPLATES) {
      for (const entry of template.blueprint) {
        expect(findSection(entry.key), `${template.id} → ${entry.key}`).toBeTruthy()
      }
    }
  })

  it('resolves legacy template ids onto their canonical replacements', () => {
    expect(canonicalTemplateId('modern-minimal')).toBe('classic')
    expect(canonicalTemplateId('luxury-premium')).toBe('luxe')
    expect(canonicalTemplateId('editorial')).toBe('atelier')
    expect(canonicalTemplateId('fitness-lifestyle')).toBe('motion')
    expect(canonicalTemplateId('not-a-template')).toBeNull()
  })

  it('switches design without discarding the owner content', () => {
    const config = createDefaultConfig()
    config.sections[0].title = 'Hand-picked treatments'

    const applied = applyTemplate(config, 'atelier')

    expect(applied.templateId).toBe('atelier')
    expect(applied.header.variant).toBe('centered')
    expect(applied.hero.variant).toBe('editorial')
    expect(applied.sections.find((s) => s.key === 'services')?.title).toBe('Hand-picked treatments')
  })

  it('canonicalises a stored legacy id when merging', () => {
    expect(mergeConfig({ templateId: 'modern-minimal' }).templateId).toBe('classic')
  })
})
