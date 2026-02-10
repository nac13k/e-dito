import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'github-markdown-css/github-markdown.css'
import './app/globals.css'
import App from './app/App'
import { initRendererI18n } from './i18n'

const boot = async () => {
  const i18nState = await window.api.getI18nState()
  await initRendererI18n(i18nState.language)

  window.api.onI18nChanged((state) => {
    void initRendererI18n(state.language)
  })

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void boot()
