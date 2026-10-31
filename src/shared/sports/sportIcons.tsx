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
      {id ? (
        <use href={`/assets/sports/sport-icons.svg#${id}`} />
      ) : (
        <g>
          <rect x="2" y="2" width="60" height="60" rx="16" fill="#F0FDF4" stroke="#86EFAC" strokeWidth="2" />
          <path
            d="M20 18h24v7c0 6.6-5.4 12-12 12s-12-5.4-12-12v-7zm-4 4h4v7c0 2.8-1 5.3-2.6 7.2V22zm28 0h4v14.2c-1.6-1.9-2.6-4.4-2.6-7.2v-7zM28 39h8v7h-8v-7zm-6 7h20v4H22v-4z"
            fill="#0F766E"
          />
        </g>
      )}
    </svg>
  )
}
