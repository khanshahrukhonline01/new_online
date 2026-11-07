export type SportEventType = 'championship' | 'school_games' | 'invitational' | 'league'
export type AgeGroup = 'U-14' | 'U-17' | 'U-19' | 'Open' | 'Collegiate'
export type SanctioningBody =
  | 'Khelo India / SAI'
  | 'SGFI'
  | 'BCCI'
  | 'AIFF'
  | 'BAI'
  | 'AFI'
  | 'BFI'
  | 'AKFI'
  | 'TTFI'
  | 'WFI'
  | 'State Olympic Association'

export type TournamentStatus = 'Registration Open' | 'Upcoming' | 'In Progress' | 'Concluded'

export interface SportEvent {
  id: string
  slug: string
  title: string
  hindiTitle: string
  sport: string
  category: SportEventType
  sanctioningBody: SanctioningBody
  edition: string
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  registrationDeadline: string // YYYY-MM-DD
  city: string
  state: string
  venue: string
  ageCategories: AgeGroup[]
  gender: 'Boys & Girls' | 'Men & Women' | 'Open'
  prizePool: string
  entryFee: string
  teamOrIndividual: 'Individual & Team' | 'Individual' | 'Team'
  officialNoticeUrl: string
  rulebookPdfUrl?: string
  registrationUrl: string
  organizer: string
  contactPhone: string
  contactEmail: string
  verifiedBadge: boolean
  featured: boolean
  description: string
  qualificationRequirements: string[]
}

