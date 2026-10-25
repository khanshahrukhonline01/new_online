import type { ReactNode } from 'react'

type State = 'loading' | 'unconfigured' | 'unavailable' | 'empty' | 'ready'

export function AsyncState({ state, message, children }: { state: State; message?: string; children?: ReactNode }) {
  if (state === 'ready') return <>{children}</>
  const content = {
    loading: ['Loading catalogue', 'Fetching published records from the development data source.'],
    unconfigured: ['Data source not connected', 'Add the public Supabase URL and anon key to the local environment to load published records. No sample listings are shown.'],
    unavailable: ['Catalogue unavailable', message ?? 'The data source could not be reached. Please try again later.'],
    empty: ['Nothing published yet', 'There are no published records to display right now.'],
  } as const
  const [title, description] = content[state as Exclude<State, 'ready'>]
  return <div className="state-panel" role={state === 'unavailable' ? 'alert' : 'status'}><span className="state-symbol" aria-hidden="true">{state === 'loading' ? '…' : state === 'unconfigured' ? '↗' : state === 'empty' ? '○' : '!'}</span><h3>{title}</h3><p>{description}</p></div>
}
