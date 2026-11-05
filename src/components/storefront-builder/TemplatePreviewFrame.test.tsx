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
    // Luxe is the premium hero behind a floating header.
    expect(container.querySelector('.tp-hero.is-premium')).not.toBeNull()
    expect(container.querySelector('.tp-header.is-floating')).not.toBeNull()
    expect(container.querySelector('.tp-footer.is-editorial')).not.toBeNull()
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
