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

  describe('Unconfigured development mode fallback', () => {
    it('returns local categories when Supabase is unconfigured', async () => {
      const client = await loadClient('', '')
      const result = await client.getChronicleCategories()
      expect(result.status).toBe('unconfigured')
      expect(result.data.length).toBeGreaterThanOrEqual(7)
      expect(result.data.some(c => c.slug === 'sports-biomechanics')).toBe(true)
      expect(fetch).not.toHaveBeenCalled()
    })

    it('returns filtered local preprints when Supabase is unconfigured', async () => {
      const client = await loadClient('', '')
      const result = await client.getChroniclePapers('sports-biomechanics')
      expect(result.status).toBe('unconfigured')
      expect(result.data.length).toBeGreaterThan(0)
      expect(result.data.every(p => p.category === 'sports-biomechanics')).toBe(true)
      expect(fetch).not.toHaveBeenCalled()
    })

    it('searches papers locally when Supabase is unconfigured', async () => {
      const client = await loadClient('', '')
      const result = await client.getChroniclePapers(undefined, 'Lumbar Spine')
      expect(result.status).toBe('unconfigured')
      expect(result.data.length).toBeGreaterThan(0)
      expect(result.data[0].title).toContain('Lumbar Spine')
      expect(fetch).not.toHaveBeenCalled()
    })

    it('fetches paper by slug locally when unconfigured', async () => {
      const client = await loadClient('', '')
      const result = await client.getChroniclePaperBySlug('KG-2026-001')
      expect(result.status).toBe('unconfigured')
      expect(result.data).toBeDefined()
      expect(result.data?.paperId).toBe('KG-2026-001')
      expect(fetch).not.toHaveBeenCalled()
    })

    it('fetches author profile locally when unconfigured', async () => {
      const client = await loadClient('', '')
      const result = await client.getChronicleAuthorBySlug('dr-vikramaditya-rathore')
      expect(result.status).toBe('unconfigured')
      expect(result.data?.author.name).toBe('Dr. Vikramaditya Rathore')
      expect(result.data?.papers.length).toBeGreaterThan(0)
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
        abstract_text: 'A'.repeat(60),
        keywords: 'test',
        full_text_or_url: '',
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
        abstract_text: 'A'.repeat(60),
        keywords: 'test',
        full_text_or_url: '',
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
        abstract_text: 'A'.repeat(60),
        keywords: 'test',
        full_text_or_url: '',
        human_ethics_confirmed: false,
        minor_consent_confirmed: true,
      })
      expect(res.status).toBe('unavailable')
      expect(res.message).toContain('Ethics confirmation')
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
        abstract_text: 'A'.repeat(60),
        keywords: 'test',
        full_text_or_url: 'http://insecure-site.com/paper.pdf',
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
        orcid: '0000-0003-1120-459X',
        co_authors: 'Dr. Alok Sen (SAI NCOE Bengaluru)',
        abstract_text: 'Background: Sprint acceleration testing is critical for talent scouting in athletics and field games. Methods: 40 junior sprinters tested across dual-beam wireless photocells. Results: High ICC of 0.94. Conclusion: Highly reproducible.',
        keywords: 'Sprint Acceleration, Photocells, Testing Reliability',
        full_text_or_url: 'https://zenodo.org/record/1234567',
        human_ethics_confirmed: true,
        minor_consent_confirmed: true,
      })

      expect(res.status).toBe('submitted')
      if (res.status === 'submitted') {
        expect(res.submissionId).toBe('KG-SUB-C9F086DA')
      }
      expect(fetch).toHaveBeenCalledTimes(1)
      const call = vi.mocked(fetch).mock.calls[0]
      expect(call[0]).toContain('/rest/v1/chronicle_submissions')
      expect(call[1]?.method).toBe('POST')
    })
  })

  describe('Configured database queries and RPC calls', () => {
    it('queries chronicle_papers with category and status filters', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 'paper-uuid-1',
              paper_id: 'KG-2026-001',
              slug: 'kinematic-correlates-lumbar-spine-stress-fast-bowlers',
              title: 'Kinematic Correlates of Lumbar Spine Stress in Indian Fast Bowlers',
              category_slug: 'sports-biomechanics',
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
})