export const BASELINE_EVENTS: SportEvent[] = [
  {
    id: 'evt-kiyg-2026',
    slug: 'khelo-india-youth-games-2026',
    title: 'Khelo India Youth Games (KIYG) 2026',
    hindiTitle: 'खेलो इंडिया यूथ गेम्स 2026',
    sport: 'Multi-Sport',
    category: 'championship',
    sanctioningBody: 'Khelo India / SAI',
    edition: '8th National Edition',
    startDate: '2026-12-10',
    endDate: '2026-12-22',
    registrationDeadline: '2026-11-25',
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    venue: 'Tatya Tope Stadium & MP Sports Complex, Bhopal',
    ageCategories: ['U-17', 'U-19'],
    gender: 'Boys & Girls',
    prizePool: '₹5 Lakh SAI Annual Scholarship for Top 8 Podium Finishers',
    entryFee: 'Free (State Selection Quota)',
    teamOrIndividual: 'Individual & Team',
    officialNoticeUrl: 'https://kheloindia.gov.in/',
    rulebookPdfUrl: 'https://kheloindia.gov.in/guidelines-2026',
    registrationUrl: 'https://kheloindia.gov.in/athlete-portal',
    organizer: 'Sports Authority of India (SAI) & Ministry of Youth Affairs',
    contactPhone: '+91 11 2436 8393',
    contactEmail: 'support@kheloindia.gov.in',
    verifiedBadge: true,
    featured: true,
    description: 'The flagship national grassroots games for school and college athletes across 27 Olympic and traditional disciplines.',
    qualificationRequirements: [
      'Must have represented State at SGFI National School Games or National Junior Championship',
      'Valid SAI Khelo India Athlete UID card',
      'Aadhaar age authenticity certificate issued prior to cut-off year',
    ],
  },
  {
    id: 'evt-sgfi-badminton-2026',
    slug: 'sgfi-national-school-badminton-championship-2026',
    title: '68th SGFI National School Badminton Games',
    hindiTitle: '68वीं एसजीएफआई राष्ट्रीय विद्यालय बैडमिंटन प्रतियोगिता',
    sport: 'Badminton',
    category: 'school_games',
    sanctioningBody: 'SGFI',
    edition: '68th SGFI Games',
    startDate: '2026-12-04',
    endDate: '2026-12-09',
    registrationDeadline: '2026-11-20',
    city: 'Bengaluru',
    state: 'Karnataka',
    venue: 'Prakash Padukone Badminton Academy, CSE, Yelahanka, Bengaluru',
    ageCategories: ['U-14', 'U-17', 'U-19'],
    gender: 'Boys & Girls',
    prizePool: 'Merit Medals & Ministry of Education Board Grace Marks',
    entryFee: 'Sponsored by State School Education Department',
    teamOrIndividual: 'Individual & Team',
    officialNoticeUrl: 'https://sgfi.org.in/',
    rulebookPdfUrl: 'https://sgfi.org.in/rulebooks/badminton-rules-2026',
    registrationUrl: 'https://sgfi.org.in/state-nominations',
    organizer: 'School Games Federation of India (SGFI)',
    contactPhone: '+91 562 252 0011',
    contactEmail: 'info@sgfi.org.in',
    verifiedBadge: true,
    featured: true,
    description: 'Premier inter-state school badminton tournament qualifying student-athletes for national junior camps and university sports quota admissions.',
    qualificationRequirements: [
      'Regular full-time enrolled student in a recognised state/CBSE/ICSE school',
      'Selected via District & State School Games qualifiers',
      'Original School Principal bonafide letter with photo attested',
    ],
  },
  {
    id: 'evt-subroto-cup-2026',
    slug: 'subroto-cup-international-football-tournament-2026',
    title: 'Subroto Cup International Football Tournament',
    hindiTitle: 'सुब्रतो कप अंतरराष्ट्रीय फुटबॉल टूर्नामेंट',
    sport: 'Football',
    category: 'school_games',
    sanctioningBody: 'AIFF',
    edition: '64th Edition',
    startDate: '2026-11-28',
    endDate: '2026-12-14',
    registrationDeadline: '2026-11-18',
    city: 'New Delhi',
    state: 'Delhi NCR',
    venue: 'Ambedkar Stadium & Tejas Football Ground, Subroto Park, New Delhi',
    ageCategories: ['U-14', 'U-17'],
    gender: 'Boys & Girls',
    prizePool: '₹25,00,000 Total Prize Purse & ISL Youth Academy Contracts',
    entryFee: 'Free for Qualified State Champion Schools',
    teamOrIndividual: 'Team',
    officialNoticeUrl: 'https://subrotocup.in/',
    rulebookPdfUrl: 'https://subrotocup.in/eligibility-and-fixtures',
    registrationUrl: 'https://subrotocup.in/registration-login',
    organizer: 'Subroto Mukerjee Sports Education Society & Indian Air Force',
    contactPhone: '+91 11 2568 7194',
    contactEmail: 'subrotocup@gmail.com',
    verifiedBadge: true,
    featured: true,
    description: 'Asia’s oldest and most prestigious inter-school football championship bringing together champion state schools, army schools, and international guest squads.',
    qualificationRequirements: [
      'School team must have won District and State Inter-School Football Championship',
      'AIFF Central Registration System (CRS) player IDs required for all 18 squad members',
      'Mandatory TW3 bone age verification test prior to group stage',
    ],
  },
  {
    id: 'evt-afi-national-athletics-2026',
    slug: 'afi-national-junior-athletics-championships-2026',
    title: '39th AFI National Junior Athletics Championships',
    hindiTitle: '39वीं एएफआई राष्ट्रीय जूनियर एथलेटिक्स चैंपियनशिप',
    sport: 'Athletics',
    category: 'championship',
    sanctioningBody: 'AFI',
    edition: '39th Edition',
    startDate: '2026-12-18',
    endDate: '2026-12-22',
    registrationDeadline: '2026-11-30',
    city: 'Bhubaneswar',
    state: 'Odisha',
    venue: 'Kalinga Stadium Athletics Complex, Bhubaneswar',
    ageCategories: ['U-14', 'U-17', 'U-19'],
    gender: 'Boys & Girls',
    prizePool: 'Medals, National Camp Invitations & Target Olympic Podium Scheme (TOPS) Scout Pool',
    entryFee: '₹350 per event (State Affiliate Entry)',
    teamOrIndividual: 'Individual',
    officialNoticeUrl: 'https://indianathletics.in/',
    rulebookPdfUrl: 'https://indianathletics.in/rules-circulars',
    registrationUrl: 'https://indianathletics.in/athlete-entry-portal',
    organizer: 'Athletics Federation of India (AFI)',
    contactPhone: '+91 11 4010 4030',
    contactEmail: 'afi@indianathletics.in',
    verifiedBadge: true,
    featured: true,
    description: 'The pinnacle event for aspiring Indian track and field athletes. Qualifiers are directly considered for World U-20 and Asian Junior Athletics Championships squads.',
    qualificationRequirements: [
      'AFI UID (Unique Identification Number) mandatory for entry',
      'Must have achieved minimum entry qualification standard at State Athletics Meet',
      'Valid digital biometric card',
    ],
  },
  {
    id: 'evt-bcci-cooch-behar-2026',
    slug: 'bcci-cooch-behar-trophy-u19-2026',
    title: 'BCCI Cooch Behar Trophy (U-19 Four-Day Tournament)',
    hindiTitle: 'बीसीसीआई कूच बिहार ट्रॉफी (अंडर-19)',
    sport: 'Cricket',
    category: 'championship',
    sanctioningBody: 'BCCI',
    edition: '2026-27 Season',
    startDate: '2026-12-01',
    endDate: '2027-01-20',
    registrationDeadline: '2026-11-22',
    city: 'Multiple Metro Hubs',
    state: 'All India',
    venue: 'BCCI Certified First Class Venues Across India',
    ageCategories: ['U-19'],
    gender: 'Boys & Girls',
    prizePool: '₹50,00,000 Winner & Runner-up Purse + BCCI Player Match Fees (₹20,000/day)',
    entryFee: 'Affiliated State Cricket Association Selection Only',
    teamOrIndividual: 'Team',
    officialNoticeUrl: 'https://bcci.tv/domestic',
    rulebookPdfUrl: 'https://bcci.tv/documents/playing-conditions',
    registrationUrl: 'https://bcci.tv/state-associations-portal',
    organizer: 'Board of Control for Cricket in India (BCCI)',
    contactPhone: '+91 22 2289 8800',
    contactEmail: 'domestic.cricket@bcci.tv',
    verifiedBadge: true,
    featured: false,
    description: 'India’s premier domestic under-19 red-ball tournament where state teams compete in multi-day fixtures. The primary trial ground for India U-19 World Cup selections.',
    qualificationRequirements: [
      'Registration with affiliated State Cricket Association (DDCA, MCA, KSCA, PCA, CAB, etc.)',
      'BCCI Bone Density Test (TW3) clearance',
      'Digital Player ID verified in BCCI domestic database',
    ],
  },
  {
    id: 'evt-akfi-national-kabaddi-2026',
    slug: 'akfi-71st-senior-national-kabaddi-championship-2026',
    title: '71st Senior National Kabaddi Championship (Men & Women)',
    hindiTitle: '71वीं सीनियर नेशनल कबड्डी चैंपियनशिप',
    sport: 'Kabaddi',
    category: 'championship',
    sanctioningBody: 'AKFI',
    edition: '71st Edition',
    startDate: '2027-01-05',
    endDate: '2027-01-10',
    registrationDeadline: '2026-12-15',
    city: 'Rohtak',
    state: 'Haryana',
    venue: 'Maharshi Dayanand University Sports Complex, Rohtak',
    ageCategories: ['Open'],
    gender: 'Men & Women',
    prizePool: '₹20,00,000 Cash Prize & Pro Kabaddi League (PKL) Scout Showcase',
    entryFee: 'State Association Nomination',
    teamOrIndividual: 'Team',
    officialNoticeUrl: 'http://www.amatuerkabaddi.com/',
    rulebookPdfUrl: 'http://www.amatuerkabaddi.com/rules.html',
    registrationUrl: 'http://www.amatuerkabaddi.com/state-affiliates',
    organizer: 'Amateur Kabaddi Federation of India (AKFI) & Haryana Kabaddi Association',
    contactPhone: '+91 1262 274 354',
    contactEmail: 'contact@amatuerkabaddi.com',
    verifiedBadge: true,
    featured: false,
    description: 'The definitive national championship for Indian Kabaddi. All 12 Pro Kabaddi League franchises send talent scouts to identify new raiding and defending talent.',
    qualificationRequirements: [
      'Selection in State Senior Kabaddi squad through district and state trials',
      'Weight restriction compliance: Men (Max 85kg), Women (Max 75kg)',
      'AKFI registration card',
    ],
  },
  {
    id: 'evt-bfi-national-boxing-2026',
    slug: 'bfi-youth-national-boxing-championship-2026',
    title: '7th Youth Men & Women National Boxing Championship',
    hindiTitle: '7वीं राष्ट्रीय यूथ मुक्केबाजी चैंपियनशिप',
    sport: 'Boxing',
    category: 'championship',
    sanctioningBody: 'BFI',
    edition: '7th Edition',
    startDate: '2026-12-12',
    endDate: '2026-12-18',
    registrationDeadline: '2026-11-26',
    city: 'Guwahati',
    state: 'Assam',
    venue: 'Sarusajai Indoor Stadium, Guwahati',
    ageCategories: ['U-19'],
    gender: 'Men & Women',
    prizePool: '₹10,00,000 Kit Subsidies & SAI National Boxing Academy Induction',
    entryFee: '₹500 per boxer (State Unit Nomination)',
    teamOrIndividual: 'Individual',
    officialNoticeUrl: 'https://boxingfederation.in/',
    rulebookPdfUrl: 'https://boxingfederation.in/technical-rules',
    registrationUrl: 'https://boxingfederation.in/boxer-registry',
    organizer: 'Boxing Federation of India (BFI)',
    contactPhone: '+91 124 437 0792',
    contactEmail: 'info@boxingfederation.in',
    verifiedBadge: true,
    featured: false,
    description: 'Official national youth tournament across 13 weight categories. Winners receive direct entry into the Indian Youth National Boxing Camp for upcoming Asian Youth Games.',
    qualificationRequirements: [
      'BFI Boxer Registration Book with valid medical certificate',
      'Official weigh-in compliance on opening day',
      'State Boxing Association nomination seal',
    ],
  },
  {
    id: 'evt-wfi-national-wrestling-2026',
    slug: 'wfi-under-23-national-wrestling-championship-2026',
    title: 'National Under-23 Wrestling Championship (Freestyle & Greco-Roman)',
    hindiTitle: 'राष्ट्रीय अंडर-23 कुश्ती चैंपियनशिप',
    sport: 'Wrestling',
    category: 'championship',
    sanctioningBody: 'WFI',
    edition: '2026 Edition',
    startDate: '2026-12-26',
    endDate: '2026-12-29',
    registrationDeadline: '2026-12-05',
    city: 'Patiala',
    state: 'Punjab',
    venue: 'NIS Patiala Indoor Sports Arena, Patiala',
    ageCategories: ['U-19', 'Open'],
    gender: 'Men & Women',
    prizePool: 'Medals, Railways / Services Sports Quota Trial Invitations',
    entryFee: 'State Association Quota Entry',
    teamOrIndividual: 'Individual',
    officialNoticeUrl: 'https://wrestlingfederationofindia.org/',
    rulebookPdfUrl: 'https://wrestlingfederationofindia.org/uww-rules',
    registrationUrl: 'https://wrestlingfederationofindia.org/entry-forms',
    organizer: 'Wrestling Federation of India & Punjab Wrestling Association',
    contactPhone: '+91 175 221 1607',
    contactEmail: 'office@wrestlingfederationofindia.org',
    verifiedBadge: true,
    featured: false,
    description: 'Premier U-23 wrestling meet uniting India’s top traditional dangal akharas and modern mat wrestlers vying for national squad berths.',
    qualificationRequirements: [
      'UWW / WFI License holder',
      'Medical fitness and skin check clearance prior to draw',
      'Strict official weigh-in on morning of competition',
    ],
  },
  {
    id: 'evt-ttfi-national-table-tennis-2026',
    slug: 'ttfi-86th-senior-national-table-tennis-championships-2026',
    title: '86th Senior National Table Tennis Championships',
    hindiTitle: '86वीं सीनियर नेशनल टेबल टेनिस चैंपियनशिप',
    sport: 'Table Tennis',
    category: 'championship',
    sanctioningBody: 'TTFI',
    edition: '86th National Edition',
    startDate: '2027-01-14',
    endDate: '2027-01-21',
    registrationDeadline: '2026-12-20',
    city: 'Surat',
    state: 'Gujarat',
    venue: 'Pandit Deendayal Upadhyay Indoor Stadium, Surat',
    ageCategories: ['Open'],
    gender: 'Men & Women',
    prizePool: '₹16,00,000 Cash Purse + Ultimate Table Tennis (UTT) Draft Ranking Points',
    entryFee: 'State Association / Institution Quota',
    teamOrIndividual: 'Individual & Team',
    officialNoticeUrl: 'https://ttfi.org/',
    rulebookPdfUrl: 'https://ttfi.org/rules-regulations',
    registrationUrl: 'https://ttfi.org/national-entries',
    organizer: 'Table Tennis Federation of India (TTFI)',
    contactPhone: '+91 11 2337 9870',
    contactEmail: 'ttfi@ttfi.org',
    verifiedBadge: true,
    featured: false,
    description: 'National championship featuring Olympians, national ranking leaders, and top state champions competing for the Pithapuram Cup and Travancore Cup.',
    qualificationRequirements: [
      'TTFI Player ID number in good standing',
      'State Association or Institutional team (Petroleum, Railways, Services) affiliation',
      'ITTF approved rubber and equipment compliance',
    ],
  },
  {
    id: 'evt-aiu-inter-university-athletics-2026',
    slug: 'all-india-inter-university-athletics-meet-2026',
    title: '84th All India Inter-University Athletics Meet (Men & Women)',
    hindiTitle: '84वीं अखिल भारतीय अंतर-विश्वविद्यालय एथलेटिक्स प्रतियोगिता',
    sport: 'Athletics',
    category: 'championship',
    sanctioningBody: 'Khelo India / SAI',
    edition: '84th Edition',
    startDate: '2027-01-08',
    endDate: '2027-01-13',
    registrationDeadline: '2026-12-10',
    city: 'Kochi',
    state: 'Kerala',
    venue: 'Maharaja’s College Stadium & CUSAT Sports Complex, Kochi',
    ageCategories: ['Collegiate', 'Open'],
    gender: 'Men & Women',
    prizePool: 'Khelo India University Games (KIUG) Direct Qualification Berths',
    entryFee: 'University Sports Board Affiliation',
    teamOrIndividual: 'Individual & Team',
    officialNoticeUrl: 'https://aiu.ac.in/sports',
    rulebookPdfUrl: 'https://aiu.ac.in/rules-and-regulations',
    registrationUrl: 'https://aiu.ac.in/sports-portal',
    organizer: 'Association of Indian Universities (AIU)',
    contactPhone: '+91 11 2323 0059',
    contactEmail: 'sports@aiu.ac.in',
    verifiedBadge: true,
    featured: false,
    description: 'The single most competitive collegiate track and field meet in India. Top 4 finishers automatically book spots in the World University Games trials.',
    qualificationRequirements: [
      'Bonafide enrolled regular university/college student below 25 years of age',
      'University Sports Council eligibility performa signed by Registrar',
      'Adherence to AIU Anti-Doping code (NADA compliant)',
    ],
  },
  {
    id: 'evt-delhi-state-badminton-2026',
    slug: 'delhi-state-badminton-ranking-championship-2026',
    title: 'Delhi State Junior & Senior Badminton Ranking Championship',
    hindiTitle: 'दिल्ली राज्य जूनियर व सीनियर बैडमिंटन रैंकिंग चैंपियनशिप',
    sport: 'Badminton',
    category: 'championship',
    sanctioningBody: 'BAI',
    edition: '2026 State Circuit',
    startDate: '2026-11-26',
    endDate: '2026-11-30',
    registrationDeadline: '2026-11-19',
    city: 'New Delhi',
    state: 'Delhi NCR',
    venue: 'Indira Gandhi Indoor Stadium, ITO, New Delhi',
    ageCategories: ['U-17', 'U-19', 'Open'],
    gender: 'Boys & Girls',
    prizePool: '₹3,50,000 Cash Purse + State Ranking Points for National Quota',
    entryFee: '₹800 (Singles) / ₹1,400 (Doubles)',
    teamOrIndividual: 'Individual & Team',
    officialNoticeUrl: 'https://delhibadminton.org/',
    rulebookPdfUrl: 'https://delhibadminton.org/prospectus-2026',
    registrationUrl: 'https://delhibadminton.org/register',
    organizer: 'Delhi Capital Badminton Association (DCBA)',
    contactPhone: '+91 11 2337 0122',
    contactEmail: 'dcba.delhi@gmail.com',
    verifiedBadge: true,
    featured: false,
    description: 'Official state ranking tournament determining Delhi state squad selection for the upcoming North Zone and National Badminton Championships.',
    qualificationRequirements: [
      'Valid BAI ID (Badminton Association of India)',
      'Delhi domicile or resident studying/training in NCR for past 12 months',
      'Online entry submission prior to draw publication',
    ],
  },
  {
    id: 'evt-maharashtra-state-football-2026',
    slug: 'maharashtra-youth-state-football-league-2026',
    title: 'WIFA Maharashtra Youth Championship League (U-14 & U-17)',
    hindiTitle: 'विफ़ा महाराष्ट्र यूथ फुटबॉल लीग',
    sport: 'Football',
    category: 'league',
    sanctioningBody: 'AIFF',
    edition: '2026 Season',
    startDate: '2026-12-05',
    endDate: '2027-01-15',
    registrationDeadline: '2026-11-24',
    city: 'Mumbai',
    state: 'Maharashtra',
    venue: 'Cooperage Football Ground, Nariman Point, Mumbai',
    ageCategories: ['U-14', 'U-17'],
    gender: 'Boys & Girls',
    prizePool: '₹5,00,000 Team Grants + AIFF Youth I-League Qualification',
    entryFee: '₹5,000 per affiliated club squad',
    teamOrIndividual: 'Team',
    officialNoticeUrl: 'https://wifa.in/',
    rulebookPdfUrl: 'https://wifa.in/rules-and-regulations',
    registrationUrl: 'https://wifa.in/academy-entries',
    organizer: 'Western India Football Association (WIFA)',
    contactPhone: '+91 22 2284 3979',
    contactEmail: 'wifa@wifa.in',
    verifiedBadge: true,
    featured: false,
    description: 'Premier state-wide youth football league connecting Mumbai, Pune, Nagpur, and Kolhapur academies in round-robin and knockout fixtures.',
    qualificationRequirements: [
      'WIFA / AIFF registered academy or club',
      'Player CRS registration active with age verification proof',
      'Minimum 18 players with designated AFC licensed head coach',
    ],
  },
]

