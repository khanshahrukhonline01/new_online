import { useEffect, useState } from 'react'
import { getOpportunities, getSports, getVenues } from '../../integrations/supabase/public-client'
import type { CatalogueResult } from '../../integrations/supabase/public-client'
import type { Opportunity, Sport, Venue } from '../../shared/domain'
import { SiteIcon } from '../../shared/components/SiteIcon'

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
        <p className="hero-copy">Explore sports, find opportunities, and discover places to play. Clear information helps you decide your next move.</p>
        <div className="hero-actions">
          <a className="primary-link" href="/opportunities">Explore opportunities <SiteIcon name="arrow-up-right" size={16} /></a>
          <a className="secondary-link" href="/sports">Browse sports</a>
        </div>
        <div className="home-trust-points" aria-label="Platform principles">
          <span><SiteIcon name="shield-check" size={15} /> Source-aware listings</span>
          <span><SiteIcon name="check-circle" size={15} /> No fabricated records</span>
          <span><SiteIcon name="smartphone" size={15} /> Built for every screen</span>
        </div>
      </div>
      <div className="home-hero-art hero-athlete-collage" aria-label="Athletes playing football, cricket, running and tennis">
        <div className="hero-athlete-photo hero-athlete-football">
          <img src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=900&q=85" alt="Football players competing on a pitch" loading="eager" fetchPriority="high" />
          <span>FOOTBALL</span>
        </div>
        <div className="hero-athlete-photo hero-athlete-cricket">
          <img src="https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=700&q=85" alt="Cricket players on the field" loading="lazy" />
          <span>CRICKET</span>
        </div>
        <div className="hero-athlete-photo hero-athlete-running">
          <img src="https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=700&q=85" alt="Athletes running on a track" loading="lazy" />
          <span>ATHLETICS</span>
        </div>
        <div className="hero-athlete-photo hero-athlete-tennis">
          <img src="https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=700&q=85" alt="Tennis player on court" loading="lazy" />
          <span>TENNIS</span>
        </div>
        <div className="hero-athlete-overlay">
          <span className="hero-athlete-kicker"><span className="status-dot" /> MADE FOR EVERY SPORT</span>
          <strong>Find your<br /><em>next move.</em></strong>
          <span className="hero-athlete-tagline">DISCOVER · COMPETE · GROW</span>
        </div>
      </div>
    </section>
    <section className="home-catalogue-status" aria-labelledby="catalogue-status-title">
      <div className="section-heading compact-heading"><p className="eyebrow">LIVE CATALOGUE STATUS</p><h2 id="catalogue-status-title">What’s available now</h2><p>Counts appear only when the connected catalogue returns real records.</p></div>
      <div className="stats-row home-stats">
        <div><span><span className="stat-icon" aria-hidden="true"><SiteIcon name="sports" size={17} /></span> Sports</span><strong>{total(counts.sports)}</strong><small>{countState(counts.sports)}</small></div>
        <div><span><span className="stat-icon" aria-hidden="true"><SiteIcon name="opportunities" size={17} /></span> Trials & opportunities</span><strong>{total(counts.opportunities)}</strong><small>{countState(counts.opportunities)}</small></div>
        <div><span><span className="stat-icon" aria-hidden="true"><SiteIcon name="map-pin" size={17} /></span> Venues</span><strong>{total(counts.venues)}</strong><small>{countState(counts.venues)}</small></div>
      </div>
      <p className="home-data-note"><span className={ready ? 'status-dot' : 'status-dot warning'} />{ready ? 'Connected catalogue response received. Each section still shows its own state.' : 'Development environment · catalogue connection or published records may not be available yet.'}</p>
    </section>
    <section className="focus-section home-explore-section">
      <div className="section-heading"><p className="eyebrow">EXPLORE KHELGRID</p><h2>Make your next move.</h2><p className="page-intro">Start with the part of your sporting journey you want to explore.</p></div>
      <div className="focus-grid home-feature-grid">
        <a className="focus-card focus-link home-feature-card" href="/sports"><span className="feature-icon" aria-hidden="true"><SiteIcon name="sports" size={22} /></span><span className="card-number">01 / DISCOVER</span><h3>Explore sports</h3><p>Browse the sports catalogue as real published data becomes available.</p><span className="card-action">Explore sports <span aria-hidden="true">↗</span></span></a>
        <a className="focus-card focus-link home-feature-card" href="/opportunities"><span className="feature-icon" aria-hidden="true"><SiteIcon name="calendar-check" size={22} /></span><span className="card-number">02 / COMPETE</span><h3>Find opportunities</h3><p>Explore trials, selections, camps and programmes with source information.</p><span className="card-action">Browse opportunities <span aria-hidden="true">↗</span></span></a>
        <a className="focus-card focus-link home-feature-card" href="/venues"><span className="feature-icon" aria-hidden="true"><SiteIcon name="map-pin" size={22} /></span><span className="card-number">03 / PLAY</span><h3>Discover venues</h3><p>Review published venue information. Booking and live availability are not enabled.</p><span className="card-action">Browse venues <span aria-hidden="true">↗</span></span></a>
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
