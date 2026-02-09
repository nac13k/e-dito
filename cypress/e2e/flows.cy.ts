describe('Epica 01 - flujos completos', () => {
  const workspaceRoot = '/tmp/meridian-workspace'

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
        tree.push({
          id: folderPath.replace(`${workspaceRoot}/`, ''),
          name: folderPath.split('/')[folderPath.split('/').length - 1] || 'carpeta',
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

  beforeEach(() => {
    cy.viewport(1440, 900)
    visitApp()
    openWorkspace()
  })

  it('muestra archivos reales y actualiza editor al seleccionar', () => {
    cy.get('[data-testid="file-docs/overview.md"]').click()
    cy.get('[data-testid="markdown-preview"]').should('contain.text', 'Overview')

    cy.get('[data-testid="file-research/notes.md"]').click()
    cy.get('[data-testid="markdown-preview"]').should('contain.text', 'Ideas sueltas')
  })

  it('usa comandos para abrir exportar y sincronizar git', () => {
    const exportPdfFile = cy.stub().resolves('PDF exportado en /tmp/documento.pdf').as('exportPdfFile')
    visitApp({ exportPdfFile })
    openWorkspace()

    runCommand('open-export')
    cy.contains('PDF Autocontenido').should('be.visible')
    runCommand('export-pdf')
    cy.get('@exportPdfFile').should('have.been.calledOnce')
    cy.get('[data-testid="tool-export"]').click()
    cy.get('[data-testid="export-status"]').should('contain', 'PDF exportado en /tmp/documento.pdf')

    runCommand('sync-git')
    cy.get('[data-testid="git-status"]').should('contain', 'Sincronizado')
  })

  it('permite crear documento y lo muestra en el arbol', () => {
    cy.get('[data-testid="doc-count"]').should('contain', '3')
    cy.get('[data-testid="new-doc"]').click()
    cy.get('[data-testid="doc-count"]').should('contain', '4')
  })

  it('cambia tema desde comandos y aplica colores cargados', () => {
    runCommand('theme-dark')
    cy.document().then((doc) => {
      expect(doc.documentElement.dataset.theme).to.eq('dark')
    })

    const loadTheme = cy.stub().resolves({
      mode: 'light',
      mermaidTheme: 'neutral',
      colors: {
        canvas: '#fdf7f2',
        ink: '#1a1a1a',
        accent: '#c08b5c',
        sidebar: '#fff5eb',
        editorBg: '#fdf7f2',
        previewBg: '#fffdf9',
        border: '#e4d6c7',
        statusBg: 'rgba(253, 247, 242, 0.9)',
        statusText: '#8a6d55',
        markdownBg: 'transparent',
        markdownText: '#1a1a1a',
      },
    })
    visitApp({ loadTheme })
    openWorkspace()

    runCommand('theme-load')
    cy.document().then((doc) => {
      expect(doc.documentElement.dataset.theme).to.eq('light')
      expect(doc.documentElement.style.getPropertyValue('--canvas')).to.eq('#fdf7f2')
    })
  })
})
