import { useEffect, useState } from 'react'
import { getOpportunities, getSports, getVenues } from '../../integrations/supabase/public-client'
import type { CatalogueResult } from '../../integrations/supabase/public-client'
import type { Opportunity, Sport, Venue } from '../../shared/domain'
import { AsyncState } from '../../shared/components/AsyncState'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { TrialAlertActions } from '../opportunities/TrialAlertActions'
import { CURATED_OPPORTUNITIES } from '../../shared/data/curatedOpportunitiesData'
import { updatePageSeoMetadata, DEFAULT_KEYWORDS } from '../../shared/utils/seoAndShare'
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

  const cleanSlug = slug.replace(/^t-/, '')
  let record = result.status === 'ready'
    ? result.data.find(item =>
        item.slug === cleanSlug ||
        item.slug === slug ||
        item.slug.replace(/^t-/, '') === cleanSlug ||
        `t-${item.slug}` === slug
      )
    : undefined

  // Fallback to verified curated opportunity if remote DB is unavailable or cold
  if (!record && kind === 'opportunity') {
    record = CURATED_OPPORTUNITIES.find(item =>
      item.slug === cleanSlug ||
      item.slug === slug ||
      item.slug.replace(/^t-/, '') === cleanSlug ||
      `t-${item.slug}` === slug
    )
  }

  // Dynamic SEO & Structured Data for Opportunities
  useEffect(() => {
    if (kind !== 'opportunity' || !record) return

    const opp = record as Opportunity
    const title = `${opp.title} (${opp.city || 'India'}) · Dates, Eligibility & Registration | KhelGrid`
    const description = `${opp.title} in ${opp.city || 'India'} organized by ${opp.organizer_name || 'KhelGrid'}. Check eligibility, age criteria (${opp.age_category || 'All age groups'}), required documents, and registration deadline on KhelGrid.`
    const canonicalUrl = `https://khelgrid.com/opportunities/${opp.slug}`

    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          '@id': `https://khelgrid.com/opportunities/${opp.slug}#webpage`,
          url: canonicalUrl,
          name: title,
          description,
          isPartOf: {
            '@type': 'WebSite',
            '@id': 'https://khelgrid.com/#website',
            name: 'KhelGrid',
            url: 'https://khelgrid.com',
          },
        },
        {
          '@type': 'BreadcrumbList',
          '@id': `${canonicalUrl}#breadcrumb`,
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: 'https://khelgrid.com',
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Selection Trials',
              item: 'https://khelgrid.com/opportunities',
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: opp.title,
              item: canonicalUrl,
            },
          ],
        },
        {
          '@type': 'SportsEvent',
          name: opp.title,
          description,
          startDate: opp.starts_at || undefined,
          endDate: opp.ends_at || undefined,
          eventStatus: 'https://schema.org/EventScheduled',
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          location: {
            '@type': 'Place',
            name: opp.venue_name || opp.city || 'Designated Sports Arena',
            address: {
              '@type': 'PostalAddress',
              addressLocality: opp.city || 'India',
              addressCountry: 'IN',
            },
          },
          organizer: {
            '@type': 'Organization',
            name: opp.organizer_name || 'Sports Authority',
          },
          offers: {
            '@type': 'Offer',
            price: opp.registration_fee || 0,
            priceCurrency: 'INR',
            availability: 'https://schema.org/InStock',
            validFrom: opp.starts_at || undefined,
            url: opp.source_url || canonicalUrl,
          },
        },
        {
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: `Who is eligible for ${opp.title}?`,
              acceptedAnswer: {
                '@type': 'Answer',
                text: opp.eligibility_criteria || `Open to eligible athletes (${opp.age_category || 'as per guidelines'}) meeting the organizer criteria. Confirm with ${opp.organizer_name || 'organizers'} before attending.`,
              },
            },
            {
              '@type': 'Question',
              name: `What documents are required for registration?`,
              acceptedAnswer: {
                '@type': 'Answer',
                text: opp.required_documents && opp.required_documents.length > 0
                  ? opp.required_documents.join(', ')
                  : 'Aadhaar Card, original birth certificate, recent passport photos, and school/college bonafide certificate.',
              },
            },
            {
              '@type': 'Question',
              name: `What is the registration fee and application deadline?`,
              acceptedAnswer: {
                '@type': 'Answer',
                text: `Registration fee: ₹${opp.registration_fee ?? 0}. Application deadline: ${opp.application_deadline ? new Date(opp.application_deadline).toLocaleDateString('en-IN') : 'Check organizer announcement'}.`,
              },
            },
            {
              '@type': 'Question',
              name: `Where is the trial venue located?`,
              acceptedAnswer: {
                '@type': 'Answer',
                text: `${opp.venue_name || 'Designated sports ground'}, ${opp.city || 'India'}.`,
              },
            },
          ],
        },
      ],
    }

    const cleanup = updatePageSeoMetadata({
      title,
      description,
      canonicalUrl,
      keywords: [
        opp.title,
        opp.city || 'India',
        opp.organizer_name || 'Sports Authority',
        'selection trials 2026',
        'sports trials india',
        'open trials',
        'ट्रायल',
        'चयन',
        'अंडर-14',
        'अंडर-19',
        ...DEFAULT_KEYWORDS,
      ],
      ogType: 'website',
      jsonLd,
    })

    return cleanup
  }, [kind, record])

  const back = kind === 'sport' ? '/sports' : kind === 'opportunity' ? '/opportunities' : '/venues'
  const heading = kind === 'sport' ? 'Sport details' : kind === 'opportunity' ? 'Opportunity details' : 'Venue details'

  // If record is found from curated fallback, treat state as ready
  const effectiveState = record ? 'ready' : result.status

  return (
    <section className="content-page catalogue-detail-page">
      <a className="text-link" href={back}>
        <SiteIcon name="arrow-left" size={15} /> Back to {kind === 'sport' ? 'sports' : kind === 'opportunity' ? 'opportunities' : 'venues'}
      </a>
      <p className="eyebrow">{heading.toUpperCase()}</p>
      <AsyncState state={effectiveState} message={result.status === 'unavailable' && !record ? result.message : undefined}>
        {!record ? (
          <div className="state-panel" role="status">
            <span className="state-symbol">○</span>
            <h3>Published record not found</h3>
            <p>This item is not currently available in the public catalogue. It may have been unpublished or its address may have changed.</p>
            <a className="primary-link" href={back}>Browse published records</a>
          </div>
        ) : kind === 'sport' ? (
          <article className="catalogue-detail-card">
            <span className="card-kicker">SPORT</span>
            <h1>{(record as Sport).name}</h1>
            <p className="page-intro">This sport is listed in KhelGrid’s published sports catalogue.</p>
            <p>Record slug: <code>{record.slug}</code></p>
          </article>
        ) : kind === 'opportunity' ? (
          <OpportunityDetail item={record as Opportunity} />
        ) : (
          <VenueDetail item={record as Venue} />
        )}
      </AsyncState>
    </section>
  )
}

