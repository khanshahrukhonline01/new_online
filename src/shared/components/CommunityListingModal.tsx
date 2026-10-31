import { useState, useEffect, useRef, type FormEvent, type MouseEvent } from 'react'
import { SiteIcon } from './SiteIcon'
import {
  submitCommunityListing,
  type CommunityListingCategory,
  type CommunityListingInput,
} from '../../integrations/supabase/public-client'
import './CommunityListingModal.css'

export interface CommunityListingModalProps {
  isOpen: boolean
  onClose: () => void
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
  defaultCategory?: CommunityListingCategory
}

const COMMON_CITIES = [
  'Bengaluru',
  'Delhi',
  'Mumbai',
  'Kolkata',
  'Chennai',
  'Hyderabad',
  'Pune',
  'Kochi',
  'Ahmedabad',
  'Chandigarh',
  'Jaipur',
  'Lucknow',
  'Bhubaneswar',
  'Guwahati',
  'Indore',
  'Dehradun',
]

const COMMON_SPORTS = [
  'Football',
  'Cricket',
  'Badminton',
  'Basketball',
  'Tennis',
  'Pickleball',
  'Table Tennis',
  'Swimming',
  'Athletics',
  'Box Cricket',
]

export default function CommunityListingModal({
  isOpen,
  onClose,
  onNavigate,
  defaultCategory = 'pickup_game',
}: CommunityListingModalProps) {
  const [category, setCategory] = useState<CommunityListingCategory>(defaultCategory)

  // Common fields
  const [city, setCity] = useState('')
  const [sport, setSport] = useState('')
  const [description, setDescription] = useState('')

  // Academy fields
  const [academyName, setAcademyName] = useState('')
  const [state, setState] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')

  // Venue fields
  const [venueName, setVenueName] = useState('')
  const [address, setAddress] = useState('')

  // Opportunity fields
  const [oppTitle, setOppTitle] = useState('')
  const [oppType, setOppType] = useState<'trial' | 'combine' | 'scholarship' | 'camp' | 'other'>('trial')
  const [oppVenue, setOppVenue] = useState('')
  const [organizer, setOrganizer] = useState('')
  const [regFee, setRegFee] = useState('')
  const [ageCategory, setAgeCategory] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')

  // Pickup game fields
  const [pickupVenue, setPickupVenue] = useState('')
  const [timeLabel, setTimeLabel] = useState('')
  const [skillLevel, setSkillLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels'>('Intermediate')
  const [hostName, setHostName] = useState('')
  const [pricePerPlayer, setPricePerPlayer] = useState('₹200/player')
  const [spotsOpen, setSpotsOpen] = useState(4)
  const [totalPlayers, setTotalPlayers] = useState(10)
  const [emoji, setEmoji] = useState('⚽')

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successResult, setSuccessResult] = useState<{
    category: CommunityListingCategory
    name: string
    city: string
    directoryPath: string
  } | null>(null)

  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (defaultCategory) setCategory(defaultCategory)
  }, [defaultCategory])

  useEffect(() => {
    if (!isOpen) {
      setError('')
      return
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  function resetForm() {
    setCity('')
    setSport('')
    setDescription('')
    setAcademyName('')
    setState('')
    setWebsiteUrl('')
    setVenueName('')
    setAddress('')
    setOppTitle('')
    setOppVenue('')
    setOrganizer('')
    setRegFee('')
    setAgeCategory('')
    setSourceUrl('')
    setPickupVenue('')
    setTimeLabel('')
    setHostName('')
    setPricePerPlayer('₹200/player')
    setSpotsOpen(4)
    setTotalPlayers(10)
    setError('')
    setSuccessResult(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      let input: CommunityListingInput
      let directoryPath = '/'
      let createdName = ''

      if (category === 'academy') {
        input = {
          category: 'academy',
          name: academyName,
          city,
          sport: sport || undefined,
          state: state || undefined,
          description: description || undefined,
          website_url: websiteUrl || undefined,
        }
        directoryPath = '/academies'
        createdName = academyName
      } else if (category === 'venue') {
        input = {
          category: 'venue',
          name: venueName,
          city,
          sport: sport || undefined,
          address: address || undefined,
          description: description || undefined,
        }
        directoryPath = '/venues'
        createdName = venueName
      } else if (category === 'opportunity') {
        input = {
          category: 'opportunity',
          title: oppTitle,
          opportunity_type: oppType,
          sport: sport || undefined,
          city,
          venue_name: oppVenue || undefined,
          organizer_name: organizer || undefined,
          registration_fee: regFee || undefined,
          age_category: ageCategory || undefined,
          source_url: sourceUrl || undefined,
        }
        directoryPath = '/opportunities'
        createdName = oppTitle
      } else {
        input = {
          category: 'pickup_game',
          sport: sport || 'Football',
          emoji,
          venue_name: pickupVenue,
          city,
          time_label: timeLabel,
          skill_level: skillLevel,
          host_name: hostName || undefined,
          price_per_player: pricePerPlayer || 'Free',
          spots_open: spotsOpen,
          total_players: totalPlayers,
        }
        directoryPath = '/play'
        createdName = `${input.sport} at ${pickupVenue}`
      }

      const result = await submitCommunityListing(input)

      if (result.status === 'submitted') {
        setSuccessResult({
          category,
          name: createdName,
          city,
          directoryPath,
        })
      } else {
        setError(result.message)
      }
    } catch {
      setError('An unexpected error occurred while submitting your listing. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleOverlayClick(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="community-intake-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="community-intake-title"
      onClick={handleOverlayClick}
    >
      <div className="community-intake-modal" ref={modalRef}>
        <button
          className="community-intake-close"
          onClick={onClose}
          type="button"
          aria-label="Close intake modal"
        >
          <SiteIcon name="close" size={20} />
        </button>

        {successResult ? (
          <div className="community-intake-success">
            <div className="community-intake-success-icon">
              <SiteIcon name="check-circle" size={48} />
            </div>
            <h2 id="community-intake-title">Your listing is live on KhelGrid!</h2>
            <p className="community-intake-success-desc">
              <strong>{successResult.name}</strong> has been published in <strong>{successResult.city}</strong>.
              It is now immediately discoverable on the homepage rail, city directories, and sports catalogue.
            </p>

            <div className="community-intake-success-actions">
              <a
                href={successResult.directoryPath}
                className="community-intake-btn-primary"
                onClick={e => {
                  if (onNavigate) {
                    onNavigate(e, successResult.directoryPath)
                  }
                  onClose()
                }}
              >
                <span>View in Directory</span>
                <SiteIcon name="arrow-up-right" size={16} />
              </a>

              <button
                type="button"
                className="community-intake-btn-secondary"
                onClick={resetForm}
              >
                + Add Another Listing
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="community-intake-header">
              <span className="community-intake-eyebrow">
                <SiteIcon name="sparkles" size={14} /> KHELGRID · COMMUNITY INTAKE
              </span>
              <h2 id="community-intake-title">+ List on KhelGrid</h2>
              <p className="community-intake-subtitle">
                Publish a new sports academy, turf arena, selection trial, or pickup match. Automatically live across the entire grid without code changes.
              </p>
            </div>

            {/* Category Switcher Tabs */}
            <div className="community-intake-tabs" role="tablist" aria-label="Listing categories">
              <button
                type="button"
                role="tab"
                aria-selected={category === 'pickup_game'}
                className={`community-intake-tab ${category === 'pickup_game' ? 'is-active' : ''}`}
                onClick={() => { setCategory('pickup_game'); setError('') }}
              >
                <span className="tab-emoji">⚽</span>
                <span>Pickup Game</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={category === 'opportunity'}
                className={`community-intake-tab ${category === 'opportunity' ? 'is-active' : ''}`}
                onClick={() => { setCategory('opportunity'); setError('') }}
              >
                <span className="tab-emoji">🏆</span>
                <span>Trial / Tourney</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={category === 'venue'}
                className={`community-intake-tab ${category === 'venue' ? 'is-active' : ''}`}
                onClick={() => { setCategory('venue'); setError('') }}
              >
                <span className="tab-emoji">🏟️</span>
                <span>Turf / Arena</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={category === 'academy'}
                className={`community-intake-tab ${category === 'academy' ? 'is-active' : ''}`}
                onClick={() => { setCategory('academy'); setError('') }}
              >
                <span className="tab-emoji">🏫</span>
                <span>Academy</span>
              </button>
            </div>

            {error && (
              <div className="community-intake-error" role="alert">
                <SiteIcon name="alert-circle" size={18} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="community-intake-form">
              <datalist id="khelgrid-cities-list">
                {COMMON_CITIES.map(c => <option key={c} value={c} />)}
              </datalist>
              <datalist id="khelgrid-sports-list">
                {COMMON_SPORTS.map(s => <option key={s} value={s} />)}
              </datalist>

              {/* CATEGORY: PICKUP GAME */}
              {category === 'pickup_game' && (
                <div className="community-form-section">
                  <div className="community-field-row">
                    <label className="community-field-group">
                      <span>Sport *</span>
                      <input
                        required
                        type="text"
                        list="khelgrid-sports-list"
                        placeholder="e.g. Football, Basketball, Pickleball"
                        value={sport}
                        onChange={e => setSport(e.target.value)}
                      />
                    </label>
                    <label className="community-field-group small-field">
                      <span>Emoji</span>
                      <select value={emoji} onChange={e => setEmoji(e.target.value)}>
                        <option value="⚽">⚽ Football</option>
                        <option value="🏏">🏏 Cricket</option>
                        <option value="🏸">🏸 Badminton</option>
                        <option value="🏀">🏀 Basketball</option>
                        <option value="🎾">🎾 Tennis / Pickleball</option>
                      </select>
                    </label>
                  </div>

                  <div className="community-field-row">
                    <label className="community-field-group">
                      <span>Venue / Turf Name *</span>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Kicks on Grass, DDA Arena"
                        value={pickupVenue}
                        onChange={e => setPickupVenue(e.target.value)}
                      />
                    </label>
                    <label className="community-field-group">
                      <span>City *</span>
                      <input
                        required
                        type="text"
                        list="khelgrid-cities-list"
                        placeholder="e.g. Bengaluru, Delhi, Mumbai"
                        value={city}
                        onChange={e => setCity(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="community-field-row">
                    <label className="community-field-group">
                      <span>Date & Time *</span>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Today · 8:00 PM or Saturday · 7:00 AM"
                        value={timeLabel}
                        onChange={e => setTimeLabel(e.target.value)}
                      />
                    </label>
                    <label className="community-field-group">
                      <span>Skill Level</span>
                      <select
                        value={skillLevel}
                        onChange={e => setSkillLevel(e.target.value as any)}
                      >
                        <option value="All Levels">All Levels</option>
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                      </select>
                    </label>
                  </div>

                  <div className="community-field-row three-cols">
                    <label className="community-field-group">
                      <span>Price / Player</span>
                      <input
                        type="text"
                        placeholder="e.g. ₹200/player or Free"
                        value={pricePerPlayer}
                        onChange={e => setPricePerPlayer(e.target.value)}
                      />
                    </label>
                    <label className="community-field-group">
                      <span>Open Spots</span>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={spotsOpen}
                        onChange={e => setSpotsOpen(Number(e.target.value))}
                      />
                    </label>
                    <label className="community-field-group">
                      <span>Total Players</span>
                      <input
                        type="number"
                        min="2"
                        max="50"
                        value={totalPlayers}
                        onChange={e => setTotalPlayers(Number(e.target.value))}
                      />
                    </label>
                  </div>

                  <label className="community-field-group">
                    <span>Host / Organizer Name</span>
                    <input
                      type="text"
                      placeholder="e.g. Rahul S. or Bangalore FC Community"
                      value={hostName}
                      onChange={e => setHostName(e.target.value)}
                    />
                  </label>
                </div>
              )}

              {/* CATEGORY: SELECTION TRIAL / TOURNAMENT */}
              {category === 'opportunity' && (
                <div className="community-form-section">
                  <div className="community-field-row">
                    <label className="community-field-group full-width">
                      <span>Trial or Tournament Title *</span>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Delhi State U-17 Football Championship Trials"
                        value={oppTitle}
                        onChange={e => setOppTitle(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="community-field-row">
                    <label className="community-field-group">
                      <span>Sport</span>
                      <input
                        type="text"
                        list="khelgrid-sports-list"
                        placeholder="e.g. Football, Cricket, Badminton"
                        value={sport}
                        onChange={e => setSport(e.target.value)}
                      />
                    </label>
                    <label className="community-field-group">
                      <span>Opportunity Type</span>
                      <select
                        value={oppType}
                        onChange={e => setOppType(e.target.value as any)}
                      >
                        <option value="trial">Selection Trial</option>
                        <option value="other">Tournament / Championship</option>
                        <option value="camp">Training Camp</option>
                        <option value="scholarship">Sports Scholarship</option>
                        <option value="combine">Athletic Combine</option>
                      </select>
                    </label>
                  </div>

                  <div className="community-field-row">
                    <label className="community-field-group">
                      <span>City *</span>
                      <input
                        required
                        type="text"
                        list="khelgrid-cities-list"
                        placeholder="e.g. Delhi, Mumbai, Kolkata"
                        value={city}
                        onChange={e => setCity(e.target.value)}
                      />
                    </label>
                    <label className="community-field-group">
                      <span>Ground / Arena Name</span>
                      <input
                        type="text"
                        placeholder="e.g. JLN Stadium or Thyagaraj Complex"
                        value={oppVenue}
                        onChange={e => setOppVenue(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="community-field-row">
                    <label className="community-field-group">
                      <span>Organizer / Club</span>
                      <input
                        type="text"
                        placeholder="e.g. Delhi Football Association"
                        value={organizer}
                        onChange={e => setOrganizer(e.target.value)}
                      />
                    </label>
                    <label className="community-field-group">
                      <span>Age Group</span>
                      <input
                        type="text"
                        placeholder="e.g. Under-17, Under-19, Open"
                        value={ageCategory}
                        onChange={e => setAgeCategory(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="community-field-row">
                    <label className="community-field-group">
                      <span>Registration Fee</span>
                      <input
                        type="text"
                        placeholder="e.g. Free or ₹250"
                        value={regFee}
                        onChange={e => setRegFee(e.target.value)}
                      />
                    </label>
                    <label className="community-field-group">
                      <span>Official Source / Registration Link</span>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={sourceUrl}
                        onChange={e => setSourceUrl(e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* CATEGORY: TURF / ARENA */}
              {category === 'venue' && (
                <div className="community-form-section">
                  <div className="community-field-row">
                    <label className="community-field-group">
                      <span>Venue / Turf Name *</span>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Kicks on Grass Arena"
                        value={venueName}
                        onChange={e => setVenueName(e.target.value)}
                      />
                    </label>
                    <label className="community-field-group">
                      <span>City *</span>
                      <input
                        required
                        type="text"
                        list="khelgrid-cities-list"
                        placeholder="e.g. Bengaluru, Mumbai, Delhi"
                        value={city}
                        onChange={e => setCity(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="community-field-row">
                    <label className="community-field-group">
                      <span>Supported Sports</span>
                      <input
                        type="text"
                        placeholder="e.g. Football, Box Cricket, Badminton"
                        value={sport}
                        onChange={e => setSport(e.target.value)}
                      />
                    </label>
                    <label className="community-field-group">
                      <span>Address / Area</span>
                      <input
                        type="text"
                        placeholder="e.g. Bellandur, Sarjapur Road"
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                      />
                    </label>
                  </div>

                  <label className="community-field-group">
                    <span>Facilities / Description</span>
                    <textarea
                      rows={3}
                      placeholder="e.g. FIFA certified artificial turf, floodlights, parking, changing rooms."
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                    />
                  </label>
                </div>
              )}

              {/* CATEGORY: ACADEMY */}
              {category === 'academy' && (
                <div className="community-form-section">
                  <div className="community-field-row">
                    <label className="community-field-group">
                      <span>Academy Name *</span>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Prakash Padukone Badminton Academy"
                        value={academyName}
                        onChange={e => setAcademyName(e.target.value)}
                      />
                    </label>
                    <label className="community-field-group">
                      <span>City *</span>
                      <input
                        required
                        type="text"
                        list="khelgrid-cities-list"
                        placeholder="e.g. Bengaluru, Hyderabad, Chennai"
                        value={city}
                        onChange={e => setCity(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="community-field-row">
                    <label className="community-field-group">
                      <span>Primary Sport</span>
                      <input
                        type="text"
                        list="khelgrid-sports-list"
                        placeholder="e.g. Badminton, Cricket, Football"
                        value={sport}
                        onChange={e => setSport(e.target.value)}
                      />
                    </label>
                    <label className="community-field-group">
                      <span>State</span>
                      <input
                        type="text"
                        placeholder="e.g. Karnataka, Maharashtra"
                        value={state}
                        onChange={e => setState(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="community-field-row">
                    <label className="community-field-group full-width">
                      <span>Website or Contact URL</span>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={websiteUrl}
                        onChange={e => setWebsiteUrl(e.target.value)}
                      />
                    </label>
                  </div>

                  <label className="community-field-group">
                    <span>About Academy & Coaching Programs</span>
                    <textarea
                      rows={3}
                      placeholder="e.g. Elite coaching for junior and senior athletes with licensed coaches."
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                    />
                  </label>
                </div>
              )}

              <div className="community-intake-actions">
                <button
                  type="button"
                  className="community-intake-btn-cancel"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="community-intake-btn-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <SiteIcon name="loader" size={16} />
                      <span>Publishing to KhelGrid…</span>
                    </>
                  ) : (
                    <>
                      <SiteIcon name="plus" size={16} />
                      <span>Publish Listing Now</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
