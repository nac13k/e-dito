# Session Handoff (Long)

Last updated: 2026-02-09

This file captures the latest implementation context for new OpenCode sessions.

## Current product state
- App is desktop-first (Electron). Browser fallback behavior was removed.
- App branding is now **E-Dito**.
- Dark, minimal UI tuning is in place.

## Major implemented work

### 1) Desktop behavior and IPC
- Preload loading issue was fixed by compiling preload as CommonJS (`tsconfig.preload.json`).
- IPC coverage includes workspace selection, file tree read, file read/write, create/delete/duplicate file, create folder, reveal in Finder, and PDF export operations.
- Workspace persistence was added (save/load last opened workspace in `userData` config).

### 2) Workspace and Explorer
- Workspace picker opens a real filesystem folder.
- Explorer reads nested folder/file tree from disk.
- Hierarchy metadata (`parentId`, `depth`) was added and rendering fixed.
- Folder collapse/expand behavior was added.
- Root workspace context is shown in explorer.
- Quick file open/search via `Cmd/Ctrl+P`.
- Workspace pill shows folder name, full path on hover, and reveals Finder on click.
- Explorer supports markdown and assets (`kind: markdown | asset`) with file-type icons/colors.

### 3) Editor and preview
- Editor migrated to CodeMirror (syntax highlighting + dark theme).
- Markdown flow is preview-first.
- Hybrid block editing is implemented:
  - click preview block to edit raw markdown inline
  - debounced save while typing + flush on blur
  - `Esc` exits block edit
  - `Cmd/Ctrl+Enter` inserts block below
  - `Backspace` at block start merges with previous block
  - `ArrowUp/ArrowDown` boundary navigation across blocks
  - double-newline preserved as intentional split on blur
- Compact breadcrumbs line added in preview:
  - relative file path first
  - active heading hierarchy trail
- Dark highlight intensity and edit-area spacing were reduced.

### 4) Export/PDF
- Export now renders markdown content (not the app shell print).
- Supports file/folder/project consolidated PDF export.
- Added `github-markdown-css` styling for PDF output.
- Added Mermaid rendering in export pipeline.
- Added emoji support (`markdown-it-emoji`).
- Linked markdown inclusion for file export was added (entry doc order).
- Export options for filename/path metadata were added.
- Default export metadata options are now OFF unless enabled from drawer.
- Link and image behavior improved:
  - anchors/links rewritten and preserved
  - local images embedded for export
  - preview resolves local images through data-url IPC

### 5) UI and platform polish
- Removed old "Epica 01" label.
- Fixed hiddenInset titlebar draggable region on macOS.
- Disabled selection for toolbar/sidebar/button text while keeping editor text selectable.

### 6) Icons, packaging, and CI
- Added three SVG icon variants in `public/icons/`.
- Active/default icon is `public/icons/e-dito-icon-v2-violet.svg`.
- Icons integrated in favicon, BrowserWindow icon, and mac dock icon (`app.dock.setIcon`).
- Added `scripts/generate-icons.mjs` for `.icns`, `.ico`, and PNG outputs.
- Added platform-aware builds:
  - `scripts/build-final.mjs`
  - `scripts/build-local.mjs`
- Added workflow `.github/workflows/build-main.yml`:
  - builds on `main` push
  - mac + linux artifacts
  - build version format `YYYYMMDD`
  - artifact names `e-dito-{platform}-{buildVersion}.{ext}`

## Recent commit history
- `62233b1` feat: stabilize desktop markdown workflows and export
- `d7a2c78` feat: refine block editing interactions
- `f681615` docs: add architecture notes and export examples
- `16ae408` chore: ignore local agent metadata artifacts

## Important git note
- Some commits were created with wrong email: `francisco.lumbreras@kredi.mx`.
- Correct email should be: `nac13k@gmail.com`.
- Rewrite may still be pending.

## Latest known working state
- Packaging failure in `build-local` was fixed by:
  - using semver-compatible versioning for build flow
  - fixing artifact name template escaping for `${ext}`
- Updated files:
  - `scripts/build-local.mjs`
  - `.github/workflows/build-main.yml`
  - `package.json` metadata cleanup (description/author + devDependency cleanup)
- Local verification passed for `npm run build:local` on macOS and generated:
  - `release/e-dito-mac-20260209.zip`
  - `release/e-dito-mac-20260209.dmg`
  - blockmaps

## Most relevant files to continue
- `src/main/ipc/registerHandlers.ts`
- `src/main/index.ts`
- `src/main/windows/createMainWindow.ts`
- `src/preload/index.ts`
- `src/renderer/app/App.tsx`
- `src/renderer/app/AppShell.tsx`
- `src/renderer/app/globals.css`
- `src/renderer/features/preview/PreviewPane.tsx`
- `src/renderer/features/editor/EditorPane.tsx`
- `src/renderer/features/explorer/ExplorerSidebar.tsx`
- `src/renderer/features/export/ExportPanel.tsx`
- `src/renderer/features/workspace/store.ts`
- `src/renderer/features/workspace/WorkspaceSwitcher.tsx`
- `src/renderer/shared/types/window.d.ts`
- `public/icons/*`
- `scripts/generate-icons.mjs`
- `scripts/build-final.mjs`
- `scripts/build-local.mjs`
- `.github/workflows/build-main.yml`
- `package.json`
- `.gitignore`

## Smoke-test checklist
- `npm run build:main`
- `npm run build:renderer`
- `npm run build:local`

## Behavior constraints to preserve
- Keep desktop-native behavior.
- Keep dark/minimal visual language.
- Keep hybrid Obsidian/Notion-like block editing model.
- Keep export fidelity for links/images and project-level docs.
