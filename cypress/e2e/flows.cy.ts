describe('Epica 01 - flujos completos', () => {
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

  it('muestra archivos del proyecto y actualiza el editor', () => {
    cy.get('[data-testid="file-overview"]').click()
    cy.get('[data-testid="markdown-editor"]').should('contain.value', 'Overview')

    cy.get('[data-testid="file-notes"]').click()
    cy.get('[data-testid="markdown-editor"]').should('contain.value', 'Ideas sueltas')

    cy.get('[data-testid="file-diagrams"]').click()
    cy.get('[data-testid="markdown-editor"]').should('contain.value', 'mermaid')
  })

  it('abre el palette, filtra comandos y muestra estado vacio', () => {
    openPalette()
    cy.get('[data-testid="command-palette"]').within(() => {
      cy.get('input').type('zzzz')
      cy.contains('Sin resultados').should('be.visible')
    })
  })

  it('cierra el palette con escape y backdrop', () => {
    openPalette()
    cy.get('body').type('{esc}')
    cy.get('[data-testid="command-palette"]').should('not.exist')

    openPalette()
    cy.get('button[aria-label="Cerrar comandos"]').click({ force: true })
    cy.get('[data-testid="command-palette"]').should('not.exist')
  })

  it('abre workspace desde comandos con ruta retornada', () => {
    cy.window().then((win) => {
      win.api = {
        ...win.api,
        selectWorkspace: () => Promise.resolve('/tmp/meridian-workspace'),
      }
    })

    runCommand('open-workspace')
    cy.get('[data-testid="workspace-path"]').should('contain', '/tmp/meridian-workspace')
  })

  it('usa comandos para abrir tools, exportar y sincronizar git', () => {
    runCommand('open-export')
    cy.contains('PDF Autocontenido').should('be.visible')

    runCommand('export-pdf')
    cy.get('[data-testid="tool-export"]').click()
    cy.get('[data-testid="export-status"]').should('contain', 'PDF exportado')

    runCommand('open-git')
    cy.get('[data-testid="git-sync"]').should('be.visible')

    runCommand('sync-git')
    cy.get('[data-testid="git-status"]').should('contain', 'Sincronizado')
  })

  it('alterna vistas con teclado desde el palette', () => {
    cy.get('[data-testid="markdown-editor"]').should('be.visible')
    openPalette()
    cy.focused().type('preview{enter}')
    cy.get('[data-testid="markdown-preview"]').should('be.visible')

    openPalette()
    cy.focused().type('editor{enter}')
    cy.get('[data-testid="markdown-editor"]').should('be.visible')
  })

  it('cambia tema oscuro y carga tema json con colores', () => {
    runCommand('theme-dark')
    cy.document().then((doc) => {
      expect(doc.documentElement.dataset.theme).to.eq('dark')
      expect(doc.documentElement.dataset.mermaidTheme).to.eq('dark')
    })

    cy.window().then((win) => {
      win.api = {
        ...win.api,
        loadTheme: () =>
          Promise.resolve({
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
          }),
      }
    })

    runCommand('theme-load')
    cy.document().then((doc) => {
      expect(doc.documentElement.dataset.theme).to.eq('light')
      expect(doc.documentElement.style.getPropertyValue('--canvas')).to.eq('#fdf7f2')
      expect(doc.documentElement.style.getPropertyValue('--accent')).to.eq('#c08b5c')
    })
  })

  it('filtra comandos por categoria', () => {
    openPalette()
    cy.get('[data-testid="command-palette"]').within(() => {
      cy.contains('button', 'Git').click()
      cy.get('[data-testid="command-open-git"]').should('be.visible')
      cy.get('[data-testid="command-export-pdf"]').should('not.exist')
    })
  })
})
