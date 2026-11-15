import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { DEFAULT_LANGUAGE } from './config'

// English resources
import enCommon from './locales/en/common.json'
import enNav from './locales/en/navigation.json'
import enHome from './locales/en/home.json'
import enPlay from './locales/en/play.json'
import enOpportunities from './locales/en/opportunities.json'
import enReviews from './locales/en/reviews.json'

// Hindi resources
import hiCommon from './locales/hi/common.json'
import hiNav from './locales/hi/navigation.json'
import hiHome from './locales/hi/home.json'
import hiPlay from './locales/hi/play.json'
import hiOpportunities from './locales/hi/opportunities.json'
import hiReviews from './locales/hi/reviews.json'

// Bengali resources
import bnCommon from './locales/bn/common.json'
import bnNav from './locales/bn/navigation.json'
import bnPlay from './locales/bn/play.json'

// Marathi resources
import mrCommon from './locales/mr/common.json'
import mrNav from './locales/mr/navigation.json'
import mrPlay from './locales/mr/play.json'

// Tamil resources
import taCommon from './locales/ta/common.json'
import taNav from './locales/ta/navigation.json'
import taPlay from './locales/ta/play.json'

// Telugu resources
import teCommon from './locales/te/common.json'
import teNav from './locales/te/navigation.json'
import tePlay from './locales/te/play.json'

// Gujarati resources
import guCommon from './locales/gu/common.json'
import guNav from './locales/gu/navigation.json'
import guPlay from './locales/gu/play.json'

// Kannada resources
import knCommon from './locales/kn/common.json'
import knNav from './locales/kn/navigation.json'
import knPlay from './locales/kn/play.json'

// Malayalam resources
import mlCommon from './locales/ml/common.json'
import mlNav from './locales/ml/navigation.json'
import mlPlay from './locales/ml/play.json'

// Punjabi resources
import paCommon from './locales/pa/common.json'
import paNav from './locales/pa/navigation.json'
import paPlay from './locales/pa/play.json'

const resources = {
  en: {
    common: enCommon,
    navigation: enNav,
    home: enHome,
    play: enPlay,
    opportunities: enOpportunities,
    reviews: enReviews,
  },
  hi: {
    common: hiCommon,
    navigation: hiNav,
    home: hiHome,
    play: hiPlay,
    opportunities: hiOpportunities,
    reviews: hiReviews,
  },
  bn: {
    common: bnCommon,
    navigation: bnNav,
    play: bnPlay,
  },
  mr: {
    common: mrCommon,
    navigation: mrNav,
    play: mrPlay,
  },
  ta: {
    common: taCommon,
    navigation: taNav,
    play: taPlay,
  },
  te: {
    common: teCommon,
    navigation: teNav,
    play: tePlay,
  },
  gu: {
    common: guCommon,
    navigation: guNav,
    play: guPlay,
  },
  kn: {
    common: knCommon,
    navigation: knNav,
    play: knPlay,
  },
  ml: {
    common: mlCommon,
    navigation: mlNav,
    play: mlPlay,
  },
  pa: {
    common: paCommon,
    navigation: paNav,
    play: paPlay,
  },
}

export const getStoredLang = () => {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE
  try {
    return localStorage.getItem('khelgrid-lang') || DEFAULT_LANGUAGE
  } catch {
    return DEFAULT_LANGUAGE
  }
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getStoredLang(),
    fallbackLng: DEFAULT_LANGUAGE,
    defaultNS: 'common',
    ns: ['common', 'navigation', 'home', 'play', 'opportunities', 'reviews'],
    interpolation: {
      escapeValue: false, // React already escapes XSS
    },
    react: {
      useSuspense: false,
    },
  })

export function changeAppLanguage(langCode: string): void {
  i18n.changeLanguage(langCode)
  if (typeof document !== 'undefined') {
    document.documentElement.lang = langCode
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem('khelgrid-lang', langCode)
    } catch {
      // Ignore storage errors
    }
  }
}

export default i18n
