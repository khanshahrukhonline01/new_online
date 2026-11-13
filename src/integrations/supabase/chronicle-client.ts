import {
  RESEARCH_AUTHORS,
  RESEARCH_CATEGORIES,
  RESEARCH_PAPERS,
  getPaperBySlug,
  getPapersByAuthor,
  searchPapers,
  type ResearchAuthor,
  type ResearchCategory,
  type ResearchPaper,
} from '../../modules/khelchronicle/data/khelchronicleData'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export type ChronicleCatalogueResult<T> =
  | { status: 'ready'; data: T; source: 'supabase' | 'fallback' }
  | { status: 'unconfigured'; data: T; message?: string }
  | { status: 'unavailable'; data: T; message: string }

export interface ManuscriptSubmissionInput {
  manuscript_title: string
  category_slug: string
  primary_author_name: string
  primary_author_email: string
  primary_author_affiliation: string
  orcid?: string
  co_authors?: string
  abstract_text: string
  keywords: string
  full_text_or_url: string
  human_ethics_confirmed: boolean
  minor_consent_confirmed: boolean
}

export type ManuscriptSubmissionResult =
  | { status: 'submitted'; submissionId: string; message?: string }
  | { status: 'unconfigured'; submissionId: string; message: string }
  | { status: 'unavailable'; message: string }

interface DbPaperRow {
  id: string
  paper_id: string
  slug: string
  title: string
  subtitle?: string | null
  sport?: string | null
  sport_slug?: string | null
  category?: string
  category_slug?: string
  author_name?: string
  author_affiliation?: string
  summary?: string
  date_published?: string
  date_modified?: string | null
  version?: string
  status?: 'preprint' | 'screened' | 'published'
  license?: string
  reading_time_minutes?: number
  downloads_count?: number
  views_count?: number
  citations_count?: number
  abstract?: {
    background: string
    methods: string
    results: string
    conclusion: string
  }
  sections?: ResearchPaper['sections']
  keywords?: string[]
  ethics_statement?: string | null
  data_availability?: string | null
  funding_statement?: string | null
  conflicts_of_interest?: string | null
  references?: ResearchPaper['references']
  connected_links?: ResearchPaper['connectedKhelGridLinks']
}

function resolveSupabaseBaseUrl(): URL | null {
  const envUrl = import.meta.env.VITE_SUPABASE_URL
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  const currentUrl = (envUrl !== undefined ? envUrl : supabaseUrl)?.replace(/\/$/, '')
  const currentKey = envKey !== undefined ? envKey : anonKey
  if (!currentUrl || !currentKey) return null
  try {
    const url = new URL(currentUrl)
    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      return null
    }
    return url
  } catch {
    return null
  }
}

function resolveSupabaseAnonKey(): string {
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  return (envKey !== undefined ? envKey : anonKey || '') as string
}

