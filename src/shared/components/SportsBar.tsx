import { useRef } from 'react'
import { SiteIcon } from './SiteIcon'
import { SportIcon, sportIconManifest } from '../sports/sportIcons'

type SportsBarProps = {
  activePath: string
  onNavigate: (event: React.MouseEvent<HTMLAnchorElement>, target: string) => void
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
  const targetFor = (slug?: string) => {
    if (isCatalogueContext) return slug ? `/sports/${slug}` : '/sports'
    const label = slug ? sportIconManifest.find(sport => sport.id === slug)?.label ?? slug : ''
    const query = path === '/search' ? label : label
    return query ? `/search?q=${encodeURIComponent(query)}` : '/sports'
  }

  return <section className="sports-strip" aria-label="Browse sports">
    <button className="sports-strip-arrow" type="button" aria-label="Scroll sports left" onClick={() => listRef.current?.scrollBy({ left: -360, behavior: 'smooth' })}>
      <SiteIcon name="chevron-left" size={18} />
    </button>
    <div className="sports-strip-list" ref={listRef} role="list">
      <a className={allSportsActive ? 'sports-strip-item is-active' : 'sports-strip-item'} href={targetFor()} aria-current={allSportsActive ? 'page' : undefined} onClick={event => onNavigate(event, targetFor())}>
        <span className="sports-strip-icon all-sports-icon" aria-hidden="true"><SiteIcon name="grid-2x2" size={17} /></span>
        <span>All Sports</span>
      </a>
      {sportIconManifest.map(sport => {
        const target = targetFor(sport.id)
        const active = isActiveSport(sport.id)
        return <a key={sport.id} className={active ? 'sports-strip-item is-active' : 'sports-strip-item'} href={target} aria-current={active ? 'page' : undefined} aria-label={`Browse ${sport.label}`} onClick={event => onNavigate(event, target)}>
          <span className="sports-strip-icon" aria-hidden="true"><SportIcon name={sport.id} size={21} /></span>
          <span>{sport.label}</span>
        </a>
      })}
    </div>
    <button className="sports-strip-arrow" type="button" aria-label="Scroll sports right" onClick={() => listRef.current?.scrollBy({ left: 360, behavior: 'smooth' })}>
      <SiteIcon name="chevron-right" size={18} />
    </button>
  </section>
}
