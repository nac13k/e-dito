# Session Handoff (Short)

Last updated: 2026-02-09

- Product is now desktop-first Electron app branded as **E-Dito**.
- IPC + workspace/file operations are implemented (select/read/write/tree/create/delete/duplicate/reveal/export).
- Workspace persistence (last opened folder) is implemented.
- Explorer supports nested folders, collapse/expand, markdown + assets, icons, and `Cmd/Ctrl+P` quick open.
- Editor moved to CodeMirror; preview-first hybrid block editing is active (inline block edit, debounce save, blur flush, block nav/merge/insert shortcuts).
- Export pipeline renders markdown to consolidated PDF (file/folder/project), with Mermaid, emoji, link rewriting, local image embedding, and linked markdown inclusion.
- UI polish completed (titlebar drag fixes, text-selection constraints, dark theme tuning, compact breadcrumbs).
- Icons and packaging pipeline were added (`generate-icons`, `build-final`, `build-local`, CI workflow for main builds and artifact upload).
- Latest packaging fix addressed semver/version + artifact template escaping; local `npm run build:local` passes on mac.
- Important: some commits may still have wrong author email (`francisco.lumbreras@kredi.mx` vs `nac13k@gmail.com`).

Recommended next checks:
- `npm run build:main`
- `npm run build:renderer`
- `npm run build:local`
