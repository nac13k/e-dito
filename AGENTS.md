# AGENTS.md

This repository is an Electron + React + Vite app written in TypeScript.
Use this guide when making changes so automated agents stay consistent with
the existing architecture, code style, and tooling.

## Quick context
- App name: dito-editor (desktop markdown editor).
- Frontend: React 19 + Vite + Tailwind CSS.
- Desktop shell: Electron (main + preload) using ESM modules.
- State: Zustand in renderer.
- Tests: Cypress (E2E only at the moment).

## Session handoff (read first)
- At the start of every new OpenCode session, read `docs/session-handoff.md`
  first, then `docs/session-handoff-short.md` for a quick recap.
- Treat those files as the default continuity context unless the user provides
  more recent instructions in the current session.

## Where things live
- `src/renderer/`: React UI, hooks, styles, Tailwind, shared UI.
- `src/main/`: Electron main process (windows, IPC handlers).
- `src/preload/`: Electron preload bridge (contextBridge API).
- `dist/`: build output (ignored by lint).

## Build / lint / test commands
Use `npm` (not yarn/pnpm) unless the user asks otherwise.

### Dev
- `npm run dev`: start renderer + main + preload + electron.
- `npm run dev:renderer`: Vite dev server only.
- `npm run dev:main`: watch-compile Electron main.
- `npm run dev:preload`: watch-compile preload.
- `npm run dev:electron`: run Electron against Vite dev server.
- `npm run dev:electron:quiet`: same, but without devtools.

### Build
- `npm run build`: build renderer + main + preload.
- `npm run build:renderer`: Vite build only.
- `npm run build:main`: TypeScript build for main + preload.

### Lint
- `npm run lint`: ESLint across the repo.
- Single file lint: `npx eslint src/renderer/app/App.tsx`.

### Tests (Cypress E2E)
- `npm run cy:open`: interactive Cypress.
- `npm run cy:run`: headless run (uses baseUrl http://localhost:5173).
- `npm run cy:run:dev`: start Vite dev server and run Cypress.
- Single test file: `npx cypress run --spec "cypress/e2e/your-spec.cy.ts"`.
- Single test in a file: use `--spec` and `--config`/`--env` as needed; there
  is no test grep script defined yet.

## TypeScript + module setup
- TypeScript is `strict` with `noUnusedLocals` and `noUnusedParameters`.
- Renderer uses path alias: `@/*` -> `src/renderer/*`.
- Electron main/preload are built with `moduleResolution: bundler`.
- ESM is enabled (`"type": "module"` in package.json).

## Code style guidelines
Follow existing patterns in `src/renderer/` and `src/main/`.

### Imports
- Group imports: external packages, then internal alias (`@/...`), then
  relative imports.
- Use `import type` for type-only imports.
- Keep blank lines between import groups.
- In Electron main/preload files, keep `.js` extensions in import paths when
  importing local modules (ESM compatibility).

### Formatting
- Use 2 spaces, trailing commas where present, and semi-free style (matching
  current files).
- Prefer concise arrow functions and avoid unnecessary intermediate variables.
- Keep JSX props readable; prefer line breaks when props exceed ~100 chars.
- Avoid non-ASCII unless the file already uses it (Spanish strings exist).

### Naming
- React components: PascalCase, file name matches component name.
- Hooks: `useX` with clear intent.
- State setters: `setX`.
- Event handlers: `handleX` for internal handlers, `onX` for props.
- IPC channels: `namespace:verb` (e.g., `workspace:select`).

### Types
- Prefer explicit union types for UI state (`'light' | 'dark'`, etc.).
- Use `type` aliases for props and state shapes.
- Keep `Record<string, T>` only when keys are truly dynamic.
- Avoid `any`; use `unknown` and narrow if needed.

### Error handling
- Use early returns and guard clauses for missing data or cancellations.
- In renderer, use optional chaining on `window.api` and provide fallback UI.
- In main/preload, return user-friendly strings for UI surface errors.
- Do not throw in UI handlers unless it is a hard-fail scenario.

### React patterns
- Prefer functional components with hooks.
- Use `useMemo` for derived values when recalculation is non-trivial.
- Avoid calling async functions directly in render; call in handlers/effects.
- Use `void` to intentionally ignore promises in event handlers.
- Use `data-testid` attributes for test hooks when adding new UI.

### State management
- Zustand store lives in `src/renderer/features/**/store.ts`.
- Keep store state minimal; derived values belong in components or selectors.
- When a store action is async, return `Promise<void>` and handle errors.

### CSS / Tailwind
- Tailwind is primary; use the existing `cn` helper for class merging.
- Theme colors are in `tailwind.config.ts` under `canvas` and `ink`.
- Prefer semantic class groupings (layout -> spacing -> color -> effects).
- Avoid inline styles unless necessary (e.g., computed styles in AppShell).

### Electron boundaries
- Preload exposes a typed `window.api` via `contextBridge`.
- Renderer should only access Electron via `window.api` (no direct ipcRenderer).
- Main process should be the only place that touches `dialog`, `shell`, etc.

## Testing guidance
- Cypress uses `baseUrl: http://localhost:5173`.
- Favor `data-testid` for stable selectors.
- If adding new test files, follow `*.cy.ts` naming under `cypress/e2e/`.

## Skills (mandatory usage)
This repo includes agent skills under `.agents/skills/`. When a request matches
one of these skills, you must load and follow that skill before proceeding.

### Available skills
- `agentmd-creator`: use whenever the user asks to create or modify agent
  configuration files (AGENTS.md, CLAUDE.md, Cursor rules, etc.). Follow its
  guided briefing flow and references before editing.
- `cypress`: use when writing, updating, or debugging Cypress E2E/component
  tests; apply its selector, waiting, and network control patterns.
- `e2e-testing-patterns`: use when defining E2E strategy, fixing flaky tests,
  or setting testing standards across the app.

### Skill invocation rules
- Prefer the skill tool over ad-hoc guidance for matching tasks.
- If multiple skills apply, start with the most specific (e.g., `cypress` for
  Cypress tests, `e2e-testing-patterns` for broader E2E strategy).
- Document in your response that the skill was used and summarize key guidance.

## OpenCode agents (project-specific)
Agent definitions live in `.opencode/agents/` as markdown files with YAML
frontmatter. The filename becomes the agent name for `@` mentions.

### builder (subagent)
- File: `.opencode/agents/builder.md`
- Model: `anthropic/claude-opus-4-20250514`
- Use ONLY for complex bugs or large ambiguous implementations after two
  failed iterations by the primary agent.
- If invoked without meeting criteria, it should refuse and return control to
  the primary agent.

## Existing rules from other tools
- No `.cursorrules` or `.cursor/rules/` found in this repo.
- No `.github/copilot-instructions.md` found in this repo.

## Tips for agents
- Read the file you edit before changing it; keep style consistent.
- Update both renderer + main/preload if a feature crosses the IPC boundary.
- Avoid creating new scripts unless the user asks; prefer existing npm scripts.
- Keep UI text in Spanish when editing files that already use Spanish strings.
