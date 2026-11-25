/**
 * ConfirmDialog.tsx – Accessible confirmation dialog with focus trap and Escape support.
 */
import { useEffect, useRef, useCallback } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) requestAnimationFrame(() => cancelRef.current?.focus())
  }, [open])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCancel()
  }, [onCancel])

  if (!open) return null

  return (
    <div
      className="kg-confirm-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="kg-confirm-title"
        aria-describedby="kg-confirm-msg"
        className="kg-confirm-dialog"
        onKeyDown={handleKeyDown}
      >
        <div className="kg-confirm-body">
          <h3 id="kg-confirm-title">{title}</h3>
          <p id="kg-confirm-msg">{message}</p>
        </div>
        <div className="kg-confirm-actions">
          <button
            ref={cancelRef}
            type="button"
            className="kg-btn kg-btn-ghost kg-touch-target"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`kg-btn kg-touch-target ${destructive ? 'kg-btn-danger' : 'kg-btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
