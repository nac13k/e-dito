# Summary

Este documento resume el estado actual de la implementacion de Dito Editor. Para el historial de cambios ver `changelog.md`.

## App Shell
- Layout principal con header, sidebar de explorador, editor/preview y panel lateral de herramientas.
- Command palette con busqueda, categorias y atajos de teclado (Cmd/Ctrl+P).
- Barra de estado con indicadores de Git y accesos a herramientas.

## Workspace
- Selector de workspace con dialogo nativo de Finder que permite cualquier unidad.
- Estado persistente en store local para mostrar la ruta activa.
- Accion para revelar archivos o carpeta en Finder.

## Explorer
- Arbol de carpetas y archivos con seleccion activa.
- Menu contextual con: nuevo documento, reveal in finder, crear carpeta, eliminar, copiar, pegar y buscar.
- Busqueda local inline sin abrir dialogos del sistema.

## Editor y Preview
- Editor Markdown con vista previa renderizada via MarkdownIt.
- Soporte Mermaid en preview con render a SVG.
- Sincronizacion de scroll entre editor y preview.

## Export
- Export PDF con seleccion de destino para archivo, carpeta y proyecto.
- Mensajes de estado reflejan el resultado de la exportacion.

## Git
- Panel de estado basico con accion de sincronizacion.
- Mensajes de estado para feedback de sincronizacion.

## Testing
- Suite Cypress cubre flujos base y flujos completos.
- Script `cy:run:dev` levanta el renderer y ejecuta Cypress.
