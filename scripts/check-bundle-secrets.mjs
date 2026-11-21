#!/usr/bin/env node
/**
 * Fail the build when a secret-looking string reaches the browser bundle.
 *
 * Vite exposes every `VITE_*` variable to client code, and a careless
 * `loadEnv(mode, cwd, '')` (which this project's vite.config.ts uses for the dev
 * proxy) can leak anything else that is in the environment. This check inspects
 * the *output* rather than trusting the configuration: whatever ends up in
 * dist/ is what the browser gets.
 *
 *   npm run verify:bundle        # after `npm run build`
 *
 * Prints the file and the pattern NAME only — never the matched value, so a
 * leak is reported without being copied into a CI log.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = fileURLToPath(new URL('../dist/', import.meta.url))

const PATTERNS = [
  ['postgres-connection-string', /postgres(ql)?:\/\/[^\s"'`]+:[^\s"'`]+@/i],
  ['redis-connection-string', /redis(s)?:\/\/[^\s"'`]*:[^\s"'`]*@/i],
  ['private-key-block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['aws-access-key-id', /\bAKIA[0-9A-Z]{16}\b/],
  ['github-token', /\bgh[pousr]_[A-Za-z0-9]{30,}\b/],
  ['slack-token', /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/],
  ['stripe-secret', /\bsk_(live|test)_[A-Za-z0-9]{16,}\b/],
  // Configuration KEY names are the other half of the risk: if a key name is in
  // the bundle, its value was injected too.
  ['backend-secret-key-name', /\b(DATABASE_URL|DIRECT_DATABASE_URL|JwtSettings__Secret|MediaStorage__SecretAccessKey|Payments__CredentialEncryptionKey|Daraja__ConsumerSecret|Vapid__PrivateKey|Email__Password|Sms__ApiKey|APP_ENV_NAME)\b/],
]

if (!existsSync(DIST)) {
  console.error('verify:bundle: dist/ is missing — run `npm run build` first.')
  process.exit(1)
}

const files = []
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full)
    else if (/\.(js|mjs|css|html|map)$/.test(entry)) files.push(full)
  }
}
walk(DIST)

const findings = []
for (const file of files) {
  const text = readFileSync(file, 'utf8')
  for (const [name, pattern] of PATTERNS) {
    if (pattern.test(text)) findings.push({ file: relative(DIST, file), name })
  }
}

if (findings.length > 0) {
  console.error('verify:bundle: secret-like content found in the browser bundle:')
  for (const f of findings) console.error(`  - ${f.file} [${f.name}]`)
  console.error('\nRemove the source of the value: only VITE_* variables may reach client code.')
  process.exit(1)
}

console.log(`verify:bundle: ${files.length} files scanned, no secrets found.`)
