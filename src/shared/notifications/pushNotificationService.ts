/**
 * KhelGrid Grassroots Trial Alert & Push Notification Service
 * Manages 1-Tap WhatsApp Trial Subscriptions, 48h/12h deadline countdown reminders,
 * and Web Push Notifications for grassroots athletes across Indian sports hubs.
 */

export interface TrialAlertSubscription {
  id: string
  phoneNumber: string
  sport: string
  state: string
  city?: string
  ageCategory: 'U-14' | 'U-16' | 'U-19' | 'Open' | 'All'
  channel: 'whatsapp' | 'web-push' | 'both'
  subscribedAt: string
  token: string
  active: boolean
  remind48HoursBefore: boolean
  remind12HoursBefore: boolean
}

export const LOCAL_STORAGE_TRIAL_SUBS_KEY = 'khelgrid_trial_alert_subscriptions'

export function generateAlertToken(sport: string, state: string): string {
  const cleanSport = sport.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'SPT'
  const cleanState = state.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'IND'
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `KG-ALERT-${cleanSport}-${cleanState}-${rand}`
}

export function saveTrialAlertSubscription(
  input: Omit<TrialAlertSubscription, 'id' | 'subscribedAt' | 'token' | 'active'>,
): TrialAlertSubscription {
  const token = generateAlertToken(input.sport, input.state)
  const newSub: TrialAlertSubscription = {
    ...input,
    id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    subscribedAt: new Date().toISOString(),
    token,
    active: true,
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const existing = getTrialAlertSubscriptions()
      const updated = [newSub, ...existing.filter(s => s.phoneNumber !== input.phoneNumber || s.sport !== input.sport)]
      window.localStorage.setItem(LOCAL_STORAGE_TRIAL_SUBS_KEY, JSON.stringify(updated))
    } catch {
      // Ignore localStorage exceptions in private browsing
    }
  }

  return newSub
}

export function getTrialAlertSubscriptions(): TrialAlertSubscription[] {
  if (typeof window === 'undefined' || !window.localStorage) return []
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_TRIAL_SUBS_KEY)
    return raw ? (JSON.parse(raw) as TrialAlertSubscription[]) : []
  } catch {
    return []
  }
}

/**
 * Builds direct WhatsApp URL with pre-filled trial alert subscription message.
 */
export function buildWhatsAppSubscriptionUrl(sub: {
  sport: string
  state: string
  city?: string
  ageCategory: string
  phoneNumber?: string
}): string {
  const region = [sub.city, sub.state].filter(Boolean).join(', ') || 'All India'
  const token = generateAlertToken(sub.sport, sub.state)

  const message = [
    '🏆 *KhelGrid 1-Tap Selection Trial Alert Subscription*',
    '',
    `• *Sport:* ${sub.sport}`,
    `• *Region:* ${region}`,
    `• *Age Category:* ${sub.ageCategory}`,
    '• *Countdown Alerts:* 48 Hours & 12 Hours Before Deadline',
    `• *Token:* #${token}`,
    '',
    'Namaste! Please register my WhatsApp number for free verified SAI, federation, and academy selection trial alerts in my district.',
  ].join('\n')

  return `https://wa.me/?text=${encodeURIComponent(message)}`
}

/**
 * Requests native browser Web Push Notification permission.
 */
export async function requestWebPushPermission(): Promise<'granted' | 'denied' | 'default'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied'
  }
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

/**
 * Dispatches a native browser notification if permission is granted.
 */
export function dispatchWebPushNotification(title: string, options?: NotificationOptions): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  if (Notification.permission !== 'granted') return false

  try {
    new Notification(title, {
      icon: 'https://khelgrid.com/assets/kg-logo.webp',
      badge: 'https://khelgrid.com/assets/kg-logo.webp',
      ...options,
    })
    return true
  } catch {
    return false
  }
}
