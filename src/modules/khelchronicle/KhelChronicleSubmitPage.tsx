import { useState, useEffect, useRef, type FormEvent, type MouseEvent, type DragEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { RESEARCH_CATEGORIES } from './data/khelchronicleData'
import { submitChronicleManuscript } from '../../integrations/supabase/chronicle-client'
import './khelchronicle.css'
import './KhelChronicleSubmitPage.css'

interface KhelChronicleSubmitPageProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

interface CoAuthor {
  id: string
  name: string
  email: string
  affiliation: string
  orcid: string
}

const STORAGE_DRAFT_KEY = 'khelchronicle_manuscript_draft_v1'

const ARTICLE_TYPES = [
  { id: 'preprint', name: 'Original Research Preprint', desc: 'Full empirical or experimental sports science study with primary data' },
  { id: 'protocol', name: 'Field Biomechanics Protocol', desc: 'Standardized testing procedures, sensor mounting, and calibration guidelines' },
  { id: 'review', name: 'Systematic Review / Meta-Analysis', desc: 'PRISMA-compliant synthesis of athletic performance and injury literature' },
  { id: 'dataset', name: 'Benchmark Sports Dataset', desc: 'Open kinematic, physiological, or tracking telemetry callsets with data descriptor' },
  { id: 'casestudy', name: 'Elite Athlete Case Study', desc: 'Unique rehabilitation, biomechanical remodeling, or high-performance intervention' },
]

export function KhelChronicleSubmitPage({ onNavigate }: KhelChronicleSubmitPageProps) {
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [submissionNotice, setSubmissionNotice] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string } | null>(null)
  const [activeCitationTab, setActiveCitationTab] = useState<'apa' | 'vancouver' | 'bibtex'>('apa')
  const [copiedCitation, setCopiedCitation] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Primary form data state
  const [articleType, setArticleType] = useState('preprint')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('sports-biomechanics')
  const [keywords, setKeywords] = useState('Sports Biomechanics, Ground Reaction Force, Movement Screening')

  // Authors state
  const [primaryAuthorName, setPrimaryAuthorName] = useState('')
  const [primaryAuthorEmail, setPrimaryAuthorEmail] = useState('')
  const [primaryAuthorAffiliation, setPrimaryAuthorAffiliation] = useState('')
  const [orcid, setOrcid] = useState('')
  const [coAuthorsText, setCoAuthorsText] = useState('')
  const [coAuthorsList, setCoAuthorsList] = useState<CoAuthor[]>([])

  // Abstract & Coaching cues
  const [abstract, setAbstract] = useState('')
  const [coachingCue1, setCoachingCue1] = useState('')
  const [coachingCue2, setCoachingCue2] = useState('')
  const [coachingCue3, setCoachingCue3] = useState('')

  // Files & Data
  const [fullTextOrUrl, setFullTextOrUrl] = useState('')
  const [supplementaryUrl, setSupplementaryUrl] = useState('')
  const [dataAvailability, setDataAvailability] = useState('open_access')

  // Ethics & Declarations
  const [ethicsClearanceNumber, setEthicsClearanceNumber] = useState('')
  const [ethicsDeclaration, setEthicsDeclaration] = useState(false)
  const [minorConsentDeclaration, setMinorConsentDeclaration] = useState(false)
  const [licenseDeclaration, setLicenseDeclaration] = useState(false)
  const [licenseType, setLicenseType] = useState<'cc-by-4.0' | 'cc-by-nc-nd-4.0'>('cc-by-nc-nd-4.0')

  // Calculate abstract word count
  const abstractWords = abstract.trim() ? abstract.trim().split(/\s+/).length : 0

  // Load draft from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem(STORAGE_DRAFT_KEY)
      if (saved) {
        const d = JSON.parse(saved)
        if (d.title) setTitle(d.title)
        if (d.category) setCategory(d.category)
        if (d.articleType) setArticleType(d.articleType)
        if (d.keywords) setKeywords(d.keywords)
        if (d.primaryAuthorName) setPrimaryAuthorName(d.primaryAuthorName)
        if (d.primaryAuthorEmail) setPrimaryAuthorEmail(d.primaryAuthorEmail)
        if (d.primaryAuthorAffiliation) setPrimaryAuthorAffiliation(d.primaryAuthorAffiliation)
        if (d.orcid) setOrcid(d.orcid)
        if (d.coAuthorsText) setCoAuthorsText(d.coAuthorsText)
        if (d.abstract) setAbstract(d.abstract)
        if (d.coachingCue1) setCoachingCue1(d.coachingCue1)
        if (d.coachingCue2) setCoachingCue2(d.coachingCue2)
        if (d.coachingCue3) setCoachingCue3(d.coachingCue3)
        if (d.fullTextOrUrl) setFullTextOrUrl(d.fullTextOrUrl)
        if (d.supplementaryUrl) setSupplementaryUrl(d.supplementaryUrl)
        if (d.ethicsClearanceNumber) setEthicsClearanceNumber(d.ethicsClearanceNumber)
        setDraftSavedAt('Restored previous draft')
      }
    } catch {
      // ignore draft parse error
    }
  }, [])

  // Auto-save draft on changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!title && !primaryAuthorName && !abstract) return

    const timer = setTimeout(() => {
      try {
        const payload = {
          title,
          category,
          articleType,
          keywords,
          primaryAuthorName,
          primaryAuthorEmail,
          primaryAuthorAffiliation,
          orcid,
          coAuthorsText,
          abstract,
          coachingCue1,
          coachingCue2,
          coachingCue3,
          fullTextOrUrl,
          supplementaryUrl,
          ethicsClearanceNumber,
          updatedAt: new Date().toLocaleTimeString(),
        }
        localStorage.setItem(STORAGE_DRAFT_KEY, JSON.stringify(payload))
        setDraftSavedAt(`Auto-saved at ${payload.updatedAt}`)
      } catch {
        // storage quota full
      }
    }, 1200)

    return () => clearTimeout(timer)
  }, [
    title,
    category,
    articleType,
    keywords,
    primaryAuthorName,
    primaryAuthorEmail,
    primaryAuthorAffiliation,
    orcid,
    coAuthorsText,
    abstract,
    coachingCue1,
    coachingCue2,
    coachingCue3,
    fullTextOrUrl,
    supplementaryUrl,
    ethicsClearanceNumber,
  ])

  const clearDraft = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_DRAFT_KEY)
    }
    setTitle('')
    setCategory('sports-biomechanics')
    setArticleType('preprint')
    setKeywords('')
    setPrimaryAuthorName('')
    setPrimaryAuthorEmail('')
    setPrimaryAuthorAffiliation('')
    setOrcid('')
    setCoAuthorsText('')
    setCoAuthorsList([])
    setAbstract('')
    setCoachingCue1('')
    setCoachingCue2('')
    setCoachingCue3('')
    setFullTextOrUrl('')
    setSupplementaryUrl('')
    setEthicsClearanceNumber('')
    setEthicsDeclaration(false)
    setMinorConsentDeclaration(false)
    setLicenseDeclaration(false)
    setUploadedFile(null)
    setDraftSavedAt(null)
    setCurrentStep(1)
  }

  const handleLink = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (onNavigate) {
      onNavigate(e, href)
    }
  }

  // Insert structured abstract template
  const insertAbstractTemplate = () => {
    const template = `Background: \nMethods: \nResults: \nConclusion: `
    setAbstract(prev => (prev ? `${prev}\n\n${template}` : template))
  }

  // Handle Co-authors
  const addCoAuthor = () => {
    const newAuthor: CoAuthor = {
      id: `author-${Date.now()}`,
      name: '',
      email: '',
      affiliation: '',
      orcid: '',
    }
    setCoAuthorsList(prev => [...prev, newAuthor])
  }

  const updateCoAuthor = (id: string, field: keyof CoAuthor, value: string) => {
    setCoAuthorsList(prev =>
      prev.map(a => (a.id === id ? { ...a, [field]: value } : a))
    )
  }

  const removeCoAuthor = (id: string) => {
    setCoAuthorsList(prev => prev.filter(a => a.id !== id))
  }

  // Drag and drop handlers for manuscript file
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0])
    }
  }

  const processSelectedFile = (file: File) => {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(2)
    setUploadedFile({
      name: file.name,
      size: `${sizeInMb} MB`,
    })
    if (!fullTextOrUrl) {
      setFullTextOrUrl(`Uploaded file: ${file.name} (${sizeInMb} MB)`)
    }
  }

  // Download official manuscript template
  const handleDownloadTemplate = () => {
    const content = `# KhelChronicle Official Manuscript & Preprint Template (v2026.1)
Author Guidelines & Formatting Standard for Indian Sports Science Research

1. MANUSCRIPT METADATA
- Title: [Concise, informative title, max 120 characters]
- Running Head: [Abbreviated title, max 50 characters]
- Article Type: [Preprint / Field Protocol / Systematic Review / Benchmark Dataset]
- Subject Discipline: [Sports Biomechanics / Exercise Physiology / Sports Nutrition / Sports Analytics]

2. AUTHOR INFORMATION
- Corresponding Author: Name, Department, Institutional Affiliation, Email, ORCID iD
- Co-Authors: Names, Affiliations, ORCID iDs
- Institutional Ethics Committee (IEC/IRB) Approval Number: [Mandatory for Human Subjects]

3. STRUCTURED ABSTRACT (Max 350 words)
- Background: State the athletic performance or injury problem and scientific rationale.
- Methods: Cohort size (N), sports discipline, competitive level (State/National), testing apparatus.
- Results: Primary quantitative findings with effect sizes, 95% CIs, and statistical significance.
- Conclusion: Direct scientific takeaway.

4. FIELD IMPLICATIONS FOR GRASSROOTS COACHES & SCOUTS
- Key Takeaway 1: [Actionable coaching cue]
- Key Takeaway 2: [Training load or volume modification]
- Key Takeaway 3: [Injury screening or prevention marker]

5. MAIN BODY SECTIONS
- Introduction
- Methodology & Sensor Calibration (Document sampling frequency, optical markers, or force plates)
- Results (Include Table 1 for demographics, Figure 1 for kinematic plots)
- Discussion & Limitations
- Practical Applications
- Ethics Statement & Informed Consent (Document parental consent for minors under 18)
- Data Availability Statement (Link to Zenodo or GitHub repository)
- References (APA 7th Edition)
`
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'KhelChronicle_Preprint_Template_v2026.md'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Step Validation logic
  const validateStep = (step: number): boolean => {
    setErrorMessage(null)
    if (step === 1) {
      if (!title.trim()) {
        setErrorMessage('Please enter the Manuscript Title before proceeding.')
        return false
      }
      return true
    }
    if (step === 2) {
      if (!primaryAuthorName.trim()) {
        setErrorMessage('Primary / Corresponding Author name is required.')
        return false
      }
      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
      if (!primaryAuthorEmail.trim() || !emailRegex.test(primaryAuthorEmail.trim())) {
        setErrorMessage('Please enter a valid corresponding author email address.')
        return false
      }
      if (!primaryAuthorAffiliation.trim()) {
        setErrorMessage('Author Institution or University Affiliation is required.')
        return false
      }
      return true
    }
    if (step === 3) {
      if (!abstract.trim() || abstract.trim().length < 50) {
        setErrorMessage('Please provide a structured abstract of at least 50 characters.')
        return false
      }
      return true
    }
    return true
  }

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5))
      window.scrollTo({ top: 120, behavior: 'smooth' })
    }
  }

  const handlePrevStep = () => {
    setErrorMessage(null)
    setCurrentStep(prev => Math.max(prev - 1, 1))
    window.scrollTo({ top: 120, behavior: 'smooth' })
  }

  // Generate dynamic citation for Live Preview & Success screen
  const primaryLastName = primaryAuthorName.trim().split(' ').pop() || 'Author'
  const primaryInitials = primaryAuthorName.trim().split(' ')[0]?.[0] || 'A'
  const currentYear = new Date().getFullYear()
  const displayTitle = title.trim() || 'Biomechanical and Physiological Analysis in Indian Athletics'
  const displayCategory = RESEARCH_CATEGORIES.find(c => c.slug === category)?.name || 'Sports Science'

  const apaCitation = `${primaryLastName}, ${primaryInitials}. (${currentYear}). ${displayTitle}. KhelChronicle Open Sports Research Archive, 1(1). https://doi.org/10.5281/khelchronicle.${submissionId || 'draft'}`
  const vancouverCitation = `${primaryLastName} ${primaryInitials}. ${displayTitle}. KhelChronicle. ${currentYear};1(1):KG-${submissionId || '2026-SUB'}.`
  const bibtexCitation = `@article{${primaryLastName.toLowerCase()}${currentYear}${category.replace('-', '')},
  author = {${primaryAuthorName || 'Author, A.'}},
  title = {${displayTitle}},
  journal = {KhelChronicle Open Sports Research Archive},
  year = {${currentYear}},
  publisher = {KhelGrid Foundation},
  doi = {10.5281/khelchronicle.${submissionId || 'draft'}}
}`

  const copyCitationToClipboard = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
      setCopiedCitation(true)
      setTimeout(() => setCopiedCitation(false), 2000)
    }
  }

  // Handle final form submit
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    // Build consolidated co-authors string
    const listCoAuthors = coAuthorsList
      .filter(a => a.name.trim())
      .map(a => `${a.name} (${a.affiliation || 'Affiliation Pending'})`)
      .join(', ')

    const consolidatedCoAuthors = [coAuthorsText.trim(), listCoAuthors].filter(Boolean).join(', ')

    setIsSubmitting(true)

    try {
      const res = await submitChronicleManuscript({
        manuscript_title: title,
        category_slug: category,
        primary_author_name: primaryAuthorName,
        primary_author_email: primaryAuthorEmail,
        primary_author_affiliation: primaryAuthorAffiliation,
        orcid: orcid.trim() || undefined,
        co_authors: consolidatedCoAuthors || undefined,
        abstract_text: abstract,
        keywords: keywords,
        full_text_or_url: fullTextOrUrl || 'Uploaded via KhelChronicle Intake Dropzone',
        human_ethics_confirmed: ethicsDeclaration,
        minor_consent_confirmed: minorConsentDeclaration,
      })

      if (res.status === 'submitted') {
        setSubmissionId(res.submissionId)
        setSubmissionNotice('Manuscript successfully entered into the KhelChronicle peer-screening database queue.')
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_DRAFT_KEY)
        }
      } else if (res.status === 'unconfigured') {
        setSubmissionId(res.submissionId)
        setSubmissionNotice(res.message)
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_DRAFT_KEY)
        }
      } else {
        setErrorMessage(res.message)
      }
    } catch {
      setErrorMessage('Unexpected transmission error. Please check your network and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setSubmissionId(null)
    setSubmissionNotice(null)
    setErrorMessage(null)
    clearDraft()
  }

  return (
    <div className="kc-root kc-submit-container">
      {/* Breadcrumb Navigation */}
      <nav className="kc-submit-breadcrumb" aria-label="Breadcrumb">
        <a href="/khelchronicle" onClick={e => handleLink(e, '/khelchronicle')}>
          KhelChronicle
        </a>
        <span>/</span>
        <span>Author Submission &amp; Database Intake</span>
      </nav>

      {/* Hero Header */}
      <header className="kc-hero" style={{ paddingBottom: '24px' }}>
        <div className="kc-eyebrow-row">
          <span className="kc-badge-archive">
            <SiteIcon name="award" size={13} />
            <span>Database Submission Queue</span>
          </span>
          <span className="kc-badge-open-access">Diamond Open Access</span>
          <span className="kc-badge-open-access">Zero Article Processing Charges (APC)</span>
          <span className="kc-badge-open-access">Rapid 48-Hour Moderation Desk</span>
          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
            Test Mode Intake
          </span>
        </div>

        <h1 className="kc-hero-title">Submit Research Manuscript</h1>
        <p className="kc-hero-subtitle">
          KhelChronicle welcomes original preprints, technical whitepapers, systematic reviews, and datasets advancing
          sports biomechanics, athletic physiology, and sports science in India.
        </p>

        {draftSavedAt && (
          <div className="kc-draft-bar" role="status">
            <div className="kc-draft-status">
              <span className="kc-draft-saved-dot" />
              <span>{draftSavedAt}</span>
            </div>
            <div className="kc-draft-actions">
              <button type="button" className="kc-draft-btn-clear" onClick={clearDraft} title="Discard saved draft">
                Clear Draft
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Success State */}
      {submissionId ? (
        <div className="kc-success-card">
          <SiteIcon name="check-circle" size={48} style={{ color: '#16a34a', margin: '0 auto 12px' }} />
          <h2 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 800, color: '#14532d' }}>
            Manuscript Received for Editorial Screening
          </h2>
          <div className="kc-success-badge-id">
            <SiteIcon name="file-text" size={14} />
            <span>Accession Queue Reference: {submissionId}</span>
          </div>

          <p style={{ margin: '0 auto 16px', fontSize: '15px', color: '#166534', maxWidth: '680px', lineHeight: 1.6 }}>
            Thank you! Your manuscript &ldquo;{title || 'Sports Science Research'}&rdquo; has been registered in the
            KhelChronicle database screening table. Our moderation desk will audit formatting, data availability, and
            ethical clearances within 2 business days.
          </p>

          {submissionNotice && (
            <p style={{ margin: '0 auto 20px', fontSize: '13px', color: '#15803d', fontStyle: 'italic', maxWidth: '640px' }}>
              {submissionNotice}
            </p>
          )}

          {/* 3-Step Screening Timeline Tracker */}
          <div className="kc-timeline-tracker">
            <div className="kc-timeline-item is-done">
              <div className="kc-timeline-step-num">Step 1 · Completed</div>
              <div className="kc-timeline-step-title">Intake &amp; Checksum</div>
              <div className="kc-timeline-step-sub">Logged in Supabase chronicle_submissions table with instant timestamp.</div>
            </div>
            <div className="kc-timeline-item">
              <div className="kc-timeline-step-num" style={{ color: '#0284c7' }}>Step 2 · In Progress</div>
              <div className="kc-timeline-step-title">Editorial &amp; Ethics Check</div>
              <div className="kc-timeline-step-sub">Scope alignment, IEC clearance number, and POCSO youth protection audit (48h).</div>
            </div>
            <div className="kc-timeline-item">
              <div className="kc-timeline-step-num" style={{ color: '#64748b' }}>Step 3 · Pending</div>
              <div className="kc-timeline-step-title">Public Repository Indexing</div>
              <div className="kc-timeline-step-sub">Publication on KhelChronicle with live DOI and Schema.org ScholarlyArticle metadata.</div>
            </div>
          </div>

          {/* Provisional Citation Box */}
          <div style={{ maxWidth: '680px', margin: '0 auto 24px', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                Provisional Citation Format (Cite While Pending)
              </span>
              <button
                type="button"
                className="kc-template-btn"
                onClick={() => copyCitationToClipboard(activeCitationTab === 'apa' ? apaCitation : activeCitationTab === 'vancouver' ? vancouverCitation : bibtexCitation)}
              >
                {copiedCitation ? 'Copied to Clipboard!' : 'Copy Citation'}
              </button>
            </div>
            <div className="kc-citation-box">
              <div className="kc-citation-tabs">
                <button
                  type="button"
                  className={`kc-citation-tab-btn ${activeCitationTab === 'apa' ? 'is-active' : ''}`}
                  onClick={() => setActiveCitationTab('apa')}
                >
                  APA 7th
                </button>
                <button
                  type="button"
                  className={`kc-citation-tab-btn ${activeCitationTab === 'vancouver' ? 'is-active' : ''}`}
                  onClick={() => setActiveCitationTab('vancouver')}
                >
                  Vancouver
                </button>
                <button
                  type="button"
                  className={`kc-citation-tab-btn ${activeCitationTab === 'bibtex' ? 'is-active' : ''}`}
                  onClick={() => setActiveCitationTab('bibtex')}
                >
                  BibTeX
                </button>
              </div>
              <div style={{ whiteSpace: activeCitationTab === 'bibtex' ? 'pre-wrap' : 'normal' }}>
                {activeCitationTab === 'apa' ? apaCitation : activeCitationTab === 'vancouver' ? vancouverCitation : bibtexCitation}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <a href="/khelchronicle" className="kc-btn-primary" onClick={e => handleLink(e, '/khelchronicle')}>
              Return to Research Repository
            </a>
            <button type="button" className="kc-btn-secondary" onClick={resetForm}>
              Submit Another Paper
            </button>
          </div>
        </div>
      ) : (
        /* Main Submission Layout: Stepper + Form + Sidebar */
        <div className="kc-submit-layout">
          <div>
            {/* 5-Step Stepper Header */}
            <div className="kc-stepper" role="navigation" aria-label="Submission Steps">
              <div className="kc-stepper-progress-track">
                <div
                  className="kc-stepper-progress-fill"
                  style={{ width: `${((currentStep - 1) / 4) * 100}%` }}
                />
              </div>
              <div className="kc-stepper-tabs">
                <button
                  type="button"
                  className={`kc-step-tab ${currentStep === 1 ? 'is-active' : ''} ${currentStep > 1 ? 'is-completed' : ''}`}
                  onClick={() => setCurrentStep(1)}
                >
                  <span className="kc-step-badge">{currentStep > 1 ? '✓' : '1'}</span>
                  <span>1. Article &amp; Category</span>
                </button>
                <button
                  type="button"
                  className={`kc-step-tab ${currentStep === 2 ? 'is-active' : ''} ${currentStep > 2 ? 'is-completed' : ''}`}
                  onClick={() => validateStep(1) && setCurrentStep(2)}
                >
                  <span className="kc-step-badge">{currentStep > 2 ? '✓' : '2'}</span>
                  <span>2. Authors &amp; Affiliations</span>
                </button>
                <button
                  type="button"
                  className={`kc-step-tab ${currentStep === 3 ? 'is-active' : ''} ${currentStep > 3 ? 'is-completed' : ''}`}
                  onClick={() => validateStep(1) && validateStep(2) && setCurrentStep(3)}
                >
                  <span className="kc-step-badge">{currentStep > 3 ? '✓' : '3'}</span>
                  <span>3. Abstract &amp; Takeaways</span>
                </button>
                <button
                  type="button"
                  className={`kc-step-tab ${currentStep === 4 ? 'is-active' : ''} ${currentStep > 4 ? 'is-completed' : ''}`}
                  onClick={() => validateStep(1) && validateStep(2) && validateStep(3) && setCurrentStep(4)}
                >
                  <span className="kc-step-badge">{currentStep > 4 ? '✓' : '4'}</span>
                  <span>4. Files &amp; Data</span>
                </button>
                <button
                  type="button"
                  className={`kc-step-tab ${currentStep === 5 ? 'is-active' : ''}`}
                  onClick={() => validateStep(1) && validateStep(2) && validateStep(3) && setCurrentStep(5)}
                >
                  <span className="kc-step-badge">5</span>
                  <span>5. Ethics &amp; Preview</span>
                </button>
              </div>
            </div>

            {/* Main Form Body */}
            <form onSubmit={handleSubmit} className="kc-submit-form-card">
              {errorMessage && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '14px 16px', color: '#b91c1c', fontSize: '13.5px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <SiteIcon name="alert-circle" size={16} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* STEP 1: Article Type, Title & Discipline */}
              <div className={`kc-step-panel ${currentStep === 1 ? 'is-active' : ''}`}>
                <h2 className="kc-step-heading">Step 1: Article Type &amp; Research Discipline</h2>
                <p className="kc-step-desc">
                  Select the publication format and subject category that best represents your sports science findings.
                </p>

                <div className="kc-field-group">
                  <label className="kc-field-label">Publication Format *</label>
                  <div className="kc-type-selector">
                    {ARTICLE_TYPES.map(t => (
                      <button
                        type="button"
                        key={t.id}
                        className={`kc-type-card ${articleType === t.id ? 'is-selected' : ''}`}
                        onClick={() => setArticleType(t.id)}
                      >
                        <span className="kc-type-card-name">{t.name}</span>
                        <span className="kc-type-card-desc">{t.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="kc-field-group">
                  <label htmlFor="manuscript-title" className="kc-field-label">
                    <span>Manuscript Title *</span>
                    <span className="kc-field-hint">{title.length} / 160 characters</span>
                  </label>
                  <input
                    id="manuscript-title"
                    type="text"
                    required
                    className="kc-input-text"
                    placeholder="e.g. Kinematic Analysis of Lumbar Spine Stress in Junior Fast Bowlers"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                  />
                </div>

                <div className="kc-field-group">
                  <label htmlFor="research-category" className="kc-field-label">
                    Primary Research Discipline *
                  </label>
                  <select
                    id="research-category"
                    className="kc-select"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                  >
                    {RESEARCH_CATEGORIES.map(c => (
                      <option key={c.id} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="kc-field-group">
                  <label htmlFor="keywords-input" className="kc-field-label">
                    <span>Keywords (comma-separated) *</span>
                    <span className="kc-field-hint">e.g. Sport, Apparatus, Biomarker, Target Population</span>
                  </label>
                  <input
                    id="keywords-input"
                    type="text"
                    required
                    className="kc-input-text"
                    placeholder="Fast Bowling, Ground Reaction Force, Lumbar Spine, Biomechanics"
                    value={keywords}
                    onChange={e => setKeywords(e.target.value)}
                  />
                </div>
              </div>

              {/* STEP 2: Authors, Affiliations & ORCID */}
              <div className={`kc-step-panel ${currentStep === 2 ? 'is-active' : ''}`}>
                <h2 className="kc-step-heading">Step 2: Authors &amp; Institutional Affiliations</h2>
                <p className="kc-step-desc">
                  Identify the corresponding author, universities, national sports institutes (e.g. LNIPE, SAI NSNIS),
                  and verified ORCID iDs.
                </p>

                {/* Primary / Corresponding Author Card */}
                <div className="kc-author-card" style={{ marginBottom: '20px' }}>
                  <div className="kc-author-card-header">
                    <span className="kc-author-role-badge">
                      <SiteIcon name="award" size={12} />
                      <span>Primary / Corresponding Author</span>
                    </span>
                  </div>

                  <div className="kc-grid-2col" style={{ marginBottom: '14px' }}>
                    <div>
                      <label htmlFor="primary-author-name" className="kc-field-label">
                        Primary / Corresponding Author *
                      </label>
                      <input
                        id="primary-author-name"
                        type="text"
                        required
                        className="kc-input-text"
                        placeholder="e.g. Dr. Rajeshwari Nair"
                        value={primaryAuthorName}
                        onChange={e => setPrimaryAuthorName(e.target.value)}
                      />
                    </div>

                    <div>
                      <label htmlFor="primary-author-email" className="kc-field-label">
                        Corresponding Author Email *
                      </label>
                      <input
                        id="primary-author-email"
                        type="email"
                        required
                        className="kc-input-text"
                        placeholder="author@institution.edu.in"
                        value={primaryAuthorEmail}
                        onChange={e => setPrimaryAuthorEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="kc-grid-2col">
                    <div>
                      <label htmlFor="primary-affiliation" className="kc-field-label">
                        Author Institution / University Affiliation *
                      </label>
                      <input
                        id="primary-affiliation"
                        type="text"
                        required
                        className="kc-input-text"
                        placeholder="e.g. Lakshmibai National Institute of Physical Education (LNIPE), Gwalior"
                        value={primaryAuthorAffiliation}
                        onChange={e => setPrimaryAuthorAffiliation(e.target.value)}
                      />
                    </div>

                    <div>
                      <label htmlFor="author-orcid" className="kc-field-label">
                        <span>ORCID Identifier (Optional)</span>
                        <span className="kc-field-hint">16-digit format</span>
                      </label>
                      <input
                        id="author-orcid"
                        type="text"
                        className="kc-input-text"
                        placeholder="0000-0002-8941-4412"
                        value={orcid}
                        onChange={e => setOrcid(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Co-Authors Dynamic Builder */}
                <div className="kc-authors-section">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label htmlFor="co-authors-list" className="kc-field-label" style={{ margin: 0 }}>
                      Co-Authors &amp; Affiliations (Optional)
                    </label>
                    <button type="button" className="kc-btn-add-author" onClick={addCoAuthor}>
                      <SiteIcon name="plus" size={13} />
                      <span>Add Co-Author</span>
                    </button>
                  </div>

                  {/* Backward-compatible co-authors text string */}
                  <input
                    id="co-authors-list"
                    type="text"
                    className="kc-input-text"
                    placeholder="e.g. Dr. Alok Sen (SAI NCOE Bengaluru), Priya Narang (Delhi University)"
                    value={coAuthorsText}
                    onChange={e => setCoAuthorsText(e.target.value)}
                  />

                  {/* Dynamic Co-Author Rows */}
                  {coAuthorsList.map((author, index) => (
                    <div key={author.id} className="kc-author-card">
                      <div className="kc-author-card-header">
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                          Co-Author #{index + 1}
                        </span>
                        <button
                          type="button"
                          className="kc-author-btn-remove"
                          onClick={() => removeCoAuthor(author.id)}
                        >
                          <SiteIcon name="trash" size={12} />
                          <span>Remove</span>
                        </button>
                      </div>

                      <div className="kc-grid-2col" style={{ marginBottom: '12px' }}>
                        <div>
                          <label className="kc-field-label">Full Name</label>
                          <input
                            type="text"
                            className="kc-input-text"
                            placeholder="e.g. Prof. R. K. Sharma"
                            value={author.name}
                            onChange={e => updateCoAuthor(author.id, 'name', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="kc-field-label">Institutional Affiliation</label>
                          <input
                            type="text"
                            className="kc-input-text"
                            placeholder="e.g. Inspire Institute of Sport (IIS), Bellary"
                            value={author.affiliation}
                            onChange={e => updateCoAuthor(author.id, 'affiliation', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="kc-grid-2col">
                        <div>
                          <label className="kc-field-label">Author Email</label>
                          <input
                            type="email"
                            className="kc-input-text"
                            placeholder="coauthor@institution.edu.in"
                            value={author.email}
                            onChange={e => updateCoAuthor(author.id, 'email', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="kc-field-label">ORCID iD</label>
                          <input
                            type="text"
                            className="kc-input-text"
                            placeholder="0000-0003-1234-5678"
                            value={author.orcid}
                            onChange={e => updateCoAuthor(author.id, 'orcid', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* STEP 3: Abstract & Coaching Implications */}
              <div className={`kc-step-panel ${currentStep === 3 ? 'is-active' : ''}`}>
                <h2 className="kc-step-heading">Step 3: Structured Abstract &amp; Coaching Takeaways</h2>
                <p className="kc-step-desc">
                  Provide a concise summary following academic standards, accompanied by 3 actionable takeaways for
                  grassroots coaches and scouts.
                </p>

                <div className="kc-field-group">
                  <div className="kc-abstract-tools">
                    <label htmlFor="abstract-text" className="kc-field-label" style={{ margin: 0 }}>
                      Structured Abstract (Background, Methods, Results, Conclusion) *
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        className={`kc-word-counter ${abstractWords < 100 ? 'is-short' : abstractWords <= 380 ? 'is-optimal' : 'is-long'}`}
                      >
                        {abstractWords} words {abstractWords >= 150 && abstractWords <= 380 ? '(Optimal)' : ''}
                      </span>
                      <button
                        type="button"
                        className="kc-template-btn"
                        onClick={insertAbstractTemplate}
                        title="Insert Background, Methods, Results, Conclusion headings"
                      >
                        + Insert Headings
                      </button>
                    </div>
                  </div>
                  <textarea
                    id="abstract-text"
                    required
                    rows={8}
                    className="kc-textarea"
                    placeholder="Background: State the problem and athletic performance rationale...&#10;Methods: Cohort size, sports discipline, test protocol, instrumentation...&#10;Results: Quantitative kinematics, statistical significance, effect sizes...&#10;Conclusion: Direct scientific implications for Indian athletes..."
                    value={abstract}
                    onChange={e => setAbstract(e.target.value)}
                  />
                </div>

                {/* Exclusive Section: Field Implications for Coaches */}
                <div className="kc-coaching-cues-card">
                  <div className="kc-coaching-cues-title">
                    <SiteIcon name="award" size={16} />
                    <span>Field Implications for Grassroots Coaches &amp; Scouts</span>
                  </div>
                  <p style={{ margin: '0 0 12px', fontSize: '12.5px', color: '#166534', lineHeight: 1.5 }}>
                    Translate complex biomechanics or physiological data into 3 direct, actionable coaching cues that
                    academy coaches across India can implement in training:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input
                      type="text"
                      className="kc-input-text"
                      placeholder="Takeaway 1: e.g. Limit junior fast bowlers to maximum 30 match-intensity deliveries per spell to avoid lumbar bone stress"
                      value={coachingCue1}
                      onChange={e => setCoachingCue1(e.target.value)}
                    />
                    <input
                      type="text"
                      className="kc-input-text"
                      placeholder="Takeaway 2: e.g. Implement frontal plane knee valgus screening during single-leg landing combine drills"
                      value={coachingCue2}
                      onChange={e => setCoachingCue2(e.target.value)}
                    />
                    <input
                      type="text"
                      className="kc-input-text"
                      placeholder="Takeaway 3: e.g. Incorporate eccentric hamstring periodization during pre-monsoon conditioning camps"
                      value={coachingCue3}
                      onChange={e => setCoachingCue3(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* STEP 4: Manuscript Files & Supplementary Datasets */}
              <div className={`kc-step-panel ${currentStep === 4 ? 'is-active' : ''}`}>
                <h2 className="kc-step-heading">Step 4: Manuscript File &amp; Supplementary Data</h2>
                <p className="kc-step-desc">
                  Upload your preprint PDF or Word document, or provide a link to an open science repository (e.g.,
                  Zenodo, GitHub, OSF).
                </p>

                {/* Drag and drop zone */}
                <div className="kc-field-group">
                  <label className="kc-field-label">Preprint File Upload (PDF or DOCX, max 25MB)</label>
                  <div
                    className={`kc-dropzone ${isDragging ? 'is-dragover' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx"
                      style={{ display: 'none' }}
                      onChange={handleFileInputChange}
                    />
                    {uploadedFile ? (
                      <div className="kc-file-pill" onClick={e => e.stopPropagation()}>
                        <SiteIcon name="file-text" size={24} style={{ color: '#0284c7' }} />
                        <div className="kc-file-info">
                          <div className="kc-file-name">{uploadedFile.name}</div>
                          <div className="kc-file-meta">{uploadedFile.size} · Ready for intake</div>
                        </div>
                        <button
                          type="button"
                          className="kc-author-btn-remove"
                          onClick={() => {
                            setUploadedFile(null)
                            setFullTextOrUrl('')
                          }}
                        >
                          <SiteIcon name="trash" size={13} />
                          <span>Remove</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        <SiteIcon name="upload" size={32} className="kc-dropzone-icon" />
                        <div className="kc-dropzone-title">Drag &amp; Drop Manuscript File Here</div>
                        <div className="kc-dropzone-subtitle">or click to browse from your device (.pdf, .docx)</div>
                        <span className="kc-btn-secondary" style={{ pointerEvents: 'none' }}>
                          Browse Files
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="kc-field-group">
                  <label htmlFor="manuscript-url" className="kc-field-label">
                    Manuscript Full-Text Link (PDF URL or Institutional Repository Link)
                  </label>
                  <input
                    id="manuscript-url"
                    type="text"
                    className="kc-input-text"
                    placeholder="https://drive.google.com/... or https://arxiv.org/abs/... or https://zenodo.org/..."
                    value={fullTextOrUrl}
                    onChange={e => setFullTextOrUrl(e.target.value)}
                  />
                </div>

                <div className="kc-grid-2col">
                  <div>
                    <label htmlFor="supplementary-url" className="kc-field-label">
                      Supplementary Data or Code Link (Optional)
                    </label>
                    <input
                      id="supplementary-url"
                      type="text"
                      className="kc-input-text"
                      placeholder="https://github.com/... or https://doi.org/10.5281/..."
                      value={supplementaryUrl}
                      onChange={e => setSupplementaryUrl(e.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor="data-availability-select" className="kc-field-label">
                      Data Availability Statement *
                    </label>
                    <select
                      id="data-availability-select"
                      className="kc-select"
                      value={dataAvailability}
                      onChange={e => setDataAvailability(e.target.value)}
                    >
                      <option value="open_access">Publicly available in open data repository</option>
                      <option value="upon_request">Available from corresponding author upon reasonable request</option>
                      <option value="de_identified">De-identified summary metrics provided in manuscript tables</option>
                      <option value="restricted">Restricted due to athlete privacy / commercial confidentiality</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* STEP 5: Ethics, Declarations & Live Preview */}
              <div className={`kc-step-panel ${currentStep === 5 ? 'is-active' : ''}`}>
                <h2 className="kc-step-heading">Step 5: Ethics, Declarations &amp; Live Preview</h2>
                <p className="kc-step-desc">
                  Confirm institutional ethical clearance, minor protection compliance, and preview your manuscript
                  before entering the moderation queue.
                </p>

                {/* Ethics clearance input */}
                <div className="kc-field-group">
                  <label htmlFor="iec-approval-number" className="kc-field-label">
                    <span>Institutional Ethics Committee (IEC/IRB) Clearance Number *</span>
                    <span className="kc-field-hint">e.g. NIS-IEC-2025-084 or LNIPE-ETHICS-2026-12</span>
                  </label>
                  <input
                    id="iec-approval-number"
                    type="text"
                    className="kc-input-text"
                    placeholder="Enter institutional approval protocol or ethics committee reference"
                    value={ethicsClearanceNumber}
                    onChange={e => setEthicsClearanceNumber(e.target.value)}
                  />
                </div>

                {/* Mandatory Checkboxes */}
                <div style={{ marginBottom: '20px' }}>
                  <label className="kc-checkbox-card">
                    <input
                      type="checkbox"
                      required
                      checked={ethicsDeclaration}
                      onChange={e => setEthicsDeclaration(e.target.checked)}
                      className="kc-checkbox-input"
                    />
                    <div>
                      <strong>Human Subjects &amp; Ethics Declaration *</strong>: I confirm this research was conducted
                      in compliance with the Declaration of Helsinki and Institutional Ethics Committee clearance.
                    </div>
                  </label>

                  <label className="kc-checkbox-card">
                    <input
                      type="checkbox"
                      required
                      checked={minorConsentDeclaration}
                      onChange={e => setMinorConsentDeclaration(e.target.checked)}
                      className="kc-checkbox-input"
                    />
                    <div>
                      <strong>Youth &amp; Minor Athletes Protection *</strong>: If research involves junior/school
                      athletes under 18 years, informed written parental/guardian consent was documented in accordance
                      with Indian POCSO and anti-fraud guidelines.
                    </div>
                  </label>

                  <label className="kc-checkbox-card">
                    <input
                      type="checkbox"
                      required
                      checked={licenseDeclaration}
                      onChange={e => setLicenseDeclaration(e.target.checked)}
                      className="kc-checkbox-input"
                    />
                    <div>
                      <strong>Diamond Open Access License *</strong>: I agree to license this preprint under an open
                      access Creative Commons license with zero embargo and zero author fees.
                    </div>
                  </label>
                </div>

                {/* License Picker */}
                <div className="kc-field-group">
                  <label className="kc-field-label">Creative Commons License Selection</label>
                  <div className="kc-license-grid">
                    <div
                      className={`kc-license-card ${licenseType === 'cc-by-nc-nd-4.0' ? 'is-selected' : ''}`}
                      onClick={() => setLicenseType('cc-by-nc-nd-4.0')}
                    >
                      <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a', marginBottom: '4px' }}>
                        CC BY-NC-ND 4.0 (Recommended for Preprints)
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                        Allows download and sharing with attribution; prohibits commercial reuse and derivative alterations.
                      </div>
                    </div>
                    <div
                      className={`kc-license-card ${licenseType === 'cc-by-4.0' ? 'is-selected' : ''}`}
                      onClick={() => setLicenseType('cc-by-4.0')}
                    >
                      <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a', marginBottom: '4px' }}>
                        CC BY 4.0 (Unrestricted Open Access)
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                        Allows full reuse, distribution, and remixing as long as original authors receive proper attribution.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Preprint Card Preview */}
                <div className="kc-live-preview-box">
                  <div className="kc-live-preview-header">
                    <span className="kc-live-preview-title">
                      <SiteIcon name="eye" size={14} />
                      <span>Live Preprint Archive Preview</span>
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1' }}>
                      PROVISIONAL ACCESSION
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <span className="kc-badge-archive" style={{ padding: '2px 8px', fontSize: '11px' }}>
                      {displayCategory}
                    </span>
                    <span className="kc-badge-open-access" style={{ padding: '2px 8px', fontSize: '11px' }}>
                      {ARTICLE_TYPES.find(t => t.id === articleType)?.name || 'Preprint'}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b', alignSelf: 'center' }}>
                      {licenseType.toUpperCase()}
                    </span>
                  </div>

                  <h3 className="kc-preview-paper-title">{displayTitle}</h3>

                  <div className="kc-preview-authors-row">
                    <strong>{primaryAuthorName || 'Corresponding Author'}</strong>
                    {primaryAuthorAffiliation && <span> · {primaryAuthorAffiliation}</span>}
                    {orcid && <span> (ORCID: {orcid})</span>}
                    {coAuthorsText && <span>, {coAuthorsText}</span>}
                  </div>

                  <div className="kc-preview-abstract-box">
                    <strong>Abstract Preview: </strong>
                    {abstract ? (
                      abstract.length > 280 ? `${abstract.substring(0, 280)}...` : abstract
                    ) : (
                      <em>No abstract provided yet. Return to Step 3 to write your abstract.</em>
                    )}
                  </div>

                  {/* Coaching takeaways preview */}
                  {(coachingCue1 || coachingCue2 || coachingCue3) && (
                    <div style={{ background: '#f0fdf4', padding: '10px 14px', borderRadius: '6px', fontSize: '12.5px', color: '#166534', marginBottom: '14px' }}>
                      <strong>Key Field Implications: </strong>
                      <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
                        {coachingCue1 && <li>{coachingCue1}</li>}
                        {coachingCue2 && <li>{coachingCue2}</li>}
                        {coachingCue3 && <li>{coachingCue3}</li>}
                      </ul>
                    </div>
                  )}

                  {/* Provisional Citation Box */}
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginBottom: '6px', fontWeight: 700 }}>
                    PROVISIONAL APA CITATION:
                  </div>
                  <div className="kc-citation-box" style={{ fontSize: '11.5px' }}>
                    {apaCitation}
                  </div>
                </div>
              </div>

              {/* Stepper Navigation Buttons */}
              <div className="kc-step-actions">
                <button
                  type="button"
                  className="kc-btn-secondary"
                  disabled={currentStep === 1}
                  onClick={handlePrevStep}
                >
                  <SiteIcon name="arrow-left" size={14} />
                  <span>Previous Step</span>
                </button>

                {currentStep < 5 ? (
                  <button type="button" className="kc-btn-primary" onClick={handleNextStep}>
                    <span>Next: Step {currentStep + 1}</span>
                    <SiteIcon name="arrow-right" size={14} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="kc-btn-primary"
                    style={{ background: '#16a34a' }}
                  >
                    <SiteIcon name={isSubmitting ? 'loader' : 'upload'} size={16} />
                    <span>{isSubmitting ? 'Submitting to Database Queue...' : 'Submit Manuscript for Screening'}</span>
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Right-Hand Sidebar Resources & Screening Rubric */}
          <aside className="kc-submit-sidebar">
            {/* Screening Criteria Card */}
            <div className="kc-sidebar-card">
              <h3 className="kc-sidebar-title">
                <SiteIcon name="award" size={16} style={{ color: '#0284c7' }} />
                <span>Editorial Screening &amp; Moderation Criteria</span>
              </h3>
              <p style={{ margin: '0 0 12px', fontSize: '13px', lineHeight: 1.6, color: '#475569' }}>
                Following the bioRxiv and SportRxiv model, every submitted manuscript undergoes rapid screening prior
                to public repository indexing:
              </p>
              <ul className="kc-criteria-list">
                <li>
                  <strong>Scope Alignment</strong>: Focus on sports biomechanics, exercise physiology, sports medicine,
                  nutrition, analytics, or Indian sports development.
                </li>
                <li>
                  <strong>Scientific Plausibility</strong>: Clear hypothesis, reproducible methodology description, and
                  appropriate statistical controls.
                </li>
                <li>
                  <strong>Human Subjects &amp; Minor Athletes Protection</strong>: Studies involving youth or school
                  athletes (U-14, U-16, U-18) must document parental/guardian informed consent and Institutional Ethics
                  Committee (IEC) clearance.
                </li>
                <li>
                  <strong>Data Availability</strong>: Authors are encouraged to provide de-identified summary datasets or
                  statements regarding access.
                </li>
                <li>
                  <strong>Non-Clinical Preprint Status</strong>: Manuscripts must not present unverified clinical or
                  therapeutic health claims.
                </li>
              </ul>
            </div>

            {/* Template Download Card */}
            <div className="kc-sidebar-card kc-template-download-card">
              <SiteIcon name="file-text" size={28} style={{ color: '#0284c7', margin: '0 auto 8px' }} />
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                Official KhelChronicle Preprint Template
              </div>
              <p style={{ margin: '6px 0 10px', fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                Download our standard Word / LaTeX formatting guide with predefined sections and metadata headers.
              </p>
              <button
                type="button"
                className="kc-btn-download-template"
                onClick={handleDownloadTemplate}
              >
                <SiteIcon name="download" size={13} />
                <span>Download Template (.md / .docx)</span>
              </button>
            </div>

            {/* Contributing Institutions Social Proof */}
            <div className="kc-sidebar-card">
              <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                Participating Sports Science Institutes
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                Preprints in KhelChronicle are authored by researchers and sports scientists from leading Indian bodies:
              </p>
              <div className="kc-institutions-badge-grid">
                <span className="kc-institution-chip">SAI NSNIS Patiala</span>
                <span className="kc-institution-chip">LNIPE Gwalior</span>
                <span className="kc-institution-chip">Inspire Institute of Sport (IIS)</span>
                <span className="kc-institution-chip">CSS Sri Ramachandra</span>
                <span className="kc-institution-chip">AFMC Pune Sports Medicine</span>
                <span className="kc-institution-chip">Manipal Centre for Sports Science</span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

export default KhelChronicleSubmitPage
