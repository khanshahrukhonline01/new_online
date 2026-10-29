import { useState, type FormEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'

export default function ListingSubmissionPage() {
  const [kind, setKind] = useState('opportunity')
  const [title, setTitle] = useState('')
  const [city, setCity] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [details, setDetails] = useState('')
  const [error, setError] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    let source: URL
    try { source = new URL(sourceUrl) } catch { setError('Enter a valid official source URL.'); return }
    if (!['http:', 'https:'].includes(source.protocol)) { setError('The source link must use HTTP or HTTPS.'); return }
    const body = [
      'Listing type: ' + kind,
      'Title: ' + title.trim(),
      'City: ' + (city.trim() || 'Not provided'),
      'Official source URL: ' + source.href,
      '',
      'Additional context:',
      details.trim() || 'Not provided',
      '',
      'I understand this email is a suggestion for review, not confirmation or publication of a listing.',
    ].join('\n')
    window.location.href = 'mailto:khelgrid@gmail.com?subject=' + encodeURIComponent('KhelGrid listing suggestion: ' + title.trim()) + '&body=' + encodeURIComponent(body)
  }
  return <section className="content-page listing-submission-page">
    <p className="eyebrow">KHELGRID · LISTING INTAKE</p>
    <h1>Suggest a sports listing.</h1>
    <p className="page-intro">Share an official source for a sports opportunity, venue, coach, academy or event. Submissions are suggestions only and are not published automatically.</p>
    <div className="cv-privacy-note" role="note"><SiteIcon name="shield-check" size={18} /><span><strong>Review first.</strong> This page opens an email draft in your email app. It does not upload data to KhelGrid or place anything in a database. Do not include passwords, identity documents or sensitive personal information.</span></div>
    <form className="sports-cv-form" onSubmit={submit}>
      <fieldset><legend>Listing details</legend>
        <div className="cv-field-grid">
          <label>Listing type *<select required value={kind} onChange={e => setKind(e.target.value)}><option value="opportunity">Trial / opportunity</option><option value="venue">Sports venue</option><option value="coach">Coach</option><option value="academy">Academy</option><option value="event">Event / tournament</option></select></label>
          <label>Listing title *<input required maxLength={150} value={title} onChange={e => setTitle(e.target.value)} /></label>
          <label>City / state<input maxLength={100} value={city} onChange={e => setCity(e.target.value)} /></label>
          <label>Official source URL *<input required type="url" maxLength={1000} value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://…" /></label>
        </div>
        <label>Useful context<textarea rows={4} maxLength={2000} value={details} onChange={e => setDetails(e.target.value)} placeholder="Dates, eligibility, organiser, or what should be checked." /></label>
      </fieldset>
      {error && <p className="state-panel state-unavailable" role="alert">{error}</p>}
      <div className="cv-actions"><button className="primary-link" type="submit">Prepare email for review <SiteIcon name="arrow-up-right" size={16} /></button></div>
    </form>
    <div className="state-panel state-unavailable"><div className="state-symbol">!</div><h2>Database intake is not enabled</h2><p>Authenticated submissions and a restricted moderator queue require the proposed database migration to be reviewed and applied, then tested with role-based access controls. Email suggestions are not a replacement for that workflow.</p></div>
    <p className="coming-soon-note">Sending a suggestion does not mean KhelGrid has verified it. Publication, if any, happens only after source and content review.</p>
  </section>
}
