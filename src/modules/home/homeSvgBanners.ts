/**
 * Generates lightweight, robust SVG banner placeholders for venues, academies, and pickup games.
 * Completely standalone, fast, and self-contained with no external network latency.
 */

export function createBannerSvg(
  title: string,
  subtitle: string,
  emoji = '🏛️',
  theme: 'navy' | 'cyan' | 'emerald' | 'amber' = 'navy',
): string {
  const palettes = {
    navy: ['#1e3a8a', '#047857'],
    cyan: ['#0891b2', '#0e7490'],
    emerald: ['#065f46', '#047857'],
    amber: ['#92400e', '#b45309'],
  }
  const [c1, c2] = palettes[theme] || palettes.navy
  const safeTitle = encodeURIComponent(title.toUpperCase().slice(0, 32))
  const safeSub = encodeURIComponent(subtitle.slice(0, 36))

  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" width="400" height="240">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${encodeURIComponent(c1)}"/>
        <stop offset="100%" stop-color="${encodeURIComponent(c2)}"/>
      </linearGradient>
      <linearGradient id="overlay" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stop-color="%230a0d14" stop-opacity="0.85"/>
        <stop offset="60%" stop-color="%230a0d14" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="%230a0d14" stop-opacity="0.05"/>
      </linearGradient>
    </defs>
    <rect width="400" height="240" fill="url(%23bg)"/>
    <path d="M-20,180 Q200,60 420,180" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2.5"/>
    <path d="M-20,205 Q200,85 420,205" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2.5"/>
    <rect width="400" height="240" fill="url(%23overlay)"/>
    <circle cx="200" cy="95" r="38" fill="rgba(0,0,0,0.3)" stroke="rgba(255,255,255,0.18)" stroke-width="1.5"/>
    <text x="200" y="107" font-size="30" text-anchor="middle">${emoji}</text>
    <rect x="20" y="196" width="360" height="30" rx="6" fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
    <text x="32" y="215" fill="%23ffffff" font-size="11" font-weight="700" font-family="-apple-system,BlinkMacSystemFont,sans-serif">${safeTitle}</text>
    <text x="368" y="215" fill="%2394a3b8" font-size="10" font-weight="500" text-anchor="end" font-family="-apple-system,BlinkMacSystemFont,sans-serif">${safeSub}</text>
  </svg>`
}
