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
}
