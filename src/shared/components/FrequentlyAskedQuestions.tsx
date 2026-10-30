import { useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import { SiteIcon } from './SiteIcon'
import { getFaqsForPath } from './faqData'
import './FrequentlyAskedQuestions.css'

interface FrequentlyAskedQuestionsProps {
  activePath?: string
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

export function FrequentlyAskedQuestions({ activePath = '/', onNavigate }: FrequentlyAskedQuestionsProps) {
  const currentContext = useMemo(() => getFaqsForPath(activePath), [activePath])
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    [currentContext.faqs[0]?.id || 'first']: true,
  })

  const toggleItem = (id: string) => {
    setOpenItems(prev => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const expandAll = () => {
    const allOpen: Record<string, boolean> = {}
    currentContext.faqs.forEach(faq => {
      allOpen[faq.id] = true
    })
    setOpenItems(allOpen)
  }

  const collapseAll = () => {
    setOpenItems({})
  }

  const handleLinkClick = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (onNavigate) {
      onNavigate(e, href)
    }
  }

  const faqSchema = useMemo(() => {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      name: `${currentContext.heading} - ${currentContext.contextName}`,
      description: currentContext.description,
      mainEntity: currentContext.faqs.map(item => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    }
  }, [currentContext])

  return (
    <section
      id="frequently-asked-questions"
      className="footer-faq-section"
      aria-labelledby="faq-section-heading"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="faq-container">
        {/* Header */}
        <div className="faq-header">
          <div className="faq-header-left">
            <div className="faq-tagline-row">
              <span className="faq-tagline-pill">
                <SiteIcon name="help-circle" size={14} style={{ color: 'var(--green-dark, #059669)' }} />
                <span>Got questions? We have answers.</span>
              </span>
              <span className="faq-context-badge">{currentContext.contextName}</span>
            </div>
            <h2 id="faq-section-heading" className="faq-title">
              Frequently Asked Questions
            </h2>
            <p className="faq-description">{currentContext.description}</p>
          </div>

          <div className="faq-controls">
            <button
              type="button"
              className="faq-control-btn"
              onClick={expandAll}
              aria-label="Expand all FAQ answers"
            >
              Expand all
            </button>
            <span className="faq-control-divider" aria-hidden="true">·</span>
            <button
              type="button"
              className="faq-control-btn"
              onClick={collapseAll}
              aria-label="Collapse all FAQ answers"
            >
              Collapse all
            </button>
          </div>
        </div>

        {/* FAQ Accordion List */}
        <div className="faq-list" role="region" aria-label="Questions and answers">
          {currentContext.faqs.map(item => {
            const isOpen = !!openItems[item.id]
            const answerId = `faq-answer-${item.id}`
            const buttonId = `faq-btn-${item.id}`

            return (
              <div
                key={item.id}
                className={`faq-item ${isOpen ? 'is-open' : ''}`}
              >
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    className="faq-question-btn"
                    onClick={() => toggleItem(item.id)}
                    aria-expanded={isOpen}
                    aria-controls={answerId}
                  >
                    <span className="faq-question-content">
                      <span className="faq-item-meta">
                        <span className="faq-category-label">{item.category}</span>
                        {item.badge && <span className="faq-item-badge">{item.badge}</span>}
                      </span>
                      <span className="faq-question-text">{item.question}</span>
                    </span>
                    <span className="faq-icon-wrap" aria-hidden="true">
                      <SiteIcon
                        name="chevron-down"
                        size={18}
                        className={`faq-chevron ${isOpen ? 'is-rotated' : ''}`}
                      />
                    </span>
                  </button>
                </h3>
                <div
                  id={answerId}
                  className={`faq-answer-panel ${isOpen ? 'is-expanded' : ''}`}
                  role="region"
                  aria-labelledby={buttonId}
                  hidden={!isOpen}
                >
                  <p className="faq-answer-text">{item.answer}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer Support Row */}
        <div className="faq-footer-note">
          <div className="faq-footer-text">
            <strong>Have another question?</strong>
            <span>
              Reach our athlete guidance desk at{' '}
              <a href="mailto:khelgrid@gmail.com" className="faq-mail-link">
                khelgrid@gmail.com
              </a>{' '}
              or explore our verified{' '}
              <a
                href="/trust"
                className="faq-page-link"
                onClick={e => handleLinkClick(e, '/trust')}
              >
                Trust Center
              </a>.
            </span>
          </div>
          <a
            href="/search"
            className="faq-explore-link"
            onClick={e => handleLinkClick(e, '/search')}
          >
            <span>Search full catalogue</span>
            <SiteIcon name="chevron-right" size={13} />
          </a>
        </div>
      </div>
    </section>
  )
}
export default FrequentlyAskedQuestions
