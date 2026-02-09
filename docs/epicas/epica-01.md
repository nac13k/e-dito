# Epica 01: Editor Markdown de Escritorio con Preview, Mermaid y Git Offline

## Resumen
Aplicacion de escritorio para macOS y Linux que permite editar Markdown con vista previa en vivo, renderizado de diagramas Mermaid, explorador de archivos del proyecto y exportacion a PDF con recursos incrustados. Se prioriza rendimiento offline y se incluye soporte basico de Git para iniciar repos, sincronizar con un boton, crear branches y hacer push cuando exista un remoto configurado.

## Usuario objetivo
- Estudiantes
- Investigadores
- Equipos tecnicos que necesiten crear documentacion

## Objetivo
Permitir crear, revisar y compartir documentacion tecnica completa sin depender de servicios externos, con entregables en PDF autocontenidos y control de versiones integrado.

## Alcance
- Editor Markdown con vista previa en vivo.
- Soporte de diagramas Mermaid en el preview y en PDF.
- Explorador de archivos y carpetas dentro del proyecto.
- Exportacion a PDF con imagenes, links, estilos de codigo y Mermaid incrustados.
- Modo offline-first con rendimiento optimizado.
- Soporte Git:
  - Inicializar repositorio.
  - Sincronizar con un boton.
  - Crear branches.
  - Push si hay remoto configurado.
- Soporte para macOS y Linux.

## Fuera de alcance
- Colaboracion en tiempo real.
- Soporte para web o mobile.
- Operaciones avanzadas de Git (rebase, cherry-pick, hooks complejos).
- Administracion de credenciales mas alla de mecanismos estandar del sistema.

## Riesgos
- Consistencia del render de Mermaid y PDF entre plataformas.
- Incrustacion de recursos externos en PDF sin romper estilos.
- Manejo de credenciales y errores de Git en modo offline.
- Rendimiento en proyectos con muchos archivos.

## Criterios de exito
- Edicion y preview fluidos en proyectos medianos.
- PDF autocontenido que conserva imagenes, links, estilos de codigo y Mermaid.
- Explorador funcional con operaciones basicas (crear, renombrar, borrar).
- Operaciones Git clave exitosas con feedback claro.
- Funcionamiento estable en macOS y Linux.
