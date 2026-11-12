import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { AsyncState } from '../../shared/components/AsyncState'
import { getOpportunities } from '../../integrations/supabase/public-client'
import type { CatalogueResult } from '../../integrations/supabase/public-client'
import type { Opportunity } from '../../shared/domain'
import { SiteIcon } from '../../shared/components/SiteIcon'
import {
  CatalogueEmptyState,
  CatalogueFilterPanel,
  CatalogueQuickFilters,
  CatalogueActiveChips,
  type QuickFilterPill,
} from '../../shared/components/CatalogueFilterPanel'
import { DirectoryCallout } from '../../shared/components/DirectoryCallout'
import { TrialAlertActions } from './TrialAlertActions'
import { BookmarkButton } from '../../shared/components/BookmarkButton'
import { createOpportunitySavedItem } from '../../shared/services/savedService'
import { TrialApplicationModal } from './TrialApplicationModal'
import { getUserTrialApplications } from '../../integrations/supabase/athlete-profile-client'

function formatDate(value: string | null) {
  if (!value) return 'Date not provided'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Date not provided'
    : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(date)
}

const EMPTY_OPPORTUNITIES: Opportunity[] = []
const OPPORTUNITY_PAGE_SIZE = 20

const AGE_OPTIONS = [
  { value: 'u14', label: 'Under-14 (U-14)' },
  { value: 'u16', label: 'Under-16 (U-16)' },
  { value: 'u19', label: 'Under-19 (U-19)' },
  { value: 'u23', label: 'Under-23 (U-23)' },
  { value: 'open', label: 'Senior / Open (All Ages)' },
]

export interface OpportunitiesPageProps {
  onOpenIntake?: () => void
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
  initialApplySlug?: string
}

