export interface LanguageOption {
  code: string
  name: string
  nativeName: string
  flag: string
  region: string
}

export const SUPPORTED_I18N_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇮🇳', region: 'Pan-India & Global' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', region: 'North & Central India' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳', region: 'West Bengal & East India' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳', region: 'Maharashtra & Western India' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳', region: 'Tamil Nadu & South India' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳', region: 'Andhra Pradesh & Telangana' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳', region: 'Gujarat' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳', region: 'Karnataka' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳', region: 'Kerala' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳', region: 'Punjab, Haryana, Delhi' },
]

export const DEFAULT_LANGUAGE = 'en'
export const I18N_NAMESPACES = [
  'common',
  'navigation',
  'home',
  'play',
  'opportunities',
  'venues',
  'academies',
  'reviews',
  'sports',
  'forms',
] as const

export type I18nNamespace = typeof I18N_NAMESPACES[number]
