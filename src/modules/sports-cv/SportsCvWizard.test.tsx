import { describe, expect, it, beforeEach, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SportsCvWizard from './SportsCvWizard'
import { computeFitnessTier } from '../../shared/utils/khelId'

describe('SportsCvWizard — 4 Pillars: Digital Khel ID, Combine Benchmarks & Trial Dossier', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Pillar 2: computeFitnessTier (Combine Metrics Algorithm)', () => {
    it('accurately computes Tier 1 National Candidate for elite combine benchmarks', () => {
      const result = computeFitnessTier({
        yoyoIr1Meters: 2000,
        sprint30mSeconds: 3.95,
        cmjHeightCm: 58,
      })

      expect(result.percentileAvg).toBeGreaterThanOrEqual(88)
      expect(result.tier).toBe('Tier 1 — Elite National Candidate')
    })

    it('computes Tier 2 for state level candidate with moderate benchmarks', () => {
      const result = computeFitnessTier({
        yoyoIr1Meters: 1640,
        sprint30mSeconds: 4.22,
        cmjHeightCm: 48,
      })

      expect(result.percentileAvg).toBeGreaterThanOrEqual(70)
      expect(result.tier).toContain('Tier 2')
    })

    it('handles empty or partial benchmarks gracefully without NaN', () => {
      const result = computeFitnessTier({})
      expect(result.percentileAvg).toBe(80)
      expect(result.tier).toBe('Tier 2 — State / Zonal High Performance')
    })
  })

  describe('Pillar 1, 2 & 3: Component Rendering & Selection Trial Dossier', () => {
    it('renders hero eyebrow and page title with Digital Khel ID branding', () => {
      const html = renderToStaticMarkup(<SportsCvWizard />)

      expect(html).toContain('DIGITAL KHEL ID (खेल आईडी)')
      expect(html).toContain('Build your sports CV, digital Khel ID &amp; Player Card.')
    })

    it('renders Section 1 with Federation UID, School/College, and Blood Group fields', () => {
      const html = renderToStaticMarkup(<SportsCvWizard />)

      expect(html).toContain('1. Athlete Identity &amp; Federation Registration')
      expect(html).toContain('Federation / Board UID (Optional)')
      expect(html).toContain('School / College / University')
      expect(html).toContain('Blood Group')
      expect(html).toContain('O+ (Universal Donor)')
      expect(html).toContain('Parent / Guardian Emergency Contact (Mandatory for Minors under 18)')
      expect(html).toContain('Relationship')
      expect(html).toContain('Emergency Phone Number')
    })

    it('renders Section 3 Physical Fitness & Combine Benchmarks with Yo-Yo IR1 and CMJ inputs', () => {
      const html = renderToStaticMarkup(<SportsCvWizard />)

      expect(html).toContain('3. Physical Fitness &amp; Combine Benchmarks')
      expect(html).toContain('Yo-Yo IR1 Test Distance (meters)')
      expect(html).toContain('30m Sprint Acceleration (seconds)')
      expect(html).toContain('Countermovement Jump — CMJ (cm)')
      expect(html).toContain('Combine Readiness Tier:')
      expect(html).toContain('National Percentile:')
    })

    it('renders Section 4 and 5 for video clips and competition achievements', () => {
      const html = renderToStaticMarkup(<SportsCvWizard />)

      expect(html).toContain('4. Video Clips &amp; Technique Telemetry')
      expect(html).toContain('5. Competition Achievements &amp; Medals')
      expect(html).toContain('Add Video Clip Attachment')
      expect(html).toContain('+ Add Achievement')
    })

    it('renders Live FIFA Trading Card Preview with scannable QR and instant download buttons', () => {
      const html = renderToStaticMarkup(<SportsCvWizard />)

      expect(html).toContain('FIFA-STYLE ATHLETE TRADING CARD')
      expect(html).toContain('Your KhelGrid Player Card')
      expect(html).toContain('Download Card (PNG)')
      expect(html).toContain('Download (SVG)')
      expect(html).toContain('WhatsApp Card')
      expect(html).toContain('Copy Link')
    })

    it('renders Pillar 3 Professional One-Page Selection Trial Dossier layout', () => {
      const html = renderToStaticMarkup(<SportsCvWizard />)

      // Official dossier header with Digital Khel ID
      expect(html).toContain('KHELGRID · OFFICIAL SELECTION TRIAL DOSSIER')
      expect(html).toContain('DIGITAL KHEL ID:')
      expect(html).toContain('KG-2026-')
      expect(html).toContain('dossier-qr-frame')
      expect(html).toContain('Scan for Video Proof')

      // Tables
      expect(html).toContain('1. Physical &amp; Biometric Profile')
      expect(html).toContain('2. Affiliations &amp; Federation Credentials')
      expect(html).toContain('3. Physical Fitness Combine Benchmarks (SAI Protocol)')
      expect(html).toContain('4. Competition Achievements &amp; Medal Ledger')

      // Candidate Statutory Declaration & Selector Endorsement Sign-off
      expect(html).toContain('Candidate Statutory Declaration')
      expect(html).toContain('Selection Trial Observer &amp; Scout Sign-Off')
      expect(html).toContain('Chief Selector / Verifier:')
      expect(html).toContain('Designation / Federation:')
      expect(html).toContain('OFFICIAL STAMP / SEAL')
      expect(html).toContain('Selector / Scrutinizer Signature')
    })
  })
})