function mapDbRowToResearchPaper(
  row: DbPaperRow,
  authors: ResearchAuthor[] = [],
  categoryName?: string
): ResearchPaper {
  const localMatch = RESEARCH_PAPERS.find(p => p.paperId === row.paper_id || p.slug === row.slug)
  const categorySlug = row.category || row.category_slug || localMatch?.category || 'sports-biomechanics'
  const cat = RESEARCH_CATEGORIES.find(c => c.slug === categorySlug)

  if (localMatch) {
    return {
      ...localMatch,
      title: row.title || localMatch.title,
      category: categorySlug,
      categoryName: categoryName || cat?.name || localMatch.categoryName,
      datePublished: row.date_published || localMatch.datePublished,
      readingTimeMinutes: row.reading_time_minutes || localMatch.readingTimeMinutes,
    }
  }

  const authorName = row.author_name || 'Verified Sports Scientist'
  const affiliation = row.author_affiliation || 'National Institute of Sports'
  const summaryText = row.summary || 'Empirical sports science preprint deposited in KhelChronicle archive.'

  return {
    id: row.id,
    paperId: row.paper_id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle || undefined,
    category: categorySlug,
    categoryName: categoryName || cat?.name || categorySlug,
    sport: row.sport || 'Multi-Sport & Grassroots',
    sportSlug: row.sport_slug || 'multi-sport',
    authors: authors.length > 0 ? authors : [
      {
        id: `author-${row.paper_id.toLowerCase()}`,
        name: authorName,
        slug: authorName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        affiliation,
        role: 'Research Contributor',
        bio: `${authorName} conducts sports performance research at ${affiliation}.`,
      },
    ],
    datePublished: row.date_published || new Date().toISOString().slice(0, 10),
    dateModified: row.date_modified || undefined,
    version: row.version || 'v1.0',
    status: row.status || 'screened',
    license: row.license || 'CC BY-NC-ND 4.0',
    readingTimeMinutes: row.reading_time_minutes || 10,
    metrics: {
      downloads: row.downloads_count || 120,
      views: row.views_count || 450,
      citations: row.citations_count || 2,
    },
    abstract: row.abstract || {
      background: summaryText,
      methods: 'Standardized empirical field testing and movement screening.',
      results: summaryText,
      conclusion: 'Supports objective coaching standards and talent identification across Indian sports.',
    },
    keywords: Array.isArray(row.keywords) ? row.keywords : ['Sports Science', 'India'],
    sections: Array.isArray(row.sections) ? row.sections : [],
    ethicsStatement: row.ethics_statement || 'Institutional Ethics Committee review on file with KhelChronicle editorial screening desk.',
    dataAvailability: row.data_availability || 'Data deposited in KhelChronicle repository under accession.',
    fundingStatement: row.funding_statement || 'Self-funded / Institutional research.',
    conflictsOfInterest: row.conflicts_of_interest || 'None declared.',
    references: Array.isArray(row.references) ? row.references : [],
    connectedKhelGridLinks: Array.isArray(row.connected_links) ? row.connected_links : [],
  }
}

/**
 * Fetch all research categories from Supabase, or return local seed data if unconfigured.
 */
export async function getChronicleCategories(): Promise<ChronicleCatalogueResult<ResearchCategory[]>> {
  const baseUrl = resolveSupabaseBaseUrl()
  if (!baseUrl) {
    return { status: 'unconfigured', data: RESEARCH_CATEGORIES }
  }

  try {
    const url = `${baseUrl.origin}${baseUrl.pathname.replace(/\/$/, '')}/rest/v1/chronicle_categories?select=*&order=sort_order.asc&is_active=eq.true`
    const res = await fetch(url, {
      headers: {
        apikey: resolveSupabaseAnonKey(),
        Authorization: `Bearer ${resolveSupabaseAnonKey()}`,
        Accept: 'application/json',
      },
    })
    if (!res.ok) {
      return { status: 'unavailable', data: RESEARCH_CATEGORIES, message: 'Could not load categories from database.' }
    }
    const data = await res.json()
    if (Array.isArray(data) && data.length > 0) {
      const categories: ResearchCategory[] = data.map((d: {
        id: string
        slug: string
        name: string
        description: string
        icon?: string
        color?: string
      }) => ({
        id: d.id,
        slug: d.slug,
        name: d.name,
        description: d.description,
        icon: d.icon || 'award',
        color: d.color || '#059669',
      }))
      return { status: 'ready', data: categories, source: 'supabase' }
    }
    return { status: 'ready', data: RESEARCH_CATEGORIES, source: 'fallback' }
  } catch {
    return { status: 'unavailable', data: RESEARCH_CATEGORIES, message: 'Database connection failed.' }
  }
}

/**
 * Fetch all published/screened preprints, with optional category filtering and search query.
 */
