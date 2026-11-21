/**
 * KhelGrid SaaS Hindi & Bilingual Localization Helper
 * 
 * Provides pitch-side Hindi translations and accessible bilingual rendering
 * for sports coaches, academy directors, and parents across India.
 */

export interface SaasDictionary {
  [key: string]: {
    en: string
    hi: string
  }
}

export const SAAS_BILINGUAL_DICT: SaasDictionary = {
  attendance_present: { en: 'Present', hi: 'उपस्थित' },
  attendance_absent: { en: 'Absent', hi: 'अनुपस्थित' },
  attendance_excused: { en: 'Excused', hi: 'अवकाश' },
  status_paid: { en: 'Paid', hi: 'भुगतान संपन्न' },
  status_due_soon: { en: 'Due Soon', hi: 'शीघ्र देय' },
  status_overdue: { en: 'Overdue', hi: 'अतिदेय (बकाया)' },
  tab_leads: { en: 'Admissions & CRM', hi: 'दाखिला पूछताछ' },
  tab_batches: { en: 'Batches & Squads', hi: 'प्रशिक्षण बैच' },
  tab_fees: { en: 'Trainees & Fees', hi: 'छात्र एवं शुल्क' },
  tab_ledger: { en: 'Cash & UPI Ledger', hi: 'वित्तीय खाता' },
  tab_attendance: { en: 'Daily Roll Call', hi: 'दैनिक उपस्थिति' },
  tab_staff: { en: 'Coaching Staff', hi: 'प्रशिक्षक एवं कर्मचारी' },
  tab_trial_passes: { en: 'Trial Passes', hi: 'ट्रायल प्रवेश पत्र' },
  tab_settings: { en: 'Settings', hi: 'अकादमी सेटिंग्स' },
  tab_audit: { en: 'Security Audit Log', hi: 'सुरक्षा ऑडिट रिकॉर्ड' },
  role_owner: { en: 'Owner', hi: 'स्वामी / संचालक' },
  role_director: { en: 'Director', hi: 'निदेशक' },
  role_head_coach: { en: 'Head Coach', hi: 'मुख्य कोच' },
  role_coach: { en: 'Coach', hi: 'कोच' },
  role_accountant: { en: 'Accountant', hi: 'अकाउंटेंट' },
  role_staff: { en: 'Staff', hi: 'कर्मचारी' },
  role_parent: { en: 'Parent / Guardian', hi: 'अभिभावक' },
  role_athlete: { en: 'Athlete', hi: 'खिलाड़ी' },
  action_save_attendance: { en: 'Save Attendance', hi: 'उपस्थिति दर्ज करें' },
  action_record_fee: { en: 'Record Offline Payment', hi: 'शुल्क भुगतान दर्ज करें' },
  action_export_csv: { en: 'Export CSV', hi: 'सीएसवी निर्यात' },
  reconciliation_balanced: { en: '100% Balanced', hi: '100% संतुलित खाता' },
  reconciliation_audit: { en: 'Mathematical Audit', hi: 'लेखा परीक्षा' },
  free_tier: { en: 'Grassroots Launch Tier (₹0 / month)', hi: 'ग्रासरूट्स लॉन्च प्लान (₹0 / माह)' },
  free_tier_badge: { en: '100% Free Forever Grassroots Promotion', hi: '100% आजीवन नि:शुल्क ग्रासरूट्स' },
}

/**
 * Returns translated string according to active language
 */
export function getSaasTerm(termKey: keyof typeof SAAS_BILINGUAL_DICT, lang: 'en' | 'hi' = 'en'): string {
  const entry = SAAS_BILINGUAL_DICT[termKey]
  if (!entry) return String(termKey)
  return entry[lang] || entry.en
}

/**
 * Formats a bilingual badge or accessible label: e.g. "Present · उपस्थित"
 */
export function getBilingualLabel(termKey: keyof typeof SAAS_BILINGUAL_DICT, showBoth = false, lang: 'en' | 'hi' = 'en'): string {
  const entry = SAAS_BILINGUAL_DICT[termKey]
  if (!entry) return String(termKey)
  if (showBoth) {
    return `${entry.en} · ${entry.hi}`
  }
  return entry[lang] || entry.en
}
