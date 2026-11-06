import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { getAcademies } from '../../integrations/supabase/public-client'
import type { Academy } from '../../shared/domain'
import { SiteIcon } from '../../shared/components/SiteIcon'
import {
  CatalogueEmptyState,
  CatalogueFilterPanel,
  CatalogueQuickFilters,
  CatalogueActiveChips,
  type QuickFilterPill,
} from '../../shared/components/CatalogueFilterPanel'
import { DirectoryCallout } from '../../shared/components/DirectoryCallout'
import { CURATED_ACADEMIES } from '../../shared/data/curatedEntitiesData'
import './AcademiesPage.css'

export interface AcademiesPageProps {
  onOpenIntake?: () => void
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

export default function AcademiesPage({ onOpenIntake, onNavigate }: AcademiesPageProps) {
  const [academies, setAcademies] = useState<Academy[]>(CURATED_ACADEMIES)
  const [loading, setLoading] = useState(false)

  const initial = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search)
  const [query, setQuery] = useState(initial.get('q') ?? '')
  const [city, setCity] = useState(initial.get('city') ?? '')
  const [sport, setSport] = useState(initial.get('sport') ?? '')
  const [sort, setSort] = useState(initial.get('sort') ?? 'name')

  useEffect(() => {
    let active = true
    const loadAcademies = () => {
      setLoading(true)
      getAcademies().then(res => {
        if (!active) return
        if (res.status === 'ready' && res.data.length > 0) {
          // Merge with curated items that are not in res.data
          const slugs = new Set(res.data.map(a => a.slug))
          const merged = [...res.data, ...CURATED_ACADEMIES.filter(c => !slugs.has(c.slug))]
          setAcademies(merged)
        } else {
          setAcademies(CURATED_ACADEMIES)
        }
        setLoading(false)
      })
    }
    loadAcademies()

    window.addEventListener('khelgrid:listing-added', loadAcademies)
    return () => {
      active = false
      window.removeEventListener('khelgrid:listing-added', loadAcademies)
    }
  }, [])

  const cities = useMemo(
    () => [...new Set(academies.map(item => item.city).filter((c): c is string => Boolean(c)))].sort(),
    [academies],
  )

  const sports = useMemo(
    () => [
      ...new Set(
        academies.map(item => item.sport || (item as unknown as { sport?: string }).sport || 'Football'),
      ),
    ].sort(),
    [academies],
  )

  const visible = useMemo(
    () =>
      academies
        .filter(item => {
          const itemSport = item.sport || 'Multi-Sport'
          return (
            (!city || item.city.toLowerCase().includes(city.toLowerCase())) &&
            (!sport || itemSport.toLowerCase().includes(sport.toLowerCase())) &&
            (!query.trim() ||
              [item.name, item.description, item.city, itemSport].some(val =>
                val?.toLowerCase().includes(query.trim().toLowerCase()),
              ))
          )
        })
        .sort((a, b) =>
          sort === 'city' ? (a.city ?? '').localeCompare(b.city ?? '') : a.name.localeCompare(b.name),
        ),
    [academies, city, sport, query, sort],
  )

  const clearAll = () => {
    setQuery('')
    setCity('')
    setSport('')
    setSort('name')
  }

  const fields = [
    { key: 'city', label: 'City', value: city, onChange: setCity, options: cities.map(val => ({ value: val, label: val })) },
    { key: 'sport', label: 'Sport', value: sport, onChange: setSport, options: sports.map(val => ({ value: val, label: val })) },
  ]

  const quickFilters: QuickFilterPill[] = [
    { id: 'football', label: 'Football Academies', icon: 'sports', active: sport === 'Football', onClick: () => setSport(prev => prev === 'Football' ? '' : 'Football') },
    { id: 'badminton', label: 'Badminton Academies', icon: 'sports', active: sport === 'Badminton', onClick: () => setSport(prev => prev === 'Badminton' ? '' : 'Badminton') },
    { id: 'boxing', label: 'Boxing Academies', icon: 'sports', active: sport === 'Boxing', onClick: () => setSport(prev => prev === 'Boxing' ? '' : 'Boxing') },
    { id: 'bengaluru', label: 'Bengaluru', icon: 'map-pin', active: city === 'Bengaluru', onClick: () => setCity(prev => prev === 'Bengaluru' ? '' : 'Bengaluru') },
    { id: 'hyderabad', label: 'Hyderabad', icon: 'map-pin', active: city === 'Hyderabad', onClick: () => setCity(prev => prev === 'Hyderabad' ? '' : 'Hyderabad') },
  ]

