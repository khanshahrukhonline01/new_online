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
  const countState = (value: CatalogueResult<unknown> | undefined) => {
    if (!value) return 'Loading catalogue…'
    if (value.status === 'unconfigured') return 'Not configured'
    if (value.status === 'unavailable') return 'Temporarily unavailable'
    return value.data.length === 0 ? 'No published records yet' : `${value.data.length} published`
  }
  const total = (value: CatalogueResult<unknown> | undefined) => value?.status === 'ready' ? value.data.length : '—'
  const ready = [counts.sports, counts.opportunities, counts.venues].some(item => item?.status === 'ready')
  return <>
    <section className="home-hero-panel">
      <div className="home-hero-copy">
        <p className="eyebrow">YOUR GAME. YOUR NEXT MOVE.</p>
        <h1>Discover. Compete. <span>Grow.</span></h1>
        <p className="hero-copy">Your sports discovery platform for sports, genuine opportunities, and places to play — with source details and clear data status.</p>
        <div className="hero-actions">
          <a className="primary-link" href="/opportunities">Explore opportunities <span aria-hidden="true">↗</span></a>
          <a className="secondary-link" href="/sports">Browse sports</a>
        </div>
        <div className="home-trust-points" aria-label="Platform principles">
          <span><i aria-hidden="true">✓</i> Source-aware listings</span>
          <span><i aria-hidden="true">✓</i> No fabricated records</span>
          <span><i aria-hidden="true">✓</i> Built for every screen</span>
        </div>
      </div>
      <div className="home-hero-art" aria-label="KhelGrid sports discovery illustration">
        <div className="hero-art-orbit orbit-one" />
        <div className="hero-art-orbit orbit-two" />
        <div className="hero-art-ball" aria-hidden="true">K</div>
        <div className="hero-art-caption"><span className="status-dot" /> SPORTS DISCOVERY <strong>FOUNDATION V1</strong></div>
      </div>
    </section>
    <section className="home-catalogue-status" aria-labelledby="catalogue-status-title">
      <div className="section-heading compact-heading"><p className="eyebrow">LIVE CATALOGUE STATUS</p><h2 id="catalogue-status-title">What’s available now</h2><p>Counts appear only when the connected catalogue returns real records.</p></div>
      <div className="stats-row home-stats">
        <div><span><span className="stat-icon" aria-hidden="true">◇</span> Sports</span><strong>{total(counts.sports)}</strong><small>{countState(counts.sports)}</small></div>
        <div><span><span className="stat-icon" aria-hidden="true">▦</span> Trials & opportunities</span><strong>{total(counts.opportunities)}</strong><small>{countState(counts.opportunities)}</small></div>
        <div><span><span className="stat-icon" aria-hidden="true">⌖</span> Venues</span><strong>{total(counts.venues)}</strong><small>{countState(counts.venues)}</small></div>
      </div>
      <p className="home-data-note"><span className={ready ? 'status-dot' : 'status-dot warning'} />{ready ? 'Connected catalogue response received. Each section still shows its own state.' : 'Development environment · catalogue connection or published records may not be available yet.'}</p>
    </section>
    <section className="focus-section home-explore-section">
      <div className="section-heading"><p className="eyebrow">EXPLORE KHELGRID</p><h2>Make your next move.</h2><p className="page-intro">Start with the part of your sporting journey you want to explore.</p></div>
      <div className="focus-grid home-feature-grid">
        <a className="focus-card focus-link home-feature-card" href="/sports"><span className="feature-icon" aria-hidden="true">◇</span><span className="card-number">01 / DISCOVER</span><h3>Explore sports</h3><p>Browse the sports catalogue as real published data becomes available.</p><span className="card-action">Explore sports <span aria-hidden="true">↗</span></span></a>
        <a className="focus-card focus-link home-feature-card" href="/opportunities"><span className="feature-icon" aria-hidden="true">▦</span><span className="card-number">02 / COMPETE</span><h3>Find opportunities</h3><p>Explore trials, selections, camps and programmes with source information.</p><span className="card-action">Browse opportunities <span aria-hidden="true">↗</span></span></a>
        <a className="focus-card focus-link home-feature-card" href="/venues"><span className="feature-icon" aria-hidden="true">⌖</span><span className="card-number">03 / PLAY</span><h3>Discover venues</h3><p>Review published venue information. Booking and live availability are not enabled.</p><span className="card-action">Browse venues <span aria-hidden="true">↗</span></span></a>
      </div>
    </section>
    <section className="foundation-strip" aria-label="Frontend foundation principles">
      <div><span aria-hidden="true">✓</span><strong>Modular navigation</strong><small>Shared route registry</small></div>
      <div><span aria-hidden="true">▣</span><strong>Responsive design</strong><small>Desktop, tablet and mobile</small></div>
      <div><span aria-hidden="true">◎</span><strong>Accessible by default</strong><small>Keyboard and focus support</small></div>
      <div><span aria-hidden="true">◉</span><strong>Data-state ready</strong><small>Loading, empty and errors</small></div>
    </section>
  </>
}
