import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('Khelgrid starter shell', () => {
  it('clearly labels disconnected live feeds', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
    expect(source).toContain('live feeds and account services are not connected yet')
  })
  it('does not claim a live feed is connected', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
    expect(source).not.toContain('Live feed connected')
  })
})
