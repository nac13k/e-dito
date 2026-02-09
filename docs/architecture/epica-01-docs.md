# Epica 01 - Documentacion de Arquitectura

## Resumen
Aplicacion de escritorio offline-first para macOS y Linux que permite editar Markdown con preview en vivo, render Mermaid, explorador de archivos y exportacion a PDF autocontenido. La arquitectura separa Electron Main (I/O y sistema) del Renderer (UI y features) con IPC tipado y una estructura basada en features.

## Decisiones
- **Electron + React + Vite** para UI moderna con build rapido y runtime estable.
- **TypeScript end-to-end** para contratos IPC tipados y mayor seguridad.
- **Feature-based architecture** para aislar dominios: editor, preview, explorer, export, git.
- **Offline-first** con cache local, watchers y sin dependencias externas.
- **Git basico con `simple-git`** para operaciones restringidas (init, status, branch, push si hay remoto).

## Componentes
- **Main Process**: acceso a filesystem, Git, export a PDF, ventanas y menu.
- **Preload**: API controlada para IPC y validacion de entradas.
- **Renderer App Shell**: layout, routing, theming, comandos, toasts.
- **Feature: Editor**: editor Markdown con autocompletado y shortcuts.
- **Feature: Preview**: render Markdown/Mermaid con sanitizacion.
- **Feature: Explorer**: arbol de archivos y operaciones basicas.
- **Feature: Export**: generacion de PDF autocontenido.
- **Feature: Git**: UI para status, branches, commit y sync/push.

## Integraciones
- **Filesystem**: `fs` + `chokidar` para index y eventos en tiempo real.
- **Mermaid**: `mermaid` en renderer con fallback a SVG/PNG.
- **Markdown**: `markdown-it` o `marked` para parseo y extensiones.
- **PDF**: `webContents.printToPDF` desde main con HTML pre-render.
- **Git**: `simple-git` (CLI).

## Datos
- **Workspace metadata**: archivo JSON en `appData` (recientes, settings).
- **Cache de preview**: HTML/SVG por documento con invalidacion por hash.
- **Estado local**: stores por feature con persistencia selectiva.
- **Indice de archivos**: cache en memoria con actualizaciones por watcher.

## Seguridad
- `contextIsolation: true`, `nodeIntegration: false`.
- Preload con API minima y whitelist de canales IPC.
- Sanitizacion de HTML/SVG y bloqueo de URLs peligrosas.
- Acceso al FS limitado al workspace activo.

## Diagramas textuales

### Contexto (C4 Nivel 1)
```text
[Usuario] -> [Electron App] -> [Filesystem]
[Electron App] -> [Git CLI/Lib]
```

### Contenedores (C4 Nivel 2)
```text
+---------------------- Electron ----------------------+
| Main Process | Preload | Renderer (React)           |
|    FS/Git    |  IPC    | Features: Editor/Preview   |
|  Export/PDF  |         | Explorer/Export/Git        |
+-----------------------------------------------------+
```

### Flujo de preview y export
```text
1) Editor actualiza Markdown
2) Preview renderiza HTML y Mermaid
3) Export solicita HTML/SVG al main
4) Main genera PDF y guarda archivo
```

## Riesgos
- **Consistencia Mermaid/PDF entre OS**: render previo a SVG y tests de snapshot.
- **Rendimiento en proyectos grandes**: index incremental y debounce de eventos.
- **Credenciales Git**: uso de keychain del sistema y mensajes claros.
- **Recursos externos en PDF**: inlining de imagenes y estilos.
