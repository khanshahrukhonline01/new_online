import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { KhelChronicleSubmitPage } from './KhelChronicleSubmitPage'
import { submitChronicleManuscript } from '../../integrations/supabase/chronicle-client'

describe('End-to-End Manuscript Intake Verification (KhelChronicle / Supabase)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('renders complete intake form with Diamond Open Access badges, ethics criteria, and required fields', () => {
    const html = renderToStaticMarkup(<KhelChronicleSubmitPage />)

    // Badges & Transparency
    expect(html).toContain('Database Submission Queue')
    expect(html).toContain('Diamond Open Access')
    expect(html).toContain('Zero Article Processing Charges (APC)')

    // Editorial and Ethics screening guidelines
    expect(html).toContain('Editorial Screening &amp; Moderation Criteria')
    expect(html).toContain('Human Subjects &amp; Minor Athletes Protection')
    expect(html).toContain('Non-Clinical Preprint Status')

    // Form inputs
    expect(html).toContain('Manuscript Title *')
    expect(html).toContain('Primary Research Discipline *')
    expect(html).toContain('Primary / Corresponding Author *')
    expect(html).toContain('Corresponding Author Email *')
    expect(html).toContain('Author Institution / University Affiliation *')
    expect(html).toContain('ORCID Identifier (Optional)')
    expect(html).toContain('Co-Authors &amp; Affiliations (Optional)')
    expect(html).toContain('Structured Abstract (Background, Methods, Results, Conclusion) *')
    expect(html).toContain('Manuscript Full-Text Link (PDF URL or Institutional Repository Link)')

    // Required checkboxes
    expect(html).toContain('Human Subjects &amp; Ethics Declaration *')
    expect(html).toContain('Youth &amp; Minor Athletes Protection *')
    expect(html).toContain('Diamond Open Access License *')
  })

  it('validates client-side constraints: rejects missing ethics, missing minor consent, short abstract, and insecure HTTP links', async () => {
    // 1. Missing ethics confirmation
    const resNoEthics = await submitChronicleManuscript({
      manuscript_title: 'Valid Long Title for Performance Study',
      category_slug: 'sports-biomechanics',
      primary_author_name: 'Dr. Devika Sundaram',
      primary_author_email: 'devika@lnipe.edu.in',
      primary_author_affiliation: 'LNIPE Gwalior',
      abstract_text: 'A structured abstract detailing kinematics and ground reaction force in junior athletes with sufficient length.',
      keywords: 'Biomechanics, GRF',
      full_text_or_url: 'https://zenodo.org/123456',
      human_ethics_confirmed: false,
      minor_consent_confirmed: true,
    })
    expect(resNoEthics.status).toBe('unavailable')
    expect(resNoEthics.message).toContain('Ethics confirmation')

    // 2. Missing minor consent
    const resNoConsent = await submitChronicleManuscript({
      manuscript_title: 'Valid Long Title for Performance Study',
      category_slug: 'sports-biomechanics',
      primary_author_name: 'Dr. Devika Sundaram',
      primary_author_email: 'devika@lnipe.edu.in',
      primary_author_affiliation: 'LNIPE Gwalior',
      abstract_text: 'A structured abstract detailing kinematics and ground reaction force in junior athletes with sufficient length.',
      keywords: 'Biomechanics, GRF',
      full_text_or_url: 'https://zenodo.org/123456',
      human_ethics_confirmed: true,
      minor_consent_confirmed: false,
    })
    expect(resNoConsent.status).toBe('unavailable')
    expect(resNoConsent.message).toContain('minor athletes is mandatory')

    // 3. Short abstract (< 50 chars)
    const resShortAbstract = await submitChronicleManuscript({
      manuscript_title: 'Valid Long Title for Performance Study',
      category_slug: 'sports-biomechanics',
      primary_author_name: 'Dr. Devika Sundaram',
      primary_author_email: 'devika@lnipe.edu.in',
      primary_author_affiliation: 'LNIPE Gwalior',
      abstract_text: 'Too short abstract.',
      keywords: 'Biomechanics',
      full_text_or_url: '',
      human_ethics_confirmed: true,
      minor_consent_confirmed: true,
    })
    expect(resShortAbstract.status).toBe('unavailable')
    expect(resShortAbstract.message).toContain('at least 50 characters')

    // 4. Insecure HTTP link
    const resHttp = await submitChronicleManuscript({
      manuscript_title: 'Valid Long Title for Performance Study',
      category_slug: 'sports-biomechanics',
      primary_author_name: 'Dr. Devika Sundaram',
      primary_author_email: 'devika@lnipe.edu.in',
      primary_author_affiliation: 'LNIPE Gwalior',
      abstract_text: 'A structured abstract detailing kinematics and ground reaction force in junior athletes with sufficient length.',
      keywords: 'Biomechanics',
      full_text_or_url: 'http://insecure-domain.com/preprint.pdf',
      human_ethics_confirmed: true,
      minor_consent_confirmed: true,
    })
    expect(resHttp.status).toBe('unavailable')
    expect(resHttp.message).toContain('secure HTTPS')
  })

  it('transmits valid intake submission to chronicle_submissions with Prefer: return=minimal header and returns 201 receipt', async () => {
    // Mock Supabase HTTP 201 response with minimal empty body (standard PostgREST response)
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, {
        status: 201,
        statusText: 'Created',
        headers: {
          'Content-Type': 'application/json',
          'Preference-Applied': 'return=minimal',
        },
      })
    )

    const submissionInput = {
      manuscript_title: 'Knee Valgus and Ground Reaction Forces During Badminton Lunges in State Academies',
      category_slug: 'sports-biomechanics',
      primary_author_name: 'Dr. Devika Sundaram',
      primary_author_email: 'devika.sundaram@lnipe.edu.in',
      primary_author_affiliation: 'Lakshmibai National Institute of Physical Education, Gwalior',
      orcid: '0000-0002-1825-0097',
      co_authors: 'Prof. R. K. Sharma',
      abstract_text: 'Multi-camera 3D motion capture and dual force plates evaluated 84 competitive junior badminton players during maximum lunges, measuring peak ground reaction forces and frontal plane knee angles under match fatigue.',
      keywords: 'Badminton, Knee Valgus, Ground Reaction Force, Movement Screening',
      full_text_or_url: 'https://doi.org/10.5281/zenodo.1082001',
      human_ethics_confirmed: true,
      minor_consent_confirmed: true,
    }

    const res = await submitChronicleManuscript(submissionInput)

    expect(res.status).toBe('submitted')
    if (res.status === 'submitted') {
      expect(res.submissionId).toMatch(/^KG-SUB-[A-Z0-9]+-[A-Z0-9]+$/)
    }

    expect(fetch).toHaveBeenCalledTimes(1)
    const [callUrl, callOptions] = vi.mocked(fetch).mock.calls[0]
    expect(callUrl).toContain('/rest/v1/chronicle_submissions')
    expect(callOptions?.method).toBe('POST')
    expect((callOptions?.headers as Record<string, string>)?.['Prefer']).toBe('return=minimal')

    const sentPayload = JSON.parse(callOptions?.body as string)
    expect(sentPayload.title).toBe(submissionInput.manuscript_title)
    expect(sentPayload.category).toBe(submissionInput.category_slug)
    expect(sentPayload.author_name).toBe(submissionInput.primary_author_name)
    expect(sentPayload.author_email).toBe(submissionInput.primary_author_email)
    expect(sentPayload.affiliation).toBe(submissionInput.primary_author_affiliation)
    expect(sentPayload.status).toBe('pending_review')
  })
})
