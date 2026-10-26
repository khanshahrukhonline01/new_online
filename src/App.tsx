import { useEffect, useRef, useState, type MouseEvent } from 'react'
import HomePage from './modules/home/HomePage'
import SportsPage from './modules/sports/SportsPage'
import OpportunitiesPage from './modules/opportunities/OpportunitiesPage'
import VenuesPage from './modules/venues/VenuesPage'
import SearchPage from './modules/search/SearchPage'
import Sidebar from './shared/components/Sidebar'
import { resolveRoute } from './shared/routing'
import { SiteIcon } from './shared/components/SiteIcon'

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
    case 'sports-index':
    case 'sport-detail': page = <SportsPage />; break
    case 'opportunities-index':
    case 'opportunity-detail': page = <OpportunitiesPage />; break
    case 'venues-index':
    case 'venue-detail': page = <VenuesPage />; break
    case 'search': page = <SearchPage initialQuery={searchQuery} />; break
    default:
      page = <section className="content-page"><p className="eyebrow">PAGE NOT AVAILABLE</p><h1>This page isn’t here yet.</h1><p className="page-intro">This route has not been implemented. Return to a published section to continue exploring.</p><a className="primary-link" href="/" onClick={event => navigate(event, '/')}>Back home <SiteIcon name="arrow-up-right" size={16} /></a></section>
  }

  return <div className="app-shell foundation-v1">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="site-header">
      <button ref={menuToggleRef} className="menu-toggle" type="button" aria-expanded={isMobile ? menuOpen : !sidebarCollapsed} aria-controls={isMobile ? 'mobile-sidebar-drawer' : 'app-sidebar'} onClick={toggleMainMenu} aria-label="Toggle main navigation"><SiteIcon name={isMobile && menuOpen ? 'close' : 'menu'} size={20} /></button>
      <a className="brand" href="/" onClick={event => navigate(event, '/')} aria-label="KhelGrid home"><img className="brand-logo" src="/assets/kg-logo.webp" alt="" aria-hidden="true" /><span>KHELGRID</span></a>
      <form className="header-search-form" role="search" onSubmit={event => { event.preventDefault(); const value = headerQuery.trim(); const target = '/search' + (value ? '?q=' + encodeURIComponent(value) : ''); if (typeof window !== 'undefined') { window.history.pushState({}, '', target); window.scrollTo({ top: 0, behavior: 'auto' }) } setPath('/search'); setSearchQuery(value); setMenuOpen(false) }}><SiteIcon name="search" size={18} /><input aria-label="Search KhelGrid catalogue" type="search" placeholder="Search sports, trials, venues, athletes…" value={headerQuery} onChange={event => setHeaderQuery(event.target.value)} autoComplete="off" /><button type="submit" aria-label="Submit search"><SiteIcon name="arrow-up-right" size={16} /></button></form>
      <span className="environment-label"><span className="status-dot warning" />Development</span>
    </header>
    <div className="app-workspace">
      <Sidebar activePath={path} onNavigate={navigate} open={menuOpen} onClose={() => setMenuOpen(false)} toggleRef={menuToggleRef} collapsed={sidebarCollapsed} />
      <main id="main-content" className="page-shell">{page}</main>
    </div>

    <footer className="site-footer"><a className="footer-brand" href="/" onClick={event => navigate(event, '/')} aria-label="KhelGrid home"><img className="footer-brand-logo" src="/assets/kg-logo.webp" alt="" aria-hidden="true" /></a><span>India’s sports discovery platform</span><span>Development build · live feeds and account services are not connected yet · Not a booking or live-score service</span></footer>
  </div>
}
