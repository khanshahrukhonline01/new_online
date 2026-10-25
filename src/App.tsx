import { useEffect, useState, type MouseEvent } from 'react'
import HomePage from './modules/home/HomePage'
import SportsPage from './modules/sports/SportsPage'
import OpportunitiesPage from './modules/opportunities/OpportunitiesPage'
import VenuesPage from './modules/venues/VenuesPage'

const routes = [
  { path: '/', label: 'Home' },
  { path: '/sports', label: 'Sports' },
  { path: '/opportunities', label: 'Opportunities' },
  { path: '/venues', label: 'Venues' },
]

function currentPath() {
  const path = window.location.pathname.replace(/\/$/, '') || '/'
  return path
}

export default function App() {
  const [path, setPath] = useState(currentPath)
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    const handlePopState = () => { setPath(currentPath()); setMenuOpen(false) }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])
  useEffect(() => { setMenuOpen(false) }, [path])
  function navigate(event: MouseEvent<HTMLAnchorElement>, target: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    event.preventDefault()
    if (target !== path) window.history.pushState({}, '', target)
    setPath(target)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }
  const active = routes.find(route => route.path === path)?.path ?? (path.startsWith('/sports/') ? '/sports' : path.startsWith('/opportunities/') ? '/opportunities' : path.startsWith('/venues/') ? '/venues' : '')
  let page
  if (path === '/') page = <HomePage />
  else if (path === '/sports' || path.startsWith('/sports/')) page = <SportsPage />
  else if (path === '/opportunities' || path === '/trials' || path === '/combines' || path === '/scholarships' || path === '/camps') page = <OpportunitiesPage />
  else if (path === '/venues' || path === '/book') page = <VenuesPage />
  else page = <section className="content-page"><p className="eyebrow">NOT FOUND</p><h1>This page isn’t here yet.</h1><p className="page-intro">This route has not been implemented. Return to the home page to continue exploring.</p><a className="primary-link" href="/" onClick={event => navigate(event, '/')}>Back home ↗</a></section>

  return <div className="app-shell"><header className="site-header"><a className="brand" href="/" onClick={event => navigate(event, '/')} aria-label="KhelGrid home"><span className="brand-mark" aria-hidden="true">K</span><span>KHELGRID</span></a><button className="menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="primary-navigation" onClick={() => setMenuOpen(open => !open)}>{menuOpen ? 'Close' : 'Menu'} <span aria-hidden="true">{menuOpen ? '×' : '☰'}</span></button><nav id="primary-navigation" className={menuOpen ? 'primary-navigation is-open' : 'primary-navigation'} aria-label="Main navigation">{routes.map(route => <a key={route.path} href={route.path} onClick={event => navigate(event, route.path)} className={active === route.path ? 'nav-link active' : 'nav-link'} aria-current={active === route.path ? 'page' : undefined}>{route.label}</a>)}</nav><span className="environment-label"><span className="status-dot warning" />Development</span></header><main id="main-content" className="page-shell">{page}</main><footer className="site-footer"><a className="footer-brand" href="/" onClick={event => navigate(event, '/')}>KHELGRID</a><span>India’s sports discovery platform</span><span>Development build · Not a booking or live-score service</span></footer></div>
}
