export interface FAQItem {
  id: string
  question: string
  answer: string
  category: string
  badge?: string
}

export interface RouteFAQContext {
  contextName: string
  heading: string
  tagline: string
  description: string
  faqs: FAQItem[]
}

export const HOME_FAQS: FAQItem[] = [
  {
    id: 'home-1',
    category: 'Athlete Access',
    badge: '100% Free Access',
    question: 'Is KhelGrid free for athletes, and how do selection trial applications work?',
    answer: 'Yes! Creating a profile, browsing sports trials, exploring certified academies, and locating venues on KhelGrid is 100% free for all athletes, parents, and coaches. Every registered athlete receives complimentary trial applications upon joining. Athletes can submit additional verified applications via transparent micropayments (₹49 per application) or unlock unlimited applications with KhelGrid Pro (₹499/month), which includes an official Verified Sports CV and priority scouting alerts across 50+ Indian sporting hubs (16 premier metro centres).',
  },
  {
    id: 'home-2',
    category: 'Anti-Scam Verification',
    badge: 'Zero Fake Trials',
    question: 'How does KhelGrid protect young athletes from fraudulent trials and pay-to-play scams?',
    answer: 'KhelGrid enforces a strict multi-tier verification protocol to eradicate unauthorized agents and fake trial notices. Every listing published on KhelGrid is cross-referenced with authorized state sports gazettes, national sports federation notifications, or verified academy circulars. We confirm direct reporting schedules, cutoff birth dates, registration documents, and official organizer contacts, permanently rejecting predatory combines that demand unauthorized cash fees.',
  },
  {
    id: 'home-3',
    category: 'Scout Passport',
    badge: 'Digital Sports CV',
    question: 'What is the KhelGrid Sports CV and how does it help athletes get scouted?',
    answer: 'The KhelGrid Sports CV is a standardized digital athletic passport that catalogues an athlete’s competitive tournament history, physical fitness benchmarks (Yo-Yo test, 30m sprint, vertical leap), playing position, and federation registration numbers (such as AIFF CRS or BCCI UID). Certified scouts, coaches, and sports directors across India utilize our verified QR-coded profile format to evaluate authentic talent without relying on unverified claims.',
  },
  {
    id: 'home-4',
    category: 'Govt Sports Quota',
    badge: 'Recruitment 2026',
    question: 'How does KhelGrid track government sports quota recruitment drives across India?',
    answer: 'Public sector bodies including Indian Railways (RSPB), Central Reserve Police Force (CRPF), Services Sports Control Board (SSCB), and State Police Departments regularly hire meritorious sportspersons. KhelGrid actively aggregates and indexes these government sports quota recruitment circulars, highlighting age relaxations, educational criteria, minimum medal eligibility (district, state, or national), and reporting deadlines so deserving grassroots khiladis never miss employment openings.',
  },
  {
    id: 'home-5',
    category: 'Venues & Turfs',
    badge: '50+ Sports Cities',
    question: 'How do sports turf reservations and venue discoveries work on KhelGrid?',
    answer: 'KhelGrid indexes premier stadiums, SAI high-performance centres, and private multisport arenas across 50+ Indian cities, featuring 16 premier metropolitan hubs including Delhi NCR, Mumbai, Bengaluru, Hyderabad, Pune, Kolkata, and Chennai, along with 37+ regional sports centres. Athletes, teams, and tournament organizers can review field dimensions (such as FIFA-standard 5v5 turf and BWF wooden badminton courts), floodlight specs, and venue facilities to find legitimate practice facilities.',
  },
  {
    id: 'home-6',
    category: 'Grassroots Pathways',
    badge: 'U-14 to Senior Open',
    question: 'Which age divisions and sports disciplines are currently supported on KhelGrid?',
    answer: 'KhelGrid covers 28 Olympic, traditional Indian, and combat disciplines—ranging from Cricket, Football, Badminton, and Athletics to Akhada Wrestling, Kabaddi, Kho-Kho, Boxing, and Shooting. Opportunities are catalogued across recognized age divisions: Under-14 (Sub-Junior), Under-16 (Junior), Under-19 (Youth), Under-23 (Emerging), and Senior Open categories aligned with official national sports federation calendars.',
  },
]

