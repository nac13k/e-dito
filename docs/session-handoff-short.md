# Session Handoff (Short)

Last updated: 2026-02-10

1. App is desktop-first Electron + React + Vite + TypeScript.
2. Native menu is in place (File/Edit/Window/Help) with open workspace, recents, and clear recents.
3. Recent workspace history persists in Electron `userData/workspace.json`.
4. Explorer UX was refined (clearer indentation, removed top header/path, path shown on hover tooltip only).
5. Context-menu delete now targets the right-clicked item and sends to Trash (`shell.trashItem`).
6. Editor improved with markdown toolbar updates, emoji picker, shortcode insertion, and emoji recents persistence.
7. Editor + preview include extra bottom reading space; preview block edit/caret behavior is stabilized.
8. Preview links: internal links open in-app; external links require confirmation with remember preference.
9. App-wide i18n is implemented (`es-MX`, `en-US`) with OS default, persisted preference, and menu language switching.
10. Latest commits: `7859956` and `3e4eea6`; one unrelated unstaged docs change may still exist.

Tracking files include:
- `docs/session-handoff.md`
- `docs/session-handoff-short.md`
- `.agents/skills/agentmd-creator/SKILL.md`
- `.agents/skills/cypress/SKILL.md`
- `.agents/skills/e2e-testing-patterns/SKILL.md`
- `.opencode/agents/builder.md`

Recommended checks:
- `npm run build:main`
- `npm run build:renderer`
