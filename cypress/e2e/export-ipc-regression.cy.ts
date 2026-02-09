describe('Export IPC regression', () => {
  const workspaceRoot = '/tmp/meridian-workspace'
  const heavyMarkdown = `# Epica 01 - Arquitectura Propuesta

## Alcance y objetivo
- Aplicacion de escritorio offline-first para macOS y Linux.
- Editor Markdown con preview en vivo, Mermaid y exportacion a PDF autocontenido.

## Diagramas y emojis
\`\`\`mermaid
flowchart LR
  A[Workspace] --> B[Preview]
  B --> C[PDF]
\`\`\`

Emoji de prueba: :rocket: :white_check_mark:

## Arquitectura de carpetas (feature-based)
\`\`\`
src/
  main/
  preload/
  renderer/
\`\`\`
`

  const visitApp = () => {
    cy.visit('/', {
      onBeforeLoad(win) {
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
            ],
          },
        ]

        const contents: Record<string, string> = {
          [`${workspaceRoot}/docs/overview.md`]: heavyMarkdown,
        }

        win.api = {
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
          createWorkspaceFile: () => Promise.resolve(`${workspaceRoot}/docs/new.md`),
          createWorkspaceFolder: () => Promise.resolve(`${workspaceRoot}/docs/sub`),
          deleteWorkspaceFile: () => Promise.resolve(),
          duplicateWorkspaceFile: () => Promise.resolve(`${workspaceRoot}/docs/copy.md`),
          revealInFinder: () => Promise.resolve(),
          exportPdfFile: (payload) => {
            structuredClone(payload)
            return Promise.resolve('PDF exportado en /tmp/documento.pdf')
          },
          exportPdfFolder: (payload) => {
            structuredClone(payload)
            return Promise.resolve('PDF exportado en /tmp/folder.pdf')
          },
          exportPdfProject: (payload) => {
            structuredClone(payload)
            return Promise.resolve('PDF exportado en /tmp/project.pdf')
          },
          loadTheme: () => Promise.resolve(null),
        }
      },
    })
  }

  const openPalette = () => {
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
    cy.get('[data-testid="command-palette"]').should('be.visible')
  }

  const runCommand = (id: string) => {
    openPalette()
    cy.get(`[data-testid="command-${id}"]`).click()
  }

  const setEditorContent = (text: string) => {
    cy.get('[data-testid="markdown-editor"] .cm-content').click().type('{selectall}{backspace}', {
      parseSpecialCharSequences: false,
    })
    cy.get('[data-testid="markdown-editor"] .cm-content').type(text, {
      parseSpecialCharSequences: false,
      delay: 0,
    })
  }

  it('envia payload de export serializable para archivo, carpeta y proyecto', () => {
    visitApp()

    cy.get('[data-testid="workspace-open"]').click()
    cy.get('[data-testid="workspace-path"]').should('contain', 'meridian-workspace')
    setEditorContent(heavyMarkdown)

    runCommand('open-export')
    cy.get('[data-testid="export-file"]').click()
    cy.get('[data-testid="export-status"]').should('contain', '/tmp/documento.pdf')

    cy.get('[data-testid="export-folder"]').click()
    cy.get('[data-testid="export-status"]').should('contain', '/tmp/folder.pdf')

    cy.get('[data-testid="export-project"]').click()
    cy.get('[data-testid="export-status"]').should('contain', '/tmp/project.pdf')
  })
})
