export interface YouTubeShortVideo {
  id: string
  youtubeVideoId: string
  title: string
  subtitle: string
  sport: 'Cricket' | 'Football' | 'Badminton' | 'Athletics' | 'Fitness'
  sportEmoji: string
  category: 'Coaching Drill' | 'Tactics' | 'Biomechanics' | 'Match Highlight'
  duration: string
  viewsCount: string
  channelName: string
  companionBookSlug?: string
  companionBookTitle?: string
}

export const YOUTUBE_SPORTS_VIDEOS: YouTubeShortVideo[] = [
  {
    id: 'yt-1',
    youtubeVideoId: 'jP0rG6s9h8w',
    title: 'Fast Bowling: Front-Knee Bracing & 140 km/h Release',
    subtitle: 'High-speed motion capture analysis of front-knee lockout and thoracic rotation',
    sport: 'Cricket',
    sportEmoji: '🏏',
    category: 'Biomechanics',
    duration: '0:48',
    viewsCount: '84K views',
    channelName: 'KhelGrid Sports Science',
    companionBookSlug: 'cricket-fast-bowling-biomechanics',
    companionBookTitle: 'Cricket Fast Bowling Biomechanics',
  },
  {
    id: 'yt-2',
    youtubeVideoId: '6lE8Uq0uL4g',
    title: 'Modern Football: Half-Space Penetration & Third-Man Runs',
    subtitle: 'Breaking down low defensive blocks with diagonal passes into corridor 4',
    sport: 'Football',
    sportEmoji: '⚽',
    category: 'Tactics',
    duration: '0:55',
    viewsCount: '112K views',
    channelName: 'KhelGrid Tactical Lab',
    companionBookSlug: 'modern-football-tactics',
    companionBookTitle: 'Modern Football Tactics & Spatial Pressing',
  },
  {
    id: 'yt-3',
    youtubeVideoId: 'rJ4h2T4h7eM',
    title: 'Badminton Footwork: Kinetic Split-Step & Corner Recovery',
    subtitle: 'Mastering the pre-hop timing to accelerate 0.15s faster to rear and net corners',
    sport: 'Badminton',
    sportEmoji: '🏸',
    category: 'Coaching Drill',
    duration: '0:42',
    viewsCount: '63K views',
    channelName: 'National Badminton Hub',
    companionBookSlug: 'badminton-footwork-tactics',
    companionBookTitle: 'Badminton Kinetic Footwork & Tactics',
  },
  {
    id: 'yt-4',
    youtubeVideoId: 'd92y3Ew358k',
    title: 'Sprint Acceleration: The 45-Degree Drive Phase Piston',
    subtitle: 'Positive shin angles and ground reaction force in the first 20 meters',
    sport: 'Athletics',
    sportEmoji: '🏃',
    category: 'Biomechanics',
    duration: '0:36',
    viewsCount: '95K views',
    channelName: 'Sprint Speed Academy',
    companionBookSlug: 'athletics-speed-mechanics',
    companionBookTitle: 'Athletics Sprint Mechanics',
  },
  {
    id: 'yt-5',
    youtubeVideoId: 'y07Z3q4lM0c',
    title: 'ACL Prevention: Dynamic Valgus Correction & Deceleration',
    subtitle: 'FIFA 11+ landing protocols to prevent non-contact knee ligament tears on turf',
    sport: 'Fitness',
    sportEmoji: '🛡️',
    category: 'Coaching Drill',
    duration: '0:50',
    viewsCount: '52K views',
    channelName: 'Sports Physiotherapy India',
    companionBookSlug: 'injury-prevention-protocols',
    companionBookTitle: 'ACL & Soft Tissue Injury Prevention',
  },
  {
    id: 'yt-6',
    youtubeVideoId: 'Oa1uD2W-4-8',
    title: 'Yo-Yo Intermittent Recovery Test: Pacing & Turnaround Mastery',
    subtitle: 'Official national combine protocol to hit level 19+ without premature exhaustion',
    sport: 'Fitness',
    sportEmoji: '⚡',
    category: 'Match Highlight',
    duration: '0:58',
    viewsCount: '78K views',
    channelName: 'Grassroots Talent Scouting',
    companionBookSlug: 'athlete-mental-conditioning',
    companionBookTitle: 'The Athlete Mindset',
  },
]
