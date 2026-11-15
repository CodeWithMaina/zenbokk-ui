/// <reference types="vite/client" />

/**
 * Vite's client types for this project.
 *
 * `vite/client` is what gives TypeScript the ambient declarations for everything Vite
 * handles that TypeScript does not know about on its own:
 *
 *  - CSS and asset side-effect imports (`declare module '*.css' {}`), so
 *    `import './index.css'` type-checks;
 *  - CSS modules (`*.module.css`) with their typed default export;
 *  - `import.meta.env` and the `VITE_*` variables, so `import.meta.env.VITE_…`
 *    resolves;
 *  - `import.meta.hot` and the `?raw` / `?url` / `?worker` import query suffixes.
 *
 * The reference has to live in a file the TypeScript project actually includes. This
 * file is under `src`, which is in `tsconfig.app.json`'s `include`, so every browser
 * file in the project — application and dev-harness alike — sees it.
 */