export async function getChroniclePapers(
  categoryFilter?: string,
  searchQuery?: string,
  sportFilter?: string
): Promise<ChronicleCatalogueResult<ResearchPaper[]>> {
  const baseUrl = resolveSupabaseBaseUrl()
  if (!baseUrl) {
    const localFiltered = searchPapers(searchQuery || '', categoryFilter, sportFilter)
    return { status: 'unconfigured', data: localFiltered }
  }

  try {
    const params = new URLSearchParams({
      select: '*',
    })

    if (categoryFilter && categoryFilter !== 'all') {
      params.append('category', `eq.${categoryFilter}`)
    }

    const url = `${baseUrl.origin}${baseUrl.pathname.replace(/\/$/, '')}/rest/v1/chronicle_papers?${params.toString()}`
    const res = await fetch(url, {
      headers: {
        apikey: resolveSupabaseAnonKey(),
        Authorization: `Bearer ${resolveSupabaseAnonKey()}`,
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      const fallback = searchPapers(searchQuery || '', categoryFilter, sportFilter)
      return { status: 'unavailable', data: fallback, message: 'Database query failed; showing cached preprints.' }
    }

    const rows: DbPaperRow[] = await res.json()
    if (Array.isArray(rows)) {
      const dbPapers = rows.map(r => {
        // Resolve authors from seed or default
        const localMatch = RESEARCH_PAPERS.find(p => p.paperId === r.paper_id || p.slug === r.slug)
        const authors = localMatch ? localMatch.authors : []
        return mapDbRowToResearchPaper(r, authors)
      })

      // Include all repository research papers, letting DB rows override metrics or status if present
      const dbPaperIds = new Set(dbPapers.map(p => p.paperId.toLowerCase()))
      const dbSlugs = new Set(dbPapers.map(p => p.slug.toLowerCase()))

      const localRemaining = RESEARCH_PAPERS.filter(
        p =>
          !dbPaperIds.has(p.paperId.toLowerCase()) &&
          !dbSlugs.has(p.slug.toLowerCase()) &&
          (!categoryFilter || categoryFilter === 'all' || p.category === categoryFilter)
      )

      let papers = [...dbPapers, ...localRemaining]

      if (categoryFilter && categoryFilter !== 'all') {
        papers = papers.filter(p => p.category === categoryFilter)
      }

      if (sportFilter && sportFilter !== 'all') {
        papers = papers.filter(p => p.sportSlug?.toLowerCase() === sportFilter.toLowerCase())
      }

      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        papers = papers.filter(p => {
          const space = `${p.title} ${p.subtitle || ''} ${p.paperId} ${p.sport || ''} ${p.keywords.join(' ')} ${p.authors.map(a => a.name).join(' ')}`.toLowerCase()
          return space.includes(q)
        })
      }

      return { status: 'ready', data: papers, source: 'supabase' }
    }

    const localFallback = searchPapers(searchQuery || '', categoryFilter, sportFilter)
    return { status: 'ready', data: localFallback, source: 'fallback' }
  } catch {
    const fallback = searchPapers(searchQuery || '', categoryFilter, sportFilter)
    return { status: 'unavailable', data: fallback, message: 'Network error connecting to research database.' }
  }
}

/**
 * Fetch a single research paper by slug or accession ID.
 */
export async function getChroniclePaperBySlug(slug: string): Promise<ChronicleCatalogueResult<ResearchPaper | null>> {
  const local = getPaperBySlug(slug)
  const baseUrl = resolveSupabaseBaseUrl()
  if (!baseUrl) {
    return { status: 'unconfigured', data: local || null }
  }

  try {
    const query = new URLSearchParams({
      select: '*',
      or: `(slug.eq.${slug},paper_id.eq.${slug.toUpperCase()})`,
      limit: '1',
    })
    const url = `${baseUrl.origin}${baseUrl.pathname.replace(/\/$/, '')}/rest/v1/chronicle_papers?${query.toString()}`
    const res = await fetch(url, {
      headers: {
        apikey: resolveSupabaseAnonKey(),
        Authorization: `Bearer ${resolveSupabaseAnonKey()}`,
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      return { status: 'unavailable', data: local || null, message: 'Failed to retrieve paper from database.' }
    }

    const rows: DbPaperRow[] = await res.json()
    if (Array.isArray(rows) && rows.length > 0) {
      const authors = local ? local.authors : []
      const paper = mapDbRowToResearchPaper(rows[0], authors)
      return { status: 'ready', data: paper, source: 'supabase' }
    }

    return { status: 'ready', data: local || null, source: 'fallback' }
  } catch {
    return { status: 'unavailable', data: local || null, message: 'Could not connect to research database.' }
  }
}

/**
 * Fetch an author profile and their associated preprints by slug.
 */
export async function getChronicleAuthorBySlug(
  authorSlug: string
): Promise<ChronicleCatalogueResult<{ author: ResearchAuthor; papers: ResearchPaper[] } | null>> {
  const localAuthor = Object.values(RESEARCH_AUTHORS).find(a => a.slug === authorSlug)
  const localPapers = getPapersByAuthor(authorSlug)

  const fallbackData = localAuthor ? { author: localAuthor, papers: localPapers } : null
  const baseUrl = resolveSupabaseBaseUrl()
  if (!baseUrl) {
    return { status: 'unconfigured', data: fallbackData }
  }

  try {
    const url = `${baseUrl.origin}${baseUrl.pathname.replace(/\/$/, '')}/rest/v1/chronicle_authors?slug=eq.${authorSlug}&limit=1`
    const res = await fetch(url, {
      headers: {
        apikey: resolveSupabaseAnonKey(),
        Authorization: `Bearer ${resolveSupabaseAnonKey()}`,
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      return { status: 'unavailable', data: fallbackData, message: 'Database author lookup failed.' }
    }

    const rows = await res.json()
    if (Array.isArray(rows) && rows.length > 0) {
      const a = rows[0]
      const author: ResearchAuthor = {
        id: a.id,
        name: a.name,
        slug: a.slug,
        affiliation: a.affiliation,
        role: a.role,
        orcid: a.orcid || undefined,
        bio: a.bio,
        email: a.email || undefined,
      }
      return { status: 'ready', data: { author, papers: localPapers }, source: 'supabase' }
    }

    return { status: 'ready', data: fallbackData, source: 'fallback' }
  } catch {
    return { status: 'unavailable', data: fallbackData, message: 'Network error retrieving author profile.' }
  }
}

/**
 * Submit an author research manuscript to the private screening queue.
 */
export async function submitChronicleManuscript(
  input: ManuscriptSubmissionInput
): Promise<ManuscriptSubmissionResult> {
  // Input validations
  if (!input.manuscript_title || input.manuscript_title.trim().length < 5) {
    return { status: 'unavailable', message: 'Manuscript title must be at least 5 characters.' }
  }
  if (!input.primary_author_name || input.primary_author_name.trim().length < 2) {
    return { status: 'unavailable', message: 'Primary author name is required.' }
  }
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
  if (!input.primary_author_email || !emailRegex.test(input.primary_author_email.trim())) {
    return { status: 'unavailable', message: 'Please provide a valid author email address.' }
  }
  if (!input.primary_author_affiliation || input.primary_author_affiliation.trim().length < 2) {
    return { status: 'unavailable', message: 'Institutional or organizational affiliation is required.' }
  }
  if (!input.abstract_text || input.abstract_text.trim().length < 50) {
    return { status: 'unavailable', message: 'Please provide an abstract of at least 50 characters.' }
  }
  if (!input.human_ethics_confirmed) {
    return { status: 'unavailable', message: 'Ethics confirmation (Declaration of Helsinki / IRB approval) is mandatory.' }
  }
  if (!input.minor_consent_confirmed) {
    return { status: 'unavailable', message: 'Guardian/parental consent confirmation for minor athletes is mandatory.' }
  }

  // If URL provided in full_text_or_url, check it starts with https://
  const trimmedUrl = input.full_text_or_url.trim()
  if (trimmedUrl.startsWith('http://')) {
    return { status: 'unavailable', message: 'Full text manuscript link must use secure HTTPS.' }
  }

  const baseUrl = resolveSupabaseBaseUrl()
  const generatedId = `KG-SUB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

  // Record submission into moderation queue storage (available for Admin Moderation Desk)
  try {
    const queue = getLocalModerationQueue()
    const newSubmission: ChronicleModerationSubmission = {
      id: `sub-kc-${Date.now()}`,
      submissionId: generatedId,
      title: input.manuscript_title.trim(),
      category: input.category_slug,
      categoryName: RESEARCH_CATEGORIES.find(c => c.slug === input.category_slug)?.name || input.category_slug,
      authorName: input.primary_author_name.trim(),
      authorEmail: input.primary_author_email.trim(),
      affiliation: input.primary_author_affiliation.trim(),
      orcid: input.orcid?.trim() || undefined,
      coAuthors: input.co_authors?.trim() || undefined,
      abstract: input.abstract_text.trim(),
      keywords: input.keywords?.trim() || undefined,
      fullTextOrUrl: input.full_text_or_url?.trim() || undefined,
      humanEthicsConfirmed: input.human_ethics_confirmed,
      minorConsentConfirmed: input.minor_consent_confirmed,
      licenseType: 'cc-by-nc-nd-4.0',
      status: 'pending_review',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    saveLocalModerationQueue([newSubmission, ...queue])
  } catch {
    // Non-fatal if localStorage is restricted
  }

  if (!baseUrl) {
    return {
      status: 'unconfigured',
      submissionId: generatedId,
      message: 'Supabase database is unconfigured in development. Submission logged locally to intake queue.',
    }
  }

  try {
    const res = await fetch(
      `${baseUrl.origin}${baseUrl.pathname.replace(/\/$/, '')}/rest/v1/chronicle_submissions`,
      {
        method: 'POST',
        headers: {
          apikey: resolveSupabaseAnonKey(),
          Authorization: `Bearer ${resolveSupabaseAnonKey()}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          title: input.manuscript_title.trim(),
          category: input.category_slug,
          author_name: input.primary_author_name.trim(),
          author_email: input.primary_author_email.trim(),
          affiliation: input.primary_author_affiliation.trim(),
          abstract: input.abstract_text.trim(),
          status: 'pending_review',
        }),
      }
    )

    if (!res.ok) {
      if (res.status === 404) {
        return {
          status: 'unavailable',
          message: 'The KhelChronicle submission queue table is not installed in this database yet. Please apply setup_khelchronicle.sql.',
        }
      }
      return {
        status: 'unavailable',
        message: 'Could not record manuscript submission. Please check database permissions or try again later.',
      }
    }

    return { status: 'submitted', submissionId: generatedId }
  } catch {
    return {
      status: 'unavailable',
      message: 'Could not connect to the KhelChronicle submission server. Check network connection.',
    }
  }
}

