import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

/**
 * Test configuration.
 *
 * Deliberately separate from `vite.config.ts`: the production config runs the
 * TanStack Router plugin (which regenerates `routeTree.gen.ts` on every start)
 * and the Tailwind plugin. Tests import components directly, not routes, so
 * neither is needed here — and keeping them out means a test run cannot rewrite
 * a generated file or pay for a CSS build.
 *
 * The API is exercised through MSW rather than module mocks, so the real client
 * (`lib/api/client.ts`: envelope unwrapping, bearer/tenant headers, error
 * mapping) is under test too.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    environmentOptions: {
      // A non-local hostname, so `isLocalHost()` is false and tenant host
      // resolution can be exercised. `zenbokk.com` is the marketing host, which
      // keeps the path-based storefront fallback (the same shape local dev uses).
      jsdom: { url: 'http://zenbokk.com/' },
    },
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Deterministic host configuration, so tenant resolution and canonical URLs
    // are testable without depending on the developer's `.env`.
    env: {
      VITE_ROOT_DOMAIN: 'zenbokk.com',
      VITE_MARKETING_HOST: 'zenbokk.com',
      VITE_ADMIN_HOST: 'admin.zenbokk.com',
    },
    // An unexpected request is a bug (a missing handler or a duplicate fetch),
    // so it fails the test instead of silently hitting the network.
    server: { deps: { inline: ['@tanstack/react-router'] } },
    restoreMocks: true,
    unstubGlobals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/routes/**',
        'src/routeTree.gen.ts',
        'src/**/*.d.ts',
      ],
    },
  },
})
