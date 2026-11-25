import { useState, type FormEvent } from 'react'
import { SiteIcon } from '../../../shared/components/SiteIcon'
import { WorkspaceDetailDrawer } from '../../../shared/components/ui/WorkspaceDetailDrawer'
import { useFormState } from '../../../shared/hooks/useFormState'
import {
  generateWhatsAppTrainingPlanUrl,
  type CoachTrainingPlan,
  type RegisteredCoach,
  type TraineeCombineBenchmark,
} from '../coachSaaSClient'
import {
  evaluateJuniorSeniorBattery,
  evaluateSubJuniorBattery,
  generateWhatsAppKheloIndiaUrl,
  saveKheloIndiaAssessment,
  type KheloIndiaAssessmentReport,
} from '../kheloIndiaBattery'

interface KheloIndiaFormFields extends Record<string, unknown> {
  athleteName: string
  age: number
  gender: 'male' | 'female'
  heightCm: number
  weightKg: number
  dash50m: number
  run600m: number
  sitReach: number
  curlUps: number
  pushUps: number
  flamingoFalls: number
  plateTapping: number
  message: string
}

const INITIAL_KI_FORM: KheloIndiaFormFields = {
  athleteName: '',
  age: 14,
  gender: 'male',
  heightCm: 165,
  weightKg: 54,
  dash50m: 7.4,
  run600m: 135,
  sitReach: 24,
  curlUps: 22,
  pushUps: 20,
  flamingoFalls: 2,
  plateTapping: 12.5,
  message: '',
}

export interface CoachPerformanceAndSaiPanelProps {
  activeTab: 'combines' | 'plans' | 'khelo_india'
  selectedSlug: string
  currentCoach: RegisteredCoach
  combines: TraineeCombineBenchmark[]
  trainingPlans: CoachTrainingPlan[]
  kheloIndiaReports: KheloIndiaAssessmentReport[]
  onOpenAddCombine: () => void
  onOpenAddPlan: () => void
  onRefresh: () => void
}

/**
 * Renders Coach combines benchmarks, weekly tactical drill plans, and the
 * Khelo India / SAI national fitness assessment drawer and cohort dashboard.
 */
