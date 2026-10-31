export interface Sport {
  id: string
  slug: string
  name: string
}

export interface Opportunity {
  id: string
  slug: string
  title: string
  opportunity_type: 'trial' | 'combine' | 'scholarship' | 'camp' | 'job' | 'other'
  organizer_name: string | null
  city: string | null
  venue_name: string | null
  starts_at: string | null
  ends_at: string | null
  application_deadline: string | null
  source_url: string | null
  source_name: string | null
  verification_status: 'unverified' | 'pending_review' | 'verified' | 'rejected'
  registration_fee?: number
  available_spots?: number | null
  age_category?: string | null
  gender?: string | null
  eligibility_criteria?: string | null
  required_documents?: string[]
  metadata?: Record<string, unknown>
  is_featured?: boolean
  sport?: Sport
}

export interface Venue {
  id: string
  slug: string
  name: string
  description: string | null
  city: string
  state?: string | null
  address: string | null
  timezone: string
  government_facility?: boolean
  is_featured?: boolean
  sports?: Sport[]
  sport?: string
  phone?: string | null
  email?: string | null
  timings?: string | null
  surface_type?: string | null
  court_count?: string | null
  pricing?: string | null
  facilities?: string[]
  rules?: string[]
  rating?: number
  review_count?: number
}

export interface Academy {
  id: string
  slug: string
  name: string
  description: string | null
  city: string
  state: string | null
  website_url: string | null
  public_contact_url: string | null
  verification_status: 'unverified' | 'pending_review' | 'verified' | 'rejected'
  is_featured?: boolean
  sport?: string
  sports?: Sport[] | string[]
  address?: string | null
  phone?: string | null
  email?: string | null
  head_coach?: string | null
  facilities?: string[]
  age_groups?: string[]
  timings?: string | null
  fee_structure?: string | null
  admission_open?: boolean
  rating?: number
  review_count?: number
}

export interface Coach {
  id: string
  slug: string
  display_name: string
  bio: string | null
  city: string
  state: string | null
  website_url: string | null
  public_contact_url: string | null
  verification_status: 'unverified' | 'pending_review' | 'verified' | 'rejected'
  sports?: Sport[]
}

export interface EventItem {
  id: string
  slug: string
  title: string
  event_type: 'tournament' | 'camp' | 'league' | 'workshop' | 'meetup' | 'other'
  organizer_name: string | null
  city: string | null
  venue_name: string | null
  starts_at: string
  ends_at: string | null
  source_url: string | null
  source_name: string | null
  verification_status: 'unverified' | 'pending_review' | 'verified' | 'rejected'
}

export interface VideoClip {
  id: string
  title: string
  clipType:
    | 'bowling-action'
    | 'sprint-mechanics'
    | 'jump-power'
    | 'match-highlight'
    | 'skill-footwork'
    | 'batting-stroke'
    | 'technique-drill'
    | 'other'
  videoUrl: string
  durationSeconds?: number
  description?: string
  telemetry?: {
    metricName: string
    metricValue: string
  }[]
}

export interface PickupGame {
  id: string
  slug?: string
  sport: string
  emoji?: string
  skill_level?: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels'
  skillLevel?: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels'
  venue_name?: string
  venueName?: string
  city: string
  time_label?: string
  timeLabel?: string
  host_name?: string
  hostName?: string
  price_per_player?: string
  pricePerPlayer?: string
  spots_open?: number
  spotsOpen?: number
  total_players?: number
  totalPlayers?: number
  confirmed_players?: number
  confirmedPlayers?: number
  is_featured?: boolean
  publication_status?: string
}

export interface AthleteProfile {
  id: string
  userId?: string
  username: string
  fullName: string
  sport: string
  playingPosition: string
  city: string
  state?: string
  dateOfBirth?: string
  age?: number
  email?: string
  phone?: string
  teamOrAcademy?: string
  coach?: string
  experienceYears?: string
  primaryFootOrHand?: string
  heightCm?: number
  weightKg?: number
  summary?: string
  achievements: { year: string; event: string; result: string }[]
  videoClips: VideoClip[]
  fitnessBenchmarks?: {
    yoyoIr1Meters?: number
    sprint30mSeconds?: number
    cmjHeightCm?: number
    tier?: string
    percentileAvg?: number
  }
  verificationStatus: 'community' | 'verified' | 'pro'
  createdAt: string
  updatedAt: string
}

export interface TrialReminder {
  id: string
  trialSlug: string
  trialTitle: string
  startsAt?: string | null
  deadlineDate?: string | null
  city?: string | null
  venueName?: string | null
  notificationType: 'whatsapp' | 'google-calendar' | 'ical'
  createdAt: string
}

