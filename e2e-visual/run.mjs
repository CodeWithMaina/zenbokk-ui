/**
 * Headless-browser layout verification for the appointments surfaces.
 *
 * Boots the Vite dev server, drives the real components (through the harness page) at
 * the required viewport widths, and records for each combination:
 *   - horizontal overflow of the document (the thing that breaks a phone screen),
 *   - the surface's own measured width against the viewport,
 *   - which key controls are actually visible,
 *   - a screenshot for human review.
 *
 * Run with:  node e2e-visual/run.mjs
 */
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, 'out')
const PORT = 5199
const BASE = `http://localhost:${PORT}/e2e-visual/harness.html`
const HEIGHT = 900
const WIDTHS = [375, 390, 430, 768, 820, 1024, 1280, 1440]
const SURFACES = [
  'appointments-header',
  'slot-picker',
  'booking-progress',
  'timeline-day',
  'timeline-week',
  'timeline-month',
  'calendar-day',
  'calendar-week',
  'calendar-month',
  'table',
  'filters',
]

mkdirSync(outDir, { recursive: true })

function startServer() {
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  return spawn(command, ['vite', '--port', String(PORT), '--strictPort'], {
    cwd: join(here, '..'),
    stdio: 'ignore',
    shell: process.platform === 'win32',
  })
}

async function waitForServer(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(BASE)
      if (response.ok) return true
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  return false
}

/** Everything measured in the page for one surface at one width. */
const MEASURE = () => {
  const doc = document.documentElement
  const surface = document.querySelector('[data-surface]')
  const controls = [...document.querySelectorAll('button, select, input, a[href]')]
  const visible = (element) => {
    const rect = element.getBoundingClientRect()
    const style = getComputedStyle(element)
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
  }
  // Elements wider than their own box that do not scroll are what actually clip.
  const clipped = [...document.querySelectorAll('[data-surface] *')].filter((element) => {
    if (element.scrollWidth <= element.clientWidth + 1) return false
    const style = getComputedStyle(element)
    return style.overflowX === 'visible' && style.textOverflow !== 'ellipsis'
  })
  // Content pushed past the viewport that is NOT inside a horizontal scroller is what
  // the user cannot reach: a real breakage, as opposed to a table that scrolls by design.
  const insideScroller = (element) => {
    let node = element.parentElement
    while (node && node !== document.body) {
      const style = getComputedStyle(node)
      if (style.overflowX !== 'visible') return true
      node = node.parentElement
    }
    return false
  }
  const unreachable = [...document.querySelectorAll('[data-surface] *')].filter((element) => {
    const rect = element.getBoundingClientRect()
    return rect.width > 0 && rect.right > window.innerWidth + 1 && !insideScroller(element)
  })
  const rawButton = [...controls].find((element) => /^(\d{2}:\d{2})$/.test(element.textContent ?? ''))
  return {
    viewportWidth: window.innerWidth,
    documentWidth: doc.scrollWidth,
    bodyWidth: document.body.scrollWidth,
    // The page's own horizontal overflow. The app clips `body` horizontally, so this is
    // the honest "would the page scroll sideways" measure.
    overflowAmount: document.body.scrollWidth - window.innerWidth,
    unreachableCount: unreachable.length,
    unreachableSample: unreachable
      .slice(0, 3)
      .map((element) => `${element.tagName.toLowerCase()}.${(element.className ?? '').toString().slice(0, 40)}`),
    surfaceWidth: surface ? Math.round(surface.getBoundingClientRect().width) : 0,
    surfaceHeight: surface ? Math.round(surface.getBoundingClientRect().height) : 0,
    controlCount: controls.length,
    visibleControlCount: controls.filter(visible).length,
    clippedCount: clipped.length,
    clippedSample: clipped.slice(0, 3).map((element) => element.className?.toString().slice(0, 60)),
    timelineRows: document.querySelectorAll('[data-state]').length,
    dayGroups: document.querySelectorAll('[data-day]').length,
    monthCells: document.querySelectorAll('[data-surface] button[aria-label^="Open "]').length,
    hasTimeRail: Boolean(rawButton),
    hasClosedMarker: document.body.textContent?.includes('Closed') ?? false,
  }
}

const report = { generatedAt: new Date().toISOString(), results: [], errors: [] }

const server = startServer()
let browser
try {
  if (!(await waitForServer())) throw new Error(`dev server did not start on ${BASE}`)

  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const context = await browser.newContext({ deviceScaleFactor: 1 })

  for (const surface of SURFACES) {
    for (const width of WIDTHS) {
      const page = await context.newPage()
      const consoleErrors = []
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 160))
      })
      page.on('pageerror', (error) => consoleErrors.push(String(error).slice(0, 160)))

      await page.setViewportSize({ width, height: HEIGHT })
      await page.goto(`${BASE}?surface=${surface}`, { waitUntil: 'load' })
      await page.waitForSelector(`[data-surface="${surface}"]`)
      await page.waitForTimeout(150)

      const metrics = await page.evaluate(MEASURE)
      const screenshot = join(outDir, `${surface}-${width}.png`)
      await page.screenshot({ path: screenshot, fullPage: true })

      report.results.push({ surface, width, ...metrics, consoleErrors, screenshot })
      if (consoleErrors.length > 0) report.errors.push({ surface, width, consoleErrors })
      await page.close()
    }
  }
} catch (error) {
  report.errors.push({ fatal: String(error) })
} finally {
  if (browser) await browser.close()
  server.kill()
}

writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2))

const pad = (value, width) => String(value).padEnd(width)
console.log(
  `${pad('surface', 16)}${pad('w', 6)}${pad('body', 6)}${pad('overflow', 10)}${pad('unreach', 8)}${pad('rows', 6)}${pad('days', 6)}${pad('ctl', 6)}${pad('vis', 6)}errs`,
)
for (const result of report.results) {
  console.log(
    `${pad(result.surface, 16)}${pad(result.width, 6)}${pad(result.bodyWidth, 6)}${pad(result.overflowAmount, 10)}${pad(result.unreachableCount, 8)}${pad(result.timelineRows, 6)}${pad(result.dayGroups, 6)}${pad(result.controlCount, 6)}${pad(result.visibleControlCount, 6)}${result.consoleErrors.length}`,
  )
}
const overflowing = report.results.filter((result) => result.overflowAmount > 0)
const unreachable = report.results.filter((result) => result.unreachableCount > 0)
console.log(`\nsurfaces measured: ${report.results.length}`)
console.log(`page-level horizontal overflow: ${overflowing.length}`)
for (const result of overflowing) {
  console.log(`  overflow ${result.overflowAmount}px @ ${result.surface} ${result.width}`)
}
console.log(`surfaces with content past the viewport: ${unreachable.length}`)
for (const result of unreachable) {
  console.log(`  ${result.unreachableCount} @ ${result.surface} ${result.width} -> ${result.unreachableSample.join(', ')}`)
}
console.log(`pages with console errors: ${new Set(report.errors.map((entry) => entry.surface)).size}`)
for (const surface of new Set(report.errors.map((entry) => entry.surface))) {
  const first = report.errors.find((entry) => entry.surface === surface)
  console.log(`  ${surface}: ${JSON.stringify(first.consoleErrors ?? first.fatal)}`)
}