export const SPORTS_FAQS: FAQItem[] = [
  {
    id: 'sports-1',
    category: 'National Academies',
    badge: 'SAI NCOE & KISCE',
    question: 'What is the difference between grassroots club academies and SAI National Centres of Excellence (NCOE)?',
    answer: 'SAI National Centres of Excellence (NCOE) and Khelo India State Centres of Excellence (KISCE) are premier government institutions established under the Ministry of Youth Affairs and Sports. They provide full scholarship boarding, international coaching, sports science biomechanics, and nutrition to prepare athletes for Olympic and Asian Games pathways. Grassroots club academies provide localized coaching, foundational skills, and district league exposure that prepare athletes for state and SAI selection combines.',
  },
  {
    id: 'sports-2',
    category: 'Eligibility & Rules',
    badge: 'Age Verification',
    question: 'Which age verification documents and cutoff standards are enforced at state trials?',
    answer: 'State associations and national federations enforce strict compliance under the National Code against Age Fraud in Sports. Aspiring athletes must furnish computerized birth certificates issued by municipal authorities within one year of birth, School Leaving Certificates (SLC), Aadhaar cards, and federation registration cards. In junior national combines, athletes routinely undergo TW3 (Tanner-Whitehouse 3) radiographic bone-age assessments to certify biological age.',
  },
  {
    id: 'sports-3',
    category: 'Athlete Progression',
    badge: 'District to National',
    question: 'How do athletes advance from district school games to state and national team selections?',
    answer: 'Athletic progression in India follows a structured pyramidal pathway: athletes begin at the school or taluk level, compete in District Sports Association championships, and earn qualification spots for State Championship selection camps. Exceptional performances at state championships lead to national representations at the Khelo India Youth Games, National Games, or federation championships (such as BCCI Ranji Trophy or AIFF Santosh Trophy), opening doors to national team trials.',
  },
  {
    id: 'sports-4',
    category: 'Official Rulebooks',
    badge: 'BWF · IFAB · MCC · AKFI',
    question: 'Which official rulebooks and technical regulations govern sports listings on KhelGrid?',
    answer: 'All competitive matches and educational resources on KhelGrid strictly follow authorized international and Indian governing body regulations: Marylebone Cricket Club (MCC) Laws of Cricket, International Football Association Board (IFAB) Laws of the Game, Badminton World Federation (BWF) Technical Regulations, and Amateur Kabaddi Federation of India (AKFI) Mat Specifications. Our Sports & Learning Hub indexes official rulebooks and video breakdowns to enhance tactical IQ.',
  },
  {
    id: 'sports-5',
    category: 'Traditional Sports',
    badge: 'Desi Khel & Akhadas',
    question: 'Are indigenous Indian disciplines like Akhada Wrestling, Kabaddi, and Kho-Kho supported?',
    answer: 'Yes! Traditional Indian combat and indigenous sports are a central focus of KhelGrid. We track traditional Dangal combines, Akhada wrestling camps in Haryana, Delhi, and Maharashtra, AKFI-sanctioned Kabaddi selection trials, and Kho-Kho national circuits. Grassroots khiladis in indigenous sports receive dedicated Sports CV support, trial cutoffs, and state sports policy incentive updates.',
  },
  {
    id: 'sports-6',
    category: 'Fitness Combine',
    badge: 'Talent Benchmarking',
    question: 'What physical fitness parameters are evaluated during academy trials and scout combines?',
    answer: 'Coaches and talent scouts evaluate standardized physical attributes tailored to each sport: aerobic endurance (Yo-Yo Intermittent Recovery Test), sprint acceleration (30m flying sprint), lower-body explosive power (Vertical Jump / Standing Broad Jump), agility (Illinois Agility Test), and functional core stability. Athletes can benchmark their test metrics using KhelGrid’s Talent Scanner against national age-group percentiles.',
  },
]

