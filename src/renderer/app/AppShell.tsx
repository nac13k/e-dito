import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
  return (
    <div className="relative h-screen overflow-hidden bg-canvas-50 text-ink-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.8),_transparent_55%)]" />
      <div className="relative z-10 flex h-full flex-col">
        <header className="select-none border-b border-canvas-200/70 bg-white/70 backdrop-blur">
          <div className="h-7" style={{ WebkitAppRegion: 'drag' } as CSSProperties} />
          <div
            className="flex w-full items-center justify-between pb-4 pl-24 pr-6 pt-2"
            style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}
          >
            {header}
          </div>
        </header>
        <main
          className="grid h-full min-h-0 w-full flex-1 gap-0 overflow-hidden px-0 pb-10 pt-0 lg:grid-cols-[260px_minmax(0,1fr)]"
        >
          <aside className="h-full min-h-0 overflow-hidden">{leftRail}</aside>
          <section className="h-full min-h-0 overflow-hidden">{main}</section>
        </main>
      </div>
      <div className="fixed bottom-0 left-0 right-0 z-30 select-none border-t border-canvas-200" style={{ background: 'var(--status-bg)' }}>
        <div className="flex w-full items-center justify-between px-6 py-2">
          {statusBar}
        </div>
      </div>
      {drawerOpen ? (
        <div className="fixed inset-0 z-40">
          <button
            className="absolute inset-0 bg-ink-900/20"
            onClick={onCloseDrawer}
            aria-label={t('appShell.closePanel')}
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
