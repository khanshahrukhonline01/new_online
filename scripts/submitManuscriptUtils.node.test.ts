import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildSubmissionAbstract,
  buildSubmissionKeywords,
  deserializeDraft,
  filterSportGameOptions,
  formatConsolidatedCoAuthors,
  formatProvisionalCitations,
  isValidHttpsUrl,
  isValidOrcid,
  normalizeOrcid,
  resolveCohortLabel,
  resolveEnvironmentLabel,
  resolveSportLabel,
  resolveSportLabels,
  serializeDraft,
  toggleSportSelection,
  validateAllSubmissionSteps,
  validateSubmissionStep,
  type ManuscriptDraftState,
  type SubmissionValidationState,
} from '../src/modules/khelchronicle/submitManuscriptUtils'

function makeValidState(): SubmissionValidationState {
  return {
    title: 'Kinematic Analysis of Junior Fast Bowlers',
    sports: ['cricket', 'pickleball'],
    customSport: '',
    keywords: 'Cricket, Biomechanics, Lumbar Spine',
    primaryAuthorName: 'Dr. Rajeshwari Nair',
    primaryAuthorEmail: 'rajeshwari@lnipe.edu.in',
    primaryAuthorAffiliation: 'LNIPE Gwalior',
    orcid: '0000-0002-8941-4412',
    coAuthorsList: [
      {
        id: 'ca-1',
        name: 'Prof. R. K. Sharma',
        email: 'rk.sharma@iis.in',
        affiliation: 'Inspire Institute of Sport',
        orcid: '0000-0003-1234-567X',
      },
    ],
    abstract:
      'Background: Fast bowling injuries are common. Methods: 3D motion capture on 60 bowlers. Results: Significant lumbar lateral flexion differences. Conclusion: Monitor workload.',
    fullTextOrUrl: 'https://zenodo.org/records/123456',
    supplementaryUrl: 'https://github.com/khelgrid/fast-bowling-data',
    preregistrationUrl: 'https://osf.io/registries/abcde',
    ethicsClearanceNumber: 'LNIPE-IEC-2026-014',
    fundingStatement: 'No external funding received.',
    conflictsDisclosure: 'None declared.',
    ethicsDeclaration: true,
    minorConsentDeclaration: true,
    cleanSportDeclaration: true,
    licenseDeclaration: true,
  }
}

test('ORCID normalization and validation supports standard IDs and orcid.org URLs', () => {
  assert.equal(normalizeOrcid('https://orcid.org/0000-0002-8941-441x'), '0000-0002-8941-441X')
  assert.equal(isValidOrcid(''), true)
  assert.equal(isValidOrcid('0000-0002-8941-4412'), true)
  assert.equal(isValidOrcid('https://orcid.org/0000-0002-8941-441X'), true)
  assert.equal(isValidOrcid('1234-5678'), false)
})

test('HTTPS URL validation requires https protocol', () => {
  assert.equal(isValidHttpsUrl('https://zenodo.org/records/123'), true)
  assert.equal(isValidHttpsUrl('http://zenodo.org/records/123'), false)
  assert.equal(isValidHttpsUrl('ftp://zenodo.org/file.pdf'), false)
  assert.equal(isValidHttpsUrl('not a url'), false)
})

test('validateSubmissionStep catches errors across all 5 steps including Phase A fields', () => {
  const base = makeValidState()
  assert.equal(validateAllSubmissionSteps(base).valid, true)

  // Step 1: min title length 5, >=1 sport selected, custom sport when sports includes 'other', non-empty keywords
  assert.equal(validateSubmissionStep(1, { ...base, title: 'Test' }).valid, false)
  assert.equal(validateSubmissionStep(1, { ...base, sports: [] }).valid, false)
  assert.equal(validateSubmissionStep(1, { ...base, sports: ['pickleball', 'other'], customSport: '   ' }).valid, false)
  assert.equal(validateSubmissionStep(1, { ...base, sports: ['pickleball', 'other'], customSport: 'Mallakhamb' }).valid, true)
  assert.equal(validateSubmissionStep(1, { ...base, keywords: '   ' }).valid, false)

  // Step 2: primary author + co-author email/ORCID validation
  assert.equal(validateSubmissionStep(2, { ...base, orcid: 'bad-orcid' }).valid, false)
  assert.equal(
    validateSubmissionStep(2, {
      ...base,
      coAuthorsList: [{ id: '1', name: 'Co Author', email: 'bad-email', affiliation: 'SAI', orcid: '' }],
    }).valid,
    false,
  )

  // Step 4: manuscript URL required & HTTPS, optional supplementary & preregistration HTTPS
  assert.equal(validateSubmissionStep(4, { ...base, fullTextOrUrl: '' }).valid, false)
  assert.equal(validateSubmissionStep(4, { ...base, fullTextOrUrl: 'http://example.com/a.pdf' }).valid, false)
  assert.equal(validateSubmissionStep(4, { ...base, supplementaryUrl: 'http://example.com/data' }).valid, false)
  assert.equal(validateSubmissionStep(4, { ...base, preregistrationUrl: 'http://osf.io/reg' }).valid, false)
  assert.equal(validateSubmissionStep(4, { ...base, preregistrationUrl: '' }).valid, true)

  // Step 5: ethics clearance, funding, conflicts, clean-sport & declarations required
  assert.equal(validateSubmissionStep(5, { ...base, ethicsClearanceNumber: '' }).valid, false)
  assert.equal(validateSubmissionStep(5, { ...base, fundingStatement: '  ' }).valid, false)
  assert.equal(validateSubmissionStep(5, { ...base, conflictsDisclosure: '' }).valid, false)
  assert.equal(validateSubmissionStep(5, { ...base, cleanSportDeclaration: false }).valid, false)
  assert.equal(validateSubmissionStep(5, { ...base, licenseDeclaration: false }).valid, false)

  // validateAllSubmissionSteps returns exact firstInvalidStep
  const badStep4 = validateAllSubmissionSteps({ ...base, fullTextOrUrl: 'http://insecure.test/paper.pdf' })
  assert.equal(badStep4.valid, false)
  assert.equal(badStep4.firstInvalidStep, 4)
})

