import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createDefaultConfig } from '../../lib/storefront-builder/defaults'
import { useBuilderEditor } from '../../lib/storefront-builder/use-builder-editor'
import { renderDashboard } from '../../test/render'
import { BuilderSidebar } from './BuilderSidebar'

/**
 * Template switching inside the editor.
 *
 * The picker must re-lay-out the working configuration on the click itself —
 * the preview updates immediately and nothing is fetched — while the owner's
 * content is carried across.
 */
function Harness() {
  const editor = useBuilderEditor(createDefaultConfig())
  editor.config.sections[0].title = 'Hand-picked treatments'
  return (
    <>
      <BuilderSidebar editor={editor} can={() => true} />
      <output data-testid="template">{editor.config.templateId}</output>
      <output data-testid="hero">{editor.config.hero.variant}</output>
      <output data-testid="section-title">{editor.config.sections[0].title}</output>
    </>
  )
}

describe('BuilderSidebar template picker', () => {
  it('switches template instantly and keeps the owner content', () => {
    renderDashboard(<Harness />)
    expect(screen.getByTestId('template')).toHaveTextContent('classic')

    fireEvent.click(screen.getByRole('button', { name: 'Template' }))
    fireEvent.click(screen.getByRole('button', { name: /Luxe/ }))

    expect(screen.getByTestId('template')).toHaveTextContent('luxe')
    expect(screen.getByTestId('hero')).toHaveTextContent('premium')
    // Content is not part of the design, so it survives the switch.
    expect(screen.getByTestId('section-title')).toHaveTextContent('Hand-picked treatments')
  })
})
