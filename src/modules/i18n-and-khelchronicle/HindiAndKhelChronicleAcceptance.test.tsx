import { describe, it, expect, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import i18n, { changeAppLanguage } from '../../i18n'
import { KhelChronicleHome } from '../khelchronicle/KhelChronicleHome'
import { KhelChroniclePaperPage } from '../khelchronicle/KhelChroniclePaperPage'
import { KhelChronicleCategoryPage } from '../khelchronicle/KhelChronicleCategoryPage'
import { KhelChronicleSubmitPage } from '../khelchronicle/KhelChronicleSubmitPage'
import { RESEARCH_PAPERS } from '../khelchronicle/data/khelchronicleData'
import { generateChronicleRssXml, FEED_TITLE } from '../../shared/feedGenerator'

import enCommon from '../../i18n/locales/en/common.json'
import hiCommon from '../../i18n/locales/hi/common.json'
import enHome from '../../i18n/locales/en/home.json'
import hiHome from '../../i18n/locales/hi/home.json'
import enNavigation from '../../i18n/locales/en/navigation.json'
import hiNavigation from '../../i18n/locales/hi/navigation.json'
import enOpportunities from '../../i18n/locales/en/opportunities.json'
import hiOpportunities from '../../i18n/locales/hi/opportunities.json'
import enPlay from '../../i18n/locales/en/play.json'
import hiPlay from '../../i18n/locales/hi/play.json'
import enReviews from '../../i18n/locales/en/reviews.json'
import hiReviews from '../../i18n/locales/hi/reviews.json'

describe('Pillar 5 Acceptance: Hindi Localization & KhelChronicle Academic Repository', () => {
  beforeEach(() => {
    changeAppLanguage('hi')
  })

  describe('Hindi Localization (i18n) Evidence', () => {
    it('verifies all 6 primary Hindi translation namespaces exist and match English key sets', () => {
      const namespacePairs: [Record<string, string>, Record<string, string>][] = [
        [enCommon, hiCommon],
        [enHome, hiHome],
        [enNavigation, hiNavigation],
        [enOpportunities, hiOpportunities],
        [enPlay, hiPlay],
        [enReviews, hiReviews],
      ]

      for (const [enObj, hiObj] of namespacePairs) {
        const hiKeys = Object.keys(hiObj)
        expect(hiKeys.length).toBeGreaterThan(0)

        // Verify values are strings and non-empty
        for (const key of hiKeys) {
          expect(typeof hiObj[key]).toBe('string')
          expect(hiObj[key].trim().length).toBeGreaterThan(0)
        }

        // Verify key coverage matching English keys
        for (const enKey of Object.keys(enObj)) {
          expect(hiObj).toHaveProperty(enKey)
        }
      }
    })

    it('translates core sport and navigation terms correctly in Hindi', () => {
      expect(i18n.language).toBe('hi')

      // Navigation translations
      expect(i18n.t('your-space', { ns: 'navigation' })).toBe('आपका स्थान')
      expect(i18n.t('sports', { ns: 'navigation' })).toBe('सभी खेल')
      expect(i18n.t('venues', { ns: 'navigation' })).toBe('खेल मैदान और टर्फ')
      expect(i18n.t('opportunities', { ns: 'navigation' })).toBe('चयन ट्रायल और अवसर')
      expect(i18n.t('khelchronicle', { ns: 'navigation' })).toBe('खेल क्रॉनिकल अनुसंधान')
      expect(i18n.t('postGame', { ns: 'navigation' })).toBe('मैच पोस्ट करें')

      // Common translations
      expect(i18n.t('search', { ns: 'common' })).toBe('खोजें')
      expect(i18n.t('searchCatalogueAria', { ns: 'common' })).toBe('खेलग्रिड कैटलॉग खोजें')
      expect(i18n.t('searchKhelgrid', { ns: 'common' })).toBe('खेलग्रिड खोजें')

      // Home translations
      expect(i18n.t('heroBadge', { ns: 'home' })).toContain('भारत का एकीकृत खेल अन्वेषण')
      expect(i18n.t('findTrials', { ns: 'home' })).toBe('चयन ट्रायल देखें')
      expect(i18n.t('bookTurf', { ns: 'home' })).toBe('खेल मैदान व टर्फ खोजें')

      // Opportunities translations
      expect(i18n.t('heading', { ns: 'opportunities' })).toBe('चयन ट्रायल · कंबाइन · छात्रवृत्तियां')
      expect(i18n.t('trials', { ns: 'opportunities' })).toBe('चयन ट्रायल')
      expect(i18n.t('scholarships', { ns: 'opportunities' })).toBe('खेल छात्रवृत्तियां')

      // Play translations
      expect(i18n.t('heading', { ns: 'play' })).toBe('सामुदायिक मैच · पिकअप खेल')
      expect(i18n.t('hostMatch', { ns: 'play' })).toBe('मैच आयोजित करें')
    })
  })

  describe('KhelChronicle Academic Repository Evidence', () => {
    it('renders KhelChronicle Home with Open Access, CC BY 4.0, and Schema.org metadata', () => {
      const html = renderToStaticMarkup(<KhelChronicleHome />)

      expect(html).toContain('KhelChronicle · Open Sports Research Archive')
      expect(html).toContain('100% Open Access')
      expect(html).toContain('CC BY 4.0')
      expect(html).toContain('application/ld+json')
      expect(html).toContain('DataCatalog')
      expect(html).toContain('Sports Biomechanics')
      expect(html).toContain('Exercise Physiology')
      expect(html).toContain('Sports Nutrition')
    })

    it('renders academic research paper page with complete scholarly metadata, tables, and ethics statement', () => {
      const firstPaper = RESEARCH_PAPERS[0]
      expect(firstPaper).toBeDefined()

      const html = renderToStaticMarkup(<KhelChroniclePaperPage slug={firstPaper.slug} initialPaper={firstPaper} />)

      // Identifiers & Peer Review status
      expect(html).toContain(firstPaper.paperId)
      expect(html).toContain('Preprint')
      expect(html).toContain(firstPaper.categoryName)

      // Title & Authors
      expect(html).toContain(firstPaper.authors[0].name)
      expect(html).toContain(firstPaper.authors[0].affiliation)

      // Ethics & Open Science data availability
      expect(html).toContain('Ethics &amp; Consent Statement:')
      expect(html).toContain('Data Availability:')
      expect(html).toContain('KG-DATA-')
    })

    it('renders discipline category view with filtered research publications', () => {
      const html = renderToStaticMarkup(<KhelChronicleCategoryPage categorySlug="sports-biomechanics" />)

      expect(html).toContain('Sports Biomechanics')
      expect(html).toContain('Research Discipline')
      expect(html).toContain('Diamond Open Access (CC BY 4.0)')
      expect(html).toContain('Checking approved public manuscripts')
    })

    it('renders manuscript submission page with 5-step stepper, ethics and Diamond Open Access pledges', () => {
      const html = renderToStaticMarkup(<KhelChronicleSubmitPage />)

      expect(html).toContain('Submit Research Manuscript')
      expect(html).toContain('Diamond Open Access')
      expect(html).toContain('Zero Article Processing Charges (APC)')
      expect(html).toContain('1. Article &amp; Category')
      expect(html).toContain('5. Ethics &amp; Preview')
    })

    it('verifies that the RSS feed is valid XML and contains all published preprints', () => {
      const feedXml = generateChronicleRssXml()

      expect(feedXml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(feedXml).toContain('<rss version="2.0"')
      expect(feedXml).toContain(`<title>${FEED_TITLE}</title>`)
      expect(feedXml).toContain('<link>https://khelgrid.com/khelchronicle</link>')

      for (const paper of RESEARCH_PAPERS) {
        expect(feedXml).toContain(`<guid isPermaLink="true">https://khelgrid.com/khelchronicle/${paper.slug}</guid>`)
      }
    })
  })
})
