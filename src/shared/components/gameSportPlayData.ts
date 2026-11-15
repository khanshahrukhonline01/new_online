import type { SiteIconName } from './SiteIcon'

export interface DirectoryLink {
  label: string
  href: string
  tag?: string
}

export interface DirectoryCategory {
  title: string
  icon: SiteIconName
  subtitle: string
  links: DirectoryLink[]
}

export const GAME_SPORT_PLAY_DIRECTORIES: DirectoryCategory[] = [
  {
    title: 'Game, Sport & Play Essentials',
    icon: 'trophy',
    subtitle: 'Core athlete pathways & registries',
    links: [
      { label: 'Game & Match Finder', href: '/search?q=game&sport=All+Sports&city=All+Locations&sort=Soonest&free=false' },
      { label: 'Sport Academies & Selections', href: '/academy' },
      { label: 'Play Pickup Matches & Box Games', href: '/play' },
      { label: 'Khiladi (खिलाड़ी) Talent Directory', href: '/search?q=khiladi&sport=All+Sports&city=All+Locations&sort=Soonest&free=false' },
      { label: 'Desi Khel & Olympic Disciplines', href: '/sports' },
      { label: 'Grassroots Athlete Passport', href: '/start-from-zero', tag: 'Scout ID' },
      { label: 'Verified Sports CV Maker', href: '/start-from-zero' },
      { label: 'AI Training Drills & Playbook', href: '/learning-hub' },
      { label: 'Talent Scanner Fitness Tests', href: '/talent-scanner' },
    ],
  },
  {
    title: 'Maidan, Turf & Net Practice',
    icon: 'map-pin',
    subtitle: 'Local play spaces & facilities',
    links: [
      { label: 'Book Turf Near Me (मैदान)', href: '/book', tag: 'Hourly Slot' },
      { label: 'Box Cricket Turf & Nets', href: '/book' },
      { label: 'Badminton Court Hourly Booking', href: '/book' },
      { label: 'Futsal Arenas & 5v5 Pitches', href: '/book', tag: '5v5 FIFA' },
      { label: 'Gully Cricket & Community Games', href: '/play' },
      { label: 'Swimming Pool Hourly Passes', href: '/book' },
      { label: 'Tennis Clay & Synthetic Courts', href: '/book' },
      { label: 'Basketball Wooden Sprung Courts', href: '/book' },
      { label: 'Table Tennis Arenas & Clubs', href: '/book' },
    ],
  },
  {
    title: 'Akhada, Dangal & Combat',
    icon: 'medal',
    subtitle: 'Traditional martial arts & combat',
    links: [
      { label: 'Akhada (अखाड़ा) & Wrestling Camps', href: '/search?q=akhada&sport=Wrestling&city=All+Locations&sort=Soonest&free=false', tag: 'Desi Khel' },
      { label: 'Dangal (दंगल) & Kusti Combines', href: '/search?q=dangal&sport=Wrestling&city=All+Locations&sort=Soonest&free=false', tag: 'Kusti' },
      { label: 'Kabaddi Panga & Raid Trials', href: '/search?q=kabaddi&sport=Kabaddi&city=All+Locations&sort=Soonest&free=false' },
      { label: 'Kho-Kho Junior National Trials', href: '/search?q=kho-kho&sport=Kho-Kho&city=All+Locations&sort=Soonest&free=false' },
      { label: 'Mitti Ka Khel Traditional Combines', href: '/search?q=mitti&sport=All+Sports&city=All+Locations&sort=Soonest&free=false' },
      { label: 'Mallakhamb & Indigenous Sports', href: '/sports' },
      { label: 'Wushu Sanda & Taolu Combines', href: '/sports/wushu' },
      { label: 'Judo & Karate State Selections', href: '/search?q=karate&sport=All+Sports&city=All+Locations&sort=Soonest&free=false' },
      { label: 'Boxing Rings & Bhiwani Sparring', href: '/sports/boxing' },
    ],
  },
  {
    title: 'National Trials & SAI NCOE',
    icon: 'building',
    subtitle: 'Olympic & SAI high-performance',
    links: [
      { label: 'Sports Authority of India (SAI) Trials', href: '/search?q=SAI&sport=All+Sports&city=All+Locations&sort=Soonest&free=false', tag: 'SAI NCOE' },
      { label: 'SAI National Centres of Excellence', href: '/academy' },
      { label: 'Khelo India State Centres (KISCE)', href: '/academy' },
      { label: 'Army Sports Institute (ASI Pune)', href: '/academy', tag: 'Armed Forces' },
      { label: 'Tata Archery & Football Academies', href: '/academy', tag: 'Premier' },
      { label: 'Gopichand Badminton Academy', href: '/academy' },
      { label: 'Inspire Institute of Sport (IIS Bellary)', href: '/academy', tag: 'Elite High-Perf' },
      { label: 'Usha School of Athletics Kerala', href: '/academy' },
      { label: 'Chhatrasal Stadium Wrestling Combine', href: '/academy' },
    ],
  },
  {
    title: 'Govt Sports Quota Recruitment',
    icon: 'badge-check',
    subtitle: 'Public sector & uniformed services',
    links: [
      { label: 'Government Sports Quota Recruitment', href: '/search?q=quota&sport=All+Sports&city=All+Locations&sort=Soonest&free=false' },
      { label: 'CRPF Meritorious Sportspersons 2026', href: '/search?q=CRPF&sport=All+Sports&city=All+Locations&sort=Soonest&free=false', tag: 'New 2026' },
      { label: 'Indian Railways Sports Quota Trials', href: '/search?q=railways&sport=All+Sports&city=All+Locations&sort=Soonest&free=false', tag: 'Govt Post' },
      { label: 'State Police Sports Quota Entry', href: '/search?q=police&sport=All+Sports&city=All+Locations&sort=Soonest&free=false', tag: 'Police Post' },
      { label: 'Armed Forces Sports Quota Enrolment', href: '/search?q=army&sport=All+Sports&city=All+Locations&sort=Soonest&free=false' },
      { label: 'Bank & PSU Sports Quota Vacancies', href: '/search?q=sports+quota&sport=All+Sports&city=All+Locations&sort=Soonest&free=false' },
      { label: 'CISF & ITBP Sports Selections', href: '/search?q=cisf&sport=All+Sports&city=All+Locations&sort=Soonest&free=false' },
      { label: 'State Police Head Constable Trials', href: '/search?q=constable&sport=All+Sports&city=All+Locations&sort=Soonest&free=false' },
      { label: 'Universities Sports Quota AIU Meets', href: '/search?q=university&sport=All+Sports&city=All+Locations&sort=Soonest&free=false' },
    ],
  },
  {
    title: 'Age Categories & Leagues',
    icon: 'calendar',
    subtitle: 'Competitive age brackets & circuits',
    links: [
      { label: 'BCCI Ranji Trophy Cricket Trials', href: '/search?q=Ranji&sport=Cricket&city=All+Locations&sort=Soonest&free=false', tag: 'State League' },
      { label: 'Khel Maharan 3.0 Assam Registrations', href: '/search?q=Khel+Maharan&sport=All+Sports&city=All+Locations&sort=Soonest&free=false' },
      { label: 'Under-14 Sub-Junior Selection Camps', href: '/search?q=&sport=All+Sports&city=All+Locations&category=U-14+%2F+Sub-Junior&sort=Soonest&free=false', tag: 'U-14' },
      { label: 'Under-16 Junior State Cricket Trials', href: '/search?q=&sport=Cricket&city=All+Locations&category=U-16+%2F+Junior&sort=Soonest&free=false' },
      { label: 'Under-19 Youth National Championship', href: '/search?q=&sport=All+Sports&city=All+Locations&category=U-19+%2F+Youth&sort=Soonest&free=false' },
      { label: 'Under-23 Emerging Athlete Combines', href: '/search?q=&sport=All+Sports&city=All+Locations&category=U-23+%2F+Emerging&sort=Soonest&free=false' },
      { label: 'Senior Open Sports Competitions', href: '/search?q=&sport=All+Sports&city=All+Locations&category=Senior+Open&sort=Soonest&free=false' },
      { label: 'ISL & I-League Football Youth Trials', href: '/sports/football', tag: 'Pro Youth' },
      { label: 'Pro Kabaddi Grassroots Talent Hunt', href: '/sports/kabaddi', tag: 'PKL Talent' },
    ],
  },
]