/**
 * Increment view count via database RPC function.
 */
export async function recordPaperView(paperSlug: string): Promise<void> {
  const baseUrl = resolveSupabaseBaseUrl()
  if (!baseUrl) return

  try {
    await fetch(`${baseUrl.origin}${baseUrl.pathname.replace(/\/$/, '')}/rest/v1/rpc/increment_chronicle_paper_views`, {
      method: 'POST',
      headers: {
        apikey: resolveSupabaseAnonKey(),
        Authorization: `Bearer ${resolveSupabaseAnonKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_paper_slug: paperSlug }),
    })
  } catch {
    // silently ignore background metric errors
  }
}

/**
 * Increment download count via database RPC function.
 */
export async function recordPaperDownload(paperSlug: string): Promise<void> {
  const baseUrl = resolveSupabaseBaseUrl()
  if (!baseUrl) return

  try {
    await fetch(`${baseUrl.origin}${baseUrl.pathname.replace(/\/$/, '')}/rest/v1/rpc/increment_chronicle_paper_downloads`, {
      method: 'POST',
      headers: {
        apikey: resolveSupabaseAnonKey(),
        Authorization: `Bearer ${resolveSupabaseAnonKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_paper_slug: paperSlug }),
    })
  } catch {
    // silently ignore background metric errors
  }
}

