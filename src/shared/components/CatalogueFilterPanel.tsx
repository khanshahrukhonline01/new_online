import { useEffect, useMemo, useState } from 'react'
import { SiteIcon } from './SiteIcon'

export type CatalogueFilterField = {
  key: string
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  inputType?: 'date' | 'select'
  onChange: (value: string) => void
}

type Props = {
  search: string
  onSearch: (value: string) => void
  searchPlaceholder?: string
  fields: CatalogueFilterField[]
  onClear: () => void
}

export function CatalogueFilterPanel({ search, onSearch, searchPlaceholder = 'Search catalogue…', fields, onClear }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const active = useMemo(() => fields.filter(field => field.value), [fields])
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (search.trim()) params.set('q', search.trim()); else params.delete('q')
    fields.forEach(field => field.value ? params.set(field.key, field.value) : params.delete(field.key))
    const query = params.toString()
    window.history.replaceState({}, '', window.location.pathname + (query ? '?' + query : '') + window.location.hash)
  }, [search, fields])
  const clear = () => { onClear(); setMobileOpen(false) }
  return <aside className="kg-filter-rail" aria-label="Catalogue filters">
    <div className="kg-filter-heading"><h2>Filters</h2><button type="button" onClick={clear}>Reset all</button></div>
    <button className="kg-filter-mobile-toggle" type="button" aria-expanded={mobileOpen} onClick={() => setMobileOpen(value => !value)}><SiteIcon name="sliders" size={17}/>{mobileOpen ? 'Hide filters' : 'Show filters'}{active.length > 0 && <span>{active.length}</span>}</button>
    <div className={mobileOpen ? 'kg-filter-fields is-open' : 'kg-filter-fields'}>
      <label className="kg-filter-search">Search<input type="search" value={search} onChange={event => onSearch(event.target.value)} placeholder={searchPlaceholder}/></label>
      {fields.map(field => <label className="kg-filter-field" key={field.key}>{field.label}{field.inputType === 'date' ? <input type="date" value={field.value} onChange={event => field.onChange(event.target.value)} /> : <select value={field.value} onChange={event => field.onChange(event.target.value)}><option value="">All {field.label.toLocaleLowerCase()}</option>{field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>}</label>)}
      {(search || active.length > 0) && <div className="kg-active-filters"><span>Active filters</span>{search && <button type="button" onClick={() => onSearch('')}>Search: {search} ×</button>}{active.map(field => <button type="button" key={field.key} onClick={() => field.onChange('')}>{field.label}: {field.options.find(option => option.value === field.value)?.label ?? field.value} ×</button>)}</div>}
      <button className="kg-filter-clear" type="button" onClick={clear}>Clear all filters</button>
    </div>
  </aside>
}