export const EVENT_SPORTS_FILTER = [
  'All Sports',
  'Multi-Sport',
  'Badminton',
  'Football',
  'Athletics',
  'Cricket',
  'Kabaddi',
  'Boxing',
  'Wrestling',
  'Table Tennis',
]

export const EVENT_AGE_CATEGORIES: { id: string; label: string }[] = [
  { id: 'all', label: 'All Age Groups' },
  { id: 'U-14', label: 'Under 14' },
  { id: 'U-17', label: 'Under 17' },
  { id: 'U-19', label: 'Under 19' },
  { id: 'Collegiate', label: 'Collegiate / University' },
  { id: 'Open', label: 'Open / Seniors' },
]

export const EVENT_STATES = [
  'All India / Any State',
  'Delhi NCR',
  'Karnataka',
  'Madhya Pradesh',
  'Maharashtra',
  'Odisha',
  'Punjab',
  'Haryana',
  'Assam',
  'Kerala',
  'Gujarat',
]

export const EVENT_FEDERATIONS = [
  'All Federations',
  'Khelo India / SAI',
  'SGFI',
  'BCCI',
  'AIFF',
  'BAI',
  'AFI',
  'BFI',
  'AKFI',
  'TTFI',
  'WFI',
]

export const STORAGE_SAVED_EVENTS_KEY = 'khelgrid_saved_events_v1'
export const STORAGE_EVENT_INQUIRIES_KEY = 'khelgrid_event_inquiries_v1'

