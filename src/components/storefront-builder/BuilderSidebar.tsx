import { useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  FileText,
  GripVertical,
  LayoutTemplate,
  Palette,
  PanelBottom,
  Plus,
  Settings2,
  Sliders,
  Trash2,
  Type,
} from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/cn'
import { SECTION_CATALOG, findSection } from '../../lib/storefront-builder/catalog'
import { applyTemplate } from '../../lib/storefront-builder/defaults'
import { TEMPLATES } from '../../lib/storefront-builder/templates'
import type { BuilderEditor, BuilderPanel } from '../../lib/storefront-builder/use-builder-editor'
import { TemplatePreviewFrame } from './TemplatePreviewFrame'

const PANELS: { value: BuilderPanel; label: string; icon: typeof Type }[] = [
  { value: 'page', label: 'Page & sections', icon: FileText },
  { value: 'templates', label: 'Template', icon: Palette },
  { value: 'theme', label: 'Branding & type', icon: Sliders },
  { value: 'header', label: 'Header', icon: LayoutTemplate },
  { value: 'hero', label: 'Hero', icon: Type },
  { value: 'footer', label: 'Footer', icon: PanelBottom },
  { value: 'pages', label: 'Pages & nav', icon: Settings2 },
  { value: 'seo', label: 'SEO', icon: Settings2 },
]

/**
 * Instant template switching inside the editor.
 *
 * Selecting a template re-lays-out the working configuration client-side — the
 * preview updates on the click, with no backend round-trip — and the choice is
 * persisted with the rest of the draft on save. Only the design changes: the
 * owner's titles, settings, media and pages are carried across.
 */
function TemplatePicker({ editor }: { editor: BuilderEditor }) {
  return (
    <div className="grid gap-[0.4rem] p-[0.6rem]">
      <p className="eyebrow px-[0.2rem]">Template</p>
      <p className="px-[0.2rem] text-caption text-subtle">
        Switching changes the design only — your content, images and booking stay.
      </p>
      <ul className="grid gap-[0.5rem]">
        {TEMPLATES.map((template) => {
          const active = template.id === editor.config.templateId
          return (
            <li key={template.id}>
              <button
                type="button"
                className={cn('sfb-template-pick', active && 'is-active')}
                aria-pressed={active}
                onClick={() => editor.update((current) => applyTemplate(current, template.id, true))}
              >
                <TemplatePreviewFrame template={template} className="sfb-template-pick-shot" />
                <span className="sfb-template-pick-meta">
                  <span className="text-meta font-medium">{template.name}</span>
                  <span className="text-caption text-subtle">{template.category}</span>
                </span>
                {active ? <Check className="size-4 shrink-0 text-success" aria-hidden="true" /> : null}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}


export function BuilderSidebar({
  editor,
  can,
}: {
  editor: BuilderEditor
  can: (capability: string) => boolean
}) {
  const [adding, setAdding] = useState(false)
  const { config } = editor

  const available = SECTION_CATALOG.filter(
    (def) => def.repeatable || !config.sections.some((s) => s.key === def.key),
  )

  return (
    <div className="sfb-pane sfb-pane-left grid gap-0">
      <nav className="grid gap-[0.2rem] border-b border-line p-[0.6rem]" aria-label="Builder panels">
        {PANELS.map((panel) => {
          const Icon = panel.icon
          const active = editor.panel === panel.value || (panel.value === 'page' && editor.panel === 'section')
          return (
            <button
              key={panel.value}
              type="button"
              onClick={() => editor.setPanel(panel.value)}
              className={cn(
                'flex items-center gap-[0.5rem] rounded-md px-[0.6rem] py-[0.5rem] text-left text-meta font-medium transition-colors',
                active
                  ? 'bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-fg'
                  : 'text-muted hover:bg-hover hover:text-fg',
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {panel.label}
            </button>
          )
        })}
      </nav>

      {editor.panel === 'templates' ? <TemplatePicker editor={editor} /> : null}

      {editor.panel === 'templates' ? null : (
      <div className="grid gap-[0.4rem] p-[0.6rem]">
        <p className="eyebrow px-[0.2rem]">Sections</p>
        {config.sections.length === 0 ? (
          <p className="px-[0.2rem] text-caption text-subtle">No sections yet. Add one below.</p>
        ) : null}

        <ul className="grid gap-[0.2rem]">
          {config.sections.map((section, index) => {
            const def = findSection(section.key)
            const selected = editor.selectedSectionId === section.id
            const allowed = !def?.capability || can(def.capability)
            return (
              <li
                key={section.id}
                className={cn('sfb-section-row', selected && 'is-selected', !section.enabled && 'is-off')}
                onClick={() => editor.select(section.id)}
              >
                <GripVertical className="sfb-section-grip size-4" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-meta font-medium">
                    {section.title || def?.label || section.key}
                  </span>
                  <span className="block truncate text-caption text-subtle">
                    {def?.label ?? section.key} · {section.variant}
                    {allowed ? '' : ' · hidden by plan'}
                  </span>
                </span>
                <span className="flex items-center gap-[0.1rem]">
                  <button type="button" className="btn-icon" aria-label="Move up" disabled={index === 0}
                    onClick={(e) => { e.stopPropagation(); editor.moveSection(section.id, -1) }}>
                    <ChevronUp className="size-4" aria-hidden="true" />
                  </button>
                  <button type="button" className="btn-icon" aria-label="Move down" disabled={index === config.sections.length - 1}
                    onClick={(e) => { e.stopPropagation(); editor.moveSection(section.id, 1) }}>
                    <ChevronDown className="size-4" aria-hidden="true" />
                  </button>
                  <button type="button" className="btn-icon" aria-label={section.enabled ? 'Hide section' : 'Show section'}
                    onClick={(e) => { e.stopPropagation(); editor.toggleSection(section.id) }}>
                    {section.enabled ? <Eye className="size-4" aria-hidden="true" /> : <EyeOff className="size-4" aria-hidden="true" />}
                  </button>
                  <button type="button" className="btn-icon" aria-label="Duplicate section"
                    onClick={(e) => { e.stopPropagation(); editor.duplicateSection(section.id) }}>
                    <Copy className="size-4" aria-hidden="true" />
                  </button>
                  <button type="button" className="btn-icon" aria-label="Delete section"
                    onClick={(e) => { e.stopPropagation(); editor.removeSection(section.id) }}>
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </span>
              </li>
            )
          })}
        </ul>

        <Button size="sm" onClick={() => setAdding((open) => !open)}>
          <Plus className="size-4" aria-hidden="true" />
          Add section
        </Button>

        {adding ? (
          <div className="sfb-add-list">
            {available.map((def) => (
              <button
                key={def.key}
                type="button"
                className="sfb-add-item"
                onClick={() => {
                  editor.addSection(def.key)
                  setAdding(false)
                }}
              >
                <span className="min-w-0">
                  <span className="block text-meta font-medium">{def.label}</span>
                  <span className="block truncate text-caption text-subtle">{def.description}</span>
                </span>
                <Plus className="size-4 shrink-0" aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
      )}
    </div>
  )
}
