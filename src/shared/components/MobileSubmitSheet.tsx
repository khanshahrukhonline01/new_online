import { useEffect, useRef, type MouseEvent, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { SiteIcon } from './SiteIcon'
import { MOBILE_SUBMIT_SHEET_OPTIONS } from './sidebarUtils'

export interface MobileSubmitSheetProps {
  open: boolean
  activePath: string
  onClose: () => void
  onNavigate: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
  triggerRef: RefObject<HTMLButtonElement | null>
}

export default function MobileSubmitSheet({
  open,
  activePath,
  onClose,
  onNavigate,
  triggerRef,
}: MobileSubmitSheetProps) {
  const { t } = useTranslation(['common', 'navigation'])
  const sheetRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  // Lock body scroll while the submit sheet is open
  useEffect(() => {
    if (!open || typeof document === 'undefined') return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  // Move focus into the sheet immediately when opened
  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const rafId = window.requestAnimationFrame(() => {
      closeRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(rafId)
  }, [open])

  // Keyboard Escape close + Tab focus trap
  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        triggerRef.current?.focus()
        return
      }
      if (event.key !== 'Tab') return
      const sheet = sheetRef.current
      if (!sheet) return

      const focusable = Array.from(
        sheet.querySelectorAll<HTMLElement>(
          'a[href]:not([aria-disabled="true"]), button:not(:disabled), [tabindex="0"]',
        ),
      ).filter(element => element.offsetParent !== null)

      if (!focusable.length) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && (document.activeElement === first || !sheet.contains(document.activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !sheet.contains(document.activeElement))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose, triggerRef])

  const listingOptions = MOBILE_SUBMIT_SHEET_OPTIONS.filter(option => option.group === 'listing')
  const researchOptions = MOBILE_SUBMIT_SHEET_OPTIONS.filter(option => option.group === 'research')

  const currentUrl =
    typeof window !== 'undefined' ? `${activePath}${window.location.search}` : activePath

  return (
    <>
      <button
        type="button"
        className={open ? 'mobile-submit-backdrop is-visible' : 'mobile-submit-backdrop'}
        aria-label={t('closeSubmitMenu', { defaultValue: 'Close submit menu' })}
        aria-hidden={!open}
        tabIndex={open ? 0 : -1}
        onClick={() => {
          onClose()
          triggerRef.current?.focus()
        }}
      />

      <div
        ref={sheetRef}
        id="mobile-submit-sheet"
        className={open ? 'mobile-submit-sheet is-open' : 'mobile-submit-sheet'}
        role="dialog"
        aria-modal={open ? 'true' : undefined}
        aria-hidden={!open}
        aria-labelledby="mobile-submit-sheet-title"
      >
        <div className="mobile-submit-sheet-handle-wrap" aria-hidden="true">
          <span className="mobile-submit-sheet-handle" />
        </div>

        <div className="mobile-submit-sheet-header">
          <div className="mobile-submit-sheet-heading">
            <h2 id="mobile-submit-sheet-title">
              {t('submitSheetTitle', { defaultValue: 'Submit to KhelGrid' })}
            </h2>
            <p>
              {t('submitSheetSubtitle', {
                defaultValue: 'Choose what you want to list or publish',
              })}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="mobile-submit-sheet-close"
            aria-label={t('closeSubmitMenu', { defaultValue: 'Close submit menu' })}
            onClick={() => {
              onClose()
              triggerRef.current?.focus()
            }}
          >
            <SiteIcon name="close" size={18} />
          </button>
        </div>

        <div className="mobile-submit-sheet-body">
          <div className="mobile-submit-sheet-group" role="group" aria-label="Directory listings">
            {listingOptions.map(option => {
              const isCurrent =
                option.href.includes('?')
                  ? currentUrl === option.href
                  : activePath === option.href && (!currentUrl.includes('?type='))
              return (
                <a
                  key={option.id}
                  href={option.href}
                  className={isCurrent ? 'mobile-submit-option is-active' : 'mobile-submit-option'}
                  aria-current={isCurrent ? 'page' : undefined}
                  onClick={event => {
                    onNavigate(event, option.href)
                    onClose()
                  }}
                >
                  <span className="mobile-submit-option-icon" aria-hidden="true">
                    <SiteIcon name={option.icon} size={18} />
                  </span>
                  <span className="mobile-submit-option-copy">
                    <strong>{option.label}</strong>
                    <span>{option.description}</span>
                  </span>
                  <span className="mobile-submit-option-arrow" aria-hidden="true">
                    <SiteIcon name="chevron-right" size={16} />
                  </span>
                </a>
              )
            })}
          </div>

          <div className="mobile-submit-sheet-divider" role="separator" />

          <div className="mobile-submit-sheet-group" role="group" aria-label="KhelChronicle research">
            {researchOptions.map(option => {
              const isCurrent = activePath === option.href || activePath === '/chronicle/submit'
              return (
                <a
                  key={option.id}
                  href={option.href}
                  className={
                    isCurrent
                      ? 'mobile-submit-option is-research is-active'
                      : 'mobile-submit-option is-research'
                  }
                  aria-current={isCurrent ? 'page' : undefined}
                  onClick={event => {
                    onNavigate(event, option.href)
                    onClose()
                  }}
                >
                  <span className="mobile-submit-option-icon" aria-hidden="true">
                    <SiteIcon name={option.icon} size={18} />
                  </span>
                  <span className="mobile-submit-option-copy">
                    <strong>{option.label}</strong>
                    <span>{option.description}</span>
                  </span>
                  <span className="mobile-submit-option-arrow" aria-hidden="true">
                    <SiteIcon name="chevron-right" size={16} />
                  </span>
                </a>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
