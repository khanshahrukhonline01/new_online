import { useState, useEffect, useRef, type FormEvent, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { RESEARCH_CATEGORIES, type ResearchCategory } from './data/khelchronicleData'
import {
  getChronicleCategories,
  submitChronicleManuscript,
} from '../../integrations/supabase/chronicle-client'
import {
  ATHLETE_COHORT_TIERS,
  SPORTS_GAME_OPTIONS,
  TESTING_ENVIRONMENTS,
  buildSubmissionAbstract,
  buildSubmissionKeywords,
  deserializeDraft,
  formatConsolidatedCoAuthors,
  formatProvisionalCitations,
  isValidHttpsUrl,
  isValidOrcid,
  normalizeOrcid,
  resolveCohortLabel,
  resolveEnvironmentLabel,
  resolveSportLabel,
  serializeDraft,
  validateAllSubmissionSteps,
  validateSubmissionStep,
  type CoAuthor,
  type ManuscriptLicenseType,
} from './submitManuscriptUtils'
import './khelchronicle.css'
import './KhelChronicleSubmitPage.css'

interface KhelChronicleSubmitPageProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

const STORAGE_DRAFT_KEY = 'khelchronicle_manuscript_draft_v1'

const ARTICLE_TYPES = [
  { id: 'preprint', name: 'Original Research Preprint', desc: 'Full empirical or experimental sports science study with primary data' },
  { id: 'protocol', name: 'Field Biomechanics Protocol', desc: 'Standardized testing procedures, sensor mounting, and calibration guidelines' },
  { id: 'review', name: 'Systematic Review / Meta-Analysis', desc: 'PRISMA-compliant synthesis of athletic performance and injury literature' },
  { id: 'dataset', name: 'Benchmark Sports Dataset', desc: 'Open kinematic, physiological, or tracking telemetry callsets with data descriptor' },
  { id: 'casestudy', name: 'Elite Athlete Case Study', desc: 'Unique rehabilitation, biomechanical remodeling, or high-performance intervention' },
]

const REPOSITORY_HOSTS = [
  { name: 'Zenodo (CERN)', url: 'https://zenodo.org', note: 'Free persistent DOI & PDF hosting' },
  { name: 'OSF Preprints', url: 'https://osf.io/preprints', note: 'Open Science Framework archive' },
  { name: 'SportRxiv', url: 'https://sportrxiv.org', note: 'Sports & exercise science preprints' },
  { name: 'Institutional Repo', url: '', note: 'University / SAI / LNIPE HTTPS PDF link' },
]

export function KhelChronicleSubmitPage({ onNavigate }: KhelChronicleSubmitPageProps) {
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [submissionNotice, setSubmissionNotice] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null)
  const [activeCitationTab, setActiveCitationTab] = useState<'apa' | 'vancouver' | 'bibtex' | 'ris'>('apa')
  const [copiedCitation, setCopiedCitation] = useState(false)
  const [categories, setCategories] = useState<ResearchCategory[]>(RESEARCH_CATEGORIES)

  const errorBannerRef = useRef<HTMLDivElement>(null)

  // Primary form data state
  const [articleType, setArticleType] = useState('preprint')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('sports-biomechanics')
  const [sport, setSport] = useState('cricket')
  const [customSport, setCustomSport] = useState('')
  const [athleteCohortTier, setAthleteCohortTier] = useState('state-academy')
  const [keywords, setKeywords] = useState('')

  // Authors state
  const [primaryAuthorName, setPrimaryAuthorName] = useState('')
  const [primaryAuthorEmail, setPrimaryAuthorEmail] = useState('')
  const [primaryAuthorAffiliation, setPrimaryAuthorAffiliation] = useState('')
  const [orcid, setOrcid] = useState('')
  const [coAuthorsText, setCoAuthorsText] = useState('')
  const [coAuthorsList, setCoAuthorsList] = useState<CoAuthor[]>([])

  // Abstract, Testing Context & Coaching cues
  const [abstract, setAbstract] = useState('')
  const [testingEnvironment, setTestingEnvironment] = useState('field-turf')
  const [testingApparatus, setTestingApparatus] = useState('')
  const [coachingCue1, setCoachingCue1] = useState('')
  const [coachingCue2, setCoachingCue2] = useState('')
  const [coachingCue3, setCoachingCue3] = useState('')

  // Files, Preregistration & Data
  const [fullTextOrUrl, setFullTextOrUrl] = useState('')
  const [supplementaryUrl, setSupplementaryUrl] = useState('')
  const [preregistrationUrl, setPreregistrationUrl] = useState('')
  const [dataAvailability, setDataAvailability] = useState('open_access')

  // Ethics, Funding, COI & Clean-Sport Declarations
  const [ethicsClearanceNumber, setEthicsClearanceNumber] = useState('')
  const [fundingStatement, setFundingStatement] = useState('')
  const [conflictsDisclosure, setConflictsDisclosure] = useState('')
  const [ethicsDeclaration, setEthicsDeclaration] = useState(false)
  const [minorConsentDeclaration, setMinorConsentDeclaration] = useState(false)
  const [cleanSportDeclaration, setCleanSportDeclaration] = useState(false)
  const [licenseDeclaration, setLicenseDeclaration] = useState(false)
  const [licenseType, setLicenseType] = useState<ManuscriptLicenseType>('cc-by-nc-nd-4.0')

  const abstractWords = abstract.trim() ? abstract.trim().split(/\s+/).length : 0

  const validationState = {
    title,
    sport,
    customSport,
    keywords,
    primaryAuthorName,
    primaryAuthorEmail,
    primaryAuthorAffiliation,
    orcid,
    coAuthorsList,
    abstract,
    fullTextOrUrl,
    supplementaryUrl,
    preregistrationUrl,
    ethicsClearanceNumber,
    fundingStatement,
    conflictsDisclosure,
    ethicsDeclaration,
    minorConsentDeclaration,
    cleanSportDeclaration,
    licenseDeclaration,
  }

  // Hydrate live research disciplines from Supabase (falling back to local taxonomy)
  useEffect(() => {
    let active = true
    void getChronicleCategories().then(res => {
      if (active && Array.isArray(res.data) && res.data.length > 0) {
        setCategories(res.data)
      }
    })
    return () => {
      active = false
    }
  }, [])

  // Load draft from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const restored = deserializeDraft(localStorage.getItem(STORAGE_DRAFT_KEY))
    if (!restored) return

    if (restored.title) setTitle(restored.title)
    if (restored.category) setCategory(restored.category)
    if (restored.sport) setSport(restored.sport)
    if (restored.customSport !== undefined) setCustomSport(restored.customSport)
    if (restored.athleteCohortTier) setAthleteCohortTier(restored.athleteCohortTier)
    if (restored.articleType) setArticleType(restored.articleType)
    if (restored.keywords !== undefined) setKeywords(restored.keywords)
    if (restored.primaryAuthorName) setPrimaryAuthorName(restored.primaryAuthorName)
    if (restored.primaryAuthorEmail) setPrimaryAuthorEmail(restored.primaryAuthorEmail)
    if (restored.primaryAuthorAffiliation) setPrimaryAuthorAffiliation(restored.primaryAuthorAffiliation)
    if (restored.orcid) setOrcid(restored.orcid)
    if (restored.coAuthorsText) setCoAuthorsText(restored.coAuthorsText)
    if (restored.coAuthorsList && restored.coAuthorsList.length > 0) setCoAuthorsList(restored.coAuthorsList)
    if (restored.abstract) setAbstract(restored.abstract)
    if (restored.testingEnvironment) setTestingEnvironment(restored.testingEnvironment)
    if (restored.testingApparatus !== undefined) setTestingApparatus(restored.testingApparatus)
    if (restored.coachingCue1) setCoachingCue1(restored.coachingCue1)
    if (restored.coachingCue2) setCoachingCue2(restored.coachingCue2)
    if (restored.coachingCue3) setCoachingCue3(restored.coachingCue3)
    if (restored.fullTextOrUrl) setFullTextOrUrl(restored.fullTextOrUrl)
    if (restored.supplementaryUrl) setSupplementaryUrl(restored.supplementaryUrl)
    if (restored.preregistrationUrl !== undefined) setPreregistrationUrl(restored.preregistrationUrl)
    if (restored.dataAvailability) setDataAvailability(restored.dataAvailability)
    if (restored.ethicsClearanceNumber) setEthicsClearanceNumber(restored.ethicsClearanceNumber)
    if (restored.fundingStatement !== undefined) setFundingStatement(restored.fundingStatement)
    if (restored.conflictsDisclosure !== undefined) setConflictsDisclosure(restored.conflictsDisclosure)
    if (restored.licenseType) setLicenseType(restored.licenseType)
    if (restored.currentStep) setCurrentStep(restored.currentStep)
    setDraftSavedAt(
      restored.updatedAt ? `Restored draft from ${restored.updatedAt}` : 'Restored previous draft',
    )
  }, [])

  // Auto-save full wizard state to localStorage on changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    const hasMeaningfulContent = Boolean(
      title ||
        customSport ||
        keywords ||
        primaryAuthorName ||
        primaryAuthorEmail ||
        abstract ||
        testingApparatus ||
        fullTextOrUrl ||
        preregistrationUrl ||
        fundingStatement ||
        conflictsDisclosure ||
        coAuthorsList.length > 0,
    )
    if (!hasMeaningfulContent) return

    const timer = setTimeout(() => {
      try {
        const updatedAt = new Date().toLocaleTimeString()
        const serialized = serializeDraft({
          currentStep,
          articleType,
          title,
          category,
          sport,
          customSport,
          athleteCohortTier,
          keywords,
          primaryAuthorName,
          primaryAuthorEmail,
          primaryAuthorAffiliation,
          orcid,
          coAuthorsText,
          coAuthorsList,
          abstract,
          testingEnvironment,
          testingApparatus,
          coachingCue1,
          coachingCue2,
          coachingCue3,
          fullTextOrUrl,
          supplementaryUrl,
          preregistrationUrl,
          dataAvailability,
          ethicsClearanceNumber,
          fundingStatement,
          conflictsDisclosure,
          licenseType,
          updatedAt,
        })
        localStorage.setItem(STORAGE_DRAFT_KEY, serialized)
        setDraftSavedAt(`Auto-saved at ${updatedAt}`)
      } catch {
        // storage quota full
      }
    }, 800)

    return () => clearTimeout(timer)
  }, [
    currentStep,
    articleType,
    title,
    category,
    sport,
    customSport,
    athleteCohortTier,
    keywords,
    primaryAuthorName,
    primaryAuthorEmail,
    primaryAuthorAffiliation,
    orcid,
    coAuthorsText,
    coAuthorsList,
    abstract,
    testingEnvironment,
    testingApparatus,
    coachingCue1,
    coachingCue2,
    coachingCue3,
    fullTextOrUrl,
    supplementaryUrl,
    preregistrationUrl,
    dataAvailability,
    ethicsClearanceNumber,
    fundingStatement,
    conflictsDisclosure,
    licenseType,
  ])

  const resetAllFields = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_DRAFT_KEY)
    }
    setTitle('')
    setCategory('sports-biomechanics')
    setSport('cricket')
    setCustomSport('')
    setAthleteCohortTier('state-academy')
    setArticleType('preprint')
    setKeywords('')
    setPrimaryAuthorName('')
    setPrimaryAuthorEmail('')
    setPrimaryAuthorAffiliation('')
    setOrcid('')
    setCoAuthorsText('')
    setCoAuthorsList([])
    setAbstract('')
    setTestingEnvironment('field-turf')
    setTestingApparatus('')
    setCoachingCue1('')
    setCoachingCue2('')
    setCoachingCue3('')
    setFullTextOrUrl('')
    setSupplementaryUrl('')
    setPreregistrationUrl('')
    setDataAvailability('open_access')
    setEthicsClearanceNumber('')
    setFundingStatement('')
    setConflictsDisclosure('')
    setEthicsDeclaration(false)
    setMinorConsentDeclaration(false)
    setCleanSportDeclaration(false)
    setLicenseDeclaration(false)
    setLicenseType('cc-by-nc-nd-4.0')
    setDraftSavedAt(null)
    setErrorMessage(null)
    setSubmissionNotice(null)
    setCurrentStep(1)
  }

  const handleClearDraft = () => {
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      if (!window.confirm('Discard your saved manuscript draft and reset all fields?')) {
        return
      }
    }
    resetAllFields()
  }

  const handleLink = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (onNavigate) {
      onNavigate(e, href)
    }
  }

  const insertAbstractTemplate = () => {
    const template = `Background: \nMethods: \nResults: \nConclusion: `
    setAbstract(prev => (prev ? `${prev}\n\n${template}` : template))
  }

  const addCoAuthor = () => {
    const newAuthor: CoAuthor = {
      id: `author-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: '',
      email: '',
      affiliation: '',
      orcid: '',
    }
    setCoAuthorsList(prev => [...prev, newAuthor])
  }

  const updateCoAuthor = (id: string, field: keyof CoAuthor, value: string) => {
    setCoAuthorsList(prev => prev.map(a => (a.id === id ? { ...a, [field]: value } : a)))
  }

  const removeCoAuthor = (id: string) => {
    setCoAuthorsList(prev => prev.filter(a => a.id !== id))
  }

  const handleDownloadTemplate = () => {
    const content = `# KhelChronicle Official Manuscript & Preprint Template (v2026.1)
Author Guidelines & Formatting Standard for Indian Sports Science Research

1. MANUSCRIPT METADATA
- Title: [Concise, informative title, max 160 characters]
- Running Head: [Abbreviated title, max 50 characters]
- Article Type: [Preprint / Field Protocol / Systematic Review / Benchmark Dataset / Case Study]
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
- Data Availability Statement (Link to Zenodo, OSF, or GitHub repository)
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

  const focusErrorBanner = () => {
    window.setTimeout(() => {
      errorBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      errorBannerRef.current?.focus()
    }, 20)
  }

  const validateStep = (step: number): boolean => {
    setErrorMessage(null)
    const result = validateSubmissionStep(step, validationState)
    if (!result.valid) {
      setErrorMessage(result.error || 'Please complete the required fields in this step.')
      focusErrorBanner()
      return false
    }
    return true
  }

  const navigateToStepTab = (targetStep: number) => {
    if (targetStep <= currentStep) {
      setErrorMessage(null)
      setCurrentStep(targetStep)
      return
    }
    for (let s = 1; s < targetStep; s += 1) {
      const check = validateSubmissionStep(s, validationState)
      if (!check.valid) {
        setCurrentStep(s)
        setErrorMessage(check.error || 'Please complete the required fields in this step.')
        focusErrorBanner()
        return
      }
    }
    setErrorMessage(null)
    setCurrentStep(targetStep)
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

  const displayTitle = title.trim() || 'Biomechanical and Physiological Analysis in Indian Athletics'
  const displayCategory = categories.find(c => c.slug === category)?.name || 'Sports Science'
  const resolvedSportLabel = resolveSportLabel(sport, customSport)
  const resolvedCohortLabel = resolveCohortLabel(athleteCohortTier)
  const resolvedEnvironmentLabel = resolveEnvironmentLabel(testingEnvironment)
  const mergedKeywords = buildSubmissionKeywords(keywords, resolvedSportLabel, resolvedCohortLabel)
  const normalizedPrimaryOrcid = normalizeOrcid(orcid)
  const consolidatedCoAuthorsPreview = formatConsolidatedCoAuthors(coAuthorsText, coAuthorsList)

  const {
    apa: apaCitation,
    vancouver: vancouverCitation,
    bibtex: bibtexCitation,
    ris: risCitation,
  } = formatProvisionalCitations({
    primaryAuthorName,
    coAuthorsText,
    coAuthorsList,
    title,
    category,
    keywords: mergedKeywords,
    submissionId,
  })

  const copyCitationToClipboard = (text: string) => {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(text)
      setCopiedCitation(true)
      setTimeout(() => setCopiedCitation(false), 2000)
    }
  }

  const downloadCitationFile = (content: string, filename: string, mimeType: string) => {
    if (typeof window === 'undefined') return
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const citationFileStem = (submissionId || 'KhelChronicle-Provisional')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-|-$/g, '')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSubmissionNotice(null)

    const fullValidation = validateAllSubmissionSteps(validationState)
    if (!fullValidation.valid) {
      if (fullValidation.firstInvalidStep) {
        setCurrentStep(fullValidation.firstInvalidStep)
      }
      setErrorMessage(fullValidation.error || 'Please resolve validation errors before submitting.')
      focusErrorBanner()
      return
    }

    const consolidatedCoAuthors = formatConsolidatedCoAuthors(coAuthorsText, coAuthorsList)
    const submissionAbstract = buildSubmissionAbstract(
      abstract,
      [coachingCue1, coachingCue2, coachingCue3],
      {
        sportLabel: resolvedSportLabel,
        cohortLabel: resolvedCohortLabel,
        testingEnvironmentLabel: resolvedEnvironmentLabel,
        testingApparatus,
        preregistrationUrl: preregistrationUrl.trim(),
        fundingStatement,
        conflictsDisclosure,
        cleanSportAttested: cleanSportDeclaration,
      },
    )

    setIsSubmitting(true)

    try {
      const res = await submitChronicleManuscript({
        manuscript_title: title,
        category_slug: category,
        primary_author_name: primaryAuthorName,
        primary_author_email: primaryAuthorEmail,
        primary_author_affiliation: primaryAuthorAffiliation,
        orcid: normalizedPrimaryOrcid || undefined,
        co_authors: consolidatedCoAuthors || undefined,
        article_type: articleType,
        abstract_text: submissionAbstract,
        keywords: mergedKeywords || keywords,
        full_text_or_url: fullTextOrUrl,
        supplementary_url: supplementaryUrl || undefined,
        data_availability: dataAvailability,
        ethics_clearance_number: ethicsClearanceNumber,
        human_ethics_confirmed: ethicsDeclaration,
        minor_consent_confirmed: minorConsentDeclaration,
        license_type: licenseType,
        license_confirmed: licenseDeclaration,
      })

      if (res.status === 'submitted') {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_DRAFT_KEY)
        }
        setDraftSavedAt(null)
        setSubmissionId(res.submissionId)
        setSubmissionNotice('Manuscript successfully entered into the KhelChronicle peer-screening database queue.')
      } else if (res.status === 'unconfigured') {
        setSubmissionNotice(res.message)
      } else {
        setErrorMessage(res.message)
        focusErrorBanner()
      }
    } catch {
      setErrorMessage('Unexpected transmission error. Please check your network and try again.')
      focusErrorBanner()
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setSubmissionId(null)
    resetAllFields()
  }

  const trimmedManuscriptUrl = fullTextOrUrl.trim()
  const hasValidManuscriptUrl = isValidHttpsUrl(trimmedManuscriptUrl)
  const trimmedSupplementaryUrl = supplementaryUrl.trim()
  const hasValidSupplementaryUrl = !trimmedSupplementaryUrl || isValidHttpsUrl(trimmedSupplementaryUrl)
  const trimmedPreregistrationUrl = preregistrationUrl.trim()
  const hasValidPreregistrationUrl = !trimmedPreregistrationUrl || isValidHttpsUrl(trimmedPreregistrationUrl)

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
              <button
                type="button"
                className="kc-draft-btn-clear"
                onClick={handleClearDraft}
                title="Discard saved draft"
              >
                Clear Draft
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Success State */}
      {submissionId ? (
        <div className="kc-success-card">
          <SiteIcon name="check-circle" size={48} className="kc-success-icon" />
          <h2 className="kc-success-heading">
            Manuscript Received for Editorial Screening
          </h2>
          <div className="kc-success-badge-id">
            <SiteIcon name="file-text" size={14} />
            <span>Accession Queue Reference: {submissionId}</span>
          </div>

          <p className="kc-success-lead">
            Thank you! Your manuscript &ldquo;{title || 'Sports Science Research'}&rdquo; has been registered in the
            KhelChronicle database screening table. Our moderation desk will audit formatting, data availability, and
            ethical clearances within 2 business days.
          </p>

          {submissionNotice && (
            <p className="kc-success-notice">
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
              <div className="kc-timeline-step-num is-progress">Step 2 · In Progress</div>
              <div className="kc-timeline-step-title">Editorial &amp; Ethics Check</div>
              <div className="kc-timeline-step-sub">Scope alignment, IEC clearance number, and POCSO youth protection audit (48h).</div>
            </div>
            <div className="kc-timeline-item">
              <div className="kc-timeline-step-num is-pending">Step 3 · Pending</div>
              <div className="kc-timeline-step-title">Public Repository Indexing</div>
              <div className="kc-timeline-step-sub">Publication on KhelChronicle with assigned DOI and Schema.org ScholarlyArticle metadata.</div>
            </div>
          </div>

          {/* Provisional Citation Box */}
          <div className="kc-success-citation-wrap">
            <div className="kc-success-citation-header">
              <span className="kc-success-citation-label">
                Provisional Citation Format (Cite While Pending)
              </span>
              <div className="kc-citation-actions-row">
                <button
                  type="button"
                  className="kc-template-btn"
                  onClick={() =>
                    copyCitationToClipboard(
                      activeCitationTab === 'apa'
                        ? apaCitation
                        : activeCitationTab === 'vancouver'
                          ? vancouverCitation
                          : activeCitationTab === 'bibtex'
                            ? bibtexCitation
                            : risCitation,
                    )
                  }
                >
                  {copiedCitation ? 'Copied to Clipboard!' : 'Copy Citation'}
                </button>
                <button
                  type="button"
                  className="kc-template-btn"
                  onClick={() =>
                    downloadCitationFile(bibtexCitation, `${citationFileStem}.bib`, 'application/x-bibtex')
                  }
                >
                  Download .BIB
                </button>
                <button
                  type="button"
                  className="kc-template-btn"
                  onClick={() =>
                    downloadCitationFile(risCitation, `${citationFileStem}.ris`, 'application/x-research-info-systems')
                  }
                >
                  Download .RIS
                </button>
              </div>
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
                <button
                  type="button"
                  className={`kc-citation-tab-btn ${activeCitationTab === 'ris' ? 'is-active' : ''}`}
                  onClick={() => setActiveCitationTab('ris')}
                >
                  RIS
                </button>
              </div>
              <div style={{ whiteSpace: activeCitationTab === 'bibtex' || activeCitationTab === 'ris' ? 'pre-wrap' : 'normal' }}>
                {activeCitationTab === 'apa'
                  ? apaCitation
                  : activeCitationTab === 'vancouver'
                    ? vancouverCitation
                    : activeCitationTab === 'bibtex'
                      ? bibtexCitation
                      : risCitation}
              </div>
            </div>
          </div>

          <div className="kc-success-actions">
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
                {[
                  { step: 1, label: '1. Article & Category' },
                  { step: 2, label: '2. Authors & Affiliations' },
                  { step: 3, label: '3. Abstract & Takeaways' },
                  { step: 4, label: '4. Files & Data' },
                  { step: 5, label: '5. Ethics & Preview' },
                ].map(item => (
                  <button
                    key={item.step}
                    type="button"
                    aria-current={currentStep === item.step ? 'step' : undefined}
                    className={`kc-step-tab ${currentStep === item.step ? 'is-active' : ''} ${currentStep > item.step ? 'is-completed' : ''}`}
                    onClick={() => navigateToStepTab(item.step)}
                  >
                    <span className="kc-step-badge">{currentStep > item.step ? '✓' : item.step}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Main Form Body */}
            <form onSubmit={handleSubmit} noValidate className="kc-submit-form-card">
              {errorMessage && (
                <div
                  ref={errorBannerRef}
                  tabIndex={-1}
                  role="alert"
                  className="kc-form-alert kc-form-alert-error"
                >
                  <SiteIcon name="alert-circle" size={16} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {submissionNotice && !submissionId && (
                <div role="status" className="kc-form-alert kc-form-alert-warning">
                  <SiteIcon name="info" size={16} />
                  <span>{submissionNotice}</span>
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
                        aria-pressed={articleType === t.id}
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
                    <span className="kc-field-hint">{title.length} / 160 characters (min 5)</span>
                  </label>
                  <input
                    id="manuscript-title"
                    type="text"
                    maxLength={160}
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
                    {categories.map(c => (
                      <option key={c.id} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="kc-grid-2col kc-field-group">
                  <div>
                    <label htmlFor="sport-discipline" className="kc-field-label">
                      Sport / Game *
                    </label>
                    <select
                      id="sport-discipline"
                      className="kc-select"
                      value={sport}
                      onChange={e => setSport(e.target.value)}
                    >
                      {SPORTS_GAME_OPTIONS.map(opt => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="athlete-cohort-tier" className="kc-field-label">
                      Athlete Cohort Tier *
                    </label>
                    <select
                      id="athlete-cohort-tier"
                      className="kc-select"
                      value={athleteCohortTier}
                      onChange={e => setAthleteCohortTier(e.target.value)}
                    >
                      {ATHLETE_COHORT_TIERS.map(tier => (
                        <option key={tier.id} value={tier.id}>
                          {tier.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {sport === 'other' && (
                  <div className="kc-field-group">
                    <label htmlFor="custom-sport-name" className="kc-field-label">
                      Specify Sport or Traditional Game *
                    </label>
                    <input
                      id="custom-sport-name"
                      type="text"
                      required
                      maxLength={80}
                      className="kc-input-text"
                      placeholder="e.g. Kalaripayattu, Sepak Takraw, Silambam, Lagori"
                      value={customSport}
                      onChange={e => setCustomSport(e.target.value)}
                    />
                  </div>
                )}

                <div className="kc-field-group">
                  <label htmlFor="keywords-input" className="kc-field-label">
                    <span>Keywords (comma-separated) *</span>
                    <span className="kc-field-hint">Sport &amp; Cohort Tier tags are indexed automatically</span>
                  </label>
                  <input
                    id="keywords-input"
                    type="text"
                    required
                    className="kc-input-text"
                    placeholder="e.g. Fast Bowling, Ground Reaction Force, Lumbar Spine, Biomechanics"
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
                        <span className="kc-field-hint">
                          {orcid.trim() && !isValidOrcid(orcid) ? 'Invalid 16-digit format' : '16-digit format'}
                        </span>
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
                  <div className="kc-authors-header-row">
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
                        <span className="kc-author-row-title">Co-Author #{index + 1}</span>
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
                          <label htmlFor={`coauthor-name-${author.id}`} className="kc-field-label">Full Name *</label>
                          <input
                            id={`coauthor-name-${author.id}`}
                            type="text"
                            className="kc-input-text"
                            placeholder="e.g. Prof. R. K. Sharma"
                            value={author.name}
                            onChange={e => updateCoAuthor(author.id, 'name', e.target.value)}
                          />
                        </div>
                        <div>
                          <label htmlFor={`coauthor-aff-${author.id}`} className="kc-field-label">Institutional Affiliation</label>
                          <input
                            id={`coauthor-aff-${author.id}`}
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
                          <label htmlFor={`coauthor-email-${author.id}`} className="kc-field-label">Author Email</label>
                          <input
                            id={`coauthor-email-${author.id}`}
                            type="email"
                            className="kc-input-text"
                            placeholder="coauthor@institution.edu.in"
                            value={author.email}
                            onChange={e => updateCoAuthor(author.id, 'email', e.target.value)}
                          />
                        </div>
                        <div>
                          <label htmlFor={`coauthor-orcid-${author.id}`} className="kc-field-label">ORCID iD</label>
                          <input
                            id={`coauthor-orcid-${author.id}`}
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
                    <div className="kc-abstract-tool-actions">
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

                {/* Testing Context & Apparatus */}
                <div className="kc-context-card">
                  <div className="kc-context-card-title">
                    <SiteIcon name="chart" size={16} />
                    <span>Testing Context &amp; Apparatus</span>
                  </div>
                  <p className="kc-context-card-desc">
                    Document the sports testing surface, sensors, or match-analysis setting so peers can evaluate ecological validity.
                  </p>
                  <div className="kc-grid-2col">
                    <div>
                      <label htmlFor="testing-environment" className="kc-field-label">
                        Testing Environment *
                      </label>
                      <select
                        id="testing-environment"
                        className="kc-select"
                        value={testingEnvironment}
                        onChange={e => setTestingEnvironment(e.target.value)}
                      >
                        {TESTING_ENVIRONMENTS.map(env => (
                          <option key={env.id} value={env.id}>
                            {env.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="testing-apparatus" className="kc-field-label">
                        Apparatus, Sensors &amp; Sample Specs (Optional)
                      </label>
                      <input
                        id="testing-apparatus"
                        type="text"
                        maxLength={180}
                        className="kc-input-text"
                        placeholder="e.g. n=42 bowlers, 240 Hz Vicon + dual Kistler force plates"
                        value={testingApparatus}
                        onChange={e => setTestingApparatus(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Field Implications for Coaches */}
                <div className="kc-coaching-cues-card">
                  <div className="kc-coaching-cues-title">
                    <SiteIcon name="award" size={16} />
                    <span>Field Implications for Grassroots Coaches &amp; Scouts</span>
                  </div>
                  <p className="kc-coaching-cues-desc">
                    Translate complex biomechanics or physiological data into up to 3 actionable coaching cues (included in
                    your submitted editorial summary):
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input
                      type="text"
                      aria-label="Coaching Takeaway 1"
                      className="kc-input-text"
                      placeholder="Takeaway 1: e.g. Limit junior fast bowlers to maximum 30 match-intensity deliveries per spell to avoid lumbar bone stress"
                      value={coachingCue1}
                      onChange={e => setCoachingCue1(e.target.value)}
                    />
                    <input
                      type="text"
                      aria-label="Coaching Takeaway 2"
                      className="kc-input-text"
                      placeholder="Takeaway 2: e.g. Implement frontal plane knee valgus screening during single-leg landing combine drills"
                      value={coachingCue2}
                      onChange={e => setCoachingCue2(e.target.value)}
                    />
                    <input
                      type="text"
                      aria-label="Coaching Takeaway 3"
                      className="kc-input-text"
                      placeholder="Takeaway 3: e.g. Incorporate eccentric hamstring periodization during pre-monsoon conditioning camps"
                      value={coachingCue3}
                      onChange={e => setCoachingCue3(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* STEP 4: Manuscript Link & Supplementary Datasets */}
              <div className={`kc-step-panel ${currentStep === 4 ? 'is-active' : ''}`}>
                <h2 className="kc-step-heading">Step 4: Manuscript Link &amp; Supplementary Data</h2>
                <p className="kc-step-desc">
                  Provide a secure HTTPS link to your complete manuscript PDF or institutional preprint record, plus an
                  optional link to open datasets or analysis scripts.
                </p>

                <div className="kc-repo-guide-card">
                  <div className="kc-repo-guide-header">
                    <SiteIcon name="external-link" size={16} />
                    <span>Recommended Open Repository Hosting (HTTPS Required)</span>
                  </div>
                  <p className="kc-repo-guide-desc">
                    Direct file uploads are not hosted on KhelChronicle yet. Host your PDF on any open science or
                    institutional repository below and paste its public HTTPS link:
                  </p>
                  <div className="kc-repo-chip-grid">
                    {REPOSITORY_HOSTS.map(host =>
                      host.url ? (
                        <a
                          key={host.name}
                          href={host.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="kc-repo-chip"
                        >
                          <strong>{host.name}</strong>
                          <span>{host.note}</span>
                        </a>
                      ) : (
                        <div key={host.name} className="kc-repo-chip is-static">
                          <strong>{host.name}</strong>
                          <span>{host.note}</span>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                <div className="kc-field-group">
                  <label htmlFor="manuscript-url" className="kc-field-label">
                    <span>Manuscript Full-Text Link (PDF URL or Institutional Repository Link) *</span>
                    {trimmedManuscriptUrl && (
                      <span className={`kc-url-status ${hasValidManuscriptUrl ? 'is-valid' : 'is-invalid'}`}>
                        {hasValidManuscriptUrl ? 'Valid HTTPS link' : 'Must start with https://'}
                      </span>
                    )}
                  </label>
                  <input
                    id="manuscript-url"
                    type="url"
                    required
                    className="kc-input-text"
                    placeholder="https://zenodo.org/records/... or https://institution.edu.in/paper.pdf"
                    value={fullTextOrUrl}
                    onChange={e => setFullTextOrUrl(e.target.value)}
                  />
                </div>

                <div className="kc-grid-2col">
                  <div>
                    <label htmlFor="supplementary-url" className="kc-field-label">
                      <span>Supplementary Data or Code Link (Optional)</span>
                      {trimmedSupplementaryUrl && (
                        <span className={`kc-url-status ${hasValidSupplementaryUrl ? 'is-valid' : 'is-invalid'}`}>
                          {hasValidSupplementaryUrl ? 'Valid HTTPS' : 'HTTPS required'}
                        </span>
                      )}
                    </label>
                    <input
                      id="supplementary-url"
                      type="url"
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

                <div className="kc-field-group" style={{ marginTop: '18px' }}>
                  <label htmlFor="preregistration-url" className="kc-field-label">
                    <span>Study Preregistration URL (OSF / CTRI / ClinicalTrials) (Optional)</span>
                    {trimmedPreregistrationUrl && (
                      <span className={`kc-url-status ${hasValidPreregistrationUrl ? 'is-valid' : 'is-invalid'}`}>
                        {hasValidPreregistrationUrl ? 'Valid HTTPS' : 'HTTPS required'}
                      </span>
                    )}
                  </label>
                  <input
                    id="preregistration-url"
                    type="url"
                    className="kc-input-text"
                    placeholder="https://osf.io/registries/... or https://ctri.nic.in/..."
                    value={preregistrationUrl}
                    onChange={e => setPreregistrationUrl(e.target.value)}
                  />
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
                    required
                    className="kc-input-text"
                    placeholder="Enter institutional approval protocol or documented not-applicable declaration"
                    value={ethicsClearanceNumber}
                    onChange={e => setEthicsClearanceNumber(e.target.value)}
                  />
                </div>

                {/* Funding & Conflicts of Interest Disclosures */}
                <div className="kc-disclosure-grid kc-grid-2col kc-field-group">
                  <div>
                    <div className="kc-field-label">
                      <label htmlFor="funding-statement">Funding Statement *</label>
                      <button
                        type="button"
                        className="kc-quickfill-btn"
                        onClick={() => setFundingStatement('No external funding received.')}
                      >
                        No external funding
                      </button>
                    </div>
                    <input
                      id="funding-statement"
                      type="text"
                      required
                      maxLength={220}
                      className="kc-input-text"
                      placeholder="e.g. SAI Target Olympic Podium Scheme Grant #2026 or No external funding received"
                      value={fundingStatement}
                      onChange={e => setFundingStatement(e.target.value)}
                    />
                  </div>

                  <div>
                    <div className="kc-field-label">
                      <label htmlFor="conflicts-disclosure">Conflicts of Interest *</label>
                      <button
                        type="button"
                        className="kc-quickfill-btn"
                        onClick={() => setConflictsDisclosure('None declared.')}
                      >
                        None declared
                      </button>
                    </div>
                    <input
                      id="conflicts-disclosure"
                      type="text"
                      required
                      maxLength={220}
                      className="kc-input-text"
                      placeholder="e.g. Consultant to Assam Athletics Federation or None declared"
                      value={conflictsDisclosure}
                      onChange={e => setConflictsDisclosure(e.target.value)}
                    />
                  </div>
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
                      <strong>Human Subjects &amp; Ethics Declaration *</strong>: I confirm that human-participant research has appropriate IEC/IRB clearance, or that formal review is documented as not applicable.
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
                      <strong>Youth &amp; Minor Athletes Protection *</strong>: I confirm either that no participants under 18 are included, or that informed written parental/guardian consent is documented for every minor participant, in accordance with applicable Indian law.
                    </div>
                  </label>

                  <label className="kc-checkbox-card">
                    <input
                      type="checkbox"
                      required
                      checked={cleanSportDeclaration}
                      onChange={e => setCleanSportDeclaration(e.target.checked)}
                      className="kc-checkbox-input"
                    />
                    <div>
                      <strong>NADA / WADA Clean-Sport &amp; Non-Clinical Attestation *</strong>: I confirm that reported protocols comply with WADA / NADA prohibited-substance rules, make no unverified medical claims, and de-identify individual biological passport or testing records.
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
                      <strong>Diamond Open Access License *</strong>: I confirm I have the rights to grant the selected
                      Creative Commons licence and understand that it will apply to the public manuscript if approved with zero embargo and zero author fees.
                    </div>
                  </label>
                </div>

                {/* Accessible License Picker */}
                <div className="kc-field-group">
                  <span id="cc-license-group-label" className="kc-field-label">
                    Creative Commons License Selection
                  </span>
                  <div className="kc-license-grid" role="radiogroup" aria-labelledby="cc-license-group-label">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={licenseType === 'cc-by-nc-nd-4.0'}
                      className={`kc-license-card ${licenseType === 'cc-by-nc-nd-4.0' ? 'is-selected' : ''}`}
                      onClick={() => setLicenseType('cc-by-nc-nd-4.0')}
                    >
                      <div className="kc-license-card-title">CC BY-NC-ND 4.0</div>
                      <div className="kc-license-card-desc">
                        Allows download and sharing with attribution; prohibits commercial reuse and derivative alterations.
                      </div>
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={licenseType === 'cc-by-4.0'}
                      className={`kc-license-card ${licenseType === 'cc-by-4.0' ? 'is-selected' : ''}`}
                      onClick={() => setLicenseType('cc-by-4.0')}
                    >
                      <div className="kc-license-card-title">CC BY 4.0 (Attribution)</div>
                      <div className="kc-license-card-desc">
                        Allows full reuse, distribution, and remixing as long as original authors receive proper attribution.
                      </div>
                    </button>
                  </div>
                </div>

                {/* Live Preprint Card Preview */}
                <div className="kc-live-preview-box">
                  <div className="kc-live-preview-header">
                    <span className="kc-live-preview-title">
                      <SiteIcon name="eye" size={14} />
                      <span>Live Preprint Archive Preview</span>
                    </span>
                    <span className="kc-preview-status-pill">PROVISIONAL ACCESSION</span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <span className="kc-badge-archive" style={{ padding: '2px 8px', fontSize: '11px' }}>
                      {displayCategory}
                    </span>
                    <span className="kc-preview-sport-pill">{resolvedSportLabel}</span>
                    <span className="kc-preview-cohort-pill">{resolvedCohortLabel}</span>
                    <span className="kc-badge-open-access" style={{ padding: '2px 8px', fontSize: '11px' }}>
                      {ARTICLE_TYPES.find(t => t.id === articleType)?.name || 'Preprint'}
                    </span>
                    {trimmedPreregistrationUrl && hasValidPreregistrationUrl && (
                      <span className="kc-preview-prereg-pill">PREREGISTERED</span>
                    )}
                    <span className="kc-preview-license-tag">{licenseType.toUpperCase()}</span>
                  </div>

                  <h3 className="kc-preview-paper-title">{displayTitle}</h3>

                  <div className="kc-preview-authors-row">
                    <strong>{primaryAuthorName || 'Corresponding Author'}</strong>
                    {primaryAuthorAffiliation && <span> · {primaryAuthorAffiliation}</span>}
                    {normalizedPrimaryOrcid && <span> (ORCID: {normalizedPrimaryOrcid})</span>}
                    {consolidatedCoAuthorsPreview && <span>, {consolidatedCoAuthorsPreview}</span>}
                  </div>

                  <div className="kc-preview-abstract-box">
                    <strong>Abstract Preview: </strong>
                    {abstract ? (
                      abstract.length > 280 ? `${abstract.substring(0, 280)}...` : abstract
                    ) : (
                      <em>No abstract provided yet. Return to Step 3 to write your abstract.</em>
                    )}
                  </div>

                  <div className="kc-preview-meta-summary">
                    <div>
                      <strong>Testing Context: </strong>
                      <span>
                        {resolvedEnvironmentLabel}
                        {testingApparatus.trim() ? ` · ${testingApparatus.trim()}` : ''}
                      </span>
                    </div>
                    <div>
                      <strong>Disclosures: </strong>
                      <span>
                        Funding: {fundingStatement.trim() || 'Pending'} · COI: {conflictsDisclosure.trim() || 'Pending'}
                        {cleanSportDeclaration ? ' · NADA/WADA Clean-Sport Attested' : ''}
                      </span>
                    </div>
                  </div>

                  {(coachingCue1 || coachingCue2 || coachingCue3) && (
                    <div className="kc-preview-cues-box">
                      <strong>Key Field Implications: </strong>
                      <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
                        {coachingCue1 && <li>{coachingCue1}</li>}
                        {coachingCue2 && <li>{coachingCue2}</li>}
                        {coachingCue3 && <li>{coachingCue3}</li>}
                      </ul>
                    </div>
                  )}

                  <div className="kc-preview-citation-label">PROVISIONAL APA CITATION &amp; EXPORT:</div>
                  <div className="kc-citation-box" style={{ fontSize: '11.5px' }}>
                    {apaCitation}
                  </div>
                  <div className="kc-citation-actions-row">
                    <button
                      type="button"
                      className="kc-template-btn"
                      onClick={() =>
                        downloadCitationFile(bibtexCitation, `${citationFileStem}.bib`, 'application/x-bibtex')
                      }
                    >
                      Download .BIB
                    </button>
                    <button
                      type="button"
                      className="kc-template-btn"
                      onClick={() =>
                        downloadCitationFile(risCitation, `${citationFileStem}.ris`, 'application/x-research-info-systems')
                      }
                    >
                      Download .RIS
                    </button>
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
                    className="kc-btn-primary kc-btn-submit-final"
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
            <div className="kc-sidebar-card">
              <h3 className="kc-sidebar-title">
                <SiteIcon name="award" size={16} className="kc-sidebar-icon" />
                <span>Editorial Screening &amp; Moderation Criteria</span>
              </h3>
              <p className="kc-sidebar-lead">
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
              <SiteIcon name="file-text" size={28} className="kc-template-icon" />
              <div className="kc-template-title">Official KhelChronicle Preprint Template</div>
              <p className="kc-template-desc">
                Download our structured Markdown formatting guide with predefined sections and metadata headers.
              </p>
              <button
                type="button"
                className="kc-btn-download-template"
                onClick={handleDownloadTemplate}
              >
                <SiteIcon name="download" size={13} />
                <span>Download Template (.md)</span>
              </button>
            </div>

            {/* Contributing Institutions Social Proof */}
            <div className="kc-sidebar-card">
              <div className="kc-institutions-title">Participating Sports Science Institutes</div>
              <p className="kc-institutions-desc">
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
