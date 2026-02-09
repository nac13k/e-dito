# Quickstart

[Volver al index](../index.md)

## Objetivo

Este documento simula una guia corta con enlaces y contenido mixto.

## Enlaces a otros documentos

- [Arquitectura del sistema](../architecture/system.md)
- [Integraciones](../architecture/integration.md)
- [Checklist operativa](../operations/checklist.md)

## Anchor interno

- [Ir a bloque Mermaid local](#flujo-de-edicion)

## Flujo de edicion

```mermaid
sequenceDiagram
  participant U as Usuario
  participant E as Editor
  participant P as Preview
  participant X as Exportador PDF
  U->>E: Edita markdown
  E->>P: Render en vivo
  U->>X: Exportar archivo
  X-->>U: PDF autocontenido
```

## Imagen local desde carpeta hermana

![Componentes](../assets/components-map.svg)
