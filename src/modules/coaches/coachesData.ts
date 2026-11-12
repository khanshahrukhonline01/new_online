export type CredentialAuthority =
  | 'all'
  | 'sai-nis'
  | 'bcci'
  | 'aiff-afc'
  | 'bwf-bai'
  | 'world-athletics'
  | 'iba-boxing'
  | 'itf-aita'
  | 'asca-sfi'
  | 'wfi-akfi'

export interface VerifiedCoach {
  id: string
  slug: string
  name: string
  sport: string
  sportCategory: string
  avatarUrl?: string
  certification: string
  credentialAuthority: CredentialAuthority
  authorityLabel: string
  city: string
  state: string
  experienceYears: number
  academyAffiliation: string
  monthlyFee: string
  feeRangeCategory: 'under-3k' | '3k-7k' | 'premium' | 'subsidized' | 'unknown'
  studentTrackRecord: string
  specialties: string[]
  languages: string[]
  rating: number
  reviewCount: number
  verifiedBadge: string
  websiteUrl?: string
  publicContactUrl?: string
  bio: string
  availableForOneOnOne: boolean
  availableForBatches: boolean
}

export interface CoachInquiryData {
  id: string
  coachId: string
  coachName: string
  athleteName: string
  parentName?: string
  phone: string
  email?: string
  ageCategory: string
  skillLevel: string
  objective: string
  preferredBatch: string
  notes?: string
  submittedAt: string
  referenceId: string
}

export const STORAGE_COACH_INQUIRIES_KEY = 'khelgrid_coach_inquiries_v1'

export const COACH_CREDENTIALS: Array<{ id: CredentialAuthority; label: string }> = [
  { id: 'all', label: 'All Credentials' },
  { id: 'sai-nis', label: 'SAI / NIS Patiala Diploma' },
  { id: 'bcci', label: 'BCCI Level 1–3 (Cricket)' },
  { id: 'aiff-afc', label: 'AIFF / AFC Licences (Football)' },
  { id: 'bwf-bai', label: 'BWF / BAI Certified (Badminton)' },
  { id: 'world-athletics', label: 'World Athletics CECS (Track & Field)' },
  { id: 'iba-boxing', label: 'IBA 1-Star / 2-Star (Boxing)' },
  { id: 'itf-aita', label: 'ITF / AITA Certified (Tennis)' },
  { id: 'asca-sfi', label: 'ASCA / SFI (Swimming)' },
  { id: 'wfi-akfi', label: 'WFI / AKFI (Wrestling & Kabaddi)' },
]

export const COACH_SPORTS = [
  'All Sports',
  'Cricket',
  'Football',
  'Badminton',
  'Athletics',
  'Boxing',
  'Tennis',
  'Swimming',
  'Wrestling',
  'Kabaddi',
  'Table Tennis',
  'Basketball',
]

export const COACH_CITIES = [
  'All Cities',
  'Delhi NCR',
  'Bengaluru',
  'Mumbai',
  'Hyderabad',
  'Kolkata',
  'Chennai',
  'Pune',
  'Patiala',
  'Imphal',
  'Jaipur',
  'Srinagar',
]

