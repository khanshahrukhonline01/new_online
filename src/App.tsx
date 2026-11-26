import { useEffect, useRef, useState, lazy, Suspense, type MouseEvent } from 'react'
import HomePage from './modules/home/HomePage'
import Sidebar from './shared/components/Sidebar'
import SportsBar from './shared/components/SportsBar'
import { resolveRoute, isOperationalRoutePath } from './shared/routing'
import { SiteIcon } from './shared/components/SiteIcon'
import TopSportsComplexes from './shared/components/TopSportsComplexes'
import GameSportPlayAcrossIndia from './shared/components/GameSportPlayAcrossIndia'
import FrequentlyAskedQuestions from './shared/components/FrequentlyAskedQuestions'
import SiteAnnouncementBanner from './shared/components/SiteAnnouncementBanner'
import WorkspaceHeader from './shared/components/WorkspaceHeader'
import type { CanonicalWorkspaceId } from './shared/components/workspaceHeaderEngine'
import { AuthProvider } from './shared/auth/AuthContext'
import { useAuth } from './shared/auth/useAuth'
import { TenantProvider } from './shared/context/TenantContext'
import { RequireTenantMember } from './shared/components/RequireTenantMember'
import { RegulatoryWorkspaceGuard } from './shared/components/RegulatoryWorkspaceGuard'
import { getRouteSeoMetadata, updatePageSeoMetadata } from './shared/utils/seoAndShare'
import { normalizePartnerRole } from './modules/partner/partnerOnboardingService'
import type { DemoDashboardId } from './modules/demo/tenantDemoData'
import WorkspacePage from './modules/workspace/WorkspacePage'

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
const PartnerEmailVerificationPage = lazy(() => import('./modules/partner/PartnerEmailVerificationPage'))
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
const WorkspaceShell = lazy(() => import('./modules/workspace/WorkspaceShell'))
const CampaignMarketplacePage = lazy(() => import('./modules/campaigns/CampaignMarketplacePage').then(m => ({ default: m.CampaignMarketplacePage })))
const CampaignCreationPage = lazy(() => import('./modules/campaigns/CampaignCreationPage').then(m => ({ default: m.CampaignCreationPage })))
const AdvertiserCampaignManagePage = lazy(() => import('./modules/campaigns/AdvertiserCampaignManagePage').then(m => ({ default: m.AdvertiserCampaignManagePage })))
const CreatorHubPage = lazy(() => import('./modules/campaigns/CreatorHubPage').then(m => ({ default: m.CreatorHubPage })))
const TenantDemoShowcasePage = lazy(() => import('./modules/demo/TenantDemoShowcasePage'))
const AdminPreviewPortal = lazy(() => import('./modules/admin/AdminPreviewPortal'))

// Code-split heavyweight modal dialogs
const NotificationCenterDrawer = lazy(() => import('./shared/components/NotificationCenterDrawer'))
const SpotlightSearchModal = lazy(() => import('./shared/components/SpotlightSearchModal'))
const FeedbackSupportModal = lazy(() => import('./shared/components/FeedbackSupportModal'))
const UserConsentModal = lazy(() => import('./shared/components/UserConsentModal'))
const GoProModal = lazy(() => import('./shared/components/GoProModal'))
import { resolvePostAuthTarget } from './shared/components/auth/authModalTypes'
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

export default function App({ initialPath = '/' }: { initialPath?: string } = {}) {
  return (
    <AuthProvider>
      <AppInner initialPath={initialPath} />
    </AuthProvider>
  )
}

