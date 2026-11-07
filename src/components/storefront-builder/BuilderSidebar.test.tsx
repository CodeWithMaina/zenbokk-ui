import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createDefaultConfig } from '../../lib/storefront-builder/defaults'
import { useBuilderEditor } from '../../lib/storefront-builder/use-builder-editor'
import { renderDashboard } from '../../test/render'
import { BuilderInspector } from './BuilderInspector'
import { BuilderSidebar } from './BuilderSidebar'

/**
 * The builder's editor IA and interactions.
 *
 * The left rail is four tabs (Structure / Pages / Theme / Motion), the inspector
 * is split into sub-tabs, and the owner can drag a section to reorder it, add a
 * specific variant from the add-section modal, and one-tap a motion preset.
 *
 * The starting configuration is built **once**, because `useBuilderEditor`
 * re-seeds from its `initial` argument whenever that value's content changes.
 */
function initialConfig() {
  const config = createDefaultConfig()
  const services = config.sections.find((section) => section.key === 'services')
  if (services) services.title = 'Hand-picked treatments'
  return config
}

const INITIAL_CONFIG = initialConfig()

function Harness() {
  const editor = useBuilderEditor(INITIAL_CONFIG)
  const services = editor.config.sections.find((section) => section.key === 'services')
  return (
    <>
      <BuilderSidebar editor={editor} can={() => true} />
      <BuilderInspector editor={editor} hasMediaLibrary={false} />
      <output data-testid="template">{editor.config.templateId}</output>
      <output data-testid="hero">{editor.config.hero.variant}</output>
      <output data-testid="order">{editor.config.sections.map((s) => s.key).join(',')}</output>
      <output data-testid="animation">{editor.config.theme.animation}</output>
      <output data-testid="nav-count">{editor.config.header.nav.length}</output>
      <output data-testid="gallery-variants">
        {editor.config.sections.filter((s) => s.key === 'gallery').map((s) => s.variant).join(',')}
      </output>
      <output data-testid="section-title">{services?.title ?? ''}</output>
    </>
  )
}

describe('BuilderSidebar editor IA', () => {
  it('shows the four left tabs', () => {
    renderDashboard(<Harness />)
    for (const tab of ['structure', 'pages', 'theme', 'motion']) {
      expect(screen.getByTestId(`builder-tab-${tab}`)).toBeInTheDocument()
    }
    // Structure is the default tab.
    expect(screen.getByTestId('builder-tab-structure')).toHaveAttribute('aria-selected', 'true')
  })

  it('switches template from the Theme tab and keeps the owner content', () => {
    renderDashboard(<Harness />)
    expect(screen.getByTestId('template')).toHaveTextContent('classic')

    fireEvent.click(screen.getByTestId('builder-tab-theme'))
    fireEvent.click(screen.getByRole('button', { name: /Luxe/ }))

    expect(screen.getByTestId('template')).toHaveTextContent('luxe')
    expect(screen.getByTestId('hero')).toHaveTextContent('overlay')
    expect(screen.getByTestId('section-title')).toHaveTextContent('Hand-picked treatments')
  })

  it('reorders a section by drag-and-drop', () => {
    renderDashboard(<Harness />)
    expect(screen.getByTestId('order')).toHaveTextContent('services,about,gallery,testimonials,booking,contact')

    // Drag "gallery" up and drop it in the gap above "services".
    fireEvent.dragStart(screen.getByTestId('section-row-gallery'))
    fireEvent.dragOver(screen.getByTestId('section-row-services'), { clientY: 0 })
    // A visible drop indicator marks the insertion point.
    expect(screen.getAllByTestId('drop-indicator').length).toBeGreaterThan(0)
    fireEvent.drop(screen.getByTestId('section-row-services'))

    expect(screen.getByTestId('order')).toHaveTextContent('gallery,services,about,testimonials,booking,contact')
  })

  it('adds a section with the exact variant chosen in the modal', () => {
    renderDashboard(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: /Add section/ }))
    // The modal offers a thumbnail per variant of the section.
    fireEvent.click(screen.getByRole('button', { name: 'Add Gallery — Masonry' }))
    expect(screen.getByTestId('gallery-variants')).toHaveTextContent('grid,masonry')
  })

  it('applies a motion preset from the Motion tab', () => {
    renderDashboard(<Harness />)
    fireEvent.click(screen.getByTestId('builder-tab-motion'))
    fireEvent.click(screen.getByRole('button', { name: /Lively/ }))
    expect(screen.getByTestId('animation')).toHaveTextContent('zoom')
  })

  it('edits the header through its Design / Navigation / Mobile menu sub-tabs', () => {
    renderDashboard(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Header' }))
    expect(screen.getByTestId('subtabs-design')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('subtabs-navigation'))
    fireEvent.click(screen.getByRole('button', { name: 'Add link' }))
    expect(screen.getByTestId('nav-count')).toHaveTextContent('1')

    fireEvent.click(screen.getByTestId('subtabs-mobile'))
    expect(screen.getByText('Slides in from')).toBeInTheDocument()
  })

  it('splits the section inspector into Content / Layout / Motion', () => {
    renderDashboard(<Harness />)
    fireEvent.click(screen.getByTestId('section-row-services'))
    expect(screen.getByTestId('subtabs-content')).toBeInTheDocument()
    expect(screen.getByTestId('subtabs-layout')).toBeInTheDocument()
    expect(screen.getByTestId('subtabs-motion')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('subtabs-layout'))
    expect(screen.getByText('Columns')).toBeInTheDocument()
  })
})
