import { describe, expect, it } from 'vitest'
import {
  generateAlertToken,
  saveTrialAlertSubscription,
  getTrialAlertSubscriptions,
  buildWhatsAppSubscriptionUrl,
} from './pushNotificationService'

describe('pushNotificationService (1-Tap WhatsApp Alerts & Push Notifications)', () => {
  it('generates consistent token format KG-ALERT-{SPORT}-{STATE}-{RAND}', () => {
    const token = generateAlertToken('Cricket', 'Uttar Pradesh')
    expect(token).toMatch(/^KG-ALERT-CRI-UTT-\d{4}$/)

    const token2 = generateAlertToken('Football', 'Kerala')
    expect(token2).toMatch(/^KG-ALERT-FOO-KER-\d{4}$/)
  })

  it('saves trial alert subscription to local storage and retrieves active subscriptions', () => {
    const store = new Map<string, string>()
    const originalWindow = globalThis.window

    globalThis.window = {
      localStorage: {
        getItem: (k: string) => store.get(k) || null,
        setItem: (k: string, v: string) => store.set(k, v),
        removeItem: (k: string) => store.delete(k),
        clear: () => store.clear(),
        key: () => null,
        length: 0,
      },
    } as unknown as Window & typeof globalThis

    try {
      const sub = saveTrialAlertSubscription({
        phoneNumber: '9876543210',
        sport: 'Cricket',
        state: 'Uttar Pradesh',
        city: 'Kanpur',
        ageCategory: 'U-16',
        channel: 'whatsapp',
        remind48HoursBefore: true,
        remind12HoursBefore: true,
      })

      expect(sub.id).toBeDefined()
      expect(sub.active).toBe(true)
      expect(sub.token).toContain('KG-ALERT-CRI-UTT-')

      const subs = getTrialAlertSubscriptions()
      expect(subs.length).toBe(1)
      expect(subs[0].phoneNumber).toBe('9876543210')
      expect(subs[0].city).toBe('Kanpur')
    } finally {
      globalThis.window = originalWindow
    }
  })

  it('constructs WhatsApp subscription link with pre-formatted countdown alert text', () => {
    const url = buildWhatsAppSubscriptionUrl({
      sport: 'Badminton',
      state: 'Telangana',
      city: 'Hyderabad',
      ageCategory: 'U-19',
    })

    expect(url).toContain('https://wa.me/?text=')
    const decoded = decodeURIComponent(url)
    expect(decoded).toContain('KhelGrid 1-Tap Selection Trial Alert Subscription')
    expect(decoded).toContain('*Sport:* Badminton')
    expect(decoded).toContain('*Region:* Hyderabad, Telangana')
    expect(decoded).toContain('*Age Category:* U-19')
    expect(decoded).toContain('48 Hours & 12 Hours Before Deadline')
  })
})
