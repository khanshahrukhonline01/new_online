import { useState, useEffect, useMemo, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import {
  getStoredAuthUser,
  onAuthChange,
  signInWithEmail,
  signUpWithEmail,
  type AuthUserProfile,
} from '../../integrations/supabase/auth-client'
import {
  getAthleteProfile,
  normalizeUsername,
} from '../../integrations/supabase/athlete-profile-client'
import type { AthleteProfile, Opportunity } from '../../shared/domain'
import {
  getPickupGames,
  getUserRsvpGameIds,
  getOpportunities,
  type DatabasePickupGame,
  type CommunityListingCategory,
} from '../../integrations/supabase/public-client' 
import { subscribeSavedItems } from '../../shared/services/savedService'
import {
  getUserTrialApplications,
  getUserAcademyEnquiries,
  type AcademyEnquiry,
  type TrialApplication,
} from '../../integrations/supabase/athlete-profile-client'
import { getUserVenueBookings } from '../../shared/payments/paymentService'
import { PlayerCard } from '../athlete-profile/PlayerCard'
import './UserDashboardPage.css'

export interface UserDashboardPageProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
  onOpenIntake?: (category?: CommunityListingCategory) => void
  onOpenAuth?: (tab?: 'login' | 'signup') => void
}

type DashboardTab = 'overview' | 'profile' | 'matches' | 'saved'

const DEMO_PERSONAS = [
  {
    label: 'Athlete (Aarav Sharma)',
    role: 'athlete' as const,
    name: 'Aarav Sharma',
    email: 'aarav.sharma@khelgrid.com',
    city: 'Delhi NCR',
    sport: 'Cricket',
  },
  {
    label: 'Turf Partner (FSV Sports)',
    role: 'host' as const,
    name: 'FSV Sports Ground',
    email: 'partner.bangalore@khelgrid.com',
    city: 'Bengaluru',
    sport: 'Football & Box Cricket',
  },
  {
    label: 'Platform Admin',
    role: 'admin' as const,
    name: 'Chief Platform Moderator',
    email: 'admin@khelgrid.com',
    city: 'New Delhi',
    sport: 'Multi-Sport',
  },
]

