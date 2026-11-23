export interface CoAuthor {
  id: string
  name: string
  email: string
  affiliation: string
  orcid: string
}

export type ManuscriptLicenseType = 'cc-by-4.0' | 'cc-by-nc-nd-4.0'

export interface SportGameOption {
  id: string
  name: string
}

export const SPORTS_GAME_OPTIONS: SportGameOption[] = [
  { id: 'cricket', name: 'Cricket' },
  { id: 'athletics', name: 'Athletics & Running' },
  { id: 'football', name: 'Football' },
  { id: 'kabaddi', name: 'Kabaddi' },
  { id: 'kho-kho', name: 'Kho-Kho' },
  { id: 'wrestling', name: 'Wrestling / Kushti' },
  { id: 'badminton', name: 'Badminton' },
  { id: 'hockey', name: 'Field Hockey' },
  { id: 'boxing', name: 'Boxing' },
  { id: 'mallakhamb', name: 'Mallakhamb' },
  { id: 'shooting', name: 'Shooting' },
  { id: 'archery', name: 'Archery' },
  { id: 'weightlifting', name: 'Weightlifting' },
  { id: 'swimming', name: 'Swimming & Aquatics' },
  { id: 'table-tennis', name: 'Table Tennis' },
  { id: 'tennis', name: 'Tennis' },
  { id: 'volleyball', name: 'Volleyball' },
  { id: 'basketball', name: 'Basketball' },
  { id: 'chess', name: 'Chess & Mind Sports' },
  { id: 'esports', name: 'Esports & Cognitive Gaming' },
  { id: 'para-sports', name: 'Para-Athletics & Adapted Sports' },
  { id: 'multi-sport', name: 'Multi-Sport & Grassroots PE' },
  { id: 'other', name: 'Other / Traditional Game (Specify)' },
]

export const ATHLETE_COHORT_TIERS: SportGameOption[] = [
  { id: 'grassroots-youth', name: 'Grassroots / Youth Athletes (U-14 / U-16 / U-18)' },
  { id: 'university', name: 'University & Inter-Collegiate' },
  { id: 'state-academy', name: 'State & Regional Academy (SAI NCOE / Clubs)' },
  { id: 'national-elite', name: 'National / Elite Senior Athletes' },
  { id: 'para-adapted', name: 'Para-Athletes & Adapted Sports' },
  { id: 'recreational', name: 'Recreational / Community Players' },
  { id: 'officials-policy', name: 'Coaches, Match Officials & Policy Only' },
]

export const TESTING_ENVIRONMENTS: SportGameOption[] = [
  { id: 'field-turf', name: 'Outdoor Field / Synthetic Turf / Maidan' },
  { id: 'indoor-court', name: 'Indoor Court / Arena / Hall' },
  { id: 'sports-lab', name: 'Biomechanics / Exercise Physiology Lab' },
  { id: 'akhada-clay', name: 'Clay / Akhada / Mud Pit' },
  { id: 'high-altitude', name: 'High-Altitude Training Centre' },
  { id: 'digital-archive', name: 'Digital Telemetry / Video / Registry Archive' },
]

export function resolveSportLabel(sportId: string, customSport = ''): string {
  if (sportId === 'other') {
    return customSport.trim() || 'Other Sports & Games'
  }
  return SPORTS_GAME_OPTIONS.find(s => s.id === sportId)?.name || 'Multi-Sport & Grassroots PE'
}

export function resolveCohortLabel(tierId: string): string {
  return ATHLETE_COHORT_TIERS.find(t => t.id === tierId)?.name || 'State & Regional Academy (SAI NCOE / Clubs)'
}

export function resolveEnvironmentLabel(envId: string): string {
  return TESTING_ENVIRONMENTS.find(e => e.id === envId)?.name || 'Outdoor Field / Synthetic Turf / Maidan'
}

