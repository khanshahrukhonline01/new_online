import { type MouseEvent } from 'react'
import { SiteIcon } from './SiteIcon'
import { useSavedItems } from '../services/savedService'
import type { SavedItem } from '../../modules/saved/savedData'
import './BookmarkButton.css'

export interface BookmarkButtonProps {
  item: SavedItem
  size?: number
  showLabel?: boolean
  label?: string
  variant?: 'icon-only' | 'pill' | 'card-corner'
  className?: string
  onToggle?: (isSaved: boolean, item: SavedItem) => void
}

export function BookmarkButton({
  item,
  size = 15,
  showLabel = false,
  label,
  variant = 'icon-only',
  className = '',
  onToggle,
}: BookmarkButtonProps) {
  const { isSaved, toggleSave } = useSavedItems()
  const saved = isSaved(item.id)

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const nextSaved = toggleSave(item)
    if (onToggle) {
      onToggle(nextSaved, item)
    }
  }

  const tooltip = saved ? 'Remove from saved items' : 'Save to bookmarks'
  const displayLabel = label || (saved ? 'Saved' : 'Save')

  return (
    <button
      type="button"
      className={`khelgrid-bookmark-btn variant-${variant} ${saved ? 'is-saved' : ''} ${className}`.trim()}
      onClick={handleClick}
      aria-label={saved ? `Remove ${item.title} from saved items` : `Save ${item.title} to bookmarks`}
      title={tooltip}
      aria-pressed={saved}
    >
      <SiteIcon name="bookmark" size={size} />
      {showLabel && <span className="bookmark-label">{displayLabel}</span>}
    </button>
  )
}

export default BookmarkButton
