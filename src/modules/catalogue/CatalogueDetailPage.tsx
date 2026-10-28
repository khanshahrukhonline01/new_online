import { useEffect, useState } from 'react'
import { getOpportunities, getSports, getVenues } from '../../integrations/supabase/public-client'
import type { CatalogueResult } from '../../integrations/supabase/public-client'
import type { Opportunity, Sport, Venue } from '../../shared/domain'
import { AsyncState } from '../../shared/components/AsyncState'
import { SiteIcon } from '../../shared/components/SiteIcon'
import './catalogue-detail.css'

type Kind = 'sport' | 'opportunity' | 'venue'
type RecordValue = Sport | Opportunity | Venue

export default function CatalogueDetailPage({ kind, slug }: { kind: Kind; slug: string }) {
  const [result, setResult] = useState<CatalogueResult<RecordValue> | { status: 'loading'; data: [] }>({ status: 'loading', data: [] })
  useEffect(() => {
    let active = true
    const load = kind === 'sport' ? getSports() : kind === 'opportunity' ? getOpportunities() : getVenues()
    load.then(value => { if (active) setResult(value as CatalogueResult<RecordValue>) })
    return () => { active = false }
  }, [kind])
  const record = result.status === 'ready' ? result.data.find(item => item.slug === slug) : undefined
  const back = kind === 'sport' ? '/sports' : kind === 'opportunity' ? '/opportunities' : '/venues'
  const heading = kind === 'sport' ? 'Sport details' : kind === 'opportunity' ? 'Opportunity details' : 'Venue details'
  return <section className="content-page catalogue-detail-page">
    <a className="text-link" href={back}><SiteIcon name="arrow-left" size={15} /> Back to {kind === 'sport' ? 'sports' : kind === 'opportunity' ? 'opportunities' : 'venues'}</a>
    <p className="eyebrow">{heading.toUpperCase()}</p>
    <AsyncState state={result.status} message={result.status === 'unavailable' ? result.message : undefined}>
      {!record ? <div className="state-panel" role="status"><span className="state-symbol">○</span><h3>Published record not found</h3><p>This item is not currently available in the public catalogue. It may have been unpublished or its address may have changed.</p><a className="primary-link" href={back}>Browse published records</a></div> :
        kind === 'sport' ? <article className="catalogue-detail-card"><span className="card-kicker">SPORT</span><h1>{(record as Sport).name}</h1><p className="page-intro">This sport is listed in KhelGrid’s published sports catalogue.</p><p>Record slug: <code>{record.slug}</code></p></article> :
        kind === 'opportunity' ? <OpportunityDetail item={record as Opportunity} /> : <VenueDetail item={record as Venue} />}
    </AsyncState>
  </section>
}

function OpportunityDetail({ item }: { item: Opportunity }) {
  const date = (value: string | null) => {
    if (!value) return 'Not provided'
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? 'Not provided' : new Intl.DateTimeFormat('en-IN', { dateStyle: 'long', timeZone: 'Asia/Kolkata' }).format(parsed)
  }
  return <article className="catalogue-detail-card">
    <span className="card-kicker">{item.opportunity_type.replace('_', ' ')}</span><h1>{item.title}</h1>
    <p className="page-intro">{[item.organizer_name, item.city, item.venue_name].filter(Boolean).join(' · ') || 'Organizer and location details have not been provided.'}</p>
    <dl className="detail-facts"><div><dt>Start date</dt><dd>{date(item.starts_at)}</dd></div><div><dt>End date</dt><dd>{date(item.ends_at)}</dd></div><div><dt>Application deadline</dt><dd>{date(item.application_deadline)}</dd></div><div><dt>Source status</dt><dd>{item.verification_status === 'verified' ? 'Source reviewed' : item.verification_status === 'pending_review' ? 'Pending review' : item.verification_status === 'rejected' ? 'Rejected' : 'Not verified'}</dd></div></dl>
    <p className="detail-disclaimer">Confirm eligibility, dates, fees and registration status with the organiser before applying. KhelGrid does not guarantee that this opportunity is still open.</p>
    {item.source_url ? <a className="primary-link" href={item.source_url} target="_blank" rel="noopener noreferrer">Open organiser source <SiteIcon name="external-link" size={15}/></a> : <p>Original source link has not been provided.</p>}
  </article>
}

function VenueDetail({ item }: { item: Venue }) {
  return <article className="catalogue-detail-card">
    <span className="card-kicker">VENUE</span><h1>{item.name}</h1>
    <p className="page-intro"><SiteIcon name="map-pin" size={17}/> {item.city}</p>
    {item.address && <p>{item.address}</p>}{item.description && <p>{item.description}</p>}
    <div className="detail-disclaimer"><SiteIcon name="info" size={16}/> Booking, court-level prices and live availability are not connected. Contact the venue directly to confirm access, fees and hours.</div>
  </article>
}
