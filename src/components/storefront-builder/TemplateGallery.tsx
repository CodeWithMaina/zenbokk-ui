import { useMemo, useState } from 'react'
import { Check, Eye, Palette, Sparkles } from 'lucide-react'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Field, Select } from '../ui/field'
import { PageHeader } from '../ui/page-header'
import { TEMPLATES, TEMPLATE_CATEGORIES } from '../../lib/storefront-builder/templates'
import { TemplatePreviewFrame } from './TemplatePreviewFrame'

/**
 * The template gallery: browse, filter and preview the design directions, then
 * apply one. Applying a template changes the design (theme, header/hero/footer
 * variants, section arrangement) while preserving the owner's content — the
 * server does the merge, so this screen only has to present the choice.
 *
 * Each card renders the template's *actual* design language (tokens, variants,
 * section order) through `TemplatePreviewFrame`, so the previews are genuinely
 * different layouts rather than one mock in different colours.
 */
export function TemplateGallery({
  activeTemplateId,
  applying,
  onApply,
  onCustomize,
}: {
  activeTemplateId: string
  applying: boolean
  onApply: (templateId: string) => void
  /** Apply the template and open the visual editor on it. */
  onCustomize?: (templateId: string) => void
}) {
  const [category, setCategory] = useState('all')
  const [style, setStyle] = useState('all')

  const styles = useMemo(
    () => Array.from(new Set(TEMPLATES.flatMap((t) => t.tags))).sort(),
    [],
  )

  const visible = TEMPLATES.filter(
    (t) =>
      (category === 'all' || t.category === category) &&
      (style === 'all' || t.tags.includes(style)),
  )

  return (
    <div>
      <PageHeader
        title="Template library"
        description="Pick a starting design. Switching templates keeps your content and only changes the look."
      />

      <div className="mb-[1rem] flex flex-wrap items-end gap-[0.8rem]">
        <Field label="Category" className="min-w-[12rem]">
          <Select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">All categories</option>
            {TEMPLATE_CATEGORIES.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </Select>
        </Field>
        <Field label="Visual style" className="min-w-[12rem]">
          <Select value={style} onChange={(event) => setStyle(event.target.value)}>
            <option value="all">Any style</option>
            {styles.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </Select>
        </Field>
      </div>

      {visible.length === 0 ? (
        <Card className="p-[1.2rem] text-meta text-muted">
          No templates match those filters. Try a different category or style.
        </Card>
      ) : (
        <div className="grid gap-[1rem] sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((template) => {
            const active = template.id === activeTemplateId
            return (
              <Card key={template.id} className="sfb-template-card p-[1rem]">
                <div className="sfb-template-shot">
                  <TemplatePreviewFrame template={template} />
                  {active ? (
                    <span className="sfb-template-badge">
                      <Check className="size-[0.8rem]" aria-hidden="true" /> Active
                    </span>
                  ) : null}
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-heading font-bold tracking-snug">{template.name}</h3>
                    <span className="text-caption text-subtle">{template.category}</span>
                  </div>
                  <p className="mt-[0.2rem] text-meta text-muted">{template.description}</p>
                </div>

                <div className="flex flex-wrap gap-[0.3rem]">
                  {template.tags.map((tag) => (
                    <span key={tag} className="chip text-caption">{tag}</span>
                  ))}
                </div>

                <div className="sfb-template-actions">
                  <Button
                    variant={active ? 'default' : 'primary'}
                    disabled={active || applying}
                    onClick={() => onApply(template.id)}
                  >
                    <Palette className="size-4" aria-hidden="true" />
                    {active ? 'Currently applied' : applying ? 'Applying…' : 'Use this template'}
                  </Button>
                  {onCustomize ? (
                    <Button variant="ghost" disabled={applying} onClick={() => onCustomize(template.id)}>
                      {active ? (
                        <Sparkles className="size-4" aria-hidden="true" />
                      ) : (
                        <Eye className="size-4" aria-hidden="true" />
                      )}
                      {active ? 'Customize' : 'Preview & customize'}
                    </Button>
                  ) : null}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
