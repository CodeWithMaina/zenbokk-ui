import type { ReactNode } from 'react'

/** Title + one-line explanation, identical across every step. */
export function StepHeading({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mb-[0.8rem]">
      <h3 className="text-sheet font-semibold text-fg">{title}</h3>
      <p className="mt-[0.15rem] text-meta text-muted">{hint}</p>
    </div>
  )
}

/** A labelled figure row, used by the review step and the payment summary. */
export function FigureRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-[1rem] border-b border-line py-[0.45rem] last:border-b-0">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  )
}
