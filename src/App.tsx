const focusAreas = [
  { number: '01', title: 'Discover opportunities', description: 'A foundation for verified trials, scholarships, academies, and sports programmes.' },
  { number: '02', title: 'Follow the action', description: 'A sports centre designed for authorized feeds and clearly labelled data status.' },
  { number: '03', title: 'Build your sports profile', description: 'A future home for athletes, coaches, academies, and organizers.' },
]

export default function App() {
  return <main className="page-shell">
    <header className="topbar"><a className="brand" href="/" aria-label="Khelgrid home"><span className="brand-mark" aria-hidden="true">K</span><span>KHELGRID</span></a><span className="environment-label"><span className="status-dot" />New platform · Development</span></header>
    <section className="hero" aria-labelledby="hero-title"><p className="eyebrow">YOUR GAME. YOUR NEXT MOVE.</p><h1 id="hero-title">India’s next sporting opportunity starts here.</h1><p className="hero-copy">A fresh foundation for athletes, families, coaches, academies, and fans to discover what is next in sport.</p><a className="primary-link" href="#focus">Explore what we’re building <span aria-hidden="true">↘</span></a><div className="hero-footnote"><span className="status-dot warning" /><span>Early build — live feeds and account services are not connected yet.</span></div></section>
    <section className="focus-section" id="focus" aria-labelledby="focus-title"><div className="section-heading"><p className="eyebrow">A CLEAN START</p><h2 id="focus-title">Built around the sports journey.</h2></div><div className="focus-grid">{focusAreas.map(area => <article className="focus-card" key={area.number}><span className="card-number">{area.number}</span><h3>{area.title}</h3><p>{area.description}</p></article>)}</div></section>
    <footer className="footer"><span>© {new Date().getFullYear()} Khelgrid</span><span>Built from scratch. Production site unchanged.</span></footer>
  </main>
}
