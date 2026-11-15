import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { PaymentCheckoutModal } from './PaymentCheckoutModal'
import type { PaymentItem } from './paymentTypes'

describe('PaymentCheckoutModal Component', () => {
  const mockItem: PaymentItem = {
    id: 'test-match-1',
    type: 'pickup_match',
    title: 'Football 5v5 Turf Match',
    subtitle: 'Kicks on Grass, Bengaluru',
    amount: 250,
    emoji: '⚽',
    venueName: 'Kicks on Grass Arena',
    city: 'Bengaluru',
    dateOrTime: 'Today · 8:30 PM',
  }

  it('renders nothing when isOpen is false', () => {
    const html = renderToStaticMarkup(
      <PaymentCheckoutModal
        isOpen={false}
        onClose={() => {}}
        item={mockItem}
        onSuccess={() => {}}
      />
    )
    expect(html).toBe('')
  })

  it('renders modal with title, venue, and payable amount', () => {
    const html = renderToStaticMarkup(
      <PaymentCheckoutModal
        isOpen={true}
        onClose={() => {}}
        item={mockItem}
        onSuccess={() => {}}
      />
    )

    expect(html).toContain('Football 5v5 Turf Match')
    expect(html).toContain('₹250')
    expect(html).toContain('Kicks on Grass Arena')
    expect(html).toContain('UPI (GPay / PhonePe)')
    expect(html).toContain('disabled')
    expect(html).toContain('Cards / NetBanking')
    expect(html).toContain('Pay at Ground')
    expect(html).toContain('Total Payable')
  })

  it('renders customer inputs without exposing an unconfigured merchant VPA', () => {
    const html = renderToStaticMarkup(
      <PaymentCheckoutModal
        isOpen={true}
        onClose={() => {}}
        item={mockItem}
        initialCustomer={{ name: 'Vikram Rao', phone: '9876543210' }}
        onSuccess={() => {}}
      />
    )

    expect(html).toContain('Vikram Rao')
    expect(html).toContain('9876543210')
    expect(html).not.toContain('khelgrid@icici')
    expect(html).toContain('Request Spot (Pay at Ground)')
    expect(html).toContain('Total Payable')
  })

  it('labels venue checkout as an advance deposit and shows the venue balance', () => {
    const venueItem: PaymentItem = {
      id: 'venue-1',
      type: 'venue_booking',
      title: 'Court 1 Advance Deposit',
      amount: 300,
      metadata: { bookingTotalAmount: 800, balancePayableAtVenue: 500 },
    }
    const html = renderToStaticMarkup(
      <PaymentCheckoutModal
        isOpen={true}
        onClose={() => {}}
        item={venueItem}
        onSuccess={() => {}}
      />
    )

    expect(html).toContain('Advance Deposit')
    expect(html).toContain('Full slot value: ₹800')
    expect(html).toContain('balance at venue: ₹500')
    expect(html).not.toContain('Total Payable')
  })

  it('omits Pay at Ground when allowPayAtVenue is false', () => {
    const html = renderToStaticMarkup(
      <PaymentCheckoutModal
        isOpen={true}
        onClose={() => {}}
        item={mockItem}
        onSuccess={() => {}}
        allowPayAtVenue={false}
      />
    )

    expect(html).not.toContain('Pay at Ground')
  })
})
