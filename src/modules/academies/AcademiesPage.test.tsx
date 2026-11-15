import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import AcademiesPage from './AcademiesPage'

describe('AcademiesPage — Sports Academies Directory Index', () => {
  it('renders directory heading, registration callout CTA, and curated academy cards', () => {
    const html = renderToStaticMarkup(
      <AcademiesPage onNavigate={vi.fn()} onOpenIntake={vi.fn()} />
    )

    // Heading & Eyebrow
    expect(html).toContain('Certified Sports Academies in India.')
    expect(html).toContain('ACADEMY &amp; TRAINING DIRECTORY')

    // + Register Academy CTA Callout
    expect(html).toContain('+ Register Academy')
    expect(html).toContain('Operate a sports academy or coaching club? List with 0% Fee')

    // Academy cards
    expect(html).toContain('Bengaluru FC Youth Academy')
    expect(html).toContain('/academies/bengaluru-fc-academy')
    expect(html).toContain('Pullela Gopichand Badminton Academy')
    expect(html).toContain('/academies/pullela-gopichand-badminton-academy')
    expect(html).toContain('Mary Kom Regional Boxing Foundation')
    expect(html).toContain('/academies/mary-kom-regional-boxing-foundation')
    expect(html).toContain('Tata Football Academy')
    expect(html).toContain('/academies/tata-football-academy')

    // Card badges and view buttons
    expect(html).toContain('View Profile')
    expect(html).toContain('Source Verified')
  })
})