test('formatConsolidatedCoAuthors preserves affiliation, ORCID, and email without dropping fields', () => {
  const result = formatConsolidatedCoAuthors('Dr. Alok Sen (SAI Bengaluru)', [
    {
      id: 'ca-1',
      name: 'Priya Narang',
      affiliation: 'Delhi University',
      orcid: 'https://orcid.org/0000-0001-2222-3334',
      email: 'priya@du.ac.in',
    },
  ])
  assert.ok(result.includes('Dr. Alok Sen (SAI Bengaluru)'))
  assert.ok(result.includes('Priya Narang (Delhi University · ORCID: 0000-0001-2222-3334 · priya@du.ac.in)'))
})

test('filterSportGameOptions, toggleSportSelection, and resolveSportLabels support searchable multiselect categorization', () => {
  const pickleMatches = filterSportGameOptions('pickle')
  assert.equal(pickleMatches.length, 1)
  assert.equal(pickleMatches[0].id, 'pickleball')
  assert.equal(pickleMatches[0].name, 'Pickleball')

  const aliasMatches = filterSportGameOptions('soccer')
  assert.ok(aliasMatches.some(opt => opt.id === 'football'))

  assert.equal(filterSportGameOptions('nomatchxyz').length, 0)

  const added = toggleSportSelection(['cricket'], 'pickleball')
  assert.deepEqual(added, ['cricket', 'pickleball'])
  const removed = toggleSportSelection(added, 'cricket')
  assert.deepEqual(removed, ['pickleball'])

  assert.deepEqual(resolveSportLabels(['cricket', 'kabaddi', 'other'], 'Mallakhamb'), [
    'Cricket',
    'Kabaddi',
    'Mallakhamb',
  ])
})

test('buildSubmissionKeywords appends multi-sport labels and cohort tier without case-insensitive duplicates', () => {
  const keywords = buildSubmissionKeywords(
    'cricket, Force Plate, Lumbar Spine',
    ['Cricket', 'Pickleball'],
    'National / Elite Senior Athletes',
  )
  assert.equal(
    keywords,
    'cricket, Force Plate, Lumbar Spine, Pickleball, National / Elite Senior Athletes',
  )
})

test('buildSubmissionAbstract appends coaching cues and Phase A sports context/disclosures cleanly', () => {
  const withCues = buildSubmissionAbstract('Main abstract body.', ['Cue A', '', 'Cue B'])
  assert.ok(withCues.includes('Main abstract body.'))
  assert.ok(withCues.includes('Field Implications for Coaches & Scouts:'))
  assert.ok(withCues.includes('- Takeaway 1: Cue A'))
  assert.ok(withCues.includes('- Takeaway 2: Cue B'))

  assert.equal(buildSubmissionAbstract('Main abstract body.', ['', '  ']), 'Main abstract body.')

  const withMeta = buildSubmissionAbstract('Main abstract body.', ['Cue A'], {
    sportLabel: resolveSportLabel('kabaddi'),
    cohortLabel: resolveCohortLabel('national-elite'),
    testingEnvironmentLabel: resolveEnvironmentLabel('indoor-court'),
    testingApparatus: 'n=32 raiders, 100 Hz IMU sensors',
    preregistrationUrl: 'https://osf.io/registries/xyz',
    fundingStatement: 'No external funding received.',
    conflictsDisclosure: 'None declared.',
    cleanSportAttested: true,
  })
  assert.ok(withMeta.includes('Sports Context & Testing Apparatus:'))
  assert.ok(withMeta.includes('- Sport / Game: Kabaddi'))
  assert.ok(withMeta.includes('- Athlete Cohort Tier: National / Elite Senior Athletes'))
  assert.ok(withMeta.includes('- Testing Environment: Indoor Court / Arena / Hall'))
  assert.ok(withMeta.includes('- Apparatus & Sample Protocol: n=32 raiders, 100 Hz IMU sensors'))
  assert.ok(withMeta.includes('Open Science & Compliance Disclosures:'))
  assert.ok(withMeta.includes('- Study Preregistration: https://osf.io/registries/xyz'))
  assert.ok(withMeta.includes('- Clean-Sport Compliance: Author attested WADA / NADA prohibited-list'))
})

