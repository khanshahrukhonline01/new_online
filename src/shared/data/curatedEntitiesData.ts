import type { Academy, Venue } from '../domain'

export interface EntityFaq {
  question: string
  answer: string
}

export interface CuratedAcademy extends Academy {
  sport: string
  address: string
  phone: string
  head_coach: string
  facilities: string[]
  age_groups: string[]
  timings: string
  fee_structure: string
  admission_open: boolean
  rating: number
  review_count: number
  curriculum_highlights: string[]
  faqs: EntityFaq[]
}

export interface CuratedVenue extends Venue {
  sport: string
  address: string
  state?: string
  phone: string
  timings: string
  surface_type: string
  court_count: string
  pricing: string
  facilities: string[]
  rules: string[]
  rating: number
  review_count: number
  faqs: EntityFaq[]
}

export const CURATED_ACADEMIES: CuratedAcademy[] = [
  {
    id: 'acad-bfc-bengaluru',
    slug: 'bengaluru-fc-academy',
    name: 'Bengaluru FC Youth Academy',
    sport: 'Football',
    description: 'The premier youth football training academy in India, providing professional AIFF 3-star rated development, structured age-group tactical pathways, and direct progression into senior professional leagues. Training sessions follow the AFC certified curriculum focusing on modern possession play, positional awareness, and high-intensity match fitness.',
    city: 'Bengaluru',
    state: 'Karnataka',
    address: 'Bengaluru FC Residential Academy, Bellary Road, Bengaluru, Karnataka 560064',
    website_url: 'https://www.bengalurufc.com/academy',
    public_contact_url: 'https://wa.me/918022212345?text=Hi%2C%20I%20am%20enquiring%20about%20Bengaluru%20FC%20Academy%20admissions%20via%20KhelGrid',
    phone: '+91 80 2221 2345',
    email: 'academy@bengalurufc.com',
    verification_status: 'verified',
    is_featured: true,
    head_coach: 'AFC Pro Licensed Coaching Staff',
    facilities: [
      'FIFA Standard Artificial Turf',
      'Floodlit Practice Pitches',
      'Sports Science & Recovery Lab',
      'Video Analytics Theatre',
      'Physiotherapy & Hydrotherapy Center',
      'Gymnasium & Conditioning Facility',
      'Player Locker Rooms',
      'Secure Campus Parking',
    ],
    age_groups: ['Under-9 Grassroots', 'Under-13 Sub-Junior', 'Under-15 Junior', 'Under-17 Elite', 'Under-19 Reserves'],
    timings: 'Morning: 6:00 AM – 8:30 AM | Evening: 4:30 PM – 7:00 PM (Tuesday – Sunday)',
    fee_structure: '₹3,500/month (Scholarships available for national-level talent)',
    admission_open: true,
    rating: 4.9,
    review_count: 142,
    curriculum_highlights: [
      'Positional play & tactical decision-making drills',
      'GPS vest performance monitoring & speed telemetry',
      'Individualized nutrition & recovery planning',
      'Competitive match exposure in AIFF Youth Leagues',
    ],
    faqs: [
      {
        question: 'How do I register for a trial session at Bengaluru FC Academy?',
        answer: 'You can submit your athlete profile via KhelGrid or click the Enquire on WhatsApp button to book an open evaluation session with our youth scouts.',
      },
      {
        question: 'Are scholarship quotas available for economically weaker athletes?',
        answer: 'Yes, full merit-based residential scholarships covering training, lodging, and schooling are awarded to standout performers during annual state selection trials.',
      },
      {
        question: 'What gear is required for the first training session?',
        answer: 'Athletes should arrive in standard training bibs, molded stud football boots (suitable for artificial turf), shin guards, and personal hydration bottles.',
      },
    ],
  },
  {
    id: 'acad-gopichand-hyderabad',
    slug: 'pullela-gopichand-badminton-academy',
    name: 'Pullela Gopichand Badminton Academy',
    sport: 'Badminton',
    description: 'World-renowned high performance badminton training center responsible for producing Olympic medalists and international champions. The facility houses 8 international tournament standard air-conditioned wooden courts with synthetic Yonex mats, specialized athletic agility tracks, and full-time SAI national coaches.',
    city: 'Hyderabad',
    state: 'Telangana',
    address: 'ISB Road, Financial District, Nanakramguda, Gachibowli, Hyderabad, Telangana 500032',
    website_url: 'https://pgba.in',
    public_contact_url: 'https://wa.me/914023000000?text=Hi%2C%20enquiring%20about%20Pullela%20Gopichand%20Badminton%20Academy%20via%20KhelGrid',
    phone: '+91 40 2300 0000',
    email: 'info@pgba.in',
    verification_status: 'verified',
    is_featured: true,
    head_coach: 'Pullela Gopichand (Chief National Coach)',
    facilities: [
      '8 BWF Tournament Synthetic Wooden Courts',
      'Air-Conditioned Indoor Arena',
      'Ice Bath & Cryotherapy Recovery Units',
      'Olympic Weightlifting Training Hall',
      'High-Speed Video Stroke Analysis',
      'On-site Sports Cafeteria',
      'Athletes Hostel & Dormitory',
    ],
    age_groups: ['Beginners (Age 6–10)', 'Intermediate (Age 11–15)', 'Advanced Tournament Squad', 'National / International Core Group'],
    timings: 'Morning: 5:30 AM – 9:00 AM | Evening: 3:30 PM – 7:30 PM (Monday – Saturday)',
    fee_structure: '₹4,500/month (Evaluation screening mandatory prior to enrolment)',
    admission_open: true,
    rating: 5.0,
    review_count: 230,
    curriculum_highlights: [
      'Multi-shuttle endurance and reaction speed training',
      'Biomechanics footwork optimization on high-density shock absorbers',
      'Tournament psychological conditioning & match pressure drills',
      'Dietary tracking and body composition assessments',
    ],
    faqs: [
      {
        question: 'Is prior tournament experience required to join?',
        answer: 'Beginner batches are open for young athletes (ages 6–10). Older age categories require a baseline skill evaluation by academy coaches.',
      },
      {
        question: 'What kind of shoes are permitted on the courts?',
        answer: 'Only non-marking badminton shoes with clean rubber gum soles are permitted on the BWF tournament courts.',
      },
    ],
  },
  {
    id: 'acad-mary-kom-imphal',
    slug: 'mary-kom-regional-boxing-foundation',
    name: 'Mary Kom Regional Boxing Foundation',
    sport: 'Boxing',
    description: 'Premier Olympic combat sports academy founded by 6-time World Champion MC Mary Kom. Dedicated to identifying grassroots boxing talent and providing world-class coaching, sparring rings, punch-telemetry gear, and free residential training for underprivileged youth from across the country.',
    city: 'Imphal',
    state: 'Manipur',
    address: 'National Games Village, Zone-III, Langol, Imphal West, Manipur 795004',
    website_url: 'https://marykomfoundation.org',
    public_contact_url: 'https://wa.me/913852410000?text=Hi%2C%20enquiring%20about%20Mary%20Kom%20Boxing%20Foundation%20via%20KhelGrid',
    phone: '+91 385 241 0000',
    email: 'contact@marykomfoundation.org',
    verification_status: 'verified',
    is_featured: true,
    head_coach: 'SAI Senior Boxing Coaching Cadre',
    facilities: [
      '3 International Boxing Sparring Rings',
      'Heavy Bag & Speed Bag Stations',
      'Combat Agility & Reaction Floor',
      'Free Residential Hostel for Selected Trainees',
      'Sports Medical & Concussion Assessment Clinic',
      'Dedicated Strength & Conditioning Gymnasium',
    ],
    age_groups: ['Sub-Junior (Age 11–14)', 'Junior (Age 15–16)', 'Youth (Age 17–18)', 'Senior Elite'],
    timings: 'Morning: 6:00 AM – 9:00 AM | Evening: 4:00 PM – 7:00 PM',
    fee_structure: 'Free / Subsidized for certified grassroots trial selections',
    admission_open: true,
    rating: 4.9,
    review_count: 88,
    curriculum_highlights: [
      'Southpaw & orthodox stance tactical adaptations',
      'Punch impact resistance and defensive pivot mechanics',
      'Weight division maintenance & high-protein sports nutrition',
      'National federation championship bout preparations',
    ],
    faqs: [
      {
        question: 'Who can apply for the boxing residential scholarship?',
        answer: 'Boys and girls aged 11–16 with athletic aptitude can appear for the annual regional selection trials held at the Imphal center.',
      },
      {
        question: 'Does the foundation provide competition kits?',
        answer: 'Yes, selected scholarship boxers receive competition headguards, handwraps, sparring gloves, and boxing shoes.',
      },
    ],
  },
  {
    id: 'acad-tfa-jamshedpur',
    slug: 'tata-football-academy',
    name: 'Tata Football Academy (TFA)',
    sport: 'Football',
    description: 'Pioneering football residential academy in Jamshedpur established by Tata Steel. Over 140 graduates have represented the Indian National Football Team. Equipped with modern natural grass pitches, gym, video analysis, and medical facilities.',
    city: 'Jamshedpur',
    state: 'Jharkhand',
    address: 'Inner Circle Road, Bistupur, Jamshedpur, Jharkhand 831001',
    website_url: 'https://www.tatasteel.com/sports/tata-football-academy',
    public_contact_url: 'https://wa.me/916572225000?text=Hi%2C%20enquiring%20about%20Tata%20Football%20Academy%20via%20KhelGrid',
    phone: '+91 657 222 5000',
    email: 'tfa@tatasteel.com',
    verification_status: 'verified',
    is_featured: true,
    head_coach: 'UEFA / AFC A-Licensed Youth Director',
    facilities: [
      '3 International Regulation Natural Grass Pitches',
      'High-Performance Conditioning Center',
      'Fully Equipped Physiotherapy Wing',
      'Residential Quarters & Nutrition Mess',
      'Audio-Visual Briefing Room',
    ],
    age_groups: ['Under-14 Youth Cadets', 'Under-16 Junior Cadets', 'Under-18 Elite Squad'],
    timings: 'Daily training camp schedule',
    fee_structure: '100% Free Full Residential Scholarship (National Trials Selection)',
    admission_open: true,
    rating: 5.0,
    review_count: 195,
    curriculum_highlights: [
      'Technical ball mastery under high press',
      'Positional transition and compact defensive structure',
      'Annual European / Asian exposure tournaments',
    ],
    faqs: [
      {
        question: 'How are cadets selected for TFA?',
        answer: 'Cadets are selected through nationwide open trials organized across major zones in India every two years.',
      },
    ],
  },
]

