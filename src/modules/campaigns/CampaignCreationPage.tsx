import React, { useState } from 'react'
import {
  createCampaign,
  formatPaiseToInr,
  type CampaignCategory,
  type DeliverableType,
  type DeliverableSpec,
  type AdvertiserRole,
  type SocialPlatform,
} from './campaignClient'
import { SiteIcon } from '../../shared/components/SiteIcon'
import './CampaignCreationPage.css'

interface CampaignCreationPageProps {
  onNavigate?: (event?: React.MouseEvent<HTMLAnchorElement>, target?: string) => void
}

export function CampaignCreationPage({ onNavigate }: CampaignCreationPageProps) {
  const [currentStep, setCurrentStep] = useState<number>(1)

  // Step 1: Basics
  const [title, setTitle] = useState('')
  const [purpose, setPurpose] = useState('')
  const [category, setCategory] = useState<CampaignCategory>('academy_admissions')
  const [sport, setSport] = useState('Cricket')
  const [locationCity, setLocationCity] = useState('Delhi NCR')
  const [language, setLanguage] = useState('Hindi & English')
  const [targetAudience, setTargetAudience] = useState('')
  const [advertiserName, setAdvertiserName] = useState('')
  const [advertiserRole, setAdvertiserRole] = useState<AdvertiserRole>('academy')
  const [advertiserContact, setAdvertiserContact] = useState('')

  // Step 2: Deliverables
  const [deliverableType, setDeliverableType] = useState<DeliverableType>('reel_short')
  const [deliverableTitle, setDeliverableTitle] = useState('Academy Walkthrough & Coaching Drill')
  const [deliverableQuantity, setDeliverableQuantity] = useState<number>(1)
  const [deliverableDesc, setDeliverableDesc] = useState('Showcase facilities, batch coaching, and admission process.')
  const [requiredHashtagsInput, setRequiredHashtagsInput] = useState('#KhelGrid #CricketAcademy')
  const [mandatoryDisclosure, setMandatoryDisclosure] = useState('Paid partnership with Academy #Ad')
  const [deadlineDays, setDeadlineDays] = useState<number>(7)
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>(['youtube', 'instagram'])

  // Step 3: Compensation & Budget
  const [perDeliverableFeeRupees, setPerDeliverableFeeRupees] = useState<number>(3500) // ₹3,500
  const [totalBudgetRupees, setTotalBudgetRupees] = useState<number>(35000) // ₹35,000

  // Step 4: Compliance & Guidelines
  const [keyMessagesInput, setKeyMessagesInput] = useState('Verified coaches\nWorld class turf nets\nOpen admission trials')
  const [prohibitedClaimsInput, setProhibitedClaimsInput] = useState('No 100% selection guarantees\nNo artificial views or bot engagement')
  const [terms, setTerms] = useState('Creators must tag official account and display clear #Ad disclosures.')
  const [antiSpamConfirmed, setAntiSpamConfirmed] = useState(false)

  // Submission Status
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submittedCampaignId, setSubmittedCampaignId] = useState('')
  const [errorBanner, setErrorBanner] = useState<string | null>(null)

  const handleNav = (targetPath: string, e?: React.MouseEvent<HTMLAnchorElement>) => {
    if (e) e.preventDefault()
    if (onNavigate) {
      onNavigate(e, targetPath)
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', targetPath)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }

  const togglePlatform = (p: SocialPlatform) => {
    if (selectedPlatforms.includes(p)) {
      if (selectedPlatforms.length > 1) {
        setSelectedPlatforms(selectedPlatforms.filter(x => x !== p))
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, p])
    }
  }

  const handleNextStep = () => {
    setErrorBanner(null)
    if (currentStep === 1) {
      if (!title.trim() || !purpose.trim() || !advertiserName.trim() || !advertiserContact.trim()) {
        setErrorBanner('Please fill in all required fields in Step 1 (Title, Purpose, Advertiser Name, Contact).')
        return
      }
    } else if (currentStep === 2) {
      if (!deliverableTitle.trim() || !deliverableDesc.trim() || !mandatoryDisclosure.trim()) {
        setErrorBanner('Please complete all deliverable specifications including disclosure instructions.')
        return
      }
    } else if (currentStep === 3) {
      if (perDeliverableFeeRupees <= 0 || totalBudgetRupees <= 0) {
        setErrorBanner('Fee and budget amounts must be positive numbers.')
        return
      }
      if (totalBudgetRupees < perDeliverableFeeRupees) {
        setErrorBanner('Total budget cannot be lower than the per-deliverable fee.')
        return
      }
    }
    setCurrentStep(prev => Math.min(prev + 1, 4))
  }

  const handleSubmitCampaign = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorBanner(null)

    if (!antiSpamConfirmed) {
      setErrorBanner('You must accept KhelGrid creator compliance and anti-artificial-engagement standards.')
      return
    }

    const deliverableSpecs: DeliverableSpec[] = [
      {
        id: `deliv-${Date.now()}-1`,
        type: deliverableType,
        title: deliverableTitle,
        quantity: deliverableQuantity,
        description: deliverableDesc,
        requiredHashtags: requiredHashtagsInput.split(/[\s,]+/).filter(Boolean),
        mandatoryDisclosure: mandatoryDisclosure.trim(),
        deadlineDays: Number(deadlineDays) || 7,
      },
    ]

    const keyMessages = keyMessagesInput.split('\n').map(s => s.trim()).filter(Boolean)
    const prohibitedClaims = prohibitedClaimsInput.split('\n').map(s => s.trim()).filter(Boolean)

    const newCamp = createCampaign({
      title: title.trim(),
      purpose: purpose.trim(),
      category,
      sport,
      locationCity: locationCity.trim(),
      language: language.trim(),
      advertiserName: advertiserName.trim(),
      advertiserRole,
      advertiserVerified: false,
      advertiserContact: advertiserContact.trim(),
      compensationModel: 'fixed_deliverable',
      perDeliverableFeePaise: Math.round(perDeliverableFeeRupees * 100),
      totalBudgetPaise: Math.round(totalBudgetRupees * 100),
      deliverables: deliverableSpecs,
      keyMessages,
      prohibitedClaims,
      targetAudience: targetAudience.trim() || 'Grassroots sports enthusiasts & parents',
      requiredChannels: selectedPlatforms,
      termsAndConditions: terms.trim(),
      deadlineAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })

    setSubmittedCampaignId(newCamp.id)
    setIsSubmitted(true)
  }

  return (
    <div className="campaign-creation-page">
      {/* Top Breadcrumb */}
      <div className="creation-top-bar">
        <div className="creation-breadcrumbs">
          <button type="button" className="crumb-btn" onClick={() => handleNav('/campaigns')}>
            <SiteIcon name="arrow-left" size={14} /> Back to Marketplace
          </button>
          <span className="crumb-sep">/</span>
          <span className="crumb-current">Post a Creator Campaign</span>
        </div>
      </div>

      <header className="creation-header">
        <div className="creation-badge">
          <SiteIcon name="award" size={14} />
          <span>Advertiser &amp; Sports Business Studio</span>
        </div>
        <h1>Create a Sports Creator Campaign</h1>
        <p>
          Commission authentic content from verified sports athletes, coaches, and creators.
          Every campaign is reviewed by KhelGrid moderators to safeguard grassroots sports standards.
        </p>
      </header>

      {isSubmitted ? (
        <section className="submission-success-card" role="region" aria-label="Campaign submitted">
          <div className="success-icon-wrap">
            <SiteIcon name="check-circle" size={48} />
          </div>
          <h2>Campaign Submitted for Editorial Review!</h2>
          <p className="success-ref">
            Reference ID: <code>{submittedCampaignId}</code>
          </p>
          <p className="success-desc">
            Your campaign <strong>&ldquo;{title}&rdquo;</strong> has been saved with status <code>submitted</code>.
            KhelGrid moderators will review the campaign brief, disclosure statements, and budget parameters within 24 hours.
            Listing on KhelGrid is 100% free with zero platform commission.
          </p>

          <div className="success-actions">
            <button
              type="button"
              className="btn-pri-action"
              onClick={() => handleNav('/campaigns/manage')}
            >
              <SiteIcon name="chart" size={16} />
              <span>Go to Advertiser Dashboard</span>
            </button>
            <button
              type="button"
              className="btn-sec-action"
              onClick={() => handleNav('/campaigns')}
            >
              <SiteIcon name="home" size={16} />
              <span>Explore Marketplace</span>
            </button>
          </div>
        </section>
      ) : (
        <div className="wizard-container">
          {/* Step Progress Indicators */}
          <nav className="step-progress-bar" aria-label="Wizard Steps">
            <div className={`step-item ${currentStep === 1 ? 'is-active' : ''} ${currentStep > 1 ? 'is-done' : ''}`}>
              <span className="step-num">1</span>
              <span className="step-label">Basics &amp; Organisation</span>
            </div>
            <div className="step-divider" />
            <div className={`step-item ${currentStep === 2 ? 'is-active' : ''} ${currentStep > 2 ? 'is-done' : ''}`}>
              <span className="step-num">2</span>
              <span className="step-label">Deliverables &amp; Formats</span>
            </div>
            <div className="step-divider" />
            <div className={`step-item ${currentStep === 3 ? 'is-active' : ''} ${currentStep > 3 ? 'is-done' : ''}`}>
              <span className="step-num">3</span>
              <span className="step-label">Budget &amp; Reward</span>
            </div>
            <div className="step-divider" />
            <div className={`step-item ${currentStep === 4 ? 'is-active' : ''}`}>
              <span className="step-num">4</span>
              <span className="step-label">Guidelines &amp; Review</span>
            </div>
          </nav>

          {errorBanner && (
            <div className="wizard-error-banner" role="alert">
              <SiteIcon name="alert-circle" size={18} />
              <span>{errorBanner}</span>
            </div>
          )}

          <form onSubmit={handleSubmitCampaign} className="wizard-form">
            {/* STEP 1: BASICS */}
            {currentStep === 1 && (
              <section className="wizard-step-section">
                <h3>Step 1: Campaign Basics &amp; Organisation</h3>
                <p className="section-help">Tell creators about your academy, brand, or tournament.</p>

                <div className="form-group">
                  <label htmlFor="camp-title">Campaign Title *</label>
                  <input
                    id="camp-title"
                    type="text"
                    placeholder="e.g. Delhi Cricket Academy Summer Camp 2026 Admissions"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="camp-category">Campaign Category *</label>
                    <select
                      id="camp-category"
                      value={category}
                      onChange={e => setCategory(e.target.value as CampaignCategory)}
                    >
                      <option value="academy_admissions">Academy Admissions</option>
                      <option value="tournament_awareness">Tournament / Trials Promotion</option>
                      <option value="brand_story">Sports Brand / Apparel / Equipment</option>
                      <option value="coaching_clinic">Coaching Clinics &amp; Masterclasses</option>
                      <option value="venue_showcase">Turf &amp; Venue Awareness</option>
                      <option value="opportunity_distribution">Grassroots Opportunity Distribution</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="camp-sport">Sport *</label>
                    <select
                      id="camp-sport"
                      value={sport}
                      onChange={e => setSport(e.target.value)}
                    >
                      <option value="Cricket">Cricket</option>
                      <option value="Football">Football</option>
                      <option value="Badminton">Badminton</option>
                      <option value="Tennis">Tennis</option>
                      <option value="Basketball">Basketball</option>
                      <option value="Athletics">Athletics</option>
                      <option value="Kabaddi">Kabaddi</option>
                      <option value="Multi-Sport">Multi-Sport</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="camp-purpose">Campaign Purpose &amp; Summary *</label>
                  <textarea
                    id="camp-purpose"
                    rows={3}
                    placeholder="Describe what you want to achieve (e.g. recruit 50 junior cricket trainees for summer camp)..."
                    value={purpose}
                    onChange={e => setPurpose(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row-3">
                  <div className="form-group">
                    <label htmlFor="camp-city">City / Region *</label>
                    <input
                      id="camp-city"
                      type="text"
                      placeholder="e.g. Delhi NCR, Bengaluru"
                      value={locationCity}
                      onChange={e => setLocationCity(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="camp-lang">Language Preference</label>
                    <input
                      id="camp-lang"
                      type="text"
                      placeholder="e.g. Hindi, English"
                      value={language}
                      onChange={e => setLanguage(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="camp-target-aud">Target Audience</label>
                    <input
                      id="camp-target-aud"
                      type="text"
                      placeholder="e.g. Parents of athletes aged 8-16"
                      value={targetAudience}
                      onChange={e => setTargetAudience(e.target.value)}
                    />
                  </div>
                </div>

                <div className="advertiser-details-box">
                  <h4>Your Organisation Details</h4>
                  <div className="form-row-3">
                    <div className="form-group">
                      <label htmlFor="adv-name">Organisation Name *</label>
                      <input
                        id="adv-name"
                        type="text"
                        placeholder="e.g. Prakash Padukone Academy"
                        value={advertiserName}
                        onChange={e => setAdvertiserName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="adv-role">Your Role *</label>
                      <select
                        id="adv-role"
                        value={advertiserRole}
                        onChange={e => setAdvertiserRole(e.target.value as AdvertiserRole)}
                      >
                        <option value="academy">Academy / Training Center</option>
                        <option value="sports_brand">Sports Brand / Manufacturer</option>
                        <option value="coach">Independent Coach</option>
                        <option value="tournament">Tournament Organiser</option>
                        <option value="venue">Venue / Turf Operator</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="adv-contact">Contact Email *</label>
                      <input
                        id="adv-contact"
                        type="email"
                        placeholder="e.g. contact@academy.in"
                        value={advertiserContact}
                        onChange={e => setAdvertiserContact(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* STEP 2: DELIVERABLES */}
            {currentStep === 2 && (
              <section className="wizard-step-section">
                <h3>Step 2: Deliverable Specifications &amp; Formats</h3>
                <p className="section-help">Specify what content deliverables creators must submit for review.</p>

                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="del-type">Deliverable Format *</label>
                    <select
                      id="del-type"
                      value={deliverableType}
                      onChange={e => setDeliverableType(e.target.value as DeliverableType)}
                    >
                      <option value="reel_short">Reel / YouTube Short (Vertical Video)</option>
                      <option value="long_video">Long-Form Video (5+ mins, Match/Training Vlog)</option>
                      <option value="post_photo">Carousel / Photo Post with Detailed Review</option>
                      <option value="story_status">Story Series / Status Announcement</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="del-qty">Quantity required per creator</label>
                    <input
                      id="del-qty"
                      type="number"
                      min="1"
                      max="10"
                      value={deliverableQuantity}
                      onChange={e => setDeliverableQuantity(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="del-title">Deliverable Title *</label>
                  <input
                    id="del-title"
                    type="text"
                    value={deliverableTitle}
                    onChange={e => setDeliverableTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="del-desc">Deliverable Description &amp; Requirements *</label>
                  <textarea
                    id="del-desc"
                    rows={3}
                    value={deliverableDesc}
                    onChange={e => setDeliverableDesc(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="del-tags">Required Hashtags</label>
                    <input
                      id="del-tags"
                      type="text"
                      placeholder="#KhelGrid #CricketDelhi"
                      value={requiredHashtagsInput}
                      onChange={e => setRequiredHashtagsInput(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="del-turnaround">Turnaround Deadline (Days)</label>
                    <input
                      id="del-turnaround"
                      type="number"
                      min="1"
                      max="30"
                      value={deadlineDays}
                      onChange={e => setDeadlineDays(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="del-disclosure">Mandatory Sponsorship Disclosure Instruction *</label>
                  <input
                    id="del-disclosure"
                    type="text"
                    value={mandatoryDisclosure}
                    onChange={e => setMandatoryDisclosure(e.target.value)}
                    required
                  />
                  <small className="field-hint">
                    Required by Indian Advertising Standards Council (ASCI) and DPDP safety guidelines.
                  </small>
                </div>

                <div className="platforms-selection-box">
                  <span className="box-label">Eligible Social Platforms:</span>
                  <div className="platforms-chips-group">
                    {(['youtube', 'instagram', 'x_twitter', 'linkedin'] as SocialPlatform[]).map(plat => (
                      <button
                        key={plat}
                        type="button"
                        className={`platform-chip ${selectedPlatforms.includes(plat) ? 'is-selected' : ''}`}
                        onClick={() => togglePlatform(plat)}
                      >
                        <SiteIcon name={selectedPlatforms.includes(plat) ? 'check' : 'plus'} size={14} />
                        <span>{plat.toUpperCase().replace('_', ' ')}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* STEP 3: BUDGET */}
            {currentStep === 3 && (
              <section className="wizard-step-section">
                <h3>Step 3: Budget &amp; Compensation Model</h3>
                <p className="section-help">
                  All rewards are stored in integer minor units (paise) with zero floating point errors.
                  Listing on KhelGrid is 100% free.
                </p>

                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="fee-rupees">Per-Deliverable Creator Fee (₹ INR) *</label>
                    <input
                      id="fee-rupees"
                      type="number"
                      min="500"
                      step="100"
                      value={perDeliverableFeeRupees}
                      onChange={e => setPerDeliverableFeeRupees(Number(e.target.value))}
                      required
                    />
                    <small className="field-hint">
                      Stored as {perDeliverableFeeRupees * 100} paise. Creators receive this upon deliverable acceptance.
                    </small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="budget-rupees">Total Allocated Campaign Budget (₹ INR) *</label>
                    <input
                      id="budget-rupees"
                      type="number"
                      min={perDeliverableFeeRupees}
                      step="500"
                      value={totalBudgetRupees}
                      onChange={e => setTotalBudgetRupees(Number(e.target.value))}
                      required
                    />
                    <small className="field-hint">
                      Supports up to {Math.floor(totalBudgetRupees / (perDeliverableFeeRupees || 1))} creator deliverables.
                    </small>
                  </div>
                </div>

                <div className="budget-summary-card">
                  <div className="summary-row">
                    <span>Per Deliverable Fee:</span>
                    <strong>{formatPaiseToInr(perDeliverableFeeRupees * 100)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Total Campaign Budget:</span>
                    <strong>{formatPaiseToInr(totalBudgetRupees * 100)}</strong>
                  </div>
                  <div className="summary-row free-listing-row">
                    <span>Platform Commission:</span>
                    <span className="free-badge">₹0 (100% Free Grassroots Listing)</span>
                  </div>
                </div>

                <div className="safety-callout">
                  <SiteIcon name="shield-check" size={20} />
                  <div>
                    <strong>Financial Safety Architecture:</strong>
                    <p>
                      In compliance with KhelGrid financial safety invariants, payouts remain safely locked in sandbox mode.
                      Creator earnings are recorded in an immutable ledger and will be settled upon platform unfreeze.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* STEP 4: COMPLIANCE & REVIEW */}
            {currentStep === 4 && (
              <section className="wizard-step-section">
                <h3>Step 4: Guidelines, Prohibited Claims &amp; Final Review</h3>
                <p className="section-help">Enforce strict sports content guidelines and anti-spam standards.</p>

                <div className="form-group">
                  <label htmlFor="key-msgs">Key Messages to Communicate (one per line) *</label>
                  <textarea
                    id="key-msgs"
                    rows={3}
                    value={keyMessagesInput}
                    onChange={e => setKeyMessagesInput(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="prohib-claims">Prohibited Claims (one per line) *</label>
                  <textarea
                    id="prohib-claims"
                    rows={3}
                    value={prohibitedClaimsInput}
                    onChange={e => setProhibitedClaimsInput(e.target.value)}
                    required
                  />
                  <small className="field-hint">
                    Example: No unrealistic selection guarantees, no unverified medical benefits.
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="camp-terms">Campaign Terms &amp; Conditions</label>
                  <textarea
                    id="camp-terms"
                    rows={2}
                    value={terms}
                    onChange={e => setTerms(e.target.value)}
                  />
                </div>

                <div className="anti-spam-consent-wrap">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={antiSpamConfirmed}
                      onChange={e => setAntiSpamConfirmed(e.target.checked)}
                      required
                    />
                    <span>
                      I certify that this campaign complies with KhelGrid standards: no artificial engagement schemes,
                      no bot traffic incentives, and all deliverables require verified publication with #Ad disclosure.
                    </span>
                  </label>
                </div>
              </section>
            )}

            {/* Wizard Navigation Footer */}
            <div className="wizard-nav-footer">
              {currentStep > 1 && (
                <button
                  type="button"
                  className="btn-sec-action"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                >
                  <SiteIcon name="arrow-left" size={16} />
                  <span>Previous</span>
                </button>
              )}

              <div className="footer-right-actions">
                {currentStep < 4 ? (
                  <button
                    type="button"
                    className="btn-pri-action"
                    onClick={handleNextStep}
                  >
                    <span>Continue to Step {currentStep + 1}</span>
                    <SiteIcon name="arrow-right" size={16} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="btn-submit-campaign"
                  >
                    <SiteIcon name="check-circle" size={16} />
                    <span>Submit Campaign for Review</span>
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
