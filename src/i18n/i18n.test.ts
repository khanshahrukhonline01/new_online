import { describe, it, expect, beforeEach } from 'vitest'
import i18n, { changeAppLanguage, getStoredLang } from './index'

describe('KhelGrid Multilingual System (i18n)', () => {
  beforeEach(() => {
    changeAppLanguage('en')
  })

  it('initializes with English as default language', () => {
    expect(i18n.isInitialized).toBe(true)
    expect(i18n.language).toBe('en')
    expect(i18n.t('search', { ns: 'common' })).toBe('Search')
    expect(i18n.t('your-space', { ns: 'navigation' })).toBe('Your Space')
  })

  it('switches dynamically to Hindi and translates navigation & common keys', () => {
    changeAppLanguage('hi')
    expect(i18n.language).toBe('hi')
    expect(i18n.t('search', { ns: 'common' })).toBe('खोजें')
    expect(i18n.t('your-space', { ns: 'navigation' })).toBe('आपका स्थान')
    expect(i18n.t('sports', { ns: 'navigation' })).toBe('सभी खेल')
    expect(i18n.t('heading', { ns: 'play' })).toBe('सामुदायिक मैच · पिकअप खेल')
  })

  it('switches to regional Indian languages (e.g. Bengali, Marathi, Tamil, Punjabi)', () => {
    changeAppLanguage('bn')
    expect(i18n.language).toBe('bn')
    expect(i18n.t('search', { ns: 'common' })).toBe('অনুসন্ধান')
    expect(i18n.t('your-space', { ns: 'navigation' })).toBe('আপনার স্থান')

    changeAppLanguage('mr')
    expect(i18n.language).toBe('mr')
    expect(i18n.t('search', { ns: 'common' })).toBe('शोधा')
    expect(i18n.t('your-space', { ns: 'navigation' })).toBe('तुमची जागा')

    changeAppLanguage('ta')
    expect(i18n.language).toBe('ta')
    expect(i18n.t('search', { ns: 'common' })).toBe('தேடு')
    expect(i18n.t('your-space', { ns: 'navigation' })).toBe('உங்கள் இடம்')

    changeAppLanguage('pa')
    expect(i18n.language).toBe('pa')
    expect(i18n.t('search', { ns: 'common' })).toBe('ਖੋਜੋ')
    expect(i18n.t('your-space', { ns: 'navigation' })).toBe('ਤੁਹਾਡੀ ਥਾਂ')
  })

  it('falls back to English when a key is missing in a target language', () => {
    changeAppLanguage('pa')
    // opportunities.json is not explicitly localized in 'pa', so it should fallback to 'en'
    const fallbackVal = i18n.t('trials', { ns: 'opportunities' })
    expect(fallbackVal).toBe('Selection Trials')
  })

  it('returns default language when getStoredLang is called without storage', () => {
    const lang = getStoredLang()
    expect(typeof lang).toBe('string')
    expect(['en', 'hi', 'bn', 'mr', 'ta', 'te', 'gu', 'kn', 'ml', 'pa']).toContain(lang)
  })
})
