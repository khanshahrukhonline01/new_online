import { describe, expect, it, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { BookmarkButton } from './BookmarkButton'
import type { SavedItem } from '../../modules/saved/savedData'

describe('BookmarkButton Component', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.clear()
    }
  })

  const mockItem: SavedItem = {
    id: 'test-item-123',
    title: 'Trial for Elite Academy',
    category: 'trial',
    categoryLabel: 'Selection Trial',
    sport: 'Football',
    city: 'Mumbai',
    href: '/opportunities',
    savedAt: new Date().toISOString(),
  }

  it('renders un-saved button with correct accessibility attributes', () => {
    const html = renderToStaticMarkup(<BookmarkButton item={mockItem} />)

    expect(html).toContain('khelgrid-bookmark-btn')
    expect(html).toContain('variant-icon-only')
    expect(html).toContain('aria-label="Save Trial for Elite Academy to bookmarks"')
    expect(html).toContain('title="Save to bookmarks"')
  })

  it('renders pill variant with label when showLabel is true', () => {
    const html = renderToStaticMarkup(
      <BookmarkButton item={mockItem} variant="pill" showLabel={true} />
    )

    expect(html).toContain('variant-pill')
    expect(html).toContain('bookmark-label')
    expect(html).toContain('Save')
  })
})
