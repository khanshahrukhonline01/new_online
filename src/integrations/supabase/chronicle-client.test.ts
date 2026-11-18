import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const validUrl = 'https://example.supabase.co'
const anonKey = 'public-anon-key'

async function loadClient(url = validUrl, key = anonKey) {
  vi.resetModules()
  vi.stubEnv('VITE_SUPABASE_URL', url)
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', key)
  return import('./chronicle-client')
}

describe('KhelChronicle Supabase database integration client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  describe('Unconfigured fail-closed mode', () => {
    it('returns local categories when Supabase is unconfigured', async () => {
      const client = await loadClient('', '')
      const result = await client.getChronicleCategories()
      expect(result.status).toBe('unconfigured')
      expect(result.data.length).toBeGreaterThanOrEqual(7)
      expect(result.data.some(c => c.slug === 'sports-biomechanics')).toBe(true)
      expect(fetch).not.toHaveBeenCalled()
    })

    it('returns no public manuscripts when Supabase is unconfigured', async () => {
      const client = await loadClient('', '')
      const result = await client.getChroniclePapers('sports-biomechanics')
      expect(result.status).toBe('unconfigured')
      expect(result.data).toEqual([])
      expect(fetch).not.toHaveBeenCalled()
    })

    it('does not search synthetic papers when Supabase is unconfigured', async () => {
      const client = await loadClient('', '')
      const result = await client.getChroniclePapers(undefined, 'Lumbar Spine')
      expect(result.status).toBe('unconfigured')
      expect(result.data).toEqual([])
      expect(fetch).not.toHaveBeenCalled()
    })

    it('does not expose a seeded paper by slug when unconfigured', async () => {
      const client = await loadClient('', '')
      const result = await client.getChroniclePaperBySlug('KG-2026-001')
      expect(result.status).toBe('unconfigured')
      expect(result.data).toBeNull()
      expect(fetch).not.toHaveBeenCalled()
    })

    it('does not expose seeded author profiles when unconfigured', async () => {
      const client = await loadClient('', '')
      const result = await client.getChronicleAuthorBySlug('dr-vikramaditya-rathore')
      expect(result.status).toBe('unconfigured')
      expect(result.data).toBeNull()
      expect(fetch).not.toHaveBeenCalled()
    })
  })

  describe('Manuscript submission validation and queue', () => {
    it('rejects submissions with titles shorter than 5 characters', async () => {
      const client = await loadClient()
      const res = await client.submitChronicleManuscript({
        manuscript_title: 'Bad',
        category_slug: 'sports-biomechanics',
        primary_author_name: 'Dr. Test',
        primary_author_email: 'test@example.com',
        primary_author_affiliation: 'Test University',
        ethics_clearance_number: 'TEST-ETHICS-001',
        abstract_text: 'A'.repeat(60),
        keywords: 'test',
        article_type: 'preprint',
        full_text_or_url: 'https://example.com/paper.pdf',
        data_availability: 'open_access',
        license_type: 'cc-by-nc-nd-4.0',
        license_confirmed: true,
        human_ethics_confirmed: true,
        minor_consent_confirmed: true,
      })
      expect(res.status).toBe('unavailable')
      expect(res.message).toContain('at least 5 characters')
      expect(fetch).not.toHaveBeenCalled()
    })

    it('rejects invalid email formats', async () => {
      const client = await loadClient()
      const res = await client.submitChronicleManuscript({
        manuscript_title: 'Valid Long Title for Research',
        category_slug: 'sports-biomechanics',
        primary_author_name: 'Dr. Test',
        primary_author_email: 'not-an-email',
        primary_author_affiliation: 'Test University',
        ethics_clearance_number: 'TEST-ETHICS-001',
        abstract_text: 'A'.repeat(60),
        keywords: 'test',
        article_type: 'preprint',
        full_text_or_url: 'https://example.com/paper.pdf',
        data_availability: 'open_access',
        license_type: 'cc-by-nc-nd-4.0',
        license_confirmed: true,
        human_ethics_confirmed: true,
        minor_consent_confirmed: true,
      })
      expect(res.status).toBe('unavailable')
      expect(res.message).toContain('valid author email')
      expect(fetch).not.toHaveBeenCalled()
    })

    it('rejects submissions missing ethics confirmation', async () => {
      const client = await loadClient()
      const res = await client.submitChronicleManuscript({
        manuscript_title: 'Valid Long Title for Research',
        category_slug: 'sports-biomechanics',
        primary_author_name: 'Dr. Test',
        primary_author_email: 'test@example.com',
        primary_author_affiliation: 'Test University',
        ethics_clearance_number: 'TEST-ETHICS-001',
        abstract_text: 'A'.repeat(60),
        keywords: 'test',
        article_type: 'preprint',
        full_text_or_url: 'https://example.com/paper.pdf',
        data_availability: 'open_access',
        license_type: 'cc-by-nc-nd-4.0',
        license_confirmed: true,
        human_ethics_confirmed: false,
        minor_consent_confirmed: true,
      })
      expect(res.status).toBe('unavailable')
      expect(res.message).toContain('human-subjects and minor-athlete consent')
      expect(fetch).not.toHaveBeenCalled()
    })

    it('rejects insecure HTTP links for manuscript URLs', async () => {
      const client = await loadClient()
      const res = await client.submitChronicleManuscript({
        manuscript_title: 'Valid Long Title for Research',
        category_slug: 'sports-biomechanics',
        primary_author_name: 'Dr. Test',
        primary_author_email: 'test@example.com',
        primary_author_affiliation: 'Test University',
        ethics_clearance_number: 'TEST-ETHICS-001',
        abstract_text: 'A'.repeat(60),
        keywords: 'test',
        article_type: 'preprint',
        full_text_or_url: 'http://insecure-site.com/paper.pdf',
        data_availability: 'open_access',
        license_type: 'cc-by-nc-nd-4.0',
        license_confirmed: true,
        human_ethics_confirmed: true,
        minor_consent_confirmed: true,
      })
      expect(res.status).toBe('unavailable')
      expect(res.message).toContain('secure HTTPS')
      expect(fetch).not.toHaveBeenCalled()
    })

    it('submits manuscript to database queue successfully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: 'c9f086da-2e06-47eb-8280-911a3b110a12' }]), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const client = await loadClient()
      const res = await client.submitChronicleManuscript({
        manuscript_title: 'Reliability of Electronic Photocells in 30m Sprint Acceleration',
        category_slug: 'exercise-physiology',
        primary_author_name: 'Dr. Rajeshwari Nair',
        primary_author_email: 'nair@lnipe.edu.in',
        primary_author_affiliation: 'LNIPE Gwalior',
        ethics_clearance_number: 'TEST-ETHICS-001',
        orcid: '0000-0003-1120-459X',
        co_authors: 'Dr. Alok Sen (SAI NCOE Bengaluru)',
        abstract_text: 'Background: Sprint acceleration testing is critical for talent scouting in athletics and field games. Methods: 40 junior sprinters tested across dual-beam wireless photocells. Results: High ICC of 0.94. Conclusion: Highly reproducible.',
        keywords: 'Sprint Acceleration, Photocells, Testing Reliability',
        article_type: 'preprint',
        full_text_or_url: 'https://zenodo.org/record/1234567',
        data_availability: 'open_access',
        license_type: 'cc-by-nc-nd-4.0',
        license_confirmed: true,
        human_ethics_confirmed: true,
        minor_consent_confirmed: true,
      })

      expect(res.status).toBe('submitted')
      if (res.status === 'submitted') {
        expect(res.submissionId).toMatch(/^KG-SUB-/)
      }
      expect(fetch).toHaveBeenCalledTimes(1)
      const call = vi.mocked(fetch).mock.calls[0]
      expect(call[0]).toContain('/rest/v1/chronicle_submissions')
      expect(call[1]?.method).toBe('POST')
    })
  })

  describe('Configured database queries and RPC calls', () => {
    it('queries only complete published chronicle_papers with category and publication status filters', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 'paper-uuid-1',
              paper_id: 'KG-2026-001',
              slug: 'kinematic-correlates-lumbar-spine-stress-fast-bowlers',
              title: 'Kinematic Correlates of Lumbar Spine Stress in Indian Fast Bowlers',
              category: 'sports-biomechanics',
              category_slug: 'sports-biomechanics',
              author_name: 'Dr. Test Researcher',
              author_affiliation: 'Test Sports Science Institute',
              authors: [{ id: 'author-1', name: 'Dr. Test Researcher', slug: 'dr-test-researcher', affiliation: 'Test Sports Science Institute', role: 'Author', bio: 'Test author.' }],
              publication_status: 'published',
              date_published: '2026-10-24',
              version: 'v1.1',
              status: 'screened',
              license: 'CC BY-NC-ND 4.0',
              reading_time_minutes: 14,
              downloads_count: 412,
              views_count: 1840,
              citations_count: 3,
              abstract: {
                background: 'Lumbar bone stress injuries...',
                methods: 'Eighty-five pace bowlers...',
                results: 'Bowlers demonstrating mixed actions...',
                conclusion: 'Restricting counter-rotation reduces stress...',
              },
              keywords: ['Fast Bowling Biomechanics'],
              sections: [{ title: 'Methods', paragraphs: ['A complete methods section.'] }],
              ethics_statement: 'Ethics review documented.',
              data_availability: 'De-identified data available under request.',
              funding_statement: 'No external funding.',
              conflicts_of_interest: 'No conflicts declared.',
              reference_list: [{ id: 1, text: 'A verified reference.' }],
            },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )

      const client = await loadClient()
      const res = await client.getChroniclePapers('sports-biomechanics')
      expect(res.status).toBe('ready')
      expect(res.data.length).toBe(1)
      expect(res.data[0].paperId).toBe('KG-2026-001')
      expect(fetch).toHaveBeenCalledTimes(1)
      const url = vi.mocked(fetch).mock.calls[0][0] as string
      expect(url).toContain('/rest/v1/chronicle_papers')
      expect(url).toContain('category=eq.sports-biomechanics')
      expect(url).toContain('publication_status=eq.published')
    })

    it('records paper views via database RPC', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }))
      const client = await loadClient()
      await client.recordPaperView('KG-2026-001')
      expect(fetch).toHaveBeenCalledTimes(1)
      const call = vi.mocked(fetch).mock.calls[0]
      expect(call[0]).toContain('/rest/v1/rpc/increment_chronicle_paper_views')
      expect(call[1]?.method).toBe('POST')
    })

    it('records paper downloads via database RPC', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }))
      const client = await loadClient()
      await client.recordPaperDownload('KG-2026-001')
      expect(fetch).toHaveBeenCalledTimes(1)
      const call = vi.mocked(fetch).mock.calls[0]
      expect(call[0]).toContain('/rest/v1/rpc/increment_chronicle_paper_downloads')
      expect(call[1]?.method).toBe('POST')
    })
  })

  describe('KhelChronicle Editorial Moderation Desk', () => {
    it('requires the authenticated Supabase database and never falls back to local demo submissions', async () => {
      const client = await loadClient('', '')
      await expect(client.getChronicleModerationQueue()).rejects.toThrow('not configured')
      expect(client.getLocalModerationQueue()).toEqual([])
    })

    it('requires a meaningful revision message', async () => {
      const client = await loadClient('', '')
      await expect(client.requestManuscriptCorrections('submission-id', 'Short')).rejects.toThrow('at least 10 characters')
    })

    it('requires a rejection reason', async () => {
      const client = await loadClient('', '')
      await expect(client.rejectManuscript('submission-id', '')).rejects.toThrow('reason for rejection')
    })

    it('does not allow publication until a complete manuscript editor exists', async () => {
      const client = await loadClient('', '')
      await expect(
        client.publishManuscriptToArchive('submission-id', 'example-paper', 'KG-2026-999')
      ).rejects.toThrow('not enabled yet')
    })

    it('does not save a manuscript submission into a local moderation queue when Supabase is unconfigured', async () => {
      const client = await loadClient('', '')
      const result = await client.submitChronicleManuscript({
        manuscript_title: 'Hydration and Electrolyte Kinetics in Rural Indian Wrestlers',
        category_slug: 'sports-nutrition',
        primary_author_name: 'Dr. Ramesh Chander',
        primary_author_email: 'ramesh.chander@haryanaakhada.org',
        primary_author_affiliation: 'Chhatrasal Akhada Sports Medicine Cell',
        article_type: 'preprint',
        ethics_clearance_number: 'TEST-ETHICS-001',
        abstract_text: 'A structured evaluation of sodium loss, plasma osmolality, and acute dehydration recovery in 45 traditional mud pit pehlwans.',
        keywords: 'Wrestling, Pehlwani, Dehydration, Electrolytes',
        full_text_or_url: 'https://zenodo.org/record/99887766',
        data_availability: 'open_access',
        human_ethics_confirmed: true,
        minor_consent_confirmed: true,
        license_type: 'cc-by-nc-nd-4.0',
        license_confirmed: true,
      })

      expect(result.status).toBe('unconfigured')
      if (result.status === 'unconfigured') {
        expect(result.message).toContain('No submission was saved')
      }
      expect(client.getLocalModerationQueue()).toEqual([])
    })
  })
})
