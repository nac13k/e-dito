describe('Epica 01 - funcionalidad basica', () => {
  const openPalette = () => {
    cy.get('[data-testid="doc-count"]').should('be.visible')
    cy.get('body').click(0, 0)
    const trigger = () => {
      cy.window().then((win) => {
        const event = new win.KeyboardEvent('keydown', {
          key: 'p',
          code: 'KeyP',
          metaKey: true,
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        })
        win.dispatchEvent(event)
      })
    }
    trigger()
    cy.then(() => {
      if (Cypress.$('[data-testid="command-palette"]').length === 0) {
        trigger()
      }
    })
    cy.get('[data-testid="command-palette"]', { timeout: 10000 }).should('be.visible')
  }

  const runCommand = (id: string) => {
    openPalette()
    cy.get(`[data-testid="command-${id}"]`).click()
  }

  beforeEach(() => {
    cy.viewport(1440, 900)
    cy.visit('/')
  })

  it('muestra layout base y acciones principales', () => {
    cy.contains('Meridian Notes').should('be.visible')
    cy.get('[data-testid="workspace-open"]').should('be.enabled')
    cy.get('[data-testid="new-doc"]').should('be.enabled')
    cy.get('[data-testid="tool-export"]').should('be.enabled')
    cy.get('[data-testid="tool-git"]').should('be.enabled')
  })

  it('crea un nuevo documento y actualiza contador', () => {
    cy.get('[data-testid="doc-count"]').should('contain', '0')
    cy.get('[data-testid="new-doc"]').click()
    cy.get('[data-testid="doc-count"]').should('contain', '1')
  })

  it('abre un proyecto y muestra la ruta', () => {
    cy.get('[data-testid="workspace-path"]').should('contain', 'Sin proyecto')
    cy.get('[data-testid="workspace-open"]').click()
    cy.get('[data-testid="workspace-path"]').should('contain', '/demo/workspace')
  })

  it('selecciona un documento desde el explorador', () => {
    cy.get('[data-testid="file-diagrams"]').click()
    cy.get('[data-testid="markdown-editor"]').should('contain.value', 'mermaid')
  })

  it('edita un documento markdown y actualiza el preview', () => {
    cy.get('[data-testid="markdown-editor"]').clear().type('# Titulo\n\nTexto de prueba')
    runCommand('toggle-view')
    cy.get('[data-testid="markdown-preview"]').should('contain', 'Titulo')
    cy.get('[data-testid="markdown-preview"]').should('contain', 'Texto de prueba')
  })

  it('alterna entre vista editor y preview con shortcut', () => {
    cy.get('[data-testid="markdown-editor"]').should('be.visible')
    runCommand('toggle-view')
    cy.get('[data-testid="markdown-preview"]').should('be.visible')
    runCommand('toggle-view')
    cy.get('[data-testid="markdown-editor"]').should('be.visible')
  })

  it('renderiza un diagrama Mermaid en el preview', () => {
    cy.get('[data-testid="markdown-editor"]').clear().type(
      '```mermaid\nflowchart LR\n  A-->B\n```'
    )
    runCommand('toggle-view')
    cy.get('[data-testid="markdown-preview"] .mermaid').should('be.visible')
  })

  it('exporta archivo y carpeta con feedback', () => {
    cy.window().then((win) => {
      win.api = {
        ...win.api,
        exportPdf: () => Promise.resolve('PDF exportado: Documento'),
      }
    })
    runCommand('open-export')
    cy.get('[data-testid="export-status"]').should('contain', 'Sin exportaciones')
    cy.get('[data-testid="export-file"]').click()
    cy.get('[data-testid="export-status"]').should('contain', 'PDF exportado: Documento')
    cy.get('[data-testid="export-folder"]').click()
    cy.get('[data-testid="export-status"]').should('contain', 'Carpeta exportada')
  })

  it('permite buscar comandos por alias', () => {
    cy.window().then((win) => {
      win.api = {
        ...win.api,
        exportPdf: () => Promise.resolve('PDF exportado: Documento'),
      }
    })
    openPalette()
    cy.get('[data-testid="command-palette"]').within(() => {
      cy.get('input').type('pdf')
      cy.get('[data-testid="command-export-pdf"]').click()
    })
    cy.get('[data-testid="tool-export"]').click()
    cy.get('[data-testid="export-status"]').should('contain', 'PDF exportado: Documento')
  })

  it('sincroniza git y muestra estado', () => {
    cy.get('[data-testid="tool-git"]').click()
    cy.get('[data-testid="git-status"]').should('contain', 'Listo para sincronizar')
    cy.get('[data-testid="git-sync"]').click()
    cy.get('[data-testid="git-status"]').should('contain', 'Sincronizado')
  })
})
