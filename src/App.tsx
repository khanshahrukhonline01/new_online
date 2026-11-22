import { useEffect, useRef, useState, lazy, Suspense, type MouseEvent } from 'react'
import HomePage from './modules/home/HomePage'
import Sidebar from './shared/components/Sidebar'
import SportsBar from './shared/components/SportsBar'
import { resolveRoute } from './shared/routing'
import { SiteIcon } from './shared/components/SiteIcon'
import TopSportsComplexes from './shared/components/TopSportsComplexes'
import GameSportPlayAcrossIndia from './shared/components/GameSportPlayAcrossIndia'
import FrequentlyAskedQuestions from './shared/components/FrequentlyAskedQuestions'
import SiteAnnouncementBanner from './shared/components/SiteAnnouncementBanner'
import TopNavbar from './shared/components/TopNavbar'
import {
  getStoredAuthUser,
  onAuthChange,
  signOut,
  parseAuthUrlCallback,
  clearAuthUrlHash,
  type AuthUserProfile,
} from './integrations/supabase/auth-client'
import { TenantProvider } from './shared/context/TenantContext'
import { RequireTenantMember } from './shared/components/RequireTenantMember'
import { getRouteSeoMetadata, updatePageSeoMetadata } from './shared/utils/seoAndShare'

// Code-split route components via React.lazy()
const AboutPage = lazy(() => import('./modules/about/AboutPage'))
const TrustPage = lazy(() => import('./modules/trust/TrustPage'))
const HelpFeedbackPage = lazy(() => import('./modules/help/HelpFeedbackPage'))
const LacrosseSixesPage = lazy(() => import('./modules/games/LacrosseSixesPage'))
const MobileAppPage = lazy(() => import('./modules/mobile-app/MobileAppPage'))
const CareersPage = lazy(() => import('./modules/careers/CareersPage'))
const ReferralsPage = lazy(() => import('./modules/referrals/ReferralsPage'))
const PlayPage = lazy(() => import('./modules/play/PlayPage'))
const SportsCvWizard = lazy(() => import('./modules/sports-cv/SportsCvWizard'))
const OpportunitiesPage = lazy(() => import('./modules/opportunities/OpportunitiesPage'))
const VenuesPage = lazy(() => import('./modules/venues/VenuesPage'))
const VenueDetailPage = lazy(() => import('./modules/venues/VenueDetailPage'))
const TurfSlotCalendarPage = lazy(() => import('./modules/venues/TurfSlotCalendarPage'))
const AcademiesPage = lazy(() => import('./modules/academies/AcademiesPage'))
const AcademyDetailPage = lazy(() => import('./modules/academies/AcademyDetailPage'))
const AcademyHubPage = lazy(() => import('./modules/academies/AcademyHubPage'))
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
const UserDashboardPage = lazy(() => import('./modules/dashboard/UserDashboardPage'))
const ForYouPage = lazy(() => import('./modules/for-you/ForYouPage'))
const LearningHubPage = lazy(() => import('./modules/learning/LearningHubPage'))
const SportsCalendarPage = lazy(() => import('./modules/calendar/SportsCalendarPage'))
const SportsToolsPage = lazy(() => import('./modules/tools/SportsToolsPage'))
const PricingPage = lazy(() => import('./modules/pricing/PricingPage'))
const PartnerPage = lazy(() => import('./modules/partner/PartnerPage'))
const PartnerOnboardingPage = lazy(() => import('./modules/partner/PartnerOnboardingPage'))
const ParentPortalPage = lazy(() => import('./modules/parent/ParentPortalPage'))
const SavedPage = lazy(() => import('./modules/saved/SavedPage'))
const CoachesPage = lazy(() => import('./modules/coaches/CoachesPage'))
const CoachDashboardPage = lazy(() => import('./modules/coaches/CoachDashboardPage'))
const EventsPage = lazy(() => import('./modules/events/EventsPage'))
const TournamentOpsPage = lazy(() => import('./modules/events/TournamentOpsPage'))
const ScoutPortalPage = lazy(() => import('./modules/scouting/ScoutPortalPage'))
const AthleteVerificationPage = lazy(() => import('./modules/verification/AthleteVerificationPage'))
const GateCheckInPage = lazy(() => import('./modules/verification/GateCheckInPage').then(m => ({ default: m.GateCheckInPage })))
const MyPassesVaultPage = lazy(() => import('./modules/passes/MyPassesVaultPage').then(m => ({ default: m.MyPassesVaultPage })))
const OrganizationsWorkspacePage = lazy(() => import('./modules/organizations/OrganizationsWorkspacePage'))
const WorkspacePage = lazy(() => import('./modules/workspace/WorkspacePage'))
const CampaignMarketplacePage = lazy(() => import('./modules/campaigns/CampaignMarketplacePage').then(m => ({ default: m.CampaignMarketplacePage })))
const CampaignCreationPage = lazy(() => import('./modules/campaigns/CampaignCreationPage').then(m => ({ default: m.CampaignCreationPage })))
const AdvertiserCampaignManagePage = lazy(() => import('./modules/campaigns/AdvertiserCampaignManagePage').then(m => ({ default: m.AdvertiserCampaignManagePage })))
const CreatorHubPage = lazy(() => import('./modules/campaigns/CreatorHubPage').then(m => ({ default: m.CreatorHubPage })))