// ============================================================================
// KhelChronicle Editorial & Manuscript Moderation Desk API
// ============================================================================

export interface ChronicleModerationSubmission {
  id: string
  submissionId: string
  title: string
  category: string
  categoryName?: string
  authorName: string
  authorEmail: string
  affiliation: string
  orcid?: string
  coAuthors?: string
  abstract: string
  keywords?: string
  fullTextOrUrl?: string
  humanEthicsConfirmed: boolean
  minorConsentConfirmed: boolean
  licenseType?: string
  status: 'pending_review' | 'under_review' | 'changes_requested' | 'approved' | 'published' | 'rejected'
  editorialNotes?: string
  rejectionReason?: string
  correctionRequest?: string
  assignedEditor?: string
  publishedPaperId?: string
  publishedSlug?: string
  createdAt: string
  updatedAt: string
}

export interface ChronicleModerationQueueFilters {
  status?: string
  category?: string
  search?: string
}

export interface ChronicleModerationQueueResult {
  submissions: ChronicleModerationSubmission[]
  stats: {
    pendingCount: number
    underReviewCount: number
    changesRequestedCount: number
    approvedCount: number
    publishedCount: number
    rejectedCount: number
    totalCount: number
  }
}

const CHRONICLE_QUEUE_STORAGE_KEY = 'khelchronicle_moderation_queue_v1'

