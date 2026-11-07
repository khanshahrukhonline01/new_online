import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import GoProModal from './GoProModal'
import { PRO_TIERS } from './goProTypes'

describe('GoProModal', () => {
  it('exports PRO_TIERS with 3 membership plans', () => {
    expect(PRO_TIERS).toHaveLength(3)
    expect(PRO_TIERS[0].id).toBe('athlete')
    expect(PRO_TIERS[1].id).toBe('coach')
    expect(PRO_TIERS[2].id).toBe('academy')
  })

  it('renders null when closed', () => {
    const html = renderToStaticMarkup(
      <GoProModal isOpen={false} onClose={vi.fn()} />
    )
    expect(html).toBe('')
  })

  it('renders complete VIP upgrade dialog with 3 plans, pricing, benefits, and checkout trigger when open', () => {
    const html = renderToStaticMarkup(
      <GoProModal isOpen={true} onClose={vi.fn()} />
    )

    // Accessibility and dialog semantics
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('aria-labelledby="gopro-modal-title"')

    // Badges and title
    expect(html).toContain('KhelGrid VIP Membership')
    expect(html).toContain('Unlock the Full Power of KhelGrid Pro')
    expect(html).toContain('850+ coaches across India')

    // Tiers
    expect(html).toContain('Athlete Pro')
    expect(html).toContain('Coach &amp; Scout Pro')
    expect(html).toContain('Academy &amp; Turf Suite')
    expect(html).toContain('Most Popular')

    // Key Features across tiers
    expect(html).toContain('Golden Verified Athlete Badge')
    expect(html).toContain('Instant WhatsApp &amp; SMS Trial Alerts')
    expect(html).toContain('Unlimited Talent Scanner Searches (53 Cities)')
    expect(html).toContain('0% Commission on First ₹50k Monthly Bookings')

    // Trust strip
    expect(html).toContain('100% Secure UPI &amp; Card Payments')
    expect(html).toContain('Cancel Anytime')
    expect(html).toContain('7-Day Money-Back Guarantee')
    expect(html).toContain('GST Invoices Provided')

    // Pricing page route and enterprise link
    expect(html).toContain('href="/pricing"')
    expect(html).toContain('Compare Full Features on Pricing Page')
    expect(html).toContain('mailto:khelgrid@gmail.com?subject=KhelGrid%20Pro%20Enterprise%20Enquiry')
  })
})
