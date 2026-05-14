import { createContext, useContext, useMemo, useState } from 'react'
import { translations } from '../i18n/translations'

const languageStorageKey = 'geo-memo-language'
const supportedLanguages = ['fr', 'en']
const LanguageContext = createContext(null)

function getInitialLanguage() {
  const savedLanguage = localStorage.getItem(languageStorageKey)

  if (supportedLanguages.includes(savedLanguage)) {
    return savedLanguage
  }

  return 'fr'
}

function readTranslation(language, key) {
  return key.split('.').reduce((currentValue, keyPart) => {
    if (!currentValue || typeof currentValue !== 'object') {
      return undefined
    }

    return currentValue[keyPart]
  }, translations[language])
}

function interpolate(value, params = {}) {
  if (typeof value !== 'string') {
    return value
  }

  return value.replace(/\{\{(\w+)\}\}/g, (_, paramName) =>
    String(params[paramName] ?? ''),
  )
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage)

  function setLanguage(nextLanguage) {
    if (!supportedLanguages.includes(nextLanguage)) {
      return
    }

    localStorage.setItem(languageStorageKey, nextLanguage)
    setLanguageState(nextLanguage)
  }

  function toggleLanguage() {
    setLanguage(language === 'fr' ? 'en' : 'fr')
  }

  function t(key, params) {
    const translatedValue =
      readTranslation(language, key) ?? readTranslation('fr', key) ?? key

    return interpolate(translatedValue, params)
  }

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      toggleLanguage,
    }),
    [language],
  )

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)

  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider')
  }

  return context
}
