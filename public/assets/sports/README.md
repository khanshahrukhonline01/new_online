# KhelGrid Sport Icon Assets & Pictograms

This directory contains the complete visual asset collection for all **34 verified sports** on KhelGrid.

## Architecture & Storage Structure

1. **Sprite Sheet (`sport-icons.svg`)**:
   - A single, optimized SVG sprite containing `<symbol id="...">` elements for each of the 34 sports.
   - Referenced client-side by `<use href="/assets/sports/sport-icons.svg#<slug>" />` via the React component `src/shared/sports/sportIcons.tsx` (`<SportIcon name="..." />`).
   - Ensures ultra-low latency, zero layout shift, and instant rendering with no additional network waterfalls.

2. **Standalone Sport SVGs (`<slug>.svg`)**:
   - Dedicated standalone 64×64 SVG files for all 34 sports.
   - Useful for external consumers, Open Graph preview metadata, native web manifests, and direct image references (`<img src="/assets/sports/<slug>.svg" />`).

## Directory Manifest (All 34 Sports)

| # | Sport Name | SVG Slug | Standalone File | Sprite Symbol ID |
|---|---|---|---|---|
| 1 | Archery | `archery` | `archery.svg` | `#archery` |
| 2 | Athletics | `athletics` | `athletics.svg` | `#athletics` |
| 3 | Badminton | `badminton` | `badminton.svg` | `#badminton` |
| 4 | Basketball | `basketball` | `basketball.svg` | `#basketball` |
| 5 | Boxing | `boxing` | `boxing.svg` | `#boxing` |
| 6 | Chess | `chess` | `chess.svg` | `#chess` |
| 7 | Cricket | `cricket` | `cricket.svg` | `#cricket` |
| 8 | Cycling | `cycling` | `cycling.svg` | `#cycling` |
| 9 | Equestrian | `equestrian` | `equestrian.svg` | `#equestrian` |
| 10 | Fencing | `fencing` | `fencing.svg` | `#fencing` |
| 11 | Football | `football` | `football.svg` | `#football` |
| 12 | Futsal | `futsal` | `futsal.svg` | `#futsal` |
| 13 | Golf | `golf` | `golf.svg` | `#golf` |
| 14 | Gymnastics | `gymnastics` | `gymnastics.svg` | `#gymnastics` |
| 15 | Handball | `handball` | `handball.svg` | `#handball` |
| 16 | Hockey | `hockey` | `hockey.svg` | `#hockey` |
| 17 | Judo | `judo` | `judo.svg` | `#judo` |
| 18 | Kabaddi | `kabaddi` | `kabaddi.svg` | `#kabaddi` |
| 19 | Karate | `karate` | `karate.svg` | `#karate` |
| 20 | Martial Arts | `martial-arts` | `martial-arts.svg` | `#martial-arts` |
| 21 | Pickleball | `pickleball` | `pickleball.svg` | `#pickleball` |
| 22 | Rowing | `rowing` | `rowing.svg` | `#rowing` |
| 23 | Rugby | `rugby` | `rugby.svg` | `#rugby` |
| 24 | Shooting | `shooting` | `shooting.svg` | `#shooting` |
| 25 | Skating | `skating` | `skating.svg` | `#skating` |
| 26 | Squash | `squash` | `squash.svg` | `#squash` |
| 27 | Swimming | `swimming` | `swimming.svg` | `#swimming` |
| 28 | Table Tennis | `table-tennis` | `table-tennis.svg` | `#table-tennis` |
| 29 | Taekwondo | `taekwondo` | `taekwondo.svg` | `#taekwondo` |
| 30 | Tennis | `tennis` | `tennis.svg` | `#tennis` |
| 31 | Volleyball | `volleyball` | `volleyball.svg` | `#volleyball` |
| 32 | Weightlifting | `weightlifting` | `weightlifting.svg` | `#weightlifting` |
| 33 | Wrestling | `wrestling` | `wrestling.svg` | `#wrestling` |
| 34 | Yoga | `yoga` | `yoga.svg` | `#yoga` |

## Usage Guidelines

- **In React components**: Always import `SportIcon` from `src/shared/sports/sportIcons.tsx`:
  ```tsx
  import { SportIcon } from '../../shared/sports/sportIcons'

  <SportIcon name="badminton" size={40} />
  ```
- **In HTML / Markdown / Static contexts**: Reference either the sprite `#symbol` or the direct file path:
  ```html
  <img src="/assets/sports/archery.svg" alt="Archery" width="48" height="48" />
  ```
