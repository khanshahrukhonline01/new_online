import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import CustomCursor from './CustomCursor'

describe('CustomCursor Component', () => {
  const originalWindow = globalThis.window

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.window = originalWindow
  })

  it('1. returns null in non-browser / SSR environment where window.matchMedia is undefined', () => {
    // Ensure window.matchMedia is not present
    if (typeof globalThis.window !== 'undefined') {
      // @ts-expect-error test mock
      delete globalThis.window.matchMedia
    }
    const html = renderToStaticMarkup(<CustomCursor />)
    expect(html).toBe('')
  })

  it('2. returns null when device pointer is not fine (e.g. touch or mobile device)', () => {
    globalThis.window = {
      ...originalWindow,
      matchMedia: vi.fn().mockImplementation((query: string) => {
        if (query === '(pointer: fine)') {
          return { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }
        }
        if (query === '(prefers-reduced-motion: reduce)') {
          return { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }
        }
        return { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }
      }),
    } as unknown as Window & typeof globalThis

    const html = renderToStaticMarkup(<CustomCursor />)
    expect(html).toBe('')
  })

  it('3. returns null when user prefers reduced motion (accessibility compliance)', () => {
    globalThis.window = {
      ...originalWindow,
      matchMedia: vi.fn().mockImplementation((query: string) => {
        if (query === '(pointer: fine)') {
          return { matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }
        }
        if (query === '(prefers-reduced-motion: reduce)') {
          return { matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }
        }
        return { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }
      }),
    } as unknown as Window & typeof globalThis

    const html = renderToStaticMarkup(<CustomCursor />)
    expect(html).toBe('')
  })

  it('4. renders full custom cursor DOM elements when pointer is fine and reduced motion is false', () => {
    globalThis.window = {
      ...originalWindow,
      matchMedia: vi.fn().mockImplementation((query: string) => {
        if (query === '(pointer: fine)') {
          return { matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }
        }
        if (query === '(prefers-reduced-motion: reduce)') {
          return { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }
        }
        return { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }
      }),
    } as unknown as Window & typeof globalThis

    const html = renderToStaticMarkup(<CustomCursor />)

    // Verify main container with accessibility and test attributes
    expect(html).toContain('kg-custom-cursor-container')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('data-testid="kg-custom-cursor"')

    // Verify constituent animated elements
    expect(html).toContain('kg-cursor-ripple')
    expect(html).toContain('kg-cursor-follower')
    expect(html).toContain('kg-cursor-dot')
  })
})