export interface ManuscriptDraftState {
  currentStep: number
  articleType: string
  title: string
  category: string
  sport: string
  customSport: string
  athleteCohortTier: string
  keywords: string
  primaryAuthorName: string
  primaryAuthorEmail: string
  primaryAuthorAffiliation: string
  orcid: string
  coAuthorsText: string
  coAuthorsList: CoAuthor[]
  abstract: string
  testingEnvironment: string
  testingApparatus: string
  coachingCue1: string
  coachingCue2: string
  coachingCue3: string
  fullTextOrUrl: string
  supplementaryUrl: string
  preregistrationUrl: string
  dataAvailability: string
  ethicsClearanceNumber: string
  fundingStatement: string
  conflictsDisclosure: string
  licenseType: ManuscriptLicenseType
  updatedAt?: string
}

export interface SubmissionValidationState {
  title: string
  sport?: string
  customSport?: string
  keywords: string
  primaryAuthorName: string
  primaryAuthorEmail: string
  primaryAuthorAffiliation: string
  orcid: string
  coAuthorsList: CoAuthor[]
  abstract: string
  fullTextOrUrl: string
  supplementaryUrl: string
  preregistrationUrl?: string
  ethicsClearanceNumber: string
  fundingStatement?: string
  conflictsDisclosure?: string
  ethicsDeclaration: boolean
  minorConsentDeclaration: boolean
  cleanSportDeclaration?: boolean
  licenseDeclaration: boolean
}

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
const ORCID_REGEX = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i

export function normalizeOrcid(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  return trimmed.replace(/^https?:\/\/(?:www\.)?orcid\.org\//i, '').toUpperCase()
}

export function isValidOrcid(raw: string): boolean {
  const normalized = normalizeOrcid(raw)
  if (!normalized) return true
  return ORCID_REGEX.test(normalized)
}

export function isValidHttpsUrl(raw: string): boolean {
  const trimmed = raw.trim()
  if (!trimmed) return false
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'https:' && Boolean(parsed.hostname)
  } catch {
    return false
  }
}

