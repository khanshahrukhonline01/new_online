/**
 * WorkspaceDetailDrawer.tsx
 *
 * Accessible slide-over drawer for workspace detail views.
 * - Focus trap while open
 * - Escape key closes
 * - Focus restored to trigger on close
 * - Persistent aria-live status banner
 */
import { useEffect, useRef, useCallback } from 'react'
import type { ReactNode } from 'react'

interface WorkspaceDetailDrawerProps {
  open: boolean
  onClose: () => void
  title: string
  /** Optional status message shown in the persistent aria-live banner. */
  statusMessage?: string
  statusTone?: 'success' | 'error'
  footer?: ReactNode
  children: ReactNode
  /** Width of the drawer (default: 540px) */
  width?: number | string
}

const FOCUSABLE_SELECTORS = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export function WorkspaceDetailDrawer({
  open,
  onClose,
  title,
  statusMessage,
  statusTone = 'success',
  footer,
  children,
  width = 540,
}: WorkspaceDetailDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<Element | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement
      requestAnimationFrame(() => closeButtonRef.current?.focus())
    } else if (triggerRef.current && (triggerRef.current as HTMLElement).focus) {
      ;(triggerRef.current as HTMLElement).focus()
    }
  }, [open])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      onClose()
      return
    }
    if (e.key !== 'Tab') return

    const drawer = drawerRef.current
    if (!drawer) return
    const focusable = Array.from(drawer.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)).filter(
      (el) => !el.closest('[hidden]') && el.offsetParent !== null,
    )
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else if (document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }, [onClose])

  if (!open) return null

  return (
    <div
      className="kg-drawer-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="kg-drawer-title"
        className="kg-drawer-panel"
        style={{ width: typeof width === 'number' ? `min(${width}px, 100vw)` : width }}
        onKeyDown={handleKeyDown}
      >
        <div className="kg-drawer-header">
          <h2 id="kg-drawer-title" className="kg-drawer-title">{title}</h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="kg-btn kg-btn-ghost kg-touch-target"
            aria-label="Close panel"
            onClick={onClose}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {statusMessage && (
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className={`kg-drawer-live-region${statusTone === 'error' ? ' is-error' : ''}`}
          >
            {statusMessage}
          </div>
        )}

        <div className="kg-drawer-body">{children}</div>

        {footer && <div className="kg-drawer-footer">{footer}</div>}
      </div>
    </div>
  )
}
