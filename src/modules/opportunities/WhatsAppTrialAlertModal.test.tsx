import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { WhatsAppTrialAlertModal } from './WhatsAppTrialAlertModal'
import { WhatsAppTrialAlertWidget } from './WhatsAppTrialAlertWidget'

describe('WhatsAppTrialAlertModal & Widget', () => {
  it('returns null when modal isOpen is false', () => {
    const html = renderToStaticMarkup(
      <WhatsAppTrialAlertModal isOpen={false} onClose={vi.fn()} />
    )
    expect(html).toBe('')
  })

  it('renders trial alert form with sport options, 48h & 12h countdown reminders when isOpen is true', () => {
    const html = renderToStaticMarkup(
      <WhatsAppTrialAlertModal
        isOpen={true}
        onClose={vi.fn()}
        defaultSport="Cricket"
        defaultCity="Kanpur"
        defaultState="Uttar Pradesh"
      />
    )

    expect(html).toContain('1-TAP SELECTION TRIAL ALERTS')
    expect(html).toContain('Get Instant WhatsApp &amp; Push Trial Alerts')
    expect(html).toContain('Cricket')
    expect(html).toContain('Kanpur')
    expect(html).toContain('Uttar Pradesh')
    expect(html).toContain('48 Hours Before Application Deadline')
    expect(html).toContain('12 Hours Final Call Reminder')
    expect(html).toContain('1-Tap Subscribe via WhatsApp')
  })

  it('renders WhatsAppTrialAlertWidget banner with 1-tap subscribe button', () => {
    const html = renderToStaticMarkup(
      <WhatsAppTrialAlertWidget city="Kozhikode" state="Kerala" sport="Football" />
    )

    expect(html).toContain('1-TAP WHATSAPP TRIAL ALERTS')
    expect(html).toContain('Get Football Selection Trial Alerts for Kozhikode, Kerala')
    expect(html).toContain('48h and 12h registration deadline countdown reminders')
    expect(html).toContain('Subscribe in 1 Tap')
  })
})
