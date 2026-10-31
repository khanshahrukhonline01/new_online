import { useState } from 'react'
import { SiteIcon } from './SiteIcon'
import './ShareBar.css'

export interface ShareBarProps {
  title: string
  text?: string
  url?: string
  compact?: boolean
  className?: string
}

export function ShareBar({ title, text, url, compact = false, className = '' }: ShareBarProps) {
  const [copied, setCopied] = useState(false)

  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : 'https://khelgrid.com')
  const shareText = text || `Check out ${title} on KhelGrid — India's Sports Discovery & Talent Grid`
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`

  async function handleNativeShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: shareUrl,
        })
        return
      } catch {
        // User cancelled or unsupported; fallback to copy
      }
    }
    handleCopyLink()
  }

  function handleCopyLink() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      }).catch(() => {
        setCopied(false)
      })
    }
  }

  return (
    <div className={`kg-share-bar ${compact ? 'is-compact' : ''} ${className}`} role="region" aria-label="Share options">
      <span className="kg-share-label">
        <SiteIcon name="share" size={15} />
        {!compact && <span>Share:</span>}
      </span>

      <div className="kg-share-actions">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="kg-share-btn is-whatsapp"
          title="Share to WhatsApp"
          aria-label="Share to WhatsApp"
        >
          <SiteIcon name="message" size={15} />
          <span>WhatsApp</span>
        </a>

        <button
          type="button"
          onClick={handleCopyLink}
          className={`kg-share-btn is-copy ${copied ? 'is-copied' : ''}`}
          title="Copy link to clipboard"
          aria-label="Copy link to clipboard"
        >
          <SiteIcon name={copied ? 'check' : 'copy'} size={15} />
          <span>{copied ? 'Copied!' : 'Copy Link'}</span>
        </button>

        {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
          <button
            type="button"
            onClick={handleNativeShare}
            className="kg-share-btn is-native"
            title="Share via device menu"
            aria-label="Share via device menu"
          >
            <SiteIcon name="share" size={15} />
            <span>More</span>
          </button>
        )}
      </div>

      {copied && (
        <div className="kg-share-toast" role="status" aria-live="polite">
          <SiteIcon name="check" size={14} />
          <span>Link copied to clipboard!</span>
        </div>
      )}
    </div>
  )
}
