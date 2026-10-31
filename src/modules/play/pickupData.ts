export interface PickupGame {
  id: string
  sport: string
  emoji: string
  skillLevel: 'Beginner' | 'Intermediate' | 'Advanced'
  venueName: string
  city: string
  timeLabel: string
  hostName: string
  pricePerPlayer: string
  spotsOpen: number
  totalPlayers: number
  confirmedPlayers: number
  is_featured?: boolean
}

export const COMMUNITY_PICKUP_GAMES: PickupGame[] = [
  {
    id: 'pg-1',
    sport: 'Pickleball',
    emoji: '🎾',
    skillLevel: 'Intermediate',
    venueName: 'FerroHub Sports',
    city: 'Bengaluru',
    timeLabel: 'Today · 7:00 PM',
    hostName: 'Rahul S.',
    pricePerPlayer: '₹200/player',
    spotsOpen: 1,
    totalPlayers: 4,
    confirmedPlayers: 3,
    is_featured: true,
  },
  {
    id: 'pg-2',
    sport: 'Football',
    emoji: '⚽',
    skillLevel: 'Beginner',
    venueName: 'Kicks on Grass Arena',
    city: 'Bengaluru',
    timeLabel: 'Today · 8:30 PM',
    hostName: 'Aakash M.',
    pricePerPlayer: '₹250/player',
    spotsOpen: 4,
    totalPlayers: 12,
    confirmedPlayers: 8,
    is_featured: true,
  },
  {
    id: 'pg-3',
    sport: 'Badminton',
    emoji: '🏸',
    skillLevel: 'Advanced',
    venueName: 'Whitefield Sports Hub',
    city: 'Bengaluru',
    timeLabel: 'Tomorrow · 6:30 AM',
    hostName: 'Sneha K.',
    pricePerPlayer: '₹150/player',
    spotsOpen: 1,
    totalPlayers: 4,
    confirmedPlayers: 3,
  },
  {
    id: 'pg-4',
    sport: 'Cricket',
    emoji: '🏏',
    skillLevel: 'Intermediate',
    venueName: 'DDA Sports Ground',
    city: 'Delhi',
    timeLabel: 'Saturday · 7:00 AM',
    hostName: 'Vikram P.',
    pricePerPlayer: '₹180/player',
    spotsOpen: 8,
    totalPlayers: 22,
    confirmedPlayers: 14,
    is_featured: true,
  },
  {
    id: 'pg-5',
    sport: 'Tennis',
    emoji: '🎾',
    skillLevel: 'Intermediate',
    venueName: 'DLTA Tennis Complex',
    city: 'New Delhi',
    timeLabel: 'Tomorrow · 5:30 PM',
    hostName: 'Neha R.',
    pricePerPlayer: '₹220/player',
    spotsOpen: 3,
    totalPlayers: 4,
    confirmedPlayers: 1,
  },
  {
    id: 'pg-6',
    sport: 'Box Cricket',
    emoji: '🏏',
    skillLevel: 'Beginner',
    venueName: 'Turfside Arena',
    city: 'Mumbai',
    timeLabel: 'Sunday · 6:00 PM',
    hostName: 'Karan D.',
    pricePerPlayer: '₹300/player',
    spotsOpen: 4,
    totalPlayers: 10,
    confirmedPlayers: 6,
  },
  {
    id: 'pg-7',
    sport: 'Basketball',
    emoji: '🏀',
    skillLevel: 'Advanced',
    venueName: 'Regional Sports Centre',
    city: 'Kochi',
    timeLabel: 'Friday · 6:00 PM',
    hostName: 'Manish T.',
    pricePerPlayer: '₹200/player',
    spotsOpen: 5,
    totalPlayers: 10,
    confirmedPlayers: 5,
  },
  {
    id: 'pg-8',
    sport: 'Table Tennis',
    emoji: '🏓',
    skillLevel: 'Beginner',
    venueName: 'Sports City Center',
    city: 'Pune',
    timeLabel: 'Today · 7:30 PM',
    hostName: 'Pooja M.',
    pricePerPlayer: '₹120/player',
    spotsOpen: 2,
    totalPlayers: 4,
    confirmedPlayers: 2,
  },
]
