import { useState, type FormEvent, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { RESEARCH_CATEGORIES } from './data/khelchronicleData'
import './khelchronicle.css'

interface KhelChronicleSubmitPageProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

export function KhelChronicleSubmitPage({ onNavigate }: KhelChronicleSubmitPageProps) {
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    category: 'sports-biomechanics',
    authors: '',
    affiliation: '',
    email: '',
    abstract: '',
    ethicsDeclaration: false,
    consentDeclaration: false,
  })

  const handleLink = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (onNavigate) {
      onNavigate(e, href)
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="kc-root">
      {/* Breadcrumb */}
      <nav style={{ padding: '16px 0', fontSize: '13px', color: '#64748b' }} aria-label="Breadcrumb">
        <a href="/khelchronicle" onClick={e => handleLink(e, '/khelchronicle')} style={{ color: '#0f172a', textDecoration: 'none' }}>
          KhelChronicle
        </a>
        <span> / </span>
        <span style={{ color: '#64748b' }}>Author Submission Guidelines</span>
      </nav>

      {/* Header */}
      <header className="kc-hero" style={{ paddingBottom: '24px' }}>
        <div className="kc-eyebrow-row">
          <span className="kc-badge-archive">
            <SiteIcon name="award" size={13} />
            <span>Preprint Submission</span>
          </span>
          <span className="kc-badge-open-access">Diamond Open Access</span>
          <span className="kc-badge-open-access">Zero Submission Fees</span>
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

          {/* Submission Form */}
          {submitted ? (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '32px', textAlign: 'center' }}>
              <SiteIcon name="check-circle" size={40} style={{ color: '#16a34a', marginBottom: '14px' }} />
              <h2 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: 800, color: '#14532d' }}>
                Manuscript Received for Screening
              </h2>
              <p style={{ margin: '0 0 20px', fontSize: '14.5px', color: '#166534', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
                Thank you! Your submission "{formData.title || 'Sports Science Research'}" has been logged in the KhelChronicle editorial screening queue. Our moderation desk will audit formatting and ethical clearances within 2 business days.
              </p>
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
                  onClick={() => { setSubmitted(false); setFormData({ title: '', category: 'sports-biomechanics', authors: '', affiliation: '', email: '', abstract: '', ethicsDeclaration: false, consentDeclaration: false }) }}
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

                <div>
                  <label htmlFor="authors-list" style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                    Authors &amp; Affiliations *
                  </label>
                  <input
                    id="authors-list"
                    type="text"
                    required
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                    placeholder="e.g. Dr. Rajeshwari Nair (LNIPE Gwalior), Dr. Alok Sen (KhelGrid Lab)"
                    value={formData.authors}
                    onChange={e => setFormData({ ...formData, authors: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="author-email" style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                    Corresponding Author Email *
                  </label>
                  <input
                    id="author-email"
                    type="email"
                    required
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                    placeholder="author@institution.edu.in"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#334155' }}>
                    <input
                      type="checkbox"
                      required
                      checked={formData.ethicsDeclaration}
                      onChange={e => setFormData({ ...formData, ethicsDeclaration: e.target.checked })}
                      style={{ marginTop: '3px' }}
                    />
                    <span>I declare that human-subject research protocols, ethical review standards, and data integrity requirements have been fulfilled.</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#334155' }}>
                    <input
                      type="checkbox"
                      required
                      checked={formData.consentDeclaration}
                      onChange={e => setFormData({ ...formData, consentDeclaration: e.target.checked })}
                      style={{ marginTop: '3px' }}
                    />
                    <span>I understand this submission will be published under Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International (CC BY-NC-ND 4.0).</span>
                  </label>
                </div>

                <div style={{ paddingTop: '12px' }}>
                  <button type="submit" className="kc-btn-primary" style={{ padding: '12px 24px', fontSize: '14px' }}>
                    <SiteIcon name="upload" size={16} />
                    <span>Submit Manuscript for Screening</span>
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
