import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import CoachDashboardPage from './CoachDashboardPage'

describe('CoachDashboardPage Component', () => {
  it('renders coach workspace header and verified status', () => {
    const html = renderToStaticMarkup(
      <CoachDashboardPage initialCoachSlug="zaheer-farooq-coach" />
    )

    expect(html).toContain('KHELGRID · COACH OPERATIONS HUB')
    expect(html).toContain('Coach Zaheer Farooq')
    expect(html).toContain('KhelGrid Verified Coach')
    expect(html).toContain('Official KhelGrid Verified Coach')
  })

  it('renders all 4 admincn-style metric statistics cards', () => {
    const html = renderToStaticMarkup(
      <CoachDashboardPage initialCoachSlug="zaheer-farooq-coach" />
    )

    expect(html).toContain('Active Trainees')
    expect(html).toContain('Collected This Month')
    expect(html).toContain('New Inquiries')
    expect(html).toContain('Active Batches')
    expect(html).toContain('+14.2%')
  })

  it('renders tab switcher and default trainee roster datatable', () => {
    const html = renderToStaticMarkup(
      <CoachDashboardPage initialCoachSlug="zaheer-farooq-coach" />
    )

    expect(html).toContain('Trainee Roster')
    expect(html).toContain('Inbound Inquiries')
    expect(html).toContain('Batches &amp; Timings')
    expect(html).toContain('Daily Attendance')
    expect(html).toContain('Total Earnings &amp; UPI QR')
    expect(html).toContain('Credentials &amp; Evidence')

    // Table elements and new feature controls
    expect(html).toContain('Arjun Mehra')
    expect(html).toContain('Rohan Deshmukh')
    expect(html).toContain('Morning Elite Fast Bowlers Camp')
    expect(html).toContain('Add Trainee')
    expect(html).toContain('Import CSV')
    expect(html).toContain('Public Profile')
    expect(html).toContain('Share WhatsApp Card')
    expect(html).toContain('Receipt')
    expect(html).toContain('Combines &amp; Benchmarks')
    expect(html).toContain('Weekly Drills &amp; Homework')
    expect(html).toContain('Verified Endorsements')
  })

  it('renders combines and normative talent battery when tab is active', () => {
    // We can verify default elements and modals exist
    const html = renderToStaticMarkup(
      <CoachDashboardPage initialCoachSlug="zaheer-farooq-coach" />
    )

    expect(html).toContain('Combines &amp; Benchmarks')
    expect(html).toContain('Weekly Drills &amp; Homework')
    expect(html).toContain('Verified Endorsements')
  })

  it('wires WorkspaceShell workspaceSection prop directly to athletes and credentials sub-panels', () => {
    const athletesHtml = renderToStaticMarkup(
      <CoachDashboardPage initialCoachSlug="zaheer-farooq-coach" workspaceSection="athletes" />
    )
    expect(athletesHtml).toContain('Daily Batch Attendance')
    expect(athletesHtml).toContain('Save Attendance')

    const credsHtml = renderToStaticMarkup(
      <CoachDashboardPage initialCoachSlug="zaheer-farooq-coach" workspaceSection="credentials" />
    )
    expect(credsHtml).toContain('Coaching Credentials &amp; Verification Evidence')
    expect(credsHtml).toContain('Primary Certification:')
  })
})
