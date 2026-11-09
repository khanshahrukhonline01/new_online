import { useEffect, useState } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { getAdminModerationQueue, moderateListingSubmission, type AdminModerationQueue } from '../../integrations/supabase/public-client'
import './AdminModerationPage.css'

export function AdminModerationPage() {
  const [queue, setQueue] = useState<AdminModerationQueue | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')

  const loadQueue = async () => {
    setLoading(true)
    setError('')
    try { setQueue(await getAdminModerationQueue()) }
    catch (cause) {
      setQueue(null)
      setError(cause instanceof Error ? cause.message : 'You are not authorized to access the moderation queue.')
    } finally { setLoading(false) }
  }
  useEffect(() => {
    void loadQueue()
    const handleAuthChange = () => { void loadQueue() }
    window.addEventListener('khelgrid:auth-changed', handleAuthChange)
    return () => window.removeEventListener('khelgrid:auth-changed', handleAuthChange)
  }, [])

  const review = async (id: string, decision: 'approved' | 'rejected') => {
    setBusyId(id)
    setError('')
    setNotice('')
    try {
      await moderateListingSubmission(id, decision, decision === 'approved'
        ? 'Approved after moderator review; catalogue publication remains a separate editorial action.'
        : 'Rejected after moderator review.')
      setNotice(decision === 'approved'
        ? 'Submission approved in the review queue. It has not been published to the public catalogue.'
        : 'Submission rejected.')
      await loadQueue()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The review could not be saved.') }
    finally { setBusyId(null) }
  }

  return (
    <section className="admin-page-root content-page">
      <header className="admin-header">
        <span className="admin-eyebrow"><SiteIcon name="shield-check" size={14} /> Protected moderation</span>
        <h1>Listing review queue</h1>
        <p className="admin-subtitle">Only accounts allowlisted in the development database can read or review these submissions. Approval does not automatically publish a listing.</p>
      </header>
      {error && <p className="state-panel state-unavailable" role="alert">{error}</p>}
      {notice && <p className="state-panel state-available" role="status">{notice}</p>}
      {loading ? <p>Loading protected review queue…</p> : queue ? (
        <>
          <div className="admin-metrics-grid">
            <div className="admin-metric-card highlight"><span className="admin-metric-val">{queue.stats.pendingSubmissionsCount}</span><span className="admin-metric-lbl">Pending submissions</span></div>
            <div className="admin-metric-card"><span className="admin-metric-val">{queue.stats.totalVenues}</span><span className="admin-metric-lbl">Published venues</span></div>
            <div className="admin-metric-card"><span className="admin-metric-val">{queue.stats.totalAcademies}</span><span className="admin-metric-lbl">Published academies</span></div>
          </div>
          {queue.pendingSubmissions.length === 0 ? <p>No submissions are waiting for review.</p> : (
            <div className="admin-items-list">
              {queue.pendingSubmissions.map(sub => (
                <article key={sub.id} className="admin-mod-card">
                  <div className="admin-mod-card-top">
                    <div className="admin-mod-card-title-group"><span className={`admin-type-pill ${sub.listing_type}`}>{sub.listing_type}</span><h3 className="admin-item-title">{sub.title}</h3></div>
                    <span className={`admin-status-badge ${sub.status}`}>{sub.status.replace('_', ' ')}</span>
                  </div>
                  <div className="admin-mod-card-meta">
                    {sub.city && <span><SiteIcon name="map-pin" size={14} /> {sub.city}</span>}
                    <span><SiteIcon name="calendar-check" size={14} /> {new Date(sub.created_at).toLocaleDateString('en-IN')}</span>
                    {sub.source_url && <a href={sub.source_url} target="_blank" rel="noreferrer">Official source ↗</a>}
                  </div>
                  {sub.details && <p className="admin-mod-card-desc">{sub.details}</p>}
                  {sub.status === 'pending_review' && <div className="admin-mod-card-actions">
                    <button type="button" className="admin-btn admin-btn-approve" disabled={busyId === sub.id} onClick={() => void review(sub.id, 'approved')}><SiteIcon name="badge-check" size={14} /> Approve for editorial publication review</button>
                    <button type="button" className="admin-btn admin-btn-reject" disabled={busyId === sub.id} onClick={() => void review(sub.id, 'rejected')}><SiteIcon name="close" size={14} /> Reject</button>
                  </div>}
                </article>
              ))}
            </div>
          )}
          <button type="button" className="admin-btn admin-btn-secondary" onClick={() => void loadQueue()}>Refresh queue</button>
        </>
      ) : <p>Sign in with an authorized moderator account to access the private queue.</p>}
    </section>
  )
}
