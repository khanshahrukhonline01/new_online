/**
 * UiPrimitives.test.tsx
 *
 * SSR / renderToStaticMarkup + pure React unit suite for shared UI primitives
 * and extracted shared workflow components.
 */
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { KpiStrip } from './KpiStrip'
import { DataTable } from './DataTable'
import { WorkspaceDetailDrawer } from './WorkspaceDetailDrawer'
import { ConfirmDialog } from './ConfirmDialog'
import { EmptyState } from './EmptyState'
import { AttendanceRosterPanel } from '../workflows/AttendanceRosterPanel'
import { CsvTransferControls } from '../workflows/CsvTransferControls'
import { QrPassCardPanel } from '../workflows/QrPassCardPanel'
import { FeeReceiptDrawerContent } from '../workflows/FeeReceiptDrawerContent'
import { formReducer, type FormState } from '../../hooks/useFormState'

interface Row {
  id: string
  name: string
  sport: string
}

const COLUMNS = [
  { key: 'name', header: 'Name' },
  { key: 'sport', header: 'Sport' },
]

const ROWS: Row[] = [
  { id: '1', name: 'Rohit', sport: 'Cricket' },
  { id: '2', name: 'Virat', sport: 'Cricket' },
]

describe('Shared UI Primitives & Workflows', () => {
  it('KpiStrip renders up to 4 cards and caps larger lists at 4', () => {
    const items = Array.from({ length: 7 }, (_, i) => ({
      id: String(i),
      label: `KPI ${i}`,
      value: i * 10,
    }))
    const html = renderToStaticMarkup(<KpiStrip items={items} />)
    expect(html).toContain('KPI 0')
    expect(html).toContain('KPI 3')
    expect(html).not.toContain('KPI 4')
    expect(html).not.toContain('KPI 6')
  })

  it('DataTable renders column headers, rows, mobile data-labels, and stickyBar', () => {
    const html = renderToStaticMarkup(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={r => r.id}
        rowActions={r => <button type="button">{`Edit ${r.name}`}</button>}
        stickyBar={<span>2 records loaded</span>}
      />,
    )
    expect(html).toContain('Rohit')
    expect(html).toContain('data-label="Name"')
    expect(html).toContain('Edit Rohit')
    expect(html).toContain('kg-sticky-action-bar')
    expect(html).toContain('2 records loaded')
  })

  it('DataTable renders EmptyState when rows array is empty', () => {
    const html = renderToStaticMarkup(
      <DataTable<Row>
        columns={COLUMNS}
        rows={[]}
        rowKey={r => r.id}
        empty={<EmptyState title="No items" description="Add one to start." />}
      />,
    )
    expect(html).toContain('No items')
    expect(html).toContain('Add one to start.')
  })

  it('WorkspaceDetailDrawer renders accessible dialog & aria-live banner when open=true and nothing when closed', () => {
    const closedHtml = renderToStaticMarkup(
      <WorkspaceDetailDrawer open={false} onClose={vi.fn()} title="Hidden">
        <p>Body</p>
      </WorkspaceDetailDrawer>,
    )
    expect(closedHtml).toBe('')

    const openHtml = renderToStaticMarkup(
      <WorkspaceDetailDrawer open={true} onClose={vi.fn()} title="Athlete Details" statusMessage="Saved successfully">
        <p>Drawer body</p>
      </WorkspaceDetailDrawer>,
    )
    expect(openHtml).toContain('role="dialog"')
    expect(openHtml).toContain('aria-live="polite"')
    expect(openHtml).toContain('Athlete Details')
    expect(openHtml).toContain('Saved successfully')
  })

  it('ConfirmDialog renders alertdialog when open and nothing when closed', () => {
    expect(
      renderToStaticMarkup(
        <ConfirmDialog open={false} title="Archive" message="Confirm?" onConfirm={vi.fn()} onCancel={vi.fn()} />,
      ),
    ).toBe('')

    const html = renderToStaticMarkup(
      <ConfirmDialog open={true} title="Archive item" message="Are you sure?" destructive onConfirm={vi.fn()} onCancel={vi.fn()} />,
    )
    expect(html).toContain('role="alertdialog"')
    expect(html).toContain('Archive item')
    expect(html).toContain('kg-btn-danger')
  })

  it('renders extracted workflow components cleanly', () => {
    const rosterHtml = renderToStaticMarkup(
      <AttendanceRosterPanel
        dateLabel="2026-11-25"
        members={[{ id: 'm1', name: 'Aarav', batchName: 'Morning U16', status: 'present' }]}
        onToggleStatus={vi.fn()}
      />,
    )
    expect(rosterHtml).toContain('Daily Batch Attendance')
    expect(rosterHtml).toContain('Aarav')
    expect(rosterHtml).toContain('1/1 Present')

    const csvHtml = renderToStaticMarkup(
      <CsvTransferControls onImportCsvText={vi.fn()} onDownloadSample={vi.fn()} onExportCsv={vi.fn()} />,
    )
    expect(csvHtml).toContain('Import CSV')
    expect(csvHtml).toContain('Download Sample Template')
    expect(csvHtml).toContain('Export CSV')

    const qrHtml = renderToStaticMarkup(
      <QrPassCardPanel
        pass={{
          token: 'PASS-123',
          title: 'Trial Entry',
          subtitle: 'Delhi Academy',
          holder: 'Karan',
          sport: 'Cricket',
          venue: 'Main Ground',
          scheduleLabel: '07:00 AM',
          status: 'valid',
          statusLabel: 'Valid',
          qrPayload: 'PASS-123',
        }}
      />,
    )
    expect(qrHtml).toContain('PASS-123')
    expect(qrHtml).toContain('<svg')

    const receiptHtml = renderToStaticMarkup(
      <FeeReceiptDrawerContent
        receipt={{
          receiptNumber: 'REC-01',
          payerName: 'Karan',
          recipientOrg: 'Delhi Academy',
          amountInr: 2500,
          paymentMethod: 'UPI',
          paidAt: '2026-11-25',
          billingCycle: 'Nov 2026',
        }}
      />,
    )
    expect(receiptHtml).toContain('Receipt #REC-01')
    expect(receiptHtml).toContain('₹')
  })

  it('useFormState formReducer updates fields, errors, submitting, and resets cleanly', () => {
    const initial = { name: '', email: '' }
    let state: FormState<typeof initial> = { fields: initial, errors: {}, dirty: false, submitting: false }
    state = formReducer(state, { type: 'SET_FIELD', key: 'name', value: 'Aarav' })
    expect(state.fields.name).toBe('Aarav')
    expect(state.dirty).toBe(true)

    state = formReducer(state, { type: 'SET_ERROR', key: 'email', message: 'Required' })
    expect(state.errors.email).toBe('Required')

    state = formReducer(state, { type: 'BEGIN_SUBMIT' })
    expect(state.submitting).toBe(true)

    state = formReducer(state, { type: 'END_SUBMIT' })
    expect(state.submitting).toBe(false)

    state = formReducer(state, { type: 'CLEAR_ERRORS' })
    expect(state.errors).toEqual({})

    state = formReducer(state, { type: 'RESET', initial })
    expect(state.fields.name).toBe('')
    expect(state.dirty).toBe(false)
  })
})
