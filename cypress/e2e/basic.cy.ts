describe('Epica 01 - funcionalidad basica', () => {
  const workspaceRoot = '/tmp/meridian-workspace'
  const problematicMarkdown = `# Epica 01 - Arquitectura Propuesta

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
- **Filesystem**: \`fs\` + watcher (\`chokidar\`) para refrescar explorer y preview.
- **Mermaid**: \`mermaid\` render en renderer con fallback a SVG/PNG.
- **PDF**: \`webContents.printToPDF\` en main; pre-render HTML en renderer.

## Datos
- **Workspace Store**: metadata en \`appData\` (recientes, settings, ultimo archivo).
- **Cache de preview**: HTML y SVG renderizados por documento en \`appData/cache\`.
- **Estado local**: stores por feature (Zustand) con persistencia selectiva.
- **Indice de archivos**: cache en memoria + invalidacion por watcher.

## Seguridad
- \`contextIsolation: true\`, \`nodeIntegration: false\`.
- Preload con API minima y validacion de entrada.
- Acceso a archivos restringido al workspace seleccionado.
- Sanitizacion estricta de HTML/SVG en preview y export.

## Arquitectura de carpetas (feature-based)
\`\`\`
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
\`\`\`

## Librerias sugeridas
- **Git (decidido)**
  - \`simple-git\`: wrapper de Git CLI, estable en Electron.
- **Git (alternativas)**
  - \`isomorphic-git\`: 100% JS, controla operaciones sin depender de binario Git.
  - \`dugite\`: usado en GitHub Desktop, wrapper con bundles de Git.
- **Editor Markdown con autocompletado y shortcuts**
  - \`@codemirror/*\` (CodeMirror 6): excelente para markdown, keymaps y extensiones.
  - \`monaco-editor\`: fuerte en autocompletado, pesado pero robusto.
  - \`@lezer/markdown\` para parsing y extension de Markdown en CM6.
- **Preview/Markdown**
  - \`markdown-it\` o \`marked\` para parseo.
  - \`mermaid\` para diagramas.

## Riesgos y mitigaciones
- **Rendimiento con proyectos grandes**: indexacion incremental y watchers eficientes.
- **Consistencia Mermaid/PDF**: render a SVG previo y pruebas por OS.
- **Credenciales Git offline**: usar keychain del sistema y mensajes claros.`

  const buildWorkspaceApi = (apiOverrides: Partial<Window['api']> = {}) => {
    const tree = [
      {
        id: 'docs',
        name: 'docs',
        path: `${workspaceRoot}/docs`,
        parentId: '.',
        depth: 1,
        files: [
          {
            id: 'docs/overview.md',
            name: 'overview.md',
            path: `${workspaceRoot}/docs/overview.md`,
            kind: 'markdown',
          },
          {
            id: 'docs/diagrams.md',
            name: 'diagrams.md',
            path: `${workspaceRoot}/docs/diagrams.md`,
            kind: 'markdown',
          },
        ],
      },
      {
        id: 'research',
        name: 'research',
        path: `${workspaceRoot}/research`,
        parentId: '.',
        depth: 1,
        files: [
          {
            id: 'research/notes.md',
            name: 'notes.md',
            path: `${workspaceRoot}/research/notes.md`,
            kind: 'markdown',
          },
        ],
      },
    ]

    const contents: Record<string, string> = {
      [`${workspaceRoot}/docs/overview.md`]: '# Overview\n\nNotas iniciales',
      [`${workspaceRoot}/docs/diagrams.md`]: '```mermaid\nflowchart LR\n  A-->B\n```',
      [`${workspaceRoot}/research/notes.md`]: '# Notes\n\nIdeas sueltas',
    }

    const api: Window['api'] = {
      ping: () => Promise.resolve('pong'),
      getLastWorkspace: () => Promise.resolve(workspaceRoot),
      setLastWorkspace: () => Promise.resolve(),
      selectWorkspace: () => Promise.resolve(workspaceRoot),
      readWorkspaceTree: () => Promise.resolve(structuredClone(tree)),
      readWorkspaceFile: ({ filePath }) => Promise.resolve(contents[filePath] ?? ''),
      readWorkspaceFileDataUrl: () => Promise.resolve('data:image/svg+xml;base64,PHN2Zy8+'),
      writeWorkspaceFile: ({ filePath, content }) => {
        contents[filePath] = content
        return Promise.resolve()
      },
      createWorkspaceFile: ({ folderPath }) => {
        const nextName = `documento-${Date.now()}.md`
        const nextPath = `${folderPath}/${nextName}`
        const folder = tree.find((item) => item.path === folderPath)
        if (folder) {
          folder.files.push({
            id: nextPath.replace(`${workspaceRoot}/`, ''),
            name: nextName,
            path: nextPath,
            kind: 'markdown',
          })
        }
        contents[nextPath] = '# Nuevo documento\n'
        return Promise.resolve(nextPath)
      },
      createWorkspaceFolder: ({ parentPath }) => {
        const folderPath = `${parentPath}/carpeta-${Date.now()}`
        const folderParts = folderPath.split('/')
        tree.push({
          id: folderPath.replace(`${workspaceRoot}/`, ''),
          name: folderParts[folderParts.length - 1] || 'carpeta',
          path: folderPath,
          parentId: '.',
          depth: 1,
          files: [],
        })
        return Promise.resolve(folderPath)
      },
      deleteWorkspaceFile: ({ filePath }) => {
        for (const folder of tree) {
          folder.files = folder.files.filter((file) => file.path !== filePath)
        }
        delete contents[filePath]
        return Promise.resolve()
      },
      duplicateWorkspaceFile: ({ sourcePath, destinationFolderPath }) => {
        const sourceName = sourcePath.split('/')[sourcePath.split('/').length - 1] || 'archivo.md'
        const sourceParts = sourceName.split('.')
        const extension = sourceParts.length > 1 ? sourceParts[sourceParts.length - 1] : 'md'
        const base = sourceName.replace(`.${extension}`, '')
        const nextName = `${base}-copia.${extension}`
        const nextPath = `${destinationFolderPath}/${nextName}`
        const folder = tree.find((item) => item.path === destinationFolderPath)
        if (folder) {
          folder.files.push({
            id: nextPath.replace(`${workspaceRoot}/`, ''),
            name: nextName,
            path: nextPath,
            kind: 'markdown',
          })
        }
        contents[nextPath] = contents[sourcePath] ?? ''
        return Promise.resolve(nextPath)
      },
      revealInFinder: () => Promise.resolve(),
      exportPdfFile: () => Promise.resolve('PDF exportado en /tmp/documento.pdf'),
      exportPdfFolder: () => Promise.resolve('Carpeta exportada en /tmp/meridian-workspace'),
      exportPdfProject: () => Promise.resolve('Proyecto meridian-workspace exportado en /tmp/meridian-workspace'),
      loadTheme: () => Promise.resolve(null),
    }

    return { ...api, ...apiOverrides }
  }

  const visitApp = (apiOverrides: Partial<Window['api']> = {}) => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.api = buildWorkspaceApi(apiOverrides)
      },
    })
  }

  const openWorkspace = () => {
    cy.get('[data-testid="workspace-open"]').click()
    cy.get('[data-testid="workspace-path"]').should('contain', 'meridian-workspace')
  }

  const openPalette = () => {
    cy.get('[data-testid="doc-count"]').should('be.visible')
    cy.get('body').click(0, 0)
    cy.window().then((win) => {
      win.dispatchEvent(
        new win.KeyboardEvent('keydown', {
          key: 'p',
          code: 'KeyP',
          metaKey: true,
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        })
      )
    })
    cy.get('[data-testid="command-palette"]', { timeout: 10000 }).should('be.visible')
  }

  const runCommand = (id: string) => {
    openPalette()
    cy.get(`[data-testid="command-${id}"]`).click()
  }

  const editorShouldContain = (text: string) => {
    cy.get('[data-testid="markdown-editor"] .cm-content').should('contain.text', text)
  }

  const setEditorContent = (text: string) => {
    cy.get('body').then(($body) => {
      if (!$body.find('[data-testid="markdown-editor"] .cm-content').length) {
        runCommand('toggle-view')
      }
    })
    cy.get('[data-testid="markdown-editor"] .cm-content').click().type('{selectall}{backspace}', {
      parseSpecialCharSequences: false,
    })
    cy.get('[data-testid="markdown-editor"] .cm-content').type(text, {
      parseSpecialCharSequences: false,
      delay: 0,
    })
  }

  beforeEach(() => {
    cy.viewport(1440, 900)
    visitApp()
  })

  it('muestra layout base y acciones principales', () => {
    cy.contains('E-Dito').should('be.visible')
    cy.get('[data-testid="workspace-open"]').should('be.enabled')
    cy.get('[data-testid="new-doc"]').should('be.enabled')
  })

  it('abre carpeta de proyecto y carga archivos en el arbol', () => {
    openWorkspace()
    cy.get('[data-testid="workspace-root"]').should('contain', workspaceRoot)
    cy.get('[data-testid="doc-count"]').should('contain', '3')
    cy.get('[data-testid="file-docs/overview.md"]').should('be.visible')
    cy.get('[data-testid="file-docs/diagrams.md"]').should('be.visible')
    cy.get('[data-testid="file-research/notes.md"]').should('be.visible')
  })

  it('selecciona un documento desde el explorador', () => {
    openWorkspace()
    cy.get('[data-testid="file-docs/diagrams.md"]').click()
    cy.get('[data-testid="markdown-preview"] .mermaid svg').should('exist')
  })

  it('permite colapsar carpetas en el explorador', () => {
    openWorkspace()
    cy.get('[data-testid="folder-files-docs"]').should('be.visible')
    cy.get('[data-testid="folder-toggle-docs"]').click()
    cy.get('[data-testid="folder-files-docs"]').should('not.exist')
    cy.get('[data-testid="folder-toggle-docs"]').click()
    cy.get('[data-testid="folder-files-docs"]').should('be.visible')
  })

  it('cmd+p encuentra archivos por nombre', () => {
    openWorkspace()
    openPalette()
    cy.get('[data-testid="command-palette"]').within(() => {
      cy.get('input').type('diagrams')
      cy.contains('Abrir archivo: diagrams.md').click()
    })
    cy.get('[data-testid="markdown-preview"] .mermaid svg').should('exist')
  })

  it('edita markdown y persiste via API de archivos', () => {
    const writeWorkspaceFile = cy.stub().resolves().as('writeWorkspaceFile')
    visitApp({ writeWorkspaceFile })

    openWorkspace()
    setEditorContent('# Titulo\n\nTexto de prueba')
    cy.wait(280)
    cy.get('@writeWorkspaceFile').should('have.been.called')

    runCommand('toggle-view')
    cy.get('[data-testid="markdown-preview"]').should('contain', 'Titulo')
  })

  it('exporta archivo con selector y feedback', () => {
    const exportPdfFile = cy.stub().resolves('PDF exportado en /tmp/documento.pdf').as('exportPdfFile')
    visitApp({ exportPdfFile })

    openWorkspace()
    runCommand('open-export')
    cy.get('[data-testid="export-file"]').click()
    cy.get('@exportPdfFile').should('have.been.calledOnce')
    cy.get('[data-testid="export-status"]').should('contain', 'PDF exportado en /tmp/documento.pdf')
  })

  it('exporta markdown extenso sin romper serializacion de payload', () => {
    const exportPdfFile = cy.stub().resolves('PDF exportado en /tmp/documento.pdf').as('exportPdfFile')
    const exportPdfFolder = cy.stub().resolves('PDF exportado en /tmp/folder.pdf').as('exportPdfFolder')
    const exportPdfProject = cy.stub().resolves('PDF exportado en /tmp/project.pdf').as('exportPdfProject')
    visitApp({ exportPdfFile, exportPdfFolder, exportPdfProject })

    openWorkspace()
    setEditorContent(problematicMarkdown)
    cy.wait(280)

    runCommand('open-export')
    cy.get('[data-testid="export-file"]').click()
    cy.get('@exportPdfFile').should('have.been.calledOnce')
    cy.get('@exportPdfFile').its('firstCall.args.0').should((payload) => {
      expect(JSON.parse(JSON.stringify(payload))).to.be.an('object')
      expect(payload.markdown).to.include('# Epica 01 - Arquitectura Propuesta')
      expect(payload.markdown).to.include('## Arquitectura de carpetas (feature-based)')
      expect(payload.markdown).to.include('`webContents.printToPDF`')
    })

    cy.get('[data-testid="export-folder"]').click()
    cy.get('@exportPdfFolder').should('have.been.calledOnce')
    cy.get('@exportPdfFolder').its('firstCall.args.0').should((payload) => {
      expect(JSON.parse(JSON.stringify(payload))).to.be.an('object')
      expect(payload.documents).to.have.length.greaterThan(0)
      expect(payload.documents[0].markdown).to.include('## Componentes')
    })

    cy.get('[data-testid="export-project"]').click()
    cy.get('@exportPdfProject').should('have.been.calledOnce')
    cy.get('@exportPdfProject').its('firstCall.args.0').should((payload) => {
      expect(JSON.parse(JSON.stringify(payload))).to.be.an('object')
      expect(payload.documents.some((doc: { markdown: string }) => doc.markdown.includes('## Seguridad'))).to.eq(true)
    })
  })

  it('revela en finder el archivo seleccionado', () => {
    const revealInFinder = cy.stub().resolves().as('revealInFinder')
    visitApp({ revealInFinder })

    openWorkspace()
    cy.get('[data-testid="file-docs/overview.md"]').rightclick()
    cy.contains('button', 'Reveal in Finder').click()
    cy.get('@revealInFinder').should('have.been.calledOnceWith', `${workspaceRoot}/docs/overview.md`)
  })
})
