import { SiteIcon } from '../../shared/components/SiteIcon'

type Props = { title: string; path: string }

export default function FeatureComingSoonPage({ title, path }: Props) {
  return <section className="content-page coming-soon-page">
    <p className="eyebrow">KHELGRID · IN DEVELOPMENT</p>
    <div className="coming-soon-mark" aria-hidden="true"><SiteIcon name="clock" size={28} /></div>
    <h1>{title}</h1>
    <p className="page-intro">This feature is not available yet. We’ll publish it here when the required data, services, and safeguards are ready.</p>
    <div className="coming-soon-status" role="status"><span className="status-dot warning" /> Coming soon</div>
    <p className="coming-soon-note">We won’t show fabricated listings, scores, availability, or account information while this feature is being prepared.</p>
    <div className="hero-actions">
      <a className="primary-link" href="/">Back to home <SiteIcon name="arrow-up-right" size={16} /></a>
      <a className="secondary-link" href="mailto:khelgrid@gmail.com?subject=KhelGrid%20feature%20request">Request this feature</a>
    </div>
    <p className="coming-soon-path">Page: <code>{path}</code></p>
  </section>
}
