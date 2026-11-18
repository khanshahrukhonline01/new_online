import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react'
import {
  type ThemeMode,
  type ColorTheme,
  getStoredPreferences,
  savePreferences,
  resolveEffectiveTheme,
  applyThemeToDOM,
} from '../preferences'

export interface ThemeContextValue {
  themeMode: ThemeMode
  colorTheme: ColorTheme
  effectiveTheme: 'light' | 'dark'
  setThemeMode: (mode: ThemeMode) => void
  setColorTheme: (color: ColorTheme) => void
  toggleThemeMode: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(() => getStoredPreferences())

  useEffect(() => {
    // Initial DOM synchronization on mount
    applyThemeToDOM(preferences.theme, preferences.colorTheme)

    function handlePreferencesChange(event: Event) {
      const customEvent = event as CustomEvent<{ theme?: ThemeMode; colorTheme?: ColorTheme }>
      if (customEvent.detail) {
        setPreferences(getStoredPreferences())
      }
    }

    function handleSystemThemeChange() {
      const current = getStoredPreferences()
      if (current.theme === 'system') {
        applyThemeToDOM('system', current.colorTheme)
      }
    }

    window.addEventListener('khelgrid-preferences-change', handlePreferencesChange)
    const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null
    media?.addEventListener?.('change', handleSystemThemeChange)

    return () => {
      window.removeEventListener('khelgrid-preferences-change', handlePreferencesChange)
      media?.removeEventListener?.('change', handleSystemThemeChange)
    }
  }, [preferences.theme, preferences.colorTheme])

  const setThemeMode = useCallback((theme: ThemeMode) => {
    savePreferences({ theme })
    setPreferences(prev => ({ ...prev, theme }))
  }, [])

  const setColorTheme = useCallback((colorTheme: ColorTheme) => {
    savePreferences({ colorTheme })
    setPreferences(prev => ({ ...prev, colorTheme }))
  }, [])

  const toggleThemeMode = useCallback(() => {
    const nextTheme: ThemeMode =
      preferences.theme === 'light' ? 'dark' : preferences.theme === 'dark' ? 'system' : 'light'
    setThemeMode(nextTheme)
  }, [preferences.theme, setThemeMode])

  const effectiveTheme = useMemo(
    () => resolveEffectiveTheme(preferences.theme),
    [preferences.theme]
  )

  const value = useMemo<ThemeContextValue>(() => ({
    themeMode: preferences.theme,
    colorTheme: preferences.colorTheme,
    effectiveTheme,
    setThemeMode,
    setColorTheme,
    toggleThemeMode,
  }), [preferences.theme, preferences.colorTheme, effectiveTheme, setThemeMode, setColorTheme, toggleThemeMode])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
