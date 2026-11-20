import { describe, it, expect, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ParentPortalPage from './ParentPortalPage'
import { clearParentPortalMemoryStore } from './parentPortalService'

describe('ParentPortalPage Component Suite', () => {
  beforeEach(() => {
    clearParentPortalMemoryStore()
  })

  it('renders student ground pass, attendance passbook, and zero commission guarantee badge', () => {
    const html = renderToStaticMarkup(<ParentPortalPage initialStudentId="st-01" />)
    expect(html).toContain('Parent Passbook &amp; Ground Pass')
    expect(html).toContain('0% Commission Guaranteed')
    expect(html).toContain('Aarav Sharma')
    expect(html).toContain('Delhi Football Academy')
    expect(html).toContain('Attendance Passbook')
    expect(html).toContain('Fee Invoices &amp; Receipts')
  })

  it('renders biometric stats, blood group and emergency contact', () => {
    const html = renderToStaticMarkup(<ParentPortalPage initialStudentId="st-01" />)
    expect(html).toContain('B+')
    expect(html).toContain('DFA-2026-042')
    expect(html).toContain('IN-ATH-2026-DEL-0091')
  })

  it('renders attendance history sessions and coach notes', () => {
    const html = renderToStaticMarkup(<ParentPortalPage initialStudentId="st-01" />)
    expect(html).toContain('Tactical Pressing &amp; Small Sided Games')
    expect(html).toContain('Coach Rajesh')
  })

  it('renders fee invoices with direct UPI deep links', () => {
    const html = renderToStaticMarkup(<ParentPortalPage initialStudentId="st-01" initialTab="fees" />)
    expect(html).toContain('upi://pay?pa=')
    expect(html).toContain('delhifa%40icici')
  })
})
