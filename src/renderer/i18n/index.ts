import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { defaultLanguage, resources, type RendererLanguage } from './resources'

export type LanguagePreference = 'system' | RendererLanguage

export const normalizeLanguage = (value: string): RendererLanguage => {
  if (value.startsWith('es')) {
    return 'es-MX'
  }
  return 'en-US'
}

export const initRendererI18n = async (language: string) => {
  const normalized = normalizeLanguage(language)

  if (!i18n.isInitialized) {
    await i18n
      .use(initReactI18next)
      .init({
        resources,
        lng: normalized,
        fallbackLng: defaultLanguage,
        interpolation: {
          escapeValue: false,
        },
      })
    return
  }

  if (i18n.language !== normalized) {
    await i18n.changeLanguage(normalized)
  }
}

export default i18n
