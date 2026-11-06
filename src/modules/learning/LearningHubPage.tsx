import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { SPORTS_BOOKS, type BookCategory, type SportsBook } from './booksData'
import './LearningHubPage.css'

interface LearningHubPageProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

const CATEGORIES: ('All' | BookCategory)[] = [
  'All',
  'Tactical Play',
  'Biomechanics',
  'Strength & Conditioning',
  'Mental Conditioning',
  'Sports Nutrition',
  'Grassroots Coaching',
]

export default function LearningHubPage({ onNavigate }: LearningHubPageProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<'All' | BookCategory>('All')
  const [activeBook, setActiveBook] = useState<SportsBook | null>(null)
  const [activeChapterIndex, setActiveChapterIndex] = useState(0)
  const [largeFont, setLargeFont] = useState(false)

  // Sync from URL search params on mount (e.g. /learning?book=modern-football-tactics)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const bookSlug = params.get('book')
      if (bookSlug) {
        const found = SPORTS_BOOKS.find(b => b.id === bookSlug)
        if (found) {
          setActiveBook(found)
          setActiveChapterIndex(0)
        }
      }
    }
  }, [])

  // Listen for Escape key to close reader
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeBook) {
        setActiveBook(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeBook])

  const openReader = (book: SportsBook, chapterIndex = 0) => {
    setActiveBook(book)
    setActiveChapterIndex(chapterIndex)
  }

  const closeReader = () => {
    setActiveBook(null)
  }

  const filteredBooks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return SPORTS_BOOKS.filter(book => {
      const matchesCategory = selectedCategory === 'All' || book.category === selectedCategory
      if (!matchesCategory) return false

      if (!query) return true

      const matchesTitle = book.title.toLowerCase().includes(query)
      const matchesSubtitle = book.subtitle.toLowerCase().includes(query)
      const matchesAuthor = book.author.toLowerCase().includes(query)
      const matchesSport = book.sport.toLowerCase().includes(query)
      const matchesHighlights = book.highlights.some(h => h.toLowerCase().includes(query))
      const matchesChapters = book.chapters.some(c => c.title.toLowerCase().includes(query))

      return matchesTitle || matchesSubtitle || matchesAuthor || matchesSport || matchesHighlights || matchesChapters
    })
  }, [searchQuery, selectedCategory])

  const currentChapter = activeBook?.chapters[activeChapterIndex]

  return (
    <div className="learning-hub-page">
      {/* Header Section */}
      <header className="learning-hero">
        <div className="learning-eyebrow">
          <SiteIcon name="book-open" size={15} />
          <span>KhelGrid Sports &amp; Learning Hub</span>
        </div>
        <h1 className="learning-title">Sports Books &amp; Tactical Manuals — Free to Read Online</h1>
        <p className="learning-intro">
          Access complete high-performance sports textbooks, coaching handbooks, biomechanics manuals, and tactical playbooks.
          Every manual is 100% free and open-access for athletes, coaches, and sports parents across India.
        </p>
      </header>

      {/* Stats Highlights Strip */}
      <section className="learning-stats-strip" aria-label="Learning Hub Highlights">
        <div className="learning-stat-item">
          <div className="learning-stat-icon" aria-hidden="true">📚</div>
          <div>
            <div className="learning-stat-val">{SPORTS_BOOKS.length} Complete Books</div>
            <div className="learning-stat-lbl">Full-text open manuals</div>
          </div>
        </div>
        <div className="learning-stat-item">
          <div className="learning-stat-icon" aria-hidden="true">⏱</div>
          <div>
            <div className="learning-stat-val">1,020+ Pages</div>
            <div className="learning-stat-lbl">Tactics, drills &amp; recovery</div>
          </div>
        </div>
        <div className="learning-stat-item">
          <div className="learning-stat-icon" aria-hidden="true">🇮🇳</div>
          <div>
            <div className="learning-stat-val">₹0 Free Forever</div>
            <div className="learning-stat-lbl">No subscription or paywall</div>
          </div>
        </div>
        <div className="learning-stat-item">
          <div className="learning-stat-icon" aria-hidden="true">🔬</div>
          <div>
            <div className="learning-stat-val">Evidence Based</div>
            <div className="learning-stat-lbl">SAI &amp; international standard</div>
          </div>
        </div>
      </section>

      {/* Search and Category Filters */}
      <section className="learning-controls" aria-label="Filter learning books">
        <div className="learning-search-wrap">
          <div className="learning-search-icon">
            <SiteIcon name="search" size={16} />
          </div>
          <input
            type="search"
            className="learning-search-input"
            placeholder="Search sports books by title, author, sport (cricket, football, sprint…)"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="Search free sports books"
          />
        </div>

        <div className="learning-categories-rail" role="tablist" aria-label="Book categories">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={selectedCategory === cat}
              className={`learning-cat-btn ${selectedCategory === cat ? 'is-active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Books Grid */}
      <main className="learning-books-grid" aria-label="Free sports books catalogue">
        {filteredBooks.map(book => (
          <article key={book.id} className="learning-book-card">
            <div className="learning-card-cover" style={{ background: book.coverGradient }}>
              <div className="learning-cover-bg-art" aria-hidden="true">
                {book.coverEmoji}
              </div>
              <div className="learning-cover-pills">
                <span className="learning-pill-free">100% Free Book</span>
                <span className="learning-pill-cat">{book.category}</span>
              </div>
              <h2 className="learning-cover-title">{book.title}</h2>
            </div>

            <div className="learning-card-body">
              <div className="learning-author-info">
                <SiteIcon name="award" size={14} />
                <span>{book.author}</span>
              </div>
              <div className="learning-author-role">{book.authorRole}</div>
              <p className="learning-card-desc">{book.description}</p>

              <div className="learning-highlights-box">
                <ul>
                  {book.highlights.slice(0, 2).map((hl, i) => (
                    <li key={i}>{hl}</li>
                  ))}
                </ul>
              </div>

              <div className="learning-card-footer">
                <div className="learning-meta-stats">
                  <span>⏱ {book.readingTimeMinutes} min</span>
                  <span>📄 {book.totalPages} pp</span>
                  <span>⭐ {book.rating}</span>
                </div>
                <button
                  type="button"
                  className="learning-open-reader-btn"
                  onClick={() => openReader(book, 0)}
                  aria-label={`Read ${book.title} online for free`}
                >
                  <span>Read Free</span>
                  <SiteIcon name="arrow-up-right" size={13} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </main>

      {/* Exploration Links */}
      <footer className="learning-footer-explore" style={{ marginTop: '2.5rem', textAlign: 'center', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.85rem' }}>
          Apply these tactical playbooks on real turf or dive deeper into peer-reviewed sports kinematics:
        </p>
        <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="/play"
            onClick={e => onNavigate?.(e, '/play')}
            style={{ color: '#38bdf8', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <span>Join Pickup Games</span>
            <SiteIcon name="arrow-up-right" size={13} />
          </a>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
          <a
            href="/khelchronicle"
            onClick={e => onNavigate?.(e, '/khelchronicle')}
            style={{ color: '#38bdf8', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <span>KhelChronicle Research Papers</span>
            <SiteIcon name="arrow-up-right" size={13} />
          </a>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
          <a
            href="/opportunities"
            onClick={e => onNavigate?.(e, '/opportunities')}
            style={{ color: '#38bdf8', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <span>Explore Sports Trials</span>
            <SiteIcon name="arrow-up-right" size={13} />
          </a>
        </div>
      </footer>

      {/* In-Browser Book Reader Modal */}
      {activeBook && currentChapter && (
        <div
          className="learning-reader-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="learning-reader-title"
          onClick={e => {
            if (e.target === e.currentTarget) closeReader()
          }}
        >
          <div className="learning-reader-modal">
            {/* Modal Header */}
            <div className="learning-reader-header">
              <div className="learning-reader-title-area">
                <h2 id="learning-reader-title" className="learning-reader-book-title">
                  {activeBook.title}
                </h2>
                <div className="learning-reader-author">
                  By {activeBook.author} · {activeBook.sport} ({activeBook.category}) · {activeBook.isbn}
                </div>
              </div>
              <button
                type="button"
                className="learning-reader-close-btn"
                onClick={closeReader}
                aria-label="Close Book Reader"
              >
                <span>Close Reader</span>
                <SiteIcon name="close" size={16} />
              </button>
            </div>

            {/* Navigation Strip */}
            <div className="learning-reader-nav-strip">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label htmlFor="chapter-selector" style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Chapter:
                </label>
                <select
                  id="chapter-selector"
                  className="learning-chapter-select"
                  value={activeChapterIndex}
                  onChange={e => setActiveChapterIndex(Number(e.target.value))}
                >
                  {activeBook.chapters.map((ch, idx) => (
                    <option key={ch.id} value={idx}>
                      Ch {ch.chapterNumber}: {ch.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="learning-reader-tools">
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Font Size:</span>
                <button
                  type="button"
                  className={`learning-font-btn ${!largeFont ? 'is-active' : ''}`}
                  onClick={() => setLargeFont(false)}
                  title="Standard Font Size"
                >
                  A
                </button>
                <button
                  type="button"
                  className={`learning-font-btn ${largeFont ? 'is-active' : ''}`}
                  onClick={() => setLargeFont(true)}
                  title="Large Font Size"
                >
                  A+
                </button>
              </div>
            </div>

            {/* Reader Body Content */}
            <div className={`learning-reader-body ${largeFont ? 'font-lg' : ''}`}>
              <div className="learning-chapter-meta">
                <span>CHAPTER {currentChapter.chapterNumber} OF {activeBook.chapters.length}</span>
                <span>·</span>
                <span>⏱ {currentChapter.readingTimeMinutes} min read</span>
              </div>
              <h3 className="learning-chapter-heading">{currentChapter.title}</h3>
              <p style={{ color: '#94a3b8', fontStyle: 'italic', marginBottom: '1.25rem' }}>
                {currentChapter.summary}
              </p>

              {/* Key Takeaways Box */}
              <div className="learning-reader-takeaways">
                <div className="learning-takeaways-title">Key Tactical Takeaways &amp; Drills</div>
                <ul>
                  {currentChapter.keyTakeaways.map((takeaway, i) => (
                    <li key={i}>{takeaway}</li>
                  ))}
                </ul>
              </div>

              {/* Full Text Paragraphs */}
              {currentChapter.content.map((paragraph, i) => (
                <p key={i} className="learning-reader-paragraph">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Footer Navigation */}
            <div className="learning-reader-footer-nav">
              <button
                type="button"
                className="learning-reader-step-btn"
                disabled={activeChapterIndex === 0}
                onClick={() => setActiveChapterIndex(prev => Math.max(0, prev - 1))}
              >
                <SiteIcon name="arrow-left" size={14} />
                <span>Previous Chapter</span>
              </button>

              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Page {activeChapterIndex + 1} of {activeBook.chapters.length}
              </span>

              <button
                type="button"
                className="learning-reader-step-btn"
                disabled={activeChapterIndex === activeBook.chapters.length - 1}
                onClick={() => setActiveChapterIndex(prev => Math.min(activeBook.chapters.length - 1, prev + 1))}
              >
                <span>Next Chapter</span>
                <SiteIcon name="arrow-right" size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
