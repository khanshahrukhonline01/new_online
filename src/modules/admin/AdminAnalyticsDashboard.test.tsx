import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AdminAnalyticsDashboard } from './AdminAnalyticsDashboard'

describe('AdminAnalyticsDashboard Executive Operations & Telemetry Suite', () => {
  const mockSummary = {
    totalPublished: 42,
    totalSubmissions: 50,
    pendingCount: 4,
    underReviewCount: 2,
    changesRequestedCount: 1,
    approvedCount: 5,
    publishedCount: 38,
    rejectedCount: 0,
    unpublishedCount: 0,
    sportsBreakdown: {
      Cricket: 14,
      Football: 12,
      Badminton: 8,
      Turf: 5,
      Basketball: 2,
      Athletics: 1,
      Tennis: 0,
      Swimming: 0,
      Other: 0,
    },
    categoryBreakdown: {
      pickup_game: 10,
      venue: 15,
      opportunity: 8,
      coach: 6,
      academy: 3,
      event: 8,
    },
    cityBreakdown: {
      Delhi: 18,
      Bengaluru: 12,
      Mumbai: 8,
      Kolkata: 4,
    },
  }

  it('renders all 4 executive KPI metric cards with live values', () => {
    const html = renderToStaticMarkup(<AdminAnalyticsDashboard initialSummary={mockSummary} />)
    expect(html).toContain('Operations Analytics &amp; KPI Dashboard')
    expect(html).toContain('Total Published Listings')
    expect(html).toContain('42')
    expect(html).toContain('Pending Review Queue')
    expect(html).toContain('4')
    expect(html).toContain('Approved for Publication')
    expect(html).toContain('5')
    expect(html).toContain('Active Ingested Cities')
    expect(html).toContain('4')
  })

  it('renders live sports segmentation with Cricket, Football, Badminton, Turf distribution meters', () => {
    const html = renderToStaticMarkup(<AdminAnalyticsDashboard initialSummary={mockSummary} />)
    expect(html).toContain('Live Listings by Sport')
    expect(html).toContain('Cricket')
    expect(html).toContain('14 listings')
    expect(html).toContain('Football')
    expect(html).toContain('12 listings')
    expect(html).toContain('Badminton')
    expect(html).toContain('8 listings')
    expect(html).toContain('Turf')
    expect(html).toContain('5 listings')
  })

  it('renders active cities geographic footprint badges and category breakdown', () => {
    const html = renderToStaticMarkup(<AdminAnalyticsDashboard initialSummary={mockSummary} />)
    expect(html).toContain('Geographic Distribution &amp; Categories')
    expect(html).toContain('Delhi')
    expect(html).toContain('18')
    expect(html).toContain('Bengaluru')
    expect(html).toContain('12')
    expect(html).toContain('Mumbai')
    expect(html).toContain('8')
    expect(html).toContain('pickup game')
    expect(html).toContain('venue')
  })

  it('renders moderator activity feed section and bulk moderation console', () => {
    const html = renderToStaticMarkup(<AdminAnalyticsDashboard initialSummary={mockSummary} />)
    expect(html).toContain('Moderator Activity Feed')
    expect(html).toContain('All Activity')
    expect(html).toContain('Bulk Moderation Actions &amp; Fast Tagging')
    expect(html).toContain('Quick-Tag Sport &amp; City')
    expect(html).toContain('Bulk Approve')
    expect(html).toContain('Bulk Live Publish')
  })
})
