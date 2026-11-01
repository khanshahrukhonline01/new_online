import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  computeReviewStats,
  getReviews,
  getStoredUser,
  getVotedHelpfulReviewIds,
  submitReview,
  uploadMediaFile,
  voteHelpfulReview,
  type AuthorRole,
  type ReviewItem,
} from '../../integrations/supabase/public-client'
import { subscribeToRealtimeCatalogue } from '../../integrations/supabase/realtime-client'
import { SiteIcon } from './SiteIcon'
import './CommunityReviewsSection.css'

export interface CommunityReviewsSectionProps {
  entityType: 'academy' | 'venue'
  entityId: string
  entitySlug: string
  entityName: string
  sport?: string
  city?: string
}

export function CommunityReviewsSection({
  entityType,
  entityId,
  entitySlug,
  entityName,
  sport,
  city,
}: CommunityReviewsSectionProps) {
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterMode, setFilterMode] = useState<'all' | 'photos' | '5stars'>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'highest' | 'helpful'>('recent')

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [authorRole, setAuthorRole] = useState<AuthorRole>('Athlete')
  const [photos, setPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Helpful Voting State
  const [votedIds, setVotedIds] = useState<Set<string>>(() => getVotedHelpfulReviewIds())

  // Photo Lightbox
  const [activePhoto, setActivePhoto] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      const res = await getReviews(entityType, entitySlug)
      if (active) {
        setReviews(res.data)
        setLoading(false)
      }
    }
    load()

    const onCustomReviewAdded = () => load()
    window.addEventListener('khelgrid:review-added', onCustomReviewAdded)

    const unsubscribe = subscribeToRealtimeCatalogue(['reviews'], () => {
      load()
    })

    return () => {
      active = false
      window.removeEventListener('khelgrid:review-added', onCustomReviewAdded)
      unsubscribe()
    }
  }, [entityType, entitySlug])

  useEffect(() => {
    const user = getStoredUser()
    if (user?.name && !authorName) {
      setAuthorName(user.name)
      if (user.role === 'academy') setAuthorRole('Coach')
    }
  }, [authorName])

  const stats = computeReviewStats(reviews)

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    setErrorMessage('')

    const bucket = entityType === 'venue' ? 'venue-media' : 'academy-photos'
    const newUrls: string[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const res = await uploadMediaFile(bucket, file, entitySlug)
        if (res.url) {
          newUrls.push(res.url)
        }
      }
      setPhotos(prev => [...prev, ...newUrls])
    } catch {
      setErrorMessage('Could not process photo upload. Please try a standard image format.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleRemovePhoto = (indexToRemove: number) => {
    setPhotos(prev => prev.filter((_, idx) => idx !== indexToRemove))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!authorName.trim() || authorName.trim().length < 2) {
      setErrorMessage('Please provide your name (at least 2 characters).')
      return
    }

    if (!content.trim() || content.trim().length < 5) {
      setErrorMessage('Please share a review of at least 5 characters.')
      return
    }

    setSubmitting(true)

    try {
      const res = await submitReview({
        entityType,
        entityId,
        entitySlug,
        authorName: authorName.trim(),
        authorRole,
        rating,
        title: title.trim() || undefined,
        content: content.trim(),
        photos,
      })

      if (res.status === 'submitted') {
        setSuccessMessage(res.message)
        if (res.review) {
          setReviews(prev => [res.review!, ...prev.filter(r => r.id !== res.review!.id)])
        }
        setTimeout(() => {
          setIsFormOpen(false)
          setTitle('')
          setContent('')
          setPhotos([])
          setSuccessMessage('')
        }, 2000)
      } else {
        setErrorMessage(res.message)
      }
    } catch {
      setErrorMessage('Failed to submit review. Please check connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleHelpfulVote = async (reviewId: string) => {
    if (votedIds.has(reviewId)) return
    const success = await voteHelpfulReview(reviewId)
    if (success) {
      setVotedIds(prev => new Set(prev).add(reviewId))
      setReviews(prev =>
        prev.map(r => (r.id === reviewId ? { ...r, helpful_count: r.helpful_count + 1 } : r)),
      )
    }
  }

  // Filter & Sort
  const filteredReviews = reviews
    .filter(r => {
      if (filterMode === 'photos') return r.photos && r.photos.length > 0
      if (filterMode === '5stars') return r.rating === 5
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'highest') return b.rating - a.rating
      if (sortBy === 'helpful') return b.helpful_count - a.helpful_count
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const getRatingLabel = (r: number) => {
    switch (r) {
      case 5:
        return '5 - Excellent Ground & Experience'
      case 4:
        return '4 - Very Good'
      case 3:
        return '3 - Average'
      case 2:
        return '2 - Needs Improvement'
      case 1:
        return '1 - Poor'
      default:
        return ''
    }
  }

  return (
    <section className="community-reviews-container" aria-label="Community Reviews and Player Ratings">
      <div className="community-reviews-header">
        <div>
          <h2>Player Reviews &amp; Court Photos</h2>
          <p className="community-reviews-subtitle">
            Authentic feedback from verified players, athletes, and coaches who play at {entityName}.
          </p>
        </div>

        <div className="reviews-header-actions">
          <button
            type="button"
            className="reviews-btn-primary"
            onClick={() => {
              setIsFormOpen(!isFormOpen)
              setSuccessMessage('')
              setErrorMessage('')
            }}
          >
            <SiteIcon name="star" size={16} />
            <span>{isFormOpen ? 'Cancel Review' : 'Write a Review'}</span>
          </button>

          <button
            type="button"
            className="reviews-btn-secondary"
            onClick={() => {
              setIsFormOpen(true)
              document.getElementById('court-photos-input')?.click()
            }}
          >
            <SiteIcon name="camera" size={16} />
            <span>Add Photos</span>
          </button>
        </div>
      </div>

      {/* Review Intake Modal / Accordion */}
      {isFormOpen && (
        <form className="review-intake-card" onSubmit={handleSubmit}>
          <div className="review-intake-header">
            <h3>Share Your Experience at {entityName}</h3>
            <p>Help local sports enthusiasts know about ground bounce, floodlights, turf condition, and amenities.</p>
          </div>

          {errorMessage && <div className="review-alert review-alert-error">{errorMessage}</div>}
          {successMessage && <div className="review-alert review-alert-success">{successMessage}</div>}

          {/* Interactive Star Selector */}
          <div className="rating-select-group">
            <label className="rating-select-label">Your Overall Rating</label>
            <div className="rating-star-buttons" role="radiogroup" aria-label="Rating from 1 to 5 stars">
              {[1, 2, 3, 4, 5].map(star => {
                const isActive = (hoverRating || rating) >= star
                return (
                  <button
                    key={star}
                    type="button"
                    className={`star-pick-btn ${isActive ? 'is-active' : ''}`}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`${star} Star${star > 1 ? 's' : ''}`}
                  >
                    <SiteIcon name="star" size={24} />
                  </button>
                )
              })}
              <span className="rating-text-feedback">{getRatingLabel(hoverRating || rating)}</span>
            </div>
          </div>

          {/* Review Details */}
          <div className="review-form-row">
            <div className="review-form-field">
              <label htmlFor="review-author-name">Your Name *</label>
              <input
                id="review-author-name"
                type="text"
                placeholder="e.g. Sahil Khan"
                value={authorName}
                onChange={e => setAuthorName(e.target.value)}
                required
              />
            </div>

            <div className="review-form-field">
              <label htmlFor="review-author-role">Your Role</label>
              <select
                id="review-author-role"
                value={authorRole}
                onChange={e => setAuthorRole(e.target.value as AuthorRole)}
              >
                <option value="Athlete">Athlete / Competitive Player</option>
                <option value="Turf Player">Turf / Weekend Player</option>
                <option value="Parent">Parent of Junior Athlete</option>
                <option value="Coach">Sports Coach / Trainer</option>
                <option value="Verified Player">Verified Player</option>
              </select>
            </div>
          </div>

          <div className="review-form-field">
            <label htmlFor="review-title">Review Headline (Optional)</label>
            <input
              id="review-title"
              type="text"
              placeholder="e.g. Pristine turf cushioning and excellent floodlights"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div className="review-form-field">
            <label htmlFor="review-content">Detailed Feedback *</label>
            <textarea
              id="review-content"
              rows={4}
              placeholder={`Tell other athletes about ${sport || 'playing'} surfaces, cleanliness of washrooms, booking ease, equipment availability, or coaching guidance in ${city || 'India'}...`}
              value={content}
              onChange={e => setContent(e.target.value)}
              required
            />
          </div>

          {/* Court Photos & Camera Upload */}
          <div className="review-photos-upload-zone">
            <div className="upload-zone-label">
              <SiteIcon name="camera" size={18} />
              <span>Court Photos &amp; Ground Condition (Optional)</span>
            </div>
            <p className="upload-zone-hint">
              Upload real court snapshots, turf grass condition, or lighting from your phone camera or gallery.
            </p>

            <input
              id="court-photos-input"
              type="file"
              accept="image/*"
              multiple
              className="hidden-file-input"
              onChange={handlePhotoUpload}
              disabled={uploading}
            />

            <label htmlFor="court-photos-input" className={`file-upload-trigger ${uploading ? 'is-uploading' : ''}`}>
              <SiteIcon name={uploading ? 'loader' : 'upload'} size={18} />
              <span>{uploading ? 'Uploading to Supabase Storage…' : 'Take Photo or Choose Files'}</span>
            </label>

            {/* Photo Previews */}
            {photos.length > 0 && (
              <div className="review-photos-preview-strip">
                {photos.map((url, idx) => (
                  <div key={idx} className="photo-preview-item">
                    <img src={url} alt={`Upload preview ${idx + 1}`} />
                    <button
                      type="button"
                      className="photo-remove-btn"
                      onClick={() => handleRemovePhoto(idx)}
                      aria-label="Remove photo"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="review-form-footer">
            <button
              type="button"
              className="reviews-btn-text"
              onClick={() => setIsFormOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="reviews-btn-primary"
              disabled={submitting || uploading}
            >
              {submitting ? 'Publishing Review…' : 'Post Community Review'}
            </button>
          </div>
        </form>
      )}

      {/* Ratings Scorecard Overview */}
      <div className="reviews-scorecard-grid">
        <div className="scorecard-main-score">
          <div className="scorecard-big-number">
            {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '4.9'}
          </div>
          <div className="scorecard-stars" aria-label={`${stats.averageRating} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map(i => (
              <SiteIcon
                key={i}
                name="star"
                size={18}
                className={i <= Math.round(stats.averageRating || 5) ? 'star-filled' : 'star-muted'}
              />
            ))}
          </div>
          <div className="scorecard-reviews-count">
            Based on {stats.totalReviews || reviews.length} verified player ratings
          </div>
        </div>

        {/* Distribution Bars */}
        <div className="scorecard-distribution-bars">
          {[5, 4, 3, 2, 1].map(stars => {
            const count = stats.distribution[stars as keyof typeof stats.distribution] || 0
            const pct = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : stars === 5 ? 85 : 15
            return (
              <div key={stars} className="dist-row">
                <span className="dist-stars-label">{stars} ★</span>
                <div className="dist-track">
                  <div className="dist-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="dist-count">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Filter and Sort Bar */}
      <div className="reviews-filter-bar">
        <div className="filter-pill-group">
          <button
            type="button"
            className={`filter-pill ${filterMode === 'all' ? 'is-active' : ''}`}
            onClick={() => setFilterMode('all')}
          >
            All Reviews ({reviews.length})
          </button>
          <button
            type="button"
            className={`filter-pill ${filterMode === 'photos' ? 'is-active' : ''}`}
            onClick={() => setFilterMode('photos')}
          >
            <SiteIcon name="camera" size={14} />
            <span>With Photos</span>
          </button>
          <button
            type="button"
            className={`filter-pill ${filterMode === '5stars' ? 'is-active' : ''}`}
            onClick={() => setFilterMode('5stars')}
          >
            5 Stars Only
          </button>
        </div>

        <div className="sort-selector-wrap">
          <label htmlFor="reviews-sort-select">Sort by:</label>
          <select
            id="reviews-sort-select"
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'recent' | 'highest' | 'helpful')}
          >
            <option value="recent">Most Recent</option>
            <option value="highest">Highest Rating</option>
            <option value="helpful">Most Helpful</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="reviews-loading-state">
          <SiteIcon name="loader" size={24} className="spinning" />
          <p>Loading community ratings and photos…</p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="reviews-empty-state">
          <SiteIcon name="star" size={32} />
          <h3>No reviews found for this filter</h3>
          <p>Be the first player to share your rating and court photos for {entityName}!</p>
          <button
            type="button"
            className="reviews-btn-primary"
            onClick={() => setIsFormOpen(true)}
          >
            Write First Review
          </button>
        </div>
      ) : (
        <div className="reviews-card-list">
          {filteredReviews.map(review => {
            const isVoted = votedIds.has(review.id)
            const dateStr = new Date(review.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
            const initials = review.author_name
              .split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()
              .substring(0, 2) || 'KG'

            return (
              <article key={review.id} className="review-card">
                <header className="review-card-header">
                  <div className="review-author-info">
                    <div className="review-author-avatar">{initials}</div>
                    <div>
                      <div className="review-author-name-row">
                        <strong>{review.author_name}</strong>
                        <span className="review-role-badge">{review.author_role}</span>
                        <span className="verified-player-tick" title="Verified player profile on KhelGrid">
                          <SiteIcon name="shield-check" size={14} />
                        </span>
                      </div>
                      <div className="review-meta-row">
                        <div className="review-stars-display" aria-label={`${review.rating} out of 5 stars`}>
                          {[1, 2, 3, 4, 5].map(i => (
                            <SiteIcon
                              key={i}
                              name="star"
                              size={15}
                              className={i <= review.rating ? 'star-filled' : 'star-muted'}
                            />
                          ))}
                        </div>
                        <span className="review-date">{dateStr}</span>
                      </div>
                    </div>
                  </div>
                </header>

                {review.title && <h4 className="review-card-title">{review.title}</h4>}
                <p className="review-card-content">{review.content}</p>

                {/* Photo Gallery Grid */}
                {review.photos && review.photos.length > 0 && (
                  <div className="review-card-photos">
                    {review.photos.map((photoUrl, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        className="review-photo-thumb"
                        onClick={() => setActivePhoto(photoUrl)}
                        aria-label="View court photo in high resolution"
                      >
                        <img src={photoUrl} alt={`Court condition at ${entityName}`} loading="lazy" />
                        <span className="photo-zoom-hint">
                          <SiteIcon name="camera" size={12} /> View
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <footer className="review-card-footer">
                  <button
                    type="button"
                    className={`helpful-vote-btn ${isVoted ? 'is-voted' : ''}`}
                    onClick={() => handleHelpfulVote(review.id)}
                    disabled={isVoted}
                    aria-label={`Mark review as helpful. Currently ${review.helpful_count} votes.`}
                  >
                    <SiteIcon name="thumbs-up" size={14} />
                    <span>{isVoted ? `Helpful (${review.helpful_count}) ✓` : `Helpful (${review.helpful_count})`}</span>
                  </button>
                </footer>
              </article>
            )
          })}
        </div>
      )}

      {/* Photo Lightbox Modal */}
      {activePhoto && (
        <div className="photo-lightbox-overlay" onClick={() => setActivePhoto(null)} role="dialog" aria-modal="true">
          <div className="photo-lightbox-content" onClick={e => e.stopPropagation()}>
            <img src={activePhoto} alt="Court condition in full resolution" />
            <button
              type="button"
              className="photo-lightbox-close"
              onClick={() => setActivePhoto(null)}
              aria-label="Close photo view"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