export const CURATED_VENUES: CuratedVenue[] = [
  {
    id: 'venue-kanteerava-bengaluru',
    slug: 'sree-kanteerava-stadium',
    name: 'Sree Kanteerava Stadium',
    sport: 'Athletics & Football',
    description: 'Iconic multi-purpose sports complex situated in central Bengaluru. Features a world-class 8-lane synthetic polyurethane athletic running track, natural turf football arena with 25,000 seating capacity, floodlights, and adjacent indoor court complex.',
    city: 'Bengaluru',
    state: 'Karnataka',
    address: 'Kasturba Road, Sampangi Rama Nagar, Bengaluru, Karnataka 560001',
    phone: '+91 80 2227 1234',
    email: 'kanteerava.sports@karnataka.gov.in',
    timezone: 'Asia/Kolkata',
    government_facility: true,
    is_featured: true,
    timings: '5:30 AM – 9:30 PM (Open 7 Days)',
    surface_type: 'IAAF Certified Synthetic Track & Natural Bermuda Grass Pitch',
    court_count: '1 Main Stadium · 1 Practice Track · 2 Indoor Basketball Courts',
    pricing: 'Public jogging passes from ₹150/mo · Booking rates on application',
    facilities: [
      '8-Lane Synthetic Athletic Track',
      '25,000 Capacity Stadium Seating',
      'Modern High-Lux Floodlights',
      'Athlete Locker & Shower Rooms',
      'Dedicated Media & VIP Pavilion',
      'Spacious Public Parking Grounds',
    ],
    rules: [
      'Spikes with max 6mm length allowed on synthetic track',
      'No street footwear permitted on natural turf',
      'Prior booking permit required for private tournaments',
    ],
    rating: 4.8,
    review_count: 312,
    faqs: [
      {
        question: 'Is the track open for general public morning jogging?',
        answer: 'Yes, public entry passes are available at the stadium reception for morning (5:30 AM – 8:00 AM) and evening (5:00 PM – 7:30 PM) running slots.',
      },
      {
        question: 'How can our club book the main pitch for a football match?',
        answer: 'Ground allotment requests can be submitted to the Department of Youth Empowerment and Sports (DYES) Karnataka office inside the stadium premises.',
      },
    ],
  },
  {
    id: 'venue-jln-delhi',
    slug: 'jawaharlal-nehru-stadium',
    name: 'Jawaharlal Nehru Stadium',
    sport: 'Multi-Sport Complex',
    description: 'Premier 60,000-seat sports arena managed by the Sports Authority of India (SAI). Features international athletics tracks, world-class football pitches, weightlifting halls, archery ranges, and modern sports science facilities.',
    city: 'Delhi',
    state: 'Delhi NCR',
    address: 'Pragati Vihar, Lodhi Road, New Delhi, Delhi 110003',
    phone: '+91 11 2436 4243',
    email: 'jln.stadium@sai.gov.in',
    timezone: 'Asia/Kolkata',
    government_facility: true,
    is_featured: true,
    timings: '6:00 AM – 10:00 PM (Daily)',
    surface_type: 'Olympic Standard Mondo Track & Hybrid Grass Pitch',
    court_count: '1 Main Stadium · Warm-up Track · SAI Center of Excellence',
    pricing: 'SAI Come and Play scheme subsidised rates starting ₹500/month',
    facilities: [
      'Olympic Regulation Mondo Athletics Track',
      'High-Power Broadcast Quality Floodlights',
      'SAI National Sports Science Center',
      'Covered Spectator Stands',
      'Metro Station Direct Connectivity (JLN Stadium Metro)',
      'Multi-Level Parking Facility',
    ],
    rules: [
      'SAI valid photo identification pass required for daily access',
      'Track and field spikes must comply with World Athletics rules',
    ],
    rating: 4.9,
    review_count: 540,
    faqs: [
      {
        question: 'Is the stadium easily accessible by public transit?',
        answer: 'Yes, the Violet Line JLN Stadium Metro station is located right outside Gate No. 1.',
      },
      {
        question: 'Does SAI run coaching classes here for kids?',
        answer: 'Yes, SAI conducts the "Come & Play" youth training scheme in Athletics, Football, Table Tennis, and Archery.',
      },
    ],
  },
  {
    id: 'venue-cooperage-mumbai',
    slug: 'cooperage-football-ground',
    name: 'Cooperage Football Ground',
    sport: 'Football',
    description: 'Historic home of Mumbai football, managed by Western India Football Association (WIFA). Boasts an all-weather FIFA 2-star certified artificial turf with high-powered floodlights, player dressing rooms, and covered stadium seating in South Mumbai.',
    city: 'Mumbai',
    state: 'Maharashtra',
    address: 'Maharshi Karve Road, Nariman Point, Churchgate, Mumbai, Maharashtra 400021',
    phone: '+91 22 2284 3456',
    email: 'wifa@wifa.in',
    timezone: 'Asia/Kolkata',
    government_facility: false,
    is_featured: true,
    timings: '6:00 AM – 11:00 PM (Daily)',
    surface_type: 'FIFA 2-Star Quality Pro Artificial Turf',
    court_count: '1 Full 11v11 Pitch (Divisible into 3x 7v7 Pitches)',
    pricing: '₹2,500 – ₹5,500 per hour depending on pitch size & timing slot',
    facilities: [
      'FIFA Approved All-Weather Artificial Turf',
      'LED Floodlights for Night Matches',
      'Dressing Rooms with Showers',
      '5,000 Capacity Spectator Stand',
      'WIFA Referee and Match Official Room',
      'Pro-Shop & Refreshments Kiosk',
    ],
    rules: [
      'Strictly molded rubber studs or turf boots only; metal studs strictly prohibited',
      'Teams must vacate the pitch promptly at the end of their booked hour',
    ],
    rating: 4.8,
    review_count: 275,
    faqs: [
      {
        question: 'Can private groups book Cooperage for amateur weekend matches?',
        answer: 'Yes, 7v7 and 11v11 slots can be booked in advance subject to Mumbai Football League schedules.',
      },
      {
        question: 'Are changing rooms available?',
        answer: 'Yes, two air-conditioned changing rooms with lockers and showers are accessible for players.',
      },
    ],
  },
]

export function getCuratedAcademyBySlug(slug: string): CuratedAcademy | undefined {
  const clean = slug.toLowerCase().trim()
  return (
    CURATED_ACADEMIES.find(a => a.slug === clean) ||
    CURATED_ACADEMIES.find(a => a.slug.includes(clean) || clean.includes(a.slug))
  )
}

export function getCuratedVenueBySlug(slug: string): CuratedVenue | undefined {
  const clean = slug.toLowerCase().trim()
  return (
    CURATED_VENUES.find(v => v.slug === clean) ||
    CURATED_VENUES.find(v => v.slug.includes(clean) || clean.includes(v.slug))
  )
}
