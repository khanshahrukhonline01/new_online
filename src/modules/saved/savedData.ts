export type SavedItemCategory = 'all' | 'trials' | 'academies' | 'venues' | 'coaches' | 'pickup' | 'papers'

export interface SavedItem {
  id: string
  title: string
  category: 'trial' | 'academy' | 'venue' | 'coach' | 'pickup' | 'paper'
  categoryLabel: string
  sport: string
  city: string
  location?: string
  dateOrDeadline?: string
  deadlineDate?: string // ISO date string for urgency sorting
  badgeText?: string
  feeOrPrice?: string
  rating?: number
  organizerOrAuthor?: string
  href: string
  savedAt: string
}

export const BASELINE_SAVED_ITEMS: SavedItem[] = [
  {
    id: 'opp-sai-football-delhi',
    title: 'SAI National Center of Excellence U-17 Football Selection Trials',
    category: 'trial',
    categoryLabel: 'Selection Trial',
    sport: 'Football',
    city: 'Delhi NCR',
    location: 'Jawaharlal Nehru Stadium, Gate 8, New Delhi',
    dateOrDeadline: 'Closing in 3 days · 22 Nov 2026',
    deadlineDate: '2026-11-22T18:00:00+05:30',
    badgeText: 'Verified SAI Trial',
    feeOrPrice: 'Free (SAI Sanctioned)',
    organizerOrAuthor: 'Sports Authority of India (SAI)',
    href: '/opportunities',
    savedAt: '2026-11-06T14:20:00Z',
  },
  {
    id: 'opp-bcci-nca-cricket',
    title: 'BCCI NCA Fast Bowling & Spin Talent Combine (U-19 / U-23)',
    category: 'trial',
    categoryLabel: 'Selection Trial',
    sport: 'Cricket',
    city: 'Bengaluru',
    location: 'National Cricket Academy (NCA), M. Chinnaswamy Stadium, Bengaluru',
    dateOrDeadline: 'Closing in 7 days · 28 Nov 2026',
    deadlineDate: '2026-11-28T23:59:00+05:30',
    badgeText: 'BCCI Affiliated',
    feeOrPrice: 'Free (Nomination/Open)',
    organizerOrAuthor: 'BCCI National Cricket Academy',
    href: '/opportunities',
    savedAt: '2026-11-05T09:15:00Z',
  },
  {
    id: 'opp-pbla-badminton',
    title: 'Padukone-Dravid Centre of Sports Excellence Badminton Trials',
    category: 'trial',
    categoryLabel: 'Selection Trial',
    sport: 'Badminton',
    city: 'Bengaluru',
    location: 'Prakash Padukone Badminton Academy, CSE, Yelahanka, Bengaluru',
    dateOrDeadline: 'Closing in 14 days · 05 Dec 2026',
    deadlineDate: '2026-12-05T17:00:00+05:30',
    badgeText: 'Elite Scholarship',
    feeOrPrice: '₹500 Application Fee',
    organizerOrAuthor: 'Prakash Padukone Badminton Academy',
    href: '/opportunities',
    savedAt: '2026-11-04T18:30:00Z',
  },
  {
    id: 'acad-bfc-bengaluru',
    title: 'Bengaluru FC Youth Academy',
    category: 'academy',
    categoryLabel: 'Sports Academy',
    sport: 'Football',
    city: 'Bengaluru',
    location: 'Bellary Road, Bengaluru, Karnataka 560064',
    badgeText: 'AIFF 3-Star Academy',
    rating: 4.9,
    organizerOrAuthor: 'Bengaluru FC Football Development',
    href: '/academies/bengaluru-fc-academy',
    savedAt: '2026-11-03T11:00:00Z',
  },
  {
    id: 'acad-mary-kom-boxing',
    title: 'Mary Kom Regional Boxing Foundation',
    category: 'academy',
    categoryLabel: 'Sports Academy',
    sport: 'Boxing',
    city: 'Imphal',
    location: 'National Games Village, Imphal West, Manipur',
    badgeText: 'SAI Accredited Academy',
    rating: 4.8,
    organizerOrAuthor: 'Mary Kom Boxing Foundation',
    href: '/academies',
    savedAt: '2026-11-02T16:45:00Z',
  },
  {
    id: 'venue-kanteerava-bengaluru',
    title: 'Sree Kanteerava Stadium & Synthetic Athletics Complex',
    category: 'venue',
    categoryLabel: 'Sports Venue',
    sport: 'Athletics',
    city: 'Bengaluru',
    location: 'Kasturba Road, Sampangi Rama Nagara, Bengaluru',
    badgeText: 'Govt. International Arena',
    rating: 4.7,
    feeOrPrice: '₹150 / slot',
    href: '/venues/sree-kanteerava-stadium',
    savedAt: '2026-11-01T20:10:00Z',
  },
  {
    id: 'coach-gursharan-singh-cricket',
    title: 'Coach Gursharan Singh',
    category: 'coach',
    categoryLabel: 'Certified Coach',
    sport: 'Cricket',
    city: 'Delhi NCR',
    location: 'National Cricket Academy & DDA Sports Complex, New Delhi',
    dateOrDeadline: 'Available for 1-on-1 & Batches',
    badgeText: 'BCCI Level 3 Elite Coach',
    rating: 4.9,
    feeOrPrice: '₹4,500 / month',
    organizerOrAuthor: 'BCCI Level 3 Senior Coach',
    href: '/coaches',
    savedAt: '2026-11-05T14:00:00Z',
  },
  {
    id: 'game-bandra-football',
    title: 'Bandra 5v5 Turf Friday Night Football',
    category: 'pickup',
    categoryLabel: 'Community Match',
    sport: 'Football',
    city: 'Mumbai',
    location: 'St. Andrews Turf, Bandra West, Mumbai',
    dateOrDeadline: 'Tomorrow · 08:30 PM',
    deadlineDate: '2026-11-08T20:30:00+05:30',
    badgeText: '3 Spots Open',
    feeOrPrice: '₹350 / player',
    organizerOrAuthor: 'Host: Rahul V. (Verified)',
    href: '/play',
    savedAt: '2026-11-06T19:00:00Z',
  },
  {
    id: 'paper-kinematic-lumbar-fast-bowlers',
    title: 'Kinematic Correlates of Lumbar Spine Stress and Ball Release Velocity in Indian Junior Fast Bowlers',
    category: 'paper',
    categoryLabel: 'Research Preprint',
    sport: 'Cricket Biomechanics',
    city: 'NIS Patiala',
    badgeText: 'KG-2026-001 · Diamond Open Access',
    organizerOrAuthor: 'Dr. Vikramaditya Rathore & Dr. Alok Sen',
    href: '/khelchronicle/kinematic-correlates-lumbar-spine-stress-fast-bowlers',
    savedAt: '2026-11-04T12:00:00Z',
  },
]

