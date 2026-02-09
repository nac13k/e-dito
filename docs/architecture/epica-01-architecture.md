# Epica 01 - Arquitectura Propuesta

## Alcance y objetivo
- Aplicacion de escritorio offline-first para macOS y Linux.
- Editor Markdown con preview en vivo, Mermaid y exportacion a PDF autocontenido.
- Explorador de archivos del proyecto y soporte Git basico.

## Componentes
- **App Shell (Renderer)**: layout principal, barra superior, sidebar, tabs, notificaciones, command palette.
- **Feature: Workspace**: selector de proyecto, recientes, preferencias por proyecto.
- **Feature: Explorer**: arbol de archivos, crear/renombrar/borrar, busqueda local.
- **Feature: Editor**: editor Markdown con autocompletado, shortcuts y split view.
- **Feature: Preview**: render Markdown y Mermaid en vivo, sanitizer de HTML/SVG.
- **Feature: Export**: exportacion a PDF con recursos incrustados.
- **Feature: Git**: init repo, status, branch, commit, sync/push si hay remoto.
- **Infra UI**: theming, atajos, routing, toasts, errores.

## Integraciones
- **Electron Main**: ventana, menu, dialogos seguros, acceso a FS, Git y export.
- **IPC tipado**: canales aislados via preload para FS, Git, export y preferencias.
- **Filesystem**: `fs` + watcher (`chokidar`) para refrescar explorer y preview.
- **Mermaid**: `mermaid` render en renderer con fallback a SVG/PNG.
- **PDF**: `webContents.printToPDF` en main; pre-render HTML en renderer.

## Datos
- **Workspace Store**: metadata en `appData` (recientes, settings, ultimo archivo).
- **Cache de preview**: HTML y SVG renderizados por documento en `appData/cache`.
- **Estado local**: stores por feature (Zustand) con persistencia selectiva.
- **Indice de archivos**: cache en memoria + invalidacion por watcher.

## Seguridad
- `contextIsolation: true`, `nodeIntegration: false`.
- Preload con API minima y validacion de entrada.
- Acceso a archivos restringido al workspace seleccionado.
- Sanitizacion estricta de HTML/SVG en preview y export.

## Arquitectura de carpetas (feature-based)
```
src/
  main/
    ipc/
    git/
    export/
    fs/
    windows/
  preload/
  renderer/
    app/
    features/
      editor/
      preview/
      explorer/
      export/
      git/
      workspace/
    shared/
      ui/
      hooks/
      lib/
      types/
```

## Librerias sugeridas
- **Git (decidido)**
  - `simple-git`: wrapper de Git CLI, estable en Electron.
- **Git (alternativas)**
  - `isomorphic-git`: 100% JS, controla operaciones sin depender de binario Git.
  - `dugite`: usado en GitHub Desktop, wrapper con bundles de Git.
- **Editor Markdown con autocompletado y shortcuts**
  - `@codemirror/*` (CodeMirror 6): excelente para markdown, keymaps y extensiones.
  - `monaco-editor`: fuerte en autocompletado, pesado pero robusto.
  - `@lezer/markdown` para parsing y extension de Markdown en CM6.
- **Preview/Markdown**
  - `markdown-it` o `marked` para parseo.
  - `mermaid` para diagramas.

## Riesgos y mitigaciones
- **Rendimiento con proyectos grandes**: indexacion incremental y watchers eficientes.
- **Consistencia Mermaid/PDF**: render a SVG previo y pruebas por OS.
- **Credenciales Git offline**: usar keychain del sistema y mensajes claros.
