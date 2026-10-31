import type { SiteIconName } from './SiteIcon'

export type NotificationCategory = 'all' | 'trials' | 'turfs' | 'matches' | 'community'

export interface KhelNotification {
  id: string
  category: 'trials' | 'turfs' | 'matches' | 'community'
  title: string
  message: string
  timeAgo: string
  icon: SiteIconName
  link: string
  actionLabel?: string
  priority?: 'high' | 'normal'
}

export const BASELINE_NOTIFICATIONS: KhelNotification[] = [
  {
    id: 'notif-trial-delhi',
    category: 'trials',
    title: 'Delhi State U-17 Football Trials Registration Open',
    message: 'Official AIFF & DSA affiliated state trials commencing across Delhi NCR hubs. Registrations open.',
    timeAgo: '2h ago',
    icon: 'trophy',
    link: '/opportunities?city=Delhi',
    actionLabel: 'View Trial',
    priority: 'high',
  },
  {
    id: 'notif-match-isl',
    category: 'matches',
    title: 'ISL 2026 Match Center & Screening Lounges',
    message: 'Real-time scores, verified match statistics, and screening fan-zones active across 16 metro cities.',
    timeAgo: '4h ago',
    icon: 'activity',
    link: '/live',
    actionLabel: 'Go to Match Center',
    priority: 'high',
  },
  {
    id: 'notif-turf-ferrohub',
    category: 'turfs',
    title: 'New Venue Added: FerroHub Sports Arena',
    message: 'Bengaluru · Premium synthetic turf and multi-sport box arena verified with 0% commission.',
    timeAgo: '1d ago',
    icon: 'calendar-check',
    link: '/venues',
    actionLabel: 'Explore Turf',
  },
  {
    id: 'notif-pickup-pickleball',
    category: 'community',
    title: 'Pickup Match: Community Pickleball Doubles',
    message: 'Bengaluru · 1 spot left for tonight 7:00 PM game at FerroHub Sports. Intermediate level.',
    timeAgo: '3h ago',
    icon: 'activity',
    link: '/play',
    actionLabel: 'Join Game',
  },
  {
    id: 'notif-city-hub',
    category: 'community',
    title: 'Dynamic City Hubs are Now Live',
    message: 'Explore dedicated sports directories and local games across all 50+ Indian cities in the grid.',
    timeAgo: 'Just now',
    icon: 'sparkles',
    link: '/cities',
    actionLabel: 'Explore Cities',
  },
]