export interface EventRegistrationInquiry {
  id: string
  eventId: string
  eventTitle: string
  athleteName: string
  athleteAge: string
  gender: string
  sport: string
  city: string
  phone: string
  email: string
  federationId?: string
  affiliationClubOrSchool?: string
  notes?: string
  createdAt: string
}

export function saveEventRegistrationInquiry(inquiry: Omit<EventRegistrationInquiry, 'id' | 'createdAt'>): EventRegistrationInquiry {
  const record: EventRegistrationInquiry = {
    ...inquiry,
    id: `KG-EVT-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
    createdAt: new Date().toISOString(),
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_EVENT_INQUIRIES_KEY)
      const list: EventRegistrationInquiry[] = stored ? (JSON.parse(stored) as EventRegistrationInquiry[]) : []
      list.unshift(record)
      localStorage.setItem(STORAGE_EVENT_INQUIRIES_KEY, JSON.stringify(list))
    } catch {
      // ignore quota
    }
  }

  return record
}

export function generateEventIcs(event: SportEvent): string {
  const startClean = event.startDate.replace(/-/g, '')
  const endClean = event.endDate.replace(/-/g, '')
  const title = `[KhelGrid] ${event.title}`
  const description = `${event.description}\n\nSanctioned By: ${event.sanctioningBody}\nAge Categories: ${event.ageCategories.join(', ')}\nPrize Pool: ${event.prizePool}\nVenue: ${event.venue}\nOfficial Website: ${event.officialNoticeUrl}`
  const location = `${event.venue}, ${event.city}, ${event.state}`

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KhelGrid//National Sports Events Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:khelgrid-event-${event.id}@khelgrid.com`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART;VALUE=DATE:${startClean}`,
    `DTEND;VALUE=DATE:${endClean}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}
