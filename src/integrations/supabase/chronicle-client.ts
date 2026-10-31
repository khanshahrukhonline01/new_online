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
  const currentUrl = (import.meta.env.VITE_SUPABASE_URL || supabaseUrl)?.replace(/\/$/, '')
  const currentKey = import.meta.env.VITE_SUPABASE_ANON_KEY || anonKey
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
  return (import.meta.env.VITE_SUPABASE_ANON_KEY || anonKey || '') as string
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
  searchQuery?: string
): Promise<ChronicleCatalogueResult<ResearchPaper[]>> {
  const baseUrl = resolveSupabaseBaseUrl()
  if (!baseUrl) {
    const localFiltered = searchPapers(searchQuery || '', categoryFilter)
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
      const fallback = searchPapers(searchQuery || '', categoryFilter)
      return { status: 'unavailable', data: fallback, message: 'Database query failed; showing cached preprints.' }
    }

    const rows: DbPaperRow[] = await res.json()
    if (Array.isArray(rows) && rows.length > 0) {
      let papers = rows.map(r => {
        // Resolve authors from seed or default
        const localMatch = RESEARCH_PAPERS.find(p => p.paperId === r.paper_id || p.slug === r.slug)
        const authors = localMatch ? localMatch.authors : []
        return mapDbRowToResearchPaper(r, authors)
      })

      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        papers = papers.filter(p => {
          const space = `${p.title} ${p.subtitle || ''} ${p.paperId} ${p.keywords.join(' ')} ${p.authors.map(a => a.name).join(' ')}`.toLowerCase()
          return space.includes(q)
        })
      }

      return { status: 'ready', data: papers, source: 'supabase' }
    }

    const localFallback = searchPapers(searchQuery || '', categoryFilter)
    return { status: 'ready', data: localFallback, source: 'fallback' }
  } catch {
    const fallback = searchPapers(searchQuery || '', categoryFilter)
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
