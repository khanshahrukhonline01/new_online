import { useEffect, useRef, type MouseEvent, type RefObject } from 'react'
import { navigationModules, type NavigationItem } from '../navigation/navigationRegistry'

type SidebarProps = {
  activePath: string
  onNavigate: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
  open: boolean
  onClose: () => void
  toggleRef: RefObject<HTMLButtonElement | null>
}

function isActive(item: NavigationItem, activePath: string) {
  if (item.href === '/') return activePath === '/'
  if (item.href === '/opportunities') return ['/opportunities', '/trials', '/combines', '/scholarships', '/camps'].includes(activePath) || activePath.startsWith('/opportunities/')
  if (item.href === '/venues') return activePath === '/venues' || activePath === '/book' || activePath.startsWith('/venues/')
  return activePath === item.href || activePath.startsWith(item.href + '/')
}

function SidebarLink({ item, activePath, onNavigate, onClose, collapsed = false }: {
  item: NavigationItem
  activePath: string
  onNavigate: SidebarProps['onNavigate']
  onClose?: () => void
  collapsed?: boolean
}) {
  const active = isActive(item, activePath)
  return <div className="sidebar-item-wrap">
    <a href={item.href} className={active ? 'sidebar-link is-active' : 'sidebar-link'} aria-current={active ? 'page' : undefined} aria-label={collapsed ? item.label : undefined} title={collapsed ? item.label : undefined} onClick={event => { onNavigate(event, item.href); onClose?.() }}>
      <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
      <span className="sidebar-link-label">{item.label}</span>
      {item.children?.length ? <span className="sidebar-chevron" aria-hidden="true">›</span> : null}
    </a>
    {item.children?.length && !collapsed ? <div className="sidebar-children">{item.children.map(child => <a key={child.id} href={child.href} className="sidebar-child-link" aria-current={activePath === child.href ? 'page' : undefined} onClick={event => { onNavigate(event, child.href); onClose?.() }}>{child.label}</a>)}</div> : null}
  </div>
}

export default function Sidebar({ activePath, onNavigate, open, onClose, toggleRef }: SidebarProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) closeRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        toggleRef.current?.focus()
        return
      }
      if (event.key !== 'Tab') return
      const drawer = drawerRef.current
      if (!drawer) return
      const focusable = Array.from(drawer.querySelectorAll<HTMLElement>('a[href]:not([aria-disabled="true"]), button:not(:disabled), [tabindex="0"]'))
        .filter(element => element.offsetParent !== null)
      if (!focusable.length) {
        event.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && (document.activeElement === first || !drawer.contains(document.activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !drawer.contains(document.activeElement))) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose, toggleRef])

  return <>
    <button className={open ? 'sidebar-backdrop is-visible' : 'sidebar-backdrop'} type="button" aria-label="Close navigation menu" aria-hidden={!open} tabIndex={open ? 0 : -1} onClick={() => { onClose(); toggleRef.current?.focus() }} />
    <aside className="app-sidebar" aria-label="Sidebar navigation">
      <div className="sidebar-brand-row">
        <a className="sidebar-brand" href="/" onClick={event => onNavigate(event, '/')} aria-label="KhelGrid home">
          <img className="brand-logo" src="/assets/kg-logo.svg" alt="" aria-hidden="true" />
          <span className="sidebar-brand-name">KHELGRID</span>
        </a>
      </div>
      <nav className="sidebar-navigation" aria-label="Feature navigation">
        {navigationModules.map(section => <section className="sidebar-module" key={section.id} aria-label={section.label}>
          <p className="sidebar-module-label">{section.label}</p>
          {section.items.map(item => <SidebarLink key={item.id} item={item} activePath={activePath} onNavigate={onNavigate} onClose={onClose} />)}
        </section>)}
      </nav>
      <div className="sidebar-promo"><strong>Create your Sports CV</strong><p>Build a profile-ready CV and export it when you're ready.</p><a href="/sports-cv" onClick={event => onNavigate(event, '/sports-cv')}>Explore CV tools <span aria-hidden="true">↗</span></a></div>
      <div className="sidebar-bottom">
        <span className="sidebar-build-note">Development build</span>
      </div>
    </aside>
    <div ref={drawerRef} id="mobile-sidebar-drawer" className={open ? 'mobile-drawer is-open' : 'mobile-drawer'} aria-hidden={!open} role="dialog" aria-modal={open ? 'true' : undefined} aria-label="Mobile navigation">
      <div className="mobile-drawer-header">
        <a className="sidebar-brand" href="/" onClick={event => { onNavigate(event, '/'); onClose() }}><span className="brand-mark" aria-hidden="true">K</span><span className="sidebar-brand-name">KHELGRID</span></a>
        <button ref={closeRef} className="sidebar-mobile-close" type="button" onClick={() => { onClose(); toggleRef.current?.focus() }} aria-label="Close navigation">×</button>
      </div>
      <nav className="sidebar-navigation" aria-label="Mobile feature navigation">
        {navigationModules.map(section => <section className="sidebar-module" key={section.id} aria-label={section.label}>
          <p className="sidebar-module-label">{section.label}</p>
          {section.items.map(item => <SidebarLink key={item.id} item={item} activePath={activePath} onNavigate={onNavigate} onClose={onClose} />)}
        </section>)}
      </nav>
      <div className="sidebar-promo"><strong>Create your Sports CV</strong><p>Build a profile-ready CV and export it when you're ready.</p><a href="/sports-cv" onClick={event => { onNavigate(event, '/sports-cv'); onClose() }}>Explore CV tools ↗</a></div>
    </div>
    <nav className="mobile-bottom-nav" aria-label="Quick navigation">
      {[
        { label: 'Home', href: '/', icon: '⌂' },
        { label: 'Sports', href: '/sports', icon: '◇' },
        { label: 'Trials', href: '/opportunities', icon: '▦' },
        { label: 'Venues', href: '/venues', icon: '⌖' },
        { label: 'Search', href: '/search', icon: '⌕' },
      ].map(item => {
        const active = isActive({ ...item, id: item.label, module: 'quick' }, activePath)
        return <a key={item.href} href={item.href} className={active ? 'mobile-bottom-link is-active' : 'mobile-bottom-link'} aria-current={active ? 'page' : undefined} onClick={event => onNavigate(event, item.href)}><span aria-hidden="true">{item.icon}</span><small>{item.label}</small></a>
      })}
    </nav>
  </>
}
