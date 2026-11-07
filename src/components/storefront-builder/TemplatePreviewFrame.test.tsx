import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TEMPLATES } from '../../lib/storefront-builder/templates'
import { TemplatePreviewFrame } from './TemplatePreviewFrame'

/**
 * The gallery preview.
 *
 * The gallery promises a *rendered* preview, not a recoloured placeholder — so
 * each template's frame must carry its own palette and its own header/hero
 * composition, and every template must render without throwing.
 */
describe('TemplatePreviewFrame', () => {
  it('renders every template without throwing', () => {
    for (const template of TEMPLATES) {
      const { container, unmount } = render(<TemplatePreviewFrame template={template} />)
      expect(container.querySelector(`[data-template="${template.id}"]`)).not.toBeNull()
      unmount()
    }
  })

  it('draws the template palette as tokens and its own hero composition', () => {
    const luxe = TEMPLATES.find((t) => t.id === 'luxe')!
    const { container } = render(<TemplatePreviewFrame template={luxe} />)

    const frame = container.querySelector('.tp-frame') as HTMLElement
    expect(frame.style.getPropertyValue('--tp-primary')).toBe(luxe.swatch[0])
    expect(frame.style.getPropertyValue('--tp-accent')).toBe(luxe.swatch[1])
    // Every design shares the overlay hero / classic header / columns footer, so
    // the real differentiator is the palette, typography and radius.
    expect(container.querySelector('.tp-hero.is-overlay')).not.toBeNull()
    expect(container.querySelector('.tp-header.is-classic')).not.toBeNull()
    expect(container.querySelector('.tp-footer.is-columns')).not.toBeNull()
    expect(frame.style.getPropertyValue('--tp-font-heading')).toContain('Playfair Display')
  })

  it('gives two designs visibly different tokens', () => {
    const luxe = TEMPLATES.find((t) => t.id === 'luxe')!
    const ledger = TEMPLATES.find((t) => t.id === 'ledger')!
    const { container: a } = render(<TemplatePreviewFrame template={luxe} />)
    const { container: b } = render(<TemplatePreviewFrame template={ledger} />)
    const frameA = a.querySelector('.tp-frame') as HTMLElement
    const frameB = b.querySelector('.tp-frame') as HTMLElement
    expect(frameA.style.getPropertyValue('--tp-primary')).not.toBe(frameB.style.getPropertyValue('--tp-primary'))
    expect(frameA.style.getPropertyValue('--tp-font-heading')).not.toBe(frameB.style.getPropertyValue('--tp-font-heading'))
  })

  it('renders a genuinely different layout for a different template', () => {
    const classic = TEMPLATES.find((t) => t.id === 'classic')!
    const { container } = render(<TemplatePreviewFrame template={classic} />)

    // Classic keeps the pre-builder look: a centred hero and a minimal header.
    expect(container.querySelector('.tp-hero.is-centered')).not.toBeNull()
    expect(container.querySelector('.tp-header.is-minimal')).not.toBeNull()
    // The blueprint drives how many section blocks are drawn.
    expect(container.querySelectorAll('.tp-section').length).toBe(
      Math.min(classic.blueprint.length, 4),
    )
  })
})
