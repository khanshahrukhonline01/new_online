/**
 * CsvTransferControls.tsx
 *
 * Shared CSV import/export and template download toolbar used across
 * AcademyHubPage, CoachDashboardPage, and TurfSlotCalendarPage.
 */
import { useRef, type ChangeEvent } from 'react'
import { SiteIcon } from '../SiteIcon'

interface CsvTransferControlsProps {
  title?: string
  description?: string
  sampleFileName?: string
  onDownloadSample?: () => void
  onExportCsv?: () => void
  onImportCsvText: (csvText: string, fileName: string) => void
  accept?: string
}

export function CsvTransferControls({
  title = 'Bulk CSV Roster Transfer',
  description = 'Download a template, upload CSV records, or export the current roster.',
  onDownloadSample,
  onExportCsv,
  onImportCsvText,
  accept = '.csv,text/csv',
}: CsvTransferControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onImportCsvText(reader.result, file.name)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="kg-workflow-card" role="region" aria-label={title}>
      <div>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.84rem', color: 'var(--muted)' }}>{description}</p>
      </div>
      <div className="host-action-row" style={{ marginTop: 0 }}>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          hidden
          onChange={handleFileChange}
          aria-label="Upload CSV file"
        />
        <button
          type="button"
          className="kg-btn kg-btn-primary kg-touch-target"
          onClick={() => fileInputRef.current?.click()}
        >
          <SiteIcon name="upload" size={16} />
          <span>Import CSV</span>
        </button>
        {onDownloadSample && (
          <button
            type="button"
            className="kg-btn kg-touch-target"
            onClick={onDownloadSample}
          >
            <SiteIcon name="file-text" size={16} />
            <span>Download Sample Template</span>
          </button>
        )}
        {onExportCsv && (
          <button
            type="button"
            className="kg-btn kg-touch-target"
            onClick={onExportCsv}
          >
            <SiteIcon name="arrow-up-right" size={16} />
            <span>Export CSV</span>
          </button>
        )}
      </div>
    </div>
  )
}
