import type { ReactNode } from 'react'

type AppShellProps = {
  header: ReactNode
  leftRail: ReactNode
  main: ReactNode
  drawer: ReactNode
  drawerOpen: boolean
  onCloseDrawer: () => void
  statusBar: ReactNode
}

export const AppShell = ({
  header,
  leftRail,
  main,
  drawer,
  drawerOpen,
  onCloseDrawer,
  statusBar,
}: AppShellProps) => {
  return (
    <div className="relative min-h-screen bg-canvas-50 text-ink-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.8),_transparent_55%)]" />
      <div className="relative z-10">
        <header className="border-b border-canvas-200/70 bg-white/70 backdrop-blur">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
            {header}
          </div>
        </header>
        <main
          className="mx-auto grid max-w-[1400px] gap-0 px-0 py-0 lg:grid-cols-[260px_minmax(0,1fr)]"
          style={{ minHeight: 'calc(100vh - 120px)' }}
        >
          <aside className="space-y-0">{leftRail}</aside>
          <section className="space-y-0">{main}</section>
        </main>
      </div>
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-canvas-200" style={{ background: 'var(--status-bg)' }}>
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-2">
          {statusBar}
        </div>
      </div>
      {drawerOpen ? (
        <div className="fixed inset-0 z-40">
          <button
            className="absolute inset-0 bg-ink-900/20"
            onClick={onCloseDrawer}
            aria-label="Cerrar panel"
            type="button"
          />
          <aside className="absolute right-0 top-0 h-full w-[360px] border-l border-canvas-200 bg-white/95 p-4 shadow-soft backdrop-blur">
            {drawer}
          </aside>
        </div>
      ) : null}
    </div>
  )
}