export function validateSubmissionStep(
  step: number,
  state: SubmissionValidationState,
): { valid: boolean; error?: string } {
  if (step === 1) {
    const trimmedTitle = state.title.trim()
    if (!trimmedTitle) {
      return { valid: false, error: 'Please enter the Manuscript Title before proceeding.' }
    }
    if (trimmedTitle.length < 5) {
      return { valid: false, error: 'Manuscript title must be at least 5 characters.' }
    }
    if (state.sport === 'other' && !state.customSport?.trim()) {
      return {
        valid: false,
        error: 'Please specify the Sport or Traditional Game name before proceeding.',
      }
    }
    if (!state.keywords.trim()) {
      return { valid: false, error: 'Please enter at least one research keyword (comma-separated).' }
    }
    return { valid: true }
  }

  if (step === 2) {
    if (state.primaryAuthorName.trim().length < 2) {
      return { valid: false, error: 'Primary / Corresponding Author name is required.' }
    }
    if (!state.primaryAuthorEmail.trim() || !EMAIL_REGEX.test(state.primaryAuthorEmail.trim())) {
      return { valid: false, error: 'Please enter a valid corresponding author email address.' }
    }
    if (state.primaryAuthorAffiliation.trim().length < 2) {
      return { valid: false, error: 'Author Institution or University Affiliation is required.' }
    }
    if (!isValidOrcid(state.orcid)) {
      return {
        valid: false,
        error: 'ORCID iD must follow the 16-digit format 0000-0000-0000-0000 (or leave blank).',
      }
    }
    for (let i = 0; i < state.coAuthorsList.length; i += 1) {
      const ca = state.coAuthorsList[i]
      const hasAnyField = Boolean(ca.name.trim() || ca.affiliation.trim() || ca.email.trim() || ca.orcid.trim())
      if (!hasAnyField) continue
      if (!ca.name.trim()) {
        return { valid: false, error: `Please enter a full name for Co-Author #${i + 1} or remove the empty row.` }
      }
      if (ca.email.trim() && !EMAIL_REGEX.test(ca.email.trim())) {
        return { valid: false, error: `Please enter a valid email address for Co-Author #${i + 1}.` }
      }
      if (!isValidOrcid(ca.orcid)) {
        return {
          valid: false,
          error: `Co-Author #${i + 1} ORCID iD must follow 0000-0000-0000-0000 format (or leave blank).`,
        }
      }
    }
    return { valid: true }
  }

  if (step === 3) {
    if (!state.abstract.trim() || state.abstract.trim().length < 50) {
      return { valid: false, error: 'Please provide a structured abstract of at least 50 characters.' }
    }
    return { valid: true }
  }

  if (step === 4) {
    if (!state.fullTextOrUrl.trim()) {
      return {
        valid: false,
        error: 'Please provide a secure HTTPS link to the complete manuscript before proceeding.',
      }
    }
    if (!isValidHttpsUrl(state.fullTextOrUrl)) {
      return {
        valid: false,
        error: 'Full text manuscript link must be a valid URL starting with https://.',
      }
    }
    if (state.supplementaryUrl.trim() && !isValidHttpsUrl(state.supplementaryUrl)) {
      return {
        valid: false,
        error: 'Supplementary data link must be a valid URL starting with https://.',
      }
    }
    if (state.preregistrationUrl?.trim() && !isValidHttpsUrl(state.preregistrationUrl)) {
      return {
        valid: false,
        error: 'Study preregistration link must be a valid URL starting with https://.',
      }
    }
    return { valid: true }
  }

  if (step === 5) {
    if (!state.ethicsClearanceNumber.trim()) {
      return {
        valid: false,
        error: 'Institutional ethics clearance number or documented not-applicable declaration is required.',
      }
    }
    if (state.fundingStatement !== undefined && !state.fundingStatement.trim()) {
      return {
        valid: false,
        error: 'Please enter a Funding Statement (or click "No external funding received").',
      }
    }
    if (state.conflictsDisclosure !== undefined && !state.conflictsDisclosure.trim()) {
      return {
        valid: false,
        error: 'Please enter a Conflicts of Interest statement (or click "None declared").',
      }
    }
    if (!state.ethicsDeclaration) {
      return {
        valid: false,
        error: 'Please confirm the Human Subjects & Ethics Declaration before submitting.',
      }
    }
    if (!state.minorConsentDeclaration) {
      return {
        valid: false,
        error: 'Please confirm the Youth & Minor Athletes Protection declaration before submitting.',
      }
    }
    if (state.cleanSportDeclaration === false) {
      return {
        valid: false,
        error: 'Please confirm the NADA / WADA Clean-Sport & Non-Clinical Compliance declaration before submitting.',
      }
    }
    if (!state.licenseDeclaration) {
      return {
        valid: false,
        error: 'Please confirm the Diamond Open Access License declaration before submitting.',
      }
    }
    return { valid: true }
  }

  return { valid: true }
}

export function validateAllSubmissionSteps(
  state: SubmissionValidationState,
): { valid: boolean; error?: string; firstInvalidStep?: number } {
  for (let step = 1; step <= 5; step += 1) {
    const res = validateSubmissionStep(step, state)
    if (!res.valid) {
      return { valid: false, error: res.error, firstInvalidStep: step }
    }
  }
  return { valid: true }
}

export function formatConsolidatedCoAuthors(coAuthorsText: string, coAuthorsList: CoAuthor[]): string {
  const structuredEntries = coAuthorsList
    .filter(a => a.name.trim())
    .map(a => {
      const meta: string[] = [a.affiliation.trim() || 'Affiliation Pending']
      const normalizedOrcid = normalizeOrcid(a.orcid)
      if (normalizedOrcid) meta.push(`ORCID: ${normalizedOrcid}`)
      if (a.email.trim()) meta.push(a.email.trim())
      return `${a.name.trim()} (${meta.join(' · ')})`
    })

  return [coAuthorsText.trim(), ...structuredEntries].filter(Boolean).join(', ')
}

export interface SubmissionStructuredMeta {
  sportLabel?: string
  cohortLabel?: string
  testingEnvironmentLabel?: string
  testingApparatus?: string
  preregistrationUrl?: string
  fundingStatement?: string
  conflictsDisclosure?: string
  cleanSportAttested?: boolean
}