export const VERIFIED_COACHES: VerifiedCoach[] = [
  {
    id: 'coach-rajeev-sharma-cricket',
    slug: 'rajeev-sharma-cricket',
    name: 'Coach Rajeev Sharma',
    sport: 'Cricket',
    sportCategory: 'Cricket',
    certification: 'BCCI Level 3 High Performance Coach · SAI NIS Patiala Diploma',
    credentialAuthority: 'bcci',
    authorityLabel: 'BCCI & SAI Certified',
    city: 'Delhi NCR',
    state: 'Delhi',
    experienceYears: 16,
    academyAffiliation: 'National Cricket Academy (NCA) Specialist Panelist · Modern Cricket Academy Noida',
    monthlyFee: '₹5,500 / month',
    feeRangeCategory: '3k-7k',
    studentTrackRecord: 'Mentored 3 India U-19 World Cuppers & 5 Ranji Trophy pace bowlers. Former Delhi State Ranji bowling consultant.',
    specialties: ['Pace Bowling Biomechanics', 'Run-up & Crease Alignment', 'Workload & Injury Prevention', 'Tactical Death Bowling'],
    languages: ['Hindi', 'English', 'Punjabi'],
    rating: 4.9,
    reviewCount: 48,
    verifiedBadge: 'SAI & BCCI Verified',
    bio: 'Former first-class fast bowler with 16 years of high-performance coaching across NCA camps and state cricket associations. Specializes in technical video analysis and bowling pace development.',
    availableForOneOnOne: true,
    availableForBatches: true,
  },
  {
    id: 'coach-manisha-ponnappa-badminton',
    slug: 'manisha-ponnappa-badminton',
    name: 'Coach Manisha Ponnappa',
    sport: 'Badminton',
    sportCategory: 'Badminton',
    certification: 'BWF Level 2 High Performance Coach · BAI Level 2 Certified',
    credentialAuthority: 'bwf-bai',
    authorityLabel: 'BWF & BAI Certified',
    city: 'Bengaluru',
    state: 'Karnataka',
    experienceYears: 11,
    academyAffiliation: 'Padukone-Dravid Centre of Sports Excellence (CSE) Yelahanka',
    monthlyFee: '₹6,000 / month',
    feeRangeCategory: '3k-7k',
    studentTrackRecord: 'Coached 4 All-India Junior Ranking Tournament finalists and 8 Karnataka State Junior Champions.',
    specialties: ['Singles Court Footwork', 'Deceptive Net Tumble', 'Explosive Recovery', 'Tactical Point Construction'],
    languages: ['English', 'Kannada', 'Hindi'],
    rating: 4.9,
    reviewCount: 62,
    verifiedBadge: 'BWF & BAI Accredited',
    bio: 'Former national singles competitor and certified BWF Level 2 coach. Known for intensive footwork drills, match stamina conditioning, and junior competitive transition pathways.',
    availableForOneOnOne: true,
    availableForBatches: true,
  },
  {
    id: 'coach-subhashish-sengupta-football',
    slug: 'subhashish-sengupta-football',
    name: 'Coach Subhashish Sengupta',
    sport: 'Football',
    sportCategory: 'Football',
    certification: "AIFF / AFC 'A' Diploma · NIS Patiala Post Graduate Diploma (Football)",
    credentialAuthority: 'aiff-afc',
    authorityLabel: "AFC 'A' Licensed",
    city: 'Kolkata',
    state: 'West Bengal',
    experienceYears: 18,
    academyAffiliation: 'Bengal Football Academy · Mohun Bagan Youth Development Cell',
    monthlyFee: '₹3,500 / month',
    feeRangeCategory: '3k-7k',
    studentTrackRecord: 'Trained 14 I-League and ISL developmental squad footballers; former Bengal Santosh Trophy squad coach.',
    specialties: ['Positional Play', 'High-Press Transition', 'Youth Tactical IQ', 'Midfield Spatial Awareness'],
    languages: ['Bengali', 'Hindi', 'English'],
    rating: 4.8,
    reviewCount: 53,
    verifiedBadge: "AFC 'A' Licensed",
    bio: 'Over 18 years shaping grassroots Bengal and Indian football talent. Certified AFC A-License mentor focused on progressive possession play, agility coordination, and match tactical intelligence.',
    availableForOneOnOne: false,
    availableForBatches: true,
  },
  {
    id: 'coach-gurpreet-singh-athletics',
    slug: 'gurpreet-singh-athletics',
    name: 'Coach Gurpreet Singh Sandhu',
    sport: 'Athletics',
    sportCategory: 'Athletics',
    certification: 'World Athletics CECS Level 2 Sprints · SAI NIS Patiala Gold Medalist',
    credentialAuthority: 'world-athletics',
    authorityLabel: 'World Athletics & SAI NIS',
    city: 'Patiala',
    state: 'Punjab',
    experienceYears: 14,
    academyAffiliation: 'Punjab State Sports Institute · NIS Patiala Sprint Desk',
    monthlyFee: '₹2,500 / month',
    feeRangeCategory: 'under-3k',
    studentTrackRecord: 'Produced 2 Khelo India Youth Games 100m/200m Gold medalists and 6 National Junior Records.',
    specialties: ['Block Start Mechanics', 'Maximum Velocity Phase', 'Hip Drive & Ground Contact', 'Hamstring Prehab'],
    languages: ['Punjabi', 'Hindi', 'English'],
    rating: 4.9,
    reviewCount: 39,
    verifiedBadge: 'SAI NIS Gold Medalist',
    bio: 'NIS Patiala sprint specialist with World Athletics certification. Designs individualized speed microcycles, start block acceleration mechanics, and scientific sprinting periodization.',
    availableForOneOnOne: true,
    availableForBatches: true,
  },
  {
    id: 'coach-mary-komalata-boxing',
    slug: 'mary-komalata-boxing',
    name: 'Coach Mary L. Komalata',
    sport: 'Boxing',
    sportCategory: 'Boxing',
    certification: 'IBA 2-Star Coach · SAI Certified Elite Boxing Instructor',
    credentialAuthority: 'iba-boxing',
    authorityLabel: 'IBA 2-Star Coach',
    city: 'Imphal',
    state: 'Manipur',
    experienceYears: 12,
    academyAffiliation: 'Manipur State Boxing Academy · Regional Boxing Training Center Khuman Lampak',
    monthlyFee: '₹2,000 / month',
    feeRangeCategory: 'under-3k',
    studentTrackRecord: "Coached 5 National Women's Youth Gold Medalists and 1 Youth World Championship quarterfinalist.",
    specialties: ['Southpaw Angles', 'Counter-Punching Timing', 'Defensive Guard Rotation', 'High-Intensity Ring Conditioning'],
    languages: ['Manipuri', 'Hindi', 'English'],
    rating: 5.0,
    reviewCount: 34,
    verifiedBadge: 'IBA 2-Star International',
    bio: 'International boxing coach trained under Olympic mentorship pathways. Committed to developing disciplined, technically sharp youth and elite boxers across grassroots combat circuits.',
    availableForOneOnOne: true,
    availableForBatches: true,
  },
  {
    id: 'coach-vikramaditya-rao-tennis',
    slug: 'vikramaditya-rao-tennis',
    name: 'Coach Vikramaditya Rao',
    sport: 'Tennis',
    sportCategory: 'Tennis',
    certification: 'ITF Level 2 Certified Coach · AITA Level 3 Specialist',
    credentialAuthority: 'itf-aita',
    authorityLabel: 'ITF & AITA Level 2',
    city: 'Hyderabad',
    state: 'Telangana',
    experienceYears: 15,
    academyAffiliation: 'Telangana Tennis Academy · Gachibowli Stadium Elite Complex',
    monthlyFee: '₹7,500 / month',
    feeRangeCategory: 'premium',
    studentTrackRecord: 'Guided 6 ITF Junior Circuit ranking players into top 250 World Junior rankings.',
    specialties: ['Kinetic Chain Serve', 'Modern Forehand Heavy Topspin', 'Approach & Volley Transition', 'Mental Toughness in Tie-Breaks'],
    languages: ['Telugu', 'Hindi', 'English'],
    rating: 4.8,
    reviewCount: 45,
    verifiedBadge: 'ITF Level 2 Accredited',
    bio: 'Dedicated ITF Level 2 coach with 15 years developing national junior circuit contenders. Implements modern bio-mechanical stroke analysis with video breakdown and match pressure simulations.',
    availableForOneOnOne: true,
    availableForBatches: true,
  },
  {
    id: 'coach-anirudh-deshmukh-swimming',
    slug: 'anirudh-deshmukh-swimming',
    name: 'Coach Anirudh Deshmukh',
    sport: 'Swimming',
    sportCategory: 'Swimming',
    certification: 'ASCA Level 3 Coach · Swimming Federation of India (SFI) Certified',
    credentialAuthority: 'asca-sfi',
    authorityLabel: 'ASCA Level 3 Coach',
    city: 'Pune',
    state: 'Maharashtra',
    experienceYears: 13,
    academyAffiliation: 'Shiv Chhatrapati Sports Complex (Balewadi) High Performance Aquatics',
    monthlyFee: '₹4,800 / month',
    feeRangeCategory: '3k-7k',
    studentTrackRecord: 'Trained 8 National Sub-Junior Swimming Medalists and 18 Maharashtra State Champions.',
    specialties: ['Freestyle Hydrodynamics', 'Underwater Dolphin Kicks', 'Lactate Threshold Sets', 'Fast Flip Turn Mechanics'],
    languages: ['Marathi', 'Hindi', 'English'],
    rating: 4.9,
    reviewCount: 51,
    verifiedBadge: 'ASCA Level 3 Certified',
    bio: 'Balewadi aquatic coach specializing in sprint and middle-distance stroke efficiency. Uses underwater stroke telemetry and heart rate zone pacing for youth swimmers.',
    availableForOneOnOne: true,
    availableForBatches: true,
  },
  {
    id: 'coach-devendra-rathi-wrestling',
    slug: 'devendra-rathi-wrestling',
    name: 'Coach Devendra Rathi',
    sport: 'Wrestling',
    sportCategory: 'Wrestling',
    certification: 'SAI NIS Patiala Senior Coach Diploma · WFI Certified Coach',
    credentialAuthority: 'wfi-akfi',
    authorityLabel: 'SAI NIS & WFI Certified',
    city: 'Delhi NCR',
    state: 'Haryana',
    experienceYears: 22,
    academyAffiliation: 'Chhatrasal Akhada Training Program · Rohtak Wrestling Center',
    monthlyFee: '₹1,500 / month',
    feeRangeCategory: 'subsidized',
    studentTrackRecord: 'Direct mentor to 2 Commonwealth Games Medalists and 14 Senior National Freestyle champions.',
    specialties: ['Takedown Defense', 'Leg Attacks & Ankle Lace', 'Grip Core Strength', 'Mat Match Strategy'],
    languages: ['Haryanvi', 'Hindi', 'English'],
    rating: 5.0,
    reviewCount: 76,
    verifiedBadge: 'SAI NIS Senior Coach',
    bio: 'Legendary grassroots wrestling coach who has trained national and international champions for over two decades. Focuses on explosive power, mat courage, and relentless conditioning.',
    availableForOneOnOne: true,
    availableForBatches: true,
  },
  {
    id: 'coach-rameshwar-yadav-kabaddi',
    slug: 'rameshwar-yadav-kabaddi',
    name: 'Coach Rameshwar Yadav',
    sport: 'Kabaddi',
    sportCategory: 'Kabaddi',
    certification: 'AKFI Certified Coach · NIS Patiala Kabaddi Specialist',
    credentialAuthority: 'wfi-akfi',
    authorityLabel: 'AKFI & NIS Certified',
    city: 'Jaipur',
    state: 'Rajasthan',
    experienceYears: 17,
    academyAffiliation: 'Sawai Mansingh Stadium · Rajasthan State Kabaddi Academy',
    monthlyFee: '₹2,500 / month',
    feeRangeCategory: 'under-3k',
    studentTrackRecord: 'Trained 7 Pro Kabaddi League (PKL) draft picks and Rajasthan Senior National Team members.',
    specialties: ['Toe Touches & Hand Touches', 'Corner Ankle Hold Timing', 'Chain Tackle Coordination', 'Bonus Line Agility'],
    languages: ['Hindi', 'Rajasthani'],
    rating: 4.9,
    reviewCount: 42,
    verifiedBadge: 'AKFI & NIS Certified',
    bio: 'Dedicated Kabaddi master coach with extensive experience in mat and mud styles. Known for grooming agile raiders and impenetrable corner defenders for state and national selections.',
    availableForOneOnOne: false,
    availableForBatches: true,
  },
  {
    id: 'coach-priya-chandrasekaran-tt',
    slug: 'priya-chandrasekaran-tt',
    name: 'Coach Priya Chandrasekaran',
    sport: 'Table Tennis',
    sportCategory: 'Table Tennis',
    certification: 'ITTF Level 2 Coach · TTFI Certified Master Instructor',
    credentialAuthority: 'all',
    authorityLabel: 'ITTF Level 2 Certified',
    city: 'Chennai',
    state: 'Tamil Nadu',
    experienceYears: 10,
    academyAffiliation: 'Jawaharlal Nehru Indoor Stadium · Chennai Table Tennis Academy',
    monthlyFee: '₹4,000 / month',
    feeRangeCategory: '3k-7k',
    studentTrackRecord: 'Mentored 3 Tamil Nadu State Champions and 2 National Youth Table Tennis finalists.',
    specialties: ['Third-Ball Forehand Loop', 'Backhand Flick Over Table', 'Multi-Ball Reaction Drills', 'Rubber Spin Reading'],
    languages: ['Tamil', 'English', 'Hindi'],
    rating: 4.8,
    reviewCount: 38,
    verifiedBadge: 'ITTF Level 2 Certified',
    bio: 'ITTF Level 2 instructor combining intense multi-ball practice with tactical match analysis. Focuses on lightning footwork, service disguise, and modern high-spin attacking rallies.',
    availableForOneOnOne: true,
    availableForBatches: true,
  },
  {
    id: 'coach-tariq-mir-football',
    slug: 'tariq-mir-football',
    name: 'Coach Tariq Ahmed Mir',
    sport: 'Football',
    sportCategory: 'Football',
    certification: "AFC Goalkeeping Level 2 · AIFF 'B' License",
    credentialAuthority: 'aiff-afc',
    authorityLabel: 'AFC Goalkeeping Certified',
    city: 'Srinagar',
    state: 'Jammu and Kashmir',
    experienceYears: 9,
    academyAffiliation: 'TRC Turf Stadium · Real Kashmir FC Youth Academy',
    monthlyFee: '₹3,000 / month',
    feeRangeCategory: '3k-7k',
    studentTrackRecord: 'Developed 3 I-League youth goalkeepers and Jammu & Kashmir Santosh Trophy first-choice keeper.',
    specialties: ['1v1 Bravery & Angles', 'High Cross Aerial Command', 'Two-Footed Distribution', 'Reflex Diving Mechanics'],
    languages: ['Kashmiri', 'Urdu', 'Hindi', 'English'],
    rating: 4.9,
    reviewCount: 29,
    verifiedBadge: 'AFC GK Level 2',
    bio: 'Specialized modern goalkeeper coach committed to building assertive, technically commanding keepers with excellent footwork and sweeper-keeper distribution skills.',
    availableForOneOnOne: true,
    availableForBatches: true,
  },
  {
    id: 'coach-arunachalam-basketball',
    slug: 'arunachalam-basketball',
    name: 'Coach Arunachalam K.',
    sport: 'Basketball',
    sportCategory: 'Basketball',
    certification: 'FIBA Level 2 Certified Coach · BFI Level 3 Coach',
    credentialAuthority: 'all',
    authorityLabel: 'FIBA Level 2 Coach',
    city: 'Bengaluru',
    state: 'Karnataka',
    experienceYears: 14,
    academyAffiliation: 'Kanteerava Indoor Stadium · KSBBA Elite Basketball Center',
    monthlyFee: '₹4,500 / month',
    feeRangeCategory: '3k-7k',
    studentTrackRecord: 'Coached 4 Indian Junior National Camp selectees and 6 South Zone Inter-University Champions.',
    specialties: ['Shooting Kinetic Sequence', 'Pick-and-Roll Decision Making', 'Fast-Break Spacing', 'On-Ball Lockdown Defense'],
    languages: ['Kannada', 'Tamil', 'English'],
    rating: 4.8,
    reviewCount: 33,
    verifiedBadge: 'FIBA Level 2 Certified',
    bio: 'Dynamic basketball tactician with FIBA certification. Specializes in modern perimeter spacing, high-tempo fast-break transitions, and high-percentage shooting mechanics.',
    availableForOneOnOne: true,
    availableForBatches: true,
  },
]

export function saveCoachInquiry(inquiry: Omit<CoachInquiryData, 'id' | 'submittedAt' | 'referenceId'>): CoachInquiryData {
  const referenceId = `KG-COACH-${Math.floor(100000 + Math.random() * 900000)}`
  const record: CoachInquiryData = {
    ...inquiry,
    id: `inq-${Date.now()}`,
    submittedAt: new Date().toISOString(),
    referenceId,
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem(STORAGE_COACH_INQUIRIES_KEY)
      const existing: CoachInquiryData[] = raw ? JSON.parse(raw) : []
      existing.unshift(record)
      localStorage.setItem(STORAGE_COACH_INQUIRIES_KEY, JSON.stringify(existing.slice(0, 50)))
    } catch {
      // localStorage error fallback
    }
  }

  return record
}

export function getStoredCoachInquiries(): CoachInquiryData[] {
  if (typeof window === 'undefined' || !window.localStorage) return []
  try {
    const raw = localStorage.getItem(STORAGE_COACH_INQUIRIES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}
