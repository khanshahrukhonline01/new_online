import { useEffect, useMemo, useState, useCallback, type FC } from 'react'
import {
  getAdminChronicleManuscripts,
  startManuscriptScreening,
  requestScreeningCorrection,
  assignPeerReviewers,
  submitPeerReviewReport,
  requestManuscriptRevision,
  acceptManuscript,
  mintDoiAndPublish,
  rejectManuscript,
  addEditorialInternalNote,
  exportChronicleRegistryToCsv,
  resetAdminChronicleForTesting,
  PRE_APPROVED_REVIEWERS_POOL,
  SCREENING_REVISION_PRESETS,
  PEER_REVIEW_DECISION_PRESETS,
  type ChronicleManuscriptRecord,
  type EditorialManuscriptStatus,
  type ResearchDomain,
  type EditorialMicroKpiMetrics,
  type OpenAccessLicenseType,
} from '../services/adminChronicleService'
import './AdminChronicleEditorialDesk.css'

export interface AdminChronicleEditorialDeskProps {
  currentUser?: {
    name: string
    email: string
  }
}

export const AdminChronicleEditorialDesk: FC<AdminChronicleEditorialDeskProps> = ({
  currentUser = { name: 'Editorial Board Operator', email: 'editor.ops@khelgrid.com' },
}) => {
  const [manuscripts, setManuscripts] = useState<ChronicleManuscriptRecord[]>([])
  const [metrics, setMetrics] = useState<EditorialMicroKpiMetrics>({
    totalSubmissions: 0,
    pendingScreening: 0,
    inPeerReview: 0,
    revisionsActive: 0,
    acceptedReadyToPublish: 0,
    publishedOpenAccess: 0,
    avgReviewTurnaroundDays: 4.2,
    crossrefDoisMinted: 0,
  })
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<EditorialManuscriptStatus | 'all'>('all')
  const [domainFilter, setDomainFilter] = useState<ResearchDomain | 'all'>('all')
  const [selectedManuscriptId, setSelectedManuscriptId] = useState<string | null>(null)
  const [activeDrawerTab, setActiveDrawerTab] = useState<
    'overview' | 'screening' | 'reviewers' | 'revisions' | 'publishing' | 'audit'
  >('overview')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Modals state
  const [screeningModalOpen, setScreeningModalOpen] = useState(false)
  const [screeningReason, setScreeningReason] = useState('')
  const [screeningNotes, setScreeningNotes] = useState('')

  const [assignReviewerModalOpen, setAssignReviewerModalOpen] = useState(false)
  const [selectedReviewerId, setSelectedReviewerId] = useState('')
  const [blindMode, setBlindMode] = useState<'double_blind' | 'single_blind'>('double_blind')
  const [reviewDueDays, setReviewDueDays] = useState(10)

  const [revisionModalOpen, setRevisionModalOpen] = useState(false)
  const [revisionRecommendation, setRevisionRecommendation] = useState<'minor_revision' | 'major_revision'>('minor_revision')
  const [revisionDecisionTitle, setRevisionDecisionTitle] = useState('')
  const [revisionEditorialLetter, setRevisionEditorialLetter] = useState('')
  const [revisionDueDays, setRevisionDueDays] = useState(14)

  const [publishModalOpen, setPublishModalOpen] = useState(false)
  const [publishLicense, setPublishLicense] = useState<OpenAccessLicenseType>('CC-BY-4.0')
  const [publishDoiSuffix, setPublishDoiSuffix] = useState('')
  const [publishNotes, setPublishNotes] = useState('')

  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectLetter, setRejectLetter] = useState('')

  const [newInternalNote, setNewInternalNote] = useState('')

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await getAdminChronicleManuscripts({
        search: searchQuery,
        status: statusFilter,
        domain: domainFilter,
      })
      setManuscripts(res.manuscripts)
      setMetrics(res.metrics)
    } catch {
      showToast('Failed to load manuscripts.')
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, statusFilter, domainFilter])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const activeManuscript = useMemo(() => {
    if (!selectedManuscriptId) return null
    return manuscripts.find(m => m.id === selectedManuscriptId) || null
  }, [manuscripts, selectedManuscriptId])

  const handleClaimScreening = async (m: ChronicleManuscriptRecord) => {
    try {
      await startManuscriptScreening(m.id, currentUser)
      showToast(`Claimed screening for ${m.accessionNumber}`)
      await loadData()
      setSelectedManuscriptId(m.id)
      setActiveDrawerTab('screening')
    } catch {
      showToast('Error claiming screening.')
    }
  }

  const handleRequestScreeningCorrection = async () => {
    if (!selectedManuscriptId || !screeningReason.trim()) return
    try {
      await requestScreeningCorrection(selectedManuscriptId, {
        editor: currentUser,
        reason: screeningReason,
        notes: screeningNotes,
      })
      showToast('Screening corrections requested from author.')
      setScreeningModalOpen(false)
      setScreeningReason('')
      setScreeningNotes('')
      await loadData()
    } catch {
      showToast('Failed to request screening corrections.')
    }
  }

  const handleAssignReviewer = async () => {
    if (!selectedManuscriptId || !selectedReviewerId) return
    const reviewer = PRE_APPROVED_REVIEWERS_POOL.find(r => r.id === selectedReviewerId)
    if (!reviewer) return

    try {
      await assignPeerReviewers(selectedManuscriptId, {
        editor: currentUser,
        reviewers: [
          {
            id: reviewer.id,
            reviewerName: reviewer.name,
            institution: reviewer.institution,
            orcid: reviewer.orcid,
            domain: reviewer.domains[0] || 'biomechanics',
            blindMode,
            dueDays: reviewDueDays,
          },
        ],
      })
      showToast(`Assigned ${reviewer.name} (${blindMode.replace('_', ' ')})`)
      setAssignReviewerModalOpen(false)
      setSelectedReviewerId('')
      await loadData()
    } catch {
      showToast('Failed to assign reviewer.')
    }
  }

  const handleQuickSubmitReview = async (manuscriptId: string, reviewerId: string) => {
    try {
      await submitPeerReviewReport(manuscriptId, reviewerId, {
        recommendation: 'accept',
        scores: {
          methodology: 5,
          originality: 5,
          dataRigour: 5,
          clarity: 4,
        },
        confidentialCommentsToEditor: 'Empirical testing protocol is sound and robustly documented.',
        commentsForAuthor: 'Excellent contribution to Indian sports science literature.',
      })
      showToast('Sample referee report submitted.')
      await loadData()
    } catch {
      showToast('Failed to submit referee report.')
    }
  }

  const handleRequestRevision = async () => {
    if (!selectedManuscriptId || !revisionDecisionTitle.trim()) return
    try {
      await requestManuscriptRevision(selectedManuscriptId, {
        editor: currentUser,
        decisionTitle: revisionDecisionTitle,
        recommendation: revisionRecommendation,
        editorialLetter: revisionEditorialLetter,
        dueDays: revisionDueDays,
      })
      showToast(`Revisions requested (${revisionRecommendation.replace('_', ' ')})`)
      setRevisionModalOpen(false)
      setRevisionDecisionTitle('')
      setRevisionEditorialLetter('')
      await loadData()
    } catch {
      showToast('Failed to issue revision decision.')
    }
  }

  const handleAcceptManuscript = async (m: ChronicleManuscriptRecord) => {
    try {
      await acceptManuscript(m.id, {
        editor: currentUser,
        notes: 'Peer review recommendations satisfied. Approved for accession DOI minting.',
      })
      showToast(`Accepted ${m.accessionNumber} for publication!`)
      await loadData()
      setSelectedManuscriptId(m.id)
      setActiveDrawerTab('publishing')
    } catch {
      showToast('Failed to accept manuscript.')
    }
  }

  const handleMintDoiAndPublish = async () => {
    if (!selectedManuscriptId) return
    try {
      await mintDoiAndPublish(selectedManuscriptId, {
        editor: currentUser,
        license: publishLicense,
        customDoiSuffix: publishDoiSuffix || undefined,
        notes: publishNotes,
      })
      showToast('Crossref DOI minted and preprint published Open Access!')
      setPublishModalOpen(false)
      setPublishDoiSuffix('')
      setPublishNotes('')
      await loadData()
    } catch {
      showToast('Failed to mint DOI.')
    }
  }

  const handleRejectManuscript = async () => {
    if (!selectedManuscriptId || !rejectReason.trim()) return
    try {
      await rejectManuscript(selectedManuscriptId, {
        editor: currentUser,
        reason: rejectReason,
        editorialLetter: rejectLetter,
      })
      showToast('Manuscript declined.')
      setRejectModalOpen(false)
      setRejectReason('')
      setRejectLetter('')
      await loadData()
    } catch {
      showToast('Failed to reject manuscript.')
    }
  }

  const handleAddInternalNote = async () => {
    if (!selectedManuscriptId || !newInternalNote.trim()) return
    try {
      await addEditorialInternalNote(selectedManuscriptId, currentUser, newInternalNote)
      setNewInternalNote('')
      showToast('Editorial note added.')
      await loadData()
    } catch {
      showToast('Failed to add note.')
    }
  }

  const handleExportCsv = () => {
    const csv = exportChronicleRegistryToCsv(manuscripts)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `khelchronicle-editorial-registry-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Editorial registry exported to CSV.')
  }

  const handleResetForTesting = () => {
    resetAdminChronicleForTesting()
    showToast('Test manuscripts reset to baseline.')
    loadData()
  }

  return (
    <div className="chronicle-editorial-desk" data-testid="chronicle-editorial-desk">
      {/* 1. Header Ribbon */}
      <header className="chronicle-header-ribbon">
        <div className="chronicle-header-title-block">
          <h1>KhelChronicle Research Editorial & Peer-Review Desk</h1>
          <p>
            Two-tier pre-moderation screening, double-blind reviewer assignment, revision loops, and Crossref DOI minting (COPE & STORK compliant)
          </p>
        </div>
        <div className="chronicle-header-actions">
          <button
            type="button"
            className="chronicle-btn chronicle-btn-secondary"
            onClick={handleExportCsv}
            title="Download full editorial registry in RFC 4180 CSV format"
          >
            Export CSV
          </button>
          <button
            type="button"
            className="chronicle-btn chronicle-btn-secondary"
            onClick={handleResetForTesting}
            title="Reset seed research papers"
          >
            Reset Test Data
          </button>
          <button
            type="button"
            className="chronicle-btn chronicle-btn-primary"
            onClick={loadData}
          >
            Refresh
          </button>
        </div>
      </header>

      {/* 2. Micro-KPI Telemetry Ribbon */}
      <section className="chronicle-kpi-grid" aria-label="Editorial Telemetry Ribbon">
        <div className="chronicle-kpi-card" data-testid="kpi-total-submissions">
          <span className="chronicle-kpi-label">Total Submissions</span>
          <span className="chronicle-kpi-value">{metrics.totalSubmissions}</span>
          <span className="chronicle-kpi-subtext">Sports science intake</span>
        </div>
        <div className="chronicle-kpi-card" data-testid="kpi-pending-screening">
          <span className="chronicle-kpi-label">Needs Screening</span>
          <span className="chronicle-kpi-value">{metrics.pendingScreening}</span>
          <span className="chronicle-kpi-subtext">Tier 1 checks pending</span>
        </div>
        <div className="chronicle-kpi-card" data-testid="kpi-in-peer-review">
          <span className="chronicle-kpi-label">In Peer Review</span>
          <span className="chronicle-kpi-value">{metrics.inPeerReview}</span>
          <span className="chronicle-kpi-subtext">Active double-blind</span>
        </div>
        <div className="chronicle-kpi-card" data-testid="kpi-revisions-active">
          <span className="chronicle-kpi-label">Active Revisions</span>
          <span className="chronicle-kpi-value">{metrics.revisionsActive}</span>
          <span className="chronicle-kpi-subtext">Author rebuttal cycles</span>
        </div>
        <div className="chronicle-kpi-card" data-testid="kpi-accepted-ready">
          <span className="chronicle-kpi-label">Ready to Publish</span>
          <span className="chronicle-kpi-value">{metrics.acceptedReadyToPublish}</span>
          <span className="chronicle-kpi-subtext">Awaiting DOI minting</span>
        </div>
        <div className="chronicle-kpi-card" data-testid="kpi-published-oa">
          <span className="chronicle-kpi-label">Published Open Access</span>
          <span className="chronicle-kpi-value">{metrics.publishedOpenAccess}</span>
          <span className="chronicle-kpi-subtext">{metrics.crossrefDoisMinted} DOIs minted</span>
        </div>
      </section>

      {/* 3. Filters & Facet Controls */}
      <section className="chronicle-filters-container">
        <div className="chronicle-search-row">
          <div className="chronicle-search-input-wrapper">
            <span className="chronicle-search-icon" aria-hidden="true">🔍</span>
            <input
              type="text"
              className="chronicle-search-input"
              placeholder="Search by manuscript title, accession ID (KG-2026-CH-042), author, ORCID, institution…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              data-testid="chronicle-search-input"
            />
          </div>

          <select
            className="chronicle-select"
            value={domainFilter}
            onChange={e => setDomainFilter(e.target.value as ResearchDomain | 'all')}
            data-testid="domain-filter-select"
          >
            <option value="all">All Research Domains</option>
            <option value="biomechanics">Biomechanics & Kinematics</option>
            <option value="exercise_physiology">Exercise Physiology & Heat Stress</option>
            <option value="sports_medicine">Sports Medicine & Rehabilitation</option>
            <option value="talent_identification">Talent Identification & Somatotyping</option>
            <option value="sports_analytics">Tactical & Computer Vision Analytics</option>
            <option value="sports_nutrition">Sports Nutrition & Adaptogens</option>
            <option value="sports_psychology">Sports Psychology</option>
          </select>
        </div>

        <div className="chronicle-pills-row" role="tablist" aria-label="Status Filters">
          {(
            [
              { key: 'all', label: 'All Manuscripts' },
              { key: 'pending_screening', label: 'Needs Screening' },
              { key: 'under_screening', label: 'Under Screening' },
              { key: 'in_peer_review', label: 'In Peer Review' },
              { key: 'revision_requested', label: 'Revisions Pending' },
              { key: 'revision_submitted', label: 'Revisions Received' },
              { key: 'accepted', label: 'Ready to Publish' },
              { key: 'published', label: 'Published Open Access' },
            ] as const
          ).map(pill => {
            const count =
              pill.key === 'all'
                ? manuscripts.length
                : manuscripts.filter(m => m.status === pill.key).length
            return (
              <button
                key={pill.key}
                type="button"
                className={`chronicle-filter-pill ${statusFilter === pill.key ? 'active' : ''}`}
                onClick={() => setStatusFilter(pill.key)}
                data-testid={`filter-pill-${pill.key}`}
              >
                <span>{pill.label}</span>
                <span className="chronicle-pill-badge">{count}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* 4. Directory Table */}
      <section className="chronicle-table-card">
        <div className="chronicle-table-wrapper">
          <table className="chronicle-table">
            <thead>
              <tr>
                <th>Accession / Manuscript Title</th>
                <th>Author & Affiliation</th>
                <th>Automated Screening</th>
                <th>Peer Review Status</th>
                <th>Lifecycle Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>
                    Loading research manuscripts…
                  </td>
                </tr>
              ) : manuscripts.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    No manuscripts matched the selected filters.
                  </td>
                </tr>
              ) : (
                manuscripts.map(m => {
                  const primaryAuthor = m.authors.find(a => a.isCorresponding) || m.authors[0]
                  const assignedReviewersCount = m.reviewers.length
                  const submittedReviewsCount = m.reviewers.filter(r => r.invitationStatus === 'review_submitted').length

                  return (
                    <tr key={m.id} data-testid={`manuscript-row-${m.id}`}>
                      <td>
                        <div className="chronicle-title-cell">
                          <span className="chronicle-accession-tag">{m.accessionNumber}</span>
                          <button
                            type="button"
                            className="chronicle-manuscript-title"
                            style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left' }}
                            onClick={() => {
                              setSelectedManuscriptId(m.id)
                              setActiveDrawerTab('overview')
                            }}
                          >
                            {m.title}
                          </button>
                          <span className="chronicle-domain-tag">
                            {m.domain.replace('_', ' ').toUpperCase()} · {m.articleType.replace('_', ' ')}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="chronicle-authors-cell">
                          <span className="chronicle-author-primary">{primaryAuthor?.name}</span>
                          <span className="chronicle-author-affil">{primaryAuthor?.affiliation}</span>
                          {primaryAuthor?.orcid && (
                            <span className="chronicle-author-orcid">
                              ORCID: {primaryAuthor.orcid}
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <div className="chronicle-screening-cell">
                          <span
                            className={`chronicle-screening-badge chronicle-screening-${m.screening.plagiarismRisk}`}
                          >
                            {m.screening.plagiarismSimilarityPercent}% Similarity ({m.screening.plagiarismRisk})
                          </span>
                          <span className="chronicle-ethics-pill">
                            IEC: {m.screening.ethicsClearanceNumber}
                          </span>
                          {m.screening.minorConsentConfirmed && (
                            <span className="chronicle-ethics-pill" style={{ color: '#38bdf8' }}>
                              ✓ Minor Assent Declared
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <div>
                          {assignedReviewersCount === 0 ? (
                            <span style={{ color: '#64748b' }}>No reviewers assigned</span>
                          ) : (
                            <div>
                              <span style={{ fontWeight: 600, color: '#f1f5f9' }}>
                                {submittedReviewsCount} of {assignedReviewersCount} Reviews In
                              </span>
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                                {m.reviewers[0]?.blindMode === 'double_blind' ? 'Double-Blind' : 'Single-Blind'}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      <td>
                        <span className={`chronicle-status-badge chronicle-status-${m.status}`}>
                          {m.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="chronicle-actions-cell">
                        <div className="chronicle-action-btn-group">
                          <button
                            type="button"
                            className="chronicle-row-btn chronicle-row-btn-primary"
                            onClick={() => {
                              setSelectedManuscriptId(m.id)
                              setActiveDrawerTab('overview')
                            }}
                            data-testid={`inspect-btn-${m.id}`}
                          >
                            Inspect
                          </button>

                          {m.status === 'pending_screening' && (
                            <button
                              type="button"
                              className="chronicle-row-btn"
                              onClick={() => handleClaimScreening(m)}
                              data-testid={`claim-screening-btn-${m.id}`}
                            >
                              Claim Screening
                            </button>
                          )}

                          {m.status === 'under_screening' && (
                            <button
                              type="button"
                              className="chronicle-row-btn"
                              onClick={() => {
                                setSelectedManuscriptId(m.id)
                                setAssignReviewerModalOpen(true)
                              }}
                            >
                              Assign Reviewers
                            </button>
                          )}

                          {m.status === 'in_peer_review' && (
                            <button
                              type="button"
                              className="chronicle-row-btn"
                              onClick={() => {
                                setSelectedManuscriptId(m.id)
                                setRevisionModalOpen(true)
                              }}
                            >
                              Decide
                            </button>
                          )}

                          {m.status === 'revision_submitted' && (
                            <button
                              type="button"
                              className="chronicle-row-btn chronicle-btn-success"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                              onClick={() => handleAcceptManuscript(m)}
                            >
                              Accept
                            </button>
                          )}

                          {m.status === 'accepted' && (
                            <button
                              type="button"
                              className="chronicle-row-btn chronicle-btn-primary"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                              onClick={() => {
                                setSelectedManuscriptId(m.id)
                                setPublishModalOpen(true)
                              }}
                            >
                              Mint DOI & Publish
                            </button>
                          )}

                          {m.status === 'published' && m.publishing.doi && (
                            <a
                              href={`/khelchronicle/${m.publishing.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="chronicle-row-btn"
                              style={{ textDecoration: 'none' }}
                            >
                              View Public
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. Slide-over Inspection & Decision Drawer */}
      {activeManuscript && (
        <div className="chronicle-drawer-backdrop" onClick={() => setSelectedManuscriptId(null)}>
          <div
            className="chronicle-drawer"
            onClick={e => e.stopPropagation()}
            data-testid="manuscript-inspection-drawer"
          >
            {/* Drawer Header */}
            <header className="chronicle-drawer-header">
              <div className="chronicle-drawer-header-info">
                <span className="chronicle-accession-tag">{activeManuscript.accessionNumber}</span>
                <h2>{activeManuscript.title}</h2>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className={`chronicle-status-badge chronicle-status-${activeManuscript.status}`}>
                    {activeManuscript.status.replace(/_/g, ' ')}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Deposited {new Date(activeManuscript.submittedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="chronicle-close-btn"
                onClick={() => setSelectedManuscriptId(null)}
                aria-label="Close drawer"
              >
                ✕
              </button>
            </header>

            {/* Drawer Tabs Navigation */}
            <nav className="chronicle-drawer-tabs">
              <button
                type="button"
                className={`chronicle-drawer-tab ${activeDrawerTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveDrawerTab('overview')}
                data-testid="drawer-tab-overview"
              >
                Overview & Galley
              </button>
              <button
                type="button"
                className={`chronicle-drawer-tab ${activeDrawerTab === 'screening' ? 'active' : ''}`}
                onClick={() => setActiveDrawerTab('screening')}
                data-testid="drawer-tab-screening"
              >
                Screening & Ethics
              </button>
              <button
                type="button"
                className={`chronicle-drawer-tab ${activeDrawerTab === 'reviewers' ? 'active' : ''}`}
                onClick={() => setActiveDrawerTab('reviewers')}
                data-testid="drawer-tab-reviewers"
              >
                Peer Reviewers ({activeManuscript.reviewers.length})
              </button>
              <button
                type="button"
                className={`chronicle-drawer-tab ${activeDrawerTab === 'revisions' ? 'active' : ''}`}
                onClick={() => setActiveDrawerTab('revisions')}
                data-testid="drawer-tab-revisions"
              >
                Revisions ({activeManuscript.versions.length})
              </button>
              <button
                type="button"
                className={`chronicle-drawer-tab ${activeDrawerTab === 'publishing' ? 'active' : ''}`}
                onClick={() => setActiveDrawerTab('publishing')}
                data-testid="drawer-tab-publishing"
              >
                DOI & Publishing
              </button>
              <button
                type="button"
                className={`chronicle-drawer-tab ${activeDrawerTab === 'audit' ? 'active' : ''}`}
                onClick={() => setActiveDrawerTab('audit')}
                data-testid="drawer-tab-audit"
              >
                Audit Trail ({activeManuscript.auditTrail.length})
              </button>
            </nav>

            {/* Drawer Tab Body */}
            <div className="chronicle-drawer-body">
              {/* TAB 1: OVERVIEW */}
              {activeDrawerTab === 'overview' && (
                <>
                  <div className="chronicle-section-card">
                    <h3>Abstract</h3>
                    <p style={{ lineHeight: 1.6, color: '#cbd5e1', margin: 0, fontSize: '0.875rem' }}>
                      {activeManuscript.abstractText}
                    </p>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                      {activeManuscript.keywords.map(kw => (
                        <span key={kw} className="chronicle-domain-tag">
                          #{kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="chronicle-section-card">
                    <h3>Research Author Team</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {activeManuscript.authors.map(author => (
                        <div
                          key={author.email}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'rgba(0,0,0,0.2)',
                            padding: '0.625rem 0.875rem',
                            borderRadius: '0.375rem',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                              {author.name}{' '}
                              {author.isCorresponding && (
                                <span style={{ fontSize: '0.6875rem', color: '#38bdf8' }}>
                                  (Corresponding)
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                              {author.affiliation} · {author.email}
                            </div>
                          </div>
                          {author.orcid && (
                            <span className="chronicle-author-orcid">
                              ORCID: {author.orcid}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="chronicle-section-card">
                    <h3>Galley Document & Metadata</h3>
                    <div className="chronicle-grid-2col">
                      <div className="chronicle-meta-item">
                        <span className="chronicle-meta-label">Current Version</span>
                        <span className="chronicle-meta-value">{activeManuscript.currentVersion}</span>
                      </div>
                      <div className="chronicle-meta-item">
                        <span className="chronicle-meta-label">Word Count</span>
                        <span className="chronicle-meta-value">{activeManuscript.screening.wordCount} words</span>
                      </div>
                      <div className="chronicle-meta-item">
                        <span className="chronicle-meta-label">Assigned Editor</span>
                        <span className="chronicle-meta-value">
                          {activeManuscript.assignedEditor?.name || 'Unassigned'}
                        </span>
                      </div>
                      <div className="chronicle-meta-item">
                        <span className="chronicle-meta-label">License</span>
                        <span className="chronicle-meta-value">{activeManuscript.publishing.license}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <a
                        href={activeManuscript.versions[0]?.fileUrl || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="chronicle-btn chronicle-btn-secondary"
                        style={{ textDecoration: 'none' }}
                      >
                        Download PDF Galley ({activeManuscript.versions[0]?.fileSize})
                      </a>
                    </div>
                  </div>
                </>
              )}

              {/* TAB 2: SCREENING & COMPLIANCE */}
              {activeDrawerTab === 'screening' && (
                <>
                  <div className="chronicle-section-card">
                    <h3>Tier 1: Automated Screening Checks</h3>
                    <div className="chronicle-meter-container">
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                        <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Plagiarism Similarity Index</span>
                        <span style={{ fontWeight: 700, color: activeManuscript.screening.plagiarismRisk === 'clean' ? '#10b981' : '#f59e0b' }}>
                          {activeManuscript.screening.plagiarismSimilarityPercent}% ({activeManuscript.screening.plagiarismRisk.toUpperCase()})
                        </span>
                      </div>
                      <div className="chronicle-meter-bar">
                        <div
                          className={`chronicle-meter-fill ${activeManuscript.screening.plagiarismRisk}`}
                          style={{ width: `${Math.min(activeManuscript.screening.plagiarismSimilarityPercent * 4, 100)}%` }}
                        />
                      </div>
                      <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                        Cross-referenced against Crossref, SportRxiv, PubMed Central, and open preprints.
                      </span>
                    </div>

                    <div className="chronicle-grid-2col" style={{ marginTop: '0.5rem' }}>
                      <div className="chronicle-meta-item">
                        <span className="chronicle-meta-label">AI Disclosure</span>
                        <span className="chronicle-meta-value">
                          {activeManuscript.screening.aiDisclosureDeclared ? 'Declared' : 'No Generative AI Declared'}
                        </span>
                        {activeManuscript.screening.aiToolsUsed && (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            {activeManuscript.screening.aiToolsUsed}
                          </span>
                        )}
                      </div>
                      <div className="chronicle-meta-item">
                        <span className="chronicle-meta-label">File Integrity</span>
                        <span className="chronicle-meta-value">
                          {activeManuscript.screening.hasPdfGalley ? '✓ Valid PDF Galley Extracted' : 'Corrupted'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="chronicle-section-card">
                    <h3>Tier 2: Research Ethics & Open Science Compliance</h3>
                    <div className="chronicle-meta-item">
                      <span className="chronicle-meta-label">Institutional Ethics Protocol (IEC / IRB)</span>
                      <span className="chronicle-meta-value" style={{ fontFamily: 'monospace', color: '#38bdf8' }}>
                        {activeManuscript.screening.ethicsClearanceNumber}
                      </span>
                    </div>

                    <div className="chronicle-meta-item">
                      <span className="chronicle-meta-label">Minor Participant Informed Assent</span>
                      <span className="chronicle-meta-value">
                        {activeManuscript.screening.minorConsentConfirmed
                          ? '✓ Verified Signed Parental & Participant Assent'
                          : 'Not Applicable (Adult cohort or secondary data)'}
                      </span>
                    </div>

                    <div className="chronicle-meta-item">
                      <span className="chronicle-meta-label">Data Availability Statement</span>
                      <p style={{ margin: 0, fontSize: '0.8125rem', color: '#cbd5e1' }}>
                        {activeManuscript.screening.dataAvailabilityStatement}
                      </p>
                    </div>

                    <div className="chronicle-meta-item">
                      <span className="chronicle-meta-label">Funding & Competing Interests</span>
                      <p style={{ margin: 0, fontSize: '0.8125rem', color: '#94a3b8' }}>
                        {activeManuscript.screening.fundingStatement} | {activeManuscript.screening.conflictOfInterestStatement}
                      </p>
                    </div>

                    {/* Screening Action Buttons */}
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                      {activeManuscript.status === 'pending_screening' && (
                        <button
                          type="button"
                          className="chronicle-btn chronicle-btn-primary"
                          onClick={() => handleClaimScreening(activeManuscript)}
                        >
                          Pass Tier 1 & Claim Desk
                        </button>
                      )}
                      <button
                        type="button"
                        className="chronicle-btn chronicle-btn-secondary"
                        onClick={() => setScreeningModalOpen(true)}
                      >
                        Request Screening Corrections
                      </button>
                      <button
                        type="button"
                        className="chronicle-btn chronicle-btn-danger"
                        onClick={() => setRejectModalOpen(true)}
                      >
                        Desk Reject
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* TAB 3: REVIEWERS */}
              {activeDrawerTab === 'reviewers' && (
                <>
                  <div className="chronicle-section-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3>Assigned Double-Blind Referees</h3>
                      <button
                        type="button"
                        className="chronicle-btn chronicle-btn-primary"
                        onClick={() => setAssignReviewerModalOpen(true)}
                      >
                        + Assign Reviewer
                      </button>
                    </div>

                    {activeManuscript.reviewers.length === 0 ? (
                      <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.875rem' }}>
                        No referees currently assigned. Assign qualified sports scientists from the pre-approved pool.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {activeManuscript.reviewers.map(r => (
                          <div key={r.id} className="chronicle-reviewer-card">
                            <div className="chronicle-reviewer-header">
                              <div>
                                <div className="chronicle-reviewer-name">
                                  {r.reviewerName}{' '}
                                  <span style={{ fontSize: '0.6875rem', color: '#38bdf8' }}>
                                    ({r.blindMode === 'double_blind' ? 'Double-Blind Masked' : 'Single-Blind'})
                                  </span>
                                </div>
                                <div className="chronicle-reviewer-affil">
                                  {r.institution} · ORCID: {r.orcid}
                                </div>
                              </div>
                              <span
                                className={`chronicle-status-badge ${
                                  r.invitationStatus === 'review_submitted'
                                    ? 'chronicle-status-published'
                                    : 'chronicle-status-pending_screening'
                                }`}
                              >
                                {r.invitationStatus.replace('_', ' ')}
                              </span>
                            </div>

                            {r.scores && (
                              <div className="chronicle-scorecard-grid">
                                <div className="chronicle-score-box">
                                  <span className="chronicle-score-name">Methodology</span>
                                  <span className="chronicle-score-val">{r.scores.methodology}/5</span>
                                </div>
                                <div className="chronicle-score-box">
                                  <span className="chronicle-score-name">Originality</span>
                                  <span className="chronicle-score-val">{r.scores.originality}/5</span>
                                </div>
                                <div className="chronicle-score-box">
                                  <span className="chronicle-score-name">Data Rigour</span>
                                  <span className="chronicle-score-val">{r.scores.dataRigour}/5</span>
                                </div>
                                <div className="chronicle-score-box">
                                  <span className="chronicle-score-name">Clarity</span>
                                  <span className="chronicle-score-val">{r.scores.clarity}/5</span>
                                </div>
                              </div>
                            )}

                            {r.confidentialCommentsToEditor && (
                              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '0.25rem' }}>
                                <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#f59e0b' }}>
                                  CONFIDENTIAL TO EDITOR:
                                </span>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#cbd5e1' }}>
                                  {r.confidentialCommentsToEditor}
                                </p>
                              </div>
                            )}

                            {r.commentsForAuthor && (
                              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '0.25rem' }}>
                                <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#38bdf8' }}>
                                  COMMENTS FOR AUTHOR:
                                </span>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                                  {r.commentsForAuthor}
                                </p>
                              </div>
                            )}

                            {r.invitationStatus !== 'review_submitted' && (
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <button
                                  type="button"
                                  className="chronicle-row-btn"
                                  onClick={() => handleQuickSubmitReview(activeManuscript.id, r.id)}
                                >
                                  Submit Sample Referee Report
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {activeManuscript.reviewers.some(r => r.invitationStatus === 'review_submitted') && (
                    <div className="chronicle-section-card">
                      <h3>Editorial Board Decision</h3>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                          type="button"
                          className="chronicle-btn chronicle-btn-success"
                          onClick={() => handleAcceptManuscript(activeManuscript)}
                        >
                          Accept for Publication
                        </button>
                        <button
                          type="button"
                          className="chronicle-btn chronicle-btn-secondary"
                          onClick={() => setRevisionModalOpen(true)}
                        >
                          Request Revisions (Minor/Major)
                        </button>
                        <button
                          type="button"
                          className="chronicle-btn chronicle-btn-danger"
                          onClick={() => setRejectModalOpen(true)}
                        >
                          Decline Manuscript
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* TAB 4: REVISIONS */}
              {activeDrawerTab === 'revisions' && (
                <>
                  <div className="chronicle-section-card">
                    <h3>Manuscript Version History</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {activeManuscript.versions.map(v => (
                        <div
                          key={v.versionNumber}
                          style={{
                            background: 'rgba(0,0,0,0.25)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '0.5rem',
                            padding: '1rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#38bdf8' }}>
                              Version {v.versionNumber}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                              Deposited {new Date(v.submittedAt).toLocaleString()}
                            </span>
                          </div>

                          {v.changesSummary && (
                            <p style={{ margin: '0.5rem 0', fontSize: '0.8125rem', color: '#e2e8f0' }}>
                              <strong>Changes:</strong> {v.changesSummary}
                            </p>
                          )}

                          {v.rebuttalLetter && (
                            <div className="chronicle-rebuttal-box" style={{ marginTop: '0.75rem' }}>
                              <span style={{ fontWeight: 600, color: '#38bdf8', display: 'block', marginBottom: '0.35rem' }}>
                                Author Point-by-Point Rebuttal:
                              </span>
                              {v.rebuttalLetter}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* TAB 5: PUBLISHING & DOI */}
              {activeDrawerTab === 'publishing' && (
                <>
                  <div className="chronicle-section-card">
                    <h3>Crossref DOI & Open Access Minting</h3>
                    {activeManuscript.publishing.doi ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div className="chronicle-meta-item">
                          <span className="chronicle-meta-label">Persistent Crossref DOI</span>
                          <span className="chronicle-meta-value" style={{ fontFamily: 'monospace', color: '#38bdf8' }}>
                            {activeManuscript.publishing.doi}
                          </span>
                        </div>
                        <div className="chronicle-meta-item">
                          <span className="chronicle-meta-label">Open Access License</span>
                          <span className="chronicle-meta-value">
                            Creative Commons Attribution 4.0 International ({activeManuscript.publishing.license})
                          </span>
                        </div>
                        <div className="chronicle-meta-item">
                          <span className="chronicle-meta-label">Published Timestamp</span>
                          <span className="chronicle-meta-value">
                            {activeManuscript.publishing.publishedAt ? new Date(activeManuscript.publishing.publishedAt).toLocaleString() : 'N/A'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                          <a
                            href={`/khelchronicle/${activeManuscript.publishing.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="chronicle-btn chronicle-btn-primary"
                            style={{ textDecoration: 'none' }}
                          >
                            Open Public Preprint Page
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <p style={{ color: '#cbd5e1', margin: 0, fontSize: '0.875rem' }}>
                          This manuscript has satisfied editorial review. Mint persistent Crossref DOI and publish to the live open-access catalog.
                        </p>
                        <button
                          type="button"
                          className="chronicle-btn chronicle-btn-success"
                          style={{ alignSelf: 'flex-start' }}
                          onClick={() => setPublishModalOpen(true)}
                        >
                          Mint Crossref DOI & Publish
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* TAB 6: AUDIT TRAIL */}
              {activeDrawerTab === 'audit' && (
                <>
                  <div className="chronicle-section-card">
                    <h3>Confidential Editorial Notes</h3>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        className="chronicle-search-input"
                        placeholder="Add confidential internal note for the editorial board…"
                        value={newInternalNote}
                        onChange={e => setNewInternalNote(e.target.value)}
                      />
                      <button
                        type="button"
                        className="chronicle-btn chronicle-btn-secondary"
                        onClick={handleAddInternalNote}
                      >
                        Add Note
                      </button>
                    </div>

                    {activeManuscript.internalNotes.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                        {activeManuscript.internalNotes.map(n => (
                          <div
                            key={n}
                            style={{
                              background: 'rgba(0,0,0,0.3)',
                              padding: '0.5rem 0.75rem',
                              borderRadius: '0.375rem',
                              fontSize: '0.8125rem',
                              color: '#cbd5e1',
                            }}
                          >
                            {n}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="chronicle-section-card">
                    <h3>Editorial Decision History</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {activeManuscript.auditTrail.map(entry => (
                        <div
                          key={entry.id}
                          style={{
                            borderLeft: '2px solid #38bdf8',
                            paddingLeft: '0.75rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.2rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                            <span style={{ fontWeight: 600, color: '#f8fafc' }}>{entry.action}</span>
                            <span style={{ color: '#64748b' }}>
                              {new Date(entry.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>
                            Operator: {entry.editorName} ({entry.editorEmail})
                          </span>
                          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#94a3b8' }}>
                            {entry.notes}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Screening Decision */}
      {screeningModalOpen && (
        <div className="chronicle-modal-backdrop" onClick={() => setScreeningModalOpen(false)}>
          <div className="chronicle-modal-card" onClick={e => e.stopPropagation()}>
            <header className="chronicle-modal-header">
              <h3>Request Screening Corrections</h3>
              <button
                type="button"
                className="chronicle-close-btn"
                onClick={() => setScreeningModalOpen(false)}
              >
                ✕
              </button>
            </header>
            <div className="chronicle-modal-body">
              <div className="chronicle-presets-list">
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>
                  Standard COPE/STORK Presets:
                </span>
                {SCREENING_REVISION_PRESETS.map(preset => (
                  <div
                    key={preset.id}
                    className="chronicle-preset-item"
                    onClick={() => {
                      setScreeningReason(preset.title)
                      setScreeningNotes(preset.notes)
                    }}
                  >
                    <div className="chronicle-preset-title">{preset.title}</div>
                    <div className="chronicle-preset-desc">{preset.notes}</div>
                  </div>
                ))}
              </div>

              <div className="chronicle-field">
                <label>Correction Subject</label>
                <input
                  type="text"
                  value={screeningReason}
                  onChange={e => setScreeningReason(e.target.value)}
                  placeholder="e.g. Missing Institutional Ethics Approval"
                />
              </div>

              <div className="chronicle-field">
                <label>Editorial Instructions for Author</label>
                <textarea
                  rows={4}
                  value={screeningNotes}
                  onChange={e => setScreeningNotes(e.target.value)}
                  placeholder="Provide precise instructions on required documentation…"
                />
              </div>
            </div>
            <footer className="chronicle-modal-footer">
              <button
                type="button"
                className="chronicle-btn chronicle-btn-secondary"
                onClick={() => setScreeningModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="chronicle-btn chronicle-btn-primary"
                onClick={handleRequestScreeningCorrection}
              >
                Send Request to Author
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* MODAL 2: Assign Reviewer */}
      {assignReviewerModalOpen && (
        <div className="chronicle-modal-backdrop" onClick={() => setAssignReviewerModalOpen(false)}>
          <div className="chronicle-modal-card" onClick={e => e.stopPropagation()}>
            <header className="chronicle-modal-header">
              <h3>Assign Double-Blind Referee</h3>
              <button
                type="button"
                className="chronicle-close-btn"
                onClick={() => setAssignReviewerModalOpen(false)}
              >
                ✕
              </button>
            </header>
            <div className="chronicle-modal-body">
              <div className="chronicle-field">
                <label>Select Reviewer from Vetted Sports Science Pool</label>
                <select
                  value={selectedReviewerId}
                  onChange={e => setSelectedReviewerId(e.target.value)}
                >
                  <option value="">-- Choose Reviewer --</option>
                  {PRE_APPROVED_REVIEWERS_POOL.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.institution}) · {r.domains.join(', ')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="chronicle-field">
                <label>Review Anonymity Protocol</label>
                <select
                  value={blindMode}
                  onChange={e => setBlindMode(e.target.value as 'double_blind' | 'single_blind')}
                >
                  <option value="double_blind">Double-Blind (Author & Reviewer Identifies Masked)</option>
                  <option value="single_blind">Single-Blind (Reviewer Sees Author)</option>
                </select>
              </div>

              <div className="chronicle-field">
                <label>Review Turnaround SLA</label>
                <select
                  value={reviewDueDays}
                  onChange={e => setReviewDueDays(Number(e.target.value))}
                >
                  <option value={7}>7 Days (Expedited)</option>
                  <option value={10}>10 Days (Standard STORK SLA)</option>
                  <option value={14}>14 Days (Extended)</option>
                </select>
              </div>
            </div>
            <footer className="chronicle-modal-footer">
              <button
                type="button"
                className="chronicle-btn chronicle-btn-secondary"
                onClick={() => setAssignReviewerModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="chronicle-btn chronicle-btn-primary"
                onClick={handleAssignReviewer}
                disabled={!selectedReviewerId}
              >
                Dispatch Invitation
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* MODAL 3: Issue Revision Decision */}
      {revisionModalOpen && (
        <div className="chronicle-modal-backdrop" onClick={() => setRevisionModalOpen(false)}>
          <div className="chronicle-modal-card" onClick={e => e.stopPropagation()}>
            <header className="chronicle-modal-header">
              <h3>Issue Peer Review Decision</h3>
              <button
                type="button"
                className="chronicle-close-btn"
                onClick={() => setRevisionModalOpen(false)}
              >
                ✕
              </button>
            </header>
            <div className="chronicle-modal-body">
              <div className="chronicle-presets-list">
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>
                  Decision Templates:
                </span>
                {PEER_REVIEW_DECISION_PRESETS.map(preset => (
                  <div
                    key={preset.id}
                    className="chronicle-preset-item"
                    onClick={() => {
                      setRevisionDecisionTitle(preset.title)
                      setRevisionEditorialLetter(preset.notes)
                      if (preset.recommendation === 'minor_revision' || preset.recommendation === 'major_revision') {
                        setRevisionRecommendation(preset.recommendation)
                      }
                    }}
                  >
                    <div className="chronicle-preset-title">{preset.title}</div>
                    <div className="chronicle-preset-desc">{preset.notes}</div>
                  </div>
                ))}
              </div>

              <div className="chronicle-field">
                <label>Decision Type</label>
                <select
                  value={revisionRecommendation}
                  onChange={e => setRevisionRecommendation(e.target.value as 'minor_revision' | 'major_revision')}
                >
                  <option value="minor_revision">Minor Revisions Required</option>
                  <option value="major_revision">Major Revisions Required</option>
                </select>
              </div>

              <div className="chronicle-field">
                <label>Decision Title</label>
                <input
                  type="text"
                  value={revisionDecisionTitle}
                  onChange={e => setRevisionDecisionTitle(e.target.value)}
                  placeholder="e.g. Statistical Clarifications & Table 4 Stratification"
                />
              </div>

              <div className="chronicle-field">
                <label>Editorial Letter to Author</label>
                <textarea
                  rows={4}
                  value={revisionEditorialLetter}
                  onChange={e => setRevisionEditorialLetter(e.target.value)}
                  placeholder="Detail point-by-point reviewer requirements…"
                />
              </div>

              <div className="chronicle-field">
                <label>Revision Submission Deadline</label>
                <select
                  value={revisionDueDays}
                  onChange={e => setRevisionDueDays(Number(e.target.value))}
                >
                  <option value={7}>7 Days (Minor revisions)</option>
                  <option value={14}>14 Days (Standard)</option>
                  <option value={28}>28 Days (Major experimental re-analysis)</option>
                </select>
              </div>
            </div>
            <footer className="chronicle-modal-footer">
              <button
                type="button"
                className="chronicle-btn chronicle-btn-secondary"
                onClick={() => setRevisionModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="chronicle-btn chronicle-btn-primary"
                onClick={handleRequestRevision}
              >
                Issue Decision to Author
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* MODAL 4: Mint DOI & Publish */}
      {publishModalOpen && (
        <div className="chronicle-modal-backdrop" onClick={() => setPublishModalOpen(false)}>
          <div className="chronicle-modal-card" onClick={e => e.stopPropagation()}>
            <header className="chronicle-modal-header">
              <h3>Mint Crossref DOI & Publish Open Access</h3>
              <button
                type="button"
                className="chronicle-close-btn"
                onClick={() => setPublishModalOpen(false)}
              >
                ✕
              </button>
            </header>
            <div className="chronicle-modal-body">
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#cbd5e1' }}>
                You are about to mint an authoritative persistent Crossref DOI identifier and register this manuscript in the permanent KhelChronicle open-access archive.
              </p>

              <div className="chronicle-field">
                <label>Open Access License</label>
                <select
                  value={publishLicense}
                  onChange={e => setPublishLicense(e.target.value as OpenAccessLicenseType)}
                >
                  <option value="CC-BY-4.0">Creative Commons Attribution 4.0 International (CC-BY-4.0)</option>
                  <option value="CC-BY-NC-ND-4.0">Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 (CC-BY-NC-ND-4.0)</option>
                </select>
              </div>

              <div className="chronicle-field">
                <label>DOI Suffix Customization (Optional)</label>
                <input
                  type="text"
                  placeholder="Defaults to accession number (e.g. 042)"
                  value={publishDoiSuffix}
                  onChange={e => setPublishDoiSuffix(e.target.value)}
                />
              </div>

              <div className="chronicle-field">
                <label>Publication Release Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional archival notes…"
                  value={publishNotes}
                  onChange={e => setPublishNotes(e.target.value)}
                />
              </div>
            </div>
            <footer className="chronicle-modal-footer">
              <button
                type="button"
                className="chronicle-btn chronicle-btn-secondary"
                onClick={() => setPublishModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="chronicle-btn chronicle-btn-success"
                onClick={handleMintDoiAndPublish}
              >
                Confirm & Mint DOI
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* MODAL 5: Reject Manuscript */}
      {rejectModalOpen && (
        <div className="chronicle-modal-backdrop" onClick={() => setRejectModalOpen(false)}>
          <div className="chronicle-modal-card" onClick={e => e.stopPropagation()}>
            <header className="chronicle-modal-header">
              <h3>Decline Manuscript</h3>
              <button
                type="button"
                className="chronicle-close-btn"
                onClick={() => setRejectModalOpen(false)}
              >
                ✕
              </button>
            </header>
            <div className="chronicle-modal-body">
              <div className="chronicle-field">
                <label>Rejection Primary Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Out of Scope / Unresolved Methodological Confounders"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                />
              </div>

              <div className="chronicle-field">
                <label>Formal Editorial Decision Letter</label>
                <textarea
                  rows={4}
                  placeholder="Provide detailed justification explaining why the manuscript cannot be accepted…"
                  value={rejectLetter}
                  onChange={e => setRejectLetter(e.target.value)}
                />
              </div>
            </div>
            <footer className="chronicle-modal-footer">
              <button
                type="button"
                className="chronicle-btn chronicle-btn-secondary"
                onClick={() => setRejectModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="chronicle-btn chronicle-btn-danger"
                onClick={handleRejectManuscript}
              >
                Confirm Rejection
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="chronicle-toast" role="status">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