export const STORAGE_SAVED_KEY = 'khelgrid_saved_items'
export const STORAGE_CHRONICLE_KEY = 'khelgrid_chronicle_bookmarks'

/**
 * Generates an RFC 5545 compliant .ics iCalendar file for saved sports trials
 */
export function generateTrialIcsCalendar(trials: SavedItem[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KhelGrid//Sports Trial Calendar v2026//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:KhelGrid Saved Sports Trials',
    'X-WR-TIMEZONE:Asia/Kolkata',
  ]

  trials.forEach(trial => {
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const deadline = trial.deadlineDate ? new Date(trial.deadlineDate) : new Date(Date.now() + 7 * 86400000)
    const startStr = deadline.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const endStr = new Date(deadline.getTime() + 2 * 3600000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:khelgrid-${trial.id}@khelgrid.com`)
    lines.push(`DTSTAMP:${now}`)
    lines.push(`DTSTART:${startStr}`)
    lines.push(`DTEND:${endStr}`)
    lines.push(`SUMMARY:🏅 Trial Deadline: ${trial.title.replace(/[,;]/g, ' ')}`)
    lines.push(`LOCATION:${(trial.location || trial.city).replace(/[,;]/g, ' ')}`)
    lines.push(`DESCRIPTION:Sports Selection Trial for ${trial.sport} in ${trial.city}. Verified on KhelGrid.\\nOrganizer: ${trial.organizerOrAuthor || 'Official Association'}`)
    lines.push('STATUS:CONFIRMED')
    lines.push('BEGIN:VALARM')
    lines.push('TRIGGER:-P1D')
    lines.push('ACTION:DISPLAY')
    lines.push('DESCRIPTION:Reminder: Trial registration cutoff tomorrow!')
    lines.push('END:VALARM')
    lines.push('END:VEVENT')
  })

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}
