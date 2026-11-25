import { useState, type FormEvent, type MouseEvent } from 'react'
import { SiteIcon } from '../../../shared/components/SiteIcon'
import { useFormState } from '../../../shared/hooks/useFormState'
import { generateQrSvgString } from '../../../shared/utils/qrCodeGenerator'
import {
  generateUpiPayLink,
  registerCustomAcademy,
  saveAcademyBatch,
  type RegisteredAcademy,
} from '../academySaaSClient'

export interface AcademyOnboardingModalProps {
  open: boolean
  onClose: () => void
  onAcademyCreated: (academy: RegisteredAcademy) => void
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

interface OnboardingFormFields extends Record<string, unknown> {
  academyName: string
  sport: string
  city: string
  directorName: string
  directorWhatsApp: string
  upiVpa: string
  batchName: string
  batchDays: string
  batchTimings: string
  batchCapacity: number
  batchFee: number
}

const INITIAL_ONBOARDING_FIELDS: OnboardingFormFields = {
  academyName: '',
  sport: 'Cricket',
  city: '',
  directorName: '',
  directorWhatsApp: '',
  upiVpa: '',
  batchName: 'Morning Elite Coaching Camp',
  batchDays: 'Mon, Wed, Fri',
  batchTimings: '06:30 AM – 08:30 AM',
  batchCapacity: 25,
  batchFee: 2500,
}

/**
 * 30-second express & 3-step detailed academy creation wizard modal.
 */
export function AcademyOnboardingModal({
  open,
  onClose,
  onAcademyCreated,
  onNavigate,
}: AcademyOnboardingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [mode, setMode] = useState<'express' | 'detailed'>('express')
  const [errorMsg, setErrorMsg] = useState('')
  const [createdAcademy, setCreatedAcademy] = useState<RegisteredAcademy | null>(null)
  const form = useFormState<OnboardingFormFields>(INITIAL_ONBOARDING_FIELDS)

  if (!open) return null

  const createAcademyAndStarterBatch = (params: {
    name: string
    sport: string
    city: string
    state: string
    director: string
    phone: string
    upi: string
    batchName: string
  }) => {
    const newAcad = registerCustomAcademy({
      name: params.name,
      sport: params.sport,
      city: params.city,
      state: params.state,
      directorName: params.director,
      directorWhatsApp: params.phone,
      upiVpa: params.upi,
    })

    saveAcademyBatch({
      academySlug: newAcad.slug,
      batchName: params.batchName,
      sport: params.sport,
      days: form.fields.batchDays || 'Mon, Wed, Fri',
      timings: form.fields.batchTimings || '06:30 AM – 08:30 AM',
      coachName: params.director,
      ageGroup: 'U-14 (8–14 yrs)',
      monthlyFee: Number(form.fields.batchFee) || 2500,
      maxCapacity: Number(form.fields.batchCapacity) || 25,
      isActive: true,
    })

    setCreatedAcademy(newAcad)
    setErrorMsg('')
    setStep(4)
    onAcademyCreated(newAcad)
  }

  const handleExpressSubmit = (e: FormEvent) => {
    e.preventDefault()
    const f = form.fields
    if (f.academyName.trim().length < 3) {
      setErrorMsg('Please enter academy full name (at least 3 characters).')
      return
    }
    const cleanPhone = f.directorWhatsApp.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit WhatsApp number for parent lead routing.')
      return
    }

    const cityParts = (f.city.trim() || 'Delhi NCR, India').split(',')
    const cleanCity = cityParts[0]?.trim() || 'Delhi NCR'
    const cleanState = cityParts[1]?.trim() || 'India'
    const director = f.directorName.trim() || `Coach ${f.academyName.trim().split(' ')[0] || 'Director'}`
    const cleanSlugBase = f.academyName.toLowerCase().replace(/[^a-z0-9]/g, '')
    const upi = f.upiVpa.trim() || `${cleanSlugBase || 'academy'}@okaxis`

    createAcademyAndStarterBatch({
      name: f.academyName.trim(),
      sport: f.sport,
      city: cleanCity,
      state: cleanState,
      director,
      phone: cleanPhone,
      upi,
      batchName: f.batchName.trim() || 'Foundation Coaching Squad',
    })
  }