// Code-split heavyweight modal dialogs
const NotificationCenterDrawer = lazy(() => import('./shared/components/NotificationCenterDrawer'))
const SpotlightSearchModal = lazy(() => import('./shared/components/SpotlightSearchModal'))
const FeedbackSupportModal = lazy(() => import('./shared/components/FeedbackSupportModal'))
const UserConsentModal = lazy(() => import('./shared/components/UserConsentModal'))
const GoProModal = lazy(() => import('./shared/components/GoProModal'))
import type { AuthModalTab } from './shared/components/AuthModal'
const AuthModal = lazy(() => import('./shared/components/AuthModal'))
import CustomCursor from './components/effects/CustomCursor'

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
  const [path, setPath] = useState('/')
  const [menuOpen, setMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [headerQuery, setHeaderQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [unreadNotifCount, setUnreadNotifCount] = useState(0)
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [consentModalOpen, setConsentModalOpen] = useState(false)
  const [consentInitialTab, setConsentInitialTab] = useState<'sports_pass' | 'rules_privacy'>('sports_pass')
  const [goProModalOpen, setGoProModalOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalTab, setAuthModalTab] = useState<AuthModalTab>('login')
  const [authModalError, setAuthModalError] = useState<string | undefined>(undefined)
  const [authUser, setAuthUser] = useState<AuthUserProfile | null>(() => getStoredAuthUser())
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const menuToggleRef = useRef<HTMLButtonElement>(null)

  function openListingSubmission(category?: string) {
    const target = category ? `/submit-listing?type=${encodeURIComponent(category)}` : '/submit-listing'
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', target)
      window.scrollTo({ top: 0, behavior: 'auto' })
    }
    setPath('/submit-listing')
    setMenuOpen(false)
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
      setAuthModalTab('set_new_password')
      setAuthModalError('')
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
    const initialP = currentPath()
    setPath(initialP)
    if (initialP === '/partner-signup' || initialP === '/partner-login' || initialP === '/academy/signup') {
      setAuthModalTab('partner')
      setAuthModalOpen(true)
    }
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

  function navigate(event?: MouseEvent<HTMLAnchorElement>, target?: string) {
    if (!target) return
    if (event) {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || (typeof event.button === 'number' && event.button !== 0)) return
      event.preventDefault()
    }
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
    if (nextPath === '/partner-signup' || nextPath === '/partner-login' || nextPath === '/academy/signup') {
      setAuthModalTab('partner')
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
    case 'opportunities-index': page = <OpportunitiesPage onOpenIntake={() => openListingSubmission('opportunity')} onNavigate={navigate} />; break
    case 'opportunity-detail': page = match.isApply ? <OpportunitiesPage onOpenIntake={() => openListingSubmission('opportunity')} onNavigate={navigate} initialApplySlug={match.slug} /> : <CatalogueDetailPage kind="opportunity" slug={match.slug} />; break
    case 'academies-index': page = <AcademiesPage onOpenIntake={() => openListingSubmission('academy')} onNavigate={navigate} />; break
    case 'academy-detail': page = <AcademyDetailPage slug={match.slug} onNavigate={navigate} onOpenIntake={() => openListingSubmission('academy')} initialEnrolOpen={match.isEnrol} />; break
    case 'venues-index': page = <VenuesPage onOpenIntake={() => openListingSubmission('venue')} onNavigate={navigate} />; break
    case 'cities-index': page = <CitiesPage onNavigate={navigate} />; break
    case 'city-detail': page = <CityDetailPage citySlug={match.slug} onNavigate={navigate} onOpenIntake={openListingSubmission} />; break
    case 'venue-detail': page = <VenueDetailPage slug={match.slug} onNavigate={navigate} onOpenIntake={openListingSubmission} initialBookingOpen={match.isBooking} />; break
    case 'search': page = <SearchPage initialQuery={searchQuery} />; break
    case 'tools-index': page = <SportsToolsPage onNavigate={navigate} initialToolSlug={match.toolSlug} />; break
    case 'khelchronicle-index': page = <KhelChronicleHome onNavigate={navigate} />; break
    case 'khelchronicle-submit': page = <KhelChronicleSubmitPage onNavigate={navigate} />; break
    case 'khelchronicle-category': page = <KhelChronicleCategoryPage categorySlug={match.category} onNavigate={navigate} />; break
    case 'khelchronicle-author': page = <KhelChronicleAuthorPage authorSlug={match.author} onNavigate={navigate} />; break
    case 'khelchronicle-paper': page = <KhelChroniclePaperPage slug={match.slug} onNavigate={navigate} />; break
    case 'feature':
      if (match.canonicalPath === '/workspace') {
        page = (
          <WorkspacePage
            authUser={authUser}
            onOpenAuth={(tab: 'login' | 'signup') => {
              setAuthModalTab(tab)
              setAuthModalOpen(true)
            }}
            onNavigate={navigate}
          />
        )
      } else if (match.canonicalPath === '/dashboard') {
        page = (
          <UserDashboardPage
            onNavigate={navigate}
            onOpenIntake={openListingSubmission}
            onOpenAuth={tab => {
              setAuthModalTab(tab || 'login')
              setAuthModalOpen(true)
            }}
          />
        )
      } else if (match.canonicalPath === '/profile' || match.canonicalPath === '/my-profile') {
        if (authUser) {
          const handle = (authUser.fullName || 'athlete').toLowerCase().replace(/\s+/g, '-')
          page = <AthleteProfilePage username={handle} onNavigate={navigate} />
        } else {
          page = (
            <UserDashboardPage
              onNavigate={navigate}
              onOpenIntake={openListingSubmission}
              onOpenAuth={tab => {
                setAuthModalTab(tab || 'login')
                setAuthModalOpen(true)
              }}
            />
          )
        }
      } else if (match.canonicalPath === '/host' || match.canonicalPath === '/partner-dashboard') {
        page = <HostDashboardPage onNavigate={navigate} onOpenIntake={openListingSubmission} />
      }
      else if (match.canonicalPath === '/about') page = <AboutPage onNavigate={navigate} />
      else if (match.canonicalPath === '/trust') page = <TrustPage onNavigate={navigate} />
      else if (match.canonicalPath === '/help-feedback' || match.canonicalPath === '/contact' || match.canonicalPath === '/help' || match.canonicalPath === '/support') page = <HelpFeedbackPage />
      else if (match.canonicalPath === '/sports-cv' || match.canonicalPath === '/start-from-zero') page = <SportsCvWizard />
      else if (match.canonicalPath === '/talent-scanner') page = <TalentScannerPage onNavigate={navigate} onOpenAuth={tab => { setAuthModalTab(tab || 'signup'); setAuthModalOpen(true) }} />
      else if (match.canonicalPath === '/play/lacrosse-sixes') page = <LacrosseSixesPage />
      else if (match.canonicalPath === '/play' || match.canonicalPath === '/community') page = <PlayPage onNavigate={navigate} onOpenIntake={() => openListingSubmission('pickup_game')} />
      else if (match.canonicalPath === '/coaches') page = <CoachesPage onNavigate={navigate} onOpenCoachIntake={() => openListingSubmission('coach')} />
      else if (match.canonicalPath === '/events' || match.canonicalPath === '/tournaments') page = <EventsPage onNavigate={navigate} />
      else if (match.canonicalPath === '/scout-portal') page = <ScoutPortalPage onNavigate={navigate} />
      else if (match.canonicalPath === '/verification') page = <AthleteVerificationPage onNavigate={navigate} />
      else if (match.canonicalPath === '/calendar') page = <SportsCalendarPage onNavigate={navigate} />
      else if (match.canonicalPath === '/tools' || match.canonicalPath === '/sports-tools' || match.canonicalPath === '/stats' || match.canonicalPath.startsWith('/tools/')) page = <SportsToolsPage onNavigate={navigate} initialToolSlug={match.canonicalPath === '/stats' ? 'athlete-benchmarks' : match.canonicalPath.startsWith('/tools/') ? match.canonicalPath.slice('/tools/'.length) : undefined} />
      else if (match.canonicalPath === '/live' || match.canonicalPath === '/live-scores') page = <LiveScoresPage onNavigate={navigate} />
      else if (match.canonicalPath === '/submit-listing' || match.canonicalPath === '/list') page = <ListingSubmissionPage />
      else if (match.canonicalPath === '/submit-listing/email' || match.canonicalPath === '/list/email') page = <ListingSubmissionPage defaultTab="email" />
      else if (match.canonicalPath === '/track-submission' || match.canonicalPath === '/track') page = <ListingSubmissionPage defaultTab="track" />
      else if (match.canonicalPath === '/learning' || match.canonicalPath === '/learning-hub' || match.canonicalPath === '/guides' || match.canonicalPath === '/ai-guide') page = <LearningHubPage onNavigate={navigate} />
      else if (match.canonicalPath === '/mobile-app') page = <MobileAppPage onNavigate={navigate} />
      else if (match.canonicalPath === '/careers') page = <CareersPage onNavigate={navigate} />
      else if (match.canonicalPath === '/referrals') page = <ReferralsPage onNavigate={navigate} />
      else if (match.canonicalPath === '/book') page = <VenuesPage onOpenIntake={() => openListingSubmission('venue')} onNavigate={navigate} />
      else if (match.canonicalPath === '/train') page = <AcademiesPage onOpenIntake={() => openListingSubmission('academy')} onNavigate={navigate} />
      else if (match.canonicalPath === '/organizations' || match.canonicalPath === '/workspaces') page = <OrganizationsWorkspacePage onNavigate={navigate} />
      else if (match.canonicalPath === '/partner-signup' || match.canonicalPath === '/partner/signup' || match.canonicalPath === '/partner/login') page = <PartnerOnboardingPage onNavigate={navigate} />
      else if (match.canonicalPath === '/academy-hub' || match.canonicalPath === '/academies/manage') page = (
        <TenantProvider>
          <RequireTenantMember onNavigate={navigate}>
            <AcademyHubPage onNavigate={navigate} />
          </RequireTenantMember>
        </TenantProvider>
      )
      else if (match.canonicalPath === '/coach-dashboard' || match.canonicalPath === '/coach/hub' || match.canonicalPath === '/coach/manage') page = <CoachDashboardPage onNavigate={navigate} />
      else if (match.canonicalPath === '/turf-calendar' || match.canonicalPath === '/venues/manage' || match.canonicalPath === '/turf') page = <TurfSlotCalendarPage onNavigate={navigate} />
      else if (match.canonicalPath === '/tournament-ops' || match.canonicalPath === '/tournaments/manage' || match.canonicalPath === '/tournament-management') page = <TournamentOpsPage onNavigate={navigate} />
      else if (match.canonicalPath === '/parent-portal' || match.canonicalPath === '/parent' || match.canonicalPath === '/passbook') page = <ParentPortalPage onNavigate={navigate} />
      else if (match.canonicalPath === '/verify-pass' || match.canonicalPath === '/gate-checkin') page = <GateCheckInPage onNavigate={navigate} />
      else if (match.canonicalPath === '/my-passes' || match.canonicalPath === '/passes') page = <MyPassesVaultPage onNavigate={navigate} />
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
      else if (match.canonicalPath === '/campaigns') page = <CampaignMarketplacePage onNavigate={navigate} />
      else if (match.canonicalPath === '/campaigns/create') page = <CampaignCreationPage onNavigate={navigate} />
      else if (match.canonicalPath === '/campaigns/manage') page = <AdvertiserCampaignManagePage onNavigate={navigate} />
      else if (match.canonicalPath === '/creator' || match.canonicalPath === '/creator-hub') page = <CreatorHubPage onNavigate={navigate} />
      else if (match.canonicalPath === '/for-you') page = <ForYouPage onNavigate={navigate} onOpenAuth={tab => { setAuthModalTab(tab || 'signup'); setAuthModalOpen(true) }} />
      else if (match.canonicalPath === '/partner' || match.canonicalPath === '/partners') page = <PartnerPage onNavigate={navigate} onOpenIntake={openListingSubmission} />
      else if (['/privacy','/terms','/cookies','/ipr-policy','/cancellation-policy','/posh-policy','/editorial-policy','/verification-policy','/correction-policy','/workplace-policy','/open-science-policy'].includes(match.canonicalPath)) page = <PolicyPage path={match.canonicalPath} onNavigate={navigate} />
      else page = <FeatureComingSoonPage title={match.slug} path={match.canonicalPath} />
      break
    default:
      page = <section className="content-page"><p className="eyebrow">PAGE NOT AVAILABLE</p><h1>This page isn’t here yet.</h1><p className="page-intro">This route has not been implemented. Return to a published section to continue exploring.</p><a className="primary-link" href="/" onClick={event => navigate(event, '/')}>Back home <SiteIcon name="arrow-up-right" size={16} /></a></section>
  }

  return <div className={`app-shell foundation-v1 ${sidebarCollapsed ? 'sidebar-is-collapsed' : 'sidebar-is-expanded'}`}>
    <CustomCursor />
    <a className="skip-link" href="#main-content">Skip to content</a>
    <TopNavbar
      path={path}
      isMobile={isMobile}
      menuOpen={menuOpen}
      sidebarCollapsed={sidebarCollapsed}
      menuToggleRef={menuToggleRef}
      onToggleMainMenu={toggleMainMenu}
      onNavigate={navigate}
      onOpenSearch={() => setSearchModalOpen(true)}
      onOpenNotifications={() => setNotificationsOpen(true)}
      onOpenFeedback={() => setFeedbackModalOpen(true)}
      authUser={authUser}
      userMenuOpen={userMenuOpen}
      onToggleUserMenu={() => setUserMenuOpen(open => !open)}
      onCloseUserMenu={() => setUserMenuOpen(false)}
      onOpenLogin={() => {
        setAuthModalTab('login')
        setAuthModalOpen(true)
      }}
      onOpenSignup={() => {
        setAuthModalTab('signup')
        setAuthModalOpen(true)
      }}
      onSignOut={() => {
        void signOut()
      }}
      onOpenGoPro={() => setGoProModalOpen(true)}
    />
    <div className="app-workspace">
      <Sidebar
        activePath={path}
        onNavigate={navigate}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        toggleRef={menuToggleRef}
        collapsed={sidebarCollapsed}
        onOpenIntake={() => openListingSubmission('pickup_game')}
        onOpenAuth={tab => {
          setAuthModalTab(tab || 'login')
          setAuthModalOpen(true)
        }}
        isLoggedIn={Boolean(authUser)}
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
          <a className="footer-brand" href="/" onClick={event => navigate(event, '/')} aria-label="KhelGrid home"><img className="footer-brand-logo" src="/assets/kg-logo.webp" alt="KhelGrid Platform Logo" width="118" height="38" loading="lazy" decoding="async" /></a>
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
          <a href="/turf-calendar" onClick={event => navigate(event, '/turf-calendar')}>Turf Calendar <small style={{ color: '#10b981', fontWeight: 700 }}>Free</small></a>
          <a href="/parent-portal" onClick={event => navigate(event, '/parent-portal')}>Parent Passbook <small style={{ color: '#10b981', fontWeight: 700 }}>Free</small></a>
          <a href="/coaches" onClick={event => navigate(event, '/coaches')}>Coaches</a>
          <a href="/academies" onClick={event => navigate(event, '/academies')}>Academies</a>
          <a href="/academy-hub" onClick={event => navigate(event, '/academy-hub')}>Academy Hub <small style={{ color: '#10b981', fontWeight: 700 }}>Free</small></a>
          <a href="/coach-dashboard" onClick={event => navigate(event, '/coach-dashboard')}>Coach Hub <small style={{ color: '#10b981', fontWeight: 700 }}>Free</small></a>
          <a href="/tournament-ops" onClick={event => navigate(event, '/tournament-ops')}>Tournament Ops <small style={{ color: '#10b981', fontWeight: 700 }}>Free</small></a>
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
          <a href="/partner-signup" onClick={event => navigate(event, '/partner-signup')} style={{ color: '#059669', fontWeight: 700 }}>⚡ Fast Partner Setup (30s)</a>
          <a href="/partner" onClick={event => navigate(event, '/partner')}><strong>Partner with KhelGrid</strong></a>
          <a href="/tournament-ops" onClick={event => navigate(event, '/tournament-ops')}>Host a Tournament</a>
          <a href="/submit-listing?type=venue" onClick={e => { e.preventDefault(); openListingSubmission('venue') }}>List your venue</a>
          <a href="/submit-listing?type=opportunity" onClick={e => { e.preventDefault(); openListingSubmission('opportunity') }}>Submit a trial</a>
          <a href="/submit-listing?type=coach" onClick={event => navigate(event, '/submit-listing?type=coach')}>Join as Coach</a>
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
        <a href="/open-science-policy" onClick={event => navigate(event, '/open-science-policy')}>Open Science</a>
        <a href="/khelchronicle" onClick={event => navigate(event, '/khelchronicle')}>KhelChronicle</a>
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
        <p>Independent grassroots sports network · live feeds and account services are not connected yet · Not a booking or live-score service</p>
        <p><span>{IPR_NOTICE_HEADING}</span><span>AI use</span><span>Copyright notice</span><span>© KhelGrid</span></p>
      </div>
    </footer>
    <Suspense fallback={null}>
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
            // Intelligent 3-Tier Redirection based on registered user role
            if (user.role === 'academy') {
              navigate(undefined, '/academy-hub')
            } else if (user.role === 'host' || user.role === 'venue_owner') {
              navigate(undefined, '/host')
            } else if (user.role === 'athlete' || user.role === 'parent') {
              navigate(undefined, '/dashboard')
            }
          }}
          onNavigate={navigate}
        />
      )}
    </Suspense>
  </div>
}