test('formatProvisionalCitations generates APA, Vancouver, BibTeX, and RIS UNPB records without fake DOIs', () => {
  const citations = formatProvisionalCitations({
    primaryAuthorName: 'Dr. Rajeshwari Nair',
    coAuthorsText: 'Dr. Alok Sen (SAI)',
    coAuthorsList: [{ id: '1', name: 'Priya Narang', email: '', affiliation: 'DU', orcid: '' }],
    title: 'Sprint Acceleration Study',
    category: 'sports-biomechanics',
    keywords: 'Athletics, Biomechanics',
    submissionId: 'KG-SUB-123',
    year: 2026,
  })
  assert.ok(citations.apa.includes('Nair, R., Sen, A., & Narang, P. (2026).'))
  assert.ok(citations.apa.includes('KG-SUB-123'))
  assert.ok(!citations.apa.includes('10.5281/khelchronicle'))
  assert.ok(citations.vancouver.includes('Nair R, Sen A, Narang P.'))
  assert.ok(citations.bibtex.includes('Dr. Rajeshwari Nair and Dr. Alok Sen and Priya Narang'))
  assert.ok(citations.ris.startsWith('TY  - UNPB'))
  assert.ok(citations.ris.includes('AU  - Nair, Rajeshwari'))
  assert.ok(citations.ris.includes('KW  - Athletics'))
  assert.ok(citations.ris.includes('N1  - Provisional Preprint Accession: KG-SUB-123 (Not yet peer-reviewed)'))
  assert.ok(citations.ris.endsWith('ER  - '))
})

test('serializeDraft and deserializeDraft preserve Phase A fields along with multi-sport array and legacy draft migration', () => {
  const draft: ManuscriptDraftState = {
    currentStep: 4,
    articleType: 'dataset',
    title: 'Benchmark Telemetry Dataset',
    category: 'sports-analytics',
    sports: ['cricket', 'pickleball', 'other'],
    customSport: 'Kalaripayattu',
    athleteCohortTier: 'state-academy',
    keywords: 'Telemetry, GPS',
    primaryAuthorName: 'Dr. Nair',
    primaryAuthorEmail: 'nair@example.edu.in',
    primaryAuthorAffiliation: 'LNIPE',
    orcid: '0000-0002-1234-5678',
    coAuthorsText: '',
    coAuthorsList: [
      { id: 'c1', name: 'Co Author', email: 'co@example.edu.in', affiliation: 'SAI', orcid: '' },
    ],
    abstract: 'A'.repeat(60),
    testingEnvironment: 'akhada-clay',
    testingApparatus: '60 Hz dual force plates',
    coachingCue1: 'Cue 1',
    coachingCue2: '',
    coachingCue3: '',
    fullTextOrUrl: 'https://zenodo.org/123',
    supplementaryUrl: 'https://github.com/org/repo',
    preregistrationUrl: 'https://osf.io/registries/kala26',
    dataAvailability: 'de_identified',
    ethicsClearanceNumber: 'IEC-2026-99',
    fundingStatement: 'Khelo India Grant 2026',
    conflictsDisclosure: 'None declared.',
    licenseType: 'cc-by-4.0',
    updatedAt: '10:00:00 AM',
  }

  const restored = deserializeDraft(serializeDraft(draft))
  assert.ok(restored)
  assert.equal(restored.currentStep, 4)
  assert.deepEqual(restored.sports, ['cricket', 'pickleball', 'other'])
  assert.equal(restored.customSport, 'Kalaripayattu')
  assert.equal(restored.athleteCohortTier, 'state-academy')
  assert.equal(restored.testingEnvironment, 'akhada-clay')
  assert.equal(restored.testingApparatus, '60 Hz dual force plates')
  assert.equal(restored.preregistrationUrl, 'https://osf.io/registries/kala26')
  assert.equal(restored.fundingStatement, 'Khelo India Grant 2026')
  assert.equal(restored.conflictsDisclosure, 'None declared.')
  assert.equal(restored.dataAvailability, 'de_identified')
  assert.equal(restored.licenseType, 'cc-by-4.0')
  assert.equal(restored.coAuthorsList?.length, 1)
  assert.equal(restored.coAuthorsList?.[0].name, 'Co Author')

  // Legacy single-sport saved draft automatically migrates to sports[]
  const legacyRestored = deserializeDraft(JSON.stringify({ currentStep: 2, sport: 'kabaddi' }))
  assert.ok(legacyRestored)
  assert.equal(legacyRestored.currentStep, 2)
  assert.deepEqual(legacyRestored.sports, ['kabaddi'])
})
