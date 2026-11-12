import { useState, useMemo, useEffect, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { fetchCoaches } from '../../integrations/supabase/public-client'
import {
  COACH_SPORTS,
  COACH_CREDENTIALS,
  COACH_CITIES,
  type VerifiedCoach,
  type CredentialAuthority,
} from './coachesData'
import CoachInquiryModal from './CoachInquiryModal'
import { BookmarkButton } from '../../shared/components/BookmarkButton'
import { createCoachSavedItem } from '../../shared/services/savedService'
import { DirectoryCallout } from '../../shared/components/DirectoryCallout'
import './CoachesPage.css'

export interface CoachesPageProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void
  onOpenCoachIntake?: () => void
}

export function CoachesPage({ onNavigate }: CoachesPageProps) {
  const [coaches, setCoaches] = useState<VerifiedCoach[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedSport, setSelectedSport] = useState<string>('All Sports')
  const [selectedCredential, setSelectedCredential] = useState<CredentialAuthority>('all')
  const [selectedCity, setSelectedCity] = useState<string>('All Cities')
  const [selectedFee, setSelectedFee] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortBy, setSortBy] = useState<'experience' | 'rating' | 'fee' | 'name'>('experience')
  const [activeCoachForModal, setActiveCoachForModal] = useState<VerifiedCoach | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchCoaches({
      sport: selectedSport,
      city: selectedCity,
      credential: selectedCredential,
      feeRange: selectedFee,
    }).then(res => {
      if (!active) return
      if (res.status === 'ready') {
        const mapped: VerifiedCoach[] = res.data.map(c => ({
          id: c.id,
          slug: c.slug,
          name: c.name || c.display_name,
          sport: c.sport || 'Multi-Sport',
          sportCategory: c.sportCategory || c.sport || 'Multi-Sport',
          certification: c.certification || 'Qualification not supplied',
          credentialAuthority: (c.credential_authority || c.credentialAuthority || 'all') as CredentialAuthority,
          authorityLabel: c.authority_label || c.authorityLabel || 'Issuing authority not supplied',
          city: c.city,
          state: c.state || '',
          experienceYears: c.experience_years ?? c.experienceYears ?? 0,
          academyAffiliation: c.academy_affiliation || c.academyAffiliation || 'Affiliation not supplied',
          monthlyFee: c.monthly_fee || c.monthlyFee || 'Fee not supplied',
          feeRangeCategory: (c.fee_range_category || c.feeRangeCategory || 'unknown') as VerifiedCoach['feeRangeCategory'],
          studentTrackRecord: c.student_track_record || c.studentTrackRecord || '',
          specialties: c.specialties || [],
          languages: c.languages || [],
          rating: Number(c.rating || 0),
          reviewCount: c.review_count ?? c.reviewCount ?? 0,
          verifiedBadge: c.verified_badge || c.verifiedBadge || 'Evidence reviewed',
          bio: c.bio || '',
          availableForOneOnOne: c.available_one_on_one ?? c.availableForOneOnOne ?? false,
          availableForBatches: c.available_batches ?? c.availableForBatches ?? false,
        }))
        setCoaches(mapped)
      }
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [selectedSport, selectedCity, selectedCredential, selectedFee])

  const handleLinkClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (onNavigate) {
      onNavigate(event, href)
    }
  }

  // Filter and sort coaches
  const filteredCoaches = useMemo(() => {
    return coaches.filter(coach => {
      // Sport filter
      if (selectedSport !== 'All Sports' && coach.sport !== selectedSport) {
        return false
      }

      // Credential authority filter
      if (selectedCredential !== 'all' && coach.credentialAuthority !== selectedCredential) {
        return false
      }

      // City filter
      if (selectedCity !== 'All Cities' && coach.city !== selectedCity) {
        return false
      }

      // Fee filter
      if (selectedFee !== 'all') {
        if (selectedFee === 'under-3k' && coach.feeRangeCategory !== 'under-3k' && coach.feeRangeCategory !== 'subsidized') {
          return false
        }
        if (selectedFee === '3k-7k' && coach.feeRangeCategory !== '3k-7k') {
          return false
        }
        if (selectedFee === 'premium' && coach.feeRangeCategory !== 'premium') {
          return false
        }
        if (selectedFee === 'subsidized' && coach.feeRangeCategory !== 'subsidized') {
          return false
        }
        if (selectedFee === 'unknown' && coach.feeRangeCategory !== 'unknown') {
          return false
        }
      }

      // Search query across name, sport, city, bio, specialties, academy
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const textToMatch = [
          coach.name,
          coach.sport,
          coach.city,
          coach.state,
          coach.academyAffiliation,
          coach.certification,
          coach.studentTrackRecord,
          coach.bio,
          ...coach.specialties,
          ...coach.languages,
        ]
          .join(' ')
          .toLowerCase()

        if (!textToMatch.includes(q)) {
          return false
        }
      }

      return true
    }).sort((a, b) => {
      if (sortBy === 'experience') {
        return b.experienceYears - a.experienceYears
      }
      if (sortBy === 'rating') {
        return b.rating - a.rating || b.reviewCount - a.reviewCount
      }
      if (sortBy === 'fee') {
        const getFeeValue = (fee: string) => {
          const num = fee.replace(/[^0-9]/g, '')
          return num ? parseInt(num, 10) : 0
        }
        return getFeeValue(a.monthlyFee) - getFeeValue(b.monthlyFee)
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name)
      }
      return 0
    })
  }, [coaches, selectedSport, selectedCredential, selectedCity, selectedFee, searchQuery, sortBy])

  const handleResetFilters = () => {
    setSelectedSport('All Sports')
    setSelectedCredential('all')
    setSelectedCity('All Cities')
    setSelectedFee('all')
    setSearchQuery('')
    setSortBy('experience')
  }

  const isFiltered =
    selectedSport !== 'All Sports' ||
    selectedCredential !== 'all' ||
    selectedCity !== 'All Cities' ||
    selectedFee !== 'all' ||
    searchQuery.trim() !== ''

  return (
    <div className="coaches-page-root">
      {/* Breadcrumb */}
      <nav className="coaches-breadcrumb" aria-label="Breadcrumb">
        <a href="/" onClick={e => handleLinkClick(e, '/')}>
          Home
        </a>
        <span>/</span>
        <a href="/play" onClick={e => handleLinkClick(e, '/play')}>
          Play &amp; Train
        </a>
        <span>/</span>
        <span aria-current="page">Coaches Directory</span>
      </nav>

      {/* Hero Header */}
      <header className="coaches-hero">
        <span className="coaches-eyebrow">
          <SiteIcon name="award" size={13} />
          <span>Coach directory · evidence-led profiles</span>
        </span>

        <h1 className="coaches-title">Find a coach. Check the credentials.</h1>

        <p className="coaches-subtitle">
          Explore published coach profiles by sport, qualification, location and training information. A credential is shown as verified only after supporting evidence has been reviewed. Confirm current availability and fees directly with the coach.
        </p>
      </header>

      <DirectoryCallout
        variant="coach"
        tag="Free coach listing"
        title="Are you a sports coach? Get listed at no charge."
        description="Submit your professional profile and qualification evidence. KhelGrid reviews credentials before publishing a verified claim."
        buttonLabel="Submit coach listing"
        buttonHref="/submit-listing"
        onNavigate={onNavigate}
      />

      {/* Sport Category Filter Tabs */}
      <div className="coaches-sport-pills" role="tablist" aria-label="Filter by sport">
        {COACH_SPORTS.map(sport => (
          <button
            key={sport}
            type="button"
            role="tab"
            aria-selected={selectedSport === sport}
            className={`coaches-sport-pill ${selectedSport === sport ? 'is-active' : ''}`}
            onClick={() => setSelectedSport(sport)}
          >
            {sport}
          </button>
        ))}
      </div>

      {/* Search and Filters Control Toolbar */}
      <div className="coaches-controls-bar">
        <div className="coaches-search-row">
          <div className="coaches-search-input-wrap">
            <SiteIcon name="search" size={16} className="coaches-search-icon" />
            <input
              type="search"
              className="coaches-search-input"
              placeholder="Search by coach name, academy, specialty (e.g. pace bowling, footwork), or city..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Search coaches"
            />
          </div>
        </div>

        <div className="coaches-filters-row">
          {/* Credentials Authority Filter */}
          <select
            className="coaches-select"
            value={selectedCredential}
            onChange={e => setSelectedCredential(e.target.value as CredentialAuthority)}
            aria-label="Filter by certification authority"
          >
            {COACH_CREDENTIALS.map(cred => (
              <option key={cred.id} value={cred.id}>
                {cred.label}
              </option>
            ))}
          </select>

          {/* City Filter */}
          <select
            className="coaches-select"
            value={selectedCity}
            onChange={e => setSelectedCity(e.target.value)}
            aria-label="Filter by city"
          >
            {COACH_CITIES.map(city => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>

          {/* Fee Range Filter */}
          <select
            className="coaches-select"
            value={selectedFee}
            onChange={e => setSelectedFee(e.target.value)}
            aria-label="Filter by monthly fee range"
          >
            <option value="all">All Monthly Fees</option>
            <option value="under-3k">Under ₹3,000 / month</option>
            <option value="3k-7k">₹3,000 – ₹7,000 / month</option>
            <option value="premium">Premium (₹7,000+ / month)</option>
            <option value="subsidized">Govt. Subsidized / Free</option>
            <option value="unknown">Fee not disclosed</option>
          </select>

          {/* Sort By */}
          <select
            className="coaches-select"
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'experience' | 'rating' | 'fee' | 'name')}
            aria-label="Sort coaches directory"
          >
            <option value="experience">Sort: Experience (High to Low)</option>
            <option value="rating">Sort: Highest Rating First</option>
            <option value="fee">Sort: Monthly Fee (Low to High)</option>
            <option value="name">Sort: Name (A to Z)</option>
          </select>
        </div>
      </div>

      {/* Results Count Header */}
      <div className="coaches-results-header">
        <div>
          {loading ? (
            <span>Updating coaches directory…</span>
          ) : (
            <>
              Showing <span className="coaches-count-highlight">{filteredCoaches.length}</span> verified{' '}
              {filteredCoaches.length === 1 ? 'coach' : 'coaches'}
              {selectedSport !== 'All Sports' && ` in ${selectedSport}`}
              {selectedCity !== 'All Cities' && ` in ${selectedCity}`}
            </>
          )}
        </div>

        {isFiltered && (
          <button
            type="button"
            className="coaches-btn-reset"
            onClick={handleResetFilters}
          >
            <SiteIcon name="close" size={13} />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Coach Cards Grid */}
      {filteredCoaches.length > 0 ? (
        <div className="coaches-grid">
          {filteredCoaches.map(coach => (
            <article key={coach.id} className="coach-card">
              <div>
                {/* Card Header & Badges */}
                <div className="coach-card-header">
                  <div className="coach-badge-row">
                    <span className="coach-sport-badge">{coach.sport}</span>
                    <span className="coach-verified-pill">
                      <SiteIcon name="check-circle" size={11} />
                      <span>{coach.verifiedBadge}</span>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {coach.rating > 0 && coach.reviewCount > 0 && (
                      <div className="coach-rating-badge" title={`${coach.reviewCount} reviews`}>
                        <SiteIcon name="star" size={12} style={{ fill: '#f59e0b', color: '#f59e0b' }} />
                        <span>{coach.rating.toFixed(1)} · {coach.reviewCount}</span>
                      </div>
                    )}
                    <BookmarkButton item={createCoachSavedItem(coach)} />
                  </div>
                </div>

                {/* Coach Name & Certification */}
                <h2 className="coach-name">{coach.name}</h2>
                <div className="coach-cert-line">{coach.certification}</div>

                {/* Metadata List */}
                <div className="coach-meta-list">
                  <div className="coach-meta-row">
                    <SiteIcon name="map-pin" size={14} />
                    <span>{[coach.city, coach.state].filter(Boolean).join(', ') || 'Location not supplied'}</span>
                  </div>

                  <div className="coach-meta-row">
                    <SiteIcon name="building" size={14} />
                    <span>{coach.academyAffiliation}</span>
                  </div>

                  <div className="coach-meta-row">
                    <SiteIcon name="wallet" size={14} />
                    <span className="coach-meta-fee">{coach.monthlyFee}</span>
                    {coach.experienceYears > 0 && (
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        ({coach.experienceYears} years coaching experience)
                      </span>
                    )}
                  </div>
                </div>

                {/* Student Track Record */}
                {coach.studentTrackRecord && (
                  <div className="coach-track-record-box">
                    <span className="coach-track-record-label">Student Track Record</span>
                    <span>{coach.studentTrackRecord}</span>
                  </div>
                )}

                {/* Specialties Tags */}
                {coach.specialties.length > 0 && (
                  <div className="coach-specialties-row">
                    {coach.specialties.map(spec => (
                      <span key={spec} className="coach-spec-tag">
                        {spec}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer: Languages & CTA */}
              <div className="coach-card-footer">
                {coach.languages.length > 0 && (
                  <div className="coach-languages-text">
                    <span>Languages: <strong>{coach.languages.join(', ')}</strong></span>
                  </div>
                )}

                <button
                  type="button"
                  className="coach-btn-connect"
                  onClick={() => setActiveCoachForModal(coach)}
                  aria-label={`Connect with ${coach.name}`}
                >
                  <span>View contact options</span>
                  <SiteIcon name="arrow-right" size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="coaches-empty-state">
          <div className="coaches-empty-icon">
            <SiteIcon name="search" size={40} />
          </div>
          <h2 className="coaches-empty-title">
            {loading ? 'Loading reviewed coach profiles…' : coaches.length ? 'No matching coaches found' : 'No verified coach profiles published yet'}
          </h2>
          <p className="coaches-empty-sub">
            {loading
              ? 'Please wait while the public directory is refreshed.'
              : coaches.length
                ? 'Try adjusting your sport, city, or credential selections.'
                : 'Coach submissions are free. Share a professional profile and qualification evidence to start the review process.'}
          </p>
          <button
            type="button"
            className="coach-btn-submit"
            onClick={handleResetFilters}
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* Inquiry Modal */}
      <CoachInquiryModal
        coach={activeCoachForModal}
        isOpen={Boolean(activeCoachForModal)}
        onClose={() => setActiveCoachForModal(null)}
      />
    </div>
  )
}

export default CoachesPage
