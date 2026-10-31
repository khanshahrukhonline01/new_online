import type { SVGProps } from 'react'

/** Local KhelGrid sport icon sprite. Keep IDs aligned with public/assets/sports/sport-icons.svg. */
export const sportIconManifest = [
  { id: 'football', label: 'Football' },
  { id: 'cricket', label: 'Cricket' },
  { id: 'basketball', label: 'Basketball' },
  { id: 'tennis', label: 'Tennis' },
  { id: 'badminton', label: 'Badminton' },
  { id: 'volleyball', label: 'Volleyball' },
  { id: 'hockey', label: 'Hockey' },
  { id: 'athletics', label: 'Athletics' },
  { id: 'swimming', label: 'Swimming' },
  { id: 'boxing', label: 'Boxing' },
  { id: 'cycling', label: 'Cycling' },
  { id: 'chess', label: 'Chess' },
  { id: 'table-tennis', label: 'Table tennis' },
  { id: 'golf', label: 'Golf' },
  { id: 'rugby', label: 'Rugby' },
  { id: 'gymnastics', label: 'Gymnastics' },
  { id: 'handball', label: 'Handball' },
  { id: 'rowing', label: 'Rowing' },
  { id: 'weightlifting', label: 'Weightlifting' },
  { id: 'wrestling', label: 'Wrestling' },
  { id: 'karate', label: 'Karate' },
  { id: 'taekwondo', label: 'Taekwondo' },
  { id: 'skating', label: 'Skating' },
  { id: 'kabaddi', label: 'Kabaddi' },
  { id: 'futsal', label: 'Futsal' },
  { id: 'pickleball', label: 'Pickleball' },
  { id: 'squash', label: 'Squash' },
  { id: 'shooting', label: 'Shooting' },
  { id: 'yoga', label: 'Yoga' },
  { id: 'martial-arts', label: 'Martial arts' },
  { id: 'archery', label: 'Archery' },
  { id: 'fencing', label: 'Fencing' },
  { id: 'equestrian', label: 'Equestrian' },
  { id: 'judo', label: 'Judo' },
] as const

export type SportIconId = typeof sportIconManifest[number]['id']

const aliases: Record<string, SportIconId> = {
  soccer: 'football',
  'association-football': 'football',
  'table tennis': 'table-tennis',
  pingpong: 'table-tennis',
  'track-and-field': 'athletics',
  'field hockey': 'hockey',
  'martial arts': 'martial-arts',
  'combat sports': 'martial-arts',
  'weight lifting': 'weightlifting',
  horseback: 'equestrian',
  'horse riding': 'equestrian',
  bow: 'archery',
}

export function getSportIconId(name?: string | null): SportIconId | undefined {
  if (!name) return undefined
  const key = name.trim().toLowerCase().replace(/[_\s]+/g, '-')
  const match = sportIconManifest.find(item => item.id === key || item.label.toLowerCase() === name.trim().toLowerCase())
  return match?.id ?? aliases[key] ?? aliases[name.trim().toLowerCase()]
}

type SportIconProps = SVGProps<SVGSVGElement> & {
  name: string
  size?: number
  title?: string
}

/** Accessible, offline-friendly SVG icon. Unknown sport names render a neutral fallback. */
export function SportIcon({ name, size = 40, title, ...props }: SportIconProps) {
  const id = getSportIconId(name)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title ?? name}
      focusable="false"
      {...props}
    >
      {id
        ? <use href={`/assets/sports/sport-icons.svg#${id}`} />
        : <><rect x="1" y="1" width="62" height="62" rx="16" fill="#F1F5F9" /><text x="32" y="41" textAnchor="middle" fontSize="24" fill="#64748B">•</text></>}
    </svg>
  )
}
