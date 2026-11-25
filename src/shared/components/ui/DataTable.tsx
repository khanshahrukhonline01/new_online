/**
 * DataTable.tsx
 *
 * Responsive data table that stacks as labelled cards on screens <= 700px.
 * - Minimum 44px touch targets on action buttons (enforced via CSS class `kg-touch-target`)
 * - Zero horizontal overflow: `data-label` attributes power the mobile card headers
 * - Optional sticky action bar rendered below the table on mobile
 */
import type { ReactNode } from 'react'

export interface DataTableColumn<T> {
  key: string
  header: string
  /** Render the cell value. Receives the full row object. */
  render?: (row: T) => ReactNode
  /** Additional CSS class for <td> and <th> */
  className?: string
  /** Hide on mobile (< 700px) */
  hideOnMobile?: boolean
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  /** Renders action buttons (Edit, Delete, etc.) at the end of each row. */
  rowActions?: (row: T) => ReactNode
  loading?: boolean
  empty?: ReactNode
  /** Rendered below the table, sticky at the bottom on mobile. */
  stickyBar?: ReactNode
  caption?: string
  className?: string
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowActions,
  loading = false,
  empty,
  stickyBar,
  caption,
  className = '',
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className={`kg-data-table-wrap is-loading ${className}`.trim()} role="status" aria-label="Loading">
        <div className="kg-data-table-skeleton" aria-hidden="true" />
      </div>
    )
  }

  if (!loading && rows.length === 0 && empty) {
    return <>{empty}</>
  }

  return (
    <div className={`kg-data-table-wrap ${className}`.trim()}>
      <div className="kg-data-table-scroll" role="region" aria-label={caption || 'Data table'} tabIndex={0}>
        <table className="kg-data-table">
          {caption && <caption className="kg-data-table-caption">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={[
                    'kg-data-table-th',
                    col.className,
                    col.hideOnMobile ? 'kg-hide-mobile' : '',
                  ].filter(Boolean).join(' ')}
                >
                  {col.header}
                </th>
              ))}
              {rowActions && <th scope="col" className="kg-data-table-th kg-data-table-actions-col">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="kg-data-table-row">
                {columns.map((col) => {
                  const value = (row as Record<string, unknown>)[col.key]
                  return (
                    <td
                      key={col.key}
                      className={[
                        'kg-data-table-td',
                        col.className,
                        col.hideOnMobile ? 'kg-hide-mobile' : '',
                      ].filter(Boolean).join(' ')}
                      data-label={col.header}
                    >
                      {col.render ? col.render(row) : String(value ?? '')}
                    </td>
                  )
                })}
                {rowActions && (
                  <td className="kg-data-table-td kg-data-table-actions-cell" data-label="Actions">
                    <div className="kg-data-table-actions">{rowActions(row)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {stickyBar && (
        <div className="kg-sticky-action-bar">
          {stickyBar}
        </div>
      )}
    </div>
  )
}