  const hasActiveFilters = Boolean(query.trim() || city || sport || sort !== 'name')

  return (
    <section className="content-page academies-directory-page">
      <p className="eyebrow">ACADEMY &amp; TRAINING DIRECTORY</p>
      <h1>Certified Sports Academies in India.</h1>
      <p className="page-intro">
        Explore verified training institutes, youth development centers, and high performance coaching academies across India.
      </p>

      <DirectoryCallout
        variant="venue"
        tag="Verified Center"
        title="Operate a sports academy or coaching club? List with 0% Fee"
        description="Showcase your training curriculum, age-group batches, and ground facilities to athletes across India."
        buttonLabel="+ Register Academy"
        buttonHref={onOpenIntake ? '#' : 'mailto:khelgrid@gmail.com?subject=Register%20a%20sports%20academy%20on%20KhelGrid'}
        onButtonClick={onOpenIntake}
      />

      <div className="kg-catalogue-layout">
        <CatalogueFilterPanel
          search={query}
          onSearch={setQuery}
          searchPlaceholder="Academy name, city, sport…"
          fields={fields}
          onClear={clearAll}
          sort={sort}
          onSort={setSort}
          defaultSort="name"
          resultCount={visible.length}
          totalCount={academies.length}
          quickFilters={quickFilters}
        />

        <div className="kg-catalogue-results">
          <CatalogueQuickFilters items={quickFilters} />
          <CatalogueActiveChips search={query} onSearch={setQuery} fields={fields} onClear={clearAll} />
          <div className="kg-results-toolbar">
            <span>
              {visible.length} of {academies.length} academies
            </span>
            <label>
              Sort by{' '}
              <select value={sort} onChange={e => setSort(e.target.value)}>
                <option value="name">Name A to Z</option>
                <option value="city">City</option>
              </select>
            </label>
          </div>

          {loading ? (
            <div className="loading-state">Loading certified academies…</div>
          ) : visible.length > 0 ? (
            <div className="academies-grid">
              {visible.map(academy => {
                const academySlug = academy.slug || academy.id
                return (
                  <article className="academy-card" key={academy.id}>
                    <div className="academy-card-header">
                      <span className="academy-card-sport">{academy.sport || 'Multi-Sport'}</span>
                      {academy.verification_status === 'verified' ? (
                        <span className="academy-card-verified">
                          <SiteIcon name="badge-check" size={13} /> Source Verified
                        </span>
                      ) : (
                        <span className="academy-card-unverified">Listed Institute</span>
                      )}
                    </div>

                    <h2 className="academy-card-name">{academy.name}</h2>
                    <p className="academy-card-location">
                      <SiteIcon name="map-pin" size={14} />
                      <span>{[academy.city, academy.state].filter(Boolean).join(', ') || 'Pan-India'}</span>
                    </p>

                    <p className="academy-card-desc">
                      {academy.description || 'Dedicated sports coaching, youth athlete training batches, and skills development center.'}
                    </p>

                    <div className="academy-card-footer">
                      <a
                        href={`/academies/${academySlug}`}
                        className="academy-view-btn"
                        onClick={e => onNavigate?.(e, `/academies/${academySlug}`)}
                      >
                        View Profile <SiteIcon name="arrow-right" size={14} />
                      </a>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <CatalogueEmptyState
              title={academies.length ? 'No matching academies' : 'No academies listed yet'}
              message={
                academies.length
                  ? 'Try selecting another sport, city, or clearing your search filters.'
                  : 'Verified academy directories will appear here as they are published.'
              }
              hasFilters={hasActiveFilters}
              onClear={clearAll}
            />
          )}
        </div>
      </div>
    </section>
  )
}
