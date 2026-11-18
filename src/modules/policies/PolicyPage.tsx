import type { MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import './policy-page.css'

type PolicySection = { title: string; paragraphs: string[]; bullets?: string[] }
type Policy = { title: string; eyebrow: string; summary: string; status: string; reviewed: string; sections: PolicySection[] }

const sharedContact = 'For privacy requests, listing corrections, or general compliance inquiries, contact our grievance desk at khelgrid@gmail.com. For intellectual-property notices, email ipr@khelgrid.com with the specific URL, material concerned, evidence of rights ownership, and contact information.'

const policies: Record<string, Policy> = {
  '/privacy': {
    title: 'Privacy Policy',
    eyebrow: 'PRIVACY & DATA PROTECTION',
    summary: 'This Privacy Policy explains how KhelGrid collects, uses, shares, and protects information across our sports discovery platform, directories, tools, and research archive in compliance with India’s Digital Personal Data Protection Act, 2023 (DPDP Act) and international data protection standards.',
    status: 'Official Published Policy · In Effect',
    reviewed: '2026-11-17',
    sections: [
      {
        title: '1. Information We Collect',
        paragraphs: [
          'KhelGrid operates an open sports discovery platform connecting athletes, parents, coaches, academies, and venue hosts. When you browse our platform, submit a listing, build a Sports CV, or register for updates, we may collect the following categories of information:',
        ],
        bullets: [
          'Technical and Usage Data: IP addresses, browser type, device identifiers, operating system, referring URLs, pages visited, and timestamps automatically collected via server logs to ensure platform security and optimize user experience.',
          'User-Provided Information: Name, email address, sporting discipline, athletic achievements, location, and communication preferences when you contact us, submit a listing concierge request, or create a Sports CV.',
          'Listing and Directory Data: Publicly available or partner-submitted sports venue addresses, turf amenities, academy contact persons, coaching credentials, and selection trial schedules.',
        ],
      },
      {
        title: '2. Purpose and Lawful Basis for Processing',
        paragraphs: [
          'In accordance with the DPDP Act 2023 and applicable privacy laws, we process personal data only for specified, transparent, and lawful purposes:',
          'To provide, maintain, and improve our sports discovery services, venue directories, selection trial notifications, and athlete profile tools.',
          'To verify the authenticity of sports facilities, coach credentials, and selection trials against official sports federations, protecting athletes from fraud.',
          'To respond to inquiries, listing requests, and grievance reports submitted to khelgrid@gmail.com.',
          'To prevent fraudulent activity, unauthorized commercial spam, security breaches, and illegal pay-to-play trial scams.',
        ],
      },
      {
        title: '3. Cookies, Web Beacons & Third-Party Advertising',
        paragraphs: [
          'KhelGrid uses cookies and similar storage technologies to maintain user preferences, ensure site security, and analyze platform traffic. Third-party vendors, including Google, use cookies to serve ads based on a user’s prior visits to KhelGrid or other websites.',
          'Google’s use of advertising cookies enables it and its partners to serve ads to our visitors based on their visit to our site and/or other sites on the Internet. Visitors may opt out of personalized advertising by visiting Google Ad Settings (https://adssettings.google.com) or aboutads.info.',
        ],
        bullets: [
          'Essential Cookies: Necessary for fundamental navigation, color theme preferences, and security.',
          'Analytical Cookies: Help us understand which sports directories and tools are most useful to grassroots athletes.',
          'Advertising Cookies: Employed by authorized advertising networks to serve relevant, non-intrusive sponsorships supporting our free grassroots mission.',
        ],
      },
      {
        title: '4. Data Sharing and Third-Party Disclosures',
        paragraphs: [
          'KhelGrid does not sell, rent, or trade your personal information to third parties. We share data only in the following strictly limited circumstances:',
          'Service Providers: With trusted cloud infrastructure (Supabase, Vercel), content delivery networks, and email dispatchers operating under strict data processing agreements.',
          'Legal Requirements: When required by applicable Indian law, court order, or governmental authority to investigate fraud, criminal conduct, or public safety violations.',
        ],
      },
      {
        title: '5. Child & Minor Athlete Safeguarding (POCSO Alignment)',
        paragraphs: [
          'Protecting children and adolescent athletes is core to KhelGrid. In compliance with the Protection of Children from Sexual Offences (POCSO) Act 2012 and DPDP Act provisions regarding children’s data:',
          'We do not knowingly collect or publicly publish private personal identifiers (such as phone numbers, residential addresses, or school IDs) of athletes under 18 years of age without explicit parental or legal guardian consent.',
          'Parents and guardians have the right at any time to review, modify, or request the deletion of their child’s profile, photos, or listing details by emailing khelgrid@gmail.com.',
        ],
      },
      {
        title: '6. Your Rights and Grievance Redressal',
        paragraphs: [
          'Under the DPDP Act 2023, you have the right to access, correct, complete, update, and request the erasure of your personal data stored on KhelGrid. You also have the right to withdraw previously given consent.',
          'To exercise any of these rights, contact our Data Protection and Grievance Officer at khelgrid@gmail.com. We acknowledge requests within 24 hours and resolve them within 30 days as prescribed by law.',
          sharedContact,
        ],
      },
    ],
  },

  '/terms': {
    title: 'Terms of Use',
    eyebrow: 'TERMS & ACCEPTABLE USE',
    summary: 'These Terms of Use govern your access to and use of KhelGrid’s sports platform, directories, tools, research archives, and services. By accessing or using KhelGrid, you agree to be bound by these Terms.',
    status: 'Official Published Policy · In Effect',
    reviewed: '2026-11-17',
    sections: [
      {
        title: '1. Acceptance of Terms & Eligibility',
        paragraphs: [
          'By accessing, browsing, or using KhelGrid (https://khelgrid.com), you acknowledge that you have read, understood, and agreed to be legally bound by these Terms of Use and our Privacy Policy. If you do not agree to these terms, you must refrain from using the platform.',
          'You must be at least 18 years of age or have the consent and supervision of a parent or legal guardian to create a profile or submit listing requests on KhelGrid.',
        ],
      },
      {
        title: '2. Permitted Use & Community Conduct',
        paragraphs: [
          'KhelGrid provides open digital infrastructure to discover sports venues, tournaments, selection trials, coaches, academies, and sports science research. You agree to use the platform only for lawful, non-commercial, or authorized commercial sporting activities.',
        ],
        bullets: [
          'Do not submit false, fraudulent, defamatory, or misleading information regarding selection trials, tournament dates, academy fees, or coaching credentials.',
          'Do not solicit unauthorized fees, bribes, or guaranteed-selection payments from young athletes or their parents.',
          'Do not use automated scraping, crawlers, or data extraction scripts that impair the availability, speed, or performance of our platform.',
          'Do not harass, intimidate, exploit, or infringe upon the rights, privacy, or safety of any athlete, coach, or venue operator.',
        ],
      },
      {
        title: '3. Listings, Sourcing & Third-Party Information',
        paragraphs: [
          'KhelGrid aggregates and indexes information regarding sports trials, competitions, academies, and venues from primary official sources, federation circulars, and direct partner submissions.',
          'While KhelGrid enforces stringent editorial and anti-fraud verification, dates, eligibility criteria, admission fees, and court availability can change at the discretion of organizers. Users are strongly advised to independently verify critical details directly with the official organizing body prior to traveling, enrolling, or making payments.',
        ],
      },
      {
        title: '4. Intellectual Property & Fair Use',
        paragraphs: [
          'All KhelGrid brand marks, user interfaces, proprietary databases, and analytical tools are the intellectual property of KhelGrid and protected under Indian and international copyright and trademark laws.',
          'Sports names, federation acronyms (BCCI, AIFF, SAI, BAI), team marks, and public match scores are referenced strictly under nominative fair use to inform sports participants. Academic manuscripts deposited in KhelChronicle are published under Creative Commons CC BY 4.0 licenses.',
        ],
      },
      {
        title: '5. Limitation of Liability & Disclaimers',
        paragraphs: [
          'KhelGrid provides discovery and educational services on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. KhelGrid does not guarantee selection for any team, trial outcome, athletic performance, or injury-free participation at any listed facility.',
          'To the fullest extent permitted by law, KhelGrid and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from the use of or inability to use the platform.',
        ],
      },
      {
        title: '6. Governing Law & Dispute Resolution',
        paragraphs: [
          'These Terms of Use shall be governed by and construed in accordance with the laws of India. Any legal action or proceeding arising under these Terms shall be subject to the exclusive jurisdiction of the competent courts in India.',
          sharedContact,
        ],
      },
    ],
  },

  '/cookies': {
    title: 'Cookie & Device Storage Policy',
    eyebrow: 'COOKIES & DEVICE STORAGE',
    summary: 'This policy explains how KhelGrid uses cookies, local storage, and similar technologies to ensure seamless navigation, remember preferences, and analyze platform usage.',
    status: 'Official Published Policy · In Effect',
    reviewed: '2026-11-17',
    sections: [
      {
        title: '1. What Are Cookies and Device Storage?',
        paragraphs: [
          'Cookies are small text files placed on your computer or mobile device when you visit a website. Device storage (such as LocalStorage and SessionStorage) allows web applications to store lightweight preferences locally in your browser to enhance performance.',
        ],
      },
      {
        title: '2. How KhelGrid Uses These Technologies',
        paragraphs: [
          'KhelGrid uses cookies and browser storage strictly to deliver a responsive, personalized sporting experience:',
        ],
        bullets: [
          'Essential & Security Storage: Remembers your interface theme (Dark / Light, Green / Blue / Orange color accents), reduced-motion choices, and language preference.',
          'Directory Search State: Caches your recently selected sports city or sport filter so you do not lose your place while exploring venues and trials.',
          'Analytics & Performance: Helps us understand aggregated visitor patterns (e.g., most popular sports categories in specific cities) to prioritize new verified listings.',
          'Advertising Partners: Third-party ad networks (such as Google AdSense) place cookies to deliver relevant advertising and prevent repetitive ad impressions.',
        ],
      },
      {
        title: '3. Managing and Opting Out of Cookies',
        paragraphs: [
          'You can manage or disable cookies through your browser settings (Chrome, Firefox, Safari, Edge). Please note that disabling essential cookies may impact certain interface preferences such as dark mode or filter persistence.',
          'To opt out of interest-based advertising by Google and other third-party vendors, visit https://adssettings.google.com or the Network Advertising Initiative opt-out page at http://optout.networkadvertising.org.',
          sharedContact,
        ],
      },
    ],
  },

  '/ipr-policy': {
    title: 'IPR & Copyright Policy',
    eyebrow: 'INTELLECTUAL PROPERTY & FAIR USE',
    summary: 'KhelGrid respects intellectual property rights, trademarks, and copyright while linking grassroots athletes to official sports opportunities, tournaments, and open scientific research.',
    status: 'Official Published Policy · In Effect',
    reviewed: '2026-11-17',
    sections: [
      {
        title: '1. Respect for Original Sources and Authorship',
        paragraphs: [
          'KhelGrid adheres to high standards of copyright compliance. We do not copy, reproduce, or syndicate copyrighted event brochures, match broadcasts, or proprietary training materials without explicit permission or valid legal basis.',
          'Our platform provides original editorial summaries, contextual guides, and direct hyperlink citations pointing users back to official organizers, federations, and publishers.',
        ],
      },
      {
        title: '2. Live Sports Scores & Nominative Fair Use',
        paragraphs: [
          'Factual match scores, wickets, overs, match schedules, and public statistics are reported as factual current affairs in accordance with Section 52(1)(a)(iii) of the Indian Copyright Act, 1957.',
          'Federation names (e.g. BCCI, SAI, AIFF, BAI), league trademarks (IPL, ISL, PKL), and sport marks are referenced strictly in a nominative capacity to identify competitions and direct users to authorized sources under Section 30 of the Trade Marks Act, 1999. KhelGrid is an independent platform and does not claim commercial sponsorship or official endorsement unless explicitly documented.',
        ],
      },
      {
        title: '3. Notice and Takedown Procedure',
        paragraphs: [
          'If you believe that any material on KhelGrid infringes upon your copyright or trademark, please submit a written takedown notice to our designated intellectual property desk at ipr@khelgrid.com.',
        ],
        bullets: [
          'Identify the copyrighted work or trademark claimed to have been infringed.',
          'Provide the specific URL or location on KhelGrid where the material appears.',
          'Include your full name, organization, authorization evidence, email address, and physical address.',
          'Provide a statement confirming your good-faith belief that the disputed use is unauthorized.',
        ],
      },
      {
        title: '4. Resolution Timelines',
        paragraphs: [
          'Valid notices are acknowledged within 24 hours. Where substantiated, access to the disputed content is promptly disabled or corrected in compliance with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021.',
          sharedContact,
        ],
      },
    ],
  },

  '/cancellation-policy': {
    title: 'Cancellation & Refund Policy',
    eyebrow: 'CANCELLATION & REFUNDS',
    summary: 'This policy outlines the cancellation, refund, and modification terms applicable to venue bookings, tournament registrations, and platform memberships.',
    status: 'Official Published Policy · In Effect',
    reviewed: '2026-11-17',
    sections: [
      {
        title: '1. Discovery & Direct Partner Bookings',
        paragraphs: [
          'KhelGrid primarily operates as a verified discovery and directory platform. Where a sports turf, court, or academy operates its own external booking engine or offline desk, the specific cancellation, refund, and rain-check terms of that respective venue partner govern the reservation.',
          'Athletes and team managers are advised to confirm slot cancellation windows and rain-check policies with the venue coordinator prior to final payment.',
        ],
      },
      {
        title: '2. Pro Memberships & Future Transactions',
        paragraphs: [
          'For any premium digital services, verified coach badges, or Pro memberships activated directly through KhelGrid:',
        ],
        bullets: [
          'Cancellation Window: Subscriptions may be cancelled at any time from your Account Settings. Cancellation takes effect at the end of the current billing cycle.',
          'Refund Eligibility: If a paid feature fails to deliver due to documented technical error within 7 days of activation, users are entitled to a full refund.',
          'Processing Time: Approved refunds are processed via the original payment method within 5 to 7 business days.',
        ],
      },
      {
        title: '3. Grievance & Dispute Assistance',
        paragraphs: [
          'If you experience an unresolved dispute with a listed venue partner regarding double-booking or undisclosed fees, email khelgrid@gmail.com with your booking receipt. Our partner relations team will mediate with the facility management.',
          sharedContact,
        ],
      },
    ],
  },

  '/posh-policy': {
    title: 'POSH & Athlete Safeguarding Policy',
    eyebrow: 'SAFETY, DIGNITY & SAFEGUARDING',
    summary: 'KhelGrid enforces zero tolerance for sexual harassment, abuse, exploitation, or discrimination across all digital interfaces, community matches, and partner sporting facilities.',
    status: 'Official Published Policy · In Effect',
    reviewed: '2026-11-17',
    sections: [
      {
        title: '1. Core Commitment to Safety and Dignity',
        paragraphs: [
          'Sports must be a safe, empowering haven for everyone regardless of gender, age, background, or ability. In strict alignment with the Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013 (POSH Act) and the POCSO Act 2012, KhelGrid fosters an environment of absolute safety, mutual dignity, and respect.',
        ],
      },
      {
        title: '2. Scope and Prohibited Conduct',
        paragraphs: [
          'This policy applies to all KhelGrid team members, contractors, registered coaches, academy administrators, venue hosts, and community participants across all online and on-ground activities. Prohibited conduct includes:',
        ],
        bullets: [
          'Unwelcome physical, verbal, or non-verbal conduct of a sexual nature.',
          'Demanding sexual favors or personal intimacy in exchange for sports selection, coaching attention, or facility access.',
          'Sending unsolicited sexually suggestive messages, images, or remarks through digital channels.',
          'Any form of hazing, predatory behavior, or emotional harassment directed toward athletes, particularly minors.',
        ],
      },
      {
        title: '3. Minor Athlete Safeguarding Protocol',
        paragraphs: [
          'Coaches and mentors must maintain professional boundaries at all times. Private closed-door sessions with minors without parent/guardian knowledge or open visibility are strictly contrary to our safety guidelines.',
        ],
      },
      {
        title: '4. Confidential Grievance Redressal',
        paragraphs: [
          'Any incident, concern, or violation may be reported confidentially to our Internal Complaints & Safeguarding Committee at workplace@khelgrid.com or khelgrid@gmail.com.',
          'All complaints are treated with utmost confidentiality, objective neutrality, and prioritized for urgent inquiry. In situations involving immediate physical danger or criminal conduct, we urge complainants to immediately contact local emergency law enforcement.',
          sharedContact,
        ],
      },
    ],
  },

  '/editorial-policy': {
    title: 'Editorial & Source Policy',
    eyebrow: 'EDITORIAL STANDARDS & ACCURACY',
    summary: 'KhelGrid’s editorial mission is to provide authentic, source-grounded sports information to empower athletes, coaches, and sports communities across India.',
    status: 'Official Published Policy · In Effect',
    reviewed: '2026-11-17',
    sections: [
      {
        title: '1. Sourcing Hierarchy and Verification',
        paragraphs: [
          'We believe in absolute source traceability. Every opportunity, trial notification, and tournament listed on KhelGrid is categorized according to our verified source hierarchy:',
        ],
        bullets: [
          'Primary Official Releases: Direct circulars, gazettes, and sanctioned notifications from recognized National Sports Federations (NSFs), SAI, state associations, or accredited universities.',
          'Verified Partner Submissions: Information submitted directly by authorized venue owners, coaches, or clubs verified through our multi-point onboarding process.',
          'Corroborated Public Notices: Local tournament notices vetted through organizer contact confirmation and facility permit checks.',
        ],
      },
      {
        title: '2. Separation of Editorial and Commercial Content',
        paragraphs: [
          'Our directory rankings, trial inclusions, and editorial articles are driven entirely by athletic relevance, geographical proximity, and facility quality. We strictly separate editorial decisions from commercial partnerships.',
          'Any sponsored tournament or promotional feature is prominently labeled as &ldquo;Sponsored&rdquo; or &ldquo;Partner Feature&rdquo; to maintain total transparency with our users.',
        ],
      },
      {
        title: '3. Corrections and Updates SLA',
        paragraphs: [
          'If an organizer changes a trial date, venue location, or eligibility cutoff, we update the listing promptly upon verification. Readers can flag any update using our dedicated correction button or by emailing khelgrid@gmail.com.',
          sharedContact,
        ],
      },
    ],
  },

  '/verification-policy': {
    title: 'Verification Policy',
    eyebrow: 'TRUST & VERIFICATION STANDARDS',
    summary: 'This policy defines the rigorous multi-point verification criteria required before any venue, academy, coach, or selection trial receives the KhelGrid Verified badge.',
    status: 'Official Published Policy · In Effect',
    reviewed: '2026-11-17',
    sections: [
      {
        title: '1. The Meaning of a Verified Badge',
        paragraphs: [
          'On KhelGrid, a &ldquo;Verified&rdquo; badge represents an objective, evidence-based confirmation that our team or automated audit system has corroborated the entity’s physical existence, credentials, and compliance with our trust standards.',
          'A Verified badge is never sold or awarded based on payment alone. It must be earned through verifiable documentation.',
        ],
      },
      {
        title: '2. The 4-Tier Verification Framework',
        paragraphs: [
          'Every listing submitted to KhelGrid is evaluated across four distinct dimensions:',
        ],
        bullets: [
          'Geographical & Facility Audit: Satellite and physical GPS verification of the venue address, surface type, and playing conditions.',
          'Identity & Operating Credentials: MSME, GST, trust registration, or institutional credentials for academies and organizers.',
          'Coaching Licensing: NIS diploma, BCCI, AFC, BWF, or World Athletics certification check for coaching professionals.',
          'Safety & Child Safeguarding: Commitment to POSH compliance, emergency first aid readiness, and clean, secure amenities.',
        ],
      },
      {
        title: '3. Suspension and Revocation',
        paragraphs: [
          'Verification status is subject to ongoing review. If a verified entity is found to solicit unauthorized cash fees, misrepresent tournament outcomes, or violate athlete safeguarding rules, its badge is immediately revoked and the listing delisted.',
          sharedContact,
        ],
      },
    ],
  },

  '/correction-policy': {
    title: 'Corrections & Complaints Policy',
    eyebrow: 'CORRECTIONS & REPORTING',
    summary: 'KhelGrid is dedicated to complete factual accuracy. This policy outlines how readers, organizers, and athletes can report inaccuracies and our binding correction procedures.',
    status: 'Official Published Policy · In Effect',
    reviewed: '2026-11-17',
    sections: [
      {
        title: '1. Commitment to Prompt Correction',
        paragraphs: [
          'In sports, accuracy is paramount. A wrong venue address or outdated trial deadline can cause athletes to miss career-defining opportunities. When errors occur, KhelGrid corrects them swiftly, transparently, and completely.',
        ],
      },
      {
        title: '2. How to Report an Error',
        paragraphs: [
          'Anyone may submit a correction request by emailing khelgrid@gmail.com with:',
        ],
        bullets: [
          'The exact URL of the KhelGrid page containing the error.',
          'A description of the incorrect information and the proposed correct data.',
          'A link, photo, or document of the primary source corroborating the correction.',
        ],
      },
      {
        title: '3. Review and Resolution Timelines',
        paragraphs: [
          'Acknowledgment: Within 24 hours of receiving the email.',
          'Investigation: Verification against primary sources within 48 hours.',
          'Resolution: Content update published immediately upon confirmation.',
          sharedContact,
        ],
      },
    ],
  },

  '/workplace-policy': {
    title: 'Workplace & Professional Conduct Policy',
    eyebrow: 'WORKPLACE ETHICS & SAFETY',
    summary: 'This policy defines KhelGrid’s standard operating principles for a safe, inclusive, anti-discriminatory workplace, respectful partner field operations, minor athlete safeguarding, and accessible grievance redressal.',
    status: 'Official Published Policy · In Effect',
    reviewed: '2026-11-17',
    sections: [
      {
        title: 'Commitment to safety, equality and inclusion',
        paragraphs: [
          'KhelGrid is dedicated to providing an inclusive, safe, and professional environment for all employees, contractors, interns, community ambassadors, and partner sports facilities. Discrimination or harassment on the grounds of gender, race, religion, caste, sexual orientation, disability, age, or socioeconomic background is strictly prohibited.',
          'Every team member and affiliated partner is expected to uphold the highest standards of integrity, mutual respect, and sportsmanship in both digital and physical interactions.',
        ],
      },
      {
        title: 'Anti-harassment and respectful conduct',
        paragraphs: [
          'Harassment of any kind—verbal, physical, visual, or digital—will not be tolerated. This includes unwanted advances, derogatory remarks, abusive language, bullying, intimidating behaviour, and non-consensual disclosure of personal or athletic information.',
          'All team members and venue operators must adhere to rigorous POSH (Prevention of Sexual Harassment) standards and minor athlete safeguarding protocols during trials, tournaments, or community games.',
        ],
      },
      {
        title: 'Fair practices with venue hosts and sports organizers',
        paragraphs: [
          'All personnel and representatives engaging with turf owners, sports academy coaches, and tournament organisers must conduct discussions transparently, honouring published pricing, commission splits, and verified slot availability.',
          'Under no circumstances may KhelGrid personnel request improper inducements, private commissions, or solicit unofficial off-platform cash transactions from listing partners.',
        ],
      },
      {
        title: 'Field operations and health safeguards',
        paragraphs: [
          'When attending or hosting on-ground selection trials, scouting combines, or live match scorekeeping sessions, representatives must prioritize athlete physical safety, adhere to local sports directives, ensure emergency first-aid readiness, and observe field safety guidelines.',
          'Unsafe venue conditions, extreme heat stress risks, or defective ground equipment must be escalated immediately to the venue coordinator and documented.',
        ],
      },
      {
        title: 'Confidential grievance redressal and whistleblower protection',
        paragraphs: [
          'Any employee, partner, or community member who experiences or witnesses behaviour in violation of this Workplace Policy is encouraged to report the incident without fear of reprisal or retaliation.',
          'Reports should be directed to workplace@khelgrid.com or khelgrid@gmail.com with relevant dates, persons involved, and supporting documentation. All grievances are handled confidentially, objectively, and promptly in accordance with applicable laws.',
        ],
      },
    ],
  },

  '/open-science-policy': {
    title: 'Open Science & Research Ethics Policy',
    eyebrow: 'OPEN SCIENCE & RESEARCH INTEGRITY',
    summary: 'This policy governs KhelChronicle (SportRxiv India), KhelGrid’s Diamond Open Access repository for sports science, biomechanics, exercise physiology, sports medicine, and athletic performance research.',
    status: 'Official Published Policy · Aligned with STORK, COPE, and Crossref guidelines',
    reviewed: '2026-11-17',
    sections: [
      {
        title: 'Diamond Open Access & CC BY 4.0 Standard',
        paragraphs: [
          'KhelChronicle operates as a 100% Diamond Open Access preprint archive. There are zero Article Processing Charges (APCs) for researchers to deposit manuscripts, zero submission fees, and zero reader paywalls. All preprints, protocols, and normative datasets are permanently accessible to researchers, grassroots coaches, and athletes worldwide.',
          'All manuscripts are published under the Creative Commons Attribution 4.0 International License (CC BY 4.0). Authors retain full copyright of their work while granting KhelChronicle a non-exclusive, irrevocable license to archive, distribute, and preserve the preprint and its bibliographic metadata.',
        ],
        bullets: [
          'Zero author Article Processing Charges (APCs) or deposit fees',
          'Immediate, unrestricted, permanent worldwide public access',
          'Full copyright retention by contributing authors',
          'Permits free download, sharing, and commercial/non-commercial adaptation with attribution',
        ],
      },
      {
        title: 'Human Subject Ethics & Informed Consent',
        paragraphs: [
          'All empirical investigations involving human participants—including athletes, academy trainees, coaches, or clinical cohorts—must strictly comply with the World Medical Association Declaration of Helsinki and Indian Council of Medical Research (ICMR) Ethical Guidelines for Biomedical Research.',
          'Manuscripts reporting empirical measurements (e.g. force plates, kinematic motion capture, blood hematology, metabolic gas analysis, biological age radiography) must include an explicit Ethics Statement identifying the Institutional Ethics Committee (IEC) or Institutional Review Board (IRB) that granted approval, alongside confirmation of written informed consent and parental/guardian assent for minor participants under 18 years of age.',
        ],
      },
      {
        title: 'FAIR Primary Data & Code Sharing Mandate',
        paragraphs: [
          'KhelChronicle mandates adherence to FAIR (Findable, Accessible, Interoperable, and Reusable) research data principles. Authors are expected to deposit primary de-identified raw telemetry, force-plate time series, biomechanical marker sets, normative tables, or analysis scripts in certified public repositories (Zenodo, Open Science Framework, Dryad, or GitHub).',
          'Every preprint must feature an explicit Data Availability Statement with persistent repository identifiers or DOIs. Studies with restricted data due to participant privacy or commercial confidentiality must provide justifiable rationales and contact protocols for academic verification.',
        ],
      },
      {
        title: 'Community Peer Review & Scholarly Conduct Code',
        paragraphs: [
          'KhelChronicle supports transparent pre-publication and post-publication peer discourse to accelerate scientific discovery and facilitate grassroots translation. Reader reviews and methodological inquiries are permanently indexed with the manuscript in the KhelChronicle database.',
          'Commenters must declare institutional affiliations, provide verified ORCID credentials, disclose any competing financial or consultancy interests, and adhere to Committee on Publication Ethics (COPE) guidelines for civil, evidence-based, constructive academic discourse. Commercial spam, harassment, and ungrounded derogatory statements are strictly prohibited.',
        ],
      },
      {
        title: 'Permanent Scientific Record, Versioning & Withdrawals',
        paragraphs: [
          'Preprints receive persistent Crossref Digital Object Identifiers (DOIs) and form part of the permanent scientific record. Deposits cannot be casually deleted. Authors may post updated manuscript versions (e.g. v1.1, v2.0) accompanied by transparent revision changelogs.',
          'In rare circumstances involving documented scientific misconduct, data falsification, severe ethical breaches, or legal injunctions, KhelChronicle will follow international COPE protocols by replacing the manuscript text with a formal Public Retraction or Withdrawal Notice while preserving the persistent DOI and bibliographic metadata for audit integrity.',
        ],
      },
      {
        title: 'Journal Submission Compatibility & Version of Record (VoR) Linking',
        paragraphs: [
          'Depositing a preprint on KhelChronicle does not preclude subsequent publication in peer-reviewed academic journals. Major sports science publishers (including BMJ/BJSM, Elsevier, Springer Nature, Taylor & Francis, and Human Kinetics) endorse preprint deposition prior to or during peer review.',
          'Once a manuscript is formally accepted and published in a certified journal, KhelChronicle displays a prominent Version of Record (VoR) banner directing researchers, coaches, and indexers to cite the certified journal publication and DOI.',
        ],
      },
      {
        title: 'Machine-Readable Syndication & PRISM Feeds',
        paragraphs: [
          'KhelChronicle publishes an automated RSS 2.0 XML feed at /khelchronicle/feed.xml equipped with Dublin Core (dc:creator, dc:date, dc:identifier) and PRISM (prism:doi, prism:section) metadata for university libraries, reference managers (Zotero, Mendeley), and automated bibliometric indexing harvesters.',
        ],
      },
    ],
  },
}

const links = [
  ['/privacy', 'Privacy Policy'],
  ['/terms', 'Terms of Use'],
  ['/cookies', 'Cookie Policy'],
  ['/ipr-policy', 'IPR & Copyright'],
  ['/cancellation-policy', 'Cancellation & Refunds'],
  ['/posh-policy', 'POSH & Safeguarding'],
  ['/editorial-policy', 'Editorial & Sources'],
  ['/verification-policy', 'Verification'],
  ['/correction-policy', 'Corrections & Complaints'],
  ['/workplace-policy', 'Workplace Policy'],
  ['/open-science-policy', 'Open Science Policy'],
] as const

export default function PolicyPage({
  path,
  onNavigate,
}: {
  path: string
  onNavigate: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}) {
  const policy = policies[path]
  if (!policy) {
    return (
      <main className="policy-page">
        <p className="eyebrow">POLICY</p>
        <h1>Policy not found</h1>
        <a href="/" onClick={event => onNavigate(event, '/')}>
          Return home
        </a>
      </main>
    )
  }

  return (
    <main className="policy-page">
      <p className="eyebrow">{policy.eyebrow}</p>
      <h1>{policy.title}</h1>
      <p className="policy-summary">{policy.summary}</p>
      <div className="policy-status">
        <SiteIcon name="shield-check" size={18} />
        <div>
          <strong>{policy.status}</strong>
          <p>Effective Date: {policy.reviewed} · Official binding policy of KhelGrid Platform.</p>
        </div>
      </div>
      <nav className="policy-index" aria-label="Policy pages">
        <strong>Policy directory</strong>
        {links.map(([href, label]) => (
          <a
            key={href}
            href={href}
            onClick={event => onNavigate(event, href)}
            aria-current={href === path ? 'page' : undefined}
          >
            {label}
          </a>
        ))}
      </nav>
      <div className="policy-sections">
        {policy.sections.map(section => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {section.bullets?.length ? (
              <ul>
                {section.bullets.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
      <div className="policy-contact">
        <h2>Related links and contact</h2>
        <p>
          Read the{' '}
          <a href="/about" onClick={event => onNavigate(event, '/about')}>
            About KhelGrid
          </a>{' '}
          page or visit{' '}
          <a href="/contact" onClick={event => onNavigate(event, '/contact')}>
            Contact KhelGrid
          </a>
          . For general enquiries and privacy requests, email{' '}
          <a href="mailto:khelgrid@gmail.com">khelgrid@gmail.com</a>; for IPR reports, email{' '}
          <a href="mailto:ipr@khelgrid.com">ipr@khelgrid.com</a>.
        </p>
      </div>
    </main>
  )
}
