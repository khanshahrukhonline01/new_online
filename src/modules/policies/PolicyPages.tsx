import './policy-pages.css'

type PolicySection = { heading: string; paragraphs: string[]; bullets?: string[] }
type PolicyDocument = {
  eyebrow: string
  title: string
  summary: string
  status: 'Live-site content adapted' | 'Draft — owner/legal review required'
  updatedLabel: string
  sections: PolicySection[]
  contact?: { label: string; email: string }
  related?: { label: string; href: string }[]
}

const policies: Record<string, PolicyDocument> = {
  '/privacy': {
    eyebrow: 'POLICY & PRIVACY',
    title: 'Privacy Policy',
    summary: 'This draft explains privacy expectations for the KhelGrid platform project. It must be checked against the deployed site, hosting logs, Supabase configuration, analytics and advertising integrations before it is treated as the final notice.',
    status: 'Draft — owner/legal review required',
    updatedLabel: 'Effective date: publish only after review',
    sections: [
      { heading: '1. Information and platform activity', paragraphs: ['The platform provides public sports discovery pages and may request published catalogue records from a configured Supabase project. The current development app intentionally keeps login and account creation paused. Its “Suggest a listing” page opens an email draft in the visitor’s own email client; it does not itself submit or store a database record.', 'Information may also be processed by the website host and infrastructure providers in routine request, security and error logs. The exact log fields, retention periods and providers must be confirmed from the deployed configuration before publication.'] },
      { heading: '2. Purposes and sharing', paragraphs: ['Information should be used only to operate, secure, maintain and improve the service; respond to support, correction or rights requests; and meet applicable legal obligations. Information should not be sold to advertisers. Any external analytics, advertising, embedded media, AI provider or other processor must be documented before it is enabled and described accurately here.', 'The project has not confirmed an active account, payment, booking transaction, or live-score-provider workflow. This page does not represent those workflows as operational.'] },
      { heading: '3. Choices, access and deletion', paragraphs: ['For a request about personal information, identify the relevant page or record and describe the request without sending passwords, identity documents or unnecessary sensitive data. Requests can be sent to the privacy contact below. The response process and applicable rights depend on the actual processing, your location and applicable law.', 'A self-service account export or deletion workflow is not currently promised by this development project. Do not assume a message has been received or processed until the responsible team confirms it.'] },
      { heading: '4. Children and sensitive information', paragraphs: ['Do not submit identity documents, medical records, precise location history or other sensitive information unless a clearly explained feature requires it and appropriate safeguards are in place. Where minors use sports information, the service should minimize personal data and provide appropriate guardian and safeguarding guidance.'] },
      { heading: '5. Security and retention', paragraphs: ['Reasonable technical and organizational safeguards should protect information, but no internet service can guarantee absolute security. Retention periods must be set according to the purpose, legal obligations, provider configuration and operational needs; specific periods are not published here until verified.'] },
      { heading: '6. Changes and contact', paragraphs: ['This notice must be updated when actual data flows, processors or features change. This draft is not a substitute for checking the deployed application and obtaining legal review.'] }
    ],
    contact: { label: 'Privacy requests', email: 'privacy@khelgrid.com' },
    related: [{ label: 'Cookie Policy', href: '/cookies' }, { label: 'Terms of Use', href: '/terms' }, { label: 'Contact', href: '/contact' }]
  },
  '/terms': {
    eyebrow: 'POLICY & LEGAL',
    title: 'Terms of Use',
    summary: 'These draft terms describe safe use of KhelGrid’s sports discovery information. Final terms require review against the live services and applicable law.',
    status: 'Draft — owner/legal review required',
    updatedLabel: 'Effective date: publish only after review',
    sections: [
      { heading: '1. What KhelGrid provides', paragraphs: ['KhelGrid is intended to help visitors discover sports, opportunities, venues, coaches, academies and educational information. Listings may summarize information from third-party organisers and sources. A page or route being visible does not mean that a related service is active.', 'Unless a specific service is clearly activated and its terms are provided, do not treat the development platform as accepting bookings, processing payments, guaranteeing entry, providing live scores, or creating authenticated accounts.'] },
      { heading: '2. Accuracy and third-party organisers', paragraphs: ['Dates, eligibility, fees, locations, schedules and registration instructions can change. Check the linked official source and contact the organiser before travelling, sharing documents or paying money. A source or verification label is limited to the checks actually performed; it is not a promise of selection, event delivery or financial safety.', 'External websites and services are controlled by their respective operators and may have separate terms and privacy practices.'] },
      { heading: '3. Acceptable use', bullets: ['Do not impersonate an athlete, organiser or official; forge credentials; submit knowingly false information; harass or threaten others; or use the service to facilitate fraud.', 'Do not attempt unauthorized access, disrupt service, bypass security controls, scrape restricted data or collect personal information in violation of law or platform rules.', 'Do not upload content, photos, videos, marks or documents unless you have the necessary rights, permissions and consents.'], paragraphs: ['Features for account creation, community posting, athlete discovery, booking and payments remain subject to separate implementation and access controls.'] },
      { heading: '4. Intellectual property and submissions', paragraphs: ['Respect KhelGrid’s brand and original content as well as third-party rights. Content submitted to any future submission feature must be lawful and authorized. The scope of any licence for submitted content must be stated at the point of submission and must not be inferred from this draft.'] },
      { heading: '5. No professional or selection guarantee', paragraphs: ['General sports information is informational and does not replace advice from a qualified professional, official governing body or event organiser. KhelGrid does not guarantee trial selection, athletic outcomes, coach quality, venue availability or event continuation.'] },
      { heading: '6. Changes, suspension and contact', paragraphs: ['We may correct or remove inaccurate, expired, unsafe or infringing information. Final terms must define any applicable liability, dispute-resolution, governing-law and account provisions after legal review.'] }
    ],
    contact: { label: 'General contact', email: 'khelgrid@gmail.com' },
    related: [{ label: 'Privacy Policy', href: '/privacy' }, { label: 'IPR & Copyright', href: '/ipr-policy' }, { label: 'Correction Policy', href: '/correction-policy' }]
  },
  '/cookies': {
    eyebrow: 'POLICY & PRIVACY',
    title: 'Cookie Policy & Privacy Settings',
    summary: 'The current cookie and browser-storage inventory has not been independently verified. This page describes the standard to follow and does not claim that a consent manager is active.',
    status: 'Draft — owner/legal review required',
    updatedLabel: 'Effective date: publish only after technical audit',
    sections: [
      { heading: '1. What cookies and similar technologies do', paragraphs: ['Cookies, local storage, pixels and similar technologies can support essential site functions, remember preferences, measure usage or deliver advertising. Which technologies KhelGrid actually uses must be confirmed by inspecting the deployed site and its network requests.'] },
      { heading: '2. Current status', paragraphs: ['A completed cookie audit and working preference interface have not been confirmed for this development project. Do not claim that analytics, advertising cookies, social pixels or a consent manager are active—or inactive—until the deployed configuration has been checked.', 'If optional technologies requiring consent are added, they must not load before the required choice is obtained. The interface should allow visitors to reject optional categories, configure them where applicable, and later change or withdraw a choice.'] },
      { heading: '3. Managing your browser', paragraphs: ['Most browsers provide controls to block or delete cookies and site data. Blocking essential storage may affect site behaviour. Browser controls are not a substitute for a site-level preference tool where one is legally required.'] },
      { heading: '4. Audit and contact', paragraphs: ['Before this page is marked final, record each technology, purpose, provider, category, retention period, consent requirement and loading condition. Re-check after adding analytics, advertising, embeds or other third-party scripts.'] }
    ],
    contact: { label: 'Privacy requests', email: 'privacy@khelgrid.com' },
    related: [{ label: 'Privacy Policy', href: '/privacy' }, { label: 'Terms of Use', href: '/terms' }]
  },
  '/ipr-policy': {
    eyebrow: 'POLICY & COPYRIGHT',
    title: 'Intellectual Property Rights & Copyright Policy',
    summary: 'KhelGrid’s live website publishes an IPR and copyright policy covering its original materials, submitted media, third-party marks, scraping, synthetic media and notice-and-takedown requests. This project version preserves those topics while marking legal assertions and response commitments for review.',
    status: 'Draft — owner/legal review required',
    updatedLabel: 'Live-site source checked: October 2026; legal review pending',
    sections: [
      { heading: '1. KhelGrid materials', paragraphs: ['Original software, interface design, brand assets, original editorial work and other original materials may be protected by applicable intellectual-property laws. Do not copy, republish, reverse engineer, frame or commercially reuse protected materials without permission or another valid legal basis.'] },
      { heading: '2. User and third-party content', paragraphs: ['Contributors must have the rights and permissions needed to submit text, photographs, video, certificates and other media, including any necessary consent for identifiable people. Submission must not be interpreted as granting KhelGrid an unlimited licence; the actual licence must be shown in the relevant submission flow.', 'References to a third-party team, federation, league, event or trademark are not an endorsement or partnership unless an actual relationship is documented. Use only the material needed for a legitimate purpose and respect applicable rights and platform terms.'] },
      { heading: '3. Scraping and automated reuse', paragraphs: ['Do not bypass access controls, harvest personal information, or bulk-reuse protected content or database material without permission or a valid legal basis. Public accessibility alone does not grant a licence. Automated access must respect applicable law, source terms and technical restrictions.'] },
      { heading: '4. AI, synthetic media and credentials', paragraphs: ['Do not upload or distribute non-consensual deepfakes, impersonations, voice clones or synthetic likenesses. Do not forge trial certificates, age documents, federation letters or endorsements. Reports involving impersonation, non-consensual imagery or forged credentials should be prioritised for review.', 'The legal treatment of AI-generated works and text/data mining varies by jurisdiction and facts. This policy does not make a universal claim that every AI output is or is not copyrightable.'] },
      { heading: '5. Submit an infringement notice', paragraphs: ['Send a notice to the IPR contact below and include: (a) your name and authority to act; (b) identification of the work or mark; (c) the exact KhelGrid URL; (d) your contact details; (e) why you believe the use is not authorized; and (f) a good-faith statement that the information is accurate. Include supporting evidence where available.', 'We will review complete notices, may request clarification, and may restrict or remove material where appropriate. The live website states an expedited 36-hour target for valid notices; that target must be confirmed operationally before it is presented as a guaranteed service level or statutory deadline.'] },
      { heading: '6. Counter-notice and review', paragraphs: ['If material was removed and you believe the report was mistaken or you have authorization, contact the IPR address with the affected URL, explanation and supporting evidence. Applicable legal procedures and any formal counter-notice requirements should be reviewed by counsel before being represented as statutory process.'] },
      { heading: '7. Legal review', paragraphs: ['The live site references Indian copyright, trademark and information-technology law and international frameworks. Applicability, intermediary status, notice requirements, response timelines, remedies and jurisdiction require qualified legal review; this development copy is not legal advice.'] }
    ],
    contact: { label: 'IPR & copyright notices', email: 'ipr@khelgrid.com' },
    related: [{ label: 'Terms of Use', href: '/terms' }, { label: 'Editorial Policy', href: '/editorial-policy' }, { label: 'Correction Policy', href: '/correction-policy' }]
  },
  '/cancellation-policy': {
    eyebrow: 'POLICY & PURCHASES',
    title: 'Cancellation & Refund Policy',
    summary: 'The development platform does not currently confirm an active booking checkout or payment workflow. This page must not imply that KhelGrid has collected a fee or can issue a refund for a transaction it did not process.',
    status: 'Draft — owner/legal review required',
    updatedLabel: 'Effective date: only after any paid service is launched',
    sections: [
      { heading: '1. Current booking and payment status', paragraphs: ['This project currently provides venue discovery and does not represent the venue directory as a completed transactional booking service. A payment, cancellation, deposit, refund or membership entitlement must not be considered active unless a real, tested service explicitly offers it.'] },
      { heading: '2. Third-party transactions', paragraphs: ['If you registered for a trial, booked a venue or paid an organiser through an external website, contact that organiser or payment provider and follow the terms shown at the time of purchase. KhelGrid cannot promise to cancel or refund a transaction processed by another party.'] },
      { heading: '3. Future paid services', paragraphs: ['Before any KhelGrid-operated payment is launched, this policy must specify the covered service, cancellation window, refund eligibility, processing time, deductions if lawful, dispute contact, and treatment of cancelled or rescheduled events. The terms must match the checkout and actual backend behaviour.'] }
    ],
    contact: { label: 'General enquiries', email: 'khelgrid@gmail.com' },
    related: [{ label: 'Terms of Use', href: '/terms' }, { label: 'Venue directory', href: '/venues' }]
  },
  '/posh-policy': {
    eyebrow: 'SAFETY & SAFEGUARDING',
    title: 'Prevention of Sexual Harassment & Athlete Safeguarding',
    summary: 'The live website publishes a POSH and athlete-safeguarding policy. This project copy records the safety principles and published contact but does not assert that a particular Internal Committee, presiding officer or external member has been appointed; those facts require direct confirmation.',
    status: 'Draft — owner/legal review required',
    updatedLabel: 'Live-site source checked: October 2026; organisational details require confirmation',
    sections: [
      { heading: '1. Respectful and safe participation', paragraphs: ['Harassment, sexual exploitation, coercion, retaliation, intimidation and abuse are incompatible with a safe sporting environment. No one should be asked for sexual favours, unofficial payments or personal benefits in exchange for selection, playing time, coaching, scouting or sponsorship.'] },
      { heading: '2. Reporting and confidentiality', paragraphs: ['Reports should be handled sensitively, restricted to people who need the information, and assessed fairly. Do not publish the identity of a complainant, respondent, witness or minor. Avoid sending graphic details or sensitive documents to a general public channel unless the designated process instructs you to do so.'] },
      { heading: '3. Minors and urgent danger', paragraphs: ['Concerns involving a person under 18 require child-safeguarding care and referral to appropriate competent authorities where required by law. If anyone is in immediate danger, contact local emergency services or the appropriate child-protection authority. Do not rely on a website email as an emergency service.'] },
      { heading: '4. POSH applicability and formal process', paragraphs: ['The Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013 applies according to its statutory scope. The existence, membership and contact details of any Internal Committee, and any process for external affiliated venues or organisations, must be confirmed with the responsible organisation and qualified counsel before publication. This page does not establish that KhelGrid has an appointed committee.'] },
      { heading: '5. Published contact', paragraphs: ['The live KhelGrid policy publishes posh@khelgrid.com for confidential grievances. Confirm that this inbox is monitored, access-restricted and routed to an authorised responsible person before relying on it.'] }
    ],
    contact: { label: 'Published safeguarding contact (verify before use)', email: 'posh@khelgrid.com' },
    related: [{ label: 'Contact', href: '/contact' }, { label: 'Correction Policy', href: '/correction-policy' }]
  },
  '/editorial-policy': {
    eyebrow: 'EDITORIAL STANDARDS',
    title: 'Editorial & Source Policy',
    summary: 'KhelGrid’s editorial standard is to make sports information traceable, current where possible, and clear about what is confirmed versus uncertain.',
    status: 'Draft — owner/legal review required',
    updatedLabel: 'Effective date: publish after owner review',
    sections: [
      { heading: '1. Source selection', paragraphs: ['Prefer primary sources: official organisers, sports federations, government departments, schools/universities, venue operators and official event pages. Secondary reporting can help identify a lead but must not be described as official confirmation. Social posts may be used as leads only when permitted by platform terms; verify important details against a reliable source where possible.'] },
      { heading: '2. What a useful listing contains', paragraphs: ['Where available, record sport, organiser, location, dates, deadline, eligibility, fee, registration instructions, source URL, source publisher, last-checked date and status. Do not invent missing details. Clearly distinguish a source statement from KhelGrid’s own explanation.'] },
      { heading: '3. Status, freshness and corrections', paragraphs: ['Use clear statuses such as pending review, published, unverified, expired, cancelled or removed. Re-check time-sensitive details; pause or remove records that can no longer be responsibly confirmed. Corrections should be reviewed against evidence and recorded without exposing private reporter information.'] },
      { heading: '4. Originality and copyright', paragraphs: ['Summarise in original wording, link to original sources and use only images, logos, videos and documents that KhelGrid has permission or a valid legal basis to use. Do not reproduce entire articles or bypass access restrictions.'] },
      { heading: '5. Independence and transparency', paragraphs: ['Paid placement or sponsorship must not be presented as independent verification. Any material conflict, correction or uncertainty that could change an athlete’s decision should be made clear. Editorial material must not promise selection or guaranteed outcomes.'] }
    ],
    contact: { label: 'Editorial and correction requests', email: 'support@khelgrid.com' },
    related: [{ label: 'Verification Policy', href: '/verification-policy' }, { label: 'Correction Policy', href: '/correction-policy' }, { label: 'IPR & Copyright', href: '/ipr-policy' }]
  },
  '/verification-policy': {
    eyebrow: 'TRUST & SAFETY',
    title: 'Verification Policy',
    summary: 'The live Trust Center explains source checks, organiser context, listing review and corrections. A verification label must describe the checks actually completed and must never be treated as a selection guarantee.',
    status: 'Live-site content adapted',
    updatedLabel: 'Live-site source checked: October 2026',
    sections: [
      { heading: '1. Source check', paragraphs: ['Where possible, review the organiser’s official website, federation notice, academy channel or registration page. Record the source used and when it was checked. If only a secondary report or social post is available, disclose that limitation rather than presenting it as official confirmation.'] },
      { heading: '2. Organiser context', paragraphs: ['Separate organiser-provided information from KhelGrid editorial notes. A “verified” label should identify the scope of the check—such as source or contact confirmation—and the date or evidence behind it. Do not imply that every detail or every listing has been independently verified unless the review record supports that claim.'] },
      { heading: '3. Listing review', paragraphs: ['Review visible basics when available: sport, organiser, date, venue, eligibility, fees and registration instructions. Missing or contradictory details should be marked uncertain, referred for clarification, or withheld from publication when the risk warrants it.'] },
      { heading: '4. What verification does not mean', paragraphs: ['A label is not a promise that an event will occur as planned, that a venue is safe or available, that a coach is suitable, that a fee is refundable, or that an athlete will be selected. Confirm the latest official notice and never pay for a guaranteed-selection promise.'] },
      { heading: '5. Updates and reports', paragraphs: ['When a date changes, an event expires or a report is received, review the available evidence and update, annotate, pause or remove the listing as appropriate. The process should retain an audit trail while limiting access to private reporter information.'] }
    ],
    contact: { label: 'Verification and safety reports', email: 'support@khelgrid.com' },
    related: [{ label: 'Trust Center', href: '/trust-center' }, { label: 'How to check a trial', href: '/verify' }, { label: 'Correction Policy', href: '/correction-policy' }]
  },
  '/correction-policy': {
    eyebrow: 'TRUST & SAFETY',
    title: 'Correction Policy',
    summary: 'KhelGrid welcomes reports from athletes, parents, organisers and coaches so sports information can be corrected without hiding uncertainty.',
    status: 'Live-site content adapted',
    updatedLabel: 'Live-site source checked: October 2026',
    sections: [
      { heading: '1. Send enough detail to find the listing', paragraphs: ['Email the page URL or opportunity title, what appears incorrect, when you noticed it, and a source or screenshot that supports the correction. Avoid sending unnecessary personal or sensitive information.'] },
      { heading: '2. Review the report', paragraphs: ['Compare the report with the source on record and, where practical, contact the organiser or check a current official notice. A report is not automatically treated as fact until reviewed.'] },
      { heading: '3. Update, annotate or remove', paragraphs: ['Correct clear errors, add context where information is disputed or incomplete, and remove or mark listings that can no longer be responsibly confirmed. A change may update a visible detail, add a correction note, change source status, pause a listing or remove it.'] },
      { heading: '4. Prioritise safety reports', paragraphs: ['Reports about fraud, guaranteed-selection claims, unsafe travel instructions, impersonation or requests for unofficial payments should be prioritised for review. Copyright, privacy and safeguarding reports should be directed to the appropriate contact where available.'] },
      { heading: '5. Reporter privacy and limitations', paragraphs: ['Private reporter information should not be published without permission. If a correction affects a safety or payment decision, users should still confirm the latest position directly with the organiser. Do not assume a response deadline unless one is explicitly confirmed by KhelGrid.'] }
    ],
    contact: { label: 'Corrections and suspicious listings', email: 'support@khelgrid.com' },
    related: [{ label: 'Verification Policy', href: '/verification-policy' }, { label: 'IPR & Copyright', href: '/ipr-policy' }, { label: 'Contact', href: '/contact' }]
  },
  '/trust-center': {
    eyebrow: 'TRUST & SAFETY',
    title: 'Trust Center',
    summary: 'A practical guide to how source checks, organiser context, listing review and corrections should work on KhelGrid.',
    status: 'Live-site content adapted',
    updatedLabel: 'Live-site source checked: October 2026',
    sections: [
      { heading: '1. Source check', paragraphs: ['Look for an official organiser website, federation notice, academy channel or registration page and record the source used for a listing.'] },
      { heading: '2. Organiser context', paragraphs: ['Distinguish organiser-provided information from editorial notes. A verification label describes the information checked; it is not a guarantee of selection or event delivery.'] },
      { heading: '3. Listing review', paragraphs: ['Check the visible basics—sport, city, date, venue, eligibility, fee and registration instructions—when those details are available. Missing information should remain missing or be labelled uncertain rather than guessed.'] },
      { heading: '4. Updates and corrections', paragraphs: ['If a date changes, an event expires or a report is received, review the source and update, annotate, pause or remove the listing where appropriate.'] },
      { heading: '5. Protect yourself', bullets: ['Confirm the latest notice with the official organiser before travelling or paying.', 'Keep receipts and copies of registration terms.', 'Do not pay for a promise of guaranteed selection.', 'Report suspicious listings and impersonation.'], paragraphs: ['These checks reduce uncertainty but cannot guarantee that an organiser or event is risk-free.'] }
    ],
    contact: { label: 'Trust and corrections', email: 'support@khelgrid.com' },
    related: [{ label: 'Verification Policy', href: '/verification-policy' }, { label: 'How to check a trial', href: '/verify' }, { label: 'Correction Policy', href: '/correction-policy' }]
  },
  '/verify': {
    eyebrow: 'ATHLETE SAFETY',
    title: 'How to Check a Sports Trial or Academy',
    summary: 'A practical checklist based on the live KhelGrid verification guidance. Use it before sending documents, travelling or paying a fee.',
    status: 'Live-site content adapted',
    updatedLabel: 'Live-site source checked: October 2026',
    sections: [
      { heading: '1. Confirm the organiser', paragraphs: [], bullets: ['Find the event on an official federation, government, school/university, club or academy channel.', 'Contact the organiser using a number or email published on its official website, not only a number forwarded in a message.', 'Ask for written eligibility, age criteria, dates, venue, required documents and fee terms.'] },
      { heading: '2. Review the academy or venue', paragraphs: [], bullets: ['Ask to observe a session before paying where practical.', 'Request a written fee structure separating coaching, boarding, kit and travel.', 'Ask for named coach qualifications and a competition calendar relevant to your age group.', 'Check safeguarding arrangements and who is responsible for minors.'] },
      { heading: '3. Be alert to red flags', paragraphs: [], bullets: ['Guaranteed selection in exchange for money.', 'Pressure to pay immediately through a personal account or unofficial agent.', 'Requests for unnecessary identity documents or sensitive information.', 'Unclear venue, changing dates, no official notice, or refusal to provide written terms.'] },
      { heading: '4. What KhelGrid verification means', paragraphs: ['A verification label should describe checks on the source, organiser context and visible listing details. It is not a prediction of selection, a guarantee that an event will occur, or a promise that payment is risk-free. An unverified listing is not automatically fake; it means you should assess the evidence carefully.'] },
      { heading: '5. Report a concern', paragraphs: ['Send the listing link, concern and supporting source or screenshot. For suspected fraud, unsafe instructions, impersonation or unofficial payment demands, contact the support address below. If someone is in immediate danger, contact local emergency services.'] }
    ],
    contact: { label: 'Report a suspicious listing', email: 'support@khelgrid.com' },
    related: [{ label: 'Trust Center', href: '/trust-center' }, { label: 'Verification Policy', href: '/verification-policy' }, { label: 'Correction Policy', href: '/correction-policy' }]
  }
}

