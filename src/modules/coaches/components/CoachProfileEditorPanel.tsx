import { useState, type FormEvent } from 'react'
import { SiteIcon } from '../../../shared/components/SiteIcon'
import {
  updateCoachProfile,
  type CoachAchievementItem,
  type CoachCertificationItem,
  type CoachPastAffiliationItem,
  type CoachProfileRecord,
  type CoachProfileUpdateInput,
  type CoachQualificationItem,
} from '../coachWorkspaceClient'

export interface CoachProfileEditorPanelProps {
  profile: CoachProfileRecord
  onProfileSaved: (updated: CoachProfileRecord) => void
}

function splitTags(value: string): string[] {
  return value
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
}

function joinTags(values: string[]): string {
  return values.join(', ')
}

interface StructuredListFieldConfig<T> {
  title: string
  emptyLabel: string
  addLabel: string
  items: T[]
  onChange: (next: T[]) => void
  createBlank: () => T
  fields: {
    key: keyof T
    label: string
    placeholder: string
  }[]
}

function StructuredEntryList<T extends object>({
  title,
  emptyLabel,
  addLabel,
  items,
  onChange,
  createBlank,
  fields,
}: StructuredListFieldConfig<T>) {
  return (
    <div className="kg-coach-structured-block">
      <div className="kg-coach-structured-head">
        <h4>{title}</h4>
        <button
          type="button"
          className="kg-coach-btn-outline"
          onClick={() => onChange([...items, createBlank()])}
        >
          <SiteIcon name="plus" size={14} />
          <span>{addLabel}</span>
        </button>
      </div>
      {items.length === 0 ? (
        <p className="kg-coach-muted-note">{emptyLabel}</p>
      ) : (
        <div className="kg-coach-structured-list">
          {items.map((item, idx) => (
            <div key={idx} className="kg-coach-structured-row">
              <div className="kg-coach-form-grid">
                {fields.map(f => (
                  <label key={String(f.key)} className="kg-coach-field">
                    <span>{f.label}</span>
                    <input
                      type="text"
                      placeholder={f.placeholder}
                      value={String(item[f.key] ?? '')}
                      onChange={e => {
                        const next = items.map((entry, i) =>
                          i === idx ? { ...entry, [f.key]: e.target.value } : entry,
                        )
                        onChange(next)
                      }}
                    />
                  </label>
                ))}
              </div>
              <button
                type="button"
                className="kg-coach-icon-remove"
                aria-label={`Remove ${title} row ${idx + 1}`}
                onClick={() => onChange(items.filter((_, i) => i !== idx))}
              >
                <SiteIcon name="trash" size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function buildInitialDraft(profile: CoachProfileRecord): CoachProfileUpdateInput {
  return {
    fullName: profile.fullName,
    avatarUrl: profile.avatarUrl,
    bio: profile.bio,
    sportsSpecialization: profile.sportsSpecialization,
    coachingCategories: profile.coachingCategories,
    experienceYears: profile.experienceYears,
    qualifications: profile.qualifications,
    certifications: profile.certifications,
    previousAcademies: profile.previousAcademies,
    achievements: profile.achievements,
    languages: profile.languages,
    city: profile.city,
    state: profile.state,
    serviceArea: profile.serviceArea,
    coachingMethodology: profile.coachingMethodology,
    onlineCoachingAvailable: profile.onlineCoachingAvailable,
    portfolioUrl: profile.portfolioUrl,
    introVideoUrl: profile.introVideoUrl,
    contactPreferences: profile.contactPreferences,
  }
}

/**
 * Professional Coach Profile editor (Section 5).
 * Verification fields remain strictly read-only here; updates persist directly to public.coach_profiles.
 */
export function CoachProfileEditorPanel({
  profile,
  onProfileSaved,
}: CoachProfileEditorPanelProps) {
  const [draft, setDraft] = useState<CoachProfileUpdateInput>(() => buildInitialDraft(profile))
  const [sportsInput, setSportsInput] = useState(() => joinTags(profile.sportsSpecialization))
  const [categoriesInput, setCategoriesInput] = useState(() => joinTags(profile.coachingCategories))
  const [languagesInput, setLanguagesInput] = useState(() => joinTags(profile.languages))
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFeedback(null)
    setSaving(true)

    const payload: CoachProfileUpdateInput = {
      ...draft,
      sportsSpecialization: splitTags(sportsInput),
      coachingCategories: splitTags(categoriesInput),
      languages: splitTags(languagesInput),
    }

    const res = await updateCoachProfile(profile.id, payload)
    setSaving(false)

    if (!res.ok) {
      setFeedback({ kind: 'error', text: res.error })
      return
    }

    setFeedback({ kind: 'success', text: 'Coach profile saved to PostgreSQL.' })
    onProfileSaved(res.data)
  }

  return (
    <form className="kg-coach-card kg-coach-stack" onSubmit={handleSubmit} aria-label="Professional Coach Profile">
      <div className="kg-coach-card-head">
        <div>
          <h2>Professional Coach Profile</h2>
          <p>
            Manage your coaching credentials, specializations, methodology, service area, and contact preferences.
            Verification status is controlled separately by KhelGrid moderators.
          </p>
        </div>
        <button type="submit" className="kg-coach-btn-primary" disabled={saving}>
          <SiteIcon name="check" size={15} />
          <span>{saving ? 'Saving Profile…' : 'Save Profile'}</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`kg-coach-alert ${feedback.kind === 'error' ? 'is-error' : 'is-success'}`}
          role={feedback.kind === 'error' ? 'alert' : 'status'}
        >
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Identity & Core Fields */}
      <div className="kg-coach-form-grid">
        <label className="kg-coach-field">
          <span>Full Name *</span>
          <input
            type="text"
            required
            minLength={2}
            maxLength={140}
            value={draft.fullName}
            onChange={e => setDraft(prev => ({ ...prev, fullName: e.target.value }))}
          />
        </label>

        <label className="kg-coach-field">
          <span>Profile Photograph URL</span>
          <input
            type="url"
            placeholder="https://..."
            value={draft.avatarUrl || ''}
            onChange={e => setDraft(prev => ({ ...prev, avatarUrl: e.target.value || null }))}
          />
        </label>

        <label className="kg-coach-field">
          <span>Sports Specialization (comma-separated)</span>
          <input
            type="text"
            placeholder="e.g. Cricket, Pace Bowling, Athletics"
            value={sportsInput}
            onChange={e => setSportsInput(e.target.value)}
          />
        </label>

        <label className="kg-coach-field">
          <span>Coaching Categories (comma-separated)</span>
          <input
            type="text"
            placeholder="e.g. Grassroots, U-14, High Performance, Strength & Conditioning"
            value={categoriesInput}
            onChange={e => setCategoriesInput(e.target.value)}
          />
        </label>

        <label className="kg-coach-field">
          <span>Professional Experience (Years)</span>
          <input
            type="number"
            min={0}
            max={80}
            value={draft.experienceYears}
            onChange={e => setDraft(prev => ({ ...prev, experienceYears: Number(e.target.value) }))}
          />
        </label>

        <label className="kg-coach-field">
          <span>Languages Spoken (comma-separated)</span>
          <input
            type="text"
            placeholder="e.g. English, Hindi, Marathi"
            value={languagesInput}
            onChange={e => setLanguagesInput(e.target.value)}
          />
        </label>

        <label className="kg-coach-field">
          <span>City</span>
          <input
            type="text"
            placeholder="e.g. Bengaluru"
            value={draft.city}
            onChange={e => setDraft(prev => ({ ...prev, city: e.target.value }))}
          />
        </label>

        <label className="kg-coach-field">
          <span>State / Region</span>
          <input
            type="text"
            placeholder="e.g. Karnataka"
            value={draft.state}
            onChange={e => setDraft(prev => ({ ...prev, state: e.target.value }))}
          />
        </label>

        <label className="kg-coach-field">
          <span>Service Area (Districts / Venues Covered)</span>
          <input
            type="text"
            placeholder="e.g. South Bengaluru, Indiranagar & Koramangala"
            value={draft.serviceArea}
            onChange={e => setDraft(prev => ({ ...prev, serviceArea: e.target.value }))}
          />
        </label>

        <label className="kg-coach-field">
          <span>Portfolio / Website URL</span>
          <input
            type="url"
            placeholder="https://..."
            value={draft.portfolioUrl || ''}
            onChange={e => setDraft(prev => ({ ...prev, portfolioUrl: e.target.value || null }))}
          />
        </label>

        <label className="kg-coach-field">
          <span>Introduction Video URL</span>
          <input
            type="url"
            placeholder="https://..."
            value={draft.introVideoUrl || ''}
            onChange={e => setDraft(prev => ({ ...prev, introVideoUrl: e.target.value || null }))}
          />
        </label>

        <label className="kg-coach-field">
          <span>Preferred Contact Hours</span>
          <input
            type="text"
            placeholder="e.g. 09:00 AM - 06:00 PM IST"
            value={draft.contactPreferences.preferredHours}
            onChange={e =>
              setDraft(prev => ({
                ...prev,
                contactPreferences: { ...prev.contactPreferences, preferredHours: e.target.value },
              }))
            }
          />
        </label>
      </div>

      <label className="kg-coach-field">
        <span>Biography</span>
        <textarea
          rows={3}
          maxLength={5000}
          placeholder="Summarize playing/coaching background and athletes mentored."
          value={draft.bio}
          onChange={e => setDraft(prev => ({ ...prev, bio: e.target.value }))}
        />
      </label>

      <label className="kg-coach-field">
        <span>Coaching Methodology</span>
        <textarea
          rows={3}
          maxLength={4000}
          placeholder="Describe session structure, biomechanical feedback approach, and athlete progression philosophy."
          value={draft.coachingMethodology}
          onChange={e => setDraft(prev => ({ ...prev, coachingMethodology: e.target.value }))}
        />
      </label>

      {/* Availability & Contact Preferences */}
      <div className="kg-coach-toggle-row">
        <label className="kg-coach-checkbox">
          <input
            type="checkbox"
            checked={draft.onlineCoachingAvailable}
            onChange={e => setDraft(prev => ({ ...prev, onlineCoachingAvailable: e.target.checked }))}
          />
          <span>Available for online video review / remote coaching</span>
        </label>
        <label className="kg-coach-checkbox">
          <input
            type="checkbox"
            checked={draft.contactPreferences.allowDirectInquiries}
            onChange={e =>
              setDraft(prev => ({
                ...prev,
                contactPreferences: { ...prev.contactPreferences, allowDirectInquiries: e.target.checked },
              }))
            }
          />
          <span>Allow direct athlete / parent inquiries</span>
        </label>
        <label className="kg-coach-checkbox">
          <input
            type="checkbox"
            checked={draft.contactPreferences.allowWhatsApp}
            onChange={e =>
              setDraft(prev => ({
                ...prev,
                contactPreferences: { ...prev.contactPreferences, allowWhatsApp: e.target.checked },
              }))
            }
          />
          <span>Allow WhatsApp coordination</span>
        </label>
        <label className="kg-coach-checkbox">
          <input
            type="checkbox"
            checked={draft.contactPreferences.allowEmail}
            onChange={e =>
              setDraft(prev => ({
                ...prev,
                contactPreferences: { ...prev.contactPreferences, allowEmail: e.target.checked },
              }))
            }
          />
          <span>Allow email notifications from enquiries</span>
        </label>
      </div>

      {/* Structured Lists */}
      <StructuredEntryList<CoachQualificationItem>
        title="Coaching Qualifications & Education"
        emptyLabel="No academic or sports institute qualifications recorded yet."
        addLabel="Add Qualification"
        items={draft.qualifications}
        onChange={next => setDraft(prev => ({ ...prev, qualifications: next }))}
        createBlank={() => ({ title: '', institution: '', year: '' })}
        fields={[
          { key: 'title', label: 'Qualification', placeholder: 'e.g. NIS Diploma in Sports Coaching' },
          { key: 'institution', label: 'Institution', placeholder: 'e.g. NSNIS Patiala' },
          { key: 'year', label: 'Year', placeholder: 'e.g. 2019' },
        ]}
      />

      <StructuredEntryList<CoachCertificationItem>
        title="Federation Certifications & Licences"
        emptyLabel="No federation licences or coaching badges added yet."
        addLabel="Add Certification"
        items={draft.certifications}
        onChange={next => setDraft(prev => ({ ...prev, certifications: next }))}
        createBlank={() => ({ name: '', authority: '', licenseId: '', issuedYear: '' })}
        fields={[
          { key: 'name', label: 'Certificate / Badge', placeholder: 'e.g. AIFF B-Diploma' },
          { key: 'authority', label: 'Issuing Authority', placeholder: 'e.g. All India Football Federation' },
          { key: 'licenseId', label: 'License ID', placeholder: 'e.g. IND-AFC-2214' },
          { key: 'issuedYear', label: 'Issued Year', placeholder: 'e.g. 2022' },
        ]}
      />

      <StructuredEntryList<CoachPastAffiliationItem>
        title="Previous Academies & Teams"
        emptyLabel="No prior academies or clubs listed yet."
        addLabel="Add Past Association"
        items={draft.previousAcademies}
        onChange={next => setDraft(prev => ({ ...prev, previousAcademies: next }))}
        createBlank={() => ({ organization: '', role: '', period: '' })}
        fields={[
          { key: 'organization', label: 'Academy / Team', placeholder: 'e.g. Karnataka State Cricket Academy' },
          { key: 'role', label: 'Role', placeholder: 'e.g. Bowling Coach (U-19)' },
          { key: 'period', label: 'Period', placeholder: 'e.g. 2020 - 2024' },
        ]}
      />

      <StructuredEntryList<CoachAchievementItem>
        title="Coaching Achievements & Honors"
        emptyLabel="No achievements or competition milestones listed yet."
        addLabel="Add Achievement"
        items={draft.achievements}
        onChange={next => setDraft(prev => ({ ...prev, achievements: next }))}
        createBlank={() => ({ year: '', title: '', detail: '' })}
        fields={[
          { key: 'year', label: 'Year', placeholder: 'e.g. 2025' },
          { key: 'title', label: 'Achievement', placeholder: 'e.g. State U-17 Champions Head Coach' },
          { key: 'detail', label: 'Details', placeholder: 'Outcome or mentored athletes' },
        ]}
      />
    </form>
  )
}