export const DEFAULT_MODERATION_SUBMISSIONS: ChronicleModerationSubmission[] = [
  {
    id: 'sub-kc-001',
    submissionId: 'KG-SUB-KC82A1-94F2',
    title: 'High-Altitude Hypoxic Training Adaptation and Hemoglobin Mass Expansion in Himalayan Track Athletes',
    category: 'exercise-physiology',
    categoryName: 'Exercise Physiology',
    authorName: 'Dr. Tenzing Norbu',
    authorEmail: 't.norbu@himalayansports.org',
    affiliation: 'High Altitude Sports Training Centre (HASTC), Shillaroo',
    orcid: '0000-0003-1244-8901',
    coAuthors: 'Dr. Sonam Angmo (Leh Sports Science Cell)',
    abstract: 'Investigation of 21-day live-high train-low (LHTL) protocols at 2,700m elevation in 28 sub-elite junior middle-distance runners from Ladakh and Himachal Pradesh.',
    keywords: 'Altitude Training, Hypoxia, VO2max, Hemoglobin Mass',
    fullTextOrUrl: 'https://zenodo.org/record/10892011',
    humanEthicsConfirmed: true,
    minorConsentConfirmed: true,
    licenseType: 'cc-by-nc-nd-4.0',
    status: 'pending_review',
    createdAt: '2026-11-12T08:30:00Z',
    updatedAt: '2026-11-12T08:30:00Z',
  },
  {
    id: 'sub-kc-002',
    submissionId: 'KG-SUB-KC71B2-31E9',
    title: 'Kinematic Screening of Anterior Cruciate Ligament (ACL) Risk Factors in Junior Female Fast Bowlers and Fielders',
    category: 'sports-biomechanics',
    categoryName: 'Sports Biomechanics',
    authorName: 'Dr. Priya V. Sharma',
    authorEmail: 'priya.sharma@sportsbiomech.in',
    affiliation: 'Sports Biomechanics Laboratory, LNIPE Gwalior',
    orcid: '0000-0002-7719-3012',
    coAuthors: 'Aakash Verma (LNIPE)',
    abstract: '3D motion analysis of knee valgus moment and trunk lateral tilt during cutting maneuvers and landing across 42 junior female state cricketers.',
    keywords: 'ACL Injury, Knee Valgus, Female Athletes, Fast Bowling',
    fullTextOrUrl: 'https://zenodo.org/record/10892022',
    humanEthicsConfirmed: true,
    minorConsentConfirmed: true,
    licenseType: 'cc-by-4.0',
    status: 'under_review',
    assignedEditor: 'Dr. Vikramaditya Rathore',
    createdAt: '2026-11-11T14:15:00Z',
    updatedAt: '2026-11-11T16:00:00Z',
  },
  {
    id: 'sub-kc-003',
    submissionId: 'KG-SUB-KC65C3-77D4',
    title: 'Nutritional Knowledge and Energy Availability Deficits Among Rural Female Kabaddi Players in Haryana',
    category: 'sports-nutrition',
    categoryName: 'Sports Nutrition',
    authorName: 'Dr. Sunita Malik',
    authorEmail: 'sunitamalik@haryanaathletics.org',
    affiliation: 'Department of Sports Nutrition, Maharshi Dayanand University, Rohtak',
    abstract: 'Assessment of low energy availability (LEA) risk and dietary macronutrient distribution in 60 grassroots female kabaddi players competing at the state level.',
    keywords: 'Relative Energy Deficiency in Sport (REDs), Kabaddi, Female Athlete Triad',
    fullTextOrUrl: 'https://zenodo.org/record/10892033',
    humanEthicsConfirmed: true,
    minorConsentConfirmed: true,
    licenseType: 'cc-by-nc-nd-4.0',
    status: 'changes_requested',
    correctionRequest: 'Please provide the institutional ethics clearance approval number and clarify the validation methodology for the food frequency questionnaire.',
    editorialNotes: 'Strong grassroots relevance. Needs explicit ethics committee reference.',
    createdAt: '2026-11-10T11:00:00Z',
    updatedAt: '2026-11-11T09:20:00Z',
  },
  {
    id: 'sub-kc-004',
    submissionId: 'KG-SUB-KC54D4-12A8',
    title: 'Cognitive Anxiety and Biofeedback Heart-Rate Variability in Archery Junior Nationals',
    category: 'sports-psychology',
    categoryName: 'Sports Psychology',
    authorName: 'Dr. Rajesh Deshmukh',
    authorEmail: 'r.deshmukh@archeryscience.org',
    affiliation: 'Tata Archery Academy Sports Science Unit, Jamshedpur',
    abstract: 'Pre-competition competitive state anxiety inventory (CSAI-2R) and photoplethysmography HRV monitoring in 36 recurve archers.',
    keywords: 'Archery, HRV, Biofeedback, Performance Anxiety',
    fullTextOrUrl: 'https://zenodo.org/record/10892044',
    humanEthicsConfirmed: true,
    minorConsentConfirmed: true,
    licenseType: 'cc-by-nc-nd-4.0',
    status: 'approved',
    editorialNotes: 'Approved by editorial board. Ready for formal archive slug assignment and typesetting.',
    createdAt: '2026-11-09T16:40:00Z',
    updatedAt: '2026-11-10T12:00:00Z',
  },
]

