# Epica 01 - Editor Markdown Desktop

Aplicacion de escritorio offline-first para macOS y Linux con editor Markdown, preview en vivo, Mermaid y exportacion a PDF.

## Stack
- Electron + React + Vite
- TypeScript end-to-end
- Tailwind CSS + shadcn/ui
- simple-git para operaciones Git basicas

## Scripts
- `npm run dev`: inicia renderer, preload y main en modo desarrollo.
- `npm run build`: genera renderer y bundles de main/preload en `dist/`.
- `npm run lint`: lint del proyecto.

## Estructura
```
src/
  main/
  preload/
  renderer/
    app/
    features/
    shared/
```

## Notas
- En desarrollo, `tsc` compila el preload en `dist/preload/index.js`.
- El main carga el dev server de Vite cuando `VITE_DEV_SERVER_URL` esta definido.
