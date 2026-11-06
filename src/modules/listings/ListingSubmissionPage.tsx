import { useState, type FormEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { submitListingSuggestion, type ListingSubmissionInput } from '../../integrations/supabase/public-client'
import { LISTING_PLANS } from '../../shared/payments/listingPricing'

const listingTypes: ListingSubmissionInput['listing_type'][] = [
  'opportunity', 'venue', 'coach', 'academy', 'event',
]

export default function ListingSubmissionPage({ onOpenIntake }: { onOpenIntake?: () => void }) {
  const [kind, setKind] = useState<ListingSubmissionInput['listing_type']>('opportunity')
  const [title, setTitle] = useState('')
  const [city, setCity] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [details, setDetails] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess(false)
    if (!listingTypes.includes(kind)) {
      setError('Choose a supported listing type.')
      return
    }
    if (title.trim().length < 2) {
      setError('Enter a listing title with at least two characters.')
      return
    }
    let source: URL
    try {
      source = new URL(sourceUrl)
    } catch {
      setError('Enter a valid official HTTPS source URL.')
      return
    }
    if (source.protocol !== 'https:') {
      setError('The official source link must use HTTPS.')
      return
    }

    setSubmitting(true)
    try {
      const result = await submitListingSuggestion({
        listing_type: kind,
        title: title.trim(),
        city: city.trim(),
        source_url: source.href,
        details: details.trim(),
      })
      if (result.status === 'submitted') {
        setSuccess(true)
        setTitle('')
        setCity('')
        setSourceUrl('')
        setDetails('')
      } else if (result.status === 'unconfigured') {
        setError('Database submissions are not configured on this deployment. No listing was submitted.')
      } else {
        setError(result.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return <section className="content-page listing-submission-page">
    <p className="eyebrow">KHELGRID · LISTING INTAKE</p>
    <h1>Suggest a sports listing.</h1>
    <p className="page-intro">Share an official source for a sports opportunity, venue, coach, academy or event. Every suggestion enters a private review queue and remains unpublished unless approved.</p>
    
    {onOpenIntake && (
      <div className="state-panel state-available" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <strong style={{ display: 'block', fontSize: 15, marginBottom: 4 }}>Want to add a verified Turf, Academy, Trial or Pickup Game directly?</strong>
          <span style={{ fontSize: 13, color: 'var(--muted-strong)' }}>Use the dynamic community intake form to publish your listing live across KhelGrid immediately.</span>
        </div>
        <button
          type="button"
          className="primary-link"
          style={{ minHeight: 38, padding: '8px 16px', fontSize: 12 }}
          onClick={onOpenIntake}
        >
          <SiteIcon name="plus" size={15} /> + List on KhelGrid
        </button>
      </div>
    )}

    {/* KhelGrid Listing Plans & Pricing Tiers */}
    <div className="listing-pricing-section" style={{ margin: '32px 0 36px' }}>
      <div style={{ marginBottom: 18 }}>
        <p className="eyebrow" style={{ color: '#10b981', marginBottom: 4 }}>OFFICIAL LISTING TIERS</p>
        <h2 style={{ fontSize: 22, fontWeight: 750, margin: '0 0 6px' }}>Listing Plans &amp; Pricing</h2>
        <p style={{ color: 'var(--muted-strong)', fontSize: 14, margin: 0 }}>
          All verified listings on KhelGrid include direct WhatsApp player inquiries, verified sports badge, and search directory indexing.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {LISTING_PLANS.map(plan => (
          <div
            key={plan.id}
            style={{
              background: plan.popular ? 'rgba(59, 130, 246, 0.08)' : plan.id === 'lifelong' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.03)',
              border: `1.5px solid ${plan.popular ? '#3b82f6' : plan.id === 'lifelong' ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: 14,
              padding: '20px 18px',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
            }}
          >
            {plan.badge && (
              <span
                style={{
                  position: 'absolute',
                  top: -10,
                  right: 14,
                  background: plan.popular ? '#2563eb' : plan.id === 'lifelong' ? '#d97706' : '#059669',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: 999,
                  textTransform: 'uppercase',
                }}
              >
                {plan.badge}
              </span>
            )}
            <strong style={{ fontSize: 16, marginBottom: 2 }}>{plan.name}</strong>
            <span style={{ fontSize: 12, color: 'var(--muted-strong)', marginBottom: 12 }}>{plan.durationLabel}</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 24, fontWeight: 800 }}>₹{plan.price.toLocaleString('en-IN')}</span>
              {plan.originalPrice && <span style={{ fontSize: 13, textDecoration: 'line-through', color: 'var(--muted)' }}>₹{plan.originalPrice.toLocaleString('en-IN')}</span>}
              {plan.savingsLabel && <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>{plan.savingsLabel}</span>}
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted-strong)', flex: 1, margin: '0 0 14px', lineHeight: 1.4 }}>{plan.description}</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5, color: 'var(--muted-strong)' }}>
              {plan.features.slice(0, 3).map((f, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <SiteIcon name="check-circle" size={13} /> {f}
                </li>
              ))}
            </ul>
            {onOpenIntake && (
              <button
                type="button"
                className="primary-link"
                style={{ width: '100%', justifyContent: 'center', minHeight: 36, fontSize: 12.5 }}
                onClick={onOpenIntake}
              >
                Select {plan.name} →
              </button>
            )}
          </div>
        ))}
      </div>
    </div>

    <div className="cv-privacy-note" role="note"><SiteIcon name="shield-check" size={18} /><span><strong>Review first.</strong> We collect only the listing details below. Do not include passwords, identity documents or sensitive personal information. A successful submission is not an endorsement or publication.</span></div>
    <form className="sports-cv-form" onSubmit={submit}>
      <fieldset disabled={submitting}><legend>Listing details</legend>
        <div className="cv-field-grid">
          <label>Listing type *<select required value={kind} onChange={e => setKind(e.target.value as ListingSubmissionInput['listing_type'])}><option value="opportunity">Trial / opportunity</option><option value="venue">Sports venue</option><option value="coach">Coach</option><option value="academy">Academy</option><option value="event">Event / tournament</option></select></label>
          <label>Listing title *<input required minLength={2} maxLength={150} value={title} onChange={e => setTitle(e.target.value)} /></label>
          <label>City / state<input maxLength={100} value={city} onChange={e => setCity(e.target.value)} /></label>
          <label>Official source URL *<input required type="url" maxLength={1000} value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://…" /></label>
        </div>
        <label>Useful context<textarea rows={4} maxLength={2000} value={details} onChange={e => setDetails(e.target.value)} placeholder="Dates, eligibility, organiser, or what should be checked." /></label>
      </fieldset>
      {error && <p className="state-panel state-unavailable" role="alert">{error}</p>}
      {success && <p className="state-panel state-available" role="status"><SiteIcon name="check-circle" size={18} /> Suggestion received for review. It is private and has not been published.</p>}
      <div className="cv-actions"><button className="primary-link" type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit for review'} <SiteIcon name="arrow-up-right" size={16} /></button></div>
    </form>
    <div className="state-panel state-unavailable"><div className="state-symbol">!</div><h2>Publication requires moderation</h2><p>Suggestions are not public catalogue records. A trusted moderator must verify the source and approve the listing through a restricted administrative workflow before it can appear on KhelGrid.</p></div>
    <p className="coming-soon-note">Do not send personal or confidential information. If the database migration has not yet been applied, the page will report that submissions are unavailable rather than pretending to accept them.</p>
  </section>
}
