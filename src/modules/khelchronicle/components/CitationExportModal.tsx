import { useState, useMemo } from 'react'
import { SiteIcon } from '../../../shared/components/SiteIcon'
import {
  type ResearchPaper,
  generateCitations,
  generateRisCitation,
} from '../data/khelchronicleData'

export interface CitationExportModalProps {
  paper: ResearchPaper | null
  isOpen: boolean
  onClose: () => void
}

export function CitationExportModal({ paper, isOpen, onClose }: CitationExportModalProps) {
  const [citationFormat, setCitationFormat] = useState<
    'apa' | 'harvard' | 'chicago' | 'mla' | 'vancouver' | 'bibtex'
  >('apa')
  const [copyFeedback, setCopyFeedback] = useState(false)

  const citations = useMemo(() => {
    if (!paper) return null
    return generateCitations(paper)
  }, [paper])

  if (!isOpen || !paper || !citations) return null

  const copyCitation = () => {
    const textToCopy = citations[citationFormat]
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy)
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    }
  }

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    if (typeof window === 'undefined') return
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDownloadBibtex = () => {
    downloadFile(citations.bibtex, `${paper.paperId}.bib`, 'application/x-bibtex')
  }

  const handleDownloadRis = () => {
    const ris = generateRisCitation(paper)
    downloadFile(ris, `${paper.paperId}.ris`, 'application/x-research-info-systems')
  }

  return (
    <div className="kc-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="citation-modal-title">
      <div className="kc-modal-box">
        <div className="kc-modal-header">
          <h3 id="citation-modal-title" className="kc-modal-title">
            Cite {paper.paperId}
          </h3>
          <button
            type="button"
            className="kc-modal-close-btn"
            onClick={onClose}
            aria-label="Close citation modal"
          >
            <SiteIcon name="close" size={18} />
          </button>
        </div>

        <div className="kc-modal-content">
          <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#475569' }}>
            {paper.title}
          </p>

          <div className="kc-citation-format-tabs" role="tablist" aria-label="Citation Formats">
            {(['apa', 'harvard', 'chicago', 'mla', 'vancouver', 'bibtex'] as const).map(fmt => (
              <button
                key={fmt}
                type="button"
                className={`kc-citation-tab ${citationFormat === fmt ? 'is-active' : ''}`}
                onClick={() => setCitationFormat(fmt)}
                role="tab"
                aria-selected={citationFormat === fmt}
              >
                {fmt.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="kc-citation-preview-box">
            <code>{citations[citationFormat]}</code>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
            <button type="button" className="kc-btn-primary" onClick={copyCitation}>
              <SiteIcon name="copy" size={14} />
              <span>{copyFeedback ? 'Copied to Clipboard!' : 'Copy Citation Text'}</span>
            </button>
            <button type="button" className="kc-btn-secondary" onClick={handleDownloadBibtex}>
              <SiteIcon name="download" size={13} />
              <span>Download .BIB</span>
            </button>
            <button type="button" className="kc-btn-secondary" onClick={handleDownloadRis}>
              <SiteIcon name="download" size={13} />
              <span>Download .RIS</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
export default CitationExportModal
