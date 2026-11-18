export interface SportRolePreset {
  sport: string
  primaryPositions: string[]
  technicalFields: {
    battingStyles?: string[]
    bowlingStyles?: string[]
    preferredFeet?: string[]
    tacticalPositions?: string[]
    athleticsEvents?: string[]
    playingStyles?: string[]
    racketHands?: string[]
    signatureMoves?: string[]
  }
}

export const POPULAR_SPORTS_LIST = [
  'Cricket',
  'Football',
  'Athletics',
  'Badminton',
  'Kabaddi',
  'Tennis',
  'Basketball',
  'Hockey',
] as const

export const SPORT_ROLE_PRESETS: Record<string, SportRolePreset> = {
  cricket: {
    sport: 'Cricket',
    primaryPositions: [
      'Right-Arm Fast Bowler',
      'Left-Arm Fast Bowler',
      'Fast Bowling All-Rounder',
      'Top-Order Batter',
      'Middle-Order Batter',
      'Wicketkeeper-Batter',
      'Spin Bowling All-Rounder',
      'Right-Arm Leg-Spinner',
      'Left-Arm Orthodox Spinner',
      'Right-Arm Off-Spinner',
    ],
    technicalFields: {
      battingStyles: [
        'Right-Hand Bat (RHB)',
        'Left-Hand Bat (LHB)',
      ],
      bowlingStyles: [
        'Right-Arm Fast (135+ km/h)',
        'Right-Arm Medium-Fast',
        'Left-Arm Fast (130+ km/h)',
        'Left-Arm Medium-Fast',
        'Right-Arm Leg-Spin (Wrist Spin)',
        'Right-Arm Off-Break (Finger Spin)',
        'Left-Arm Orthodox (Finger Spin)',
        'Left-Arm Chinaman (Wrist Spin)',
        'Wicketkeeper (Non-Bowler)',
        'None (Pure Batter)',
      ],
    },
  },
  football: {
    sport: 'Football',
    primaryPositions: [
      'Center Back (CB)',
      'Left Back (LB)',
      'Right Back (RB)',
      'Defensive Midfielder (CDM)',
      'Central Midfielder (CM)',
      'Attacking Midfielder (CAM)',
      'Left Winger (LW)',
      'Right Winger (RW)',
      'Striker / Center Forward (ST / CF)',
      'Goalkeeper (GK)',
    ],
    technicalFields: {
      preferredFeet: [
        'Right Foot (Dominant)',
        'Left Foot (Dominant)',
        'Both Feet (Ambidextrous)',
      ],
      tacticalPositions: [
        'Box-to-Box Midfielder',
        'Ball-Playing Center Back',
        'Inverted Winger',
        'Target Man Striker',
        'Sweeper Keeper',
        'Attacking Wing-Back',
      ],
    },
  },
  athletics: {
    sport: 'Athletics (Track & Field)',
    primaryPositions: [
      '100m / 200m Sprint Specialist',
      '400m Long Sprint Specialist',
      '800m / 1500m Middle Distance',
      '5000m / 10000m Long Distance',
      '110m / 400m Hurdles Specialist',
      'Long Jump Specialist',
      'Triple Jump Specialist',
      'High Jump Specialist',
      'Javelin Throw Specialist',
      'Shot Put Specialist',
      'Discus Throw Specialist',
    ],
    technicalFields: {
      athleticsEvents: [
        '100m Sprint',
        '200m Sprint',
        '400m Sprint',
        '800m',
        '1500m',
        '5000m',
        '110m Hurdles',
        '400m Hurdles',
        'Long Jump',
        'Triple Jump',
        'High Jump',
        'Javelin Throw',
        'Shot Put',
        'Discus Throw',
      ],
    },
  },
  badminton: {
    sport: 'Badminton',
    primaryPositions: [
      'Men\'s Singles (MS)',
      'Women\'s Singles (WS)',
      'Men\'s Doubles (MD)',
      'Women\'s Doubles (WD)',
      'Mixed Doubles (XD)',
    ],
    technicalFields: {
      racketHands: [
        'Right-Handed',
        'Left-Handed (Southpaw)',
      ],
      playingStyles: [
        'Attacking Singles (Smash & Net Domination)',
        'Rally & Counter-Attacking Tactician',
        'Doubles Front-Court / Net Specialist',
        'Doubles Rear-Court / Power Smasher',
        'All-Court Defensive Specialist',
      ],
    },
  },
  tennis: {
    sport: 'Tennis',
    primaryPositions: [
      'Singles Specialist',
      'Doubles Specialist',
      'All-Court Player',
    ],
    technicalFields: {
      racketHands: [
        'Right-Handed (Two-Handed Backhand)',
        'Right-Handed (One-Handed Backhand)',
        'Left-Handed (Two-Handed Backhand)',
        'Left-Handed (One-Handed Backhand)',
      ],
      playingStyles: [
        'Aggressive Baseliner',
        'Serve & Volley Specialist',
        'Counterpuncher / Defensive Baseliner',
        'All-Court Net Rusher',
      ],
    },
  },
  kabaddi: {
    sport: 'Kabaddi',
    primaryPositions: [
      'Right Corner (Defense Anchor)',
      'Left Corner (Defense Anchor)',
      'Right Cover',
      'Left Cover',
      'Right Raider (Primary Scorer)',
      'Left Raider (Specialist Scorer)',
      'All-Rounder',
    ],
    technicalFields: {
      signatureMoves: [
        'Ankle Hold (Kona Catch)',
        'Thigh Hold',
        'Chain Tackle',
        'Running Hand Touch',
        'Toe Touch Specialist',
        'Dubki / Escape Specialist',
        'Bonus Line Touch Specialist',
      ],
    },
  },
  basketball: {
    sport: 'Basketball',
    primaryPositions: [
      'Point Guard (PG — Playmaker)',
      'Shooting Guard (SG — Perimeter Scorer)',
      'Small Forward (SF — Slash & Defend)',
      'Power Forward (PF — Paint Rebounder)',
      'Center (C — Rim Protector)',
    ],
    technicalFields: {
      preferredFeet: [
        'Right-Hand Dominant',
        'Left-Hand Dominant',
        'Ambidextrous Finisher',
      ],
    },
  },
  hockey: {
    sport: 'Field Hockey',
    primaryPositions: [
      'Goalkeeper (GK)',
      'Full Back (Defender)',
      'Half Back (Midfielder)',
      'Forward / Striker',
      'Drag-Flick Penalty Corner Specialist',
    ],
    technicalFields: {
      playingStyles: [
        'Drag-Flick PC Specialist',
        'Counter-Attacking Winger',
        'Defensive Sweeper',
        'Playmaking Center Half',
      ],
    },
  },
}