export default function UserDashboardPage({ onNavigate, onOpenIntake, onOpenAuth }: UserDashboardPageProps) {
  const [authUser, setAuthUser] = useState<AuthUserProfile | null>(() => getStoredAuthUser())
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview')
  const [athleteProfile, setAthleteProfile] = useState<AthleteProfile | null>(null)
  const [confirmedGames, setConfirmedGames] = useState<DatabasePickupGame[]>([])
  const [savedOpportunities, setSavedOpportunities] = useState<Opportunity[]>([])
  const [savedCount, setSavedCount] = useState<number>(0)
  const [demoNotice, setDemoNotice] = useState<string | null>(null)

  // Listen to live authentication changes across tabs and modals
  useEffect(() => {
    return onAuthChange(user => {
      setAuthUser(user)
    })
  }, [])

  const [venueBookings, setVenueBookings] = useState<ReturnType<typeof getUserVenueBookings>>([])
  const [trialApplications, setTrialApplications] = useState<TrialApplication[]>([])
  const [academyEnquiries, setAcademyEnquiries] = useState<AcademyEnquiry[]>([])

  // Listen for live venue bookings and trial applications updates
  useEffect(() => {
    const loadUserData = () => {
      setVenueBookings(getUserVenueBookings())
      setTrialApplications(getUserTrialApplications())
      setAcademyEnquiries(getUserAcademyEnquiries())
    }
    loadUserData()

    const onUpdate = () => loadUserData()
    window.addEventListener('khelgrid:venue-booked', onUpdate)
    window.addEventListener('khelgrid:trial-applied', onUpdate)
    window.addEventListener('khelgrid:academy-enquiry-submitted', onUpdate)
    return () => {
      window.removeEventListener('khelgrid:venue-booked', onUpdate)
      window.removeEventListener('khelgrid:trial-applied', onUpdate)
      window.removeEventListener('khelgrid:academy-enquiry-submitted', onUpdate)
    }
  }, [authUser])

  // Listen for live physical benchmark updates from Talent Scanner
  useEffect(() => {
    const handleBenchmarksUpdated = (e: Event) => {
      const custom = e as CustomEvent<{ profile?: AthleteProfile }>
      if (custom.detail?.profile) {
        setAthleteProfile(custom.detail.profile)
      } else if (authUser) {
        const handle = normalizeUsername(authUser.fullName || authUser.name || 'athlete')
        void getAthleteProfile(handle).then(prof => {
          if (prof) setAthleteProfile(prof)
        })
      }
    }
    window.addEventListener('khelgrid:benchmarks-updated', handleBenchmarksUpdated)
    return () => {
      window.removeEventListener('khelgrid:benchmarks-updated', handleBenchmarksUpdated)
    }
  }, [authUser])

  // Auto-prompt login modal on mount if guest visits dashboard directly
  useEffect(() => {
    if (!authUser && onOpenAuth) {
      onOpenAuth('login')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync athlete profile, confirmed RSVPs, and saved bookmarks
  useEffect(() => {
    let active = true

    // 1. Athlete Trading Card & Profile Dossier
    if (authUser) {
      const handle = normalizeUsername(authUser.fullName || authUser.name || 'athlete')
      void getAthleteProfile(handle).then(prof => {
        if (!active) return
        if (prof) {
          setAthleteProfile(prof)
        } else {
          // Synthesize profile for logged in user so they always have an official player card
          setAthleteProfile({
            id: authUser.id,
            userId: authUser.id,
            username: handle,
            fullName: authUser.fullName || authUser.name,
            sport: authUser.preferredSports?.[0] || 'Multi-Sport',
            playingPosition: authUser.role === 'coach' ? 'Head Coach' : authUser.role === 'host' ? 'Venue Partner' : 'Athlete',
            city: authUser.city || 'India',
            summary: authUser.bio || `Competitive ${authUser.preferredSports?.[0] || 'sports'} athlete on KhelGrid. Tracking selection trials and managing verified Sports CV.`,
            achievements: [],
            videoClips: [],
            verificationStatus: authUser.isVerified ? 'verified' : 'community',
            createdAt: authUser.createdAt,
            updatedAt: authUser.updatedAt || authUser.createdAt,
          })
        }
      })
    }

    // 2. Confirmed Match RSVPs
    const rsvpIds = getUserRsvpGameIds()
    void getPickupGames().then(res => {
      if (!active) return
      if (res.status === 'ready') {
        const matches = res.data.filter(g => rsvpIds.has(g.id))
        setConfirmedGames(matches)
      }
    })

    // 3. Saved Items & Bookmarks (Live Reactive Subscription)
    const unsubscribeSaved = subscribeSavedItems(items => {
      if (!active) return
      setSavedCount(items.length)
      const trialIds = new Set(items.filter(i => i.category === 'trial').map(i => i.id))
      void getOpportunities().then(res => {
        if (!active) return
        if (res.status === 'ready') {
          const opps = res.data.filter(o => trialIds.has(o.id)).slice(0, 4)
          setSavedOpportunities(opps)
        }
      })
    })

    return () => {
      active = false
      unsubscribeSaved()
    }
  }, [authUser])

  const handleLink = (e: MouseEvent<HTMLAnchorElement>, path: string) => {
    if (onNavigate) {
      onNavigate(e, path)
    }
  }

  const handleQuickDemoLogin = async (persona: (typeof DEMO_PERSONAS)[0]) => {
    setDemoNotice(`Switching to ${persona.name}…`)
    try {
      const res = await signInWithEmail({ email: persona.email, password: 'demo-password' })
      if (res.success && res.user) {
        setAuthUser(res.user)
        setDemoNotice(`Signed in as demo ${persona.role}: ${res.user.fullName}`)
      } else {
        const signRes = await signUpWithEmail({
          email: persona.email,
          fullName: persona.name,
          role: persona.role,
          city: persona.city,
          preferredSports: [persona.sport],
        })
        if (signRes.success && signRes.user) {
          setAuthUser(signRes.user)
          setDemoNotice(`Demo persona activated: ${signRes.user.fullName}`)
        }
      }
    } finally {
      setTimeout(() => setDemoNotice(null), 3000)
    }
  }

  // Profile completion calculation
  const profileCompletion = useMemo(() => {
    if (!authUser) return 0
    let score = 40 // Base registered account
    if (authUser.phone) score += 15
    if (authUser.city) score += 15
    if (authUser.preferredSports && authUser.preferredSports.length > 0) score += 15
    if (authUser.isVerified) score += 15
    return Math.min(100, score)
  }, [authUser])

  const userInitial = (authUser?.fullName || authUser?.name || 'K').charAt(0).toUpperCase()
  const userHandle = authUser ? normalizeUsername(authUser.fullName || authUser.name) : 'athlete'

  return (
    <section className="content-page user-dashboard-page">
      {/* Breadcrumb Navigation */}
      <nav className="user-dash-breadcrumb" aria-label="Breadcrumb">
        <a href="/" onClick={e => handleLink(e, '/')}>Home</a>
        <span className="separator">/</span>
        <span className="current">My Dashboard</span>
      </nav>

      {/* Demo Notification Toast */}
      {demoNotice && (
        <div className="settings-global-toast" role="status">
          <SiteIcon name="check-circle" size={16} />
          <span>{demoNotice}</span>
        </div>
      )}

      {/* Hero Identity Banner: Logged-In User vs. Guest Visitor */}
      {authUser ? (
        <div className="user-dash-hero">
          <div className="user-dash-identity">
            <div className="user-dash-avatar" aria-hidden="true">
              {userInitial}
            </div>
            <div className="user-dash-title-wrap">
              <h1>Welcome back, {authUser.fullName || authUser.name}!</h1>
              <div className="user-dash-meta-row">
                <span className={`user-role-badge ${authUser.role}`}>
                  <SiteIcon name="user" size={12} /> {authUser.role}
                </span>
                <span>•</span>
                <span>{authUser.city || 'India'}</span>
                <span>•</span>
                <span>{authUser.email}</span>
                <span>•</span>
                {authUser.isVerified ? (
                  <span className="user-verified-badge">
                    <SiteIcon name="shield-check" size={14} /> Verified Member
                  </span>
                ) : (
                  <a
                    href="/verification"
                    onClick={e => handleLink(e, '/verification')}
                    className="user-unverified-badge"
                  >
                    Get Verified (3 Steps)
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="user-dash-actions">
            <a
              href={`/u/@${userHandle}`}
              onClick={e => handleLink(e, `/u/@${userHandle}`)}
              className="user-dash-btn primary"
            >
              <SiteIcon name="eye" size={14} /> View Public Card
            </a>
            <a
              href="/sports-cv"
              onClick={e => handleLink(e, '/sports-cv')}
              className="user-dash-btn secondary"
            >
              <SiteIcon name="file-text" size={14} /> Edit Sports CV
            </a>
            {(authUser.role === 'host' || authUser.role === 'admin') && (
              <a
                href="/host"
                onClick={e => handleLink(e, '/host')}
                className="user-dash-btn secondary"
              >
                <SiteIcon name="building" size={14} /> Host &amp; Turfs Hub
              </a>
            )}
            {authUser.role === 'admin' && (
              <a
                href="/admin"
                onClick={e => handleLink(e, '/admin')}
                className="user-dash-btn secondary"
              >
                <SiteIcon name="shield-check" size={14} /> Admin Desk
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className="user-guest-hero">
          <span className="user-guest-eyebrow">
            <SiteIcon name="activity" size={13} /> KHELGRID SPORTS DASHBOARD · ATHLETE &amp; PARTNER SPACE
          </span>
          <h1>Your Personal Sports Dashboard</h1>
          <p>
            Track your selection trials, organize digital Sports CVs, discover nearby turfs, and confirm
            weekend pickup matches across 50+ Indian sports cities.
          </p>

          <div className="user-guest-cta-row">
            <button
              type="button"
              className="user-dash-btn primary"
              onClick={() => onOpenAuth?.('login')}
            >
              <SiteIcon name="lock" size={14} /> Sign In to KhelGrid
            </button>
            <button
              type="button"
              className="user-dash-btn secondary"
              onClick={() => onOpenAuth?.('signup')}
            >
              <SiteIcon name="plus" size={14} /> Create Free Athlete Account
            </button>
          </div>

          <div className="user-demo-strip">
            <span className="user-demo-label">1-Tap Instant Persona Preview:</span>
            {DEMO_PERSONAS.map(p => (
              <button
                key={p.role}
                type="button"
                className="user-demo-btn"
                onClick={() => handleQuickDemoLogin(p)}
              >
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* KPI Summary Cards Ribbon */}
      <div className="user-dash-kpi-grid">
        <a
          href="/sports-cv"
          onClick={e => handleLink(e, '/sports-cv')}
          className="user-dash-kpi-card"
        >
          <div className="user-kpi-header">
            <span className="user-kpi-title">Digital Sports CV</span>
            <div className="user-kpi-icon-wrap green">
              <SiteIcon name="file-text" size={18} />
            </div>
          </div>
          <div className="user-kpi-value">{profileCompletion}%</div>
          <span className="user-kpi-subtext">Profile completeness &bull; Click to update</span>
        </a>

        <a
          href="/saved"
          onClick={e => handleLink(e, '/saved')}
          className="user-dash-kpi-card"
        >
          <div className="user-kpi-header">
            <span className="user-kpi-title">Saved Items &amp; Deadlines</span>
            <div className="user-kpi-icon-wrap amber">
              <SiteIcon name="bookmark" size={18} />
            </div>
          </div>
          <div className="user-kpi-value">{savedCount}</div>
          <span className="user-kpi-subtext">Active trial cutoffs &amp; venues saved</span>
        </a>

        <a
          href="/play"
          onClick={e => handleLink(e, '/play')}
          className="user-dash-kpi-card"
        >
          <div className="user-kpi-header">
            <span className="user-kpi-title">Joined Matches</span>
            <div className="user-kpi-icon-wrap blue">
              <SiteIcon name="sports" size={18} />
            </div>
          </div>
          <div className="user-kpi-value">{confirmedGames.length}</div>
          <span className="user-kpi-subtext">Confirmed pickup games in your city</span>
        </a>

        <a
          href="/verification"
          onClick={e => handleLink(e, '/verification')}
          className="user-dash-kpi-card"
        >
          <div className="user-kpi-header">
            <span className="user-kpi-title">NIS Verification</span>
            <div className="user-kpi-icon-wrap purple">
              <SiteIcon name="shield-check" size={18} />
            </div>
          </div>
          <div className="user-kpi-value">{authUser?.isVerified ? 'Verified' : 'Pending'}</div>
          <span className="user-kpi-subtext">3-Step NIS &amp; federated verification badge</span>
        </a>
      </div>

      {/* Tab Switcher */}
      <nav className="user-dash-tabs" aria-label="Dashboard sections">
        <button
          type="button"
          className={`user-dash-tab-btn ${activeTab === 'overview' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <SiteIcon name="chart" size={16} /> Overview &amp; Activities
        </button>
        <button
          type="button"
          className={`user-dash-tab-btn ${activeTab === 'profile' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <SiteIcon name="user" size={16} /> My Player Card &amp; CV
        </button>
        <button
          type="button"
          className={`user-dash-tab-btn ${activeTab === 'matches' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('matches')}
        >
          <SiteIcon name="sports" size={16} /> Matches &amp; Bookings ({confirmedGames.length + venueBookings.length + trialApplications.length + academyEnquiries.length})
        </button>
        <button
          type="button"
          className={`user-dash-tab-btn ${activeTab === 'saved' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('saved')}
        >
          <SiteIcon name="bookmark" size={16} /> Saved Deadlines ({savedCount})
        </button>
      </nav>

      {/* TAB 1: OVERVIEW & ACTIVITIES */}
      {activeTab === 'overview' && (
        <div className="user-dash-section">
          {/* Quick Action Tiles */}
          <div className="user-dash-card">
            <div className="user-dash-card-header">
              <h2><SiteIcon name="activity" size={18} /> Essential Quick Actions</h2>
            </div>
            <div className="user-action-tiles-grid">
              <a
                href="/sports-cv"
                onClick={e => handleLink(e, '/sports-cv')}
                className="user-action-tile"
              >
                <span className="user-action-tile-icon">📄</span>
                <div className="user-action-tile-body">
                  <strong>Sports CV Builder</strong>
                  <span>Build or print your PDF resume with verified trials and match stats.</span>
                </div>
              </a>

              <a
                href="/opportunities"
                onClick={e => handleLink(e, '/opportunities')}
                className="user-action-tile"
              >
                <span className="user-action-tile-icon">🏅</span>
                <div className="user-action-tile-body">
                  <strong>Selection Trials</strong>
                  <span>Browse national state championships and Khelo India combines.</span>
                </div>
              </a>

              <a
                href="/venues"
                onClick={e => handleLink(e, '/venues')}
                className="user-action-tile"
              >
                <span className="user-action-tile-icon">🏟️</span>
                <div className="user-action-tile-body">
                  <strong>Book Turfs &amp; Grounds</strong>
                  <span>Explore sports venues near you with GPS distance calculation.</span>
                </div>
              </a>

              <a
                href="/play"
                onClick={e => handleLink(e, '/play')}
                className="user-action-tile"
              >
                <span className="user-action-tile-icon">⚽</span>
                <div className="user-action-tile-body">
                  <strong>Find Pickup Games</strong>
                  <span>Join local weekend box cricket, football and badminton matches.</span>
                </div>
              </a>

              <a
                href="/verification"
                onClick={e => handleLink(e, '/verification')}
                className="user-action-tile"
              >
                <span className="user-action-tile-icon">🛡️</span>
                <div className="user-action-tile-body">
                  <strong>Athlete Verification</strong>
                  <span>Get your NIS-grade athlete badge to unlock priority trial screening.</span>
                </div>
              </a>

              <a
                href="/learning"
                onClick={e => handleLink(e, '/learning')}
                className="user-action-tile"
              >
                <span className="user-action-tile-icon">📚</span>
                <div className="user-action-tile-body">
                  <strong>Sports Learning Hub</strong>
                  <span>Read free sports science books, biometrics, and nutrition guides.</span>
                </div>
              </a>
            </div>
          </div>

          {/* Confirmed Matches Preview */}
          <div className="user-dash-card">
            <div className="user-dash-card-header">
              <h2><SiteIcon name="sports" size={18} /> Upcoming Confirmed Matches</h2>
              <a href="/play" onClick={e => handleLink(e, '/play')}>Browse All Games &rarr;</a>
            </div>

            {confirmedGames.length > 0 ? (
              <div className="user-match-list">
                {confirmedGames.map(game => (
                  <div key={game.id} className="user-match-item">
                    <div className="user-match-main">
                      <span className="user-match-sport-badge">{game.sport}</span>
                      <div className="user-match-details">
                        <h3>{game.venue_name}</h3>
                        <p>{game.city} &bull; {game.time_label} &bull; Host: {game.host_name}</p>
                      </div>
                    </div>
                    <div className="user-match-actions">
                      {game.whatsapp_group_url && (
                        <a
                          href={game.whatsapp_group_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="user-whatsapp-btn"
                        >
                          <SiteIcon name="message" size={13} /> WhatsApp Match Group
                        </a>
                      )}
                      <a
                        href="/play"
                        onClick={e => handleLink(e, '/play')}
                        className="user-dash-btn secondary"
                      >
                        View Game
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="user-empty-state">
                <div className="empty-icon">⚽</div>
                <h3>No Confirmed Matches Yet</h3>
                <p>You haven't RSVP'd to any pickup matches yet. Discover weekend matches across your city.</p>
                <a
                  href="/play"
                  onClick={e => handleLink(e, '/play')}
                  className="user-dash-btn primary"
                >
                  Find Pickup Games in Your City
                </a>
              </div>
            )}
          </div>

          {/* Saved Trials & Deadlines Preview */}
          <div className="user-dash-card">
            <div className="user-dash-card-header">
              <h2><SiteIcon name="bookmark" size={18} /> Saved Trials &amp; Deadlines</h2>
              <a href="/saved" onClick={e => handleLink(e, '/saved')}>View All ({savedCount}) &rarr;</a>
            </div>

            {savedOpportunities.length > 0 ? (
              <div className="user-match-list">
                {savedOpportunities.map(opp => (
                  <div key={opp.id} className="user-match-item">
                    <div className="user-match-main">
                      <span className="user-match-sport-badge">{opp.sport?.name || 'All Sports'}</span>
                      <div className="user-match-details">
                        <h3>{opp.title}</h3>
                        <p>{opp.city || "India"} &bull; Type: {opp.opportunity_type} &bull; {opp.application_deadline || opp.starts_at || "Upcoming"}</p>
                      </div>
                    </div>
                    <div className="user-match-actions">
                      <a
                        href={`/opportunities/${opp.slug}`}
                        onClick={e => handleLink(e, `/opportunities/${opp.slug}`)}
                        className="user-dash-btn secondary"
                      >
                        View Trial
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="user-empty-state">
                <div className="empty-icon">📌</div>
                <h3>No Saved Items Yet</h3>
                <p>Bookmark national trials and sports academies to get cutoff deadline alerts.</p>
                <a
                  href="/opportunities"
                  onClick={e => handleLink(e, '/opportunities')}
                  className="user-dash-btn primary"
                >
                  Explore Selection Trials
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MY PLAYER CARD & CV */}
      {activeTab === 'profile' && (
        <div className="user-dash-section">
          {athleteProfile ? (
            <div className="user-dash-card">
              <div className="user-dash-card-header">
                <h2><SiteIcon name="user" size={18} /> Official KhelGrid Player Trading Card</h2>
                <a href={`/u/@${userHandle}`} onClick={e => handleLink(e, `/u/@${userHandle}`)}>Open Full Profile &rarr;</a>
              </div>
              <div style={{ maxWidth: '380px', margin: '0 auto' }}>
                <PlayerCard profile={athleteProfile} />
              </div>

              <div className="user-benchmarks-panel">
                <div className="benchmarks-panel-header">
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc' }}>
                      Empirical Normative Combine Status
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                      Benchmarked against 4,820 grassroots athletes tested under KhelChronicle KG-2026-002 protocols.
                    </p>
                  </div>
                  <a
                    href="/talent-scanner"
                    onClick={e => handleLink(e, '/talent-scanner')}
                    className="user-dash-btn secondary"
                    style={{ fontSize: '0.82rem', padding: '6px 12px' }}
                  >
                    <SiteIcon name="target" size={14} />
                    <span>{athleteProfile.fitnessBenchmarks?.percentileAvg ? 'Retest Scores' : 'Run Combine Test'}</span>
                  </a>
                </div>

                {athleteProfile.fitnessBenchmarks?.percentileAvg ? (
                  <div className="benchmarks-stats-grid">
                    <div className="benchmark-stat-box">
                      <span className="b-label">Yo-Yo IR1 Distance</span>
                      <strong className="b-val">{athleteProfile.fitnessBenchmarks.yoyoIr1Meters || 'N/A'} m</strong>
                    </div>
                    <div className="benchmark-stat-box">
                      <span className="b-label">30m Linear Sprint</span>
                      <strong className="b-val">{athleteProfile.fitnessBenchmarks.sprint30mSeconds ? `${athleteProfile.fitnessBenchmarks.sprint30mSeconds}s` : 'N/A'}</strong>
                    </div>
                    <div className="benchmark-stat-box">
                      <span className="b-label">Vertical Power (CMJ)</span>
                      <strong className="b-val">{athleteProfile.fitnessBenchmarks.cmjHeightCm ? `${athleteProfile.fitnessBenchmarks.cmjHeightCm} cm` : 'N/A'}</strong>
                    </div>
                    <div className="benchmark-stat-box highlight">
                      <span className="b-label">National Rank</span>
                      <strong className="b-val">{athleteProfile.fitnessBenchmarks.percentileAvg}th %ile</strong>
                      <small style={{ color: '#10b981', display: 'block', fontSize: '11px' }}>{athleteProfile.fitnessBenchmarks.tier || 'Verified Candidate'}</small>
                    </div>
                  </div>
                ) : (
                  <div className="benchmark-empty-box">
                    <SiteIcon name="target" size={24} style={{ color: '#38bdf8' }} />
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                      No physical benchmarks recorded yet. Test your aerobic endurance, sprint speed, and vertical jump to unlock your radar OVR card.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="user-dash-card">
              <div className="user-empty-state">
                <div className="empty-icon">📄</div>
                <h3>Build Your Official Sports CV</h3>
                <p>Create your verified sports resume with achievements, playing positions, and video highlights.</p>
                <a
                  href="/sports-cv"
                  onClick={e => handleLink(e, '/sports-cv')}
                  className="user-dash-btn primary"
                >
                  Open Sports CV Wizard
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CONFIRMED MATCHES & BOOKINGS */}
      {activeTab === 'matches' && (
        <div className="user-dash-section">
          {/* Section 1: My Turf & Court Slot Bookings */}
          <div className="user-dash-card" style={{ marginBottom: '24px' }}>
            <div className="user-dash-card-header">
              <h2><SiteIcon name="venues" size={18} /> My Turf &amp; Court Bookings ({venueBookings.length})</h2>
              <a
                href="/venues"
                onClick={e => handleLink(e, '/venues')}
                className="user-dash-btn secondary"
                style={{ fontSize: '0.82rem', padding: '6px 12px' }}
              >
                + Book Another Turf
              </a>
            </div>

            {venueBookings.length > 0 ? (
              <div className="user-bookings-grid">
                {venueBookings.map((b, idx) => (
                  <div key={b.bookingRef || idx} className="user-booking-card">
                    <div className="user-booking-header">
                      <div>
                        <span className="user-booking-ref">{b.bookingRef}</span>
                        <h3 style={{ margin: '4px 0 0', fontSize: '1rem', color: '#f8fafc' }}>{b.venueName}</h3>
                        <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#94a3b8' }}>
                          {b.city ? `${b.city} · ` : ''}{b.sport || 'Multi-Sport Turf'}
                        </p>
                      </div>
                      <span className={`user-booking-status ${b.paymentStatus === 'paid' ? 'paid' : 'pay-at-venue'}`}>
                        {b.paymentStatus === 'paid' ? 'Deposit Paid' : 'Pay at Venue'}
                      </span>
                    </div>
                    <div className="user-booking-details">
                      <div className="user-booking-meta-item">
                        <SiteIcon name="calendar" size={14} />
                        <span>{b.slotDate} · {b.slotTime}</span>
                      </div>
                      <div className="user-booking-meta-item">
                        <SiteIcon name="wallet" size={14} />
                        <span>Amount: ₹{b.paidAmount || 0}</span>
                      </div>
                    </div>
                    <div className="user-booking-actions">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.venueName + (b.city ? ' ' + b.city : ''))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="user-dash-btn secondary"
                        style={{ fontSize: '12px', padding: '6px 10px', textDecoration: 'none' }}
                      >
                        <SiteIcon name="map-pin" size={13} />
                        <span>Directions</span>
                      </a>
                      <a
                        href="/venues"
                        onClick={e => handleLink(e, '/venues')}
                        className="user-dash-btn secondary"
                        style={{ fontSize: '12px', padding: '6px 10px', textDecoration: 'none' }}
                      >
                        <SiteIcon name="external-link" size={13} />
                        <span>View Ground</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="user-empty-state">
                <div className="empty-icon">🏟️</div>
                <h3>No Turf Bookings Yet</h3>
                <p>Reserve football turfs, badminton courts, and cricket nets with instant slot confirmation.</p>
                <a href="/venues" onClick={e => handleLink(e, '/venues')} className="user-dash-btn primary">
                  Browse Sports Venues &amp; Turfs
                </a>
              </div>
            )}
          </div>

          {/* Section 2: My Selection Trial Applications */}
          <div className="user-dash-card" style={{ marginBottom: '24px' }}>
            <div className="user-dash-card-header">
              <h2><SiteIcon name="badge-check" size={18} /> My Selection Trial Applications ({trialApplications.length})</h2>
              <a
                href="/opportunities"
                onClick={e => handleLink(e, '/opportunities')}
                className="user-dash-btn secondary"
                style={{ fontSize: '0.82rem', padding: '6px 12px' }}
              >
                Explore More Trials
              </a>
            </div>

            {trialApplications.length > 0 ? (
              <div className="user-applications-grid">
                {trialApplications.map((app, idx) => (
                  <div key={app.id || app.applicationRef || idx} className="user-app-card">
                    <div className="user-app-header">
                      <div>
                        <span className="user-app-ref">{app.applicationRef}</span>
                        <h3 style={{ margin: '4px 0 0', fontSize: '1rem', color: '#f8fafc' }}>{app.trialTitle}</h3>
                        <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#94a3b8' }}>
                          {app.organizerName ? `${app.organizerName} · ` : ''}{app.city} ({app.sport})
                        </p>
                      </div>
                      <span className="user-app-status submitted">
                        <SiteIcon name="shield-check" size={12} />
                        <span>Submitted · Under Review</span>
                      </span>
                    </div>
                    <div className="user-app-metrics">
                      {app.fitnessBenchmarks?.percentileAvg ? (
                        <div className="user-app-pill">
                          <span>Tested Combine:</span>
                          <strong>{app.fitnessBenchmarks.percentileAvg}th %ile ({app.fitnessBenchmarks.tier})</strong>
                        </div>
                      ) : (
                        <div className="user-app-pill">
                          <span>Status:</span>
                          <strong>Verified Sports CV Attached</strong>
                        </div>
                      )}
                      {app.videoClipsCount > 0 && (
                        <div className="user-app-pill">
                          <span>Highlights:</span>
                          <strong>{app.videoClipsCount} Video Clips</strong>
                        </div>
                      )}
                    </div>
                    <div className="user-app-footer">
                      <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                        Applied on {new Date(app.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <a
                        href={`/opportunities/${app.trialSlug}`}
                        onClick={e => handleLink(e, `/opportunities/${app.trialSlug}`)}
                        className="user-dash-btn secondary"
                        style={{ fontSize: '12px', padding: '5px 10px', textDecoration: 'none' }}
                      >
                        View Trial Details
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="user-empty-state">
                <div className="empty-icon">🎯</div>
                <h3>No Trial Applications Yet</h3>
                <p>Apply to state and national football, cricket, and athletics trials directly with your Sports CV.</p>
                <a href="/opportunities" onClick={e => handleLink(e, '/opportunities')} className="user-dash-btn primary">
                  Find Selection Trials
                </a>
              </div>
            )}
          </div>
          {/* Section 3: My Academy Enquiries & Trial Batches */}
          <div className="user-dash-card" style={{ marginBottom: '24px' }}>
            <div className="user-dash-card-header">
              <h2><SiteIcon name="award" size={18} /> My Academy Enquiries &amp; Trial Batches ({academyEnquiries.length})</h2>
              <a
                href="/academies"
                onClick={e => handleLink(e, '/academies')}
                className="user-dash-btn secondary"
                style={{ fontSize: '0.82rem', padding: '6px 12px' }}
              >
                Browse All Academies
              </a>
            </div>

            {academyEnquiries.length > 0 ? (
              <div className="user-applications-grid">
                {academyEnquiries.map((enq, idx) => (
                  <div key={enq.id || enq.enquiryToken || idx} className="user-app-card">
                    <div className="user-app-header">
                      <div>
                        <span className="user-app-ref" style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.12)' }}>
                          {enq.enquiryToken}
                        </span>
                        <h3 style={{ margin: '4px 0 0', fontSize: '1rem', color: '#f8fafc' }}>{enq.academyName}</h3>
                        <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#94a3b8' }}>
                          {enq.city}{enq.state ? `, ${enq.state}` : ''} ({enq.sport})
                        </p>
                      </div>
                      <span className="user-app-status submitted" style={{ color: '#34d399', background: 'rgba(16, 185, 129, 0.15)' }}>
                        <SiteIcon name="shield-check" size={12} />
                        <span>
                          {enq.requestType === 'free_trial' ? 'Free Trial Requested' : 'Admission Under Review'}
                        </span>
                      </span>
                    </div>

                    <div className="user-app-metrics">
                      <div className="user-app-pill">
                        <span>Selected Batch:</span>
                        <strong>{enq.batchLabel}</strong>
                      </div>
                      <div className="user-app-pill">
                        <span>Candidate:</span>
                        <strong>{enq.athleteName} ({enq.skillLevel})</strong>
                      </div>
                      {enq.fitnessBenchmarks?.percentileAvg ? (
                        <div className="user-app-pill">
                          <span>Sports CV Benchmarks:</span>
                          <strong>{enq.fitnessBenchmarks.percentileAvg}th %ile ({enq.fitnessBenchmarks.tier})</strong>
                        </div>
                      ) : (
                        <div className="user-app-pill">
                          <span>Profile:</span>
                          <strong>Verified Candidate Dossier Attached</strong>
                        </div>
                      )}
                    </div>

                    <div className="user-app-footer">
                      <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                        Requested on {new Date(enq.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <a
                        href={`/academies/${enq.academySlug}`}
                        onClick={e => handleLink(e, `/academies/${enq.academySlug}`)}
                        className="user-dash-btn secondary"
                        style={{ fontSize: '12px', padding: '5px 10px', textDecoration: 'none' }}
                      >
                        View Academy Page
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="user-empty-state">
                <div className="empty-icon">🏅</div>
                <h3>No Academy Enquiries Yet</h3>
                <p>Register for free trial classes and training batch admissions at verified sports academies.</p>
                <a href="/academies" onClick={e => handleLink(e, '/academies')} className="user-dash-btn primary">
                  Explore Sports Academies
                </a>
              </div>
            )}
          </div>

          <div className="user-dash-card">
            <div className="user-dash-card-header">
              <h2><SiteIcon name="sports" size={18} /> Confirmed Matches &amp; Turf RSVPs</h2>
              {onOpenIntake && (
                <button
                  type="button"
                  className="user-dash-btn primary"
                  onClick={() => onOpenIntake('pickup_game')}
                >
                  + Host a Match
                </button>
              )}
            </div>

            {confirmedGames.length > 0 ? (
              <div className="user-match-list">
                {confirmedGames.map(game => (
                  <div key={game.id} className="user-match-item">
                    <div className="user-match-main">
                      <span className="user-match-sport-badge">{game.sport}</span>
                      <div className="user-match-details">
                        <h3>{game.venue_name}</h3>
                        <p>{game.city} &bull; {game.time_label} &bull; Confirmed Players: {game.confirmed_players}/{game.total_players}</p>
                      </div>
                    </div>
                    <div className="user-match-actions">
                      {game.whatsapp_group_url && (
                        <a
                          href={game.whatsapp_group_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="user-whatsapp-btn"
                        >
                          <SiteIcon name="message" size={13} /> WhatsApp Match Group
                        </a>
                      )}
                      <a
                        href="/play"
                        onClick={e => handleLink(e, '/play')}
                        className="user-dash-btn secondary"
                      >
                        View Game
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="user-empty-state">
                <div className="empty-icon">⚽</div>
                <h3>No Matches Booked</h3>
                <p>You haven't RSVP'd to any pickup matches yet. Explore available games in your city.</p>
                <a
                  href="/play"
                  onClick={e => handleLink(e, '/play')}
                  className="user-dash-btn primary"
                >
                  Browse Play &amp; Find Games
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SAVED DEADLINES */}
      {activeTab === 'saved' && (
        <div className="user-dash-section">
          <div className="user-dash-card">
            <div className="user-dash-card-header">
              <h2><SiteIcon name="bookmark" size={18} /> Saved Trials &amp; Deadlines Planner</h2>
              <a href="/saved" onClick={e => handleLink(e, '/saved')}>Open Saved Hub &rarr;</a>
            </div>

            {savedOpportunities.length > 0 ? (
              <div className="user-match-list">
                {savedOpportunities.map(opp => (
                  <div key={opp.id} className="user-match-item">
                    <div className="user-match-main">
                      <span className="user-match-sport-badge">{opp.sport?.name || 'All Sports'}</span>
                      <div className="user-match-details">
                        <h3>{opp.title}</h3>
                        <p>{opp.city || "India"} &bull; {opp.application_deadline || opp.starts_at || "Upcoming"} &bull; {opp.venue_name || "Sports Complex"}</p>
                      </div>
                    </div>
                    <div className="user-match-actions">
                      <a
                        href={`/opportunities/${opp.slug}`}
                        onClick={e => handleLink(e, `/opportunities/${opp.slug}`)}
                        className="user-dash-btn secondary"
                      >
                        View Details
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="user-empty-state">
                <div className="empty-icon">📌</div>
                <h3>No Saved Items</h3>
                <p>Bookmark trials to keep track of upcoming registration cutoffs.</p>
                <a
                  href="/opportunities"
                  onClick={e => handleLink(e, '/opportunities')}
                  className="user-dash-btn primary"
                >
                  Explore Selection Trials
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
