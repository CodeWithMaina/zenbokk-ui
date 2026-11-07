import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/cn'
import { SECTION_CATALOG } from '../../lib/storefront-builder/catalog'

/**
 * The "Add section" modal.
 *
 * Every catalogued section is offered with a thumbnail per design variant, so the
 * owner chooses the shape of the block as they add it rather than dropping a
 * generic one and hunting for the variant in the inspector. The section is added
 * with the exact variant that was clicked.
 */
export function AddSectionDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  onAdd: (key: string, variant: string) => void
}) {
  const [query, setQuery] = useState('')

  if (!open) return null

  const needle = query.trim().toLowerCase()
  const sections = SECTION_CATALOG.filter(
    (def) => !needle || def.label.toLowerCase().includes(needle) || def.description.toLowerCase().includes(needle),
  )

  return (
    <div
      className="sfb-modal-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="sfb-modal" role="dialog" aria-modal="true" aria-label="Add a section">
        <header className="sfb-modal-head">
          <div>
            <p className="text-heading font-bold tracking-snug">Add a section</p>
            <p className="text-caption text-subtle">Pick a block and the variant to start from.</p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
            <X className="size-4" aria-hidden="true" />
          </Button>
        </header>

        <div className="p-[0.6rem] pt-0">
          <input
            type="search"
            aria-label="Search sections"
            placeholder="Search sections…"
            className="w-full rounded-md border border-line bg-bg px-[0.6rem] py-[0.45rem] text-meta"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="sfb-modal-body grid gap-[0.7rem] p-[0.6rem] pt-0">
          {sections.length === 0 ? (
            <p className="text-meta text-muted">No sections match “{query}”.</p>
          ) : null}
          {sections.map((def) => (
            <div key={def.key} className="grid gap-[0.45rem] rounded-md border border-line bg-surface p-[0.6rem]">
              <div className="flex items-start justify-between gap-[0.6rem]">
                <span className="min-w-0">
                  <span className="block text-meta font-medium">{def.label}</span>
                  <span className="block text-caption text-subtle">{def.description}</span>
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0"
                  onClick={() => onAdd(def.key, def.defaultVariant)}
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Add
                </Button>
              </div>
              <ul className="flex flex-wrap gap-[0.4rem]">
                {def.variants.map((variant) => (
                  <li key={variant.value}>
                    <button
                      type="button"
                      className={cn('sfb-variant-thumb')}
                      aria-label={`Add ${def.label} — ${variant.label}`}
                      title={variant.label}
                      data-variant={variant.value}
                      onClick={() => onAdd(def.key, variant.value)}
                    >
                      <span className="sfb-variant-thumb-art" data-variant={variant.value} aria-hidden="true">
                        <i /><i /><i />
                      </span>
                      <span className="sfb-variant-thumb-label">{variant.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
