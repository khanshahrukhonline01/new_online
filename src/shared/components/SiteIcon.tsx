import type { SVGProps } from 'react'

export const siteIconNames = [
  'home','sports','opportunities','venues','sports-cv','smartphone','search','menu','close','chevron-right',
  'chevron-down','arrow-up-right','external-link','calendar','calendar-check','clock','map-pin',
  'map','filter','sliders','sort','check','check-circle','info','alert-circle','alert-triangle',
  'refresh','loader','shield-check','badge-check','file-text','download','upload','share','copy',
  'bookmark','heart','star','user','users','user-round','settings','help-circle','mail','phone',
  'globe','link','plus','minus','edit','trash','lock','unlock','eye','eye-off','bell','message',
  'play','pause','volume','image','camera','trophy','medal','target','activity','chart','building',
  'wallet','credit-card','arrow-left','arrow-right','external','logout'
] as const
export type SiteIconName = typeof siteIconNames[number]

const paths: Record<SiteIconName, string> = {
  home: 'M3 10.5 12 3l9 7.5M5.5 9v11h13V9M9 20v-6h6v6',
  sports: 'M12 2.8 21.2 8v8L12 21.2 2.8 16V8zM2.8 8 12 13.3 21.2 8M12 13.3v7.9',
  smartphone: 'M7 2h10v20H7zM10 5h4M11 18h2',
  opportunities: 'M8 3h8l4 4v14H4V3zM16 3v5h4M8 12h8M8 16h8',
  venues: 'M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12zM12 9a2.2 2.2 0 1 0 0-4.4A2.2 2.2 0 0 0 12 9z',
  'sports-cv': 'M7 3h8l5 5v13H7zM15 3v5h5M10 13h7M10 17h7',
  search: 'm20 20-4.4-4.4M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z',
  menu: 'M4 6h16M4 12h16M4 18h16', close: 'm6 6 12 12M18 6 6 18',
  'chevron-right': 'm9 18 6-6-6-6', 'chevron-down': 'm6 9 6 6 6-6',
  'arrow-up-right': 'M7 17 17 7M7 7h10v10', 'external-link': 'M14 4h6v6M20 4l-9 9M18 13v6H4V5h6',
  calendar: 'M4 5h16v16H4zM8 3v4M16 3v4M4 10h16', 'calendar-check': 'M4 5h16v16H4zM8 3v4M16 3v4M7 13l3 3 7-6',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  'map-pin': 'M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12zM12 9a2.2 2.2 0 1 0 0-4.4A2.2 2.2 0 0 0 12 9z',
  map: 'm3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15', filter: 'M4 5h16l-6 7v6l-4 2v-8z',
  sliders: 'M4 6h16M4 12h16M4 18h16M8 3v6M15 9v6M10 15v6', sort: 'M4 6h16M7 12h10M10 18h4', check: 'm5 12 4 4L19 6',
  'check-circle': 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0zM8 12l3 3 5-6',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 11v6M12 7h.01',
  'alert-circle': 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 8v5M12 17h.01',
  'alert-triangle': 'm12 3 10 18H2zM12 9v5M12 17h.01', refresh: 'M20 7v5h-5M4 17v-5h5M5.5 9A7 7 0 0 1 17 5l3 2M4 17l3 2a7 7 0 0 0 11.5-4',
  loader: 'M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8',
  'shield-check': 'M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11zM8 12l3 3 5-6',
  'badge-check': 'M12 3l2.2 2 3-.2.9 2.9 2.5 1.7-1 2.8 1 2.8-2.5 1.7-.9 2.9-3-.2-2.2 2-2.2-2-3 .2-.9-2.9-2.5-1.7 1-2.8-1-2.8 2.5-1.7.9-2.9 3 .2zM8.5 12l2.3 2.3 4.7-4.7',
  'file-text': 'M6 3h9l5 5v13H6zM15 3v5h5M9 13h7M9 17h7', download: 'M12 3v12M7 10l5 5 5-5M4 20h16',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16', share: 'M18 8a3 3 0 1 0-2.9-3.7L8.8 8a3 3 0 1 0 0 8l6.3 3.7A3 3 0 1 0 16 17l-6.4-3.7a3 3 0 0 0 0-2.6L16 7',
  copy: 'M8 8h12v13H8zM4 16V3h12', bookmark: 'M6 3h12v18l-6-4-6 4z', heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z',
  star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z',
  user: 'M20 21a8 8 0 0 0-16 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  users: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M20 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  'user-round': 'M20 21a8 8 0 0 0-16 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 2.9-.2-.1a1.7 1.7 0 0 0-1.8.2l-.2.1h-3.4l-.1-.2a1.7 1.7 0 0 0-1.5-1l-.2-.1-2.9-1.7.1-.2a1.7 1.7 0 0 0-.2-1.8l-.1-.2v-3.4l.2-.1a1.7 1.7 0 0 0 1-1.5l.1-.2 1.7-2.9.2.1a1.7 1.7 0 0 0 1.8-.2l.2-.1h3.4l.1.2a1.7 1.7 0 0 0 1.5 1l.2.1 2.9 1.7-.1.2a1.7 1.7 0 0 0 .2 1.8l.1.2v3.4z',
  'help-circle': 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.5 9a2.5 2.5 0 1 1 4.4 1.6c-1.1 1-1.9 1.3-1.9 3M12 17h.01',
  mail: 'M3 5h18v14H3zM3 6l9 7 9-7', phone: 'M5 3h4l2 5-3 2a16 16 0 0 0 6 6l2-3 5 2v4c0 1-1 2-2 2C10 21 3 14 3 5c0-1 1-2 2-2z',
  globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20',
  link: 'M10 13a5 5 0 0 0 7.1 0l3-3A5 5 0 0 0 13 2.9l-1.7 1.7M14 11a5 5 0 0 0-7.1 0l-3 3A5 5 0 0 0 11 21.1l1.7-1.7',
  plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z',
  trash: 'M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 10v7M14 10v7', lock: 'M5 11h14v10H5zM8 11V7a4 4 0 1 1 8 0v4',
  unlock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 7-2', eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  'eye-off': 'm3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a16 16 0 0 1-3 4M6.6 6.6C3.7 8.2 2 12 2 12s3.5 7 10 7a10 10 0 0 0 3-.5',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4', message: 'M21 11.5a8.4 8.4 0 0 1-9 8.5 9 9 0 0 1-4-.9L3 21l1.9-4A8.4 8.4 0 1 1 21 11.5z',
  play: 'm7 4 13 8-13 8z', pause: 'M7 4h4v16H7zM15 4h4v16h-4z', volume: 'M4 9v6h4l5 4V5L8 9zM17 9a5 5 0 0 1 0 6M19 6a9 9 0 0 1 0 12',
  image: 'M3 4h18v16H3zM8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4M3 17l5-5 4 4 3-3 6 5',
  camera: 'M3 7h4l2-3h6l2 3h4v13H3zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H3v3a4 4 0 0 0 4 4M17 6h4v3a4 4 0 0 1-4 4',
  medal: 'M8 3h8l3 7-7 4-7-4zM12 14v7M9 18l3 3 3-3', target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 12h.01',
  activity: 'M3 12h4l3-8 4 16 3-8h4', chart: 'M4 19V5M4 19h17M8 15l4-5 4 3 5-7', building: 'M4 21V3h16v18M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-3h4v3',
  wallet: 'M3 6h18v15H3zM3 6l14-3M15 13h6', 'credit-card': 'M2 5h20v14H2zM2 10h20',
  'arrow-left': 'M19 12H5M12 5l-7 7 7 7', 'arrow-right': 'M5 12h14M12 5l7 7-7 7', external: 'M14 4h6v6M20 4l-9 9M18 13v6H4V5h6', logout: 'M10 17l5-5-5-5M15 12H3M12 3h8v18h-8'
}

export function SiteIcon({ name, size = 20, strokeWidth = 1.8, ...props }: SVGProps<SVGSVGElement> & { name: SiteIconName; size?: number; strokeWidth?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}><path d={paths[name]} /></svg>
}
