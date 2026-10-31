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
  address: string | null
  timezone: string
  government_facility?: boolean
  is_featured?: boolean
  sports?: Sport[]
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