export const TRIALS_FAQS: FAQItem[] = [
  {
    id: 'trials-1',
    category: 'Trial Verification',
    badge: 'Direct Source Audit',
    question: 'How does KhelGrid verify that a sports selection trial is authentic and safe to attend?',
    answer: 'Every trial on KhelGrid passes through a four-point verification check before publication: (1) Direct verification against the originating sports gazette, federation circular, or organizer release, (2) Phone authentication with the authorized tournament secretary or federation official, (3) Cross-referencing with official state sports council schedules, and (4) Strict enforcement of our zero pay-to-play scam policy. Unauthorized commercial entry rackets are strictly barred.',
  },
  {
    id: 'trials-2',
    category: 'Trial Preparation',
    badge: 'Reporting Kit & Docs',
    question: 'What mandatory gear, kits, and documents should athletes bring to a selection trial?',
    answer: 'Athletes must report in discipline-appropriate attire (e.g. white flannels for multi-day cricket, molded cleats and shin guards for football, non-marking gum sole shoes for badminton, wrestling singlet and shoes for wrestling). You must bring 2 recent passport-size photographs, original Aadhaar card, government birth certificate, academic enrollment proof, previous achievement certificates, and a signed medical fitness certificate.',
  },
  {
    id: 'trials-3',
    category: 'Weather & Delays',
    badge: 'Real-time Alerts',
    question: 'What happens if a selection trial or sports combine is postponed or rescheduled due to rain?',
    answer: 'KhelGrid’s community and desk team monitors active trial venues across India. If a selection camp is delayed, shifted to an indoor arena, or rescheduled due to waterlogged fields or monsoon advisories, the listing is updated immediately with official rescheduled reporting times and direct notification alerts to registered participants.',
  },
  {
    id: 'trials-4',
    category: 'Domicile Rules',
    badge: 'State vs Open Combines',
    question: 'Can athletes from rural areas or other states participate in open selection trials?',
    answer: 'Open trials—such as private academy talent hunts, SAI NCOE national selection combines, and Indian Super League (ISL) or IPL franchise youth trials—are open to athletes from across India regardless of state domicile. In contrast, official District and State Association selection trials representing a state in National Championships require verifiable residency certificates or local club affiliation as per federation bylaws.',
  },
  {
    id: 'trials-5',
    category: 'Govt Employment',
    badge: 'Police, Railways, Armed Forces',
    question: 'How do sports quota recruitment trials differ from regular academy selections?',
    answer: 'Sports quota trials conducted by organizations such as Indian Railways, CRPF, CISF, and State Police are recruitment exams for permanent government employment. In addition to technical and tactical on-field evaluation, candidates must satisfy educational prerequisites (10th/12th/Graduation), clear Physical Efficiency Tests (PET), and pass medical fitness standards specified in official public service gazettes.',
  },
  {
    id: 'trials-6',
    category: 'Federation IDs',
    badge: 'AIFF CRS · BCCI UID',
    question: 'Do grassroots athletes need a federation registration ID to attend selection trials?',
    answer: 'For entry-level district screening camps, open academy combines, and school trials, an active federation ID is usually not required; a government identity proof and municipal birth certificate are sufficient. Once an athlete is shortlisted for official state leagues or national championships, the organizing state association coordinates direct registration on the central federation database (e.g. AIFF Central Registration System or BCCI UID).',
  },
]

