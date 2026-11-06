import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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

  it('renders modal with title, venue, and payable amount', () => {
    const handleClose = vi.fn()
    const handleSuccess = vi.fn()

    render(
      <PaymentCheckoutModal
        isOpen={true}
        onClose={handleClose}
        item={mockItem}
        onSuccess={handleSuccess}
      />
    )

    expect(screen.getByText('Football 5v5 Turf Match')).toBeDefined()
    expect(screen.getByText('₹250')).toBeDefined()
    expect(screen.getByText('UPI (GPay / PhonePe)')).toBeDefined()
    expect(screen.getByText('Cards / NetBanking')).toBeDefined()
    expect(screen.getByText('Pay at Ground')).toBeDefined()
  })

  it('allows switching between payment method tabs', () => {
    render(
      <PaymentCheckoutModal
        isOpen={true}
        onClose={vi.fn()}
        item={mockItem}
        onSuccess={vi.fn()}
      />
    )

    // Switch to Card tab
    fireEvent.click(screen.getByText('Cards / NetBanking'))
    expect(screen.getByText('Card Number')).toBeDefined()

    // Switch to Pay at Ground tab
    fireEvent.click(screen.getByText('Pay at Ground'))
    expect(screen.getByText('Pay in Person at the Ground')).toBeDefined()
  })

  it('validates customer name and mobile before processing', async () => {
    render(
      <PaymentCheckoutModal
        isOpen={true}
        onClose={vi.fn()}
        item={mockItem}
        onSuccess={vi.fn()}
      />
    )

    // Clear inputs and attempt submission
    const nameInput = screen.getByLabelText(/Your Full Name/i)
    fireEvent.change(nameInput, { target: { value: 'A' } })

    const payBtn = screen.getByRole('button', { name: /Pay ₹250 & Confirm/i })
    fireEvent.click(payBtn)

    await waitFor(() => {
      expect(screen.getByText(/Please enter your full name/i)).toBeDefined()
    })
  })

  it('completes transaction and invokes onSuccess callback', async () => {
    const handleSuccess = vi.fn()

    render(
      <PaymentCheckoutModal
        isOpen={true}
        onClose={vi.fn()}
        item={mockItem}
        initialCustomer={{ name: 'Vikram Rao', phone: '9876543210' }}
        onSuccess={handleSuccess}
      />
    )

    const payBtn = screen.getByRole('button', { name: /Pay ₹250 & Confirm/i })
    fireEvent.click(payBtn)

    await waitFor(() => {
      expect(screen.getByText(/Verifying Payment with NPCI/i)).toBeDefined()
    })

    await waitFor(
      () => {
        expect(handleSuccess).toHaveBeenCalledTimes(1)
        expect(screen.getByText(/Payment Confirmed!/i)).toBeDefined()
      },
      { timeout: 3000 }
    )
  })
})