export default function OpportunitiesPage({ onNavigate, initialApplySlug }: OpportunitiesPageProps = {}) {
  const [result, setResult] = useState<CatalogueResult<Opportunity> | { status: 'loading'; data: [] }>({
    status: 'loading',
    data: [],
  })
  const initial = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search)
  const [query, setQuery] = useState(initial.get('q') ?? '')
  const [city, setCity] = useState(initial.get('city') ?? '')
  const [sport, setSport] = useState(initial.get('sport') ?? '')
  const [ageCategory, setAgeCategory] = useState(initial.get('age') ?? '')
  const [type, setType] = useState(initial.get('type') ?? '')
  const [verification, setVerification] = useState(initial.get('status') ?? '')
  const [feeFilter, setFeeFilter] = useState(initial.get('free') === 'true' ? 'free' : (initial.get('fee') ?? ''))
  const [sort, setSort] = useState(initial.get('sort') ?? 'newest')
  const [currentPage, setCurrentPage] = useState(1)
  const [fromDate, setFromDate] = useState(initial.get('from') ?? '')
  const [toDate, setToDate] = useState(initial.get('to') ?? '')
  const [applyOpportunity, setApplyOpportunity] = useState<Opportunity | null>(null)
  const [appliedSlugs, setAppliedSlugs] = useState<Set<string>>(() => {
    const apps = getUserTrialApplications()
    return new Set(apps.map(a => a.trialSlug))
  })

  useEffect(() => {
    const handleApplied = () => {
      const apps = getUserTrialApplications()
      setAppliedSlugs(new Set(apps.map(a => a.trialSlug)))
    }
    window.addEventListener('khelgrid:trial-applied', handleApplied)
    return () => {
      window.removeEventListener('khelgrid:trial-applied', handleApplied)
    }
  }, [])

  useEffect(() => {
    if (initialApplySlug && result.status === 'ready' && result.data.length > 0) {
      const found = result.data.find(r => r.slug === initialApplySlug)
      if (found) setApplyOpportunity(found)
    }
  }, [initialApplySlug, result])

  useEffect(() => {
    let active = true
    const loadOpportunities = () => {
      getOpportunities().then(value => {
        if (active) setResult(value)
      })
    }
    loadOpportunities()
    window.addEventListener('khelgrid:listing-added', loadOpportunities)
    return () => {
      active = false
      window.removeEventListener('khelgrid:listing-added', loadOpportunities)
    }
  }, [])

  const records = useMemo(() => (result.status === 'ready' ? result.data : EMPTY_OPPORTUNITIES), [result])

  const cities = useMemo(
    () => [...new Set(records.map(item => item.city).filter((value): value is string => Boolean(value)))].sort(),
    [records],
  )

  const sports = useMemo(() => {
    const list = new Set<string>()
    records.forEach(item => {
      if (item.sport?.name) list.add(item.sport.name)
    })
    ;['Cricket', 'Football', 'Badminton', 'Basketball', 'Athletics', 'Kabaddi', 'Swimming', 'Tennis', 'Hockey', 'Volleyball', 'Boxing', 'Table Tennis'].forEach(s => list.add(s))
    return [...list].sort()
  }, [records])

  const visible = useMemo(
    () =>
      records
        .filter(item => {
          const q = query.trim().toLocaleLowerCase()
          const start = item.starts_at ? new Date(item.starts_at).getTime() : Number.NaN
          const after = fromDate ? new Date(fromDate + 'T00:00:00+05:30').getTime() : Number.NEGATIVE_INFINITY
          const before = toDate ? new Date(toDate + 'T23:59:59.999+05:30').getTime() : Number.POSITIVE_INFINITY
          return (
            (!q ||
              [item.title, item.organizer_name, item.city, item.venue_name, item.opportunity_type, item.sport?.name].some(value =>
                value?.toLocaleLowerCase().includes(q),
              )) &&
            (!city || (item.city ? (item.city.toLowerCase() === city.toLowerCase() || item.city.toLowerCase().includes(city.toLowerCase()) || city.toLowerCase().includes(item.city.toLowerCase())) : false)) &&
            (!sport || item.sport?.name?.toLowerCase() === sport.toLowerCase()) &&
            (!ageCategory || (
              (item.age_category && item.age_category.toLowerCase().includes(ageCategory.toLowerCase())) ||
              (ageCategory === 'u14' && (item.title.toLowerCase().includes('u-14') || item.title.toLowerCase().includes('u14') || item.title.toLowerCase().includes('under 14'))) ||
              (ageCategory === 'u16' && (item.title.toLowerCase().includes('u-16') || item.title.toLowerCase().includes('u16') || item.title.toLowerCase().includes('under 16'))) ||
              (ageCategory === 'u19' && (item.title.toLowerCase().includes('u-19') || item.title.toLowerCase().includes('u19') || item.title.toLowerCase().includes('under 19'))) ||
              (ageCategory === 'u23' && (item.title.toLowerCase().includes('u-23') || item.title.toLowerCase().includes('u23') || item.title.toLowerCase().includes('under 23'))) ||
              (ageCategory === 'open' && (item.title.toLowerCase().includes('open') || item.title.toLowerCase().includes('senior')))
            )) &&
            (!type || item.opportunity_type === type) &&
            (!verification || item.verification_status === verification) &&
            (!feeFilter || (feeFilter === 'free' ? item.registration_fee === 0 : true)) &&
            (!fromDate || (Number.isFinite(start) && start >= after)) &&
            (!toDate || (Number.isFinite(start) && start <= before))
          )
        })
        .sort((a, b) =>
          sort === 'spots'
            ? (b.available_spots ?? 0) - (a.available_spots ?? 0)
            : sort === 'oldest'
            ? (a.starts_at ?? '').localeCompare(b.starts_at ?? '')
            : sort === 'deadline'
              ? (a.application_deadline ?? '9999').localeCompare(b.application_deadline ?? '9999')
              : (b.starts_at ?? '').localeCompare(a.starts_at ?? ''),
        ),
    [records, query, city, sport, ageCategory, type, verification, feeFilter, fromDate, toDate, sort],
  )

  const totalPages = Math.max(1, Math.ceil(visible.length / OPPORTUNITY_PAGE_SIZE))
  const pageItems = visible.slice((currentPage - 1) * OPPORTUNITY_PAGE_SIZE, currentPage * OPPORTUNITY_PAGE_SIZE)

  useEffect(() => {
    setCurrentPage(1)
  }, [query, city, sport, ageCategory, type, verification, feeFilter, fromDate, toDate, sort])

  const clearAll = () => {
    setQuery('')
    setCity('')
    setSport('')
    setAgeCategory('')
    setType('')
    setVerification('')
    setFeeFilter('')
    setFromDate('')
    setToDate('')
    setSort('newest')
  }

  const fields = [
    { key: 'sport', label: 'Sport', value: sport, onChange: setSport, options: sports.map(value => ({ value, label: value })) },
    { key: 'city', label: 'City', value: city, onChange: setCity, options: cities.map(value => ({ value, label: value })) },
    { key: 'age', label: 'Age group', value: ageCategory, onChange: setAgeCategory, options: AGE_OPTIONS },
    {
      key: 'type',
      label: 'Opportunity type',
      value: type,
      onChange: setType,
      options: ['trial', 'combine', 'scholarship', 'camp', 'job', 'other'].map(value => ({
        value,
        label: value[0].toUpperCase() + value.slice(1),
      })),
    },
    {
      key: 'fee',
      label: 'Fee entry',
      value: feeFilter,
      onChange: setFeeFilter,
      options: [
        { value: 'free', label: 'Free Entry Only (₹0)' },
      ],
    },
    {
      key: 'status',
      label: 'Source status',
      value: verification,
      onChange: setVerification,
      options: ['verified', 'pending_review', 'unverified'].map(value => ({
        value,
        label: value.replace('_', ' '),
      })),
    },
    { key: 'from', label: 'Start date from', value: fromDate, onChange: setFromDate, options: [], inputType: 'date' as const },
    { key: 'to', label: 'Start date to', value: toDate, onChange: setToDate, options: [], inputType: 'date' as const },
  ]

  const quickFilters: QuickFilterPill[] = [
    { id: 'free', label: 'Free Entry (₹0)', icon: 'wallet', active: feeFilter === 'free', onClick: () => setFeeFilter(prev => prev === 'free' ? '' : 'free') },
    { id: 'verified', label: 'Verified Only', icon: 'badge-check', active: verification === 'verified', onClick: () => setVerification(prev => prev === 'verified' ? '' : 'verified') },
    { id: 'trial', label: 'Trials & Combines', icon: 'target', active: type === 'trial', onClick: () => setType(prev => prev === 'trial' ? '' : 'trial') },
    { id: 'cricket', label: 'Cricket', icon: 'sports', active: sport === 'Cricket', onClick: () => setSport(prev => prev === 'Cricket' ? '' : 'Cricket') },
    { id: 'football', label: 'Football', icon: 'sports', active: sport === 'Football', onClick: () => setSport(prev => prev === 'Football' ? '' : 'Football') },
    { id: 'badminton', label: 'Badminton', icon: 'sports', active: sport === 'Badminton', onClick: () => setSport(prev => prev === 'Badminton' ? '' : 'Badminton') },
  ]

  const hasActiveFilters = Boolean(
    query.trim() || city || sport || ageCategory || type || verification || feeFilter || fromDate || toDate || sort !== 'newest',
  )

  return (
    <section className="content-page">
      <p className="eyebrow">TRIALS · SELECTIONS · PROGRAMMES</p>
      <h1>Your next opportunity.</h1>
      <p className="page-intro">
        Published opportunities only. Check the source and organizer details before applying.
      </p>

      <DirectoryCallout
        variant="opportunity"
        tag="Free trial listing"
        title="Organising a sports trial? List it free on KhelGrid."
        description="Share trial dates, eligibility and the organiser’s official notice. Submitting a trial listing is free; evidence is reviewed before publication."
        buttonLabel="Submit a trial"
        buttonHref="/submit-listing"
        onNavigate={onNavigate}
      />
      <div className="kg-catalogue-layout">
        <CatalogueFilterPanel
          search={query}
          onSearch={setQuery}
          searchPlaceholder="Title, organiser, city…"
          fields={fields}
          onClear={clearAll}
          sort={sort}
          onSort={setSort}
          defaultSort="newest"
          resultCount={visible.length}
          totalCount={records.length}
          quickFilters={quickFilters}
        />
        <div className="kg-catalogue-results">
          <CatalogueQuickFilters items={quickFilters} />
          <CatalogueActiveChips search={query} onSearch={setQuery} fields={fields} onClear={clearAll} />
          <div className="kg-results-toolbar">
            <span>
              {visible.length} of {records.length} opportunities
            </span>
            <label>
              Sort by{' '}
              <select value={sort} onChange={e => setSort(e.target.value)}>
                <option value="newest">Newest first</option>
                <option value="oldest">Date: oldest first</option>
                <option value="deadline">Deadline soonest</option>
                <option value="spots">Most spots available</option>
              </select>
            </label>
          </div>
          <AsyncState state={result.status} message={result.status === 'unavailable' ? result.message : undefined}>
            {result.status === 'ready' &&
              (visible.length ? (
                <>
                  <p className="results-count" aria-live="polite">
                    {visible.length} of {records.length} opportunities
                  </p>
                  <div className="listing-stack">
                    {pageItems.map(item => (
                      <article className="listing-card" key={item.id}>
                        {item.slug.startsWith('test-only-') && (
                          <span className="test-only-label">TEST ONLY — NOT A REAL LISTING</span>
                        )}
                        <div className="listing-topline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                            <span className="tag">
                              <SiteIcon name="calendar" size={14} /> {item.opportunity_type.replace('_', ' ')}
                            </span>
                            {Boolean(item.registration_fee && item.registration_fee > 0) && (
                              <span className="tag" style={{ color: '#d97706', borderColor: 'rgba(217,119,6,0.3)', background: 'rgba(217,119,6,0.08)' }}>
                                ₹{item.registration_fee} Entry Fee
                              </span>
                            )}
                            {item.registration_fee === 0 && (
                              <span className="tag" style={{ color: '#16a34a', borderColor: 'rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.08)' }}>
                                ₹0 Athlete Entry
                              </span>
                            )}
                            {item.registration_fee === undefined && (
                              <span className="tag">Athlete entry fee not disclosed</span>
                            )}
                            {Boolean(item.available_spots) && (
                              <span className="tag" style={{ color: '#2563eb', borderColor: 'rgba(37,99,235,0.3)', background: 'rgba(37,99,235,0.08)' }}>
                                {item.available_spots} Spots
                              </span>
                            )}
                            {item.age_category && (
                              <span className="tag" style={{ opacity: 0.85 }}>
                                {item.age_category}
                              </span>
                            )}
                            <span
                              className={item.verification_status === 'verified' ? 'verification verified' : 'verification'}
                            >
                              <SiteIcon
                                name={item.verification_status === 'verified' ? 'shield-check' : 'info'}
                                size={14}
                              />{' '}
                              {item.verification_status === 'verified' ? 'Source reviewed' : 'Not verified'}
                            </span>
                          </div>
                          <BookmarkButton item={createOpportunitySavedItem(item)} />
                        </div>
                        <h2>{item.title}</h2>
                        <p>
                          {[item.organizer_name, item.city, item.venue_name].filter(Boolean).join(' · ') ||
                            'Location or organizer not provided'}
                        </p>
                        <div className="listing-meta">
                          <span>
                            <SiteIcon name="calendar" size={14} /> Start: {formatDate(item.starts_at)}
                          </span>
                          {item.application_deadline && (
                            <span>
                              <SiteIcon name="clock" size={14} /> Deadline: {formatDate(item.application_deadline)}
                            </span>
                          )}
                        </div>
                        {item.source_url && (
                          <a className="text-link" href={item.source_url} target="_blank" rel="noreferrer">
                            <SiteIcon name="external-link" size={14} /> Official organiser notice &amp; registration{' '}
                            {item.source_name ? `· ${item.source_name}` : ''}
                          </a>
                        )}
                        <TrialAlertActions
                          title={item.title}
                          slug={item.slug}
                          startsAt={item.starts_at}
                          deadlineDate={item.application_deadline}
                          city={item.city}
                          venueName={item.venue_name}
                          compact
                        />
                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => setApplyOpportunity(item)}
                            className="btn-apply-sports-cv"
                            style={{
                              padding: '8px 14px',
                              fontSize: '12.5px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              border: 'none',
                              color: '#fff',
                              fontWeight: 700,
                              background: appliedSlugs.has(item.slug) ? '#059669' : '#2563eb',
                            }}
                            aria-label={`Apply with Sports CV to ${item.title}`}
                          >
                            <SiteIcon name={appliedSlugs.has(item.slug) ? 'badge-check' : 'sports-cv'} size={14} />
                            <span>{appliedSlugs.has(item.slug) ? 'Application Submitted ✓' : 'Apply with Sports CV'}</span>
                          </button>
                        </div>
                        <span style={{ display: 'none' }}
                        />
                      </article>
                    ))}
                  </div>
                  {totalPages > 1 && (
                    <nav className="kg-pagination" aria-label="Opportunity result pages">
                      <button type="button" className="admin-btn admin-btn-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(page => Math.max(1, page - 1))}>Previous</button>
                      <span aria-live="polite">Page {currentPage} of {totalPages}</span>
                      <button type="button" className="admin-btn admin-btn-secondary" disabled={currentPage === totalPages} onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}>Next</button>
                    </nav>
                  )}
                </>
              ) : (
                <CatalogueEmptyState
                  title={records.length ? 'No matching opportunities' : 'No published opportunities'}
                  message={
                    records.length
                      ? 'Try another search, city or date range, or clear your filters.'
                      : 'Published records will appear here when available.'
                  }
                  hasFilters={hasActiveFilters}
                  onClear={clearAll}
                />
              ))}
          </AsyncState>
        </div>
      </div>
      {/* Dynamic Selection Trial Application Modal */}
      {applyOpportunity && (
        <TrialApplicationModal
          opportunity={applyOpportunity}
          onClose={() => setApplyOpportunity(null)}
          onSuccess={() => {
            setAppliedSlugs(prev => new Set([...prev, applyOpportunity.slug]))
          }}
          onNavigate={onNavigate}
        />
      )}
    </section>
  )
}