export function buildSubmissionKeywords(
  userKeywords: string,
  sportLabel: string,
  cohortLabel?: string,
): string {
  const baseItems = userKeywords
    .split(',')
    .map(k => k.trim())
    .filter(Boolean)

  const additions = [sportLabel.trim(), cohortLabel?.trim() || ''].filter(Boolean)
  const seen = new Set(baseItems.map(item => item.toLowerCase()))

  for (const tag of additions) {
    const key = tag.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      baseItems.push(tag)
    }
  }

  return baseItems.join(', ')
}

export function buildSubmissionAbstract(
  abstract: string,
  cues: string[],
  meta?: SubmissionStructuredMeta,
): string {
  const sections: string[] = [abstract.trim()]

  const nonEmptyCues = cues.map(c => c.trim()).filter(Boolean)
  if (nonEmptyCues.length > 0) {
    const formattedCues = nonEmptyCues.map((cue, idx) => `- Takeaway ${idx + 1}: ${cue}`).join('\n')
    sections.push(`Field Implications for Coaches & Scouts:\n${formattedCues}`)
  }

  if (meta) {
    const contextLines: string[] = []
    if (meta.sportLabel?.trim()) contextLines.push(`- Sport / Game: ${meta.sportLabel.trim()}`)
    if (meta.cohortLabel?.trim()) contextLines.push(`- Athlete Cohort Tier: ${meta.cohortLabel.trim()}`)
    if (meta.testingEnvironmentLabel?.trim()) {
      contextLines.push(`- Testing Environment: ${meta.testingEnvironmentLabel.trim()}`)
    }
    if (meta.testingApparatus?.trim()) {
      contextLines.push(`- Apparatus & Sample Protocol: ${meta.testingApparatus.trim()}`)
    }
    if (contextLines.length > 0) {
      sections.push(`Sports Context & Testing Apparatus:\n${contextLines.join('\n')}`)
    }

    const disclosureLines: string[] = []
    if (meta.preregistrationUrl?.trim()) {
      disclosureLines.push(`- Study Preregistration: ${meta.preregistrationUrl.trim()}`)
    }
    if (meta.fundingStatement?.trim()) {
      disclosureLines.push(`- Funding Disclosure: ${meta.fundingStatement.trim()}`)
    }
    if (meta.conflictsDisclosure?.trim()) {
      disclosureLines.push(`- Conflicts of Interest: ${meta.conflictsDisclosure.trim()}`)
    }
    if (meta.cleanSportAttested) {
      disclosureLines.push(
        '- Clean-Sport Compliance: Author attested WADA / NADA prohibited-list & non-clinical adherence',
      )
    }
    if (disclosureLines.length > 0) {
      sections.push(`Open Science & Compliance Disclosures:\n${disclosureLines.join('\n')}`)
    }
  }

  return sections.join('\n\n')
}

function formatAuthorShortName(fullName: string): string {
  const cleaned = fullName.trim().replace(/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s+/i, '')
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'Author, A.'
  if (parts.length === 1) return parts[0]
  const lastName = parts[parts.length - 1]
  const initials = parts
    .slice(0, -1)
    .map(p => `${p[0].toUpperCase()}.`)
    .join(' ')
  return `${lastName}, ${initials}`
}

function formatRisAuthorName(fullName: string): string {
  const cleaned = fullName.trim().replace(/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s+/i, '')
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'Author, Corresponding'
  if (parts.length === 1) return parts[0]
  const lastName = parts[parts.length - 1]
  const firstNames = parts.slice(0, -1).join(' ')
  return `${lastName}, ${firstNames}`
}

function formatVancouverAuthor(fullName: string): string {
  const cleaned = fullName.trim().replace(/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s+/i, '')
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'Author A'
  if (parts.length === 1) return parts[0]
  const lastName = parts[parts.length - 1]
  const initials = parts
    .slice(0, -1)
    .map(p => p[0].toUpperCase())
    .join('')
  return `${lastName} ${initials}`
}

