import { useContext } from 'react'
import type React from 'react'
import { RouterContext, type NavigateOptions, type RouterContextValue } from './routerContextCore'

export function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext)
  if (!ctx) {
    return {
      path: typeof window !== 'undefined' ? window.location.pathname : '/',
      queryParams: new URLSearchParams(),
      navigate: (target: string, opts?: NavigateOptions) => {
        if (opts?.event) (opts.event as React.MouseEvent).preventDefault?.()
        if (typeof window !== 'undefined') window.location.href = target
      },
      handleLink: (_e, href) => {
        if (typeof window !== 'undefined') window.location.href = href
      },
    }
  }
  return ctx
}