  const handleStep1Next = (e: FormEvent) => {
    e.preventDefault()
    const f = form.fields
    if (f.academyName.trim().length < 3) {
      setErrorMsg('Please enter academy full name (at least 3 characters).')
      return
    }
    if (f.directorName.trim().length < 2) {
      setErrorMsg('Please enter director or head coach name.')
      return
    }
    if (f.directorWhatsApp.replace(/\D/g, '').length < 10) {
      setErrorMsg('Please enter a valid 10-digit WhatsApp number for parent routing.')
      return
    }
    setErrorMsg('')
    if (!f.upiVpa) {
      const clean = f.academyName.toLowerCase().replace(/[^a-z0-9]/g, '')
      form.setField('upiVpa', `${clean}@okaxis`)
    }
    setStep(2)
  }

  const handleStep2Next = (e: FormEvent) => {
    e.preventDefault()
    if (!form.fields.upiVpa.trim() || !form.fields.upiVpa.includes('@')) {
      setErrorMsg('Please enter a valid UPI ID (VPA) with an @ symbol (e.g. academy@okaxis).')
      return
    }
    setErrorMsg('')
    setStep(3)
  }

  const handleStep3Finish = (e: FormEvent) => {
    e.preventDefault()
    const f = form.fields
    if (f.batchName.trim().length < 3) {
      setErrorMsg('Please enter training batch name (e.g. Under-14 Morning Squad).')
      return
    }

    const cityParts = f.city.split(',')
    createAcademyAndStarterBatch({
      name: f.academyName.trim(),
      sport: f.sport,
      city: cityParts[0]?.trim() || 'India',
      state: cityParts[1]?.trim() || 'India',
      director: f.directorName.trim() || 'Head Coach',
      phone: f.directorWhatsApp.replace(/\D/g, ''),
      upi: f.upiVpa.trim(),
      batchName: f.batchName.trim(),
    })
  }

  const handleCloseReset = () => {
    setStep(1)
    setErrorMsg('')
    onClose()
  }

