import { useEffect, useState, useRef, type MouseEvent } from 'react'
import { SiteIcon } from '../../../shared/components/SiteIcon'
import { SPORTS_BOOKS, getDynamicSportsBooks, type SportsBook } from '../../learning/booksData'
import './FreeSportsBooksSection.css'

interface FreeSportsBooksSectionProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

export default function FreeSportsBooksSection({ onNavigate }: FreeSportsBooksSectionProps) {
  const [books, setBooks] = useState<SportsBook[]>(SPORTS_BOOKS)
  const railRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    getDynamicSportsBooks().then(data => {
      if (active && data.length > 0) {
        setBooks(data)
      }
    })
    return () => {
      active = false
    }
  }, [])

  const scrollRail = (direction: 'left' | 'right') => {
    if (!railRef.current) return
    const offset = direction === 'left' ? -340 : 340
    railRef.current.scrollBy({ left: offset, behavior: 'smooth' })
  }

  const handleCardClick = (e: MouseEvent<HTMLAnchorElement>, book: SportsBook) => {
    const targetUrl = `/learning?book=${book.id}`
    onNavigate?.(e, targetUrl)
  }

  return (
    <section className="home-section-container home-books-section" aria-label="Free sports books and coaching manuals">
      <div className="home-section-header">
        <div className="home-section-heading-group">
          <h2 className="home-section-title">
            <SiteIcon name="book-open" size={18} style={{ color: '#0ea5e9' }} />
            <span>Sports Books — Free to Read Online</span>
          </h2>
          <p className="home-section-subtitle">
            Open-access sports science, tactical playbooks, youth coaching manuals &amp; mental conditioning guides · 100% Free
          </p>
        </div>
        <div className="home-section-actions">
          <div className="home-scroll-arrows">
            <button
              type="button"
              aria-label="Scroll sports books left"
              className="home-arrow-btn"
              onClick={() => scrollRail('left')}
            >
              <SiteIcon name="arrow-left" size={15} />
            </button>
            <button
              type="button"
              aria-label="Scroll sports books right"
              className="home-arrow-btn"
              onClick={() => scrollRail('right')}
            >
              <SiteIcon name="arrow-right" size={15} />
            </button>
          </div>
          <a
            className="home-view-all-link"
            href="/learning"
            onClick={e => onNavigate?.(e, '/learning')}
          >
            <span>All Books in Learning Hub ({books.length})</span>
            <SiteIcon name="chevron-right" size={13} />
          </a>
        </div>
      </div>

      <div
        ref={railRef}
        className="home-touch-rail"
        tabIndex={0}
        aria-label="Free sports books catalog rail"
      >
        {books.map(book => (
          <a
            key={book.id}
            href={`/learning?book=${book.id}`}
            onClick={e => handleCardClick(e, book)}
            className="home-books-card"
            aria-label={`Read ${book.title} for free online`}
          >
            <div className="home-book-cover" style={{ background: book.coverGradient }}>
              <div className="home-book-cover-bg-art" aria-hidden="true">
                {book.coverEmoji}
              </div>
              <div className="home-book-badges-row">
                <span className="home-book-free-pill">
                  <span>📖 Free to Read</span>
                </span>
                <span className="home-book-category-pill">{book.category}</span>
              </div>
              <div className="home-book-cover-title">{book.title}</div>
            </div>

            <div className="home-book-content">
              <div className="home-book-author">
                <SiteIcon name="award" size={13} />
                <span>{book.author}</span>
              </div>
              <p className="home-book-synopsis">{book.subtitle}</p>

              <div className="home-book-meta-footer">
                <div className="home-book-stats">
                  <span>⏱ {book.readingTimeMinutes} min</span>
                  <span>📄 {book.totalPages} pp</span>
                </div>
                <span className="home-book-read-btn">
                  <span>Read Free</span>
                  <SiteIcon name="arrow-up-right" size={12} />
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}
