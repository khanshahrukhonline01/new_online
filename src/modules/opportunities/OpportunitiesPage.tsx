import { useEffect, useState } from 'react'
import { AsyncState } from '../../shared/components/AsyncState'
import { getOpportunities } from '../../integrations/supabase/public-client'
import type { CatalogueResult } from '../../integrations/supabase/public-client'
import type { Opportunity } from '../../shared/domain'

function formatDate(value: string | null) {
  if (!value) return 'Date not provided'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date not provided' : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(date)
}

export default function OpportunitiesPage() {
  const [result, setResult] = useState<CatalogueResult<Opportunity> | { status: 'loading'; data: [] }>({ status: 'loading', data: [] })
  useEffect(() => { let active = true; getOpportunities().then(value => { if (active) setResult(value) }); return () => { active = false } }, [])
  return <section className="content-page"><p className="eyebrow">TRIALS · SELECTIONS · PROGRAMMES</p><h1>Your next opportunity.</h1><p className="page-intro">Published opportunities only. Check the source and organizer details before applying.</p><AsyncState state={result.status} message={result.status === 'unavailable' ? result.message : undefined}>{result.status === 'ready' && (result.data.length ? <div className="listing-stack">{result.data.map(item => <article className="listing-card" key={item.id}><div className="listing-topline"><span className="tag">{item.opportunity_type.replace('_', ' ')}</span><span className={item.verification_status === 'verified' ? 'verification verified' : 'verification'}>{item.verification_status === 'verified' ? 'Source reviewed' : 'Not verified'}</span></div><h2>{item.title}</h2><p>{[item.organizer_name, item.city, item.venue_name].filter(Boolean).join(' · ') || 'Location or organizer not provided'}</p><div className="listing-meta"><span>Start: {formatDate(item.starts_at)}</span>{item.application_deadline && <span>Deadline: {formatDate(item.application_deadline)}</span>}</div>{item.source_url && <a className="text-link" href={item.source_url} target="_blank" rel="noreferrer">View source {item.source_name ? `· ${item.source_name}` : ''} ↗</a>}</article>)}</div> : <AsyncState state="empty" />)}</AsyncState></section>
}
