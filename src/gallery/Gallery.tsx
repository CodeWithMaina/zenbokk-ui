import { useEffect, useState } from 'react'
import { SegmentedControl } from '../components/ui'
import { ThemeControl } from '../theme'
import { ClientsDemo } from './ClientsDemo'
import { ServicesDemo } from './ServicesDemo'
import { SettingsDemo } from './SettingsDemo'

type DemoPage = 'clients' | 'services' | 'settings'

const pages = [
  { value: 'clients', label: 'Clients' },
  { value: 'services', label: 'Services' },
  { value: 'settings', label: 'Settings' },
] as const

function readPage(): DemoPage {
  if (typeof window === 'undefined') return 'clients'
  const hash = window.location.hash.slice(1)
  return pages.some((page) => page.value === hash)
    ? (hash as DemoPage)
    : 'clients'
}

/**
 * Review gallery for the component library. Each page mirrors one of the
 * product designs and is fully interactive, so the components can be checked
 * in both themes without a backend.
 */
export function Gallery() {
  const [page, setPage] = useState<DemoPage>(readPage)

  useEffect(() => {
    const syncPage = () => setPage(readPage())
    window.addEventListener('hashchange', syncPage)
    window.addEventListener('popstate', syncPage)
    return () => {
      window.removeEventListener('hashchange', syncPage)
      window.removeEventListener('popstate', syncPage)
    }
  }, [])

  const changePage = (next: DemoPage) => {
    setPage(next)
    try {
      window.history.pushState(null, '', `#${next}`)
    } catch {
      // Hash updates can fail in sandboxed frames; the tabs still work.
    }
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-[var(--container-page-wide)] flex-wrap items-center gap-x-3 gap-y-[0.5rem] px-[var(--spacing-gutter)] py-[0.65rem]">
          <div className="flex min-w-0 items-center gap-[0.55rem]">
            <span
              aria-hidden="true"
              className="grid size-[2rem] shrink-0 place-items-center rounded-md bg-inverse text-label font-bold text-on-inverse"
            >
              Z
            </span>
            <div className="min-w-0">
              <p className="text-label leading-tight font-bold tracking-snug">
                Zenbokk
              </p>
              <p className="text-caption text-muted">Component library</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-[0.6rem] max-sm:order-3 max-sm:w-full">
            <SegmentedControl
              options={pages}
              value={page}
              onValueChange={changePage}
              label="Demo page"
              className="max-sm:flex-1"
            />
            <ThemeControl />
          </div>
        </div>
      </header>

      <main className="page page-wide">
        {page === 'clients' ? <ClientsDemo /> : null}
        {page === 'services' ? <ServicesDemo /> : null}
        {page === 'settings' ? <SettingsDemo /> : null}
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-[var(--container-page-wide)] px-[var(--spacing-gutter)] py-[1.2rem] text-caption text-muted">
          Built on the Zenbokk token system and component recipes. Theme is
          stored under <code className="rounded-xs bg-sunken px-[0.3rem]">zb-theme</code>{' '}
          and applied before first paint by the boot script in{' '}
          <code className="rounded-xs bg-sunken px-[0.3rem]">index.html</code>.
        </div>
      </footer>
    </div>
  )
}
