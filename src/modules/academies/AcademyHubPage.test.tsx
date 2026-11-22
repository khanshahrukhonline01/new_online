import { describe, expect, it, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import AcademyHubPage from './AcademyHubPage'
import { clearAcademySaaSMemoryStore } from './academySaaSClient'

describe('AcademyHubPage SaaS Workspace Suite', () => {
  beforeEach(() => {
    clearAcademySaaSMemoryStore()
  })

  it('renders 100% Free Grassroots Launch Access banner with ₹3,499/mo Pro unlocked value', () => {
    const html = renderToStaticMarkup(<AcademyHubPage initialAcademySlug="bengaluru-fc-academy" />)

    expect(html).toContain('100% Free Grassroots Launch Access')
    expect(html).toContain('Academy Pro Hub (₹3,499/mo Value) Unlocked Without Charges')
    expect(html).toContain('KhelGrid is empowering grassroots sports academies across India')
    expect(html).toContain('View Public Academy Page')
  })

  it('renders top KPI metrics strip (Leads, Enrolled Students, Fee Collection, Trial Passes)', () => {
    const html = renderToStaticMarkup(<AcademyHubPage initialAcademySlug="bengaluru-fc-academy" />)

    expect(html).toContain('Inbound Leads')
    expect(html).toContain('Enrolled Students')
    expect(html).toContain('Fee Collection')
    expect(html).toContain('Trial Passes Issued')
    expect(html).toContain('new parent enquiries awaiting contact')
  })

  it('renders all operational workspaces in navigation tabs including daily attendance', () => {
    const html = renderToStaticMarkup(<AcademyHubPage initialAcademySlug="bengaluru-fc-academy" />)

    expect(html).toContain('Admissions CRM &amp; Leads')
    expect(html).toContain('Batch Schedules')
    expect(html).toContain('Student Fees &amp; UPI')
    expect(html).toContain('Cash &amp; UPI Ledger')
    expect(html).toContain('Daily Attendance')
    expect(html).toContain('Staff &amp; Coaches')
    expect(html).toContain('Trial Passes')
    expect(html).toContain('WhatsApp &amp; UPI Setup')
  })

  it('renders default leads with 1-click WhatsApp parent action and token badge', () => {
    const html = renderToStaticMarkup(<AcademyHubPage initialAcademySlug="bengaluru-fc-academy" />)

    expect(html).toContain('Aarav Sundaram')
    expect(html).toContain('Ramesh Sundaram')
    expect(html).toContain('ENQ-FTB')
    expect(html).toContain('https://wa.me/919845012345?text=')
  })

  it('renders academy switcher with registered academies and setup new academy trigger', () => {
    const html = renderToStaticMarkup(<AcademyHubPage initialAcademySlug="bengaluru-fc-academy" />)

    expect(html).toContain('Switch Academy Management Workspace:')
    expect(html).toContain('+ Setup New Academy')
    expect(html).toContain('Share WhatsApp Card')
    expect(html).toContain('Bengaluru FC Residential Academy')
    expect(html).toContain('Pullela Gopichand Badminton Academy')
  })

  it('renders role selector, DPDP minor shield toggle, and support concierge', () => {
    const html = renderToStaticMarkup(<AcademyHubPage initialAcademySlug="bengaluru-fc-academy" />)

    expect(html).toContain('Role:')
    expect(html).toContain('DPDP Minor Shield: ON (Masked)')
    expect(html).toContain('Support Concierge')
    expect(html).toContain('https://wa.me/919876543210?text=')
  })

  it('renders 5-step pre-launch onboarding checklist banner', () => {
    const html = renderToStaticMarkup(<AcademyHubPage initialAcademySlug="bengaluru-fc-academy" />)

    expect(html).toContain('Pre-Launch Readiness Checklist')
    expect(html).toContain('Configure Direct Bank UPI VPA')
    expect(html).toContain('Create Your First Training Batch')
    expect(html).toContain('Import or Enroll Student Trainees')
    expect(html).toContain('Execute Pitch-Side Ground Roll-Call')
    expect(html).toContain('Assign Coaching Staff &amp; POCSO Officer')
  })
})