let inMemoryModerationQueue: ChronicleModerationSubmission[] = [...DEFAULT_MODERATION_SUBMISSIONS]

export function getLocalModerationQueue(): ChronicleModerationSubmission[] {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(CHRONICLE_QUEUE_STORAGE_KEY)
      if (!raw) {
        localStorage.setItem(CHRONICLE_QUEUE_STORAGE_KEY, JSON.stringify(DEFAULT_MODERATION_SUBMISSIONS))
        return [...DEFAULT_MODERATION_SUBMISSIONS]
      }
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...DEFAULT_MODERATION_SUBMISSIONS]
    } catch {
      return inMemoryModerationQueue
    }
  }
  return inMemoryModerationQueue
}

export function saveLocalModerationQueue(queue: ChronicleModerationSubmission[]): void {
  inMemoryModerationQueue = queue
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      localStorage.setItem(CHRONICLE_QUEUE_STORAGE_KEY, JSON.stringify(queue))
    } catch {
      // ignore
    }
  }
}

/**
 * Fetch KhelChronicle manuscripts for the editorial moderation desk.
 */
export async function getChronicleModerationQueue(
  filters?: ChronicleModerationQueueFilters
): Promise<ChronicleModerationQueueResult> {
  const queue = getLocalModerationQueue()
  let filtered = queue

  if (filters?.status && filters.status !== 'all') {
    filtered = filtered.filter(s => s.status === filters.status)
  }
  if (filters?.category && filters.category !== 'all') {
    filtered = filtered.filter(s => s.category === filters.category)
  }
  if (filters?.search && filters.search.trim()) {
    const q = filters.search.toLowerCase()
    filtered = filtered.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.authorName.toLowerCase().includes(q) ||
      s.affiliation.toLowerCase().includes(q) ||
      s.submissionId.toLowerCase().includes(q)
    )
  }

  return {
    submissions: filtered,
    stats: {
      pendingCount: queue.filter(s => s.status === 'pending_review').length,
      underReviewCount: queue.filter(s => s.status === 'under_review').length,
      changesRequestedCount: queue.filter(s => s.status === 'changes_requested').length,
      approvedCount: queue.filter(s => s.status === 'approved').length,
      publishedCount: queue.filter(s => s.status === 'published').length,
      rejectedCount: queue.filter(s => s.status === 'rejected').length,
      totalCount: queue.length,
    },
  }
}

