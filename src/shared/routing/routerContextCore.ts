import { createContext } from 'react'
import type React from 'react'

export interface NavigateOptions {
  /** Pass the original click event to call e.preventDefault() automatically. */
  event?: React.MouseEvent | MouseEvent
  /** When true, do NOT scroll to the top after navigation (e.g. tab/filter switch). */
  preserveScroll?: boolean
  /** When true, replace the current history entry instead of pushing a new one. */
  replace?: boolean
}

export interface RouterContextValue {
  /** Current pathname (no search string). */
  path: string
  /** Parsed URLSearchParams for the current location. */
  queryParams: URLSearchParams
  /** Navigate programmatically. Accepts a full href string or a pathname. */
  navigate: (target: string, opts?: NavigateOptions) => void
  /** Navigate using a click event on an anchor-like element. */
  handleLink: (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, href: string) => void
}

export const RouterContext = createContext<RouterContextValue | null>(null)
