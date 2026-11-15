import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { DirectoryCallout } from './DirectoryCallout'

describe('DirectoryCallout component', () => {
  it('renders coach registration variant with minimal words and correct tag', () => {
    const html = renderToStaticMarkup(
      <DirectoryCallout
        variant="coach"
        tag="Free Listing"
        title="Coaching in India? Get Listed Free"
        description="Create your verified coach profile & connect with athletes across India."
        buttonLabel="Join as Coach"
        buttonHref="mailto:khelgrid@gmail.com?subject=Register%20as%20a%20coach%20on%20KhelGrid"
      />
    )
    expect(html).toContain('directory-callout-coach')
    expect(html).toContain('Free Listing')
    expect(html).toContain('Coaching in India? Get Listed Free')
    expect(html).toContain('Join as Coach')
    expect(html).toContain('mailto:khelgrid@gmail.com')
  })

  it('renders venue variant with 0% Commission badge', () => {
    const html = renderToStaticMarkup(
      <DirectoryCallout
        variant="venue"
        tag="0% Commission"
        title="Manage a sports facility? List with 0% Fee"
        description="Showcase your courts, turfs, and grounds to athletes across India."
        buttonLabel="List your venue"
        buttonHref="mailto:khelgrid@gmail.com?subject=List%20a%20sports%20venue%20on%20KhelGrid"
      />
    )
    expect(html).toContain('directory-callout-venue')
    expect(html).toContain('0% Commission')
    expect(html).toContain('Manage a sports facility? List with 0% Fee')
    expect(html).toContain('List your venue')
  })

  it('renders opportunity variant with Free Post badge', () => {
    const html = renderToStaticMarkup(
      <DirectoryCallout
        variant="opportunity"
        tag="Free Post"
        title="Organising a sports trial? Post for Free"
        description="Broadcast trial dates, age criteria, and circulars across 50+ cities."
        buttonLabel="Submit a trial"
        buttonHref="mailto:khelgrid@gmail.com?subject=Submit%20a%20sports%20trial%20or%20opportunity"
      />
    )
    expect(html).toContain('directory-callout-opportunity')
    expect(html).toContain('Free Post')
    expect(html).toContain('Organising a sports trial? Post for Free')
    expect(html).toContain('Submit a trial')
  })

  it('renders KhelChronicle research variant with Diamond Open Access badge', () => {
    const html = renderToStaticMarkup(
      <DirectoryCallout
        variant="chronicle"
        tag="Diamond Open Access"
        title="Sports Science Research · Zero APC"
        description="Publish preprints with zero submission fees, CC BY licensing, and permanent citation indexing."
        buttonLabel="Submit Paper"
        buttonHref="/khelchronicle/submit"
      />
    )
    expect(html).toContain('directory-callout-chronicle')
    expect(html).toContain('Diamond Open Access')
    expect(html).toContain('Sports Science Research · Zero APC')
    expect(html).toContain('Submit Paper')
    expect(html).toContain('href="/khelchronicle/submit"')
  })
})
