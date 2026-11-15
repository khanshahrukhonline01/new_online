import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { SiteIcon } from './SiteIcon'
import { SportIcon, sportIconManifest } from '../sports/sportIcons'
import { getSports } from '../../integrations/supabase/public-client'
import './SportsBar.css'

type SportsBarProps = {
  activePath: string
  onNavigate: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

function normalizedPath(path: string) {
  return path.replace(/\/+$/, '') || '/'
}

export default function SportsBar({ activePath, onNavigate }: SportsBarProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const path = normalizedPath(activePath)
  const isCatalogueContext = path === '/' || path === '/sports' || path.startsWith('/sports/')
  const isActiveSport = (slug: string) => path === `/sports/${slug}`
  const allSportsActive = path === '/' || path === '/sports'

  // Dynamic sports list backed by database with fallback to sportIconManifest
  const [sportsList, setSportsList] = useState<{ id: string; label: string }[]>(() => [...sportIconManifest])

  useEffect(() => {
    let active = true
    getSports().then(res => {
      if (active && res.status === 'ready' && res.data.length > 0) {
        const seen = new Set<string>()
        const combined: { id: string; label: string }[] = []
        for (const s of res.data) {
          if (!seen.has(s.slug)) {
            seen.add(s.slug)
            combined.push({ id: s.slug, label: s.name })
          }
        }
        for (const m of sportIconManifest) {
          if (!seen.has(m.id)) {
            seen.add(m.id)
            combined.push(m)
          }
        }
        setSportsList(combined)
      }
    })
    return () => {
      active = false
    }
  }, [])

  const targetFor = (slug?: string) => {
    if (isCatalogueContext) return slug ? `/sports/${slug}` : '/sports'
    const label = slug ? (sportsList.find(sport => sport.id === slug)?.label ?? slug) : ''
    return label ? `/search?q=${encodeURIComponent(label)}` : '/sports'
  }

  return (
    <section className="sports-strip" aria-label="Browse sports">
      <button
        className="sports-strip-arrow"
        type="button"
        aria-label="Scroll sports left"
        onClick={() => listRef.current?.scrollBy({ left: -360, behavior: 'smooth' })}
      >
        <SiteIcon name="arrow-left" size={18} />
      </button>
      <div className="sports-strip-list" ref={listRef} role="list">
        <a
          className={allSportsActive ? 'sports-strip-item is-active' : 'sports-strip-item'}
          href={targetFor()}
          aria-current={allSportsActive ? 'page' : undefined}
          onClick={event => onNavigate(event, targetFor())}
        >
          <span className="sports-strip-icon all-sports-icon" aria-hidden="true">
            <SiteIcon name="sports" size={17} />
          </span>
          <span>All Sports</span>
        </a>
        {sportsList.map(sport => {
          const target = targetFor(sport.id)
          const active = isActiveSport(sport.id)
          return (
            <a
              key={sport.id}
              className={active ? 'sports-strip-item is-active' : 'sports-strip-item'}
              href={target}
              aria-current={active ? 'page' : undefined}
              aria-label={`Browse ${sport.label}`}
              onClick={event => onNavigate(event, target)}
            >
              <span className="sports-strip-icon" aria-hidden="true">
                <SportIcon name={sport.label || sport.id} size={21} />
              </span>
              <span>{sport.label}</span>
            </a>
          )
        })}
      </div>
      <button
        className="sports-strip-arrow"
        type="button"
        aria-label="Scroll sports right"
        onClick={() => listRef.current?.scrollBy({ left: 360, behavior: 'smooth' })}
      >
        <SiteIcon name="chevron-right" size={18} />
      </button>
    </section>
  )
}
