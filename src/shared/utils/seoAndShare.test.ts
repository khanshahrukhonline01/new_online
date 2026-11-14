import { describe, expect, it } from 'vitest'
import { getRouteSeoMetadata } from './seoAndShare'

describe('restricted route SEO', () => {
  it('marks the moderator control panel as non-indexable', () => {
    const metadata = getRouteSeoMetadata('/admin/control')
    expect(metadata.robots).toBe('noindex, nofollow, noarchive')
    expect(metadata.canonicalUrl).toBe('https://khelgrid.com/admin/control')
  })

  it('keeps public catalogue routes indexable', () => {
    expect(getRouteSeoMetadata('/venues').robots).toBeUndefined()
  })
})