export const VENUES_FAQS: FAQItem[] = [
  {
    id: 'venues-1',
    category: 'Turf Booking',
    badge: 'Hourly Slot Discovery',
    question: 'How do sports venue bookings and hourly turf reservations work on KhelGrid?',
    answer: 'KhelGrid indexes verified sports arenas, box cricket turfs, FIFA-standard futsal pitches, wooden badminton courts, and Olympic-length swimming facilities across 50+ Indian sports cities (including 16 premier metro hubs). Players and teams can examine verified field dimensions, surface material, floodlight ratings, hourly rates, and venue contact numbers to schedule practice sessions.',
  },
  {
    id: 'venues-2',
    category: 'Turf Specifications',
    badge: 'FIFA & BWF Surfaces',
    question: 'What turf and court surface standards should athletes look for when booking a facility?',
    answer: 'For football and box cricket, prioritize 40mm–50mm monofilament artificial grass with shock-absorbing silica sand and rubber infill to reduce ligament strain. For badminton and basketball, choose certified wooden sprung flooring or BWF-approved multi-layer synthetic vinyl mats. For tennis, check between cushioned acrylic synthetic hard courts and traditional clay depending on tournament training needs.',
  },
  {
    id: 'venues-3',
    category: 'Facility Amenities',
    badge: 'Floodlights & Lockers',
    question: 'What amenities and safety features are verified for venues listed on KhelGrid?',
    answer: 'Listed venue profiles highlight key operational amenities: LED stadium floodlights (with lux ratings for evening matches), clean drinking water stations, dedicated changing rooms and secure lockers, emergency first-aid kits, parking space, and spectator seating, ensuring players enjoy a safe sporting environment.',
  },
  {
    id: 'venues-4',
    category: 'Venue Listing',
    badge: 'Partner with KhelGrid',
    question: 'How can venue owners, complex managers, and turf operators list their facilities on KhelGrid?',
    answer: 'Sports complex operators and private turf owners across India can submit their venue details through KhelGrid’s partner registration desk. Following verification of operating licenses, pitch dimensions, and safety standards, the venue is indexed on our national sports venue directory to connect with local academies, corporate leagues, and pickup match players.',
  },
  {
    id: 'venues-5',
    category: 'Community Play',
    badge: 'Pickup & Box Games',
    question: 'How do community pickup matches and box cricket games get organized at local venues?',
    answer: 'Players looking for pickup games can explore KhelGrid’s "Find a Game" hub to join open spots in local matches. Hosts create game listings (e.g. 5v5 Futsal, 7v7 Box Cricket, or Doubles Badminton), set skill level criteria, and split hourly turf costs transparently among confirmed players.',
  },
  {
    id: 'venues-6',
    category: 'Public Stadiums',
    badge: 'SAI & DDA Complexes',
    question: 'Are premier public stadiums like JLN Stadium, Kanteerava, or Gachibowli open to the public?',
    answer: 'Many iconic public and SAI-operated stadiums (such as Jawaharlal Nehru Stadium in Delhi, Sree Kanteerava in Bengaluru, and Shree Shiv Chhatrapati Complex in Pune) operate Come & Play schemes and offer subsidized monthly pay-and-play memberships for athletics, swimming, and badminton. KhelGrid details gate reporting procedures, facility timings, and membership options across all 50+ supported cities.',
  },
]

