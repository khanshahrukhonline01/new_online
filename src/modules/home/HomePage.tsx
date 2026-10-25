import { useEffect, useState } from 'react'
import { getOpportunities, getSports, getVenues } from '../../integrations/supabase/public-client'
import type { CatalogueResult } from '../../integrations/supabase/public-client'
import type { Opportunity, Sport, Venue } from '../../shared/domain'

export default function HomePage() {
  const [counts, setCounts] = useState<{ sports?: CatalogueResult<Sport>; opportunities?: CatalogueResult<Opportunity>; venues?: CatalogueResult<Venue> }>({})
  useEffect(() => {
    let active = true
    Promise.all([getSports(), getOpportunities(), getVenues()]).then(([sports, opportunities, venues]) => {
      if (active) setCounts({ sports, opportunities, venues })
    })
    return () => { active = false }
  }, [])
  const configured = [counts.sports, counts.opportunities, counts.venues].some(item => item?.status === 'ready')
  const total = (value: CatalogueResult<unknown> | undefined) => value?.status === 'ready' ? value.data.length : '—'
  return <><section className="hero home-hero"><p className="eyebrow">YOUR GAME. YOUR NEXT MOVE.</p><h1>India’s sports journey, connected.</h1><p className="hero-copy">Discover sports, find genuine opportunities, and explore places to play — with clear information and no invented listings.</p><div className="hero-actions"><a className="primary-link" href="/opportunities">Explore opportunities <span aria-hidden="true">↗</span></a><a className="secondary-link" href="/venues">Browse venues</a></div><p className="hero-footnote"><span className={configured ? 'status-dot' : 'status-dot warning'} />{configured ? 'Catalogue connected · counts reflect published records' : 'Development build · connect Supabase to load published catalogue records'}</p></section><section className="stats-row" aria-label="Published catalogue totals"><div><span>Sports</span><strong>{total(counts.sports)}</strong></div><div><span>Opportunities</span><strong>{total(counts.opportunities)}</strong></div><div><span>Venues</span><strong>{total(counts.venues)}</strong></div></section><section className="focus-section"><div className="section-heading"><p className="eyebrow">EXPLORE KHELGRID</p><h2>Make your next move.</h2><p className="page-intro">Start with the catalogue that fits your sporting journey.</p></div><div className="focus-grid"><a className="focus-card focus-link" href="/sports"><span className="card-number">01 / DISCOVER</span><h3>Explore sports</h3><p>Browse the sports catalogue as it grows.</p><span className="card-action">View sports ↗</span></a><a className="focus-card focus-link" href="/opportunities"><span className="card-number">02 / COMPETE</span><h3>Find opportunities</h3><p>Trials, selections, camps and programmes with source details.</p><span className="card-action">Browse opportunities ↗</span></a><a className="focus-card focus-link" href="/venues"><span className="card-number">03 / PLAY</span><h3>Discover venues</h3><p>Explore published venue information. Booking is not enabled yet.</p><span className="card-action">Browse venues ↗</span></a></div></section></>
}
