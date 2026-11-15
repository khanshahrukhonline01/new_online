import { useEffect, useMemo, useState } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { AsyncState } from '../../shared/components/AsyncState'
import { CatalogueEmptyState, CatalogueFilterPanel } from '../../shared/components/CatalogueFilterPanel'
import {
  getAcademies,
  getCoaches,
  getEvents,
  type CatalogueResult,
} from '../../integrations/supabase/public-client'
import type { Academy, Coach, EventItem } from '../../shared/domain'
import { DirectoryCallout } from '../../shared/components/DirectoryCallout'
import './feature-directory.css'

type Kind = 'coaches' | 'academies' | 'events' | 'calendar'
type DirectoryRecord = Academy | Coach | EventItem

interface DirectoryConfig {
  title: string
  eyebrow: string
  intro: string
  defaultSort: string
  sortOptions: Array<{ value: string; label: string }>
}

const config: Record<Kind, DirectoryConfig> = {
  coaches: {
    title: 'Coaches directory',
    eyebrow: 'COACHING',
    intro:
      'Explore verified coach profiles and Dronacharya mentors. Confirm experience, credentials and contact details directly with each coach.',
    defaultSort: 'name',
    sortOptions: [
      { value: 'name', label: 'Name A to Z' },
      { value: 'city', label: 'City' },
    ],
  },
  academies: {
    title: 'Sports academies',
    eyebrow: 'ACADEMIES',
    intro:
      'Browse published sports academy records and high-performance centres. Confirm programme availability, admission, fees and facilities with the academy.',
    defaultSort: 'name',
    sortOptions: [
      { value: 'name', label: 'Name A to Z' },
      { value: 'city', label: 'City' },
    ],
  },
  events: {
    title: 'Events & tournaments',
    eyebrow: 'SPORTS EVENTS',
    intro:
      'Discover published tournaments and national championships with official dates and source links. Verify fixture changes with the organiser.',
    defaultSort: 'date',
    sortOptions: [
      { value: 'date', label: 'Date / upcoming' },
      { value: 'name', label: 'Title A to Z' },
    ],
  },
  calendar: {
    title: 'Sports calendar',
    eyebrow: 'SPORTS CALENDAR',
    intro:
      'Filter published sports events by date. Dates are displayed in Indian Standard Time (IST); confirm changes with the organiser.',
    defaultSort: 'date',
    sortOptions: [
      { value: 'date', label: 'Date / upcoming' },
      { value: 'name', label: 'Title A to Z' },
    ],
  },
}

function isSafeExternalUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function formatDate(value?: string | null): string {
  if (!value) return 'Date not provided'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Date not provided'
    : new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata',
      }).format(date)
}

const EMPTY_RECORDS: never[] = []

