import { useEffect, useState } from 'react'
import { AsyncState } from '../../shared/components/AsyncState'
import type { CatalogueResult } from '../../integrations/supabase/public-client'
import { getSports } from '../../integrations/supabase/public-client'
import type { Sport } from '../../shared/domain'

export default function SportsPage() {
  const [result, setResult] = useState<CatalogueResult<Sport> | { status: 'loading'; data: [] }>({ status: 'loading', data: [] })
  useEffect(() => { let active = true; getSports().then(value => { if (active) setResult(value) }); return () => { active = false } }, [])
  return <section className="content-page"><p className="eyebrow">SPORTS DIRECTORY</p><h1>Find your sport.</h1><p className="page-intro">Explore the sports currently published on KhelGrid.</p><AsyncState state={result.status} message={result.status === 'unavailable' ? result.message : undefined}>{result.status === 'ready' && (result.data.length ? <div className="catalogue-grid">{result.data.map(sport => <a className="catalogue-card" key={sport.id} href={`/sports/${sport.slug}`}><span className="card-kicker">SPORT</span><h2>{sport.name}</h2><span className="card-action">Explore <span aria-hidden="true">↗</span></span></a>)}</div> : <AsyncState state="empty" />)}</AsyncState></section>
}
