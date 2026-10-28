import { useState, type FormEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import './sports-cv.css'

type Achievement = { year: string; event: string; result: string }
type Cv = {
  fullName: string
  sport: string
  city: string
  dateOfBirth: string
  email: string
  phone: string
  playingPosition: string
  teamOrAcademy: string
  coach: string
  experience: string
  goals: string
  achievements: Achievement[]
}

const initialCv: Cv = {
  fullName: '', sport: '', city: '', dateOfBirth: '', email: '', phone: '',
  playingPosition: '', teamOrAcademy: '', coach: '', experience: '', goals: '',
  achievements: [{ year: '', event: '', result: '' }],
}

export default function SportsCvWizard() {
  const [cv, setCv] = useState<Cv>(initialCv)
  const [savedForPrint, setSavedForPrint] = useState(false)
  const update = (field: keyof Omit<Cv, 'achievements'>, value: string) => {
    setCv(current => ({ ...current, [field]: value }))
    setSavedForPrint(false)
  }
  const updateAchievement = (index: number, field: keyof Achievement, value: string) => {
    setCv(current => ({ ...current, achievements: current.achievements.map((item, i) => i === index ? { ...item, [field]: value } : item) }))
    setSavedForPrint(false)
  }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSavedForPrint(true)
    window.setTimeout(() => window.print(), 50)
  }
  return <section className="content-page sports-cv-page">
    <p className="eyebrow">ATHLETE TOOLS · FREE</p>
    <h1>Build your sports CV.</h1>
    <p className="page-intro">Create a clean athlete profile and use your browser’s Print dialog to save it as a PDF. Your entries stay in this page and are not uploaded or saved to a KhelGrid account.</p>
    <div className="cv-privacy-note" role="note"><SiteIcon name="shield-check" size={18} /><span><strong>Privacy first.</strong> Do not enter government ID numbers, passwords, medical details or other sensitive documents. This draft is not submitted to scouts or organisations.</span></div>
    <form className="sports-cv-form" onSubmit={submit}>
      <fieldset>
        <legend>1. Athlete details</legend>
        <div className="cv-field-grid">
          <label>Full name *<input required maxLength={100} value={cv.fullName} onChange={e => update('fullName', e.target.value)} autoComplete="name" /></label>
          <label>Sport *<input required maxLength={80} value={cv.sport} onChange={e => update('sport', e.target.value)} placeholder="e.g. Athletics" /></label>
          <label>City / state<input maxLength={100} value={cv.city} onChange={e => update('city', e.target.value)} autoComplete="address-level2" /></label>
          <label>Date of birth (optional)<input type="date" value={cv.dateOfBirth} onChange={e => update('dateOfBirth', e.target.value)} /></label>
          <label>Email (optional)<input type="email" maxLength={254} value={cv.email} onChange={e => update('email', e.target.value)} autoComplete="email" /></label>
          <label>Phone (optional)<input type="tel" maxLength={30} value={cv.phone} onChange={e => update('phone', e.target.value)} autoComplete="tel" /></label>
        </div>
      </fieldset>
      <fieldset>
        <legend>2. Sporting background</legend>
        <div className="cv-field-grid">
          <label>Position / event<input maxLength={100} value={cv.playingPosition} onChange={e => update('playingPosition', e.target.value)} placeholder="e.g. 100 m sprint" /></label>
          <label>Team / academy<input maxLength={150} value={cv.teamOrAcademy} onChange={e => update('teamOrAcademy', e.target.value)} /></label>
          <label>Coach (optional)<input maxLength={120} value={cv.coach} onChange={e => update('coach', e.target.value)} /></label>
          <label>Years of experience<input maxLength={80} value={cv.experience} onChange={e => update('experience', e.target.value)} placeholder="e.g. 3 years" /></label>
        </div>
        <label>Sporting summary<textarea rows={4} maxLength={1500} value={cv.goals} onChange={e => update('goals', e.target.value)} placeholder="Describe your training, strengths, goals and sporting interests." /></label>
      </fieldset>
      <fieldset>
        <legend>3. Achievements</legend>
        <p className="cv-help">Add results you can accurately describe. KhelGrid does not verify these entries.</p>
        {cv.achievements.map((item, index) => <div className="cv-achievement-row" key={index}>
          <label>Year<input maxLength={12} value={item.year} onChange={e => updateAchievement(index, 'year', e.target.value)} placeholder="2025" /></label>
          <label>Competition / event<input maxLength={150} value={item.event} onChange={e => updateAchievement(index, 'event', e.target.value)} /></label>
          <label>Result / achievement<input maxLength={200} value={item.result} onChange={e => updateAchievement(index, 'result', e.target.value)} /></label>
          {cv.achievements.length > 1 && <button type="button" className="cv-remove-button" onClick={() => setCv(current => ({ ...current, achievements: current.achievements.filter((_, i) => i !== index) }))}>Remove</button>}
        </div>)}
        <button type="button" className="secondary-link cv-add-button" onClick={() => setCv(current => ({ ...current, achievements: [...current.achievements, { year: '', event: '', result: '' }].slice(0, 12) }))} disabled={cv.achievements.length >= 12}>+ Add achievement</button>
      </fieldset>
      <div className="cv-actions no-print"><button type="submit" className="primary-link"><SiteIcon name="download" size={17} /> Preview &amp; save as PDF</button><button type="button" className="secondary-link" onClick={() => { setCv(initialCv); setSavedForPrint(false) }}>Clear form</button></div>
      {savedForPrint && <p className="cv-help no-print" role="status">Print dialog opened. Choose “Save as PDF”. The CV has not been uploaded or saved to KhelGrid.</p>}
    </form>
    <section className="cv-print-preview" aria-label="Athlete CV preview">
      <p className="eyebrow">KHELGRID · ATHLETE PROFILE</p>
      <h2>{cv.fullName.trim() || 'Your name'}</h2>
      <p className="cv-preview-sport">{cv.sport.trim() || 'Sport'}{cv.playingPosition ? ` · ${cv.playingPosition}` : ''}</p>
      <p>{[cv.city, cv.email, cv.phone].filter(Boolean).join(' · ') || 'Add your city or contact details above'}</p>
      {cv.dateOfBirth && <p>Date of birth: {cv.dateOfBirth}</p>}
      <h3>Sporting background</h3>
      <p>{[cv.teamOrAcademy && `Team / academy: ${cv.teamOrAcademy}`, cv.coach && `Coach: ${cv.coach}`, cv.experience && `Experience: ${cv.experience}`].filter(Boolean).join(' · ') || 'Your team, coach and experience will appear here.'}</p>
      {cv.goals && <><h3>Profile summary</h3><p className="cv-preview-long-text">{cv.goals}</p></>}
      <h3>Achievements</h3>
      {cv.achievements.some(item => item.year || item.event || item.result) ? <ul>{cv.achievements.filter(item => item.year || item.event || item.result).map((item, i) => <li key={i}>{[item.year, item.event, item.result].filter(Boolean).join(' — ')}</li>)}</ul> : <p>Add achievements above to include them in the CV.</p>}
      <p className="cv-disclaimer">Self-reported information. KhelGrid has not independently verified the details in this document.</p>
    </section>
  </section>
}
