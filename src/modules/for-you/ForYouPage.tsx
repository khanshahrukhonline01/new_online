import { useEffect, useState, type MouseEvent } from 'react'
import {
  getStoredAuthUser,
  onAuthChange,
  signInWithEmail,
  type AuthUserProfile,
} from '../../integrations/supabase/auth-client'
import {
  getOpportunities,
  getVenues,
  getCoaches,
  getPickupGames,
  type DatabasePickupGame,
} from '../../integrations/supabase/public-client'
import type { Opportunity, Venue, Coach } from '../../shared/domain'
import { SiteIcon } from '../../shared/components/SiteIcon'
import './ForYouPage.css'

export interface ForYouPageProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
  onOpenAuth?: (tab?: 'login' | 'signup') => void
}

const DEMO_PERSONAS = [
  {
    label: 'Youth Athlete',
    role: 'athlete' as const,
    name: 'Aarav Sharma',
    email: 'aarav.athlete@khelgrid.com',
    city: 'New Delhi',
    sport: 'Football',
  },
  {
    label: 'Turf Host',
    role: 'host' as const,
    name: 'FSV Arena Sports',
    email: 'host@fsvsports.in',
    city: 'Bengaluru',
    sport: 'Cricket',
  },
]

export default function ForYouPage({ onNavigate, onOpenAuth }: ForYouPageProps) {
  const [authUser, setAuthUser] = useState<AuthUserProfile | null>(() => getStoredAuthUser())
  const [trials, setTrials] = useState<Opportunity[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [pickupGames, setPickupGames] = useState<DatabasePickupGame[]>([])
  const [selectedSport, setSelectedSport] = useState<string>('all')
  const [demoNotice, setDemoNotice] = useState<string | null>(null)

  // Listen to live auth changes
  useEffect(() => {
    return onAuthChange(u => {
      setAuthUser(u)
    })
  }, [])

  // Auto-open auth modal on mount if guest
  useEffect(() => {
    if (!authUser && onOpenAuth) {
      onOpenAuth('signup')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load personalized items based on athlete preferences
  useEffect(() => {
    let active = true

    void getOpportunities().then(res => {
      if (!active) return
      if (res.status === 'ready' && res.data) {
        setTrials(res.data.slice(0, 6))
      }
    })

    void getVenues().then(res => {
      if (!active) return
      if (res.status === 'ready' && res.data) {
        setVenues(res.data.slice(0, 4))
      }
    })

    void getCoaches().then(res => {
      if (!active) return
      if (res.status === 'ready' && res.data) {
        setCoaches(res.data.slice(0, 4))
      }
    })

    void getPickupGames().then(res => {
      if (!active) return
      if (res.status === 'ready' && res.data) {
        setPickupGames(res.data.slice(0, 4))
      }
    })

    return () => {
      active = false
    }
  }, [authUser])

  const handleLink = (e: MouseEvent<HTMLAnchorElement>, path: string) => {
    if (onNavigate) {
      onNavigate(e, path)
    }
  }

  const handleDemoLogin = async (persona: typeof DEMO_PERSONAS[0]) => {
    const res = await signInWithEmail({
      email: persona.email,
      password: 'password123',
    })
    if (res.success && res.user) {
      setDemoNotice(`Switched session to ${res.user.fullName} (${persona.label}). Personalized feed activated!`)
      setTimeout(() => setDemoNotice(null), 4000)
    }
  }

  const userCity = authUser?.city || 'Your Area'
  const userSports = authUser?.preferredSports?.length
    ? authUser.preferredSports
    : ['Football', 'Cricket', 'Athletics']

  const filteredTrials = selectedSport === 'all'
    ? trials
    : trials.filter(t => t.sport?.name?.toLowerCase() === selectedSport.toLowerCase())

  // If user is guest / unregistered: Render the Auth Gate Screen
  if (!authUser) {
    return (
      <div className="for-you-container">
        <div className="for-you-auth-gate">
          <div className="for-you-gate-badge">
            <SiteIcon name="star" size={14} />
            <span>Personalized Feed</span>
          </div>

          <h1 className="for-you-gate-title">Curated Exclusively For You.</h1>
          <p className="for-you-gate-subtitle">
            Unregistered visitors do not have access to a personal feed. Sign in or register your athlete profile to receive verified trial cutoffs, nearby turf openings, and tactical drills tailored to your sport and city.
          </p>

          <div className="for-you-gate-actions">
            <button
              type="button"
              className="for-you-btn primary"
              onClick={() => onOpenAuth?.('signup')}
            >
              <SiteIcon name="user" size={16} />
              <span>Create Free Athlete Account</span>
            </button>
            <button
              type="button"
              className="for-you-btn secondary"
              onClick={() => onOpenAuth?.('login')}
            >
              <span>Sign In</span>
            </button>
          </div>

          <div className="for-you-demo-box">
            <span className="demo-box-label">Or test drive instantly with 1-tap persona:</span>
            <div className="demo-persona-chips">
              {DEMO_PERSONAS.map(p => (
                <button
                  key={p.email}
                  type="button"
                  className="demo-persona-btn"
                  onClick={() => void handleDemoLogin(p)}
                >
                  <SiteIcon name="check-circle" size={13} />
                  <span>{p.label}: {p.name} ({p.sport})</span>
                </button>
              ))}
            </div>
          </div>

          <div className="for-you-preview-grid">
            <div className="for-you-preview-card">
              <div className="preview-icon green">
                <SiteIcon name="opportunities" size={20} />
              </div>
              <h3>Targeted Trials &amp; Cutoffs</h3>
              <p>Filter federation selection trials and SAI combines matching your age group and discipline.</p>
            </div>
            <div className="for-you-preview-card">
              <div className="preview-icon blue">
                <SiteIcon name="venues" size={20} />
              </div>
              <h3>Nearby Turfs &amp; Grounds</h3>
              <p>Find open grounds and community pickup games within your neighborhood radius.</p>
            </div>
            <div className="for-you-preview-card">
              <div className="preview-icon orange">
                <SiteIcon name="users" size={20} />
              </div>
              <h3>Certified Tacticians</h3>
              <p>Connect with NIS and federation-licensed coaches in your primary sports discipline.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // If user is authenticated: Render the full personalized feed!
  return (
    <div className="for-you-container">
      {demoNotice && (
        <div className="for-you-toast" role="status" aria-live="polite">
          <SiteIcon name="check-circle" size={16} />
          <span>{demoNotice}</span>
        </div>
      )}

      {/* Hero Ribbon */}
      <div className="for-you-hero">
        <div className="for-you-hero-left">
          <div className="for-you-user-pill">
            <span className="for-you-user-avatar">
              {(authUser.fullName || 'A').charAt(0).toUpperCase()}
            </span>
            <span>Personalized for {authUser.fullName}</span>
            <span className="for-you-role-tag">{authUser.role.toUpperCase()}</span>
          </div>
          <h1 className="for-you-title">Recommended For You</h1>
          <p className="for-you-subtitle">
            Curated trials, grounds, coaches, and match rosters matching your sports ({userSports.join(', ')}) in {userCity}.
          </p>
        </div>

        <div className="for-you-sport-filter">
          <button
            type="button"
            className={`for-you-chip ${selectedSport === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedSport('all')}
          >
            All Recommended
          </button>
          {userSports.map(s => (
            <button
              key={s}
              type="button"
              className={`for-you-chip ${selectedSport === s ? 'active' : ''}`}
              onClick={() => setSelectedSport(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Feed Section 1: Trials Matching Your Discipline */}
      <section className="for-you-section">
        <div className="for-you-section-header">
          <div>
            <h2><SiteIcon name="opportunities" size={18} /> Selection Trials &amp; SAI Combines</h2>
            <p>Registration deadlines aligned with your sporting discipline.</p>
          </div>
          <a href="/opportunities" onClick={e => handleLink(e, '/opportunities')} className="for-you-view-all">
            View All ({trials.length}) &rarr;
          </a>
        </div>

        <div className="for-you-cards-grid">
          {filteredTrials.map(trial => (
            <div key={trial.id} className="for-you-card">
              <div className="for-you-card-top">
                <span className="for-you-sport-badge">{trial.sport?.name || 'All Sports'}</span>
                <span className="for-you-city-badge">{trial.city || 'National'}</span>
              </div>
              <h3 className="for-you-card-title">{trial.title}</h3>
              <p className="for-you-card-meta">
                {trial.venue_name || 'Sports Complex'} &bull; Type: {trial.opportunity_type}
              </p>
              <div className="for-you-card-footer">
                <span className="for-you-deadline">
                  <SiteIcon name="clock" size={12} />
                  {trial.application_deadline ? `Deadline: ${trial.application_deadline}` : 'Open Application'}
                </span>
                <a
                  href={`/opportunities/${trial.slug}`}
                  onClick={e => handleLink(e, `/opportunities/${trial.slug}`)}
                  className="for-you-link-btn"
                >
                  View Trial
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feed Section 2: Grounds & Turfs in Your Area */}
      <section className="for-you-section">
        <div className="for-you-section-header">
          <div>
            <h2><SiteIcon name="venues" size={18} /> Turfs &amp; Grounds in {userCity}</h2>
            <p>Top sports complexes equipped with genuine playing surfaces.</p>
          </div>
          <a href="/venues" onClick={e => handleLink(e, '/venues')} className="for-you-view-all">
            Explore Grounds &rarr;
          </a>
        </div>

        <div className="for-you-cards-grid four-col">
          {venues.map(v => (
            <div key={v.id} className="for-you-card venue">
              <div className="for-you-card-top">
                <span className="for-you-sport-badge">{v.city}</span>
                <span className="for-you-verified-tag">
                  <SiteIcon name="check-circle" size={11} /> Verified
                </span>
              </div>
              <h3 className="for-you-card-title">{v.name}</h3>
              <p className="for-you-card-meta">{v.address || `${v.city}, India`}</p>
              <div className="for-you-card-footer">
                <a
                  href={`/venues/${v.slug}`}
                  onClick={e => handleLink(e, `/venues/${v.slug}`)}
                  className="for-you-link-btn"
                >
                  View Ground
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feed Section 3: Certified Coaches */}
      <section className="for-you-section">
        <div className="for-you-section-header">
          <div>
            <h2><SiteIcon name="users" size={18} /> Certified Coaches for Your Sport</h2>
            <p>NIS Patiala accredited tacticians and former national athletes.</p>
          </div>
          <a href="/coaches" onClick={e => handleLink(e, '/coaches')} className="for-you-view-all">
            Directory &rarr;
          </a>
        </div>

        <div className="for-you-cards-grid four-col">
          {coaches.map(c => (
            <div key={c.id} className="for-you-card coach">
              <div className="for-you-card-top">
                <span className="for-you-sport-badge">{c.city}</span>
                {c.verification_status === 'verified' && (
                  <span className="for-you-verified-tag">
                    <SiteIcon name="badge-check" size={12} /> NIS
                  </span>
                )}
              </div>
              <h3 className="for-you-card-title">{c.display_name || c.name || 'Coach'}</h3>
              <p className="for-you-card-meta">{c.certification || c.sport || 'Certified Coach'}</p>
              <div className="for-you-card-footer">
                <a
                  href="/coaches"
                  onClick={e => handleLink(e, '/coaches')}
                  className="for-you-link-btn"
                >
                  Inquire
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feed Section 4: Community Pickup Games */}
      {pickupGames.length > 0 && (
        <section className="for-you-section">
          <div className="for-you-section-header">
            <div>
              <h2><SiteIcon name="sports" size={18} /> Community Pickup Games</h2>
              <p>Join matches needing players in your area.</p>
            </div>
            <a href="/play" onClick={e => handleLink(e, '/play')} className="for-you-view-all">
              Find Games &rarr;
            </a>
          </div>

          <div className="for-you-cards-grid four-col">
            {pickupGames.map(g => (
              <div key={g.id} className="for-you-card game">
                <div className="for-you-card-top">
                  <span className="for-you-sport-badge">{g.sport}</span>
                  <span className="for-you-spots-badge">{g.spots_open} spots open</span>
                </div>
                <h3 className="for-you-card-title">{g.sport} Match</h3>
                <p className="for-you-card-meta">{g.venue_name} &bull; {g.city}</p>
                <div className="for-you-card-footer">
                  <span className="for-you-price">₹{g.price_per_player}/player</span>
                  <a
                    href="/play"
                    onClick={e => handleLink(e, '/play')}
                    className="for-you-link-btn"
                  >
                    Join
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
