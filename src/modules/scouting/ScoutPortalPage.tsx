import { useState, useMemo, useEffect, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import {
  BASELINE_SCOUT_ATHLETES,
  SCOUT_SPORTS,
  SCOUT_AGE_GROUPS,
  getScoutShortlist,
  saveAthleteToShortlist,
  removeAthleteFromShortlist,
  generateScoutShortlistCsv,
  type ScoutAthlete,
} from './scoutingData'
import { ScoutConnectModal } from './ScoutConnectModal'
import './ScoutPortalPage.css'

export interface ScoutPortalPageProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void
}

export function ScoutPortalPage({ onNavigate }: ScoutPortalPageProps) {
  const [athletes] = useState<ScoutAthlete[]>(BASELINE_SCOUT_ATHLETES)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSport, setSelectedSport] = useState('All Sports')
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('all')
  const [selectedTier, setSelectedTier] = useState('all')
  const [minPercentile, setMinPercentile] = useState<number>(0)
  const [shortlistIds, setShortlistIds] = useState<string[]>([])
  const [isShortlistDrawerOpen, setIsShortlistDrawerOpen] = useState(false)
  const [selectedAthleteForConnect, setSelectedAthleteForConnect] = useState<ScoutAthlete | null>(null)
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    setShortlistIds(getScoutShortlist())
  }, [])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const handleLinkClick = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (onNavigate) {
      onNavigate(e, href)
    }
  }

  const toggleShortlist = (athlete: ScoutAthlete) => {
    if (shortlistIds.includes(athlete.id)) {
      const next = removeAthleteFromShortlist(athlete.id)
      setShortlistIds(next)
      showToast(`Removed ${athlete.name} from your Scouting Shortlist.`)
    } else {
      const next = saveAthleteToShortlist(athlete.id)
      setShortlistIds(next)
      showToast(`Added ${athlete.name} to your Scouting Shortlist!`)
    }
  }

  const filteredAthletes = useMemo(() => {
    return athletes.filter(ath => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = ath.name.toLowerCase().includes(q)
        const matchPos = ath.primaryPosition.toLowerCase().includes(q)
        const matchCity = ath.city.toLowerCase().includes(q)
        const matchState = ath.state.toLowerCase().includes(q)
        const matchAcad = ath.academy.toLowerCase().includes(q)
        const matchUid = ath.federationUid.toLowerCase().includes(q)
        if (!matchName && !matchPos && !matchCity && !matchState && !matchAcad && !matchUid) {
          return false
        }
      }

      // Sport
      if (selectedSport !== 'All Sports' && ath.sport !== selectedSport) {
        return false
      }

      // Age Group
      if (selectedAgeGroup !== 'all' && ath.ageGroup !== selectedAgeGroup) {
        return false
      }

      // Tier
      if (selectedTier !== 'all' && ath.verifiedTier !== selectedTier) {
        return false
      }

      // Percentile
      if (minPercentile > 0 && ath.percentileRank < minPercentile) {
        return false
      }

      return true
    })
  }, [athletes, searchQuery, selectedSport, selectedAgeGroup, selectedTier, minPercentile])

  const shortlistedAthletes = useMemo(() => {
    return athletes.filter(a => shortlistIds.includes(a.id))
  }, [athletes, shortlistIds])

  const handleExportCsv = () => {
    const listToExport = shortlistedAthletes.length > 0 ? shortlistedAthletes : filteredAthletes
    if (listToExport.length === 0) {
      showToast('No athletes available to export.')
      return
    }

    try {
      const csvData = generateScoutShortlistCsv(listToExport)
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `khelgrid-scout-dossier-${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      showToast(`Exported ${listToExport.length} athletes to CSV scouting dossier.`)
    } catch {
      showToast('Failed to export CSV. Please try again.')
    }
  }

  const handleClearShortlist = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('khelgrid_scout_shortlist_v1')
      setShortlistIds([])
      showToast('Cleared scouting shortlist.')
    }
  }

  const handleOpenConnect = (ath: ScoutAthlete) => {
    setSelectedAthleteForConnect(ath)
    setIsConnectModalOpen(true)
  }

  const resetFilters = () => {
    setSearchQuery('')
    setSelectedSport('All Sports')
    setSelectedAgeGroup('all')
    setSelectedTier('all')
    setMinPercentile(0)
  }

  const hasActiveFilters =
    Boolean(searchQuery) ||
    selectedSport !== 'All Sports' ||
    selectedAgeGroup !== 'all' ||
    selectedTier !== 'all' ||
    minPercentile > 0

  return (
    <main id="main-content" className="scout-portal-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="scout-toast" role="status" aria-live="polite">
          <SiteIcon name="badge-check" size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Header */}
      <header className="scout-hero">
        <div className="scout-hero-badge">
          <SiteIcon name="target" size={14} />
          <span>NIS &amp; SAI TALENT IDENTIFICATION DESK</span>
        </div>
        <div className="scout-hero-header-row">
          <div>
            <h1 className="scout-hero-title">
              Scout Portal &amp; Verified Athlete Workbench.
            </h1>
            <p className="scout-hero-desc">
              Designed for Sports Authority of India (SAI) selectors, NIS Patiala certified coaches, and premier league talent scouts to filter verified Indian youth athletes by empirical normative benchmarks, physical tests, and sanctioned federation achievements.
            </p>
          </div>
          <div className="scout-shortlist-action-box">
            <button
              type="button"
              className="btn-open-shortlist"
              onClick={() => setIsShortlistDrawerOpen(true)}
            >
              <SiteIcon name="bookmark" size={16} />
              <span>Scouting Book ({shortlistIds.length})</span>
            </button>
            <button
              type="button"
              className="btn-export-dossier"
              onClick={handleExportCsv}
              title="Download full scouting dossier in CSV format"
            >
              <SiteIcon name="file-text" size={15} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Metric Ribbons */}
        <div className="scout-metrics-row">
          <div className="scout-metric-card">
            <span className="metric-val">850+</span>
            <span className="metric-title">Verified Youth Athletes</span>
          </div>
          <div className="scout-metric-card">
            <span className="metric-val">90th+</span>
            <span className="metric-title">National Normative Percentiles</span>
          </div>
          <div className="scout-metric-card">
            <span className="metric-val">100%</span>
            <span className="metric-title">Federation UID Authenticated</span>
          </div>
          <div className="scout-metric-card">
            <span className="metric-val">0-Fraud</span>
            <span className="metric-title">Aadhaar &amp; TW3 Age-Check</span>
          </div>
        </div>
      </header>

      {/* Filter Workbench */}
      <section className="scout-filter-box" aria-label="Scouting filters">
        <div className="scout-search-bar">
          <SiteIcon name="search" size={18} />
          <input
            type="search"
            placeholder="Search by athlete name, position, academy, city, or federation UID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="Search athletes"
          />
          {searchQuery && (
            <button
              type="button"
              className="scout-clear-search-btn"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <SiteIcon name="close" size={14} />
            </button>
          )}
        </div>

        {/* Sport Chips */}
        <div className="scout-sports-bar" role="tablist" aria-label="Filter by sport">
          {SCOUT_SPORTS.map(sport => (
            <button
              key={sport}
              type="button"
              role="tab"
              aria-selected={selectedSport === sport}
              className={`scout-sport-chip ${selectedSport === sport ? 'is-active' : ''}`}
              onClick={() => setSelectedSport(sport)}
            >
              {sport}
            </button>
          ))}
        </div>

        {/* Secondary Filter Dropdowns */}
        <div className="scout-dropdowns-row">
          <div className="scout-dropdown-group">
            <label htmlFor="scout-age-filter">Age Category:</label>
            <select
              id="scout-age-filter"
              value={selectedAgeGroup}
              onChange={e => setSelectedAgeGroup(e.target.value)}
            >
              {SCOUT_AGE_GROUPS.map(grp => (
                <option key={grp.id} value={grp.id}>{grp.label}</option>
              ))}
            </select>
          </div>

          <div className="scout-dropdown-group">
            <label htmlFor="scout-tier-filter">Verification Tier:</label>
            <select
              id="scout-tier-filter"
              value={selectedTier}
              onChange={e => setSelectedTier(e.target.value)}
            >
              <option value="all">All Verification Levels</option>
              <option value="Tier-1 Verified">Tier-1 Verified Only (Aadhaar + Federation UID)</option>
              <option value="Tier-2 Verified">Tier-2 Verified (State Certificate Verified)</option>
            </select>
          </div>

          <div className="scout-dropdown-group">
            <label htmlFor="scout-percentile-filter">Normative Percentile:</label>
            <select
              id="scout-percentile-filter"
              value={minPercentile}
              onChange={e => setMinPercentile(Number(e.target.value))}
            >
              <option value={0}>All Athletes (50th+ percentile)</option>
              <option value={90}>Top 10% (90th+ percentile)</option>
              <option value={95}>Top 5% Elite (95th+ percentile)</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              className="scout-reset-btn"
              onClick={resetFilters}
            >
              <SiteIcon name="close" size={13} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </section>

      {/* Results Header */}
      <div className="scout-results-header">
        <span className="scout-count">
          Showing <strong>{filteredAthletes.length}</strong> verified {filteredAthletes.length === 1 ? 'athlete profile' : 'athlete profiles'}
        </span>
        <div className="scout-cross-links">
          <a
            href="/verification"
            onClick={e => handleLinkClick(e, '/verification')}
            className="scout-verify-desk-link"
          >
            <SiteIcon name="shield-check" size={14} />
            <span>Athlete Verification Desk</span>
          </a>
          <a
            href="/talent-scanner"
            onClick={e => handleLinkClick(e, '/talent-scanner')}
            className="scout-scanner-link"
          >
            <SiteIcon name="target" size={14} />
            <span>KhelChronicle Normative Scanner</span>
          </a>
        </div>
      </div>

      {/* Athletes Cards Grid */}
      {filteredAthletes.length === 0 ? (
        <div className="scout-empty-state">
          <SiteIcon name="users" size={40} />
          <h3>No athlete profiles match current scouting filters</h3>
          <p>Try broadening your sport or age filters, or lower the normative percentile threshold.</p>
          <button type="button" className="scout-empty-reset" onClick={resetFilters}>
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="scout-athlete-grid">
          {filteredAthletes.map(ath => {
            const isShortlisted = shortlistIds.includes(ath.id)
            return (
              <article key={ath.id} className="scout-athlete-card">
                {/* Header Badge */}
                <div className="scout-card-top">
                  <div className="scout-tier-pill">
                    <SiteIcon name="shield-check" size={13} />
                    <span>{ath.verifiedTier}</span>
                  </div>
                  <div className="scout-card-tags">
                    <span className="scout-card-sport">{ath.sport}</span>
                    <span className="scout-card-age">{ath.age} yrs · {ath.ageGroup}</span>
                  </div>
                </div>

                {/* Athlete Name & Hindi */}
                <h2 className="scout-athlete-name">{ath.name}</h2>
                <div className="scout-position-badge">
                  {ath.primaryPosition}
                </div>

                {/* Location & Academy */}
                <div className="scout-loc-line">
                  <SiteIcon name="map-pin" size={13} />
                  <span>{ath.city}, {ath.state}</span>
                </div>
                <div className="scout-academy-name">
                  <strong>Academy:</strong> {ath.academy}
                </div>
                <div className="scout-fed-uid">
                  <strong>Federation UID:</strong> <code>{ath.federationUid}</code>
                </div>

                {/* Percentile Ranking Bar */}
                <div className="scout-percentile-strip">
                  <div className="percentile-text-row">
                    <span>National Grassroots Normative Rank</span>
                    <strong>{ath.percentileRank}th Percentile</strong>
                  </div>
                  <div className="percentile-meter-bg">
                    <div
                      className="percentile-meter-fill"
                      style={{ width: `${ath.percentileRank}%` }}
                    />
                  </div>
                </div>

                {/* Normative Physical Performance Grid */}
                <div className="scout-metrics-table">
                  {ath.metrics.sprint30mSeconds && (
                    <div className="metric-chip">
                      <span className="m-label">30m Sprint</span>
                      <span className="m-val">{ath.metrics.sprint30mSeconds}s</span>
                    </div>
                  )}
                  {ath.metrics.cmjHeightCm && (
                    <div className="metric-chip">
                      <span className="m-label">Vertical Jump</span>
                      <span className="m-val">{ath.metrics.cmjHeightCm} cm</span>
                    </div>
                  )}
                  {ath.metrics.yoyoIr1Meters && (
                    <div className="metric-chip">
                      <span className="m-label">Yo-Yo IR1</span>
                      <span className="m-val">{ath.metrics.yoyoIr1Meters} m</span>
                    </div>
                  )}
                  {ath.metrics.speedOrVelocityKmph && (
                    <div className="metric-chip">
                      <span className="m-label">Speed / Velocity</span>
                      <span className="m-val">{ath.metrics.speedOrVelocityKmph} km/h</span>
                    </div>
                  )}
                </div>

                {/* Biometrics */}
                <div className="scout-biometrics-line">
                  <span>Height: {ath.heightCm} cm</span>
                  <span>Weight: {ath.weightKg} kg</span>
                  <span>Side: {ath.dominantSide}</span>
                </div>

                {/* Achievements */}
                <div className="scout-achievements-box">
                  <span className="ach-title">Verified Achievements:</span>
                  <ul className="ach-list">
                    {ath.achievements.map((ach, i) => (
                      <li key={i}>{ach}</li>
                    ))}
                  </ul>
                </div>

                {/* Scouting Notes Summary */}
                <p className="scout-eval-summary">
                  <strong>Scouting Evaluation:</strong> {ath.scoutingSummary}
                </p>

                {/* Action Buttons */}
                <div className="scout-card-actions">
                  <button
                    type="button"
                    className={`btn-shortlist-action ${isShortlisted ? 'is-shortlisted' : ''}`}
                    onClick={() => toggleShortlist(ath)}
                  >
                    <SiteIcon name="bookmark" size={15} />
                    <span>{isShortlisted ? 'In Scouting Book' : 'Add to Shortlist'}</span>
                  </button>

                  <button
                    type="button"
                    className="btn-connect-scout"
                    onClick={() => handleOpenConnect(ath)}
                  >
                    <span>Connect with Coach</span>
                    <SiteIcon name="arrow-up-right" size={15} />
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Shortlist Drawer Modal */}
      {isShortlistDrawerOpen && (
        <div
          className="scout-drawer-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortlist-drawer-title"
          onClick={e => {
            if (e.target === e.currentTarget) setIsShortlistDrawerOpen(false)
          }}
        >
          <div className="scout-drawer-panel">
            <header className="scout-drawer-header">
              <div>
                <h2 id="shortlist-drawer-title" className="drawer-title">
                  Scouting Shortlist ({shortlistedAthletes.length})
                </h2>
                <p className="drawer-sub">
                  Saved athlete profiles ready for camp nominations or academy trial invites.
                </p>
              </div>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setIsShortlistDrawerOpen(false)}
                aria-label="Close shortlist"
              >
                <SiteIcon name="close" size={18} />
              </button>
            </header>

            {shortlistedAthletes.length === 0 ? (
              <div className="drawer-empty-state">
                <SiteIcon name="bookmark" size={32} />
                <p>Your scouting book is empty. Click "Add to Shortlist" on any athlete profile to bookmark them here.</p>
              </div>
            ) : (
              <div className="drawer-list">
                {shortlistedAthletes.map(ath => (
                  <div key={ath.id} className="drawer-item">
                    <div className="drawer-item-info">
                      <strong>{ath.name}</strong>
                      <span className="drawer-item-sub">
                        {ath.sport} · {ath.primaryPosition} · {ath.city}
                      </span>
                      <span className="drawer-item-metrics">
                        {ath.percentileRank}th %ile · {ath.verifiedTier}
                      </span>
                    </div>
                    <div className="drawer-item-actions">
                      <button
                        type="button"
                        className="drawer-connect-btn"
                        onClick={() => {
                          setIsShortlistDrawerOpen(false)
                          handleOpenConnect(ath)
                        }}
                      >
                        Connect
                      </button>
                      <button
                        type="button"
                        className="drawer-remove-btn"
                        onClick={() => toggleShortlist(ath)}
                        aria-label="Remove from shortlist"
                      >
                        <SiteIcon name="close" size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <footer className="drawer-footer">
              <button
                type="button"
                className="drawer-export-csv"
                onClick={handleExportCsv}
                disabled={shortlistedAthletes.length === 0}
              >
                <SiteIcon name="file-text" size={15} />
                <span>Export Shortlist to CSV</span>
              </button>
              {shortlistedAthletes.length > 0 && (
                <button
                  type="button"
                  className="drawer-clear-all"
                  onClick={handleClearShortlist}
                >
                  Clear All
                </button>
              )}
            </footer>
          </div>
        </div>
      )}

      {/* Connect Modal */}
      <ScoutConnectModal
        athlete={selectedAthleteForConnect}
        isOpen={isConnectModalOpen}
        onClose={() => {
          setIsConnectModalOpen(false)
          setSelectedAthleteForConnect(null)
        }}
        onSuccessToast={showToast}
      />
    </main>
  )
}

export default ScoutPortalPage
