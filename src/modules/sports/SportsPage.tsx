import { useEffect, useState } from 'react'
import { AsyncState } from '../../shared/components/AsyncState'
import type { CatalogueResult } from '../../integrations/supabase/public-client'
import { getSports } from '../../integrations/supabase/public-client'
import type { Sport } from '../../shared/domain'
import { SportIcon } from '../../shared/sports/sportIcons'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { CatalogueFilterPanel } from '../../shared/components/CatalogueFilterPanel'
import { useMemo } from 'react'

export default function SportsPage() {
  const [result, setResult] = useState<CatalogueResult<Sport> | { status: 'loading'; data: [] }>({ status: 'loading', data: [] })
  const initial = new URLSearchParams(window.location.search)
  const [query, setQuery] = useState(initial.get('q') ?? '')
  const [sort, setSort] = useState(initial.get('sort') ?? 'name')
  useEffect(() => { let active = true; getSports().then(value => { if (active) setResult(value) }); return () => { active = false } }, [])
  const records = result.status === 'ready' ? result.data : []
  const visible = useMemo(() => records.filter(sport => !query.trim() || sport.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).sort((a,b) => sort === 'reverse' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name)), [records,query,sort])
  return <section className="content-page"><p className="eyebrow">SPORTS DIRECTORY</p><h1>Find your sport.</h1><p className="page-intro">Explore the sports currently published on KhelGrid.</p><AsyncState state={result.status} message={result.status === 'unavailable' ? result.message : undefined}>{result.status === 'ready' && <div className="kg-catalogue-layout kg-no-filter-fields"><CatalogueFilterPanel search={query} onSearch={setQuery} searchPlaceholder="Search sports…" fields={[]} onClear={() => setQuery('')} /><div className="kg-catalogue-results"><div className="kg-results-toolbar"><span>{visible.length} of {records.length} sports</span><label>Sort by <select value={sort} onChange={e => setSort(e.target.value)}><option value="name">A to Z</option><option value="reverse">Z to A</option></select></label></div>{visible.length ? <div className="catalogue-grid">{visible.map(sport => <a className="catalogue-card" key={sport.id} href={`/sports/${sport.slug}`}><span className="sport-card-icon"><SportIcon name={sport.name} size={48} /></span><span className="card-kicker">SPORT</span><h2>{sport.name}</h2><span className="card-action">Explore <SiteIcon name="arrow-up-right" size={15} /></span></a>)}</div> : <div className="state-panel" role="status"><h3>No matching sports</h3><p>Try another sport name or clear your search.</p></div>}</div></div>}</AsyncState></section>
}
