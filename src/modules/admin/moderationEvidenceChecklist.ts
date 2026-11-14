import type { ListingEvidenceItem } from '../../integrations/supabase/public-client'

const categoryEvidenceChecklist: Record<string, Array<{ type: string; label: string }>> = {
  venue: [{ type: 'venue_address', label: 'Confirm the venue exists at the submitted street/locality address' }, { type: 'official_source', label: 'Check an official venue or operator source where available' }, { type: 'other', label: 'Review current facility/court evidence and image rights' }],
  coach: [{ type: 'organizer_identity', label: 'Confirm the coach identity and contact independently' }, { type: 'coach_qualification', label: 'Verify each qualification or certification claim' }, { type: 'official_source', label: 'Check federation, employer or official profile claims where available' }],
  academy: [{ type: 'academy_identity', label: 'Confirm the academy identity and operating location' }, { type: 'venue_address', label: 'Confirm the actual training location, not just a city name' }, { type: 'official_source', label: 'Check programme, affiliation and operator claims where available' }],
  opportunity: [{ type: 'official_source', label: 'Confirm the trial/opportunity from the organiser or official notice' }, { type: 'organizer_identity', label: 'Independently confirm the organiser and contact channel' }, { type: 'event_details', label: 'Verify dates, venue, eligibility and any disclosed fee' }],
  trial: [{ type: 'official_source', label: 'Confirm the trial from the organiser or official notice' }, { type: 'organizer_identity', label: 'Independently confirm the organiser and contact channel' }, { type: 'event_details', label: 'Verify dates, venue, eligibility and any disclosed fee' }],
  event: [{ type: 'organizer_identity', label: 'Confirm the event organiser' }, { type: 'event_details', label: 'Verify the event schedule and actual venue' }, { type: 'official_source', label: 'Check the official event announcement where available' }],
  pickup_game: [{ type: 'organizer_identity', label: 'Confirm the host identity and control of the game' }, { type: 'venue_address', label: 'Confirm the actual playing venue and location' }, { type: 'event_details', label: 'Verify date, time, sport and participation details' }],
}
export function getEvidenceChecklist(listingType: string, evidence: ListingEvidenceItem[]) {
  const requirements = categoryEvidenceChecklist[listingType.toLowerCase()] || [{ type: 'official_source', label: 'Check an official source for the submitted claims' }]
  return requirements.map(requirement => {
    const matching = evidence.filter(item => item.evidence_type === requirement.type)
    const supported = matching.some(item => item.outcome === 'supports')
    const contradicted = matching.some(item => item.outcome === 'contradicts')
    const pending = matching.some(item => item.outcome === 'pending')
    return { ...requirement, status: contradicted ? 'contradicted' : supported ? 'supported' : pending ? 'pending' : 'missing' }
  })
}
