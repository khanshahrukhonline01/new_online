import { SiteIcon } from '../../shared/components/SiteIcon'

const providers = [
  { sport: 'Cricket', provider: 'GoSportsAPI', status: 'Credentials required' },
  { sport: 'Football', provider: 'API-FOOTBALL', status: 'Credentials required' },
  { sport: 'Tennis', provider: 'Live Tennis API', status: 'Credentials required' },
]

export default function LiveScoresPage() {
  return <section className="content-page live-scores-page">
    <p className="eyebrow">KHELGRID · LIVE SPORTS DATA</p>
    <h1>Live scores, when the feed is ready.</h1>
    <p className="page-intro">This match centre will show scores only after an authorised provider is configured, its permitted use is confirmed, and live responses are validated. There are no simulated matches on this page.</p>
    <div className="state-panel state-unavailable" role="status">
      <div className="state-symbol"><SiteIcon name="activity" size={18} /></div>
      <h2>Live feeds are not connected</h2>
      <p>No current scores, fixtures or match states are available from KhelGrid’s configured production feed. This does not mean there are no matches taking place.</p>
    </div>
    <h2>Provider setup checklist</h2>
    <div className="catalogue-grid live-provider-grid">
      {providers.map(item => <article className="catalogue-card" key={item.sport}>
        <span className="card-kicker">{item.sport.toUpperCase()}</span>
        <h2>{item.provider}</h2>
        <p>{item.status}</p>
        <p>Before display: verify account access, competition coverage, rate limits, caching rules, attribution, redistribution rights and provider terms.</p>
      </article>)}
    </div>
    <h2>What will be shown once connected</h2>
    <ul className="live-requirements">
      <li>Provider-sourced match status and scores, with a last-updated timestamp.</li>
      <li>Clear loading, no-coverage, stale-data, rate-limit and provider-error states.</li>
      <li>Competition and provider attribution as required by the relevant licence.</li>
      <li>No invented scores, fallback sample fixtures or fabricated “LIVE” badges.</li>
    </ul>
    <p className="coming-soon-note">The page will remain in this unavailable state until genuine provider credentials and approved terms are configured server-side. Do not put private API keys in browser environment variables.</p>
    <div className="hero-actions"><a className="secondary-link" href="mailto:khelgrid@gmail.com?subject=KhelGrid%20live%20sports%20provider">Contact about provider access</a><a className="primary-link" href="/sports">Browse sports <SiteIcon name="arrow-up-right" size={16} /></a></div>
  </section>
}
