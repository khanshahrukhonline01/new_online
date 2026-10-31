import { useState, useEffect, useMemo, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { SportIcon } from '../../shared/sports/sportIcons'
import { getSportDataBySlug, type SportDetailData } from './data/sportsData'
import { DirectoryCallout } from '../../shared/components/DirectoryCallout'
import { ShareBar } from '../../shared/components/ShareBar'
import { updatePageSeoMetadata } from '../../shared/utils/seoAndShare'
import {
  getOpportunities,
  getVenues,
  getCoaches,
  getAcademies,
} from '../../integrations/supabase/public-client'
import type { Opportunity, Venue, Coach, Academy } from '../../shared/domain'
import './SportDetailPage.css'

interface SportDetailPageProps {
  slug: string
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

type SportTab = 'overview' | 'trials' | 'venues' | 'coaches' | 'training'

export default function SportDetailPage({ slug, onNavigate }: SportDetailPageProps) {
  const [activeTab, setActiveTab] = useState<SportTab>('overview')
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [academies, setAcademies] = useState<Academy[]>([])

  const sport: SportDetailData = useMemo(() => {
    const found = getSportDataBySlug(slug)
    if (found) return found

    // Graceful fallback for any unknown slug
    const cleanName = slug
      .split('-')
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ')

    return {
      id: slug,
      slug,
      name: cleanName,
      hindiName: cleanName,
      tagline: `Explore verified selection trials, coaching academies, and venues for ${cleanName} in India.`,
      category: 'Olympic Sport',
      governingBody: {
        name: `National ${cleanName} Federation of India`,
        shortName: `N${cleanName.slice(0, 3).toUpperCase()}FI`,
        headquarters: 'New Delhi, India',
      },
      olympicStatus: 'Official Competitive Discipline in India',
      popularTournaments: [
        `Senior National ${cleanName} Championship`,
        `Junior National ${cleanName} Championship`,
        'Khelo India National Games',
      ],
      keyAgeCategories: ['Sub-Junior (Under-14)', 'Junior (Under-17)', 'Youth (Under-19)', 'Senior National'],
      selectionPathway: [
        { stage: '1. District Trials', description: 'Open district selection meets conducted by district associations.' },
        { stage: '2. State Championships', description: 'Inter-district competition for state squad selection.' },
        { stage: '3. National Championships', description: 'Federation national championship tracked by national selectors.' },
      ],
      skillsEvaluated: ['Sport-Specific Fundamentals', 'Speed & Aerobic Stamina', 'Game Intelligence & Reflexes'],
      equipment: ['Standard Competition Gear', 'Safety Equipment & Protective Wear', 'Athletic Court / Turf Shoes'],
      popularCenters: [
        { name: 'SAI National Centre of Excellence', city: 'New Delhi', state: 'Delhi' },
        { name: 'Regional Sports Authority Hub', city: 'Bengaluru', state: 'Karnataka' },
      ],
      notableIcons: ['Indian National Athletes & Champions'],
      description: `${cleanName} is actively organized and contested across India through school games, district championships, and national federations. Athletes progress through state associations and Khelo India tournaments.`,
      saiQuotaBenefits: 'Eligible for Central and State government sports quota recruitments (Railways, Police, and Defence) for national medalists.',
      trainingTips: [
        'Build a strong aerobic conditioning base before peaking for selection trials.',
        'Record training sessions to review footwork and technique.',
        'Maintain a structured athlete log for tournament performances and fitness benchmarks.',
      ],
    }
  }, [slug])

  // Load live catalogue items
  useEffect(() => {
    let active = true
    Promise.all([getOpportunities(), getVenues(), getCoaches(), getAcademies()]).then(
      ([oppsRes, venuesRes, coachesRes, acadsRes]) => {
        if (!active) return
        if (oppsRes.status === 'ready') {
          setOpportunities(
            oppsRes.data.filter(
              item =>
                item.title.toLowerCase().includes(sport.name.toLowerCase()) ||
                (item.organizer_name && item.organizer_name.toLowerCase().includes(sport.name.toLowerCase()))
            )
          )
        }
        if (venuesRes.status === 'ready') {
          setVenues(
            venuesRes.data.filter(
              item =>
                (item.description && item.description.toLowerCase().includes(sport.name.toLowerCase())) ||
                item.name.toLowerCase().includes(sport.name.toLowerCase())
            )
          )
        }
        if (coachesRes.status === 'ready') {
          setCoaches(
            coachesRes.data.filter(
              item => item.bio && item.bio.toLowerCase().includes(sport.name.toLowerCase())
            )
          )
        }
        if (acadsRes.status === 'ready') {
          setAcademies(
            acadsRes.data.filter(
              item =>
                item.name.toLowerCase().includes(sport.name.toLowerCase()) ||
                (item.description && item.description.toLowerCase().includes(sport.name.toLowerCase()))
            )
          )
        }
      }
    )
    return () => {
      active = false
    }
  }, [sport.name])

  // SEO & Schema.org JSON-LD
  useEffect(() => {
    const pageTitle = `${sport.name} in India — Selection Trials, Academies, Venues & Rules | KhelGrid`
    const pageDesc = `${sport.tagline} Discover official national championships, age-group selection pathways, and coaching academies for ${sport.name} on KhelGrid.`
    const pageUrl = `https://khelgrid.com/sports/${sport.slug}`

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'SportsEvent',
      name: sport.name,
      description: sport.description,
      url: pageUrl,
    }

    const cleanup = updatePageSeoMetadata({
      title: pageTitle,
      description: pageDesc,
      canonicalUrl: pageUrl,
      keywords: [
        sport.name,
        `${sport.name} India`,
        `${sport.name} selection trials`,
        `${sport.name} academies`,
        `${sport.name} venues`,
        'KhelGrid sports directory',
      ],
      jsonLd,
    })

    return cleanup
  }, [sport])

  const handleLink = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (onNavigate) {
      onNavigate(event, href)
    }
  }

  return (
    <article className="content-page sport-detail-page">
      {/* Back Link */}
      <a className="sport-detail-back-link" href="/sports" onClick={e => handleLink(e, '/sports')}>
        <SiteIcon name="arrow-left" size={15} />
        <span>Back to All Sports</span>
      </a>

      {/* Hero Header Card */}
      <header className="sport-hero-card">
        <div className="sport-hero-icon-box">
          <SportIcon name={sport.slug} size={54} />
        </div>

        <div className="sport-hero-content">
          <div className="sport-hero-badges">
            <span className="sport-category-badge">
              <SiteIcon name="trophy" size={12} />
              <span>{sport.category}</span>
            </span>
            <span className="sport-olympic-badge">
              <SiteIcon name="award" size={12} />
              <span>{sport.olympicStatus}</span>
            </span>
          </div>

          <div className="sport-hero-title-row">
            <h1 className="sport-hero-title">{sport.name}</h1>
            <span className="sport-hindi-name">{sport.hindiName}</span>
          </div>

          <p className="sport-tagline">{sport.tagline}</p>

          <div className="sport-governing-row">
            <span>Governing Body:</span>
            <span className="sport-governing-badge">
              <strong>{sport.governingBody.shortName}</strong> · {sport.governingBody.name}
            </span>
            <span>📍 {sport.governingBody.headquarters}</span>
          </div>

          <div className="sport-hero-actions">
            <a
              className="sport-hero-btn sport-hero-btn-primary"
              href="/sports-cv"
              onClick={e => handleLink(e, '/sports-cv')}
              title={`Build ${sport.name} Athlete CV`}
            >
              <SiteIcon name="sports-cv" size={14} />
              <span>Build {sport.name} Athlete CV</span>
            </a>

            <a
              className="sport-hero-btn sport-hero-btn-secondary"
              href="/opportunities"
              onClick={e => handleLink(e, '/opportunities')}
            >
              <SiteIcon name="calendar-check" size={14} />
              <span>Browse Trials</span>
            </a>

            <a
              className="sport-hero-btn sport-hero-btn-secondary"
              href="/coaches"
              onClick={e => handleLink(e, '/coaches')}
            >
              <SiteIcon name="users" size={14} />
              <span>Find Coaches</span>
            </a>
          </div>

          <div style={{ marginTop: '16px' }}>
            <ShareBar
              title={`${sport.name} in India`}
              text={`Explore ${sport.name} selection trials, academies, and venues across India on KhelGrid:`}
              url={`https://khelgrid.com/sports/${sport.slug}`}
              compact
            />
          </div>
        </div>
      </header>

      {/* Contextual Callout Banner */}
      <DirectoryCallout
        variant="coach"
        tag="Coach Registry"
        title={`Coaching ${sport.name} in India? Get Listed Free`}
        description={`Showcase your ${sport.governingBody.shortName} / NIS credentials and connect with upcoming talent.`}
        buttonLabel="Join as Coach"
        buttonHref={`mailto:khelgrid@gmail.com?subject=Register%20as%20a%20${encodeURIComponent(sport.name)}%20Coach%20on%20KhelGrid`}
      />

      {/* Navigation Tabs */}
      <nav className="sport-tabs-bar" role="tablist" aria-label={`${sport.name} information tabs`}>
        <button
          className={`sport-tab-btn ${activeTab === 'overview' ? 'is-active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
        >
          <SiteIcon name="info" size={14} />
          <span>Overview &amp; Pathway</span>
        </button>

        <button
          className={`sport-tab-btn ${activeTab === 'trials' ? 'is-active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'trials'}
          onClick={() => setActiveTab('trials')}
        >
          <SiteIcon name="calendar-check" size={14} />
          <span>Trials &amp; Events ({opportunities.length})</span>
        </button>

        <button
          className={`sport-tab-btn ${activeTab === 'venues' ? 'is-active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'venues'}
          onClick={() => setActiveTab('venues')}
        >
          <SiteIcon name="map-pin" size={14} />
          <span>Venues &amp; Centers ({sport.popularCenters.length + venues.length})</span>
        </button>

        <button
          className={`sport-tab-btn ${activeTab === 'coaches' ? 'is-active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'coaches'}
          onClick={() => setActiveTab('coaches')}
        >
          <SiteIcon name="users" size={14} />
          <span>Coaches &amp; Icons ({sport.notableIcons.length + coaches.length})</span>
        </button>

        <button
          className={`sport-tab-btn ${activeTab === 'training' ? 'is-active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'training'}
          onClick={() => setActiveTab('training')}
        >
          <SiteIcon name="activity" size={14} />
          <span>Training &amp; Gear</span>
        </button>
      </nav>

      {/* Tab Panels */}
      {(activeTab === 'overview' || activeTab === 'coaches') && (
        <section className="sport-tab-panel">
          {/* About Section */}
          <div className="sport-section-card">
            <h2 className="sport-section-heading">
              <span className="section-icon"><SiteIcon name="info" size={17} /></span>
              <span>About {sport.name} in India</span>
            </h2>
            <p style={{ fontSize: '14px', lineHeight: '1.7', color: '#334155', margin: '0 0 16px' }}>
              {sport.description}
            </p>

            {/* Quota Notice Box */}
            <div className="sport-quota-box">
              <strong>Govt Sports Quota &amp; SAI Benefits</strong>
              <p>{sport.saiQuotaBenefits}</p>
            </div>
          </div>

          {/* Selection Pathway */}
          <div className="sport-section-card">
            <h2 className="sport-section-heading">
              <span className="section-icon"><SiteIcon name="target" size={17} /></span>
              <span>Talent Selection Pathway in India</span>
            </h2>
            <div className="sport-pathway-list">
              {sport.selectionPathway.map((step, idx) => (
                <div className="sport-pathway-item" key={idx}>
                  <span className="sport-pathway-step">{idx + 1}</span>
                  <div className="sport-pathway-info">
                    <strong>{step.stage}</strong>
                    <p>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Age Groups & Trials Criteria */}
          <div className="sport-section-card">
            <h2 className="sport-section-heading">
              <span className="section-icon"><SiteIcon name="calendar" size={17} /></span>
              <span>Key Age Groups &amp; Tournaments</span>
            </h2>
            <div className="sport-chip-grid" style={{ marginBottom: '16px' }}>
              {sport.keyAgeCategories.map((cat, idx) => (
                <span className="sport-chip accent" key={idx}>
                  <SiteIcon name="badge-check" size={13} />
                  <span>{cat}</span>
                </span>
              ))}
            </div>

            <h3 style={{ fontSize: '14px', fontWeight: 750, color: '#0f172a', margin: '14px 0 10px' }}>
              Major Indian Competitions
            </h3>
            <div className="sport-chip-grid">
              {sport.popularTournaments.map((tourn, idx) => (
                <span className="sport-chip" key={idx}>
                  <SiteIcon name="trophy" size={13} />
                  <span>{tourn}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Notable Icons & Mentors */}
          <div className="sport-section-card">
            <h2 className="sport-section-heading">
              <span className="section-icon"><SiteIcon name="award" size={17} /></span>
              <span>Notable Indian Icons &amp; Champions in {sport.name}</span>
            </h2>
            <div className="sport-icons-grid" style={{ marginBottom: '16px' }}>
              {sport.notableIcons.map((icon, idx) => (
                <div className="sport-icon-card" key={idx}>
                  <SiteIcon name="star" size={14} style={{ color: '#d97706', marginRight: '6px' }} />
                  <span>{icon}</span>
                </div>
              ))}
            </div>

            <div style={{ padding: '16px', borderRadius: '12px', background: '#fffdf5', border: '1px solid #fde68a' }}>
              <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#78350f' }}>
                Are you a certified {sport.name} coach or academy mentor? Register on KhelGrid to connect with athletes across India.
              </p>
              <a
                className="sport-hero-btn sport-hero-btn-primary"
                href="/coaches"
                onClick={e => handleLink(e, '/coaches')}
              >
                Explore Coaches Directory
              </a>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'trials' && (
        <section className="sport-tab-panel">
          <div className="sport-section-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 className="sport-section-heading" style={{ margin: 0 }}>
                <span className="section-icon"><SiteIcon name="calendar-check" size={17} /></span>
                <span>Trials & Opportunities for {sport.name}</span>
              </h2>
              <a
                className="sport-hero-btn sport-hero-btn-primary"
                href="mailto:khelgrid@gmail.com?subject=Submit%20a%20sports%20trial%20or%20opportunity"
              >
                <SiteIcon name="plus" size={13} />
                <span>Submit a Trial</span>
              </a>
            </div>

            {opportunities.length > 0 ? (
              <div style={{ display: 'grid', gap: '12px' }}>
                {opportunities.map(opp => (
                  <div key={opp.id} style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#176b43', textTransform: 'uppercase' }}>
                      {opp.opportunity_type}
                    </span>
                    <h3 style={{ margin: '4px 0 6px', fontSize: '16px', color: '#0f172a' }}>{opp.title}</h3>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                      📍 {opp.city || 'India'} · {opp.organizer_name || 'Official Organizer'}
                    </p>
                    {opp.source_url && (
                      <a
                        href={opp.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '10px', fontSize: '12px', color: '#176b43', fontWeight: 700 }}
                      >
                        View Official Circular <SiteIcon name="external-link" size={13} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '36px 20px', background: '#f8fafc', borderRadius: '12px' }}>
                <SiteIcon name="calendar" size={32} style={{ color: '#94a3b8', marginBottom: '10px' }} />
                <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: '#0f172a' }}>
                  No open trials currently published for {sport.name}
                </h3>
                <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>
                  Organizers announce state & district trials throughout the season. Check back soon or submit a verified circular.
                </p>
                <a
                  className="sport-hero-btn sport-hero-btn-secondary"
                  href="/opportunities"
                  onClick={e => handleLink(e, '/opportunities')}
                >
                  Browse all active sports trials
                </a>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'venues' && (
        <section className="sport-tab-panel">
          <div className="sport-section-card">
            <h2 className="sport-section-heading">
              <span className="section-icon"><SiteIcon name="map-pin" size={17} /></span>
              <span>Premier High-Performance Centers & Stadiums</span>
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              {sport.popularCenters.map((center, idx) => (
                <div key={idx} style={{ padding: '16px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <strong style={{ display: 'block', fontSize: '14px', color: '#0f172a', marginBottom: '4px' }}>
                    {center.name}
                  </strong>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    📍 {center.city}, {center.state}
                  </span>
                </div>
              ))}
            </div>

            {academies.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '15px', color: '#0f172a', margin: '0 0 12px' }}>
                  Published Training Academies for {sport.name}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                  {academies.map(acad => (
                    <a
                      key={acad.id}
                      href={`/academies/${acad.slug}`}
                      onClick={e => handleLink(e, `/academies/${acad.slug}`)}
                      style={{ padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#ffffff', textDecoration: 'none', display: 'block' }}
                    >
                      <strong style={{ display: 'block', fontSize: '13.5px', color: '#0f172a', marginBottom: '4px' }}>{acad.name}</strong>
                      <span style={{ fontSize: '12px', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <SiteIcon name="map-pin" size={12} /> {acad.city || 'India'}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div style={{ textAlign: 'center', padding: '16px', background: '#f1f8f3', borderRadius: '12px', border: '1px solid #bce2cb' }}>
              <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#176b43', fontWeight: 650 }}>
                Looking to train or book courts for {sport.name}?
              </p>
              <a
                className="sport-hero-btn sport-hero-btn-primary"
                href="/venues"
                onClick={e => handleLink(e, '/venues')}
              >
                Browse Venues Directory across 50+ Cities
              </a>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'coaches' && (
        <section className="sport-tab-panel">
          <div className="sport-section-card">
            <h2 className="sport-section-heading">
              <span className="section-icon"><SiteIcon name="award" size={17} /></span>
              <span>Notable Indian Icons & Mentors in {sport.name}</span>
            </h2>
            <div className="sport-icons-grid" style={{ marginBottom: '24px' }}>
              {sport.notableIcons.map((icon, idx) => (
                <div className="sport-icon-card" key={idx}>
                  <SiteIcon name="star" size={14} style={{ color: '#d97706', marginRight: '6px' }} />
                  <span>{icon}</span>
                </div>
              ))}
            </div>

            <div style={{ padding: '20px', borderRadius: '14px', background: '#fffdf5', border: '1px solid #fde68a' }}>
              <strong style={{ display: 'block', fontSize: '14px', color: '#92400e', marginBottom: '4px' }}>
                Find Certified Coaches & NIS Mentors
              </strong>
              <p style={{ margin: '0 0 14px', fontSize: '12.5px', color: '#78350f' }}>
                Connect with verified coaches registered across Indian states for personal training and academy admissions.
              </p>
              <a
                className="sport-hero-btn sport-hero-btn-primary"
                href="/coaches"
                onClick={e => handleLink(e, '/coaches')}
              >
                Explore Coaches Directory
              </a>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'training' && (
        <section className="sport-tab-panel">
          {/* Equipment Guide */}
          <div className="sport-section-card">
            <h2 className="sport-section-heading">
              <span className="section-icon"><SiteIcon name="sliders" size={17} /></span>
              <span>Equipment Checklist for {sport.name}</span>
            </h2>
            <div className="sport-chip-grid" style={{ marginBottom: '24px' }}>
              {sport.equipment.map((item, idx) => (
                <span className="sport-chip" key={idx}>
                  <SiteIcon name="check-circle" size={14} style={{ color: '#176b43' }} />
                  <span>{item}</span>
                </span>
              ))}
            </div>

            {/* Training Tips */}
            <h2 className="sport-section-heading">
              <span className="section-icon"><SiteIcon name="sparkles" size={17} /></span>
              <span>High-Performance Training Tips</span>
            </h2>
            <div style={{ display: 'grid', gap: '10px' }}>
              {sport.trainingTips.map((tip, idx) => (
                <div key={idx} style={{ padding: '12px 16px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '13px', color: '#334155' }}>
                  💡 {tip}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  )
}
