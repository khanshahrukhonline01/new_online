import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CommunityReviewsSection } from './CommunityReviewsSection'

describe('CommunityReviewsSection Component', () => {
  it('renders reviews header, scorecard, and write review action', () => {
    const html = renderToStaticMarkup(
      <CommunityReviewsSection
        entityType="venue"
        entityId="venue-123"
        entitySlug="kicks-on-grass-bellandur-bengaluru-914w9"
        entityName="Kicks on Grass Arena"
        sport="Football"
        city="Bengaluru"
      />,
    )

    expect(html).toContain('Player Reviews &amp; Court Photos')
    expect(html).toContain('Write a Review')
    expect(html).toContain('Add Photos')
    expect(html).toContain('Based on')
    expect(html).toContain('All Reviews')
    expect(html).toContain('With Photos')
  })

  it('renders correctly for academy entities with customized labels', () => {
    const html = renderToStaticMarkup(
      <CommunityReviewsSection
        entityType="academy"
        entityId="acad-456"
        entitySlug="pullela-gopichand-badminton-academy-hyderabad-hyderabad-u739x"
        entityName="Pullela Gopichand Badminton Academy"
        sport="Badminton"
        city="Hyderabad"
      />,
    )

    expect(html).toContain('Pullela Gopichand Badminton Academy')
    expect(html).toContain('5 ★')
    expect(html).toContain('Sort by:')
  })
})
