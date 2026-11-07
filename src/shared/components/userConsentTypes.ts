export type UserRole = 'athlete' | 'parent' | 'turf_player' | 'coach_scout'

export interface UserConsentPreferences {
  essential: boolean
  locationDiscovery: boolean
  realtimeAlerts: boolean
}

export interface UserConsentData {
  accepted: boolean
  version: string
  timestamp: string
  preferences: UserConsentPreferences
}

export interface UserSportsPassData {
  role: UserRole
  sports: string[]
  city: string
  updatedAt: string
}

export const USER_CONSENT_STORAGE_KEY = 'khelgrid_user_policy_consent_v1'
export const CURRENT_CONSENT_VERSION = '2026.1'
export const USER_SPORTS_PASS_STORAGE_KEY = 'khelgrid_user_sports_pass_v1'

export const SPORTS_PASS_ROLES: Array<{
  id: UserRole
  icon: string
  title: string
  vernacular: string
  desc: string
}> = [
  {
    id: 'athlete',
    icon: 'user-round',
    title: "I'm an Athlete / Player",
    vernacular: 'एथलीट / खिलाड़ी',
    desc: 'Open selection trials, academies, tournaments & Sports CV',
  },
  {
    id: 'parent',
    icon: 'users',
    title: 'Sports Parent',
    vernacular: 'माता-पिता / अभिभावक',
    desc: 'Verified junior academies, safe coaching & age cut-off guidance',
  },
  {
    id: 'turf_player',
    icon: 'sports',
    title: 'Turf & Weekend Player',
    vernacular: 'टर्फ खिलाड़ी',
    desc: 'Instant turf booking deals, box cricket & pickup games nearby',
  },
  {
    id: 'coach_scout',
    icon: 'award',
    title: 'Coach / Academy / Scout',
    vernacular: 'कोच व स्काउट',
    desc: 'Talent discovery, facility admissions & certified coaching roster',
  },
]

export const SPORTS_PASS_DISCIPLINES: Array<{
  id: string
  name: string
  vernacular: string
  emoji: string
}> = [
  { id: 'cricket', name: 'Cricket', vernacular: 'क्रिकेट', emoji: '🏏' },
  { id: 'football', name: 'Football', vernacular: 'फुटबॉल', emoji: '⚽' },
  { id: 'badminton', name: 'Badminton', vernacular: 'बैडमिंटन', emoji: '🏸' },
  { id: 'kabaddi', name: 'Kabaddi', vernacular: 'कबड्डी', emoji: '🤼' },
  { id: 'athletics', name: 'Athletics', vernacular: 'एथलेटिक्स', emoji: '🏃' },
  { id: 'boxing', name: 'Boxing', vernacular: 'मुक्केबाज़ी', emoji: '🥊' },
  { id: 'wrestling', name: 'Wrestling', vernacular: 'कुश्ती / दंगल', emoji: '🤼' },
  { id: 'tennis', name: 'Tennis', vernacular: 'टेनिस', emoji: '🎾' },
  { id: 'swimming', name: 'Swimming', vernacular: 'तैराकी', emoji: '🏊' },
  { id: 'basketball', name: 'Basketball', vernacular: 'बास्केटबॉल', emoji: '🏀' },
  { id: 'table_tennis', name: 'Table Tennis', vernacular: 'टेबल टेनिस', emoji: '🏓' },
  { id: 'volleyball', name: 'Volleyball', vernacular: 'वॉलीबॉल', emoji: '🏐' },
]

export const SPORTS_PASS_CITIES = [
  'Delhi NCR',
  'Bengaluru',
  'Mumbai',
  'Hyderabad',
  'Kolkata',
  'Pune',
  'Chennai',
  'Ahmedabad',
  'Chandigarh / Patiala',
  'Jaipur',
  'All India',
]