function OpportunityDetail({ item }: { item: Opportunity }) {
  const date = (value: string | null) => {
    if (!value) return 'Not provided'
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? 'Not provided' : new Intl.DateTimeFormat('en-IN', { dateStyle: 'long', timeZone: 'Asia/Kolkata' }).format(parsed)
  }

  return (
    <article className="catalogue-detail-card">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
        <span className="card-kicker" style={{ margin: 0 }}>{item.opportunity_type.replace('_', ' ')}</span>
        {Boolean(item.registration_fee && item.registration_fee > 0) && (
          <span className="tag" style={{ color: '#d97706', borderColor: 'rgba(217,119,6,0.3)', background: 'rgba(217,119,6,0.08)', fontSize: '12px', padding: '3px 8px', borderRadius: '6px' }}>
            ₹{item.registration_fee} Entry Fee
          </span>
        )}
        {item.registration_fee === 0 && (
          <span className="tag" style={{ color: '#16a34a', borderColor: 'rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.08)', fontSize: '12px', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
            ₹0 Free Entry
          </span>
        )}
        {item.age_category && (
          <span className="tag" style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '6px', opacity: 0.9 }}>
            {item.age_category}
          </span>
        )}
        {item.available_spots && (
          <span className="tag" style={{ color: '#2563eb', borderColor: 'rgba(37,99,235,0.3)', background: 'rgba(37,99,235,0.08)', fontSize: '12px', padding: '3px 8px', borderRadius: '6px' }}>
            {item.available_spots} Spots Available
          </span>
        )}
      </div>

      <h1>{item.title}</h1>
      <p className="page-intro">{[item.organizer_name, item.city, item.venue_name].filter(Boolean).join(' · ') || 'Organizer and location details have not been provided.'}</p>

      <dl className="detail-facts">
        <div><dt>Start date</dt><dd>{date(item.starts_at)}</dd></div>
        <div><dt>End date</dt><dd>{date(item.ends_at)}</dd></div>
        <div><dt>Application deadline</dt><dd>{date(item.application_deadline)}</dd></div>
        <div><dt>Source status</dt><dd>{item.verification_status === 'verified' ? 'Source reviewed' : item.verification_status === 'pending_review' ? 'Pending review' : item.verification_status === 'rejected' ? 'Rejected' : 'Not verified'}</dd></div>
      </dl>

      {item.eligibility_criteria && (
        <div style={{ marginTop: '20px', padding: '16px', background: 'var(--surface, #f9fafb)', borderRadius: '8px', border: '1px solid var(--line, #e5e7eb)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Eligibility Criteria</h3>
          <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.6 }}>{item.eligibility_criteria}</p>
        </div>
      )}

      {item.required_documents && item.required_documents.length > 0 && (
        <div style={{ marginTop: '16px', padding: '16px', background: 'var(--surface, #f9fafb)', borderRadius: '8px', border: '1px solid var(--line, #e5e7eb)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Required Verification Documents</h3>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: 1.6 }}>
            {item.required_documents.map((doc, idx) => (
              <li key={idx} style={{ marginBottom: '4px' }}>{doc}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="detail-disclaimer" style={{ marginTop: '20px' }}>
        Confirm eligibility, dates, fees and registration status with the organiser before applying. KhelGrid does not guarantee that this opportunity is still open.
      </p>

      {item.source_url ? (
        <a className="primary-link" href={item.source_url} target="_blank" rel="noopener noreferrer">
          Open organiser source <SiteIcon name="external-link" size={15}/>
        </a>
      ) : (
        <p>Original source link has not been provided.</p>
      )}

      <TrialAlertActions
        title={item.title}
        slug={item.slug}
        startsAt={item.starts_at}
        deadlineDate={item.application_deadline}
        city={item.city}
        venueName={item.venue_name}
      />
    </article>
  )
}

function VenueDetail({ item }: { item: Venue }) {
  return (
    <article className="catalogue-detail-card">
      <span className="card-kicker">VENUE</span>
      <h1>{item.name}</h1>
      <p className="page-intro"><SiteIcon name="map-pin" size={17}/> {item.city}</p>
      {item.address && <p>{item.address}</p>}
      {item.description && <p>{item.description}</p>}
      <div className="detail-disclaimer">
        <SiteIcon name="info" size={16}/> Booking, court-level prices and live availability are not connected. Contact the venue directly to confirm access, fees and hours.
      </div>
    </article>
  )
}
