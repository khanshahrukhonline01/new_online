import { useEffect, useMemo, useState } from 'react'
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
import { PaymentCheckoutModal } from '../../shared/payments/PaymentCheckoutModal'
import type { PaymentItem } from '../../shared/payments/paymentTypes'

function formatDate(value: string | null) {
  if (!value) return 'Date not provided'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Date not provided'
    : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(date)
}

const EMPTY_OPPORTUNITIES: Opportunity[] = []

const AGE_OPTIONS = [
  { value: 'u14', label: 'Under-14 (U-14)' },
  { value: 'u16', label: 'Under-16 (U-16)' },
  { value: 'u19', label: 'Under-19 (U-19)' },
  { value: 'u23', label: 'Under-23 (U-23)' },
  { value: 'open', label: 'Senior / Open (All Ages)' },
]

export interface OpportunitiesPageProps {
  onOpenIntake?: () => void
}

export default function OpportunitiesPage({ onOpenIntake }: OpportunitiesPageProps = {}) {
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
  const [fromDate, setFromDate] = useState(initial.get('from') ?? '')
  const [toDate, setToDate] = useState(initial.get('to') ?? '')
  const [checkoutItem, setCheckoutItem] = useState<PaymentItem | null>(null)
  const [admitPass, setAdmitPass] = useState<{
    item: Opportunity
    passRef: string
    athleteName: string
    athletePhone: string
    amount: number
  } | null>(null)

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
            (!sport || (item.sport?.name?.toLowerCase() === sport.toLowerCase() || item.title.toLowerCase().includes(sport.toLowerCase()) || (item.opportunity_type && item.opportunity_type.toLowerCase().includes(sport.toLowerCase())))) &&
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
            (!feeFilter || (feeFilter === 'free' ? (item.registration_fee === 0 || item.registration_fee === undefined) : true)) &&
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
        tag="Free Post"
        title="Organising a sports trial? Post for Free"
        description="Broadcast trial dates, age criteria, and circulars across 50+ cities."
        buttonLabel="Submit a trial"
        buttonHref={onOpenIntake ? '#' : 'mailto:khelgrid@gmail.com?subject=Submit%20a%20sports%20trial%20or%20opportunity'}
        onButtonClick={onOpenIntake}
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
                    {visible.map(item => (
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
                            {(item.registration_fee === 0 || item.registration_fee === undefined) && (
                              <span className="tag" style={{ color: '#16a34a', borderColor: 'rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.08)' }}>
                                ₹0 Free Entry
                              </span>
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
                            <SiteIcon name="external-link" size={14} /> View source{' '}
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
                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              const fee = item.registration_fee || 0
                              if (fee > 0) {
                                setCheckoutItem({
                                  id: item.id,
                                  type: 'trial_registration',
                                  title: `Trial Pass · ${item.title}`,
                                  subtitle: `${[item.venue_name, item.city].filter(Boolean).join(', ')}`,
                                  amount: fee,
                                  emoji: '🎟️',
                                  venueName: item.venue_name || undefined,
                                  city: item.city || undefined,
                                })
                              } else {
                                setAdmitPass({
                                  item,
                                  passRef: `PASS-${Date.now().toString().slice(-6)}`,
                                  athleteName: 'Athlete',
                                  athletePhone: '',
                                  amount: 0,
                                })
                              }
                            }}
                            className="venue-btn venue-btn-book"
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
                            }}
                          >
                            <SiteIcon name="badge-check" size={14} />
                            <span>
                              {item.registration_fee && item.registration_fee > 0
                                ? `Register & Pay Pass (₹${item.registration_fee})`
                                : 'Get Free Trial Admit Pass'}
                            </span>
                          </button>
                        </div>
                        <span style={{ display: 'none' }}
                        />
                      </article>
                    ))}
                  </div>
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
      {/* Official Selection Trial Admit Pass Modal */}
      {admitPass && (
        <div className="venue-booking-overlay" onClick={() => setAdmitPass(null)}>
          <div className="venue-booking-modal" onClick={e => e.stopPropagation()}>
            <div className="venue-booking-header">
              <h3>
                <SiteIcon name="badge-check" size={20} />
                <span>Official Selection Trial Admit Pass</span>
              </h3>
              <button
                type="button"
                className="kg-checkout-close"
                onClick={() => setAdmitPass(null)}
              >
                <SiteIcon name="close" size={18} />
              </button>
            </div>
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: '42px', marginBottom: '8px' }}>🎟️</div>
              <h4 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 800 }}>
                {admitPass.item.title}
              </h4>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>
                Present this digital pass at the venue entrance along with photo ID.
              </p>
              <div className="venue-summary-pill" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Admit Pass ID:</span>
                  <strong style={{ fontFamily: 'monospace', color: '#059669' }}>{admitPass.passRef}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Trial Date:</span>
                  <strong>{formatDate(admitPass.item.starts_at)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Location:</span>
                  <strong>{[admitPass.item.venue_name, admitPass.item.city].filter(Boolean).join(', ')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Entry Status:</span>
                  <strong style={{ color: '#16a34a' }}>Confirmed Verified Entry ({admitPass.amount > 0 ? `Paid ₹${admitPass.amount}` : 'Free Entry'})</strong>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button type="button" className="kg-btn-cancel" style={{ flex: 1 }} onClick={() => window.print?.()}>
                  <SiteIcon name="download" size={15} />
                  <span>Print Pass</span>
                </button>
                <button type="button" className="venue-btn venue-btn-book" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setAdmitPass(null)}>
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal for Paid Trials */}
      {checkoutItem && (
        <PaymentCheckoutModal
          isOpen={Boolean(checkoutItem)}
          onClose={() => setCheckoutItem(null)}
          item={checkoutItem}
          onSuccess={paymentResult => {
            const currentItem = records.find(r => r.id === checkoutItem.id)
            setCheckoutItem(null)
            if (currentItem) {
              setAdmitPass({
                item: currentItem,
                passRef: paymentResult.receiptRef,
                athleteName: 'Verified Athlete',
                athletePhone: '',
                amount: paymentResult.amount,
              })
            }
          }}
          allowPayAtVenue={false}
        />
      )}
    </section>
  )
}
