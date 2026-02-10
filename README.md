# Dito Editor

Offline-first desktop app for macOS and Linux with a Markdown editor, live preview, Mermaid support, and PDF export.

## What you can do
- Edit Markdown files with syntax highlighting and a quick-format toolbar.
- See a live preview while typing (including interactive task checkboxes).
- Create and render Mermaid diagrams inside your document.
- Open workspace folders and browse files from the sidebar explorer.
- Export the active document to PDF.
- Change the app language (`System`, `Spanish`, `English`).

## Install and run
```bash
npm install
npm run dev
```

## Quick start
1. Open the app and select a folder with `File -> Open Workspace`.
2. In the sidebar explorer, create or open a `.md` file.
3. Write in the editor and review updates in the live preview.
4. Use the toolbar to insert headings, lists, checklists, links, code blocks, and emojis.
5. Export to PDF from the export panel/button.

## Examples

### 1) Daily note with checklist
```md
# Work journal

## Today's tasks
- [x] Review reporting PR
- [ ] Write E2E tests for export
- [ ] Update README with examples
```

### 2) Technical document with code block
````md
# API de Workspace

The app exposes IPC actions to open and manage workspaces.

```ts
await window.api.workspace.selectDirectory()
```
````

### 3) Diagrama Mermaid
````md
# Save flow

```mermaid
flowchart LR
  A[Editor] --> B[Store]
  B --> C[Persistence]
  C --> D[Preview]
```
````

### 4) Internal and external links
```md
- [Go to architecture section](./docs/architecture.md)
- [Open Electron official site](https://www.electronjs.org)
```

Behavior:
- Internal link: opens inside the app.
- External link: asks for confirmation, then opens your default browser.

## Stack
- Electron + React + Vite
- TypeScript end-to-end
- Tailwind CSS + shadcn/ui
- Zustand for renderer state
- simple-git for basic Git operations

## Scripts
- `npm run dev`: starts renderer, preload, and main in development mode.
- `npm run build`: builds renderer and main/preload bundles into `dist/`.
- `npm run build:renderer`: frontend build (Vite).
- `npm run build:main`: Electron main + preload build.
- `npm run lint`: project linting.

## Estructura
```text
src/
  main/
  preload/
  renderer/
    app/
    features/
    shared/
```

## Notes
- In development, `tsc` compiles preload to `dist/preload/index.js`.
- Main loads the Vite dev server when `VITE_DEV_SERVER_URL` is defined.