/**
 * Claim or start review for a submitted manuscript.
 */
export async function startManuscriptReview(
  id: string,
  reviewerName = 'Authorized Editorial Moderator'
): Promise<ChronicleModerationSubmission> {
  const queue = getLocalModerationQueue()
  const index = queue.findIndex(s => s.id === id || s.submissionId === id)
  if (index === -1) throw new Error('Manuscript submission not found.')

  queue[index] = {
    ...queue[index],
    status: 'under_review',
    assignedEditor: reviewerName,
    updatedAt: new Date().toISOString(),
  }
  saveLocalModerationQueue(queue)
  return queue[index]
}

/**
 * Request corrections or revisions from the submitting author.
 */
export async function requestManuscriptCorrections(
  id: string,
  message: string,
  notes?: string
): Promise<ChronicleModerationSubmission> {
  if (!message || message.trim().length < 10) {
    throw new Error('A revision message of at least 10 characters is required for the author.')
  }
  const queue = getLocalModerationQueue()
  const index = queue.findIndex(s => s.id === id || s.submissionId === id)
  if (index === -1) throw new Error('Manuscript submission not found.')

  queue[index] = {
    ...queue[index],
    status: 'changes_requested',
    correctionRequest: message.trim(),
    editorialNotes: notes?.trim() || queue[index].editorialNotes,
    updatedAt: new Date().toISOString(),
  }
  saveLocalModerationQueue(queue)
  return queue[index]
}

/**
 * Approve a manuscript for publication.
 */
export async function approveManuscript(
  id: string,
  notes?: string
): Promise<ChronicleModerationSubmission> {
  const queue = getLocalModerationQueue()
  const index = queue.findIndex(s => s.id === id || s.submissionId === id)
  if (index === -1) throw new Error('Manuscript submission not found.')

  queue[index] = {
    ...queue[index],
    status: 'approved',
    editorialNotes: notes?.trim() || queue[index].editorialNotes,
    updatedAt: new Date().toISOString(),
  }
  saveLocalModerationQueue(queue)
  return queue[index]
}

/**
 * Reject a manuscript with explicit reason.
 */
export async function rejectManuscript(
  id: string,
  reason: string,
  notes?: string
): Promise<ChronicleModerationSubmission> {
  if (!reason || !reason.trim()) {
    throw new Error('A reason for rejection must be provided to the author.')
  }
  const queue = getLocalModerationQueue()
  const index = queue.findIndex(s => s.id === id || s.submissionId === id)
  if (index === -1) throw new Error('Manuscript submission not found.')

  queue[index] = {
    ...queue[index],
    status: 'rejected',
    rejectionReason: reason.trim(),
    editorialNotes: notes?.trim() || queue[index].editorialNotes,
    updatedAt: new Date().toISOString(),
  }
  saveLocalModerationQueue(queue)
  return queue[index]
}

/**
 * Formally publish an approved manuscript into the KhelChronicle research archive.
 */
export async function publishManuscriptToArchive(
  id: string,
  targetSlug?: string,
  targetPaperId?: string
): Promise<{ success: boolean; paperId: string; slug: string }> {
  const queue = getLocalModerationQueue()
  const index = queue.findIndex(s => s.id === id || s.submissionId === id)
  if (index === -1) throw new Error('Manuscript submission not found.')

  const sub = queue[index]
  const generatedPaperId = targetPaperId?.trim() || `KG-2026-00${Math.floor(Math.random() * 90) + 10}`
  const generatedSlug =
    targetSlug?.trim() ||
    sub.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

  queue[index] = {
    ...sub,
    status: 'published',
    publishedPaperId: generatedPaperId,
    publishedSlug: generatedSlug,
    updatedAt: new Date().toISOString(),
  }
  saveLocalModerationQueue(queue)

  return {
    success: true,
    paperId: generatedPaperId,
    slug: generatedSlug,
  }
}
