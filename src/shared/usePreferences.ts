import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  type UserPreferences,
  type ThemeMode,
  DEFAULT_PREFERENCES,
  SUPPORTED_LANGUAGES,
  getStoredPreferences,
  savePreferences,
  applyThemeToDOM,
  applyAccessibilityToDOM,
} from './preferences'

export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    return getStoredPreferences()
  })

  useEffect(() => {
    // Initial DOM synchronization
    applyThemeToDOM(preferences.theme)
    applyAccessibilityToDOM(preferences.reducedMotion)

    function handlePreferencesChange(event: Event) {
      const customEvent = event as CustomEvent<UserPreferences>
      if (customEvent.detail) {
        setPreferences(customEvent.detail)
      } else {
        setPreferences(getStoredPreferences())
      }
    }

    function handleSystemThemeChange() {
      const current = getStoredPreferences()
      if (current.theme === 'system') {
        applyThemeToDOM('system')
      }
    }

    window.addEventListener('khelgrid-preferences-change', handlePreferencesChange)
    const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null
    media?.addEventListener?.('change', handleSystemThemeChange)

    return () => {
      window.removeEventListener('khelgrid-preferences-change', handlePreferencesChange)
      media?.removeEventListener?.('change', handleSystemThemeChange)
    }
  }, [preferences.theme, preferences.reducedMotion])

  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    const updated = savePreferences(updates)
    setPreferences(updated)
    return updated
  }, [])

  const resetPreferences = useCallback(() => {
    return updatePreferences(DEFAULT_PREFERENCES)
  }, [updatePreferences])

  const toggleTheme = useCallback(() => {
    const nextTheme: ThemeMode =
      preferences.theme === 'light' ? 'dark' : preferences.theme === 'dark' ? 'system' : 'light'
    updatePreferences({ theme: nextTheme })
  }, [preferences.theme, updatePreferences])

  const currentLanguage = useMemo(() => {
    return (
      SUPPORTED_LANGUAGES.find(lang => lang.code === preferences.language) ||
      SUPPORTED_LANGUAGES[0]
    )
  }, [preferences.language])

  return {
    preferences,
    updatePreferences,
    resetPreferences,
    toggleTheme,
    currentLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
  }
}
