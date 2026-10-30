import { useState, type FormEvent, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { RESEARCH_CATEGORIES } from './data/khelchronicleData'
import { submitChronicleManuscript } from '../../integrations/supabase/chronicle-client'
import './khelchronicle.css'

interface KhelChronicleSubmitPageProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

export function KhelChronicleSubmitPage({ onNavigate }: KhelChronicleSubmitPageProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [submissionNotice, setSubmissionNotice] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    category: 'sports-biomechanics',
    primaryAuthorName: '',
    primaryAuthorEmail: '',
    primaryAuthorAffiliation: '',
    orcid: '',
    coAuthors: '',
    keywords: 'Sports Biomechanics, Ground Reaction Force, Movement Screening',
    fullTextOrUrl: '',
    abstract: '',
    ethicsDeclaration: false,
    minorConsentDeclaration: false,
    licenseDeclaration: false,
  })

  const handleLink = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (onNavigate) {
      onNavigate(e, href)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const res = await submitChronicleManuscript({
        manuscript_title: formData.title,
        category_slug: formData.category,
        primary_author_name: formData.primaryAuthorName,
        primary_author_email: formData.primaryAuthorEmail,
        primary_author_affiliation: formData.primaryAuthorAffiliation,
        orcid: formData.orcid.trim() || undefined,
        co_authors: formData.coAuthors.trim() || undefined,
        abstract_text: formData.abstract,
        keywords: formData.keywords,
        full_text_or_url: formData.fullTextOrUrl || 'Uploaded in manuscript intake',
        human_ethics_confirmed: formData.ethicsDeclaration,
        minor_consent_confirmed: formData.minorConsentDeclaration,
      })

      if (res.status === 'submitted') {
        setSubmissionId(res.submissionId)
        setSubmissionNotice('Manuscript successfully entered into the KhelChronicle peer-screening database queue.')
      } else if (res.status === 'unconfigured') {
        setSubmissionId(res.submissionId)
        setSubmissionNotice(res.message)
      } else {
        setErrorMessage(res.message)
      }
    } catch {
      setErrorMessage('Unexpected transmission error. Please check your network and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setSubmissionId(null)
    setSubmissionNotice(null)
    setErrorMessage(null)
    setFormData({
      title: '',
      category: 'sports-biomechanics',
      primaryAuthorName: '',
      primaryAuthorEmail: '',
      primaryAuthorAffiliation: '',
      orcid: '',
      coAuthors: '',
      keywords: '',
      fullTextOrUrl: '',
      abstract: '',
      ethicsDeclaration: false,
      minorConsentDeclaration: false,
      licenseDeclaration: false,
    })
  }

  return (
    <div className="kc-root">
      {/* Breadcrumb */}
      <nav style={{ padding: '16px 0', fontSize: '13px', color: '#64748b' }} aria-label="Breadcrumb">
        <a href="/khelchronicle" onClick={e => handleLink(e, '/khelchronicle')} style={{ color: '#0f172a', textDecoration: 'none' }}>
          KhelChronicle
        </a>
        <span> / </span>
        <span style={{ color: '#64748b' }}>Author Submission &amp; Database Intake</span>
      </nav>

      {/* Header */}
      <header className="kc-hero" style={{ paddingBottom: '24px' }}>
        <div className="kc-eyebrow-row">
          <span className="kc-badge-archive">
            <SiteIcon name="award" size={13} />
            <span>Database Submission Queue</span>
          </span>
          <span className="kc-badge-open-access">Diamond Open Access</span>
          <span className="kc-badge-open-access">Zero Article Processing Charges (APC)</span>
        </div>

        <h1 className="kc-hero-title">Submit Research Manuscript</h1>
        <p className="kc-hero-subtitle">
          KhelChronicle welcomes original preprints, technical whitepapers, systematic reviews, and datasets advancing sports biomechanics, athletic physiology, and sports science in India.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
        {/* Guidelines Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '24px' }}>
            <h2 style={{ margin: '0 0 14px', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              Editorial Screening &amp; Moderation Criteria
            </h2>
            <p style={{ margin: '0 0 12px', fontSize: '14px', lineHeight: 1.6, color: '#475569' }}>
              Following the bioRxiv and SportRxiv model, every submitted manuscript undergoes rapid screening prior to public repository indexing:
            </p>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13.5px', lineHeight: 1.7, color: '#334155' }}>
              <li><strong>Scope Alignment</strong>: Focus on sports biomechanics, exercise physiology, sports medicine, nutrition, analytics, or Indian sports development.</li>
              <li><strong>Scientific Plausibility</strong>: Clear hypothesis, reproducible methodology description, and appropriate statistical controls.</li>
              <li><strong>Human Subjects &amp; Minor Athletes Protection</strong>: Studies involving youth or school athletes (U-14, U-16, U-18) must document parental/guardian informed consent and Institutional Ethics Committee (IEC) clearance.</li>
              <li><strong>Data Availability</strong>: Authors are encouraged to provide de-identified summary datasets or statements regarding access.</li>
              <li><strong>Non-Clinical Preprint Status</strong>: Manuscripts must not present unverified clinical or therapeutic health claims.</li>
            </ul>
          </div>

          {/* Submission Success State */}
          {submissionId ? (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '32px', textAlign: 'center' }}>
              <SiteIcon name="check-circle" size={40} style={{ color: '#16a34a', marginBottom: '14px' }} />
              <h2 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: 800, color: '#14532d' }}>
                Manuscript Received for Editorial Screening
              </h2>
              <div style={{ display: 'inline-block', background: '#dcfce7', border: '1px solid #86efac', padding: '6px 14px', borderRadius: '6px', fontSize: '14px', fontWeight: 700, color: '#166534', margin: '8px 0 14px' }}>
                Accession Queue Reference: {submissionId}
              </div>
              <p style={{ margin: '0 0 10px', fontSize: '14.5px', color: '#166534', maxWidth: '640px', marginLeft: 'auto', marginRight: 'auto' }}>
                Thank you! Your submission &ldquo;{formData.title || 'Sports Science Research'}&rdquo; has been registered in the KhelChronicle database screening table. Our moderation desk will audit formatting and ethical clearances within 2 business days.
              </p>
              {submissionNotice && (
                <p style={{ margin: '0 0 20px', fontSize: '12.5px', color: '#15803d', fontStyle: 'italic' }}>
                  {submissionNotice}
                </p>
              )}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <a
                  href="/khelchronicle"
                  className="kc-btn-primary"
                  onClick={e => handleLink(e, '/khelchronicle')}
                >
                  Return to Research Repository
                </a>
                <button
                  type="button"
                  className="kc-btn-secondary"
                  onClick={resetForm}
                >
                  Submit Another Paper
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '24px' }}>
              <h2 style={{ margin: '0 0 18px', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                Manuscript Submission Intake
              </h2>

              {errorMessage && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '12px 16px', color: '#b91c1c', fontSize: '13.5px', marginBottom: '18px' }}>
                  <SiteIcon name="alert-circle" size={15} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                  {errorMessage}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label htmlFor="manuscript-title" style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                    Manuscript Title *
                  </label>
                  <input
                    id="manuscript-title"
                    type="text"
                    required
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                    placeholder="e.g. Kinematic Analysis of Lumbar Spine Stress in Junior Fast Bowlers"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="research-category" style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                    Primary Research Discipline *
                  </label>
                  <select
                    id="research-category"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#ffffff' }}
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                  >
                    {RESEARCH_CATEGORIES.map(c => (
                      <option key={c.id} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label htmlFor="primary-author-name" style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                      Primary / Corresponding Author *
                    </label>
                    <input
                      id="primary-author-name"
                      type="text"
                      required
                      style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                      placeholder="e.g. Dr. Rajeshwari Nair"
                      value={formData.primaryAuthorName}
                      onChange={e => setFormData({ ...formData, primaryAuthorName: e.target.value })}
                    />
                  </div>

                  <div>
                    <label htmlFor="primary-author-email" style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                      Corresponding Author Email *
                    </label>
                    <input
                      id="primary-author-email"
                      type="email"
                      required
                      style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                      placeholder="author@institution.edu.in"
                      value={formData.primaryAuthorEmail}
                      onChange={e => setFormData({ ...formData, primaryAuthorEmail: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '16px' }}>
                  <div>
                    <label htmlFor="primary-affiliation" style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                      Author Institution / University Affiliation *
                    </label>
                    <input
                      id="primary-affiliation"
                      type="text"
                      required
                      style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                      placeholder="e.g. Lakshmibai National Institute of Physical Education (LNIPE), Gwalior"
                      value={formData.primaryAuthorAffiliation}
                      onChange={e => setFormData({ ...formData, primaryAuthorAffiliation: e.target.value })}
                    />
                  </div>

                  <div>
                    <label htmlFor="author-orcid" style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                      ORCID Identifier (Optional)
                    </label>
                    <input
                      id="author-orcid"
                      type="text"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                      placeholder="0000-0002-8941-4412"
                      value={formData.orcid}
                      onChange={e => setFormData({ ...formData, orcid: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="co-authors-list" style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                    Co-Authors &amp; Affiliations (Optional)
                  </label>
                  <input
                    id="co-authors-list"
                    type="text"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                    placeholder="e.g. Dr. Alok Sen (SAI NCOE Bengaluru), Priya Narang (Delhi University)"
                    value={formData.coAuthors}
                    onChange={e => setFormData({ ...formData, coAuthors: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="keywords-input" style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                    Keywords (comma-separated) *
                  </label>
                  <input
                    id="keywords-input"
                    type="text"
                    required
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                    placeholder="Fast Bowling, Ground Reaction Force, Lumbar Spine, Biomechanics"
                    value={formData.keywords}
                    onChange={e => setFormData({ ...formData, keywords: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="abstract-text" style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                    Structured Abstract (Background, Methods, Results, Conclusion) *
                  </label>
                  <textarea
                    id="abstract-text"
                    required
                    rows={6}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13.5px', lineHeight: 1.6 }}
                    placeholder="Background: ... Methods: ... Results: ... Conclusion: ..."
                    value={formData.abstract}
                    onChange={e => setFormData({ ...formData, abstract: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="manuscript-url" style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                    Manuscript Full-Text Link (PDF URL or Institutional Repository Link)
                  </label>
                  <input
                    id="manuscript-url"
                    type="text"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                    placeholder="https://drive.google.com/... or https://arxiv.org/abs/... or https://zenodo.org/..."
                    value={formData.fullTextOrUrl}
                    onChange={e => setFormData({ ...formData, fullTextOrUrl: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#334155' }}>
                    <input
                      type="checkbox"
                      required
                      checked={formData.ethicsDeclaration}
                      onChange={e => setFormData({ ...formData, ethicsDeclaration: e.target.checked })}
                      style={{ marginTop: '3px' }}
                    />
                    <span><strong>Human Subjects &amp; Ethics Declaration *</strong>: I confirm this research was conducted in compliance with the Declaration of Helsinki and Institutional Ethics Committee clearance.</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#334155' }}>
                    <input
                      type="checkbox"
                      required
                      checked={formData.minorConsentDeclaration}
                      onChange={e => setFormData({ ...formData, minorConsentDeclaration: e.target.checked })}
                      style={{ marginTop: '3px' }}
                    />
                    <span><strong>Youth &amp; Minor Athletes Protection *</strong>: If research involves junior/school athletes under 18 years, informed written parental/guardian consent was documented.</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#334155' }}>
                    <input
                      type="checkbox"
                      required
                      checked={formData.licenseDeclaration}
                      onChange={e => setFormData({ ...formData, licenseDeclaration: e.target.checked })}
                      style={{ marginTop: '3px' }}
                    />
                    <span><strong>Diamond Open Access License *</strong>: I agree to license this preprint under Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International (CC BY-NC-ND 4.0).</span>
                  </label>
                </div>

                <div style={{ paddingTop: '12px' }}>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="kc-btn-primary"
                    style={{ padding: '12px 24px', fontSize: '14px', opacity: isSubmitting ? 0.7 : 1 }}
                  >
                    <SiteIcon name={isSubmitting ? 'loader' : 'upload'} size={16} />
                    <span>{isSubmitting ? 'Submitting to Database Queue...' : 'Submit Manuscript for Screening'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
export default KhelChronicleSubmitPage
