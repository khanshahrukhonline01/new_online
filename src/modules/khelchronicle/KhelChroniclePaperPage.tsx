import { useState, useMemo, useEffect, type MouseEvent, type FormEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import {
  generateCitations,
  generateRisCitation,
  getPaperComments,
  getRelatedPapers,
  RESEARCH_PAPERS,
  type ResearchPaper,
  type PaperComment,
} from './data/khelchronicleData'
import {
  getChroniclePaperBySlug,
  recordPaperView,
  recordPaperDownload,
  getChroniclePaperComments,
  addChroniclePaperComment,
  voteChronicleCommentHelpful,
} from '../../integrations/supabase/chronicle-client'
import { AcademicDataChart } from './components/AcademicDataChart'
import { AcademicGalleyModal } from './components/AcademicGalleyModal'
import { NormativeBenchmarkCalculator } from './components/NormativeBenchmarkCalculator'
import './khelchronicle.css'

interface KhelChroniclePaperPageProps {
  slug: string
  initialPaper?: ResearchPaper
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

export function KhelChroniclePaperPage({ slug, initialPaper, onNavigate }: KhelChroniclePaperPageProps) {
  const [paper, setPaper] = useState<ResearchPaper | null | undefined>(initialPaper ?? undefined)

  useEffect(() => {
    if (initialPaper) return
    let active = true
    setPaper(undefined)
    getChroniclePaperBySlug(slug).then(result => {
      if (active) setPaper(result.data)
    })
    return () => {
      active = false
    }
  }, [slug, initialPaper])

  useEffect(() => {
    if (paper) {
      recordPaperView(paper.slug)
    }
  }, [paper])

  const [citationModalOpen, setCitationModalOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [galleyModalOpen, setGalleyModalOpen] = useState(false)
  const [versionModalOpen, setVersionModalOpen] = useState(false)
  const [citationFormat, setCitationFormat] = useState<'apa' | 'bibtex' | 'mla' | 'chicago' | 'vancouver' | 'harvard'>('apa')
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [doiCopied, setDoiCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [takeawaysLang, setTakeawaysLang] = useState<'en' | 'hi'>('en')
  const [chartViewModes, setChartViewModes] = useState<Record<number, 'table' | 'chart'>>({})

  // Comments & Community Peer Feedback state
  const [comments, setComments] = useState<PaperComment[]>(() => {
    return paper ? getPaperComments(paper.slug) : []
  })
  const [commentAuthor, setCommentAuthor] = useState('')
  const [commentAffiliation, setCommentAffiliation] = useState('')
  const [commentRole, setCommentRole] = useState('')
  const [commentOrcid, setCommentOrcid] = useState('')
  const [commentType, setCommentType] = useState<'peer_review' | 'methodological_query' | 'replication_note' | 'general'>('peer_review')
  const [commentCompetingInterests, setCommentCompetingInterests] = useState('')
  const [commentContent, setCommentContent] = useState('')
  const [commentFeedback, setCommentFeedback] = useState<string | null>(null)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [commentFilter, setCommentFilter] = useState<'all' | 'peer_review' | 'methodological_query' | 'replication_note' | 'general'>('all')
  const [votedCommentIds, setVotedCommentIds] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = localStorage.getItem('kc_voted_comments')
        return raw ? new Set(JSON.parse(raw)) : new Set()
      } catch {
        return new Set()
      }
    }
    return new Set()
  })

  // Synchronize comments from database / localStorage
  useEffect(() => {
    if (paper) {
      let isMounted = true
      getChroniclePaperComments(paper.slug)
        .then(dbComments => {
          if (isMounted && dbComments && dbComments.length > 0) {
            setComments(dbComments)
          }
        })
        .catch(() => {
          // Graceful fallback to initial seed comments
        })
      return () => {
        isMounted = false
      }
    }
  }, [paper])

  const toggleViewMode = (sectionIdx: number, mode: 'table' | 'chart') => {
    setChartViewModes(prev => ({
      ...prev,
      [sectionIdx]: mode,
    }))
  }

  const handleLink = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (onNavigate) {
      onNavigate(e, href)
    }
  }

  const citations = useMemo(() => {
    if (!paper) return { apa: '', bibtex: '', mla: '', chicago: '', vancouver: '', harvard: '' }
    return generateCitations(paper)
  }, [paper])

  const relatedPapers = useMemo(() => {
    if (!paper) return []
    return getRelatedPapers(paper, 3)
  }, [paper])

  const doi = paper?.doi || `10.51224/khelchronicle.2026.${paper?.paperId?.replace(/[^0-9]/g, '').padStart(3, '0') || '001'}`
  const permanentUrl = `https://www.khelgrid.com/khelchronicle/${paper?.slug || ''}`

  const copyDoi = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`https://doi.org/${doi}`)
      setDoiCopied(true)
      setTimeout(() => setDoiCopied(false), 2000)
    }
  }

  const copyPermanentLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(permanentUrl)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }
  }

  const copyCitation = () => {
    const textToCopy = citations[citationFormat]
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy)
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    }
  }

  const handlePrintPdf = () => {
    if (paper) {
      recordPaperDownload(paper.slug)
    }
    if (typeof window !== 'undefined') {
      window.print()
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
    if (!paper) return
    downloadFile(citations.bibtex, `${paper.paperId}.bib`, 'application/x-bibtex')
  }

  const handleDownloadRis = () => {
    if (!paper) return
    const ris = generateRisCitation(paper)
    downloadFile(ris, `${paper.paperId}.ris`, 'application/x-research-info-systems')
  }

  // Inject international academic Google Scholar & Dublin Core meta tags
  useEffect(() => {
    if (!paper || typeof document === 'undefined') return

    const metaTags: HTMLMetaElement[] = []

    const addMeta = (name: string, content: string) => {
      if (!content) return
      const el = document.createElement('meta')
      el.setAttribute('name', name)
      el.setAttribute('content', content)
      document.head.appendChild(el)
      metaTags.push(el)
    }

    // Google Scholar & Highwire Press meta tags
    addMeta('citation_title', paper.title)
    paper.authors.forEach(auth => {
      addMeta('citation_author', auth.name)
      if (auth.affiliation) addMeta('citation_author_institution', auth.affiliation)
    })
    addMeta('citation_publication_date', paper.datePublished.replace(/-/g, '/'))
    addMeta('citation_doi', doi)
    addMeta('citation_technical_report_number', paper.paperId)
    addMeta('citation_pdf_url', `https://www.khelgrid.com/khelchronicle/${paper.slug}.pdf`)
    addMeta('citation_publisher', 'KhelChronicle Open Sports Research Archive')

    // Dublin Core meta tags
    addMeta('DC.title', paper.title)
    if (paper.authors.length > 0) {
      addMeta('DC.creator', paper.authors.map(a => a.name).join('; '))
    }
    addMeta('DC.date', paper.datePublished)
    addMeta('DC.identifier', `https://doi.org/${doi}`)
    addMeta('DC.publisher', 'KhelChronicle / SportRxiv India')
    addMeta('DC.type', 'Preprint')

    return () => {
      metaTags.forEach(el => {
        if (el.parentNode) {
          el.parentNode.removeChild(el)
        }
      })
    }
  }, [paper, doi])

  const handleVoteHelpful = async (commentId: string) => {
    if (!paper || votedCommentIds.has(commentId)) return

    const nextVoted = new Set(votedCommentIds)
    nextVoted.add(commentId)
    setVotedCommentIds(nextVoted)
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem('kc_voted_comments', JSON.stringify(Array.from(nextVoted)))
      } catch {
        // ignore storage error
      }
    }

    // Optimistically update helpful count
    setComments(prev =>
      prev.map(c => (c.id === commentId ? { ...c, helpfulCount: (c.helpfulCount || 0) + 1 } : c))
    )

    try {
      const res = await voteChronicleCommentHelpful(commentId, paper.slug)
      setComments(prev =>
        prev.map(c => (c.id === commentId ? { ...c, helpfulCount: res.helpfulCount } : c))
      )
    } catch {
      // optimistic update is retained
    }
  }

  const handleCommentSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!paper) return
    if (!commentAuthor.trim() || !commentContent.trim() || !commentAffiliation.trim()) {
      setCommentFeedback('Please fill out your name, affiliation, and comment.')
      return
    }

    setIsSubmittingComment(true)
    try {
      const added = await addChroniclePaperComment(paper.slug, {
        author: commentAuthor.trim(),
        affiliation: commentAffiliation.trim(),
        role: commentRole.trim() || 'Sports Science Researcher',
        orcid: commentOrcid.trim() || undefined,
        commentType,
        competingInterests: commentCompetingInterests.trim() || 'None declared',
        content: commentContent.trim(),
      })

      setComments(prev => [added, ...prev.filter(c => c.id !== added.id)])
      setCommentAuthor('')
      setCommentAffiliation('')
      setCommentRole('')
      setCommentOrcid('')
      setCommentCompetingInterests('')
      setCommentContent('')
      setCommentFeedback('Your peer feedback has been saved and published.')
      setTimeout(() => setCommentFeedback(null), 4000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not save comment. Please try again.'
      setCommentFeedback(msg)
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const filteredComments = useMemo(() => {
    if (commentFilter === 'all') return comments
    return comments.filter(c => c.commentType === commentFilter)
  }, [comments, commentFilter])

  const commentTypeCounts = useMemo(() => {
    return {
      all: comments.length,
      peer_review: comments.filter(c => c.commentType === 'peer_review').length,
      methodological_query: comments.filter(c => c.commentType === 'methodological_query').length,
      replication_note: comments.filter(c => c.commentType === 'replication_note').length,
      general: comments.filter(c => !c.commentType || c.commentType === 'general').length,
    }
  }, [comments])

  const scholarlySchema = useMemo(() => {
    if (!paper) return {}
    const paperUrl = `https://www.khelgrid.com/khelchronicle/${paper.slug}`

    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'ScholarlyArticle',
          '@id': `${paperUrl}#article`,
          headline: paper.title,
          name: paper.title,
          identifier: paper.paperId,
          url: paperUrl,
          datePublished: paper.datePublished,
          dateModified: paper.dateModified || paper.datePublished,
          version: paper.version,
          license: paper.license || 'https://creativecommons.org/licenses/by/4.0/',
          sameAs: `https://doi.org/${doi}`,
          author: paper.authors.map(a => ({
            '@type': 'Person',
            name: a.name,
            affiliation: {
              '@type': 'Organization',
              name: a.affiliation,
            },
          })),
          publisher: {
            '@type': 'Organization',
            name: 'KhelChronicle Open Sports Research Archive (SportRxiv India)',
            logo: 'https://www.khelgrid.com/assets/kg-logo.webp',
          },
          description: paper.abstract.background,
          keywords: paper.keywords.join(', '),
        },
        {
          '@type': 'BreadcrumbList',
          '@id': `${paperUrl}#breadcrumb`,
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: 'https://khelgrid.com',
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'KhelChronicle',
              item: 'https://khelgrid.com/khelchronicle',
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: paper.categoryName,
              item: `https://khelgrid.com/khelchronicle/category/${paper.category}`,
            },
            {
              '@type': 'ListItem',
              position: 4,
              name: paper.title,
              item: paperUrl,
            },
          ],
        },
      ],
    }
  }, [paper, doi])

  if (paper === undefined) {
    return (
      <div className="kc-root" style={{ padding: '48px 16px', textAlign: 'center' }}>
        <h2>Checking manuscript publication status…</h2>
        <p>Only complete manuscripts approved for public release can be opened.</p>
      </div>
    )
  }

  if (paper === null) {
    return (
      <div className="kc-root" style={{ padding: '48px 16px', textAlign: 'center' }}>
        <h2>Research Paper Not Found</h2>
        <p>The manuscript identifier or slug does not exist in the KhelChronicle repository.</p>
        <a href="/khelchronicle" onClick={e => handleLink(e, '/khelchronicle')} className="kc-btn-primary">
          Back to Research Repository
        </a>
      </div>
    )
  }

  return (
    <div className="kc-root">
      {/* Print-Only Academic Journal Header */}
      <aside className="kc-print-only-header" aria-hidden="true">
        <div className="kc-print-branding">
          <div className="kc-print-logo-row">
            <span className="kc-print-journal-name">KHELCHRONICLE OPEN SPORTS RESEARCH ARCHIVE</span>
            <span className="kc-print-badge">Diamond Open Access · {paper.license || 'CC BY 4.0'}</span>
          </div>
          <div className="kc-print-meta-row">
            <span><strong>Preprint Accession:</strong> {paper.paperId}</span>
            <span><strong>DOI:</strong> 10.51224/khelchronicle.{paper.datePublished.slice(0, 4)}.{paper.paperId}</span>
            <span><strong>Published:</strong> {paper.datePublished}</span>
            <span><strong>Version:</strong> {paper.version}</span>
            <span><strong>Discipline:</strong> {paper.categoryName}</span>
            {paper.sport && <span><strong>Sport:</strong> {paper.sport}</span>}
          </div>
          <div className="kc-print-url">
            <strong>Permanent Repository URL:</strong> https://www.khelgrid.com/khelchronicle/{paper.slug}
          </div>
        </div>
      </aside>

      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(scholarlySchema) }}
      />

      <div className="kc-reader-container">
        {/* Navigation Breadcrumbs */}
        <nav style={{ padding: '16px 0 8px', fontSize: '13px', color: '#64748b' }} aria-label="Breadcrumb">
          <a href="/khelchronicle" onClick={e => handleLink(e, '/khelchronicle')} style={{ color: '#0f172a', textDecoration: 'none' }}>
            KhelChronicle / SportRxiv
          </a>
          <span> / </span>
          <a href={`/khelchronicle/${paper.category}`} onClick={e => handleLink(e, `/khelchronicle/${paper.category}`)} style={{ color: '#0f172a', textDecoration: 'none' }}>
            {paper.categoryName}
          </a>
          <span> / </span>
          <span style={{ color: '#64748b' }}>{paper.paperId}</span>
        </nav>

        {/* SportRxiv Persistent DOI & Citation Banner */}
        <section className="kc-doi-banner" aria-label="Crossref Digital Object Identifier">
          <div className="kc-doi-info">
            <span className="kc-doi-label">DOI</span>
            <a href={`https://doi.org/${doi}`} target="_blank" rel="noopener noreferrer" className="kc-doi-link">
              https://doi.org/{doi}
            </a>
          </div>
          <div className="kc-doi-actions">
            <button
              type="button"
              className="kc-doi-copy-btn"
              onClick={copyDoi}
              title="Copy Crossref DOI link"
              aria-label="Copy persistent DOI link"
            >
              <SiteIcon name="copy" size={13} />
              <span>{doiCopied ? 'DOI Copied!' : 'Copy DOI'}</span>
            </button>
            <button
              type="button"
              className="kc-doi-copy-btn"
              onClick={copyPermanentLink}
              title="Copy Permanent Repository URL"
              aria-label="Copy permanent repository link"
            >
              <SiteIcon name="share" size={13} />
              <span>{linkCopied ? 'Link Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </section>

        {/* International Standard: Version of Record (VoR) Journal Publication Banner */}
        {paper.peerReviewStatus?.status === 'published_vor' && (
          <section className="kc-vor-banner" aria-label="Version of Record Journal Publication">
            <div className="kc-vor-badge">
              <SiteIcon name="award" size={16} />
              <span>PEER-REVIEWED VERSION OF RECORD (VoR) PUBLISHED</span>
            </div>
            <div className="kc-vor-content">
              <p>
                This preprint has completed formal journal peer review and has been published in{' '}
                <strong>{paper.peerReviewStatus.journalName || 'Peer-Reviewed Scholarly Journal'}</strong>.
                Scholars and practitioners are advised to cite the Version of Record.
              </p>
              {paper.peerReviewStatus.journalDoi && (
                <div className="kc-vor-doi" style={{ marginTop: '6px' }}>
                  <span>Journal DOI: </span>
                  <a
                    href={paper.peerReviewStatus.journalUrl || `https://doi.org/${paper.peerReviewStatus.journalDoi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    https://doi.org/{paper.peerReviewStatus.journalDoi} →
                  </a>
                </div>
              )}
            </div>
          </section>
        )}

        {/* SportRxiv Status & Version Notice */}
        <div className="kc-preprint-alert" role="status">
          <SiteIcon name="alert-triangle" size={18} className="kc-alert-icon" />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <strong>
                {paper.peerReviewStatus?.status === 'published_vor'
                  ? `Preprint Archive Copy (${paper.version}) · Version of Record Published`
                  : `Preprint — Not Yet Peer-Reviewed (${paper.version}) · KhelChronicle Open Sports Archive`}
              </strong>
              {paper.peerReviewStatus && (
                <span className="kc-status-track-badge">
                  {paper.peerReviewStatus.statusLabel}
                </span>
              )}
            </div>
            <p style={{ margin: '4px 0 0' }}>
              Notice: This manuscript is a preliminary preprint that has not yet been certified by formal peer review and
              should not be used to guide clinical or medical practice. It has undergone initial moderation screening for
              sports science scope, participant ethics, and author legitimacy.
            </p>
          </div>
        </div>

        {/* Paper Header */}
        <header className="kc-reader-header">
          <div className="kc-paper-top-meta" style={{ marginBottom: '14px' }}>
            <span className="kc-paper-id-tag">{paper.paperId}</span>
            <span className="kc-paper-ver-tag">{paper.version}</span>
            <button
              type="button"
              className="kc-version-history-btn"
              onClick={() => setVersionModalOpen(true)}
              title="View complete revision changelog"
              aria-label={`View revision history, current version ${paper.version}`}
            >
              <SiteIcon name="clock" size={12} />
              <span>Revisions ({paper.versions?.length || 1})</span>
            </button>
            {paper.sport && (
              <span className="kc-paper-sport-tag">
                {paper.sport}
              </span>
            )}
            <span className="kc-paper-category-tag">{paper.categoryName}</span>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
              Published manuscript
            </span>
            {paper.methodologyLabel && (
              <span className="kc-paper-method-tag">
                {paper.methodologyLabel}
              </span>
            )}
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: '#dcfce7', color: '#15803d' }}>
              {paper.license ? `Diamond Open Access · ${paper.license}` : 'Diamond Open Access · CC BY 4.0'}
            </span>
            <span className="kc-paper-date">Published {paper.datePublished}</span>
          </div>

          <h1 className="kc-reader-title kc-serif-title">{paper.title}</h1>
          {paper.subtitle && <p className="kc-reader-subtitle">{paper.subtitle}</p>}

          {/* Authors List Box with Affiliations & ORCID */}
          <div className="kc-reader-authors-box">
            {paper.authors.map(auth => (
              <div key={auth.id} className="kc-author-entry">
                <a
                  href={`/khelchronicle/author/${auth.slug}`}
                  onClick={e => handleLink(e, `/khelchronicle/author/${auth.slug}`)}
                  className="kc-author-name"
                >
                  {auth.name}
                </a>
                <span className="kc-author-affil">— {auth.affiliation}</span>
                {auth.orcid && (
                  <a
                    href={`https://orcid.org/${auth.orcid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="kc-author-orcid"
                    title={`ORCID Researcher Record: ${auth.orcid}`}
                  >
                    <span>iD</span>
                    <span>{auth.orcid}</span>
                  </a>
                )}
              </div>
            ))}
          </div>

          {/* STORK / Open Science Badges Bar */}
          <div className="kc-open-science-badges-strip" role="group" aria-label="Open Science and Transparency Badges">
            <span className="kc-badges-heading">Open Science Badges:</span>
            {paper.openScienceBadges?.openData ? (
              <a
                href={paper.openScienceBadges.openDataUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="kc-badge-open-science is-active"
                title="Open Primary Data available on Zenodo/OSF"
              >
                <SiteIcon name="check" size={13} />
                <span>Open Data</span>
              </a>
            ) : (
              <span className="kc-badge-open-science is-inactive" title="No public open dataset attached">
                <span>Open Data (Restricted)</span>
              </span>
            )}

            {paper.openScienceBadges?.openCode ? (
              <a
                href={paper.openScienceBadges.openCodeUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="kc-badge-open-science is-active"
                title="Open Source Analysis Scripts on GitHub"
              >
                <SiteIcon name="check" size={13} />
                <span>Open Materials / Code</span>
              </a>
            ) : (
              <span className="kc-badge-open-science is-inactive">
                <span>Open Code (N/A)</span>
              </span>
            )}

            {paper.openScienceBadges?.preregistered ? (
              <a
                href={paper.openScienceBadges.preregistrationUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="kc-badge-open-science is-active"
                title="Study protocol preregistered on OSF / ClinicalTrials"
              >
                <SiteIcon name="award" size={13} />
                <span>Preregistered Study</span>
              </a>
            ) : (
              <span className="kc-badge-open-science is-inactive">
                <span>Not Preregistered</span>
              </span>
            )}

            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="kc-badge-open-science is-active"
              title="Creative Commons Attribution 4.0 International License"
            >
              <span>CC BY 4.0</span>
            </a>
          </div>

          {/* Reader Action Bar (Top) */}
          <div className="kc-reader-actions-bar">
            <button
              type="button"
              className="kc-btn-primary"
              onClick={() => setGalleyModalOpen(true)}
              aria-label="View interactive two-column academic galley reader"
            >
              <SiteIcon name="file-text" size={14} />
              <span>Read Manuscript Galley</span>
            </button>

            <button
              type="button"
              className="kc-btn-secondary"
              onClick={() => setExportModalOpen(true)}
              aria-label="Download or print research paper PDF"
            >
              <SiteIcon name="download" size={14} />
              <span>Download PDF / Print</span>
            </button>

            <button
              type="button"
              className="kc-btn-secondary"
              onClick={() => setCitationModalOpen(true)}
              aria-label="Export citation in APA, BibTeX, RIS formats"
            >
              <SiteIcon name="bookmark" size={14} />
              <span>Cite This Preprint</span>
            </button>

            <button
              type="button"
              className="kc-btn-secondary"
              onClick={handleDownloadBibtex}
              aria-label="Download BibTeX (.bib) citation file"
            >
              <SiteIcon name="download" size={14} />
              <span>Download .BIB</span>
            </button>

            <button
              type="button"
              className="kc-btn-secondary"
              onClick={handleDownloadRis}
              aria-label="Download RIS (.ris) citation file"
            >
              <SiteIcon name="download" size={14} />
              <span>Download .RIS</span>
            </button>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12.5px', color: '#64748b', flexWrap: 'wrap' }}>
              <span>{paper.readingTimeMinutes} min read</span>
              <span>·</span>
              <span>{paper.metrics.views} views</span>
              <span>·</span>
              <span>{paper.metrics.downloads} downloads</span>
              <span>·</span>
              <span>{paper.metrics.citations} citations</span>
            </div>
          </div>
        </header>

        {/* PHASE 1: TWO-COLUMN READING LAYOUT (Desktop Article Column + Sticky TOC Rail) */}
        <div className="kc-paper-two-col-layout">
          {/* MAIN ARTICLE COLUMN */}
          <article className="kc-paper-article-col">
            {/* Structured Abstract */}
            <section id="abstract" className="kc-structured-abstract" aria-labelledby="abstract-heading">
              <h2 id="abstract-heading" className="kc-abstract-heading">Structured Abstract</h2>
              <div className="kc-abstract-section">
                <span className="kc-abstract-tag">Background: </span>
                <span>{paper.abstract.background}</span>
              </div>
              <div className="kc-abstract-section">
                <span className="kc-abstract-tag">Methods: </span>
                <span>{paper.abstract.methods}</span>
              </div>
              <div className="kc-abstract-section">
                <span className="kc-abstract-tag">Results: </span>
                <span>{paper.abstract.results}</span>
              </div>
              <div className="kc-abstract-section">
                <span className="kc-abstract-tag">Conclusion: </span>
                <span>{paper.abstract.conclusion}</span>
              </div>

              <div className="kc-keywords-row" style={{ marginTop: '18px', marginBottom: 0 }}>
                {paper.keywords.map(kw => (
                  <span key={kw} className="kc-keyword-chip">#{kw}</span>
                ))}
              </div>
            </section>

            {/* Bilingual Grassroots Coach Takeaways Strip */}
            {paper.coachingTakeaways && (
              <section id="takeaways" className="kc-takeaways-box" aria-labelledby="takeaways-heading">
                <div className="kc-takeaways-head">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <SiteIcon name="award" size={18} className="kc-takeaways-icon" />
                    <h3 id="takeaways-heading" className="kc-takeaways-title">
                      Grassroots Coaching Takeaways &amp; Field Implications
                    </h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="kc-field-cue-print-btn"
                      onClick={() => {
                        if (typeof window !== 'undefined') window.print()
                      }}
                      title="Print standalone 1-page protocol sheet for academy coaches"
                    >
                      <SiteIcon name="download" size={12} />
                      <span>Print Field Cue Card</span>
                    </button>
                    <div className="kc-lang-toggle" role="group" aria-label="Coaching takeaways language switcher">
                      <button
                        type="button"
                        className={`kc-lang-btn ${takeawaysLang === 'en' ? 'is-active' : ''}`}
                        onClick={() => setTakeawaysLang('en')}
                        aria-pressed={takeawaysLang === 'en'}
                      >
                        English
                      </button>
                      <button
                        type="button"
                        className={`kc-lang-btn ${takeawaysLang === 'hi' ? 'is-active' : ''}`}
                        onClick={() => setTakeawaysLang('hi')}
                        aria-pressed={takeawaysLang === 'hi'}
                      >
                        हिंदी (Hindi)
                      </button>
                    </div>
                  </div>
                </div>

                <ul className="kc-takeaways-list">
                  {paper.coachingTakeaways[takeawaysLang].map((cue, cIdx) => (
                    <li key={cIdx} className="kc-takeaway-item">
                      <span className="kc-takeaway-num">{cIdx + 1}</span>
                      <span className="kc-takeaway-text">{cue}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Phase 3: Interactive Normative Benchmark Calculator (when applicable e.g. KG-2026-002) */}
            {paper.hasNormativeBenchmarks && (
              <div id="calculator">
                <NormativeBenchmarkCalculator />
              </div>
            )}

            {/* Full Paper Body Sections */}
            <main className="kc-paper-body">
              {paper.sections.map((sec, sIdx) => {
                const currentMode = chartViewModes[sIdx] ?? 'table'

                return (
                  <section id={`section-${sIdx}`} key={sIdx} className="kc-section-block">
                    <h2 className="kc-section-title">{sec.title}</h2>
                    {sec.paragraphs.map((p, pIdx) => (
                      <p key={pIdx} className="kc-paragraph">{p}</p>
                    ))}

                    {sec.callout && (
                      <div className="kc-callout-finding">
                        <div className="kc-callout-title">{sec.callout.title}</div>
                        <p className="kc-callout-text">{sec.callout.text}</p>
                      </div>
                    )}

                    {sec.tableData && (
                      <div className="kc-table-wrap">
                        <div className="kc-table-top-bar">
                          {sec.tableData.caption && (
                            <div className="kc-table-caption">{sec.tableData.caption}</div>
                          )}
                          <div className="kc-chart-switcher" role="group" aria-label="Table or chart display mode">
                            <button
                              type="button"
                              className={`kc-switch-btn ${currentMode === 'table' ? 'is-active' : ''}`}
                              onClick={() => toggleViewMode(sIdx, 'table')}
                              aria-pressed={currentMode === 'table'}
                            >
                              <SiteIcon name="file-text" size={13} />
                              <span>Academic Table</span>
                            </button>
                            <button
                              type="button"
                              className={`kc-switch-btn ${currentMode === 'chart' ? 'is-active' : ''}`}
                              onClick={() => toggleViewMode(sIdx, 'chart')}
                              aria-pressed={currentMode === 'chart'}
                            >
                              <SiteIcon name="chart" size={13} />
                              <span>Interactive Chart</span>
                            </button>
                          </div>
                        </div>

                        {currentMode === 'table' ? (
                          <table className="kc-academic-table">
                            <thead>
                              <tr>
                                {sec.tableData.headers.map((h, hIdx) => (
                                  <th key={hIdx}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {sec.tableData.rows.map((row, rIdx) => (
                                <tr key={rIdx}>
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx}>{cell}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <AcademicDataChart tableData={sec.tableData} />
                        )}
                      </div>
                    )}
                  </section>
                )
              })}

              {/* Supplementary Files & Datasets (SportRxiv / OPS Style) */}
              {paper.supplementaryFiles && paper.supplementaryFiles.length > 0 && (
                <section id="supplements" className="kc-supplements-section" aria-labelledby="supplements-heading">
                  <h2 id="supplements-heading" className="kc-section-title">Supplementary Datasets &amp; Protocols</h2>
                  <div className="kc-supplements-table-wrap">
                    <table className="kc-supplements-table">
                      <thead>
                        <tr>
                          <th>Filename / Descriptor</th>
                          <th>Format</th>
                          <th>Size</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paper.supplementaryFiles.map(file => (
                          <tr key={file.id}>
                            <td>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>{file.name}</div>
                              <div style={{ fontSize: '12px', color: '#64748b' }}>{file.description}</div>
                            </td>
                            <td>
                              <span className="kc-file-format-badge">{file.format}</span>
                            </td>
                            <td>{file.size}</td>
                            <td>
                              <button
                                type="button"
                                className="kc-supp-download-btn"
                                onClick={() => downloadFile(`# Supplementary data for ${file.name}\n`, file.name, 'text/plain')}
                                title={`Download ${file.name}`}
                              >
                                <SiteIcon name="download" size={12} />
                                <span>Download</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Research Statements Box */}
              <section id="ethics" className="kc-statements-box" aria-label="Research ethics and data statements">
                <div className="kc-statement-item">
                  <span className="kc-statement-title">Ethics &amp; Consent Statement: </span>
                  <span>{paper.ethicsStatement}</span>
                </div>
                <div className="kc-statement-item">
                  <span className="kc-statement-title">Data Availability: </span>
                  <span>{paper.dataAvailability}</span>
                </div>
                <div className="kc-statement-item">
                  <span className="kc-statement-title">Funding &amp; Grants: </span>
                  <span>{paper.fundingStatement}</span>
                </div>
                <div className="kc-statement-item">
                  <span className="kc-statement-title">Conflicts of Interest: </span>
                  <span>{paper.conflictsOfInterest}</span>
                </div>
                <div className="kc-statement-item">
                  <span className="kc-statement-title">License &amp; Rights: </span>
                  <span>Distributed under Creative Commons Attribution 4.0 International ({paper.license || 'CC BY 4.0'}).</span>
                </div>
              </section>

              {/* Bibliographic References */}
              <section id="references" className="kc-references-box" aria-labelledby="references-heading">
                <h2 id="references-heading" className="kc-section-title">References</h2>
                <ol className="kc-references-list">
                  {paper.references.map(ref => (
                    <li key={ref.id} className="kc-ref-item">
                      <span>{ref.text}</span>
                      {ref.doi && (
                        <a
                          href={`https://doi.org/${ref.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="kc-ref-doi"
                        >
                          doi:{ref.doi}
                        </a>
                      )}
                    </li>
                  ))}
                </ol>
              </section>

              {/* Connected KhelGrid Platform Tools */}
              {paper.connectedKhelGridLinks && paper.connectedKhelGridLinks.length > 0 && (
                <aside id="tools" className="kc-connected-tools" aria-label="Connected KhelGrid platform tools">
                  <h3 className="kc-tools-title">
                    Operationalize This Research on KhelGrid
                  </h3>
                  <div className="kc-tools-grid">
                    {paper.connectedKhelGridLinks.map((tool, tIdx) => (
                      <a
                        key={tIdx}
                        href={tool.href}
                        className="kc-tool-card"
                        onClick={e => handleLink(e, tool.href)}
                      >
                        <div className="kc-tool-head">
                          <span className="kc-tool-label">{tool.label}</span>
                          <span className="kc-tool-badge">{tool.badge}</span>
                        </div>
                        <p className="kc-tool-desc">{tool.description}</p>
                      </a>
                    ))}
                  </div>
                </aside>
              )}

              {/* Community Discussion & Peer Feedback (SportRxiv / OPS Style) */}
              <section id="comments" className="kc-comments-section" aria-labelledby="comments-heading">
                <div className="kc-comments-head">
                  <h3 id="comments-heading" className="kc-comments-title">
                    Community Discussion &amp; Peer Reviews ({comments.length})
                  </h3>
                  <span className="kc-comments-sub">
                    Pre-publication open peer review, methodological inquiries, and grassroots replication notes
                  </span>
                </div>

                {/* Comment Category Filter Tabs */}
                <div className="kc-comments-filter-tabs" role="tablist" aria-label="Filter scientific comments by type">
                  <button
                    type="button"
                    className={`kc-comment-filter-pill ${commentFilter === 'all' ? 'is-active' : ''}`}
                    onClick={() => setCommentFilter('all')}
                    role="tab"
                    aria-selected={commentFilter === 'all'}
                  >
                    <span>All Comments ({commentTypeCounts.all})</span>
                  </button>
                  <button
                    type="button"
                    className={`kc-comment-filter-pill ${commentFilter === 'peer_review' ? 'is-active' : ''}`}
                    onClick={() => setCommentFilter('peer_review')}
                    role="tab"
                    aria-selected={commentFilter === 'peer_review'}
                  >
                    <span>🔬 Peer Reviews ({commentTypeCounts.peer_review})</span>
                  </button>
                  <button
                    type="button"
                    className={`kc-comment-filter-pill ${commentFilter === 'methodological_query' ? 'is-active' : ''}`}
                    onClick={() => setCommentFilter('methodological_query')}
                    role="tab"
                    aria-selected={commentFilter === 'methodological_query'}
                  >
                    <span>❓ Methodological Queries ({commentTypeCounts.methodological_query})</span>
                  </button>
                  <button
                    type="button"
                    className={`kc-comment-filter-pill ${commentFilter === 'replication_note' ? 'is-active' : ''}`}
                    onClick={() => setCommentFilter('replication_note')}
                    role="tab"
                    aria-selected={commentFilter === 'replication_note'}
                  >
                    <span>📋 Replication Notes ({commentTypeCounts.replication_note})</span>
                  </button>
                  <button
                    type="button"
                    className={`kc-comment-filter-pill ${commentFilter === 'general' ? 'is-active' : ''}`}
                    onClick={() => setCommentFilter('general')}
                    role="tab"
                    aria-selected={commentFilter === 'general'}
                  >
                    <span>💬 Academic Discussion ({commentTypeCounts.general})</span>
                  </button>
                </div>

                {/* Existing Comments List */}
                <div className="kc-comments-list">
                  {filteredComments.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                      No comments or reviews recorded under this category filter.
                    </div>
                  ) : (
                    filteredComments.map(c => (
                      <article key={c.id} className="kc-comment-card">
                        <div className="kc-comment-meta">
                          <div className="kc-comment-author-block">
                            <strong className="kc-comment-author">{c.author}</strong>
                            {c.isAuthorResponse && (
                              <span className="kc-comment-author-response-badge" title="Author of manuscript">
                                Author Response
                              </span>
                            )}
                            {c.role && <span className="kc-comment-role"> · {c.role}</span>}
                            {c.orcid && (
                              <a
                                href={`https://orcid.org/${c.orcid}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="kc-author-orcid"
                                style={{ marginLeft: '4px' }}
                                title={`Verified ORCID: ${c.orcid}`}
                              >
                                <span>iD</span>
                                <span>{c.orcid}</span>
                              </a>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className={`kc-comment-type-tag ${
                              c.commentType === 'peer_review'
                                ? 'kc-comment-type-peer-review'
                                : c.commentType === 'methodological_query'
                                ? 'kc-comment-type-query'
                                : c.commentType === 'replication_note'
                                ? 'kc-comment-type-replication'
                                : 'kc-comment-type-general'
                            }`}>
                              {c.commentType === 'peer_review'
                                ? '🔬 Formal Peer Review'
                                : c.commentType === 'methodological_query'
                                ? '❓ Methodological Query'
                                : c.commentType === 'replication_note'
                                ? '📋 Field Replication'
                                : '💬 Academic Comment'}
                            </span>
                            <span className="kc-comment-date">{c.date}</span>
                          </div>
                        </div>
                        <div className="kc-comment-affil">{c.affiliation}</div>
                        <p className="kc-comment-content">{c.content}</p>

                        {c.competingInterests && (
                          <div className="kc-comment-competing-interests">
                            <strong>Declaration of Interests: </strong>{c.competingInterests}
                          </div>
                        )}

                        <div className="kc-comment-actions-row">
                          <button
                            type="button"
                            className={`kc-comment-vote-btn ${votedCommentIds.has(c.id) ? 'is-voted' : ''}`}
                            onClick={() => handleVoteHelpful(c.id)}
                            title="Mark this review or feedback as helpful"
                            aria-label={`Mark review as helpful, currently ${c.helpfulCount || 0} votes`}
                          >
                            <SiteIcon name="check" size={12} />
                            <span>{votedCommentIds.has(c.id) ? 'Helpful' : 'Vote Helpful'} ({c.helpfulCount || 0})</span>
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>

                {/* Comment Submission Form */}
                <form className="kc-comment-form" onSubmit={handleCommentSubmit}>
                  <h4 className="kc-comment-form-title">Leave a Scientific Comment / Feedback &amp; Peer Review</h4>
                  <p className="kc-comment-form-desc">
                    Engage in collegial scientific discourse. Comments are publicly attributed, backed by database persistence, and permanently indexed with this preprint.
                  </p>

                  {commentFeedback && (
                    <div className="kc-comment-alert" role="status">
                      {commentFeedback}
                    </div>
                  )}

                  <div className="kc-form-row">
                    <div className="kc-form-field">
                      <label htmlFor="comment-author" className="kc-form-label">Full Name *</label>
                      <input
                        id="comment-author"
                        type="text"
                        className="kc-form-input"
                        placeholder="e.g. Dr. Anita Sharma"
                        value={commentAuthor}
                        onChange={e => setCommentAuthor(e.target.value)}
                        required
                      />
                    </div>
                    <div className="kc-form-field">
                      <label htmlFor="comment-affiliation" className="kc-form-label">Institution / Academy *</label>
                      <input
                        id="comment-affiliation"
                        type="text"
                        className="kc-form-input"
                        placeholder="e.g. Sports Authority of India, Patiala"
                        value={commentAffiliation}
                        onChange={e => setCommentAffiliation(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="kc-form-row" style={{ marginTop: '10px' }}>
                    <div className="kc-form-field">
                      <label htmlFor="comment-role" className="kc-form-label">Professional Role</label>
                      <input
                        id="comment-role"
                        type="text"
                        className="kc-form-input"
                        placeholder="e.g. Senior Biomechanist / Head Coach / Sports Physiotherapist"
                        value={commentRole}
                        onChange={e => setCommentRole(e.target.value)}
                      />
                    </div>
                    <div className="kc-form-field">
                      <label htmlFor="comment-orcid" className="kc-form-label">ORCID iD (Optional)</label>
                      <input
                        id="comment-orcid"
                        type="text"
                        className="kc-form-input"
                        placeholder="e.g. 0000-0002-8941-4412"
                        value={commentOrcid}
                        onChange={e => setCommentOrcid(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="kc-form-row" style={{ marginTop: '10px' }}>
                    <div className="kc-form-field">
                      <label htmlFor="comment-type-select" className="kc-form-label">Comment Category *</label>
                      <select
                        id="comment-type-select"
                        className="kc-form-select"
                        value={commentType}
                        onChange={e => setCommentType(e.target.value as 'peer_review' | 'methodological_query' | 'replication_note' | 'general')}
                        style={{ width: '100%', height: '38px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      >
                        <option value="peer_review">🔬 Formal Pre-Publication Peer Review</option>
                        <option value="methodological_query">❓ Methodological &amp; Statistical Query</option>
                        <option value="replication_note">📋 Field Replication / Coaching Observation</option>
                        <option value="general">💬 General Scholarly Discussion</option>
                      </select>
                    </div>
                    <div className="kc-form-field">
                      <label htmlFor="comment-coi" className="kc-form-label">Competing Interests</label>
                      <input
                        id="comment-coi"
                        type="text"
                        className="kc-form-input"
                        placeholder="e.g. None declared / Consultant to SAI"
                        value={commentCompetingInterests}
                        onChange={e => setCommentCompetingInterests(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="kc-form-field" style={{ marginTop: '10px' }}>
                    <label htmlFor="comment-content" className="kc-form-label">Feedback or Review Text *</label>
                    <textarea
                      id="comment-content"
                      rows={4}
                      className="kc-form-textarea"
                      placeholder="Share constructive scientific feedback, methodological queries, or field replication observations…"
                      value={commentContent}
                      onChange={e => setCommentContent(e.target.value)}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="kc-btn-primary"
                    style={{ marginTop: '14px' }}
                    disabled={isSubmittingComment}
                  >
                    <SiteIcon name="message" size={14} />
                    <span>{isSubmittingComment ? 'Submitting to Database…' : 'Post Peer Feedback'}</span>
                  </button>
                </form>
              </section>

              {/* Related Preprints in Same Sport / Discipline */}
              {relatedPapers.length > 0 && (
                <section id="related" className="kc-related-section" aria-labelledby="related-papers-heading">
                  <div className="kc-related-head">
                    <h3 id="related-papers-heading" className="kc-related-title">
                      Related Preprints in {paper.sport || paper.categoryName}
                    </h3>
                    <a
                      href="/khelchronicle"
                      onClick={e => handleLink(e, '/khelchronicle')}
                      className="kc-related-browse-all"
                    >
                      Browse All Archive ({RESEARCH_PAPERS.length} Papers) →
                    </a>
                  </div>
                  <div className="kc-related-grid">
                    {relatedPapers.map(rel => (
                      <article key={rel.id} className="kc-related-card">
                        <div className="kc-paper-top-meta" style={{ marginBottom: '6px' }}>
                          <span className="kc-paper-id-tag">{rel.paperId}</span>
                          {rel.sport && <span className="kc-paper-sport-tag">{rel.sport}</span>}
                        </div>
                        <h4 className="kc-related-card-title">
                          <a href={`/khelchronicle/${rel.slug}`} onClick={e => handleLink(e, `/khelchronicle/${rel.slug}`)}>
                            {rel.title}
                          </a>
                        </h4>
                        <p className="kc-related-authors">{rel.authors.map(a => a.name).join(', ')}</p>
                        <div className="kc-card-bottom" style={{ marginTop: 'auto', paddingTop: '10px' }}>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>{rel.readingTimeMinutes} min read</span>
                          <a
                            href={`/khelchronicle/${rel.slug}`}
                            className="kc-btn-secondary"
                            style={{ fontSize: '12px', padding: '4px 10px' }}
                            onClick={e => handleLink(e, `/khelchronicle/${rel.slug}`)}
                          >
                            Read Preprint
                          </a>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </main>
          </article>

          {/* STICKY RIGHT READING RAIL (TOC & Quick Actions) */}
          <aside className="kc-paper-toc-rail" aria-label="Article navigation and actions">
            {/* Action Box */}
            <div className="kc-sticky-action-box">
              <button
                type="button"
                className="kc-btn-primary"
                onClick={() => setGalleyModalOpen(true)}
                aria-label="View interactive two-column academic galley reader"
              >
                <SiteIcon name="file-text" size={14} />
                <span>Read Manuscript Galley</span>
              </button>

              <button
                type="button"
                className="kc-btn-secondary"
                onClick={() => setExportModalOpen(true)}
                aria-label="Download or print research paper PDF"
              >
                <SiteIcon name="download" size={14} />
                <span>Download PDF / Print</span>
              </button>

              <button
                type="button"
                className="kc-btn-secondary"
                onClick={() => setCitationModalOpen(true)}
                aria-label="Export citation in APA, BibTeX, RIS formats"
              >
                <SiteIcon name="bookmark" size={14} />
                <span>Cite This Preprint</span>
              </button>

              <div className="kc-rail-citation-row">
                <button
                  type="button"
                  className="kc-btn-secondary"
                  onClick={handleDownloadBibtex}
                  aria-label="Download BibTeX citation file"
                >
                  <SiteIcon name="download" size={13} />
                  <span>Download .BIB</span>
                </button>
                <button
                  type="button"
                  className="kc-btn-secondary"
                  onClick={handleDownloadRis}
                  aria-label="Download RIS citation file"
                >
                  <SiteIcon name="download" size={13} />
                  <span>Download .RIS</span>
                </button>
              </div>
            </div>

            {/* Table of Contents Box */}
            <div className="kc-toc-box">
              <div className="kc-toc-title">
                <SiteIcon name="file-text" size={13} />
                <span>On This Page</span>
              </div>
              <ul className="kc-toc-list">
                <li className="kc-toc-item">
                  <a href="#abstract">Structured Abstract</a>
                </li>
                {paper.coachingTakeaways && (
                  <li className="kc-toc-item">
                    <a href="#takeaways">Coaching Takeaways</a>
                  </li>
                )}
                {paper.hasNormativeBenchmarks && (
                  <li className="kc-toc-item">
                    <a href="#calculator">Percentile Calculator</a>
                  </li>
                )}
                {paper.sections.map((sec, sIdx) => (
                  <li key={sIdx} className="kc-toc-item">
                    <a href={`#section-${sIdx}`}>{sec.title}</a>
                  </li>
                ))}
                {paper.supplementaryFiles && paper.supplementaryFiles.length > 0 && (
                  <li className="kc-toc-item">
                    <a href="#supplements">Supplementary Data</a>
                  </li>
                )}
                <li className="kc-toc-item">
                  <a href="#ethics">Ethics &amp; Statements</a>
                </li>
                <li className="kc-toc-item">
                  <a href="#references">References</a>
                </li>
                <li className="kc-toc-item">
                  <a href="#comments">Peer Discussion ({comments.length})</a>
                </li>
              </ul>
            </div>

            {/* Metrics Box */}
            <div className="kc-sticky-metrics-box">
              <div className="kc-sticky-metrics-title">Preprint Impact Metrics</div>
              <div className="kc-sticky-metrics-grid">
                <div className="kc-metric-cell">
                  <strong>{paper.metrics.views}</strong>
                  <span>Views</span>
                </div>
                <div className="kc-metric-cell">
                  <strong>{paper.metrics.downloads}</strong>
                  <span>Downloads</span>
                </div>
                <div className="kc-metric-cell">
                  <strong>{paper.metrics.citations}</strong>
                  <span>Citations</span>
                </div>
                <div className="kc-metric-cell">
                  <strong>{paper.readingTimeMinutes}m</strong>
                  <span>Read Time</span>
                </div>
              </div>
            </div>

            {/* Altmetric / Scholarly Impact Attention Card */}
            <div className="kc-altmetric-card">
              <div className="kc-altmetric-head">
                <div className="kc-altmetric-donut" aria-label={`Altmetric Attention Score ${paper.altmetrics?.score || 18}`}>
                  <span className="kc-altmetric-score">{paper.altmetrics?.score || 18}</span>
                </div>
                <div className="kc-altmetric-labels">
                  <strong>Attention Score</strong>
                  <span>Global Scholarly Reach</span>
                </div>
              </div>
              <div className="kc-altmetric-details">
                <div className="kc-altmetric-row">
                  <SiteIcon name="award" size={13} />
                  <span><strong>{paper.altmetrics?.policyCitations ?? 1}</strong> Policy &amp; Guideline Citations</span>
                </div>
                <div className="kc-altmetric-row">
                  <SiteIcon name="bookmark" size={13} />
                  <span><strong>{paper.altmetrics?.mendeleySaves ?? 12}</strong> Mendeley / Zotero Saves</span>
                </div>
                <div className="kc-altmetric-row">
                  <SiteIcon name="share" size={13} />
                  <span><strong>{paper.altmetrics?.mentionsTwitter ?? 6}</strong> Academic Community Shares</span>
                </div>
              </div>
            </div>

            {/* Share & DOI Box */}
            <div className="kc-toc-box">
              <div className="kc-toc-title">
                <SiteIcon name="share" size={13} />
                <span>Share &amp; Permanent DOI</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  className="kc-btn-secondary"
                  style={{ width: '100%', fontSize: '12px', justifyContent: 'center' }}
                  onClick={copyDoi}
                >
                  <SiteIcon name="copy" size={12} />
                  <span>{doiCopied ? 'DOI Copied!' : 'Copy Crossref DOI'}</span>
                </button>
                <button
                  type="button"
                  className="kc-btn-secondary"
                  style={{ width: '100%', fontSize: '12px', justifyContent: 'center' }}
                  onClick={copyPermanentLink}
                >
                  <SiteIcon name="share" size={12} />
                  <span>{linkCopied ? 'Link Copied!' : 'Copy Permanent Link'}</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Export & Download Dialog */}
      {exportModalOpen && (
        <div className="kc-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="export-modal-title">
          <div className="kc-modal-box">
            <div className="kc-modal-header">
              <h3 id="export-modal-title" className="kc-modal-title">Export &amp; Download Preprint</h3>
              <button
                type="button"
                className="kc-modal-close-btn"
                onClick={() => setExportModalOpen(false)}
                aria-label="Close export modal"
              >
                <SiteIcon name="close" size={18} />
              </button>
            </div>

            <div className="kc-modal-content">
              <p style={{ margin: '0 0 16px', fontSize: '13.5px', color: '#475569' }}>
                Select your preferred academic export format for <strong>{paper.paperId}</strong>:
              </p>

              <div className="kc-export-options-grid">
                <button
                  type="button"
                  className="kc-export-option-card"
                  onClick={() => {
                    setExportModalOpen(false)
                    handlePrintPdf()
                  }}
                >
                  <div className="kc-export-card-icon">
                    <SiteIcon name="download" size={20} />
                  </div>
                  <div className="kc-export-card-info">
                    <strong>Official Branded PDF / Print</strong>
                    <span>Clean academic preprint layout formatted for PDF save and printing.</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="kc-export-option-card"
                  onClick={handleDownloadBibtex}
                >
                  <div className="kc-export-card-icon">
                    <SiteIcon name="file-text" size={20} />
                  </div>
                  <div className="kc-export-card-info">
                    <strong>BibTeX Citation File (.bib)</strong>
                    <span>Standard LaTeX and Overleaf citation bibliography file.</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="kc-export-option-card"
                  onClick={handleDownloadRis}
                >
                  <div className="kc-export-card-icon">
                    <SiteIcon name="bookmark" size={20} />
                  </div>
                  <div className="kc-export-card-info">
                    <strong>RIS Reference File (.ris)</strong>
                    <span>Compatible with Zotero, Mendeley, EndNote, and RefWorks.</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Citation Modal */}
      {citationModalOpen && (
        <div className="kc-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="citation-modal-title">
          <div className="kc-modal-box">
            <div className="kc-modal-header">
              <h3 id="citation-modal-title" className="kc-modal-title">Cite This Preprint</h3>
              <button
                type="button"
                className="kc-modal-close-btn"
                onClick={() => setCitationModalOpen(false)}
                aria-label="Close citation modal"
              >
                <SiteIcon name="close" size={18} />
              </button>
            </div>

            <div className="kc-modal-content">
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

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button type="button" className="kc-btn-primary" onClick={copyCitation}>
                  <SiteIcon name="copy" size={14} />
                  <span>{copyFeedback ? 'Copied to Clipboard!' : 'Copy Citation Text'}</span>
                </button>
                <button type="button" className="kc-btn-secondary" onClick={handleDownloadBibtex}>
                  <span>Download .BIB</span>
                </button>
                <button type="button" className="kc-btn-secondary" onClick={handleDownloadRis}>
                  <span>Download .RIS</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preprint Revision History & Changelog Modal */}
      {versionModalOpen && (
        <div className="kc-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="version-modal-title">
          <div className="kc-modal-box">
            <div className="kc-modal-header">
              <h3 id="version-modal-title" className="kc-modal-title">
                Preprint Revision History &amp; Changelog ({paper.paperId})
              </h3>
              <button
                type="button"
                className="kc-modal-close-btn"
                onClick={() => setVersionModalOpen(false)}
                aria-label="Close revision modal"
              >
                <SiteIcon name="close" size={18} />
              </button>
            </div>

            <div className="kc-modal-content">
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>
                All manuscript revisions deposited in KhelChronicle receive permanent audit trails, Crossref record linkage, and distinct version identifiers.
              </p>

              <div className="kc-version-timeline">
                {(paper.versions && paper.versions.length > 0
                  ? paper.versions
                  : [
                      {
                        version: paper.version,
                        date: paper.datePublished,
                        summary: 'Initial pre-moderated preprint deposit',
                        isCurrent: true,
                      },
                    ]
                ).map(rev => (
                  <div key={rev.version} className={`kc-version-item ${rev.isCurrent ? 'is-current' : ''}`}>
                    <div className="kc-version-dot" />
                    <div className="kc-version-head">
                      <span className="kc-version-tag">{rev.version}</span>
                      {rev.isCurrent && (
                        <span className="kc-version-status-pill">Current Active</span>
                      )}
                      <span className="kc-version-date">{rev.date}</span>
                    </div>
                    <p className="kc-version-summary">{rev.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Full Manuscript Galley Reader Modal */}
      <AcademicGalleyModal
        paper={paper}
        isOpen={galleyModalOpen}
        onClose={() => setGalleyModalOpen(false)}
      />
    </div>
  )
}

export default KhelChroniclePaperPage