/**
 * Returns sport role preset based on sport name (case-insensitive fuzzy match).
 */
export function getSportRolePreset(sportName?: string): SportRolePreset | null {
  if (!sportName) return null
  const clean = sportName.trim().toLowerCase()
  if (clean.includes('cricket')) return SPORT_ROLE_PRESETS.cricket
  if (clean.includes('football') || clean.includes('soccer')) return SPORT_ROLE_PRESETS.football
  if (clean.includes('athletic') || clean.includes('track') || clean.includes('sprint') || clean.includes('running')) {
    return SPORT_ROLE_PRESETS.athletics
  }
  if (clean.includes('badminton')) return SPORT_ROLE_PRESETS.badminton
  if (clean.includes('tennis') && !clean.includes('table')) return SPORT_ROLE_PRESETS.tennis
  if (clean.includes('kabaddi')) return SPORT_ROLE_PRESETS.kabaddi
  if (clean.includes('basketball')) return SPORT_ROLE_PRESETS.basketball
  if (clean.includes('hockey')) return SPORT_ROLE_PRESETS.hockey
  return null
}

/**
 * Formats a cohesive technical scouting indicator string for print dossiers and scout profiles.
 */
export function formatTechnicalIndicators(params: {
  sport?: string
  battingStyle?: string
  bowlingStyle?: string
  preferredFoot?: string
  tacticalPosition?: string
  athleticsEvent?: string
  personalBest?: string
  seasonBest?: string
  playingStyle?: string
  racketHand?: string
  signatureMove?: string
  primaryFootOrHand?: string
}): string {
  const clean = (params.sport || '').trim().toLowerCase()

  if (clean.includes('cricket')) {
    const parts = [
      params.battingStyle ? `Batting: ${params.battingStyle}` : '',
      params.bowlingStyle ? `Bowling: ${params.bowlingStyle}` : '',
    ].filter(Boolean)
    return parts.join(' · ') || params.primaryFootOrHand || 'Right-Handed'
  }

  if (clean.includes('football')) {
    const parts = [
      params.preferredFoot ? `Foot: ${params.preferredFoot}` : '',
      params.tacticalPosition ? `Role: ${params.tacticalPosition}` : '',
    ].filter(Boolean)
    return parts.join(' · ') || params.primaryFootOrHand || 'Right Foot'
  }

  if (clean.includes('athletic') || clean.includes('track') || clean.includes('sprint')) {
    const parts = [
      params.athleticsEvent ? `Event: ${params.athleticsEvent}` : '',
      params.personalBest ? `PB: ${params.personalBest}` : '',
      params.seasonBest ? `SB: ${params.seasonBest}` : '',
    ].filter(Boolean)
    return parts.join(' · ') || 'Track & Field'
  }

  if (clean.includes('badminton') || clean.includes('tennis')) {
    const parts = [
      params.racketHand ? `Hand: ${params.racketHand}` : '',
      params.playingStyle ? `Style: ${params.playingStyle}` : '',
    ].filter(Boolean)
    return parts.join(' · ') || params.primaryFootOrHand || 'Right-Handed'
  }

  if (clean.includes('kabaddi')) {
    return params.signatureMove ? `Signature Move: ${params.signatureMove}` : 'Raider / Defender'
  }

  return params.primaryFootOrHand || '—'
}