export default function FeatureDirectoryPage({ kind }: { kind: Kind }) {
  const page = config[kind]
  const [result, setResult] = useState<CatalogueResult<DirectoryRecord> | { status: 'loading'; data: [] }>({
    status: 'loading',
    data: [],
  })

  const initial = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search)
  const [query, setQuery] = useState(initial.get('q') ?? '')
  const [city, setCity] = useState(initial.get('city') ?? '')
  const [eventType, setEventType] = useState(initial.get('type') ?? '')
  const [fromDate, setFromDate] = useState(initial.get('from') ?? '')
  const [toDate, setToDate] = useState(initial.get('to') ?? '')
  const [sort, setSort] = useState(initial.get('sort') ?? page.defaultSort)

  useEffect(() => {
    let active = true
    const loadDirectory = () => {
      const loader =
        kind === 'academies'
          ? getAcademies()
          : kind === 'coaches'
            ? getCoaches()
            : getEvents()

      loader.then(res => {
        if (active) setResult(res as CatalogueResult<DirectoryRecord>)
      })
    }

    loadDirectory()
    window.addEventListener('khelgrid:listing-added', loadDirectory)

    return () => {
      active = false
      window.removeEventListener('khelgrid:listing-added', loadDirectory)
    }
  }, [kind])

  const records = useMemo(() => (result.status === 'ready' ? result.data : EMPTY_RECORDS), [result])

  const cities = useMemo(
    () =>
      [
        ...new Set(
          records
            .map(r => r.city?.trim())
            .filter((v): v is string => Boolean(v)),
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [records],
  )

  const eventTypes = useMemo(
    () =>
      kind === 'events' || kind === 'calendar'
        ? [
            ...new Set(
              (records as EventItem[])
                .map(r => r.event_type)
                .filter((v): v is EventItem['event_type'] => Boolean(v)),
            ),
          ].sort()
        : [],
    [records, kind],
  )

  const visible = useMemo(() => {
    return records
      .filter(r => {
        const name =
          ('display_name' in r ? r.display_name : undefined) ??
          ('name' in r ? r.name : undefined) ??
          ('title' in r ? r.title : undefined) ??
          ''
        const bioOrDesc = ('bio' in r ? r.bio : undefined) ?? ('description' in r ? r.description : undefined) ?? ''
        const organizer = 'organizer_name' in r ? r.organizer_name : ''
        const venue = 'venue_name' in r ? r.venue_name : ''
        const state = 'state' in r ? r.state : ''
        const evType = 'event_type' in r ? r.event_type : ''

        const matches = [name, bioOrDesc, r.city, state, organizer, venue, evType].some(v =>
          v?.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
        )
        if (!matches) return false
        if (city && r.city !== city) return false
        if (eventType && evType !== eventType) return false

        if (kind === 'calendar' && 'starts_at' in r && r.starts_at) {
          const time = new Date(r.starts_at).getTime()
          const after = fromDate ? new Date(fromDate + 'T00:00:00+05:30').getTime() : Number.NEGATIVE_INFINITY
          const before = toDate ? new Date(toDate + 'T23:59:59.999+05:30').getTime() : Number.POSITIVE_INFINITY
          if (Number.isFinite(time) && (time < after || time > before)) return false
        }
        return true
      })
      .sort((a, b) => {
        const nameA =
          ('display_name' in a ? a.display_name : undefined) ??
          ('name' in a ? a.name : undefined) ??
          ('title' in a ? a.title : undefined) ??
          ''
        const nameB =
          ('display_name' in b ? b.display_name : undefined) ??
          ('name' in b ? b.name : undefined) ??
          ('title' in b ? b.title : undefined) ??
          ''
        if (sort === 'city') return (a.city ?? '').localeCompare(b.city ?? '')
        if (sort === 'date' && 'starts_at' in a && 'starts_at' in b) {
          return (a.starts_at ?? '').localeCompare(b.starts_at ?? '')
        }
        return nameA.localeCompare(nameB)
      })
  }, [records, query, city, eventType, fromDate, toDate, kind, sort])

  const clearAll = () => {
    setQuery('')
    setCity('')
    setEventType('')
    setFromDate('')
    setToDate('')
    setSort(page.defaultSort)
  }

  const fields = [
    {
      key: 'city',
      label: 'City',
      value: city,
      onChange: setCity,
      options: cities.map(value => ({ value, label: value })),
    },
    ...(kind === 'events' || kind === 'calendar'
      ? [
          {
            key: 'type',
            label: 'Event type',
            value: eventType,
            onChange: setEventType,
            options: eventTypes.map(value => ({
              value,
              label: value[0].toUpperCase() + value.slice(1),
            })),
          },
        ]
      : []),
    ...(kind === 'calendar'
      ? [
          {
            key: 'from',
            label: 'From date',
            value: fromDate,
            onChange: setFromDate,
            options: [],
            inputType: 'date' as const,
          },
          {
            key: 'to',
            label: 'To date',
            value: toDate,
            onChange: setToDate,
            options: [],
            inputType: 'date' as const,
          },
        ]
      : []),
  ]

  const hasActiveFilters = Boolean(
    query.trim() || city || eventType || fromDate || toDate || sort !== page.defaultSort,
  )

  return (
    <section className="content-page feature-directory-page">
      <p className="eyebrow">KHELGRID · {page.eyebrow}</p>
      <h1>{page.title}</h1>
      <p className="page-intro">{page.intro}</p>

      {kind === 'coaches' && (
        <DirectoryCallout
          variant="coach"
          tag="Free Listing"
          title="Coaching in India? Get Listed Free"
          description="Create your verified coach profile & connect with athletes across India."
          buttonLabel="Join as Coach"
          buttonHref="mailto:khelgrid@gmail.com?subject=Register%20as%20a%20coach%20on%20KhelGrid"
        />
      )}

      <div className="kg-catalogue-layout">
        <CatalogueFilterPanel
          search={query}
          onSearch={setQuery}
          searchPlaceholder="Name, description or city…"
          fields={fields}
          onClear={clearAll}
          sort={sort}
          onSort={setSort}
          defaultSort={page.defaultSort}
          resultCount={visible.length}
          totalCount={records.length}
        />

        <div className="kg-catalogue-results">
          <div className="kg-results-toolbar">
            <span>
              {visible.length} of {records.length} published records
            </span>
            <label>
              Sort by{' '}
              <select value={sort} onChange={e => setSort(e.target.value)}>
                {page.sortOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <AsyncState state={result.status} message={result.status === 'unavailable' ? result.message : undefined}>
            {result.status === 'ready' &&
              (visible.length ? (
                <div className="catalogue-grid">
                  {visible.map(r => {
                    const name =
                      ('display_name' in r ? r.display_name : undefined) ??
                      ('name' in r ? r.name : undefined) ??
                      ('title' in r ? r.title : undefined) ??
                      'Untitled record'
                    const bioOrDesc =
                      ('bio' in r ? r.bio : undefined) ?? ('description' in r ? r.description : undefined)
                    const state = 'state' in r ? r.state : undefined
                    const evType = 'event_type' in r ? r.event_type : undefined
                    const isVerified = r.verification_status === 'verified'

                    const websiteUrl =
                      'website_url' in r && r.website_url
                        ? r.website_url
                        : 'source_url' in r && r.source_url
                          ? r.source_url
                          : undefined

                    return (
                      <article className="catalogue-card" key={r.id}>
                        <div className="listing-topline">
                          <span className="card-kicker">
                            {evType ? evType.toUpperCase() : r.city ? r.city.toUpperCase() : 'PUBLISHED'}
                          </span>
                          {isVerified && (
                            <span className="verification verified">
                              <SiteIcon name="shield-check" size={13} /> Verified
                            </span>
                          )}
                        </div>

                        <h2>{name}</h2>

                        {(r.city || state) && (
                          <p>
                            <SiteIcon name="map-pin" size={14} /> {[r.city, state].filter(Boolean).join(', ')}
                          </p>
                        )}

                        {bioOrDesc && <p>{bioOrDesc}</p>}

                        {'starts_at' in r && r.starts_at && (
                          <p>
                            <strong>Starts:</strong> {formatDate(r.starts_at)}
                            {r.ends_at ? ' · Ends: ' + formatDate(r.ends_at) : ''}
                          </p>
                        )}

                        {'organizer_name' in r && r.organizer_name && (
                          <p>
                            <strong>Organiser:</strong> {r.organizer_name}
                          </p>
                        )}

                        {'venue_name' in r && r.venue_name && (
                          <p>
                            <strong>Venue:</strong> {r.venue_name}
                          </p>
                        )}

                        {websiteUrl && isSafeExternalUrl(websiteUrl) && (
                          <a
                            className="card-action"
                            href={websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open official source <SiteIcon name="arrow-up-right" size={14} />
                          </a>
                        )}
                      </article>
                    )
                  })}
                </div>
              ) : (
                <CatalogueEmptyState
                  title={records.length ? 'No matching records' : 'No published records yet'}
                  message={
                    records.length
                      ? 'Try another search keyword, city or date range, or clear your filters.'
                      : 'Records appear here after they are reviewed and published. No listings are fabricated.'
                  }
                  hasFilters={hasActiveFilters}
                  onClear={clearAll}
                />
              ))}
          </AsyncState>
        </div>
      </div>

      <p className="coming-soon-note">
        Publication does not mean commercial endorsement. Confirm dates, eligibility, credentials, and fees directly with
        the official organisation before taking action.
      </p>
    </section>
  )
}
