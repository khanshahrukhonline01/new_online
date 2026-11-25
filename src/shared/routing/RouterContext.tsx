/**
 * RouterContext.tsx
 *
 * Centralised client-side routing context provider for KhelGrid.
 */
import { useCallback, useEffect, useMemo, useReducer } from 'react'
import type React from 'react'
import type { ReactNode } from 'react'
import { RouterContext, type NavigateOptions, type RouterContextValue } from './routerContextCore'

interface RouterState {
  path: string
  search: string
}

function getLocationState(): RouterState {
  if (typeof window === 'undefined') return { path: '/', search: '' }
  return {
    path: window.location.pathname || '/',
    search: window.location.search || '',
  }
}

type RouterAction = { type: 'NAVIGATE'; path: string; search: string }

function routerReducer(_state: RouterState, action: RouterAction): RouterState {
  return { path: action.path, search: action.search }
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(routerReducer, undefined, getLocationState)

  useEffect(() => {
    function onPopState() {
      dispatch({
        type: 'NAVIGATE',
        path: window.location.pathname,
        search: window.location.search,
      })
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = useCallback((target: string, opts: NavigateOptions = {}) => {
    if (opts.event) {
      ;(opts.event as React.MouseEvent).preventDefault?.()
    }

    let pathname: string
    let search = ''
    try {
      const url = new URL(target, window.location.origin)
      if (url.origin !== window.location.origin) {
        window.open(target, '_blank', 'noopener,noreferrer')
        return
      }
      pathname = url.pathname
      search = url.search
    } catch {
      const idx = target.indexOf('?')
      pathname = idx === -1 ? target : target.slice(0, idx)
      search = idx === -1 ? '' : target.slice(idx)
    }

    const currentPath = window.location.pathname
    const currentSearch = window.location.search
    const unchanged = pathname === currentPath && search === currentSearch

    if (!unchanged) {
      const newUrl = pathname + search
      if (opts.replace) {
        window.history.replaceState({ path: pathname, search }, '', newUrl)
      } else {
        window.history.pushState({ path: pathname, search }, '', newUrl)
      }
    }

    dispatch({ type: 'NAVIGATE', path: pathname, search })

    if (!opts.preserveScroll && !unchanged) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    }
  }, [])

  const handleLink = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, href: string) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
      navigate(href, { event })
    },
    [navigate],
  )

  const queryParams = useMemo(() => new URLSearchParams(state.search), [state.search])

  const value = useMemo<RouterContextValue>(
    () => ({ path: state.path, queryParams, navigate, handleLink }),
    [state.path, queryParams, navigate, handleLink],
  )

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}
