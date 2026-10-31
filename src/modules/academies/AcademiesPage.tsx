import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { getAcademies } from '../../integrations/supabase/public-client'
import type { Academy } from '../../shared/domain'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { CatalogueEmptyState, CatalogueFilterPanel } from '../../shared/components/CatalogueFilterPanel'
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
        />

        <div className="kg-catalogue-results">
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
            <div className="academies-loading-box">
              <div className="academy-loading-spinner" />
              <p>Loading sports academies…</p>
            </div>
          ) : visible.length > 0 ? (
            <div className="catalogue-grid">
              {visible.map(item => (
                <article className="catalogue-card academy-card" key={item.id}>
                  <div className="academy-card-top">
                    <span className="card-kicker">
                      <SiteIcon name="building" size={14} /> ACADEMY
                    </span>
                    {item.sport && <span className="academy-card-sport">{item.sport}</span>}
                  </div>

                  <h2>
                    <a
                      href={`/academies/${item.slug}`}
                      onClick={e => onNavigate?.(e, `/academies/${item.slug}`)}
                      className="academy-card-link"
                    >
                      {item.name}
                    </a>
                  </h2>

                  <p className="academy-card-location">
                    <SiteIcon name="map-pin" size={15} /> {item.city}
                    {item.state ? `, ${item.state}` : ''}
                  </p>

                  {item.description && <p className="academy-card-desc">{item.description}</p>}

                  <div className="academy-card-footer">
                    <span className="academy-card-verified">
                      <SiteIcon name="shield-check" size={14} /> Source Verified
                    </span>
                    <a
                      href={`/academies/${item.slug}`}
                      onClick={e => onNavigate?.(e, `/academies/${item.slug}`)}
                      className="academy-view-btn"
                    >
                      <span>View Profile</span>
                      <SiteIcon name="arrow-right" size={14} />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <CatalogueEmptyState
              title={academies.length ? 'No matching academies' : 'No academies available'}
              message={
                academies.length
                  ? 'Try another search keyword, city or sport, or clear your filters.'
                  : 'Newly registered academies will appear here.'
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
