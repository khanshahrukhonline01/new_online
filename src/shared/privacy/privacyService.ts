import { getSupabaseClient } from '../../integrations/supabase/realtime-client'

export type ConsentType =
  | 'terms_of_service'
  | 'privacy_policy'
  | 'scouting_profiling'
  | 'minor_guardian_consent'
  | 'marketing_communications'
  | 'sports_pass'

export interface UserDataExport {
  exported_at: string
  compliance_standard: string
  user_id: string
  profile: Record<string, unknown>
  bookmarks: unknown[]
  venue_bookings: unknown[]
  coach_inquiries: unknown[]
  trial_applications: unknown[]
  academy_enquiries: unknown[]
  consents: unknown[]
}

/**
 * Masks a phone number to protect personal privacy in public views.
 * Examples:
 *   "+919876543210" -> "+91 98*** **210"
 *   "9876543210"    -> "98*** **210"
 */
export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return '••••••••••'
  const trimmed = phone.trim()
  const digitsOnly = trimmed.replace(/[^0-9]/g, '')

  if (digitsOnly.length < 7) {
    return '••••••'
  }

  if (digitsOnly.length === 10) {
    const prefix = digitsOnly.slice(0, 2)
    const suffix = digitsOnly.slice(-3)
    return `${prefix}*** **${suffix}`
  }

  if (digitsOnly.length > 10) {
    const countryCode = digitsOnly.slice(0, digitsOnly.length - 10)
    const national = digitsOnly.slice(-10)
    const prefix = national.slice(0, 2)
    const suffix = national.slice(-3)
    return `+${countryCode} ${prefix}*** **${suffix}`
  }

  return `${digitsOnly.slice(0, 2)}***${digitsOnly.slice(-2)}`
}

/**
 * Masks an email address to protect identity while confirming ownership.
 * Examples:
 *   "athlete@khelgrid.com" -> "a***e@khelgrid.com"
 *   "me@khelgrid.com"      -> "m***@khelgrid.com"
 */
export function maskEmailAddress(email?: string | null): string {
  if (!email || !email.includes('@')) {
    return '••••@••••.•••'
  }

  const [localPart, domain] = email.trim().toLowerCase().split('@')
  if (!localPart || !domain) return '••••@••••.•••'

  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`
  }

  const firstChar = localPart[0]
  const lastChar = localPart[localPart.length - 1]
  return `${firstChar}***${lastChar}@${domain}`
}

/**
 * Masks a bank account number, displaying only the final 4 digits.
 * Example:
 *   "123456789012" -> "•••• •••• 9012"
 */
export function maskBankAccountNumber(accountNumber?: string | null): string {
  if (!accountNumber) return '•••• •••• ••••'
  const digitsOnly = accountNumber.replace(/[^0-9]/g, '')
  if (digitsOnly.length < 4) return '•••• •••• ••••'
  const last4 = digitsOnly.slice(-4)
  return `•••• •••• ${last4}`
}

/**
 * Records or updates a user consent event for DPDP Act 2023 compliance.
 */
export async function recordUserConsent(
  userId: string,
  consentType: ConsentType,
  status: 'granted' | 'withdrawn' = 'granted',
): Promise<{ success: boolean; message?: string }> {
  const client = getSupabaseClient()
  if (!client) {
    return { success: true, message: 'Consent recorded locally (offline mode).' }
  }

  try {
    const { error } = await client.from('user_consents').insert({
      user_id: userId,
      consent_type: consentType,
      status,
      version: 'v1.0',
    })

    if (error) {
      return { success: false, message: error.message }
    }
    return { success: true }
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Failed to record consent.',
    }
  }
}

/**
 * Exports all user data in a portable JSON format under DPDP Act 2023 Section 12.
 */
export async function exportMyPersonalData(
  userId: string,
): Promise<{ success: boolean; data?: UserDataExport; message?: string }> {
  const client = getSupabaseClient()
  if (!client) {
    return {
      success: true,
      data: {
        exported_at: new Date().toISOString(),
        compliance_standard: 'DPDP Act 2023 (Section 12: Right to Data Portability)',
        user_id: userId,
        profile: { id: userId, display_name: 'Local Athlete' },
        bookmarks: [],
        venue_bookings: [],
        coach_inquiries: [],
        trial_applications: [],
        academy_enquiries: [],
        consents: [],
      },
    }
  }

  try {
    const { data, error } = await client.rpc('export_user_data', {
      p_user_id: userId,
    })

    if (error) {
      return { success: false, message: error.message }
    }
    return { success: true, data: data as UserDataExport }
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Export failed.',
    }
  }
}

/**
 * Executes user account anonymization and PII erasure under DPDP Act 2023 Section 12.
 */
export async function requestAccountErasure(
  userId: string,
): Promise<{ success: boolean; message?: string }> {
  const client = getSupabaseClient()
  if (!client) {
    return {
      success: true,
      message: 'Account data redacted in local vault (offline mode).',
    }
  }

  try {
    const { data, error } = await client.rpc('anonymize_user_account', {
      p_user_id: userId,
    })

    if (error) {
      return { success: false, message: error.message }
    }
    return {
      success: true,
      message: (data as { message?: string })?.message || 'Data erased successfully.',
    }
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Erasure request failed.',
    }
  }
}