function AppInner({ initialPath = '/' }: { initialPath?: string }) {
  const {
    user: authUser,
    modalOpen: authModalOpen,
    intent: authIntent,
    openAuth,
    closeAuth,
    setAuthenticatedUser: setAuthUser,
    signOut,
  } = useAuth()
  const [path, setPath] = useState(initialPath)
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
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [activeHeaderPersona, setActiveHeaderPersona] = useState<CanonicalWorkspaceId | null>(null)
  const [locationSearch, setLocationSearch] = useState(() =>
    typeof window !== 'undefined' ? window.location.search : '',
  )
  const menuToggleRef = useRef<HTMLButtonElement>(null)

  function openListingSubmission(category?: string) {
    const nextSearch = category ? `?type=${encodeURIComponent(category)}` : ''
    const target = `/submit-listing${nextSearch}`
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', target)
      window.scrollTo({ top: 0, behavior: 'auto' })
    }
    setPath('/submit-listing')
    setLocationSearch(nextSearch)
    setMenuOpen(false)
  }

  useEffect(() => {
    setUserMenuOpen(false)
  }, [path])

  const isAdminPreviewRoute =
    path === '/admin' || path === '/admin-panel' || path.startsWith('/admin/')

  useEffect(() => {
    function handleGlobalKeyDown(event: globalThis.KeyboardEvent) {
      if (isAdminPreviewRoute) return
      if ((event.metaKey || event.ctrlKey) && (event.key === 'k' || event.key === 'K')) {
        event.preventDefault()
        setSearchModalOpen(open => !open)
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [isAdminPreviewRoute])

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
    setHeaderQuery(new URLSearchParams(window.location.search).get('q') ?? '')
    setSearchQuery(new URLSearchParams(window.location.search).get('q') ?? '')
    const handlePopState = () => {
      setPath(currentPath())
      setLocationSearch(window.location.search)
      setHeaderQuery(new URLSearchParams(window.location.search).get('q') ?? '')
      setSearchQuery(new URLSearchParams(window.location.search).get('q') ?? '')
      setMenuOpen(false)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (path === '/login') {
      openAuth({ tab: 'login' })
    } else if (path === '/signup') {
      openAuth({ tab: 'signup' })
    } else if (path === '/forgot-password') {
      openAuth({ tab: 'forgot_password' })
    }
  }, [path, openAuth])

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

  function navigate(event?: MouseEvent<HTMLAnchorElement>, target?: string, opts?: { preserveScroll?: boolean; replace?: boolean }) {
    if (!target) return
    if (event) {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || (typeof event.button === 'number' && event.button !== 0)) return
      event.preventDefault()
    }
    const [rawPath, rawQuery = ''] = target.split('?')
    const nextPath = rawPath.replace(/\/$/, '') || '/'
    const nextSearch = rawQuery ? `?${rawQuery}` : ''
    const isSameBaseRoute = nextPath === path
    const isWorkspaceSectionSwitch =
      path.startsWith('/workspace/') &&
      nextPath.startsWith('/workspace/') &&
      path.split('/')[2] === nextPath.split('/')[2]

    if (typeof window !== 'undefined') {
      const currentFull = window.location.pathname + window.location.search
      if (target !== currentFull) {
        if (opts?.replace) {
          window.history.replaceState({}, '', target)
        } else {
          window.history.pushState({}, '', target)
        }
      }
      if (!opts?.preserveScroll && !isSameBaseRoute && !isWorkspaceSectionSwitch) {
        window.scrollTo({ top: 0, behavior: 'auto' })
      }
    }
    if (nextPath === '/login') {
      openAuth({ tab: 'login', redirectTo: path !== '/login' && path !== '/signup' ? `${path}${locationSearch}` : undefined })
      return
    }
    if (nextPath === '/signup') {
      openAuth({ tab: 'signup', redirectTo: path !== '/login' && path !== '/signup' ? `${path}${locationSearch}` : undefined })
      return
    }
    if (nextPath === '/forgot-password') {
      openAuth({ tab: 'forgot_password' })
      return
    }
    setPath(nextPath)
    setLocationSearch(nextSearch)
    if (nextPath === '/search') { const nextQuery = new URLSearchParams(rawQuery).get('q') ?? ''; setSearchQuery(nextQuery); setHeaderQuery(nextQuery) }
    const wasMenuOpen = menuOpen
    setMenuOpen(false)
    if (wasMenuOpen) {
      menuToggleRef.current?.focus()
    }
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
    case 'workspace-shell':
      page = (
        <WorkspaceShell
          persona={match.persona}
          section={match.section}
          authUser={authUser}
          onOpenAuth={openAuth}
          onNavigate={navigate}
        />
      )
      break
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
            onOpenAuth={openAuth}
            onNavigate={navigate}
          />
        )
      } else if (match.canonicalPath === '/dashboard') {
        page = (
          <RegulatoryWorkspaceGuard persona="athlete" onNavigate={navigate}>
            <UserDashboardPage
              onNavigate={navigate}
              onOpenIntake={openListingSubmission}
              onOpenAuth={openAuth}
            />
          </RegulatoryWorkspaceGuard>
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
              onOpenAuth={openAuth}
            />
          )
        }
      } else if (match.canonicalPath === '/host' || match.canonicalPath === '/partner-dashboard') {
        page = (
          <RegulatoryWorkspaceGuard persona="host" onNavigate={navigate}>
            <HostDashboardPage onNavigate={navigate} onOpenIntake={openListingSubmission} />
          </RegulatoryWorkspaceGuard>
        )
      }
      else if (match.canonicalPath === '/about') page = <AboutPage onNavigate={navigate} />
      else if (match.canonicalPath === '/trust') page = <TrustPage onNavigate={navigate} />
      else if (match.canonicalPath === '/help-feedback' || match.canonicalPath === '/contact' || match.canonicalPath === '/help' || match.canonicalPath === '/support') page = <HelpFeedbackPage />
      else if (match.canonicalPath === '/sports-cv' || match.canonicalPath === '/start-from-zero') page = <SportsCvWizard />
      else if (match.canonicalPath === '/talent-scanner') page = <TalentScannerPage onNavigate={navigate} onOpenAuth={openAuth} />
      else if (match.canonicalPath === '/play/lacrosse-sixes') page = <LacrosseSixesPage />
      else if (match.canonicalPath === '/play' || match.canonicalPath === '/community') page = <PlayPage onNavigate={navigate} onOpenIntake={() => openListingSubmission('pickup_game')} />
      else if (match.canonicalPath === '/coaches') page = <CoachesPage onNavigate={navigate} onOpenCoachIntake={() => openListingSubmission('coach')} />
      else if (match.canonicalPath === '/events' || match.canonicalPath === '/tournaments') page = <EventsPage onNavigate={navigate} />
      else if (match.canonicalPath === '/scout-portal') page = <ScoutPortalPage onNavigate={navigate} />
      else if (match.canonicalPath === '/verification') page = <AthleteVerificationPage onNavigate={navigate} />
      else if (match.canonicalPath === '/calendar') page = <SportsCalendarPage onNavigate={navigate} />
      else if (match.canonicalPath === '/tools' || match.canonicalPath === '/sports-tools' || match.canonicalPath === '/stats' || match.canonicalPath.startsWith('/tools/')) page = <SportsToolsPage onNavigate={navigate} initialToolSlug={match.canonicalPath === '/stats' ? 'athlete-benchmarks' : match.canonicalPath.startsWith('/tools/') ? match.canonicalPath.slice('/tools/'.length) : undefined} />
      else if (match.canonicalPath === '/live' || match.canonicalPath === '/live-scores') page = <LiveScoresPage onNavigate={navigate} />
      else if (match.canonicalPath === '/submit-listing' || match.canonicalPath === '/list') page = <ListingSubmissionPage key={`submit:${locationSearch}`} />
      else if (match.canonicalPath === '/submit-listing/email' || match.canonicalPath === '/list/email') page = <ListingSubmissionPage key={`email:${locationSearch}`} defaultTab="email" />
      else if (match.canonicalPath === '/track-submission' || match.canonicalPath === '/track') page = <ListingSubmissionPage key={`track:${locationSearch}`} defaultTab="track" />
      else if (match.canonicalPath === '/learning' || match.canonicalPath === '/learning-hub' || match.canonicalPath === '/guides' || match.canonicalPath === '/ai-guide') page = <LearningHubPage onNavigate={navigate} />
      else if (match.canonicalPath === '/mobile-app') page = <MobileAppPage onNavigate={navigate} />
      else if (match.canonicalPath === '/careers') page = <CareersPage onNavigate={navigate} />
      else if (match.canonicalPath === '/referrals') page = <ReferralsPage onNavigate={navigate} />
      else if (match.canonicalPath === '/book') page = <VenuesPage onOpenIntake={() => openListingSubmission('venue')} onNavigate={navigate} />
      else if (match.canonicalPath === '/train') page = <AcademiesPage onOpenIntake={() => openListingSubmission('academy')} onNavigate={navigate} />
      else if (match.canonicalPath === '/organizations' || match.canonicalPath === '/workspaces') page = (
        <RegulatoryWorkspaceGuard persona="organization" onNavigate={navigate}>
          <OrganizationsWorkspacePage onNavigate={navigate} />
        </RegulatoryWorkspaceGuard>
      )
      else if (match.canonicalPath === '/login' || match.canonicalPath === '/signup' || match.canonicalPath === '/forgot-password') {
        page = (
          <WorkspacePage
            authUser={authUser}
            onOpenAuth={openAuth}
            onNavigate={navigate}
          />
        )
      }
      else if (match.canonicalPath === '/partner/verify') page = <PartnerEmailVerificationPage />
      else if (match.canonicalPath === '/partner-signup' || match.canonicalPath === '/partner-login' || match.canonicalPath === '/partner/signup' || match.canonicalPath === '/partner/login') {
        const searchParams = new URLSearchParams(locationSearch)
        const modeParam = searchParams.get('mode') === 'login' || path === '/partner-login' || path === '/partner/login' ? 'login' : 'signup'
        const roleParam = normalizePartnerRole(searchParams.get('role'))
        page = (
          <PartnerOnboardingPage
            key={`${path}:${locationSearch}`}
            onNavigate={navigate}
            initialMode={modeParam}
            initialRole={roleParam}
            onAuthSuccess={user => setAuthUser(user)}
          />
        )
      }
      else if (match.canonicalPath === '/academy-hub' || match.canonicalPath === '/academies/manage') page = (
        <RegulatoryWorkspaceGuard persona="academy" onNavigate={navigate}>
          <RequireTenantMember
            personaLabel="Academy"
            onboardingRole="academy"
            requiredTenantTypes={['academy', 'club', 'school', 'college', 'university', 'training_org']}
            allowedRoles={[
              'owner',
              'org_admin',
              'director',
              'admin',
              'manager',
              'admissions_manager',
              'front_desk',
              'head_coach',
              'coach',
              'finance_manager',
              'accountant',
              'content_manager',
              'listing_manager',
              'verification_coordinator',
              'staff',
              'readonly_member',
            ]}
            onNavigate={navigate}
          >
            <AcademyHubPage currentPath={path} onNavigate={navigate} />
          </RequireTenantMember>
        </RegulatoryWorkspaceGuard>
      )
      else if (match.canonicalPath === '/coach-dashboard' || match.canonicalPath === '/coach/hub' || match.canonicalPath === '/coach/manage') page = (
        <RegulatoryWorkspaceGuard persona="coach" onNavigate={navigate}>
          <RequireTenantMember
            personaLabel="Coach"
            onboardingRole="coach"
            requiredTenantTypes={['coach', 'academy']}
            allowedRoles={['owner', 'org_admin', 'director', 'admin', 'manager', 'head_coach', 'coach']}
            onNavigate={navigate}
          >
            <CoachDashboardPage currentPath={path} onNavigate={navigate} />
          </RequireTenantMember>
        </RegulatoryWorkspaceGuard>
      )
      else if (match.canonicalPath === '/turf-calendar' || match.canonicalPath === '/venues/manage' || match.canonicalPath === '/turf') page = (
        <RegulatoryWorkspaceGuard persona="turf" onNavigate={navigate}>
          <TurfSlotCalendarPage onNavigate={navigate} />
        </RegulatoryWorkspaceGuard>
      )
      else if (match.canonicalPath === '/tournament-ops' || match.canonicalPath === '/tournaments/manage' || match.canonicalPath === '/tournament-management') page = (
        <RegulatoryWorkspaceGuard persona="tournament" onNavigate={navigate}>
          <TournamentOpsPage onNavigate={navigate} />
        </RegulatoryWorkspaceGuard>
      )
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
          <div className="app-notif-actions">
            <button
              type="button"
              className="primary-link app-notif-trigger-btn"
              onClick={() => setNotificationsOpen(true)}
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
      else if (match.canonicalPath === '/creator' || match.canonicalPath === '/creator-hub') page = (
        <RegulatoryWorkspaceGuard persona="creator" onNavigate={navigate}>
          <CreatorHubPage onNavigate={navigate} />
        </RegulatoryWorkspaceGuard>
      )
      else if (match.canonicalPath === '/for-you') page = <ForYouPage onNavigate={navigate} onOpenAuth={openAuth} />
      else if (match.canonicalPath === '/demo' || match.canonicalPath === '/preview' || match.canonicalPath === '/partner/preview') {
        const personaParam = (new URLSearchParams(locationSearch).get('persona') || 'academy') as DemoDashboardId
        page = (
          <TenantDemoShowcasePage
            initialDashboard={personaParam}
            onNavigate={navigate}
            onOpenAuth={openAuth}
          />
        )
      }
      else if (match.canonicalPath === '/partner' || match.canonicalPath === '/partners') page = <PartnerPage onNavigate={navigate} onOpenIntake={openListingSubmission} />
      else if (['/privacy','/terms','/cookies','/ipr-policy','/cancellation-policy','/posh-policy','/editorial-policy','/verification-policy','/correction-policy','/workplace-policy','/open-science-policy'].includes(match.canonicalPath)) page = <PolicyPage path={match.canonicalPath} onNavigate={navigate} />
      else page = <FeatureComingSoonPage title={match.slug} path={match.canonicalPath} />
      break
    default:
      page = <section className="content-page"><p className="eyebrow">PAGE NOT AVAILABLE</p><h1>This page isn’t here yet.</h1><p className="page-intro">This route has not been implemented. Return to a published section to continue exploring.</p><a className="primary-link" href="/" onClick={event => navigate(event, '/')}>Back home <SiteIcon name="arrow-up-right" size={16} /></a></section>
  }

  if (isAdminPreviewRoute) {
    return (
      <Suspense fallback={<PageFallbackLoader />}>
        <AdminPreviewPortal onNavigate={navigate} />
      </Suspense>
    )
  }

  const isOperational = isOperationalRoutePath(path)
  const activeTenantSlug = new URLSearchParams(locationSearch).get('tenant') || undefined

  return <TenantProvider activeTenantSlug={activeTenantSlug}>
    <div className={`app-shell foundation-v1 ${sidebarCollapsed ? 'sidebar-is-collapsed' : 'sidebar-is-expanded'}${isOperational ? ' is-operational-route' : ''}`}>
    {!isOperational && <CustomCursor />}
    <a className="skip-link" href="#main-content">Skip to content</a>
    <WorkspaceHeader
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
      onOpenLogin={() =>
        openAuth({
          tab: 'login',
          redirectTo: path !== '/login' && path !== '/signup' ? `${path}${locationSearch}` : undefined,
        })
      }
      onOpenSignup={() =>
        openAuth({
          tab: 'signup',
          redirectTo: path !== '/login' && path !== '/signup' ? `${path}${locationSearch}` : undefined,
        })
      }
      onSignOut={() => {
        setActiveHeaderPersona(null)
        void signOut()
      }}
      onOpenGoPro={() => setGoProModalOpen(true)}
      activePersona={activeHeaderPersona}
      onPersonaChange={setActiveHeaderPersona}
      unreadNotifCount={unreadNotifCount}
    />
    <div className="app-workspace">
      <Sidebar
        activePath={path}
        onNavigate={navigate}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        toggleRef={menuToggleRef}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed(c => !c)}
        onOpenIntake={() => openListingSubmission('pickup_game')}
        onOpenAuth={openAuth}
        isLoggedIn={Boolean(authUser)}
      />
      <main id="main-content" className="page-shell">
        {!isOperational && <SiteAnnouncementBanner onNavigate={navigate} />}
        {!isOperational && <SportsBar activePath={path} onNavigate={navigate} />}
        <div className="page-content">
          <Suspense fallback={<PageFallbackLoader />}>
            {page}
          </Suspense>
        </div>
      </main>
    </div>

    <footer className={`site-footer${isOperational ? ' is-compact-operational' : ''}`}>
      {isOperational ? (
        <div className="compact-operational-footer-inner">
          <span>© KhelGrid Operational Workspace · Zero-Commission Grassroots Platform</span>
          <div className="compact-operational-footer-links">
            <a href="/" onClick={event => navigate(event, '/')}>Discovery Home</a>
            <a href="/workspace" onClick={event => navigate(event, '/workspace')}>All Workspaces</a>
            <a href="/admin" onClick={event => navigate(event, '/admin')}>Admin Panel</a>
            <a href="/help-feedback" onClick={event => navigate(event, '/help-feedback')}>Support</a>
            <a href="/privacy" onClick={event => navigate(event, '/privacy')}>Privacy</a>
            <a href="/terms" onClick={event => navigate(event, '/terms')}>Terms</a>
          </div>
        </div>
      ) : (
        <>
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
          <a href="/turf-calendar" onClick={event => navigate(event, '/turf-calendar')}>Turf Calendar <small className="footer-free-badge">Free</small></a>
          <a href="/parent-portal" onClick={event => navigate(event, '/parent-portal')}>Parent Passbook <small className="footer-free-badge">Free</small></a>
          <a href="/coaches" onClick={event => navigate(event, '/coaches')}>Coaches</a>
          <a href="/academies" onClick={event => navigate(event, '/academies')}>Academies</a>
          <a href="/academy-hub" onClick={event => navigate(event, '/academy-hub')}>Academy Hub <small className="footer-free-badge">Free</small></a>
          <a href="/coach-dashboard" onClick={event => navigate(event, '/coach-dashboard')}>Coach Hub <small className="footer-free-badge">Free</small></a>
          <a href="/tournament-ops" onClick={event => navigate(event, '/tournament-ops')}>Tournament Ops <small className="footer-free-badge">Free</small></a>
          <a href="/sports-cv" onClick={event => navigate(event, '/sports-cv')}>Sports CV Wizard <small className="footer-free-badge">Free</small></a>
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
          <a href="/partner-signup" onClick={event => navigate(event, '/partner-signup')} className="footer-partner-fast-link">⚡ Fast Partner Setup (30s)</a>
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
          <a className="footer-product" href="/sports-cv" onClick={event => navigate(event, '/sports-cv')}><strong>Sports CV</strong><span>Show your journey</span></a>
          <a className="footer-product" href="/talent-scanner" onClick={event => navigate(event, '/talent-scanner')}><strong>Talent Scanner</strong><span>Track performance</span></a>
          <a className="footer-product" href="/opportunities" onClick={event => navigate(event, '/opportunities')}><strong>Find Trials</strong><span>Discover opportunities</span></a>
          <a className="footer-product" href="/ai-guide" onClick={event => navigate(event, '/ai-guide')}><strong>AI Sports Guide</strong><span>Plan your next step</span></a>
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
        <a href="/admin" onClick={event => navigate(event, '/admin')}>Admin Panel</a>
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
        </>
      )}
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
          initialTab={authIntent.tab || 'login'}
          initialError={authIntent.error}
          initialEmail={authIntent.prefillEmail}
          intentLabel={authIntent.intentLabel}
          redirectTo={authIntent.redirectTo}
          onClose={closeAuth}
          onSuccess={(user, opts) => {
            setAuthUser(user)
            authIntent.onAuthenticated?.(user)
            if (opts?.skipRedirect) return
            const nextTarget = resolvePostAuthTarget(user, authIntent.redirectTo)
            if (nextTarget) navigate(undefined, nextTarget)
          }}
          onNavigate={navigate}
        />
      )}
    </Suspense>
    </div>
  </TenantProvider>
}
