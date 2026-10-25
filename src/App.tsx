import { useEffect, useRef, useState, type MouseEvent } from 'react'
import HomePage from './modules/home/HomePage'
import SportsPage from './modules/sports/SportsPage'
import OpportunitiesPage from './modules/opportunities/OpportunitiesPage'
import VenuesPage from './modules/venues/VenuesPage'
import SearchPage from './modules/search/SearchPage'
import Sidebar from './shared/components/Sidebar'
import { navigationModules } from './shared/navigation/navigationRegistry'
import { resolveRoute } from './shared/routing'

const routes = navigationModules.find(section => section.id === 'core')?.items ?? []

function currentPath() {
  if (typeof window === 'undefined') return '/'
  return window.location.pathname.replace(/\/$/, '') || '/'
}

export default function App() {
  const [path, setPath] = useState('/')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuToggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setPath(currentPath())
    const handlePopState = () => { setPath(currentPath()); setMenuOpen(false) }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => { setMenuOpen(false) }, [path])

  function navigate(event: MouseEvent<HTMLAnchorElement>, target: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    event.preventDefault()
    if (typeof window !== 'undefined') {
      if (target !== path) window.history.pushState({}, '', target)
      window.scrollTo({ top: 0, behavior: 'auto' })
    }
    setPath(target)
    setMenuOpen(false)
    menuToggleRef.current?.focus()
  }

  const match = resolveRoute(path)
  const active = routes.find(route => route.href === path)?.href
    ?? (match.name === 'sport-detail' ? '/sports'
      : match.name === 'opportunity-detail' || match.name === 'opportunities-index' ? '/opportunities'
      : match.name === 'venue-detail' || match.name === 'venues-index' ? '/venues' : '')

  let page
  switch (match.name) {
    case 'home': page = <HomePage />; break
    case 'sports-index':
    case 'sport-detail': page = <SportsPage />; break
    case 'opportunities-index':
    case 'opportunity-detail': page = <OpportunitiesPage />; break
    case 'venues-index':
    case 'venue-detail': page = <VenuesPage />; break
    case 'search': page = <SearchPage />; break
    default:
      page = <section className="content-page"><p className="eyebrow">PAGE NOT AVAILABLE</p><h1>This page isn’t here yet.</h1><p className="page-intro">This route has not been implemented. Return to a published section to continue exploring.</p><a className="primary-link" href="/" onClick={event => navigate(event, '/')}>Back home ↗</a></section>
  }

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="site-header">
      <a className="brand" href="/" onClick={event => navigate(event, '/')} aria-label="KhelGrid home"><img className="brand-logo" src="/assets/kg-logo.webp" alt="" aria-hidden="true" /><span>KHELGRID</span></a>
      <button ref={menuToggleRef} className="menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="mobile-sidebar-drawer" onClick={() => setMenuOpen(open => !open)} aria-label={menuOpen ? 'Close main navigation' : 'Open main navigation'}>{menuOpen ? 'Close' : 'Menu'} <span aria-hidden="true">{menuOpen ? '×' : '☰'}</span></button>
      <nav id="primary-navigation" className="primary-navigation" aria-label="Main navigation">{routes.map(route => <a key={route.id} href={route.href} onClick={event => navigate(event, route.href)} className={active === route.href ? 'nav-link active' : 'nav-link'} aria-current={active === route.href ? 'page' : undefined}>{route.label}</a>)}</nav>
      <a className={match.name === 'search' ? 'header-search-link active' : 'header-search-link'} href="/search" aria-current={match.name === 'search' ? 'page' : undefined} onClick={event => navigate(event, '/search')} aria-label="Search KhelGrid">Search <span aria-hidden="true">⌕</span></a>
      <span className="environment-label"><span className="status-dot warning" />Development</span>
    </header>
    <div className="app-workspace">
      <Sidebar activePath={path} onNavigate={navigate} open={menuOpen} onClose={() => setMenuOpen(false)} toggleRef={menuToggleRef} />
      <main id="main-content" className="page-shell">{page}</main>
    </div>
    <footer className="site-footer"><a className="footer-brand" href="/" onClick={event => navigate(event, '/')} aria-label="KhelGrid home"><img className="footer-brand-logo" src="/assets/kg-logo.webp" alt="" aria-hidden="true" /></a><span>India’s sports discovery platform</span><span>Development build · live feeds and account services are not connected yet · Not a booking or live-score service</span></footer>
  </div>
}
