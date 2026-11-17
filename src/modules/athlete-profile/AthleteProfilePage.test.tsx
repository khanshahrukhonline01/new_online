import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import AthleteProfilePage from './AthleteProfilePage'

// Conflict resolution: preserve the fail-closed public-profile privacy tests.
describe('AthleteProfilePage public privacy boundary', () => {
  it.each(['rohit-verma', 'priya-nair', 'arjun-singh', 'unknown-ghost-athlete-123'])(
    'does not render showcase or browser-local athlete data for %s',
    username => {
      const html = renderToStaticMarkup(<AthleteProfilePage username={username} />)
      expect(html).toContain('Loading athlete profile')
      expect(html).not.toContain('Rohit Verma')
      expect(html).not.toContain('Priya Nair')
      expect(html).not.toContain('Verified Sports CV')
      expect(html).not.toContain('135.2 km/h')
    },
  )
})
