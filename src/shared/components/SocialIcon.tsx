import type { SVGProps } from 'react'

export const socialIconNames = ['facebook', 'instagram', 'youtube', 'linkedin', 'x', 'tiktok'] as const
export type SocialIconName = typeof socialIconNames[number]

const paths: Record<SocialIconName, string> = {
  facebook: 'M13.5 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5h1.7V3.9c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3V10H7.3v3h2.8v8z',
  instagram: 'M7 2.8h10A4.2 4.2 0 0 1 21.2 7v10a4.2 4.2 0 0 1-4.2 4.2H7A4.2 4.2 0 0 1 2.8 17V7A4.2 4.2 0 0 1 7 2.8z M12 7.2a4.8 4.8 0 1 0 0 9.6 4.8 4.8 0 0 0 0-9.6z M17.7 6.1h.01',
  youtube: 'M22 8.2a2.8 2.8 0 0 0-2-2C18.2 5.7 12 5.7 12 5.7s-6.2 0-8 .5a2.8 2.8 0 0 0-2 2A29 29 0 0 0 1.5 12a29 29 0 0 0 .5 3.8 2.8 2.8 0 0 0 2 2c1.8.5 8 .5 8 .5s6.2 0 8-.5a2.8 2.8 0 0 0 2-2A29 29 0 0 0 22.5 12a29 29 0 0 0-.5-3.8z M10 15.2V8.8l5.5 3.2z',
  linkedin: 'M5.2 8.3H2V21h3.2zM3.6 2.8a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8zM8.2 8.3h3.1V10h.1a3.5 3.5 0 0 1 3.2-1.8c3.4 0 4 2.2 4 5V21h-3.2v-6.9c0-1.6 0-3-1.9-3s-2.2 1.4-2.2 2.9V21H8.2z',
  x: 'M18.9 2.5h3.3l-7.2 8.2 8.5 11h-6.7l-5.3-6.9-6 6.9H2.2l7.7-8.8L1.8 2.5h6.9l4.8 6.4z M17.7 19.7h1.8L7 4.4H5.1z',
  tiktok: 'M16.6 2h-3.4v13.7a3 3 0 1 1-2.6-3V9.2a6.4 6.4 0 1 0 6 6.4V8.7a8.2 8.2 0 0 0 4.8 1.5V6.8A4.8 4.8 0 0 1 16.6 2z',
}

export function SocialIcon({ name, size = 20, ...props }: SVGProps<SVGSVGElement> & { name: SocialIconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}><path d={paths[name]} /></svg>
}
