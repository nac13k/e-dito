# Session Handoff (Long)

Last updated: 2026-02-10

This file captures the latest implementation context for new OpenCode sessions.

## Current product state
- App is desktop-first (Electron shell + React renderer).
- Workspace-driven markdown editing flow is stable.
- i18n is enabled app-wide with English and Spanish.

## Major implemented work

### 1) Desktop behavior and app menu
- Native app menu implemented in main process:
  - File / Edit / Window / Help
  - Open workspace
  - Open recent workspace
  - Clear recent workspaces
  - Standard edit actions (undo/redo/cut/copy/paste, paste plain)
- Recent workspace list persists in Electron `userData` config (`workspace.json`).

### 2) Workspace and explorer UX
- Explorer indentation and hierarchy readability were improved.
- Explorer top title/project/full-path header was removed.
- File/folder full path is now shown only via hover tooltip.
- Right-click delete target bug was fixed (acts on clicked file, not active file).
- File deletion now moves files to Trash (`shell.trashItem`) instead of hard delete.

### 3) Editor and preview improvements
- CodeMirror markdown tooling expanded:
  - toolbar actions for headings, lists, checklist, quote, code block, link
  - emoji picker with shortcode insertion (`:emoji_name:`)
  - emoji recents saved in localStorage
- Removed toolbar arrow move buttons.
- Added `40vh` bottom reading space in editor and preview.
- Fixed preview block-edit caret jump (typing no longer jumps to end).
- Added smooth centering when entering block edit in preview.

### 4) Preview links and checkboxes
- Internal markdown links open inside the app.
- External links show confirmation dialog with optional "don't ask again".
- External-link confirmation preference is persisted in workspace config.
- Preview task checkboxes are interactive and update markdown source.
- Checkbox toggle instability fixed with single-pass checkbox index matching.
- Mermaid preview race condition fixed for rapid navigation/rerender.

### 5) i18n implementation
- Added app-wide i18n with `i18next` + `react-i18next`.
- Supported languages: `es-MX`, `en-US`.
- Default language resolves from OS locale; fallback is `en-US`.
- Language preference persisted as `system | es-MX | en-US`.
- Menu language switching added under Edit -> Language.
- Main and renderer language state sync via IPC:
  - `i18n:get-state`
  - `i18n:set-preference`
  - `i18n:changed`
- Core renderer and main-process UI strings were translated.

## Recent commit history
- `7859956` feat: enhance preview navigation and editor interactions
- `3e4eea6` feat: add app-wide i18n with system language defaults

## Important git note
- One unrelated docs file may remain unstaged:
  - `docs/export-fixture-project/architecture/integration.md`
- Do not revert unrelated user changes unless explicitly requested.

## Tracking files (keep updated)
- `docs/session-handoff.md`
- `docs/session-handoff-short.md`
- `README.md`
- `AGENTS.md`
- `.agents/skills/agentmd-creator/SKILL.md`
- `.agents/skills/cypress/SKILL.md`
- `.agents/skills/e2e-testing-patterns/SKILL.md`
- `.opencode/agents/builder.md`

## Most relevant source files
- `src/main/index.ts`
- `src/main/i18n.ts`
- `src/main/ipc/registerHandlers.ts`
- `src/main/menu/createAppMenu.ts`
- `src/main/workspaceConfig.ts`
- `src/preload/index.ts`
- `src/renderer/main.tsx`
- `src/renderer/i18n/index.ts`
- `src/renderer/i18n/resources.ts`
- `src/renderer/shared/types/window.d.ts`
- `src/renderer/app/App.tsx`
- `src/renderer/app/AppShell.tsx`
- `src/renderer/app/CommandPalette.tsx`
- `src/renderer/features/editor/EditorPane.tsx`
- `src/renderer/features/editor/AssetPreviewPane.tsx`
- `src/renderer/features/preview/PreviewPane.tsx`
- `src/renderer/features/explorer/ExplorerSidebar.tsx`
- `src/renderer/features/export/ExportPanel.tsx`
- `src/renderer/features/git/GitPanel.tsx`
- `src/renderer/features/workspace/WorkspaceSwitcher.tsx`

## Build status last verified
- `npm run build:main` passed
- `npm run build:renderer` passed

## Behavior constraints to preserve
- Keep desktop-native behavior first.
- Keep dark/minimal visual language currently in use.
- Keep hybrid preview/edit workflow and block editing behavior.
- Keep internal docs links opening in-app.
- Keep external links behind confirmation (with persisted remember option).
