/**
 * One-off probe: which element is actually wider than the viewport?
 *
 * `run.mjs` measures the document; this names the culprit, for a single surface and
 * width. Run with:  node e2e-visual/probe.mjs <surface> <width>
 */
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const here = dirname(fileURLToPath(import.meta.url))
const PORT = 5198
const BASE = `http://localhost:${PORT}/e2e-visual/harness.html`
const surface = process.argv[2] ?? 'timeline-day'
const width = Number(process.argv[3] ?? 375)

const server = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite', '--port', String(PORT), '--strictPort'], {
  cwd: join(here, '..'),
  stdio: 'ignore',
  shell: process.platform === 'win32',
})

async function waitForServer() {
  const deadline = Date.now() + 90_000
  while (Date.now() < deadline) {
    try {
      if ((await fetch(BASE)).ok) return true
    } catch {
      /* retry */
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  return false
}

let browser
try {
  if (!(await waitForServer())) throw new Error('server did not start')
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage()
  await page.setViewportSize({ width, height: 900 })
  await page.goto(`${BASE}?surface=${surface}`, { waitUntil: 'load' })
  await page.waitForSelector(`[data-surface="${surface}"]`)
  await page.waitForTimeout(200)

  const offenders = await page.evaluate(() => {
    const limit = window.innerWidth
    const widest = [...document.querySelectorAll('body *')].sort(
      (a, b) => b.getBoundingClientRect().right - a.getBoundingClientRect().right,
    )[0]
    const chain = []
    let node = widest
    while (node && node !== document.documentElement.parentElement) {
      const style = getComputedStyle(node)
      chain.push({
        tag: node.tagName?.toLowerCase(),
        cls: (node.className ?? '').toString().slice(0, 50),
        rectWidth: Math.round(node.getBoundingClientRect().width),
        clientWidth: node.clientWidth,
        scrollWidth: node.scrollWidth,
        overflowX: style.overflowX,
        minWidth: style.minWidth,
      })
      node = node.parentElement
    }
    return {
      htmlScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      innerWidth: window.innerWidth,
      chain,
      offenders: [...document.querySelectorAll('body *')]
        .map((element) => {
          const rect = element.getBoundingClientRect()
          return {
            tag: element.tagName.toLowerCase(),
            cls: (element.className ?? '').toString().slice(0, 60),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
            overflowX: getComputedStyle(element).overflowX,
          }
        })
        .filter((entry) => entry.right > limit + 1)
        .sort((a, b) => b.right - a.right)
        .slice(0, 8),
    }
  })

  // Proof that the application stylesheet actually loaded: `p-[1rem]` is a Tailwind
  // utility on the harness wrapper, and `--bg` is one of the app's own CSS variables.
  const styling = await page.evaluate(() => {
    const wrapper = document.querySelector('[data-surface]')
    const style = wrapper ? getComputedStyle(wrapper) : null
    return {
      styleSheets: document.styleSheets.length,
      wrapperPadding: style?.padding,
      appBgVariable: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),
      bodyBackground: getComputedStyle(document.body).backgroundColor,
    }
  })
  console.log('styling', JSON.stringify(styling))

  console.log(`surface=${surface} width=${width}`)
  console.log(`html.scrollWidth=${offenders.htmlScrollWidth} body.scrollWidth=${offenders.bodyScrollWidth} innerWidth=${offenders.innerWidth}`)
  console.log('--- ancestor chain of the widest element (leaf -> root) ---')
  for (const entry of offenders.chain) console.log(JSON.stringify(entry))
  console.log('--- widest elements ---')
  for (const entry of offenders.offenders) console.log(JSON.stringify(entry))
} catch (error) {
  console.error('probe failed', error)
} finally {
  if (browser) await browser.close()
  server.kill()
}
