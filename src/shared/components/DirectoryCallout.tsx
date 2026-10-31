import type { MouseEvent } from 'react'
import { SiteIcon, type SiteIconName } from './SiteIcon'
import './DirectoryCallout.css'

export interface DirectoryCalloutProps {
  variant: 'coach' | 'venue' | 'opportunity' | 'chronicle'
  tag: string
  title: string
  description: string
  buttonLabel: string
  buttonHref: string
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void
  onButtonClick?: () => void
  icon?: SiteIconName
}

export function DirectoryCallout({
  variant,
  tag,
  title,
  description,
  buttonLabel,
  buttonHref,
  onNavigate,
  onButtonClick,
  icon = 'arrow-up-right',
}: DirectoryCalloutProps) {
  const isMailto = buttonHref.startsWith('mailto:')

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (onButtonClick) {
      event.preventDefault()
      onButtonClick()
      return
    }
    if (!isMailto && onNavigate) {
      onNavigate(event, buttonHref)
    }
  }

  return (
    <aside className={`directory-callout directory-callout-${variant}`} aria-label={title}>
      <div className="directory-callout-body">
        <span className="directory-callout-tag">{tag}</span>
        <div className="directory-callout-copy">
          <strong className="directory-callout-title">{title}</strong>
          <span className="directory-callout-desc">{description}</span>
        </div>
      </div>
      <a
        className="directory-callout-cta"
        href={buttonHref}
        onClick={handleClick}
        title={buttonLabel}
      >
        <span>{buttonLabel}</span>
        <SiteIcon name={icon} size={15} />
      </a>
    </aside>
  )
}

export default DirectoryCallout
