import { describe, it, expect, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ThemeProvider, useTheme } from './ThemeContext'
import { applyThemeToDOM, resolveEffectiveTheme } from '../preferences'

// In-memory localStorage mock for node test environment
const storageMock: Record<string, string> = {}
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {
    getItem: (key: string) => storageMock[key] ?? null,
    setItem: (key: string, val: string) => { storageMock[key] = String(val) },
    removeItem: (key: string) => { delete storageMock[key] },
    clear: () => {
      Object.keys(storageMock).forEach(k => delete storageMock[k])
    },
    key: () => null,
    length: 0,
  } as unknown as Storage
}

function TestConsumer() {
  const { themeMode, colorTheme, effectiveTheme } = useTheme()
  return (
    <div data-testid="theme-consumer">
      <span data-testid="theme-mode">{themeMode}</span>
      <span data-testid="color-theme">{colorTheme}</span>
      <span data-testid="effective-theme">{effectiveTheme}</span>
    </div>
  )
}

describe('ThemeContext & Color Theming System', () => {
  beforeEach(() => {
    globalThis.localStorage.clear()
  })

  it('provides default light theme and green brand color', () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    )
    expect(html).toContain('light')
    expect(html).toContain('green')
  })

  it('resolves effective theme mode correctly', () => {
    expect(resolveEffectiveTheme('light')).toBe('light')
    expect(resolveEffectiveTheme('dark')).toBe('dark')
    expect(['light', 'dark']).toContain(resolveEffectiveTheme('system'))
  })

  it('applies data-color-theme attribute to DOM root element', () => {
    if (typeof document !== 'undefined') {
      applyThemeToDOM('light', 'blue')
      expect(document.documentElement.getAttribute('data-color-theme')).toBe('blue')
      expect(document.documentElement.classList.contains('light')).toBe(true)

      applyThemeToDOM('dark', 'orange')
      expect(document.documentElement.getAttribute('data-color-theme')).toBe('orange')
      expect(document.documentElement.classList.contains('dark')).toBe(true)

      applyThemeToDOM('light', 'green')
      expect(document.documentElement.getAttribute('data-color-theme')).toBe('green')
    }
  })

  it('throws an informative error if useTheme is used outside ThemeProvider', () => {
    expect(() => {
      renderToStaticMarkup(<TestConsumer />)
    }).toThrow('useTheme must be used within a ThemeProvider')
  })
})
