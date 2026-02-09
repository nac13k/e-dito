# Arquitectura del Sistema

[Volver al index](../index.md)

## Capas

- Renderer (UI + editor)
- Preload (bridge IPC)
- Main (dialogos, filesystem, PDF)

## Diagrama de componentes (texto)

```text
[Renderer] --IPC tipado--> [Preload] --invoke--> [Main]
    |                                          |
    +----------- preview markdown -------------+
    +----------- export PDF -------------------+
```

## Enlaces

- [Ir a Integraciones](./integration.md)

otra cosa
- [Ir a sección de seguridad en Integraciones](./integration.md#seguridad)
- [Volver a Mermaid principal del index](../index.md#mermaid-principal)

## Anchor local

### Persistencia de workspace

El ultimo workspace abierto debe guardarse en configuracion local.