export default function PolicyPages({ path }: { path: string }) {
  const policy = policies[path]
  if (!policy) return null

  return <article className="policy-page content-page">
    <p className="eyebrow">{policy.eyebrow}</p>
    <h1>{policy.title}</h1>
    <p className="page-intro">{policy.summary}</p>
    <div className="policy-meta">
      <span className={policy.status === 'Live-site content adapted' ? 'policy-status policy-status-live' : 'policy-status'}>{policy.status}</span>
      <span>{policy.updatedLabel}</span>
    </div>
    {policy.status !== 'Live-site content adapted' ? <aside className="policy-review-note"><strong>Review notice</strong><p>This page is a responsible draft for the development project, not a representation that legal counsel has approved it or that every described process is operational. Confirm facts, contacts, data flows and applicability before publishing it as final policy.</p></aside> : null}
    <div className="policy-sections">
      {policy.sections.map(section => <section className="policy-section" key={section.heading}>
        <h2>{section.heading}</h2>
        {section.paragraphs?.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
        {section.bullets ? <ul>{section.bullets.map(item => <li key={item}>{item}</li>)}</ul> : null}
      </section>)}
    </div>
    {policy.contact ? <section className="policy-contact"><h2>{policy.contact.label}</h2><a href={`mailto:${policy.contact.email}`}>{policy.contact.email}</a><p>Before sending sensitive information, verify that this contact is current and appropriate for your request.</p></section> : null}
    {policy.related?.length ? <nav className="policy-related" aria-label="Related policy pages"><h2>Related pages</h2><div>{policy.related.map(link => <a key={link.href} href={link.href}>{link.label}<span aria-hidden="true"> ↗</span></a>)}</div></nav> : null}
    <p className="policy-back-link"><a href="/contact">Contact KhelGrid</a> · <a href="/">Return home</a></p>
  </article>
}