export function CoachPerformanceAndSaiPanel({
  activeTab,
  selectedSlug,
  currentCoach,
  combines,
  trainingPlans,
  kheloIndiaReports,
  onOpenAddCombine,
  onOpenAddPlan,
  onRefresh,
}: CoachPerformanceAndSaiPanelProps) {
  const [isKheloIndiaModalOpen, setIsKheloIndiaModalOpen] = useState(false)
  const kiForm = useFormState<KheloIndiaFormFields>(INITIAL_KI_FORM)
  const {
    athleteName: kiAthleteName,
    age: kiAge,
    gender: kiGender,
    heightCm: kiHeightCm,
    weightKg: kiWeightKg,
    dash50m: ki50mDash,
    run600m: ki600mRun,
    sitReach: kiSitReach,
    curlUps: kiCurlUps,
    pushUps: kiPushUps,
    flamingoFalls: kiFlamingoFalls,
    plateTapping: kiPlateTapping,
    message: kiMsg,
  } = kiForm.fields

  function handleSaveKheloIndia(e: FormEvent) {
    e.preventDefault()
    if (!kiAthleteName.trim()) {
      kiForm.setField('message', 'Please enter athlete name.')
      return
    }

    const reportData = kiAge <= 8
      ? evaluateSubJuniorBattery({
          heightCm: Number(kiHeightCm),
          weightKg: Number(kiWeightKg),
          flamingoFallsCount: Number(kiFlamingoFalls),
          plateTappingSeconds: Number(kiPlateTapping),
        }, kiAthleteName.trim())
      : evaluateJuniorSeniorBattery({
          heightCm: Number(kiHeightCm),
          weightKg: Number(kiWeightKg),
          gender: kiGender,
          dash50mSeconds: Number(ki50mDash),
          run600mSeconds: Number(ki600mRun),
          sitAndReachCm: Number(kiSitReach),
          partialCurlUpsReps: Number(kiCurlUps),
          pushUpsReps: Number(kiPushUps),
        }, kiAthleteName.trim(), Number(kiAge))

    const saved = saveKheloIndiaAssessment({
      ...reportData,
      coachSlug: selectedSlug,
      coachName: currentCoach.name,
      athleteId: `ath-${Date.now().toString().slice(-4)}`,
      testDate: new Date().toISOString().slice(0, 10),
    })

    kiForm.setField('message', `Assessment saved! Official SAI Report Code: ${saved.saiReportCode}`)
    onRefresh()
  }

  if (activeTab === 'combines') {
    return (
      <div className="coach-card-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem' }}>Trainee Combine Benchmarks &amp; Norms</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
              Standardized physiological battery benchmarked against the peer-reviewed KhelChronicle Normative Standards (KG-2026-002).
            </p>
          </div>
          <button
            type="button"
            className="coach-primary-btn"
            onClick={onOpenAddCombine}
          >
            <SiteIcon name="award" size={15} />
            <span>Log Combine Test</span>
          </button>
        </div>

        <div className="coach-verification-status-banner verified" style={{ marginBottom: '1.25rem' }}>
          <div className="coach-verification-status-text">
            <SiteIcon name="shield-check" size={20} className="status-banner-icon verified" />
            <div>
              <strong style={{ color: '#065f46' }}>Peer-Reviewed Indian Normative Percentiles (KG-2026-002)</strong>
              <p style={{ color: '#047857', margin: 0, fontSize: '0.84rem' }}>
                Combines test 30m sprint velocity, lower-body explosive power (vertical jump), aerobic recovery (Yo-Yo IR1), and pro agility (5-10-5 shuttle) calibrated for grassroots Indian age divisions (U-12 to Senior).
              </p>
            </div>
          </div>
        </div>

        <div className="coach-combine-grid">
          {combines.map(comb => {
            const shareMsg = `🏆 *KhelGrid Athlete Combine Card*\n*Athlete:* ${comb.traineeName} (${comb.ageGroup})\n*Sport:* ${currentCoach.sport || 'Cricket'}\n*Percentile:* ${comb.compositePercentile}th Percentile (${comb.tier})\n• 30m Sprint: ${comb.sprint30mSeconds ? `${comb.sprint30mSeconds}s` : 'N/A'}\n• Vertical Jump: ${comb.verticalJumpCm ? `${comb.verticalJumpCm}cm` : 'N/A'}\n• Yo-Yo IR1: Level ${comb.yoYoBeepLevel || 'N/A'}\n• 5-10-5 Agility: ${comb.proAgilitySeconds ? `${comb.proAgilitySeconds}s` : 'N/A'}\n— Tested by Coach ${currentCoach.name}`
            const shareUrl = `https://wa.me/?text=${encodeURIComponent(shareMsg)}`

            const tierClass = comb.tier.includes('Elite')
              ? 'elite'
              : comb.tier.includes('Advanced')
              ? 'advanced'
              : comb.tier.includes('Competitive')
              ? 'competitive'
              : 'developing'

            return (
              <div key={comb.id} className="coach-combine-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: '0 0 2px', fontSize: '1.05rem', color: '#0f172a' }}>{comb.traineeName}</h4>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      {currentCoach.sport || 'Cricket'} · {comb.ageGroup} · Tested {comb.testDate}
                    </span>
                  </div>
                  <span className={`combine-tier-pill ${tierClass}`}>{comb.tier}</span>
                </div>

                <div className="coach-combine-metrics">
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>30m SPRINT</span>
                    <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
                      {comb.sprint30mSeconds ? `${comb.sprint30mSeconds}s` : '—'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>VERTICAL JUMP</span>
                    <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
                      {comb.verticalJumpCm ? `${comb.verticalJumpCm} cm` : '—'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>YO-YO LEVEL</span>
                    <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
                      {comb.yoYoBeepLevel ? `Level ${comb.yoYoBeepLevel}` : '—'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>PRO AGILITY (5-10-5)</span>
                    <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
                      {comb.proAgilitySeconds ? `${comb.proAgilitySeconds}s` : '—'}
                    </strong>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Overall Score</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#059669' }}>
                      {comb.compositePercentile}th %ile
                    </div>
                  </div>
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="coach-action-btn whatsapp"
                    style={{ padding: '6px 10px', fontSize: '12px' }}
                    title="Share combine card on WhatsApp"
                  >
                    <SiteIcon name="share" size={13} />
                    <span>Share Card</span>
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (activeTab === 'plans') {
    return (
      <div className="coach-card-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem' }}>Weekly Drills, Curriculum &amp; Homework</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
              Structure weekly training targets, tactical drills, and home practice challenges for each batch.
            </p>
          </div>
          <button
            type="button"
            className="coach-primary-btn"
            onClick={onOpenAddPlan}
          >
            <SiteIcon name="calendar" size={15} />
            <span>Create Training Plan</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {trainingPlans.map(plan => (
            <div key={plan.id} className="coach-plan-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <span className="coach-batch-sport-tag">{currentCoach.sport || 'Sports'}</span>
                  <h4 style={{ margin: '6px 0 2px', fontSize: '1.1rem', color: '#0f172a' }}>{plan.weekTitle}</h4>
                  <span style={{ fontSize: '0.84rem', color: '#059669', fontWeight: 600 }}>Batch: {plan.batchName}</span>
                </div>
                <a
                  href={generateWhatsAppTrainingPlanUrl(plan, currentCoach.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="coach-action-btn whatsapp"
                  style={{ padding: '8px 12px', fontSize: '12.5px' }}
                  title="Broadcast weekly drills to trainees on WhatsApp"
                >
                  <SiteIcon name="share" size={14} />
                  <span>Broadcast on WhatsApp</span>
                </a>
              </div>

              <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', borderLeft: '4px solid #059669', fontSize: '0.85rem' }}>
                <strong>Key Tactical Focus:</strong> {plan.focusArea}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {plan.drills.map((drill, idx) => (
                  <div key={idx} className="plan-drill-row">
                    <span className="plan-drill-day">{drill.day}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong style={{ color: '#0f172a' }}>{drill.title}</strong>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{drill.durationMinutes} mins</span>
                      </div>
                      <p style={{ margin: '2px 0 0', color: '#475569', fontSize: '0.82rem' }}>
                        {drill.instructions}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: '#ecfdf5', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px dashed #6ee7b7', fontSize: '0.84rem' }}>
                <strong style={{ color: '#065f46' }}>🏠 Home Practice Challenge:</strong>
                <p style={{ margin: '4px 0 0', color: '#047857' }}>{plan.homeworkChallenge}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="coach-card-panel">
      <div className="coach-table-toolbar">
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>
            🇮🇳 Khelo India &amp; SAI National Fitness Assessment Battery
          </h3>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            Standardized testing protocols calibrated to Sports Authority of India (SAI) national talent scout percentiles.
          </p>
        </div>
        <button
          type="button"
          className="coach-primary-action-btn"
          onClick={() => {
            kiForm.setField('message', '')
            setIsKheloIndiaModalOpen(true)
          }}
        >
          <SiteIcon name="plus" size={16} />
          <span>Conduct SAI Assessment</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', margin: '1rem 0 1.5rem' }}>
        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Total Athletes Tested</span>
          <strong style={{ display: 'block', fontSize: '1.6rem', color: '#0f172a', marginTop: '4px' }}>{kheloIndiaReports.length}</strong>
          <small style={{ color: '#059669' }}>SAI Standardized Roster</small>
        </div>
        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>SAI Talent Targets</span>
          <strong style={{ display: 'block', fontSize: '1.6rem', color: '#16a34a', marginTop: '4px' }}>
            {kheloIndiaReports.filter(r => r.isSaiTalentTarget).length}
          </strong>
          <small style={{ color: '#15803d' }}>Recommended for State Trials</small>
        </div>
        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Grade A+ Cohort</span>
          <strong style={{ display: 'block', fontSize: '1.6rem', color: '#d97706', marginTop: '4px' }}>
            {kheloIndiaReports.filter(r => r.overallGrade === 'A+').length}
          </strong>
          <small style={{ color: '#b45309' }}>Top 5% National Tier</small>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {kheloIndiaReports.map(rep => {
          const waUrl = generateWhatsAppKheloIndiaUrl(rep)
          return (
            <div key={rep.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{rep.athleteName}</strong>
                    <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                      Grade {rep.overallGrade} ({rep.averageStars} ★)
                    </span>
                    {rep.isSaiTalentTarget && (
                      <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                        🎯 SAI Talent Target
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.82rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                    Age {rep.age} · {rep.gender.toUpperCase()} · Tested on {rep.testDate} · Ref: <code>{rep.saiReportCode}</code>
                  </span>
                </div>
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="coach-action-btn whatsapp"
                  style={{ padding: '8px 12px', fontSize: '12.5px' }}
                >
                  <SiteIcon name="share" size={14} />
                  <span>WhatsApp SAI Card</span>
                </a>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                {rep.testScores.map((score, sIdx) => (
                  <div key={sIdx} style={{ fontSize: '0.82rem' }}>
                    <span style={{ color: '#64748b', display: 'block' }}>{score.testName}</span>
                    <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>{score.metricValue}</strong>
                    <div style={{ color: '#d97706', fontSize: '0.8rem' }}>{'★'.repeat(score.stars)} ({score.band})</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <WorkspaceDetailDrawer
        open={isKheloIndiaModalOpen}
        onClose={() => setIsKheloIndiaModalOpen(false)}
        title="Conduct Official SAI / Khelo India Fitness Test"
        statusMessage={kiMsg || undefined}
        width={620}
      >
        <form onSubmit={handleSaveKheloIndia} className="coach-modal-form">
          <div className="kg-form-grid">
            <div className="coach-modal-field">
              <label htmlFor="ki-name">Athlete Name</label>
              <input
                id="ki-name"
                type="text"
                value={kiAthleteName}
                onChange={e => kiForm.setField('athleteName', e.target.value)}
                placeholder="e.g. Tanmay Saxena"
                required
              />
            </div>
            <div className="coach-modal-field">
              <label htmlFor="ki-age">Age (Years)</label>
              <input
                id="ki-age"
                type="number"
                min="5"
                max="22"
                value={kiAge}
                onChange={e => kiForm.setField('age', parseInt(e.target.value, 10) || 14)}
                required
              />
            </div>
          </div>
          <div className="kg-form-grid">
            <div className="coach-modal-field">
              <label htmlFor="ki-gender">Gender</label>
              <select
                id="ki-gender"
                value={kiGender}
                onChange={e => kiForm.setField('gender', e.target.value as 'male' | 'female')}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div className="coach-modal-field">
              <label htmlFor="ki-height">Height (cm)</label>
              <input
                id="ki-height"
                type="number"
                value={kiHeightCm}
                onChange={e => kiForm.setField('heightCm', parseFloat(e.target.value) || 0)}
                required
              />
            </div>
            <div className="coach-modal-field">
              <label htmlFor="ki-weight">Weight (kg)</label>
              <input
                id="ki-weight"
                type="number"
                value={kiWeightKg}
                onChange={e => kiForm.setField('weightKg', parseFloat(e.target.value) || 0)}
                required
              />
            </div>
          </div>

          {kiAge <= 8 ? (
            <div style={{ borderTop: '1px dashed var(--line)', paddingTop: '1rem' }}>
              <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>Sub-Junior Tests (Ages 5–8)</h4>
              <div className="kg-form-grid">
                <div className="coach-modal-field">
                  <label htmlFor="ki-flamingo">Flamingo Balance (Falls / 60s)</label>
                  <input
                    id="ki-flamingo"
                    type="number"
                    value={kiFlamingoFalls}
                    onChange={e => kiForm.setField('flamingoFalls', parseInt(e.target.value, 10) || 0)}
                  />
                </div>
                <div className="coach-modal-field">
                  <label htmlFor="ki-tapping">Plate Tapping (Seconds / 25 taps)</label>
                  <input
                    id="ki-tapping"
                    type="number"
                    step="0.1"
                    value={kiPlateTapping}
                    onChange={e => kiForm.setField('plateTapping', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ borderTop: '1px dashed var(--line)', paddingTop: '1rem' }}>
              <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>Junior &amp; Senior SAI National Battery (Ages 9–18+)</h4>
              <div className="kg-form-grid">
                <div className="coach-modal-field">
                  <label htmlFor="ki-dash">50m Dash (Seconds)</label>
                  <input
                    id="ki-dash"
                    type="number"
                    step="0.01"
                    value={ki50mDash}
                    onChange={e => kiForm.setField('dash50m', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="coach-modal-field">
                  <label htmlFor="ki-run">600m Run (Seconds)</label>
                  <input
                    id="ki-run"
                    type="number"
                    value={ki600mRun}
                    onChange={e => kiForm.setField('run600m', parseInt(e.target.value, 10) || 0)}
                  />
                </div>
                <div className="coach-modal-field">
                  <label htmlFor="ki-reach">Sit &amp; Reach (cm)</label>
                  <input
                    id="ki-reach"
                    type="number"
                    value={kiSitReach}
                    onChange={e => kiForm.setField('sitReach', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="coach-modal-field">
                  <label htmlFor="ki-curls">Partial Curl-Ups (Reps / 30s)</label>
                  <input
                    id="ki-curls"
                    type="number"
                    value={kiCurlUps}
                    onChange={e => kiForm.setField('curlUps', parseInt(e.target.value, 10) || 0)}
                  />
                </div>
                <div className="coach-modal-field">
                  <label htmlFor="ki-push">Push-Ups (Reps)</label>
                  <input
                    id="ki-push"
                    type="number"
                    value={kiPushUps}
                    onChange={e => kiForm.setField('pushUps', parseInt(e.target.value, 10) || 0)}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="coach-modal-actions" style={{ marginTop: '1.25rem' }}>
            <button
              type="button"
              className="kg-btn kg-btn-ghost kg-touch-target"
              onClick={() => setIsKheloIndiaModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="kg-btn kg-btn-primary kg-touch-target">
              Evaluate &amp; Save SAI Report Card
            </button>
          </div>
        </form>
      </WorkspaceDetailDrawer>
    </div>
  )
}
