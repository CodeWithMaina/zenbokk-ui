import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import type { LegalDocument } from '../../lib/marketing/legal'
import { COPYRIGHT_YEAR } from '../../lib/marketing/content'
import { Container, PublicCanvas } from './PublicCanvas'
import { PunchedMark, PunchedWordmark } from './PunchedMark'

/**
 * A platform legal page — the Privacy Policy, Terms of Service and Legal
 * information, rendered through the shared marketing canvas.
 *
 * It is one component so the three pages share one shell, and so a change to the
 * voice or the measure happens once. The content comes from
 * `lib/marketing/legal.ts`, never from the JSX.
 */
export function LegalPage({ document }: { document: LegalDocument }) {
  return (
    <PublicCanvas>
      <header className="fixed inset-x-0 top-0 z-(--z-header) flex h-12 items-center justify-between border-b border-line bg-bg px-5 md:px-16">
        <Link to="/" aria-label="Punched home" className="flex items-center gap-2 no-underline">
          <PunchedMark className="size-4" />
          <span className="punch-display text-[1.15rem] leading-none tracking-tight text-fg">
            PUNCHED
          </span>
        </Link>
        <Link
          to="/"
          className="flex items-center gap-2 font-mono text-[0.75rem] text-subtle no-underline transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back
        </Link>
      </header>

      <main className="flex flex-col pt-12">
        <article className="w-full px-5 py-16 md:py-24">
          <Container>
            <p className="punch-eyebrow mb-6">Legal</p>
            <h1 className="punch-display max-w-[20ch] text-[clamp(2.25rem,7vw,4rem)] leading-[1.02] tracking-tight">
              {document.title}
            </h1>
            <p className="mt-4 font-mono text-[0.75rem] text-subtle">Last updated {document.updated}</p>
            <p className="punch-body mt-8 max-w-[46rem] text-[17px] leading-[1.7]">{document.intro}</p>

            <div className="mt-14 grid max-w-[52rem] gap-11">
              {document.sections.map((section) => (
                <section key={section.heading}>
                  <h2 className="punch-display text-[1.4rem] tracking-tight">{section.heading}</h2>
                  <div className="mt-4 grid gap-4">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph} className="punch-body text-[16px] leading-[1.75]">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </Container>
        </article>
      </main>

      <footer className="mt-auto flex w-full flex-col items-center justify-between gap-6 border-t border-line px-5 py-8 md:flex-row md:px-16">
        <PunchedWordmark />
        <nav aria-label="Legal" className="flex flex-wrap justify-center gap-6 font-mono text-[0.75rem] text-subtle">
          <Link to="/privacy" className="transition-colors hover:text-fg">
            Privacy
          </Link>
          <Link to="/terms" className="transition-colors hover:text-fg">
            Terms
          </Link>
          <Link to="/legal" className="transition-colors hover:text-fg">
            Legal
          </Link>
        </nav>
        <span className="font-mono text-[0.75rem] text-subtle">© {COPYRIGHT_YEAR} Punched</span>
      </footer>
    </PublicCanvas>
  )
}
