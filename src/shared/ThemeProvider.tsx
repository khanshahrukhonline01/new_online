import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { usePreferences } from './usePreferences'
import { applyThemeToDOM } from './preferences'

type ThemeContextValue = {
  accent: 'green' | 'blue' | 'orange'
  mode: 'light' | 'dark' | 'system'
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { preferences } = usePreferences()
  const value = useMemo<ThemeContextValue>(() => ({
    accent: preferences.accent,
    mode: preferences.theme,
  }), [preferences.accent, preferences.theme])

  useEffect(() => {
    applyThemeToDOM(preferences.theme, preferences.accent)
  }, [preferences.theme, preferences.accent])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
