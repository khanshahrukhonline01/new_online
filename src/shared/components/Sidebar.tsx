import { useEffect, useRef, useState, type MouseEvent, type RefObject } from 'react'
import { navigationModules, type NavigationItem } from '../navigation/navigationRegistry'
import { SiteIcon, type SiteIconName } from './SiteIcon'

type SidebarProps = {
  activePath: string
  onNavigate: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
  open: boolean
  onClose: () => void
  toggleRef: RefObject<HTMLButtonElement | null>
  collapsed: boolean
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
  const label = <><span className="sidebar-icon" aria-hidden="true"><SiteIcon name={item.icon} size={18} /></span><span className="sidebar-link-label">{item.label}</span>{!item.available && !collapsed ? <span className="sidebar-coming-soon">Soon</span> : null}</>
  if (!item.available) {
    return <div className="sidebar-item-wrap">
      <span className="sidebar-link is-disabled" aria-disabled="true" title={collapsed ? item.label + ' — coming soon' : 'Coming soon'}>{label}</span>
    </div>
  }
  return <div className="sidebar-item-wrap">
    <a href={item.href} className={active ? 'sidebar-link is-active' : 'sidebar-link'} aria-current={active ? 'page' : undefined} aria-label={collapsed ? item.label : undefined} title={collapsed ? item.label : undefined} onClick={event => { onNavigate(event, item.href); onClose?.() }}>
      {label}
    </a>
  </div>
}

export default function Sidebar({ activePath, onNavigate, open, onClose, toggleRef, collapsed }: SidebarProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    core: true, play: true, athlete: false, knowledge: false, network: false,
  })

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
      const focusable = Array.from(drawer.querySelectorAll<HTMLElement>('a[href]:not([aria-disabled="true"]), button:not(:disabled), [tabindex="0"]')).filter(element => element.offsetParent !== null)
      if (!focusable.length) { event.preventDefault(); return }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && (document.activeElement === first || !drawer.contains(document.activeElement))) {
        event.preventDefault(); last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !drawer.contains(document.activeElement))) {
        event.preventDefault(); first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose, toggleRef])

  const mobileItems: { label: string; href: string; icon: SiteIconName }[] = [
    { label: 'Home', href: '/', icon: 'home' },
    { label: 'Sports', href: '/sports', icon: 'sports' },
    { label: 'Trials', href: '/opportunities', icon: 'opportunities' },
    { label: 'Venues', href: '/venues', icon: 'venues' },
    { label: 'Search', href: '/search', icon: 'search' },
  ]

  function renderSections(mobile = false) {
    return navigationModules.map(section => {
      const expanded = expandedSections[section.id] ?? false
      return <section className="sidebar-module" key={section.id} aria-label={section.label}>
        <button className="sidebar-module-toggle" type="button" aria-expanded={expanded} aria-controls={`${mobile ? 'mobile-' : ''}nav-section-${section.id}`} onClick={() => setExpandedSections(previous => ({ ...previous, [section.id]: !expanded }))}>
          <span className="sidebar-module-label">{section.label}</span>
          {!collapsed || mobile ? <SiteIcon name={expanded ? 'chevron-down' : 'chevron-right'} size={14} /> : null}
        </button>
        {expanded ? <div id={`${mobile ? 'mobile-' : ''}nav-section-${section.id}`}>
          {section.items.map(item => <SidebarLink key={item.id} item={item} activePath={activePath} onNavigate={onNavigate} onClose={onClose} collapsed={collapsed && !mobile} />)}
        </div> : null}
      </section>
    })
  }

  return <>
    <button className={open ? 'sidebar-backdrop is-visible' : 'sidebar-backdrop'} type="button" aria-label="Close navigation menu" aria-hidden={!open} tabIndex={open ? 0 : -1} onClick={() => { onClose(); toggleRef.current?.focus() }} />
    <aside id="app-sidebar" className={collapsed ? 'app-sidebar is-collapsed' : 'app-sidebar'} aria-label="Sidebar navigation">
      <nav className="sidebar-navigation" aria-label="Feature navigation">{renderSections()}</nav>
      {!collapsed ? <div className="sidebar-promo"><strong>Create your Sports CV</strong><p>Build a profile-ready CV and export it when you're ready.</p><span className="sidebar-coming-soon" aria-disabled="true">Sports CV tools · Coming soon</span></div> : null}
      <div className="sidebar-bottom">
        <a className="sidebar-utility-link" href="mailto:khelgrid@gmail.com?subject=KhelGrid%20help%20and%20feedback" aria-label="Help and feedback" title="Help and feedback"><SiteIcon name="help-circle" size={18} /><span className="sidebar-utility-label">Help &amp; feedback</span></a>
        {!collapsed ? <span className="sidebar-bottom-note">KhelGrid · India</span> : null}
      </div>
    </aside>
    <div ref={drawerRef} id="mobile-sidebar-drawer" className={open ? 'mobile-drawer is-open' : 'mobile-drawer'} aria-hidden={!open} role="dialog" aria-modal={open ? 'true' : undefined} aria-label="Mobile navigation">
      <div className="mobile-drawer-header"><button ref={closeRef} className="sidebar-mobile-close" type="button" onClick={() => { onClose(); toggleRef.current?.focus() }} aria-label="Close navigation"><SiteIcon name="close" size={20} /></button></div>
      <nav className="sidebar-navigation" aria-label="Mobile feature navigation">{renderSections(true)}</nav>
      <div className="sidebar-promo"><strong>Create your Sports CV</strong><p>Build a profile-ready CV and export it when you're ready.</p><span className="sidebar-coming-soon" aria-disabled="true">Sports CV tools · Coming soon</span></div>
    </div>
    <nav className="mobile-bottom-nav" aria-label="Quick navigation">
      {mobileItems.map(item => {
        const active = isActive({ ...item, id: item.label, module: 'quick', available: true }, activePath)
        return <a key={item.href} href={item.href} className={active ? 'mobile-bottom-link is-active' : 'mobile-bottom-link'} aria-current={active ? 'page' : undefined} aria-label={item.label} onClick={event => onNavigate(event, item.href)}><SiteIcon name={item.icon} size={20} /><small>{item.label}</small></a>
      })}
    </nav>
  </>
}
