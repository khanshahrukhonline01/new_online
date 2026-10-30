import { useEffect, useRef, useState, type MouseEvent } from 'react'
import HomePage from './modules/home/HomePage'
import SportsPage from './modules/sports/SportsPage'
import OpportunitiesPage from './modules/opportunities/OpportunitiesPage'
import VenuesPage from './modules/venues/VenuesPage'
import SearchPage from './modules/search/SearchPage'
import FeatureComingSoonPage from './modules/coming-soon/FeatureComingSoonPage'
import SportsCvWizard from './modules/sports-cv/SportsCvWizard'
import CatalogueDetailPage from './modules/catalogue/CatalogueDetailPage'
import FeatureDirectoryPage from './modules/directories/FeatureDirectoryPage'
import LiveScoresPage from './modules/live/LiveScoresPage'
import ListingSubmissionPage from './modules/listings/ListingSubmissionPage'
import PolicyPage from './modules/policies/PolicyPage'
import Sidebar from './shared/components/Sidebar'
import SportsBar from './shared/components/SportsBar'
import { resolveRoute } from './shared/routing'
import { SiteIcon } from './shared/components/SiteIcon'
import TopSportsComplexes from './shared/components/TopSportsComplexes'
import GameSportPlayAcrossIndia from './shared/components/GameSportPlayAcrossIndia'
import FrequentlyAskedQuestions from './shared/components/FrequentlyAskedQuestions'

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
  const menuToggleRef = useRef<HTMLButtonElement>(null)

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
    setPath(nextPath)
    if (nextPath === '/search') { const nextQuery = new URLSearchParams(target.split('?')[1] ?? '').get('q') ?? ''; setSearchQuery(nextQuery); setHeaderQuery(nextQuery) }
    setMenuOpen(false)
    menuToggleRef.current?.focus()
  }

  const match = resolveRoute(path)
  let page
  switch (match.name) {
    case 'home': page = <HomePage />; break
    case 'sports-index': page = <SportsPage />; break
    case 'sport-detail': page = <CatalogueDetailPage kind="sport" slug={match.slug} />; break
    case 'opportunities-index': page = <OpportunitiesPage />; break
    case 'opportunity-detail': page = <CatalogueDetailPage kind="opportunity" slug={match.slug} />; break
    case 'venues-index': page = <VenuesPage />; break
    case 'venue-detail': page = <CatalogueDetailPage kind="venue" slug={match.slug} />; break
    case 'search': page = <SearchPage initialQuery={searchQuery} />; break
    case 'feature':
      if (match.canonicalPath === '/sports-cv') page = <SportsCvWizard />
      else if (match.canonicalPath === '/coaches') page = <FeatureDirectoryPage kind="coaches" />
      else if (match.canonicalPath === '/academies' || match.canonicalPath === '/academy') page = <FeatureDirectoryPage kind="academies" />
      else if (match.canonicalPath === '/events') page = <FeatureDirectoryPage kind="events" />
      else if (match.canonicalPath === '/calendar') page = <FeatureDirectoryPage kind="calendar" />
      else if (match.canonicalPath === '/live' || match.canonicalPath === '/live-scores') page = <LiveScoresPage onNavigate={navigate} />
      else if (match.canonicalPath === '/submit-listing') page = <ListingSubmissionPage />
      else if (['/privacy','/terms','/cookies','/ipr-policy','/cancellation-policy','/posh-policy','/editorial-policy','/verification-policy','/correction-policy'].includes(match.canonicalPath)) page = <PolicyPage path={match.canonicalPath} onNavigate={navigate} />
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
      <form className="header-search-form" role="search" onSubmit={event => { event.preventDefault(); const value = headerQuery.trim(); const target = '/search' + (value ? '?q=' + encodeURIComponent(value) : ''); if (typeof window !== 'undefined') { window.history.pushState({}, '', target); window.scrollTo({ top: 0, behavior: 'auto' }) } setPath('/search'); setSearchQuery(value); setMenuOpen(false) }}><SiteIcon name="search" size={18} /><input aria-label="Search KhelGrid catalogue" type="search" placeholder="Search sports, trials, venues, athletes…" value={headerQuery} onChange={event => setHeaderQuery(event.target.value)} autoComplete="off" /><button type="submit" aria-label="Submit search"><SiteIcon name="arrow-up-right" size={16} /></button></form>
      <nav className="header-actions" aria-label="KhelGrid actions">
        <a className="header-action-link" href="mailto:khelgrid@gmail.com?subject=List%20a%20sports%20venue%20on%20KhelGrid"><SiteIcon name="plus" size={16} /><span>List your venue</span></a>
        <a className="header-action-link header-action-secondary" href="mailto:khelgrid@gmail.com?subject=Submit%20a%20sports%20trial%20or%20opportunity"><SiteIcon name="calendar-check" size={16} /><span>Submit a trial</span></a>
      </nav>
      <button className="header-icon-button" type="button" disabled aria-label="Notifications coming soon" title="Notifications coming soon"><SiteIcon name="bell" size={19} /></button>
      <a className="header-icon-button" href="mailto:khelgrid@gmail.com?subject=KhelGrid%20settings%20help" aria-label="Settings help" title="Settings help"><SiteIcon name="settings" size={19} /></a>
      <span className="header-login-link is-unavailable" aria-disabled="true" title="Login coming soon"><SiteIcon name="user-round" size={17} /><span>Login <small>Coming Soon</small></span></span>
      <a className="header-go-pro" href="mailto:khelgrid@gmail.com?subject=KhelGrid%20Pro%20enquiry"><SiteIcon name="star" size={16} /><span>Go Pro</span></a>
    </header>
    <div className="app-workspace">
      <Sidebar activePath={path} onNavigate={navigate} open={menuOpen} onClose={() => setMenuOpen(false)} toggleRef={menuToggleRef} collapsed={sidebarCollapsed} />
      <main id="main-content" className="page-shell"><SportsBar activePath={path} onNavigate={navigate} /><div className="page-content">{page}</div></main>
    </div>

    <footer className="site-footer">
      <FrequentlyAskedQuestions activePath={path} onNavigate={navigate} />
      <GameSportPlayAcrossIndia onNavigate={navigate} />
      <TopSportsComplexes onNavigate={navigate} />
      <div className="footer-main">
        <div className="footer-about">
          <a className="footer-brand" href="/" onClick={event => navigate(event, '/')} aria-label="KhelGrid home"><img className="footer-brand-logo" src="/assets/kg-logo.webp" alt="" aria-hidden="true" /></a>
          <p className="footer-tagline">India’s grid for sports trials, venues, coaching and athlete profiles.</p>
          <p className="footer-region">India · 16 cities in the current grid</p>
          <a className="footer-pro-link" href="/pricing" onClick={event => navigate(event, '/pricing')}>★ Go Pro · ₹499/month</a>
        </div>
        <nav className="footer-column" aria-label="Explore KhelGrid">
          <h2>Explore</h2>
          <a href="/sports" onClick={event => navigate(event, '/sports')}>All sports</a>
          <a href="/opportunities" onClick={event => navigate(event, '/opportunities')}>Trials & opportunities</a>
          <a href="/venues" onClick={event => navigate(event, '/venues')}>Sports venues</a>
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
          <a href="mailto:khelgrid@gmail.com?subject=List%20a%20sports%20venue">List your venue</a>
          <a href="mailto:khelgrid@gmail.com?subject=Submit%20a%20sports%20trial">Submit a trial</a>
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
          <div className="footer-product is-unavailable" aria-label="Play and Match, coming soon"><strong>Play &amp; Match</strong><span>Coming soon</span></div>
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
        <a href="/about" onClick={event => navigate(event, '/about')}>About</a>
        <a href="/contact" onClick={event => navigate(event, '/contact')}>Contact</a>
        <a href="/privacy" onClick={event => navigate(event, '/privacy')}>Privacy</a>
        <a href="/terms" onClick={event => navigate(event, '/terms')}>Terms</a>
        <a href="/ipr-policy" onClick={event => navigate(event, '/ipr-policy')}><strong>IPR &amp; Copyright</strong></a>
        <a href="/cancellation-policy" onClick={event => navigate(event, '/cancellation-policy')}>Cancellation</a>
        <a href="/posh-policy" onClick={event => navigate(event, '/posh-policy')}>POSH Policy</a>
        <a href="/editorial-policy" onClick={event => navigate(event, '/editorial-policy')}>Editorial</a>
        <a href="/verification-policy" onClick={event => navigate(event, '/verification-policy')}>Verification</a>
        <a href="/correction-policy" onClick={event => navigate(event, '/correction-policy')}>Corrections</a>
        <a href="https://www.khelgrid.com/sitemap.xml" target="_blank" rel="noopener noreferrer">Sitemap</a>
        <a href="/cookies" onClick={event => navigate(event, '/cookies')}>Privacy &amp; Cookie Settings</a>
      </nav>
      <div className="footer-legal">
        <p>Development build · live feeds and account services are not connected yet · Not a booking or live-score service</p>
        <p><span>{IPR_NOTICE_HEADING}</span><span>AI use</span><span>Copyright notice</span><span>© KhelGrid</span></p>
      </div>
    </footer>
  </div>
}