  return (
    <div className="academy-hub-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="onboarding-wizard-title">
      <div className="academy-hub-modal-content" style={{ maxWidth: '580px' }} onClick={e => e.stopPropagation()}>
        <div className="academy-hub-modal-header">
          <h3 id="onboarding-wizard-title">
            {step === 4
              ? 'Academy Hub Ready!'
              : mode === 'express'
                ? '⚡ 30-Second Express Academy Launch'
                : '⚡ Custom Academy Setup (3 Steps)'}
          </h3>
          <button
            type="button"
            className="academy-hub-modal-close"
            onClick={handleCloseReset}
            aria-label="Close onboarding modal"
          >
            &times;
          </button>
        </div>

        {step < 4 && (
          <div className="onboarding-mode-switch" role="tablist">
            <button
              type="button"
              className={`onboarding-mode-btn ${mode === 'express' ? 'active' : ''}`}
              onClick={() => setMode('express')}
            >
              ⚡ Express Launch (30 Seconds)
            </button>
            <button
              type="button"
              className={`onboarding-mode-btn ${mode === 'detailed' ? 'active' : ''}`}
              onClick={() => setMode('detailed')}
            >
              🛠️ Detailed 3-Step Setup
            </button>
          </div>
        )}

        {step < 4 && mode === 'detailed' && (
          <div className="onboarding-steps-bar" aria-label="Setup steps">
            <div className={`onboarding-step-pill ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
              <span className="onboarding-step-num">1</span>
              <span>Academy Profile</span>
            </div>
            <div className={`onboarding-step-pill ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
              <span className="onboarding-step-num">2</span>
              <span>UPI Settlement</span>
            </div>
            <div className={`onboarding-step-pill ${step === 3 ? 'active' : ''}`}>
              <span className="onboarding-step-num">3</span>
              <span>First Batch</span>
            </div>
          </div>
        )}

        {errorMsg && (
          <div style={{ padding: '0.6rem 0.85rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '0.85rem' }}>
            {errorMsg}
          </div>
        )}

        {step < 4 && mode === 'express' && (
          <form onSubmit={handleExpressSubmit} className="academy-hub-form">
            <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 0.5rem' }}>
              Register your sports academy in under 30 seconds. We automatically configure a starter squad batch and direct WhatsApp routing for parent trial inquiries.
            </p>

            <label>
              Academy Full Name *
              <input
                type="text"
                value={form.fields.academyName}
                onChange={e => form.setField('academyName', e.target.value)}
                placeholder="e.g. Shivaji Sports &amp; Cricket Academy"
                required
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              <label>
                Primary Sport *
                <select value={form.fields.sport} onChange={e => form.setField('sport', e.target.value)}>
                  {['Cricket', 'Football', 'Badminton', 'Tennis', 'Swimming', 'Martial Arts', 'Basketball', 'Athletics', 'Multi-Sport'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>

              <label>
                Director / Coach WhatsApp *
                <input
                  type="tel"
                  value={form.fields.directorWhatsApp}
                  onChange={e => form.setField('directorWhatsApp', e.target.value)}
                  placeholder="10-digit mobile number"
                  required
                />
              </label>
            </div>

            <label>
              Academy City &amp; State *
              <div className="onboarding-city-chips" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '0.35rem 0' }}>
                {['Delhi NCR', 'Mumbai', 'Bengaluru', 'Pune', 'Hyderabad', 'Jaipur', 'Chandigarh'].map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`onboarding-city-chip ${form.fields.city.startsWith(c) ? 'active' : ''}`}
                    onClick={() => form.setField('city', c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={form.fields.city}
                onChange={e => form.setField('city', e.target.value)}
                placeholder="or type custom city, e.g. Pune, Maharashtra"
              />
            </label>

            <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#475569' }}>
              ✓ <strong>Starter Batch Included:</strong> Foundation Training Squad will be published automatically.<br />
              ✓ <strong>0% Platform Commission:</strong> Direct UPI bank settlement. You can customize slot timings anytime in Hub settings.
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
              <button
                type="button"
                className="academy-hub-btn-outline"
                onClick={() => setMode('detailed')}
                style={{ fontSize: '0.82rem' }}
              >
                Custom Batches &amp; UPI →
              </button>
              <button type="submit" className="academy-hub-primary-btn">
                ⚡ Instant Register &amp; Launch Hub (30s) →
              </button>
            </div>
          </form>
        )}

        {step === 1 && mode === 'detailed' && (
          <form onSubmit={handleStep1Next} className="academy-hub-form">
            <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 0.5rem' }}>
              Register your sports academy on KhelGrid to manage parent enquiries, student batches, and fees with 100% free grassroots access.
            </p>

            <label>
              Academy Full Name *
              <input
                type="text"
                value={form.fields.academyName}
                onChange={e => form.setField('academyName', e.target.value)}
                placeholder="e.g. Shivaji Sports & Cricket Academy"
                required
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              <label>
                Primary Sport *
                <select value={form.fields.sport} onChange={e => form.setField('sport', e.target.value)}>
                  {['Cricket', 'Football', 'Badminton', 'Tennis', 'Swimming', 'Martial Arts', 'Basketball', 'Athletics', 'Multi-Sport'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>

              <label>
                City &amp; State *
                <input
                  type="text"
                  value={form.fields.city}
                  onChange={e => form.setField('city', e.target.value)}
                  placeholder="e.g. Pune, Maharashtra"
                  required
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              <label>
                Director / Head Coach Name *
                <input
                  type="text"
                  value={form.fields.directorName}
                  onChange={e => form.setField('directorName', e.target.value)}
                  placeholder="e.g. Coach Anand Patil"
                  required
                />
              </label>

              <label>
                Director WhatsApp Mobile *
                <input
                  type="tel"
                  value={form.fields.directorWhatsApp}
                  onChange={e => form.setField('directorWhatsApp', e.target.value)}
                  placeholder="10-digit mobile number"
                  required
                />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
              <button
                type="button"
                className="academy-hub-btn-outline"
                onClick={() => setMode('express')}
              >
                ← Express 30s Setup
              </button>
              <button type="submit" className="academy-hub-primary-btn">
                Continue to Step 2: UPI Setup →
              </button>
            </div>
          </form>
        )}

        {step === 2 && mode === 'detailed' && (
          <form onSubmit={handleStep2Next} className="academy-hub-form">
            <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 0.5rem' }}>
              Set your official UPI ID (VPA). Parents pay student fees directly into your academy&apos;s bank account with <strong>0% platform deduction</strong>.
            </p>

            <label>
              Academy / Director UPI ID (VPA) *
              <input
                type="text"
                value={form.fields.upiVpa}
                onChange={e => form.setField('upiVpa', e.target.value)}
                placeholder="e.g. shivajiacademy@okaxis or 9823012345@paytm"
                required
              />
              <small style={{ color: '#059669', fontSize: '0.78rem', marginTop: '0.2rem' }}>
                ✓ 100% direct bank settlement into your account.
              </small>
            </label>

            <div className="onboarding-qr-preview-box">
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#059669', marginBottom: '0.5rem' }}>
                Live Parent Payment QR Preview (GPay, PhonePe, Paytm)
              </div>
              <div
                style={{ display: 'inline-block', padding: '0.5rem', background: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                dangerouslySetInnerHTML={{
                  __html: generateQrSvgString(
                    generateUpiPayLink({
                      vpa: form.fields.upiVpa || 'academy@upi',
                      name: form.fields.academyName || 'Academy',
                      amount: 2500,
                      note: 'Coaching Fee',
                    }),
                    { size: 140, color: '#047857' }
                  ),
                }}
              />
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.4rem' }}>
                Settle directly to: <strong>{form.fields.upiVpa || 'your-vpa@bank'}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
              <button type="button" className="academy-hub-btn-outline" onClick={() => setStep(1)}>
                ← Back
              </button>
              <button type="submit" className="academy-hub-primary-btn">
                Continue to Step 3: First Batch →
              </button>
            </div>
          </form>
        )}

        {step === 3 && mode === 'detailed' && (
          <form onSubmit={handleStep3Finish} className="academy-hub-form">
            <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 0.5rem' }}>
              Publish your initial training batch. It will appear on your academy profile for prospective parents and students.
            </p>

            <label>
              Batch Name *
              <input
                type="text"
                value={form.fields.batchName}
                onChange={e => form.setField('batchName', e.target.value)}
                placeholder="e.g. Morning Junior Cricket Squad"
                required
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              <label>
                Schedule Days *
                <input
                  type="text"
                  value={form.fields.batchDays}
                  onChange={e => form.setField('batchDays', e.target.value)}
                  placeholder="e.g. Mon, Wed, Fri"
                  required
                />
              </label>

              <label>
                Timings *
                <input
                  type="text"
                  value={form.fields.batchTimings}
                  onChange={e => form.setField('batchTimings', e.target.value)}
                  placeholder="e.g. 06:30 AM – 08:30 AM"
                  required
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              <label>
                Max Slot Capacity *
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={form.fields.batchCapacity}
                  onChange={e => form.setField('batchCapacity', Number(e.target.value))}
                  required
                />
              </label>

              <label>
                Monthly Coaching Fee (₹) *
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={form.fields.batchFee}
                  onChange={e => form.setField('batchFee', Number(e.target.value))}
                  required
                />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
              <button type="button" className="academy-hub-btn-outline" onClick={() => setStep(2)}>
                ← Back
              </button>
              <button type="submit" className="academy-hub-primary-btn">
                Complete Setup &amp; Launch Academy Hub →
              </button>
            </div>
          </form>
        )}

        {step === 4 && createdAcademy && (
          <div className="onboarding-celebration-card">
            <div className="onboarding-celebration-icon">
              <SiteIcon name="award" size={32} />
            </div>
            <h3 style={{ margin: '0 0 0.5rem', color: '#065f46', fontSize: '1.4rem' }}>
              Congratulations, {createdAcademy.name}!
            </h3>
            <p style={{ color: '#047857', fontSize: '0.95rem', margin: '0 0 1.25rem' }}>
              Your Academy Operations Hub is now active with 100% Free Grassroots Launch Access.
            </p>

            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', textAlign: 'left', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
              <div><strong>Official Sport:</strong> {createdAcademy.sport}</div>
              <div><strong>Location:</strong> {createdAcademy.city}</div>
              <div><strong>Head Coach:</strong> {createdAcademy.directorName}</div>
              <div><strong>Direct UPI Settlement:</strong> {createdAcademy.upiVpa} (0% platform cut)</div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="academy-hub-primary-btn"
                onClick={handleCloseReset}
              >
                Open Academy Dashboard →
              </button>
              <a
                href={`/academies/${createdAcademy.slug}`}
                className="academy-hub-public-page-btn"
                onClick={e => onNavigate?.(e, `/academies/${createdAcademy.slug}`)}
              >
                <SiteIcon name="external-link" size={15} />
                <span>View Public Profile</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