export function formatProvisionalCitations(params: {
  primaryAuthorName: string
  coAuthorsText: string
  coAuthorsList: CoAuthor[]
  title: string
  category: string
  keywords?: string
  submissionId?: string | null
  year?: number
}): { apa: string; vancouver: string; bibtex: string; ris: string } {
  const year = params.year ?? new Date().getFullYear()
  const displayTitle = params.title.trim() || 'Biomechanical and Physiological Analysis in Indian Athletics'
  const accessionRef = params.submissionId || 'PENDING-SCREENING'

  const parsedTextCoAuthors = params.coAuthorsText
    .split(',')
    .map(item => item.replace(/\([^)]*\)/g, '').trim())
    .filter(Boolean)

  const structuredCoAuthorNames = params.coAuthorsList.map(a => a.name.trim()).filter(Boolean)
  const allAuthors = [
    params.primaryAuthorName.trim() || 'Corresponding Author',
    ...parsedTextCoAuthors,
    ...structuredCoAuthorNames,
  ]

  const apaAuthorsList = allAuthors.map(formatAuthorShortName)
  const apaAuthors =
    apaAuthorsList.length === 1
      ? apaAuthorsList[0]
      : `${apaAuthorsList.slice(0, -1).join(', ')}, & ${apaAuthorsList[apaAuthorsList.length - 1]}`

  const vancouverAuthors = allAuthors.map(formatVancouverAuthor).join(', ')
  const bibtexAuthors = allAuthors.join(' and ')

  const primarySlug = (allAuthors[0].split(/\s+/).pop() || 'author').toLowerCase().replace(/[^a-z0-9]/g, '') || 'author'
  const bibtexKey = `${primarySlug}${year}${params.category.replace(/[^a-z0-9]/gi, '')}`

  const risKeywordLines = (params.keywords || '')
    .split(',')
    .map(k => k.trim())
    .filter(Boolean)
    .map(kw => `KW  - ${kw}`)

  const risLines = [
    'TY  - UNPB',
    `TI  - ${displayTitle}`,
    ...allAuthors.map(author => `AU  - ${formatRisAuthorName(author)}`),
    `PY  - ${year}`,
    'T2  - KhelChronicle Open Sports Research Archive',
    'PB  - KhelGrid Open Sports Science Foundation',
    ...risKeywordLines,
    `N1  - Provisional Preprint Accession: ${accessionRef} (Not yet peer-reviewed)`,
    'UR  - https://www.khelgrid.com/khelchronicle',
    'ER  - ',
  ]

  return {
    apa: `${apaAuthors} (${year}). ${displayTitle}. KhelChronicle Open Sports Research Archive (Provisional Preprint Accession: ${accessionRef}; DOI assigned upon editorial approval).`,
    vancouver: `${vancouverAuthors}. ${displayTitle}. KhelChronicle. ${year};Provisional Accession: ${accessionRef}.`,
    bibtex: `@unpublished{${bibtexKey},
  author = {${bibtexAuthors}},
  title = {${displayTitle}},
  note = {KhelChronicle Open Sports Research Archive — Provisional Accession ${accessionRef}},
  year = {${year}}
}`,
    ris: risLines.join('\n'),
  }
}

export function serializeDraft(draft: ManuscriptDraftState): string {
  return JSON.stringify(draft)
}

export function deserializeDraft(raw: string | null): Partial<ManuscriptDraftState> | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<ManuscriptDraftState>
    if (!parsed || typeof parsed !== 'object') return null
    const validStep =
      typeof parsed.currentStep === 'number' && parsed.currentStep >= 1 && parsed.currentStep <= 5
        ? Math.floor(parsed.currentStep)
        : 1
    const validLicense: ManuscriptLicenseType =
      parsed.licenseType === 'cc-by-4.0' || parsed.licenseType === 'cc-by-nc-nd-4.0'
        ? parsed.licenseType
        : 'cc-by-nc-nd-4.0'
    const validCoAuthorsList = Array.isArray(parsed.coAuthorsList)
      ? parsed.coAuthorsList.filter(
          (item): item is CoAuthor =>
            Boolean(item && typeof item === 'object' && typeof item.id === 'string'),
        )
      : []

    return {
      ...parsed,
      currentStep: validStep,
      licenseType: validLicense,
      coAuthorsList: validCoAuthorsList,
    }
  } catch {
    return null
  }
}
