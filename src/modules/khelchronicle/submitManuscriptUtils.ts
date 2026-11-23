export interface CoAuthor {
  id: string
  name: string
  email: string
  affiliation: string
  orcid: string
}

export type ManuscriptLicenseType = 'cc-by-4.0' | 'cc-by-nc-nd-4.0'

export interface ManuscriptDraftState {
  currentStep: number
  articleType: string
  title: string
  category: string
  keywords: string
  primaryAuthorName: string
  primaryAuthorEmail: string
  primaryAuthorAffiliation: string
  orcid: string
  coAuthorsText: string
  coAuthorsList: CoAuthor[]
  abstract: string
  coachingCue1: string
  coachingCue2: string
  coachingCue3: string
  fullTextOrUrl: string
  supplementaryUrl: string
  dataAvailability: string
  ethicsClearanceNumber: string
  licenseType: ManuscriptLicenseType
  updatedAt?: string
}

export interface SubmissionValidationState {
  title: string
  keywords: string
  primaryAuthorName: string
  primaryAuthorEmail: string
  primaryAuthorAffiliation: string
  orcid: string
  coAuthorsList: CoAuthor[]
  abstract: string
  fullTextOrUrl: string
  supplementaryUrl: string
  ethicsClearanceNumber: string
  ethicsDeclaration: boolean
  minorConsentDeclaration: boolean
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
    return { valid: true }
  }

  if (step === 5) {
    if (!state.ethicsClearanceNumber.trim()) {
      return {
        valid: false,
        error: 'Institutional ethics clearance number or documented not-applicable declaration is required.',
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

export function buildSubmissionAbstract(abstract: string, cues: string[]): string {
  const trimmedAbstract = abstract.trim()
  const nonEmptyCues = cues.map(c => c.trim()).filter(Boolean)
  if (nonEmptyCues.length === 0) return trimmedAbstract
  const formattedCues = nonEmptyCues.map((cue, idx) => `- Takeaway ${idx + 1}: ${cue}`).join('\n')
  return `${trimmedAbstract}\n\nField Implications for Coaches & Scouts:\n${formattedCues}`
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
  submissionId?: string | null
  year?: number
}): { apa: string; vancouver: string; bibtex: string } {
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

  return {
    apa: `${apaAuthors} (${year}). ${displayTitle}. KhelChronicle Open Sports Research Archive (Provisional Preprint Accession: ${accessionRef}; DOI assigned upon editorial approval).`,
    vancouver: `${vancouverAuthors}. ${displayTitle}. KhelChronicle. ${year};Provisional Accession: ${accessionRef}.`,
    bibtex: `@unpublished{${bibtexKey},
  author = {${bibtexAuthors}},
  title = {${displayTitle}},
  note = {KhelChronicle Open Sports Research Archive — Provisional Accession ${accessionRef}},
  year = {${year}}
}`,
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
