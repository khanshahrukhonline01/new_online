import { describe, expect, it } from 'vitest'
import { generateQrMatrix, generateQrSvgString } from './qrCodeGenerator'

describe('QR Code Generator (Zero-Dependency Athlete Identity)', () => {
  it('generates a valid square matrix with finder patterns at three corners', () => {
    const matrix = generateQrMatrix('https://khelgrid.com/u/@rohit-verma')
    expect(matrix.length).toBeGreaterThanOrEqual(21)
    expect(matrix[0].length).toBe(matrix.length)

    // Check top-left finder pattern 7x7 outer square
    expect(matrix[0][0]).toBe(true)
    expect(matrix[0][6]).toBe(true)
    expect(matrix[6][0]).toBe(true)
    expect(matrix[6][6]).toBe(true)

    // Center of top-left finder pattern (3,3) is black
    expect(matrix[3][3]).toBe(true)
  })

  it('generates clean SVG markup with configurable color and dimensions', () => {
    const svg = generateQrSvgString('https://khelgrid.com/u/@priya-nair', {
      size: 180,
      color: '#10b981',
      bgColor: '#ffffff',
    })

    expect(svg).toContain('<svg')
    expect(svg).toContain('width="180"')
    expect(svg).toContain('height="180"')
    expect(svg).toContain('fill="#10b981"')
    expect(svg).toContain('fill="#ffffff"')
    expect(svg).toContain('</svg>')
  })
})
