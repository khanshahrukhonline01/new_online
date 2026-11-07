import { useEffect, useRef, useState, lazy, Suspense, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import HomePage from './modules/home/HomePage'
import Sidebar from './shared/components/Sidebar'
import SportsBar from './shared/components/SportsBar'
import { resolveRoute } from './shared/routing'
import { SiteIcon } from './shared/components/SiteIcon'
import TopSportsComplexes from './shared/components/TopSportsComplexes'
import GameSportPlayAcrossIndia from './shared/components/GameSportPlayAcrossIndia'
import FrequentlyAskedQuestions from './shared/components/FrequentlyAskedQuestions'
import SiteAnnouncementBanner from './shared/components/SiteAnnouncementBanner'
import NavbarSettingsMenu from './shared/components/NavbarSettingsMenu'
import type { CommunityListingCategory } from './integrations/supabase/public-client'
import {
  getStoredAuthUser,
  onAuthChange,
  signOut,
  parseAuthUrlCallback,
  clearAuthUrlHash,
  type AuthUserProfile,
} from './integrations/supabase/auth-client'
import { getRouteSeoMetadata, updatePageSeoMetadata } from './shared/utils/seoAndShare'

// Code-split route components via React.lazy()
const HelpFeedbackPage = lazy(() => import('./modules/help/HelpFeedbackPage'))
const PlayPage = lazy(() => import('./modules/play/PlayPage'))
const SportsCvWizard = lazy(() => import('./modules/sports-cv/SportsCvWizard'))
const OpportunitiesPage = lazy(() => import('./modules/opportunities/OpportunitiesPage'))
const VenuesPage = lazy(() => import('./modules/venues/VenuesPage'))
const VenueDetailPage = lazy(() => import('./modules/venues/VenueDetailPage'))
const AcademiesPage = lazy(() => import('./modules/academies/AcademiesPage'))
const AcademyDetailPage = lazy(() => import('./modules/academies/AcademyDetailPage'))
const SportsPage = lazy(() => import('./modules/sports/SportsPage'))
const SportDetailPage = lazy(() => import('./modules/sports/SportDetailPage'))
const SearchPage = lazy(() => import('./modules/search/SearchPage'))
const FeatureComingSoonPage = lazy(() => import('./modules/coming-soon/FeatureComingSoonPage'))
const AthleteProfilePage = lazy(() => import('./modules/athlete-profile/AthleteProfilePage'))
const CatalogueDetailPage = lazy(() => import('./modules/catalogue/CatalogueDetailPage'))
const LiveScoresPage = lazy(() => import('./modules/live/LiveScoresPage'))
const ListingSubmissionPage = lazy(() => import('./modules/listings/ListingSubmissionPage'))
const PolicyPage = lazy(() => import('./modules/policies/PolicyPage'))
const SettingsPage = lazy(() => import('./modules/settings/SettingsPage'))
const CitiesPage = lazy(() => import('./modules/directories/CitiesPage'))
const CityDetailPage = lazy(() => import('./modules/directories/CityDetailPage'))
const TalentScannerPage = lazy(() => import('./modules/talent-scanner/TalentScannerPage'))
const KhelChronicleHome = lazy(() => import('./modules/khelchronicle/KhelChronicleHome'))
const KhelChroniclePaperPage = lazy(() => import('./modules/khelchronicle/KhelChroniclePaperPage'))
const KhelChronicleCategoryPage = lazy(() => import('./modules/khelchronicle/KhelChronicleCategoryPage'))
const KhelChronicleAuthorPage = lazy(() => import('./modules/khelchronicle/KhelChronicleAuthorPage'))
const KhelChronicleSubmitPage = lazy(() => import('./modules/khelchronicle/KhelChronicleSubmitPage'))
const HostDashboardPage = lazy(() => import('./modules/host/HostDashboardPage'))
const LearningHubPage = lazy(() => import('./modules/learning/LearningHubPage'))
const SportsCalendarPage = lazy(() => import('./modules/calendar/SportsCalendarPage'))
const SportsToolsPage = lazy(() => import('./modules/tools/SportsToolsPage'))
const PricingPage = lazy(() => import('./modules/pricing/PricingPage'))
const PartnerPage = lazy(() => import('./modules/partner/PartnerPage'))
const SavedPage = lazy(() => import('./modules/saved/SavedPage'))
const CoachesPage = lazy(() => import('./modules/coaches/CoachesPage'))
const EventsPage = lazy(() => import('./modules/events/EventsPage'))
const ScoutPortalPage = lazy(() => import('./modules/scouting/ScoutPortalPage'))
const AthleteVerificationPage = lazy(() => import('./modules/verification/AthleteVerificationPage'))
const AdminModerationPage = lazy(() => import('./modules/admin/AdminModerationPage'))

// Code-split heavyweight modal dialogs
const CommunityListingModal = lazy(() => import('./shared/components/CommunityListingModal'))
const NotificationCenterDrawer = lazy(() => import('./shared/components/NotificationCenterDrawer'))
const SpotlightSearchModal = lazy(() => import('./shared/components/SpotlightSearchModal'))
const FeedbackSupportModal = lazy(() => import('./shared/components/FeedbackSupportModal'))
const UserConsentModal = lazy(() => import('./shared/components/UserConsentModal'))
const GoProModal = lazy(() => import('./shared/components/GoProModal'))
const AuthModal = lazy(() => import('./shared/components/AuthModal'))

function PageFallbackLoader() {
  return (
    <div className="page-route-loader" role="status" aria-live="polite" aria-label="Loading page content...">
      <div className="page-route-loader-spinner">
        <SiteIcon name="loader" size={28} className="spinning" />
      </div>
      <p className="page-route-loader-text">Loading KhelGrid...</p>
    </div>
  )
}


const IPR_NOTICE_HEADING = 'IPR, AI & Copyright Notice'

function currentPath() {
  if (typeof window === 'undefined') return '/'
  return window.location.pathname.replace(/\/$/, '') || '/'
}

export default function App() {
  const { t } = useTranslation(['common', 'navigation'])
  const [path, setPath] = useState('/')
  const [menuOpen, setMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [headerQuery, setHeaderQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [intakeModalOpen, setIntakeModalOpen] = useState(false)
  const [intakeCategory, setIntakeCategory] = useState<CommunityListingCategory>('pickup_game')
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [unreadNotifCount, setUnreadNotifCount] = useState(3)
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [consentModalOpen, setConsentModalOpen] = useState(false)
  const [consentInitialTab, setConsentInitialTab] = useState<'sports_pass' | 'rules_privacy'>('sports_pass')
  const [goProModalOpen, setGoProModalOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup' | 'forgot_password' | 'expired_link'>('login')
  const [authModalError, setAuthModalError] = useState<string | undefined>(undefined)
  const [authUser, setAuthUser] = useState<AuthUserProfile | null>(() => getStoredAuthUser())
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const menuToggleRef = useRef<HTMLButtonElement>(null)

  function openIntake(category: CommunityListingCategory = 'pickup_game') {
    setIntakeCategory(category)
    setIntakeModalOpen(true)
  }

  // Detect Supabase Auth callback errors or tokens from URL hash / search params
  useEffect(() => {
    if (typeof window === 'undefined') return
    const callbackInfo = parseAuthUrlCallback()

    if (callbackInfo.type === 'error') {
      const isOtpExpired =
        callbackInfo.errorCode === 'otp_expired' ||
        callbackInfo.errorDescription?.toLowerCase().includes('expired')
      setAuthModalTab(isOtpExpired ? 'expired_link' : 'login')
      setAuthModalError(
        isOtpExpired
          ? 'Email verification link is invalid or has expired. Enter your email below to receive a fresh verification link.'
          : (callbackInfo.errorDescription || 'Authentication could not be completed. Please sign in with your credentials.')
      )
      setAuthModalOpen(true)
      clearAuthUrlHash()
    } else if (callbackInfo.type === 'recovery') {
      setAuthModalTab('forgot_password')
      setAuthModalError('Please enter a new password for your account.')
      setAuthModalOpen(true)
      clearAuthUrlHash()
    } else if (callbackInfo.type === 'signup_confirmed') {
      clearAuthUrlHash()
    }
  }, [])

  useEffect(() => {
    return onAuthChange(user => {
      setAuthUser(user)
    })
  }, [])

  useEffect(() => {
    setUserMenuOpen(false)
  }, [path])

  useEffect(() => {
    function handleGlobalKeyDown(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && (event.key === 'k' || event.key === 'K')) {
        event.preventDefault()
        setSearchModalOpen(open => !open)
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 700px)')
    const updateViewport = () => setIsMobile(media.matches)
    updateViewport()
    media.addEventListener?.('change', updateViewport)
    return () => media.removeEventListener?.('change', updateViewport)
  }, [])

  useEffect(() => {
    setPath(currentPath())
    setHeaderQuery(new URLSearchParams(window.location.search).get('q') ?? '')
    setSearchQuery(new URLSearchParams(window.location.search).get('q') ?? '')
    const handlePopState = () => { setPath(currentPath()); setHeaderQuery(new URLSearchParams(window.location.search).get('q') ?? ''); setSearchQuery(new URLSearchParams(window.location.search).get('q') ?? ''); setMenuOpen(false) }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => { setMenuOpen(false) }, [path])

  useEffect(() => {
    const seo = getRouteSeoMetadata(path)
    const cleanup = updatePageSeoMetadata(seo)
    return cleanup
  }, [path])

  function toggleMainMenu() {
    if (isMobile) {
      setMenuOpen(open => !open)
    } else {
      setSidebarCollapsed(collapsed => !collapsed)
    }
  }

  function navigate(event: MouseEvent<HTMLAnchorElement>, target: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    event.preventDefault()
    if (typeof window !== 'undefined') {
      if (target !== path) window.history.pushState({}, '', target)
      window.scrollTo({ top: 0, behavior: 'auto' })
    }
    const nextPath = target.split('?')[0].replace(/\/$/, '') || '/'
    if (nextPath === '/login') {
      setAuthModalTab('login')
      setAuthModalOpen(true)
      return
    }
    if (nextPath === '/signup') {
      setAuthModalTab('signup')
      setAuthModalOpen(true)
      return
    }
    if (nextPath === '/forgot-password') {
      setAuthModalTab('forgot_password')
      setAuthModalOpen(true)
      return
    }
    setPath(nextPath)
    if (nextPath === '/search') { const nextQuery = new URLSearchParams(target.split('?')[1] ?? '').get('q') ?? ''; setSearchQuery(nextQuery); setHeaderQuery(nextQuery) }
    setMenuOpen(false)
    menuToggleRef.current?.focus()
  }

  const match = resolveRoute(path)
  let page
  switch (match.name) {
    case 'home': page = <HomePage onNavigate={navigate} />; break
    case 'sports-index': page = <SportsPage />; break
    case 'sport-detail': page = <SportDetailPage slug={match.slug} onNavigate={navigate} />; break
    case 'athlete-profile': page = <AthleteProfilePage username={match.username} onNavigate={navigate} />; break
    case 'opportunities-index': page = <OpportunitiesPage onOpenIntake={() => openIntake('opportunity')} />; break
    case 'opportunity-detail': page = <CatalogueDetailPage kind="opportunity" slug={match.slug} />; break
    case 'academies-index': page = <AcademiesPage onOpenIntake={() => openIntake('academy')} onNavigate={navigate} />; break
    case 'academy-detail': page = <AcademyDetailPage slug={match.slug} onNavigate={navigate} onOpenIntake={() => openIntake('academy')} />; break
    case 'venues-index': page = <VenuesPage onOpenIntake={() => openIntake('venue')} onNavigate={navigate} />; break
    case 'cities-index': page = <CitiesPage onNavigate={navigate} />; break
    case 'city-detail': page = <CityDetailPage citySlug={match.slug} onNavigate={navigate} onOpenIntake={openIntake} />; break
    case 'venue-detail': page = <VenueDetailPage slug={match.slug} onNavigate={navigate} onOpenIntake={openIntake} />; break
    case 'search': page = <SearchPage initialQuery={searchQuery} />; break
    case 'tools-index': page = <SportsToolsPage onNavigate={navigate} initialToolSlug={match.toolSlug} />; break
    case 'khelchronicle-index': page = <KhelChronicleHome onNavigate={navigate} />; break
    case 'khelchronicle-submit': page = <KhelChronicleSubmitPage onNavigate={navigate} />; break
    case 'khelchronicle-category': page = <KhelChronicleCategoryPage categorySlug={match.category} onNavigate={navigate} />; break
    case 'khelchronicle-author': page = <KhelChronicleAuthorPage authorSlug={match.author} onNavigate={navigate} />; break
    case 'khelchronicle-paper': page = <KhelChroniclePaperPage slug={match.slug} onNavigate={navigate} />; break
    case 'feature':
      if (match.canonicalPath === '/dashboard' || match.canonicalPath === '/host' || match.canonicalPath === '/partner-dashboard') page = <HostDashboardPage onNavigate={navigate} onOpenIntake={openIntake} />
      else if (match.canonicalPath === '/help-feedback') page = <HelpFeedbackPage />
      else if (match.canonicalPath === '/sports-cv') page = <SportsCvWizard />
      else if (match.canonicalPath === '/talent-scanner') page = <TalentScannerPage onNavigate={navigate} />
      else if (match.canonicalPath === '/play') page = <PlayPage onNavigate={navigate} onOpenIntake={() => openIntake('pickup_game')} />
      else if (match.canonicalPath === '/coaches') page = <CoachesPage onNavigate={navigate} onOpenCoachIntake={() => openIntake('academy')} />
      else if (match.canonicalPath === '/events') page = <EventsPage onNavigate={navigate} />
      else if (match.canonicalPath === '/scout-portal') page = <ScoutPortalPage onNavigate={navigate} />
      else if (match.canonicalPath === '/verification') page = <AthleteVerificationPage onNavigate={navigate} />
      else if (match.canonicalPath === '/admin' || match.canonicalPath === '/moderation') page = <AdminModerationPage onNavigate={navigate} />
      else if (match.canonicalPath === '/calendar') page = <SportsCalendarPage onNavigate={navigate} />
      else if (match.canonicalPath === '/tools' || match.canonicalPath === '/sports-tools' || match.canonicalPath.startsWith('/tools/')) page = <SportsToolsPage onNavigate={navigate} initialToolSlug={match.canonicalPath.startsWith('/tools/') ? match.canonicalPath.slice('/tools/'.length) : undefined} />
      else if (match.canonicalPath === '/live' || match.canonicalPath === '/live-scores') page = <LiveScoresPage onNavigate={navigate} />
      else if (match.canonicalPath === '/submit-listing' || match.canonicalPath === '/list') page = <ListingSubmissionPage onOpenIntake={() => openIntake('pickup_game')} />
      else if (match.canonicalPath === '/learning' || match.canonicalPath === '/learning-hub') page = <LearningHubPage onNavigate={navigate} />
      else if (match.canonicalPath === '/notifications') page = (
        <section className="content-page">
          <p className="eyebrow">YOUR UPDATES &amp; ALERTS</p>
          <h1>Notifications Center.</h1>
          <p className="page-intro">
            Track upcoming selection trial deadlines, newly verified sports complexes, live match scores, and community games.
          </p>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="primary-link"
              onClick={() => setNotificationsOpen(true)}
              style={{ border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <SiteIcon name="bell" size={16} />
              <span>Open Notifications Flyout ({unreadNotifCount} unread)</span>
            </button>
            <a href="/opportunities" onClick={e => navigate(e, '/opportunities')} className="primary-link">
              Explore Trials <SiteIcon name="arrow-up-right" size={15} />
            </a>
          </div>
        </section>
      )
      else if (match.canonicalPath === '/settings') page = <SettingsPage onNavigate={navigate} />
      else if (match.canonicalPath === '/pricing' || match.canonicalPath === '/memberships' || match.canonicalPath === '/pro') page = <PricingPage onNavigate={navigate} />
      else if (match.canonicalPath === '/saved') page = <SavedPage onNavigate={navigate} />
      else if (match.canonicalPath === '/partner' || match.canonicalPath === '/partners') page = <PartnerPage onNavigate={navigate} onOpenIntake={openIntake} />
      else if (['/privacy','/terms','/cookies','/ipr-policy','/cancellation-policy','/posh-policy','/editorial-policy','/verification-policy','/correction-policy','/workplace-policy'].includes(match.canonicalPath)) page = <PolicyPage path={match.canonicalPath} onNavigate={navigate} />
      else page = <FeatureComingSoonPage title={match.slug} path={match.canonicalPath} />
      break
    default:
      page = <section className="content-page"><p className="eyebrow">PAGE NOT AVAILABLE</p><h1>This page isn’t here yet.</h1><p className="page-intro">This route has not been implemented. Return to a published section to continue exploring.</p><a className="primary-link" href="/" onClick={event => navigate(event, '/')}>Back home <SiteIcon name="arrow-up-right" size={16} /></a></section>
  }

  return <div className={`app-shell foundation-v1 ${sidebarCollapsed ? 'sidebar-is-collapsed' : 'sidebar-is-expanded'}`}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="site-header">
      <button ref={menuToggleRef} className="menu-toggle" type="button" aria-expanded={isMobile ? menuOpen : !sidebarCollapsed} aria-controls={isMobile ? 'mobile-sidebar-drawer' : 'app-sidebar'} onClick={toggleMainMenu} aria-label="Toggle main navigation"><SiteIcon name={isMobile && menuOpen ? 'close' : 'menu'} size={20} /></button>
      <a className="brand" href="/" onClick={event => navigate(event, '/')} aria-label="KhelGrid home"><img className="brand-logo" src="/assets/kg-logo.webp" alt="" aria-hidden="true" /><span>KHELGRID</span></a>
      <a
        href="/play"
        className={`header-play-pill ${path === '/play' ? 'is-active' : ''}`}
        aria-current={path === '/play' ? 'page' : undefined}
        onClick={event => navigate(event, '/play')}
        title={t('findGames', { ns: 'navigation', defaultValue: 'Play pickup games & community matches' })}
      >
        <SiteIcon name="users" size={15} />
        <span>{t('play', 'Play')}</span>
      </a>
      <nav className="header-actions" aria-label="KhelGrid actions">
        <button
          className="header-action-link header-action-add"
          type="button"
          onClick={() => openIntake('pickup_game')}
          title="List an Academy, Turf, Trial or Pickup Game on KhelGrid"
          aria-label={t('listOnKhelgrid', '+ List on KhelGrid')}
        >
          <SiteIcon name="plus" size={16} />
          <span>{t('listOnKhelgrid', '+ List on KhelGrid')}</span>
        </button>
        <button
          className="header-action-link"
          type="button"
          onClick={() => openIntake('venue')}
          title="List a sports venue on KhelGrid"
          aria-label={t('listVenue', 'List your venue')}
        >
          <SiteIcon name="building" size={16} />
          <span>{t('listVenue', 'List your venue')}</span>
        </button>
        <button
          className="header-action-link header-action-secondary"
          type="button"
          onClick={() => openIntake('opportunity')}
          title="Submit a sports trial or opportunity"
          aria-label={t('submitTrial', 'Submit a trial')}
        >
          <SiteIcon name="calendar-check" size={16} />
          <span>{t('submitTrial', 'Submit a trial')}</span>
        </button>
        <a className="header-action-link header-action-coach" href="mailto:khelgrid@gmail.com?subject=Register%20as%20a%20coach%20on%20KhelGrid" title="Register as a coach on KhelGrid" aria-label={t('joinAsCoach', 'Join as Coach')}><SiteIcon name="award" size={16} /><span>{t('joinAsCoach', 'Join as Coach')}</span></a>
        <a className="header-action-link header-action-chronicle" href="/khelchronicle/submit" onClick={event => navigate(event, '/khelchronicle/submit')} title="Submit research manuscript to KhelChronicle" aria-label={t('submitPaper', 'Submit Paper')}><SiteIcon name="file-text" size={16} /><span>{t('submitPaper', 'Submit Paper')}</span></a>
      </nav>
      <button
        className="header-icon-button header-search-trigger"
        type="button"
        onClick={() => setSearchModalOpen(true)}
        aria-label={t('searchCatalogueAria', 'Search KhelGrid catalogue')}
        title="Search KhelGrid (Ctrl+K)"
      >
        <SiteIcon name="search" size={19} />
        <span className="sr-only">{t('searchKhelgrid', 'Search KhelGrid')}</span>
      </button>
      <button
        className="header-icon-button header-notif-trigger"
        type="button"
        onClick={() => setNotificationsOpen(true)}
        aria-label={t('notifications', 'Notifications')}
        title={t('notifications', 'Notifications')}
      >
        <SiteIcon name="bell" size={19} />
        {unreadNotifCount > 0 && (
          <span className="header-notif-badge">{unreadNotifCount > 9 ? '9+' : unreadNotifCount}</span>
        )}
      </button>
      <NavbarSettingsMenu
        onNavigate={navigate}
        onOpenFeedback={() => setFeedbackModalOpen(true)}
      />
      {authUser ? (
        <div className="header-user-menu-wrap">
          <button
            className="header-user-btn"
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            aria-expanded={userMenuOpen}
            aria-label={`User account menu for ${authUser.fullName}`}
            title={`Signed in as ${authUser.fullName} (${authUser.role})`}
          >
            <span className="header-user-avatar">
              {authUser.avatarUrl ? (
                <img src={authUser.avatarUrl} alt="" />
              ) : (
                authUser.fullName.charAt(0).toUpperCase()
              )}
            </span>
            <span className="header-user-details">
              <span className="header-user-name">{authUser.fullName.split(' ')[0]}</span>
              <span className="header-user-role-badge">{authUser.role}</span>
            </span>
          </button>
          {userMenuOpen && (
            <div className="header-user-dropdown" role="menu">
              <div className="header-user-dropdown-header">
                <strong>{authUser.fullName}</strong>
                <small>{authUser.email}</small>
                <span className="header-user-role-pill">{authUser.role.toUpperCase()}</span>
              </div>
              <div className="header-user-dropdown-divider" />
              <a
                href={`/u/@${authUser.fullName.toLowerCase().replace(/\s+/g, '-')}`}
                className="header-user-dropdown-item"
                role="menuitem"
                onClick={e => {
                  setUserMenuOpen(false)
                  navigate(e, `/u/@${authUser.fullName.toLowerCase().replace(/\s+/g, '-')}`)
                }}
              >
                <SiteIcon name="user-round" size={15} />
                <span>My Athlete Profile</span>
              </a>
              {(authUser.role === 'host' || authUser.role === 'admin') && (
                <a
                  href="/host"
                  className="header-user-dropdown-item"
                  role="menuitem"
                  onClick={e => {
                    setUserMenuOpen(false)
                    navigate(e, '/host')
                  }}
                >
                  <SiteIcon name="building" size={15} />
                  <span>Host &amp; Partner Dashboard</span>
                </a>
              )}
              {authUser.role === 'admin' && (
                <a
                  href="/admin"
                  className="header-user-dropdown-item"
                  role="menuitem"
                  onClick={e => {
                    setUserMenuOpen(false)
                    navigate(e, '/admin')
                  }}
                >
                  <SiteIcon name="shield-check" size={15} />
                  <span>Admin Moderation Desk</span>
                </a>
              )}
              <a
                href="/settings"
                className="header-user-dropdown-item"
                role="menuitem"
                onClick={e => {
                  setUserMenuOpen(false)
                  navigate(e, '/settings')
                }}
              >
                <SiteIcon name="sliders" size={15} />
                <span>Account Settings</span>
              </a>
              <div className="header-user-dropdown-divider" />
              <button
                type="button"
                className="header-user-dropdown-item is-signout"
                role="menuitem"
                onClick={() => {
                  setUserMenuOpen(false)
                  void signOut()
                }}
              >
                <SiteIcon name="close" size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          className="header-login-link"
          type="button"
          onClick={() => {
            setAuthModalTab('login')
            setAuthModalOpen(true)
          }}
          aria-label="Your profile"
          title="Sign in or register on KhelGrid"
        >
          <SiteIcon name="user-round" size={17} />
          <span>
            {t('login', 'Login')} <small>Sign In</small>
          </span>
        </button>
      )}
      <a
        className="header-go-pro"
        href="/pricing"
        onClick={event => {
          event.preventDefault()
          setGoProModalOpen(true)
        }}
      >
        <SiteIcon name="star" size={16} />
        <span>{t('goPro', 'Go Pro')}</span>
      </a>
    </header>
    <div className="app-workspace">
      <Sidebar
        activePath={path}
        onNavigate={navigate}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        toggleRef={menuToggleRef}
        collapsed={sidebarCollapsed}
        onOpenIntake={() => openIntake('pickup_game')}
      />
      <main id="main-content" className="page-shell">
        <SiteAnnouncementBanner onNavigate={navigate} />
        <SportsBar activePath={path} onNavigate={navigate} />
        <div className="page-content">
          <Suspense fallback={<PageFallbackLoader />}>
            {page}
          </Suspense>
        </div>
      </main>
    </div>

    <footer className="site-footer">
      <FrequentlyAskedQuestions activePath={path} onNavigate={navigate} />
      <GameSportPlayAcrossIndia onNavigate={navigate} />
      <TopSportsComplexes onNavigate={navigate} />
      <div className="footer-main">
        <div className="footer-about">
          <a className="footer-brand" href="/" onClick={event => navigate(event, '/')} aria-label="KhelGrid home"><img className="footer-brand-logo" src="/assets/kg-logo.webp" alt="" aria-hidden="true" /></a>
          <p className="footer-tagline">India’s grid for sports trials, venues, coaching and athlete profiles.</p>
          <p className="footer-region">India · 50+ sports cities in the grid (16 metro hubs)</p>
          <a className="footer-pro-link" href="/pricing" onClick={event => navigate(event, '/pricing')}>★ Go Pro · ₹499/month</a>
        </div>
        <nav className="footer-column" aria-label="Explore KhelGrid">
          <h2>Explore</h2>
          <a href="/sports" onClick={event => navigate(event, '/sports')}>All sports</a>
          <a href="/opportunities" onClick={event => navigate(event, '/opportunities')}>Trials & opportunities</a>
          <a href="/venues" onClick={event => navigate(event, '/venues')}>Sports venues</a>
          <a href="/cities" onClick={event => navigate(event, '/cities')}>Sports cities (50+)</a>
          <a href="/search" onClick={event => navigate(event, '/search')}>Search catalogue</a>
          <a href="/calendar" onClick={event => navigate(event, '/calendar')}>Sports calendar</a>
        </nav>
        <nav className="footer-column" aria-label="Play and train">
          <h2>Play & train</h2>
          <a href="/play" onClick={event => navigate(event, '/play')}>Find a game</a>
          <a href="/venues" onClick={event => navigate(event, '/venues')}>Book venues</a>
          <a href="/coaches" onClick={event => navigate(event, '/coaches')}>Coaches</a>
          <a href="/academies" onClick={event => navigate(event, '/academies')}>Academies</a>
          <span className="footer-coming-soon">Sports CV Wizard <small>Coming soon</small></span>
        </nav>
        <nav className="footer-column" aria-label="Learn and discover">
          <h2>Learn</h2>
          <a href="/guides" onClick={event => navigate(event, '/guides')}>Sports guides</a>
          <a href="/learning" onClick={event => navigate(event, '/learning')}>Sports & learning hub</a>
          <a href="/khelchronicle" onClick={event => navigate(event, '/khelchronicle')}>KhelChronicle</a>
          <a href="/live" onClick={event => navigate(event, '/live')}>Live scores</a>
        </nav>
        <nav className="footer-column" aria-label="About and support">
          <h2>Grow with KhelGrid</h2>
          <a href="/partner" onClick={event => navigate(event, '/partner')}><strong>Partner with KhelGrid</strong></a>
          <a href="mailto:khelgrid@gmail.com?subject=List%20a%20sports%20venue" onClick={e => { e.preventDefault(); openIntake('venue') }}>List your venue</a>
          <a href="mailto:khelgrid@gmail.com?subject=Submit%20a%20sports%20trial" onClick={e => { e.preventDefault(); openIntake('opportunity') }}>Submit a trial</a>
          <a href="mailto:khelgrid@gmail.com?subject=Register%20as%20a%20coach%20on%20KhelGrid">Join as Coach</a>
          <a href="/khelchronicle/submit" onClick={event => navigate(event, '/khelchronicle/submit')}>Submit Paper</a>
          <a href="mailto:khelgrid@gmail.com">Contact KhelGrid</a>
          <a href="/about" onClick={event => navigate(event, '/about')}>About KhelGrid</a>
          <p className="footer-trust-copy">Check each organiser’s source, dates, eligibility, fees and venue before applying or travelling.</p>
        </nav>
      </div>
      <div className="footer-quick-access">
        <div className="footer-quick-heading">
          <div><h2>Explore sports on KhelGrid</h2><p>Quick access to key parts of the sports catalogue.</p></div>
          <a href="/sports" onClick={event => navigate(event, '/sports')}>Browse all sports <span aria-hidden="true">↗</span></a>
        </div>
        <div className="footer-quick-chips">
          <a href="/opportunities" onClick={event => navigate(event, '/opportunities')}><span aria-hidden="true">◎</span><span><strong>Sports trials</strong><small>Opportunities</small></span></a>
          <a href="/venues" onClick={event => navigate(event, '/venues')}><span aria-hidden="true">⌖</span><span><strong>Sports venues</strong><small>Find a place to play</small></span></a>
          <a href="/play" onClick={event => navigate(event, '/play')}><span aria-hidden="true">⚽</span><span><strong>Find a game</strong><small>Play with others</small></span></a>
          <a href="/calendar" onClick={event => navigate(event, '/calendar')}><span aria-hidden="true">▦</span><span><strong>Sports calendar</strong><small>Events & dates</small></span></a>
          <a href="/live" onClick={event => navigate(event, '/live')}><span aria-hidden="true">⌁</span><span><strong>Live scores</strong><small>Match centre</small></span></a>
          <a href="/search" onClick={event => navigate(event, '/search')}><span aria-hidden="true">⌕</span><span><strong>Search KhelGrid</strong><small>Explore the catalogue</small></span></a>
        </div>
      </div>
      <section className="footer-products" aria-labelledby="footer-products-title">
        <div className="footer-quick-heading"><div><h2 id="footer-products-title">Explore KhelGrid Products</h2><p>Tools to help athletes build, train, discover and get noticed.</p></div></div>
        <div className="footer-product-grid">
          <div className="footer-product"><strong>Sports CV</strong><span>Show your journey</span></div>
          <div className="footer-product"><strong>Talent Scanner</strong><span>Track performance</span></div>
          <a className="footer-product" href="/opportunities" onClick={event => navigate(event, '/opportunities')}><strong>Find Trials</strong><span>Discover opportunities</span></a>
          <div className="footer-product"><strong>AI Sports Guide</strong><span>Plan your next step</span></div>
          <a className="footer-product" href="/venues" onClick={event => navigate(event, '/venues')}><strong>Book Venues</strong><span>Find places to play</span></a>
          <a className="footer-product" href="/play" onClick={event => navigate(event, '/play')}><strong>Play &amp; Match</strong><span>Find pickup games</span></a>
        </div>
      </section>
      <section className="footer-ipr" aria-labelledby="footer-ipr-title" data-footer-section="ipr-ai-copyright-v1">
        <div><h2 id="footer-ipr-title">{IPR_NOTICE_HEADING}</h2><p>Website content and original editorial materials are protected by applicable copyright law. AI-assisted material may be used for informational purposes; outputs and rights depend on the underlying human contribution and applicable law. Do not misuse athlete identities, images, or personal information, and do not scrape or reuse protected content without permission.</p></div>
        <a href="mailto:ipr@khelgrid.com">IPR & AI enquiries <span>ipr@khelgrid.com</span></a>
      </section>
      <nav className="footer-index" aria-label="Sports network index">
        <div><h2>Sports Network Index</h2><p>Explore sports and pathways across KhelGrid.</p></div>
        <div className="footer-index-chips">
          <a href="/sports" onClick={event => navigate(event, '/sports')}>All Sports</a>
          <a href="/opportunities" onClick={event => navigate(event, '/opportunities')}>Trials & Opportunities</a>
          <a href="/venues" onClick={event => navigate(event, '/venues')}>Sports Venues</a>
          <a href="/calendar" onClick={event => navigate(event, '/calendar')}>Sports Calendar</a>
          <a href="/play" onClick={event => navigate(event, '/play')}>Pickup Games</a>
          <a href="/search" onClick={event => navigate(event, '/search')}>Search KhelGrid</a>
        </div>
      </nav>
      <div className="footer-care-note"><strong>Use information carefully</strong><span>Listings and availability depend on information published by their respective sources. Confirm details with the organiser before making plans.</span></div>
      <section className="footer-social" aria-labelledby="footer-social-title">
        <div className="footer-social-copy">
          <h2 id="footer-social-title">Follow KhelGrid</h2>
          <p>Join the conversation and keep up with sports opportunities and community updates.</p>
        </div>
        <div className="footer-social-links">
          <a href="https://www.reddit.com/r/Khelgridonline/" target="_blank" rel="noopener noreferrer" aria-label="KhelGrid on Reddit">
            <span className="footer-social-mark" aria-hidden="true">r/</span><span>Reddit</span><span aria-hidden="true">↗</span>
          </a>
          <a href="https://in.linkedin.com/in/khelgrid-dotcom-647b74418" target="_blank" rel="noopener noreferrer" aria-label="KhelGrid dotcom on LinkedIn">
            <span className="footer-social-mark" aria-hidden="true">in</span><span>LinkedIn</span><span aria-hidden="true">↗</span>
          </a>
          <a href="https://www.youtube.com/@Khelgrid" target="_blank" rel="noopener noreferrer" aria-label="KhelGrid on YouTube">
            <span className="footer-social-mark" aria-hidden="true">▶</span><span>YouTube</span><span aria-hidden="true">↗</span>
          </a>
          <a href="https://whatsapp.com/channel/0029VbDHTXY4dTnFvo8rKF1A" target="_blank" rel="noopener noreferrer" aria-label="KhelGrid on WhatsApp">
            <span className="footer-social-mark" aria-hidden="true">WA</span><span>WhatsApp</span><span aria-hidden="true">↗</span>
          </a>
          <a href="https://x.com/Khelgrid" target="_blank" rel="noopener noreferrer" aria-label="KhelGrid on X">
            <span className="footer-social-mark" aria-hidden="true">𝕏</span><span>X</span><span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>
      <nav className="footer-policy-links" aria-label="Company, policies and legal">
        <a href="/partner" onClick={event => navigate(event, '/partner')}>Partners</a>
        <a href="/about" onClick={event => navigate(event, '/about')}>About</a>
        <a href="/contact" onClick={event => navigate(event, '/contact')}>Contact</a>
        <a href="/privacy" onClick={event => navigate(event, '/privacy')}>Privacy</a>
        <a href="/terms" onClick={event => navigate(event, '/terms')}>Terms</a>
        <a href="/ipr-policy" onClick={event => navigate(event, '/ipr-policy')}><strong>IPR &amp; Copyright</strong></a>
        <a href="/cancellation-policy" onClick={event => navigate(event, '/cancellation-policy')}>Cancellation</a>
        <a href="/posh-policy" onClick={event => navigate(event, '/posh-policy')}>POSH Policy</a>
        <a href="/workplace-policy" onClick={event => navigate(event, '/workplace-policy')}>Workplace Policy</a>
        <a href="/editorial-policy" onClick={event => navigate(event, '/editorial-policy')}>Editorial</a>
        <a href="/verification-policy" onClick={event => navigate(event, '/verification-policy')}>Verification</a>
        <a href="/correction-policy" onClick={event => navigate(event, '/correction-policy')}>Corrections</a>
        <a href="https://www.khelgrid.com/sitemap.xml" target="_blank" rel="noopener noreferrer">Sitemap</a>
        <a
          href="#sports-pass"
          onClick={event => {
            event.preventDefault()
            setConsentInitialTab('sports_pass')
            setConsentModalOpen(true)
          }}
        >
          Sports Pass &amp; Interests
        </a>
        <a
          href="/cookies"
          onClick={event => {
            event.preventDefault()
            setConsentInitialTab('rules_privacy')
            setConsentModalOpen(true)
          }}
        >
          Privacy &amp; Cookie Settings
        </a>
      </nav>
      <div className="footer-legal">
        <p>Development build · live feeds and account services are not connected yet · Not a booking or live-score service</p>
        <p><span>{IPR_NOTICE_HEADING}</span><span>AI use</span><span>Copyright notice</span><span>© KhelGrid</span></p>
      </div>
    </footer>
    <Suspense fallback={null}>
      {intakeModalOpen && (
        <CommunityListingModal
          isOpen={intakeModalOpen}
          onClose={() => setIntakeModalOpen(false)}
          onNavigate={navigate}
          defaultCategory={intakeCategory}
        />
      )}
      {notificationsOpen && (
        <NotificationCenterDrawer
          isOpen={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
          onNavigate={navigate}
          onUnreadCountChange={setUnreadNotifCount}
        />
      )}
      {searchModalOpen && (
        <SpotlightSearchModal
          isOpen={searchModalOpen}
          onClose={() => setSearchModalOpen(false)}
          onNavigate={navigate}
          initialQuery={headerQuery}
        />
      )}
      {feedbackModalOpen && (
        <FeedbackSupportModal
          isOpen={feedbackModalOpen}
          onClose={() => setFeedbackModalOpen(false)}
        />
      )}
      <UserConsentModal
        forceOpen={consentModalOpen}
        initialTab={consentInitialTab}
        onClose={() => setConsentModalOpen(false)}
        onNavigate={navigate}
      />
      {goProModalOpen && (
        <GoProModal
          isOpen={goProModalOpen}
          onClose={() => setGoProModalOpen(false)}
          onNavigate={navigate}
        />
      )}
      {authModalOpen && (
        <AuthModal
          isOpen={authModalOpen}
          initialTab={authModalTab}
          initialError={authModalError}
          onClose={() => {
            setAuthModalOpen(false)
            setAuthModalError(undefined)
          }}
          onSuccess={user => {
            setAuthUser(user)
            setAuthModalError(undefined)
          }}
          onNavigate={navigate}
        />
      )}
    </Suspense>
  </div>
}