export const SEARCH_FAQS: FAQItem[] = [
  {
    id: 'search-1',
    category: 'Catalogue Search',
    badge: 'Multi-Filter Navigation',
    question: 'How do I search and filter trials, academies, and venues by sport, city, and age category?',
    answer: 'KhelGrid’s unified catalogue search allows you to drill down into our national sports database using multi-dimensional filters: select your sport (from 28+ disciplines), city (from 50+ sports cities and 16 metro hubs), age category (U-14, U-16, U-19, U-23, or Senior Open), and sorting preferences (soonest upcoming dates, free trials, or relevance) to instantly find opportunities matching your profile.',
  },
  {
    id: 'search-2',
    category: 'Sports CV Sharing',
    badge: 'Verified QR Code',
    question: 'Can I export and share my KhelGrid Sports CV with academy selectors and coaches via WhatsApp?',
    answer: 'Yes! Athletes can generate a shareable digital Sports CV link or download an official QR-coded PDF athletic resume. When coaches, club selectors, or federation scouts scan the QR code, they can instantly verify your match statistics, tournament achievements, and fitness combine scores directly on KhelGrid.',
  },
  {
    id: 'search-3',
    category: 'Grassroots Roadmap',
    badge: 'Start From Zero',
    question: 'What is the "Start From Zero" athletic roadmap for young athletes and parents?',
    answer: 'The "Start From Zero" pathway is an educational roadmap built to guide aspiring athletes, parents, and coaches navigating Indian grassroots sports without prior insider contacts. It details step-by-step milestones: foundational training, local club selection, district registration, nutrition and injury prevention, state trials, and government sports quota recruitment.',
  },
  {
    id: 'search-4',
    category: 'Data Accuracy',
    badge: 'Daily Database Updates',
    question: 'How frequently is the KhelGrid sports trials and opportunities catalogue updated?',
    answer: 'Our sports editorial and field research team updates the KhelGrid catalogue every single day as new state association circulars, Khelo India notifications, SAI NCOE admissions, and public sector employment gazettes are released, ensuring khiladis never miss an upcoming registration cutoff.',
  },
  {
    id: 'search-5',
    category: 'Verification Status',
    badge: 'Certified Credentials',
    question: 'How does KhelGrid verify athlete tournament certificates and match achievements?',
    answer: 'Athletes can submit verified tournament scorecards, federation certificates, or organizer letters. Our sports verification desk cross-references these credentials with official tournament brackets and records before issuing a "Verified Athlete" credential mark, ensuring scouts review trustworthy records.',
  },
  {
    id: 'search-6',
    category: 'Community Reporting',
    badge: 'Report & Suggest',
    question: 'Where can I suggest a new sports trial or report an outdated venue listing?',
    answer: 'Users, tournament secretaries, and academy directors can report updates or submit newly announced selection trials directly through our "Submit a Listing" tool or by emailing khelgrid@gmail.com. Submissions are reviewed and authenticated within 24 hours to maintain 100% data fidelity.',
  },
]

export function getFaqsForPath(path: string): RouteFAQContext {
  const normalized = path.toLowerCase().trim()

  if (normalized.startsWith('/sports') || normalized.startsWith('/sport/') || normalized.startsWith('/sport')) {
    return {
      contextName: 'Sports & Disciplines FAQ',
      heading: 'Frequently Asked Questions',
      tagline: 'Got questions? We have answers.',
      description: 'Authoritative answers on sports disciplines, federation standards, age eligibility cutoffs, and grassroots-to-national athlete pathways across India.',
      faqs: SPORTS_FAQS,
    }
  }

  if (normalized.startsWith('/opportunities') || normalized.startsWith('/trials')) {
    return {
      contextName: 'Selection Trials & Opportunities FAQ',
      heading: 'Frequently Asked Questions',
      tagline: 'Got questions? We have answers.',
      description: 'Everything you need to know about attending authentic selection trials, SAI NCOE combines, reporting requirements, and government sports quota drives.',
      faqs: TRIALS_FAQS,
    }
  }

  if (normalized.startsWith('/venues') || normalized.startsWith('/book')) {
    return {
      contextName: 'Sports Venues & Turf Bookings FAQ',
      heading: 'Frequently Asked Questions',
      tagline: 'Got questions? We have answers.',
      description: 'Detailed answers on booking sports turfs, checking court surface specifications, discovering floodlit stadiums, and listing venues across 50+ Indian cities.',
      faqs: VENUES_FAQS,
    }
  }

  if (
    normalized.startsWith('/search') ||
    normalized.startsWith('/start-from-zero') ||
    normalized.startsWith('/learning') ||
    normalized.startsWith('/guides')
  ) {
    return {
      contextName: 'Directory & Athlete Pathways FAQ',
      heading: 'Frequently Asked Questions',
      tagline: 'Got questions? We have answers.',
      description: 'Find answers on navigating the KhelGrid catalogue, generating your verified digital Sports CV, and building an athletic career from grassroots to pro.',
      faqs: SEARCH_FAQS,
    }
  }

  // Default: Home Page / General KhelGrid platform FAQ
  return {
    contextName: 'KhelGrid Platform & Athlete FAQ',
    heading: 'Frequently Asked Questions',
    tagline: 'Got questions? We have answers.',
    description: 'Explore comprehensive answers about authentic selection trials, Sports CV verification, transparent trial access, and India’s grassroots sports network.',
    faqs: HOME_FAQS,
  }
}
