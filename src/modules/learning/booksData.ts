import { getSportsBooks, type DatabaseSportsBook } from '../../integrations/supabase/public-client'

export type BookCategory =
  | 'Tactical Play'
  | 'Biomechanics'
  | 'Strength & Conditioning'
  | 'Mental Conditioning'
  | 'Sports Nutrition'
  | 'Grassroots Coaching'

export interface BookChapter {
  id: string
  chapterNumber: number
  title: string
  readingTimeMinutes: number
  summary: string
  keyTakeaways: string[]
  content: string[]
}

export interface SportsBook {
  id: string
  title: string
  subtitle: string
  author: string
  authorRole: string
  category: BookCategory
  sport: string
  readingTimeMinutes: number
  totalPages: number
  coverEmoji: string
  coverGradient: string
  rating: number
  ratingsCount: number
  publishedYear: number
  isbn: string
  badge?: string
  description: string
  highlights: string[]
  chapters: BookChapter[]
}

export const SPORTS_BOOKS: SportsBook[] = [
  {
    id: 'modern-football-tactics',
    title: 'Modern Football Tactics & Spatial Pressing',
    subtitle: 'Positional play, pressing triggers, half-space overloads & build-up structures',
    author: 'Coach Rajeshwar Sen',
    authorRole: 'UEFA & AIFF ‘A’ License Coach · Head of Tactical Analytics',
    category: 'Tactical Play',
    sport: 'Football',
    readingTimeMinutes: 45,
    totalPages: 164,
    coverEmoji: '⚽',
    coverGradient: 'linear-gradient(135deg, #1e3a8a 0%, #0284c7 50%, #0f172a 100%)',
    rating: 4.9,
    ratingsCount: 3840,
    publishedYear: 2026,
    isbn: 'KG-978-93-8912-01',
    badge: 'Popular Manual',
    description: 'A comprehensive tactical manual bridging elite European positional systems (Juego de Posición) with South Asian ground conditions and counter-attack paradigms. Designed for modern players, coaches, and match analysts seeking mastery over spatial control.',
    highlights: [
      'Master the 5 vertical corridors (wings, half-spaces, central axis)',
      'Rest-defense configurations: 3+2 vs 2+3 structures against low blocks',
      'Cognitive pressing triggers: backward pass, bad touch, touchline trapping',
      'Inverting full-backs to create numerical superiorities in midfield',
    ],
    chapters: [
      {
        id: 'ch-1',
        chapterNumber: 1,
        title: 'The Half-Space Doctrine: Why Matches Are Won in Corridors 2 and 4',
        readingTimeMinutes: 12,
        summary: 'Deconstructing the geometry of the football pitch into five vertical zones and why the diagonal passing angles from the half-space neutralize standard 4-4-2 and 4-2-3-1 defensive lines.',
        keyTakeaways: [
          'The half-space allows direct line-of-sight to the goal and far post simultaneously.',
          'Receiving on the half-turn opens 180° field vision compared to back-to-goal center forwards.',
          'Underlapping runs by full-backs drag wide center-backs out of the penalty box.',
        ],
        content: [
          'In modern tactical theory, pitch division into wings, half-spaces, and the central corridor is the foundational grammar of positional dominance. While central spaces are heavily guarded by defensive pivots and center-backs, the half-space represents an area of defensive hesitation.',
          'When an attacking midfielder or inverted winger occupies the half-space, the opposing fullback is torn between marking the outside winger or tracking inward. If the fullback steps inside, the flank opens up for a switch of play; if they stay wide, a central penetration through the inside channel becomes immediate.',
          'Crucially, passes initiated from the half-space travel diagonally toward goal. Unlike straight vertical passes that defensive lines can clear facing forward, diagonal through-balls force defensive lines to turn while sprinting backwards toward their own keeper, drastically increasing error rates.',
          'Drill Application: Set up a 20x30m grid in the inside left channel. Play 4v2 possession with touch constraints: maximum two touches, third man run compulsory before releasing into the penalty box target gate.',
        ],
      },
      {
        id: 'ch-2',
        chapterNumber: 2,
        title: 'Rest-Defense Architecture & Counter-Pressing Triggers',
        readingTimeMinutes: 15,
        summary: 'How to arrange your remaining outfield players while your team has possession to snuff out opposition transitions within 5 seconds of ball loss (Gegenpressing).',
        keyTakeaways: [
          'A robust 3+2 rest-defense structure guards central passing lanes while full-backs push high.',
          'The immediate 3-meter sprint rule after turnover is 80% cognitive instinct, 20% athletic speed.',
          'Tactical fouls are a symptom of broken rest-defense spacing, not intelligent defending.',
        ],
        content: [
          'A team’s defensive solidity is not measured when they are defending in a block; it is determined at the exact moment they are attacking. Rest-defense (Restfeldverteidigung) refers to the positioning of players behind the ball while their side is in active possession.',
          'In a 3+2 structure, the two central center-backs and one defensive fullback maintain depth, while the defensive midfielder and an inverted teammate occupy the central circle. This creates a dense cage around the opposition’s target forward.',
          'When possession is surrendered, the team does not drop immediately. Instead, the two nearest players initiate aggressive pressure on the ball carrier within 3 seconds, taking advantage of the carrier’s head-down posture as they look for an outlet.',
          'If the counter-press fails after 5 seconds, the team must immediately transition into an organized mid-block, cutting central passing routes and funneling play toward the opposing touchline.',
        ],
      },
      {
        id: 'ch-3',
        chapterNumber: 3,
        title: 'Breaking Low Blocks: Decoy Runs, Wall Passes & Third-Man Runs',
        readingTimeMinutes: 18,
        summary: 'Practical tactical combinations to dismantle deep 5-4-1 and 5-3-2 defensive units through patient ball circulation, blind-side movements, and overload-to-isolate principles.',
        keyTakeaways: [
          'Overload the left half-space to isolate an explosive 1v1 winger on the right touchline.',
          'The third-man run is virtually impossible to defend if the second receiver acts as a one-touch bumper.',
          'Shooting from the edge of the D forces low blocks to step forward, creating pocket space behind.',
        ],
        content: [
          'Facing an opponent with eleven players behind the ball inside their defensive third is the greatest challenge in modern football. Impatient teams succumb to meaningless crosses into packed penalty boxes, which towering center-backs comfortably clear.',
          'The scientific method of breaking a low block relies on the principle of overload-to-isolate (sobrecarga para aislar). By circulating five players into the left half-space and sideline, you force the opponent’s entire defensive block to shift across.',
          'Once the shift is achieved, a rapid diagonal switch to an isolated winger gives them a 1v1 matchup with 15 meters of open grass. If the defender delays, the winger drives into the box; if the defender rushes out, an inside cut creates a shooting window.',
          'Furthermore, third-man combinations unlock compact defenses: Player A plays into Player B (who has their back to goal), and Player B lays off first-time to an onrushing Player C from deep. Because Player C was out of the defender’s field of vision when the move started, their timing cannot be tracked.',
        ],
      },
    ],
  },
  {
    id: 'cricket-fast-bowling-biomechanics',
    title: 'Cricket Fast Bowling: Biomechanics & Speed Mechanics',
    subtitle: 'Kinematic chain, front-knee bracing, spinal torque mitigation & 140+ km/h delivery protocols',
    author: 'Dr. Vikramaditya Rathore',
    authorRole: 'Sports Biomechanist · Consultant to National Bowling Academies',
    category: 'Biomechanics',
    sport: 'Cricket',
    readingTimeMinutes: 40,
    totalPages: 148,
    coverEmoji: '🏏',
    coverGradient: 'linear-gradient(135deg, #065f46 0%, #059669 50%, #064e3b 100%)',
    rating: 4.95,
    ratingsCount: 4120,
    publishedYear: 2026,
    isbn: 'KG-978-93-8912-02',
    badge: 'Elite Coaching',
    description: 'The definitive scientific manual on generating bowling velocity safely. Analyzes ground reaction forces, pelvic-shoulder separation angles, front-foot contact deceleration, and workload monitoring to eliminate lumbar stress fractures.',
    highlights: [
      'Master the front-knee lockout: converting 6-8x bodyweight into arm speed',
      'Eliminate mixed actions: aligning back-foot contact with shoulder plane',
      'The run-up speed curve: why acceleration matters more than top-end speed',
      'ACWR (Acute:Chronic Workload Ratio) guidelines for teenage pace bowlers',
    ],
    chapters: [
      {
        id: 'ch-1',
        chapterNumber: 1,
        title: 'The Kinematic Chain: Sequencing from Approach to Release',
        readingTimeMinutes: 12,
        summary: 'How momentum generated during the 18-meter run-up is channeled sequentially through the ankle, knee, hip, spine, shoulder, and fingertip.',
        keyTakeaways: [
          'Run-up momentum accounts for 15-20% of final ball velocity.',
          'Energy transfer requires proximal deceleration before distal acceleration.',
          'Over-striding at back-foot contact bleeds horizontal momentum into vertical braking.',
        ],
        content: [
          'Fast bowling is fundamentally an energy conservation and amplification problem. The bowler spends 16 to 22 strides accelerating their mass forward. At front-foot contact, this forward kinetic energy must be violently braked and redirected upward and into rotational velocity.',
          'Many grassroots bowlers believe arm pull generates speed. Biomechanical motion capture reveals that the upper extremity contributes less than 30% of release velocity; the remaining 70% originates from the ground reaction force and torso rotation.',
          'The sequence is absolute: Run-up momentum → Back-foot plant → Pelvic rotation → Torso flex and rotation → Glenohumeral internal rotation → Wrist snap. If any joint in this sequence fires too early or out of alignment, the chain leaks energy, leading to reduced speed and high soft-tissue strain.',
        ],
      },
      {
        id: 'ch-2',
        chapterNumber: 2,
        title: 'Front-Knee Bracing: The Master Lever of Pace',
        readingTimeMinutes: 14,
        summary: 'Analyzing why elite fast bowlers maintain a rigid or extending front knee from foot contact to release, acting as a catapult pivot.',
        keyTakeaways: [
          'A bent, flexing front knee absorbs momentum like a sponge; a braced knee catapults the torso forward.',
          'Eccentric quadriceps strength is the primary physical prerequisite for bracing.',
          'Front foot plant angle should be aligned 5° to 10° closed toward fine leg.',
        ],
        content: [
          'When analyzing high-speed optical capture of bowlers exceeding 145 km/h, one mechanical trait is nearly universal: an extended, stiff front knee joint (angle > 165°) during delivery stride impact.',
          'Just like a pole-vaulter’s fiberglass pole transforms forward sprint into vertical lift, a rigid front leg forces the pelvis and torso to whip over the locked joint at immense speed.',
          'Bowlers whose knee collapses into flexion (angles below 140°) lose 6 to 12 km/h instantly. Furthermore, a collapsing knee forces the lower lumbar spine to compensate with excessive hyperextension, dramatically elevating spondylolysis (stress fracture) risks.',
          'Conditioning Prescription: Heavy eccentric step-downs, isometric wall squats at 165° joint angles, and low-amplitude depth drops to train the nervous system to brace under 7x bodyweight impacts.',
        ],
      },
      {
        id: 'ch-3',
        chapterNumber: 3,
        title: 'Preventing Lumbar Stress Fractures: Mixed Action Correction',
        readingTimeMinutes: 14,
        summary: 'Identifying dangerous combinations of side-on hip alignment with front-on shoulder orientation, and progressive corrective drills.',
        keyTakeaways: [
          'A mixed action creates counter-rotation of the lumbar vertebrae while carrying peak ground reaction loads.',
          'Bowlers must pick either a pure side-on, chest-on, or semi-open action and align both segments.',
          'Strict weekly overs limits: Bowlers aged 14-18 should not exceed 30 competitive overs per week.',
        ],
        content: [
          'The lumbar stress fracture (specifically in the L4 and L5 pars interarticularis) is the occupational hazard of young pace bowlers. Clinical data confirms that 92% of these injuries occur on the non-bowling arm side due to asymmetrical hyperextension and lateral flexion combined with rotation.',
          'The most lethal biomechanical error is the "mixed action". In a mixed action, the bowler’s feet land parallel to the crease (side-on lower body), but the bowler rotates their shoulders square to the batter (front-on upper body) before back foot contact.',
          'This twists the lumbar spine under heavy load. To correct this, coaches must use video feedback aligned with floor grids. If a bowler lands side-on, their shoulders must remain perpendicular to the pitch until front-foot strike initiates pelvic rotation.',
        ],
      },
    ],
  },
  {
    id: 'athlete-mental-conditioning',
    title: 'The Athlete Mindset: Mental Conditioning & Pressure Resilience',
    subtitle: 'Pre-shot routines, self-talk reprogramming, cortisol regulation & clutch performance',
    author: 'Dr. Ananya Mukherjee',
    authorRole: 'Olympic Sports Psychologist · Mental Performance Consultant',
    category: 'Mental Conditioning',
    sport: 'Multi-Sport',
    readingTimeMinutes: 35,
    totalPages: 132,
    coverEmoji: '🧠',
    coverGradient: 'linear-gradient(135deg, #701a75 0%, #a21caf 50%, #3b0764 100%)',
    rating: 4.88,
    ratingsCount: 2950,
    publishedYear: 2026,
    isbn: 'KG-978-93-8912-03',
    badge: 'Mental Edge',
    description: 'Transform anxiety into hyper-focused execution. Based on cognitive-behavioral sports psychology, this guide provides actionable mental scripts, breathing protocols, and refocusing routines for championship pressure.',
    highlights: [
      'The 4-7-8 physiological sigh to abort autonomic panic spikes in 20 seconds',
      'Cue-word anchoring: replacing "Don’t miss" with direct motor verbs ("Drive", "Snap")',
      'Mental rehearsal protocol with vivid multisensory kinematic visualization',
      'Developing an unshakable post-error reset routine (The 3-Second Flush)',
    ],
    chapters: [
      {
        id: 'ch-1',
        chapterNumber: 1,
        title: 'Down-Regulating Cortisol: The Physiological Sigh Under Stress',
        readingTimeMinutes: 10,
        summary: 'How to use real-time autonomic nervous system tools to control heart-rate spikes during penalty kicks, match points, and final overs.',
        keyTakeaways: [
          'Panic is a physiological chain reaction that starts with shallow carbon dioxide accumulation in the lungs.',
          'Two rapid nasal inhales followed by an extended oral exhale resets the autonomic nervous system.',
          'Lowering resting heart rate by 8 bpm between rallies doubles fine-motor decision accuracy.',
        ],
        content: [
          'Under extreme competition stress—whether serving for the match in tennis, standing over an injury-time penalty kick, or defending six runs off the final ball—athletes experience the classic fight-or-flight cascade: dilated pupils, tunnel vision, elevated heart rate, and loss of fine motor control.',
          'Telling an athlete to "calm down" or "relax" fails because cognitive prefrontal control is already compromised by sympathetic arousal. The only reliable bridge to down-regulate the nervous system in real-time is the breathing mechanism.',
          'The Physiological Sigh consists of two quick inhales through the nose (the second snip tops off collapsed lung alveoli), followed by a slow, unforced exhalation through relaxed lips. Two or three repetitions immediately decrease heart rate and restore cognitive clarity within seconds.',
        ],
      },
      {
        id: 'ch-2',
        chapterNumber: 2,
        title: 'The 3-Second Error Flush: Eliminating Performance Spirals',
        readingTimeMinutes: 12,
        summary: 'Constructing physical and mental anchor routines to instantly detach from previous mistakes and return to current execution.',
        keyTakeaways: [
          'Errors only hurt performance if they infect the next 30 seconds of play.',
          'Physical triggers (adjusting a wristband, tapping the bat, cleaning soles) demarcate past from present.',
          'Neutral thinking outperforms aggressive positivity during high-adversity moments.',
        ],
        content: [
          'When an athlete drops a routine catch or concedes a cheap turnover, they experience an immediate surge of self-critical shame. In untrained minds, this error creates anticipatory dread: "What if I mess up again?" This guarantees subsequent errors.',
          'The elite performer employs the "Error Flush". It has three defined phases lasting under five seconds: 1. Acknowledge the tactical lesson objectively (e.g., "Feet were too narrow"). 2. Physical trigger: Tug the cap, readjust footwear, or wipe hands on shorts—this is the physical bookmark closing the chapter. 3. Look forward and focus on the immediate cue word: "Next ball, aggressive eyes".',
          'By creating this strict behavioral boundary, the past mistake is quarantined, preventing the catastrophic "choke" spiral.',
        ],
      },
      {
        id: 'ch-3',
        chapterNumber: 3,
        title: 'Mastering the Pre-Performance Ritual (The Closed Loop)',
        readingTimeMinutes: 13,
        summary: 'How identical behavioral and cognitive sequences insulate free-throw shooters, golfers, and bowlers from situational distraction.',
        keyTakeaways: [
          'A standardized pre-shot routine takes the decision-making load off the working memory.',
          'Routines must have exact temporal duration (e.g., exactly 6.2 seconds every repetition).',
          'Focus on external visual targets rather than internal limb mechanics during the ritual.',
        ],
        content: [
          'Watch any world-class archer, javelin thrower, or penalty taker: their routine never varies whether they are training in an empty gym or performing before 80,000 screaming spectators. The routine acts as a protective bubble.',
          'When you execute a meticulously rehearsed ritual—three bounces of the ball, one deep breath, fixating the gaze on the back rim, release—you signal to the subcortical brain that the environment is familiar and safe.',
          'To develop your routine, record yourself during practice. Time every segment down to tenths of a second. Practice the routine under simulated fatigue, loud crowd audio playback, and sudden visual interruptions until it is unbreakable.',
        ],
      },
    ],
  },
  {
    id: 'grassroots-coaching-handbook',
    title: 'Youth Long-Term Athlete Development (LTAD) Handbook',
    subtitle: 'Age-appropriate motor development, preventing burnout, fun-first skill acquisition',
    author: 'Sandeep Menon',
    authorRole: 'Director of Grassroots Coaching · Former National Youth Selector',
    category: 'Grassroots Coaching',
    sport: 'Multi-Sport',
    readingTimeMinutes: 30,
    totalPages: 118,
    coverEmoji: '🌱',
    coverGradient: 'linear-gradient(135deg, #c2410c 0%, #ea580c 50%, #7c2d12 100%)',
    rating: 4.85,
    ratingsCount: 2210,
    publishedYear: 2026,
    isbn: 'KG-978-93-8912-04',
    badge: 'Essential for Coaches',
    description: 'A scientifically validated blueprint for coaching children and adolescents aged 6 to 18. Details critical windows of trainability for speed, agility, and motor coordination while avoiding early specialization injuries.',
    highlights: [
      'The 7-stage LTAD model: Active Start through Training to Win',
      'Why playing multiple sports until age 14 develops superior spatial athletes',
      'Bio-banding: Grouping young athletes by biological maturity rather than birth date',
      'Transforming static drills into dynamic, small-sided game-based challenges',
    ],
    chapters: [
      {
        id: 'ch-1',
        chapterNumber: 1,
        title: 'The Danger of Early Specialization in Youth Sports',
        readingTimeMinutes: 9,
        summary: 'Why committing an 8-year-old to a single sport leads to overuse injuries, psychological dropout, and capped adult athletic ceiling.',
        keyTakeaways: [
          'Multi-sport athletes have lower rates of repetitive strain injuries and higher long-term career longevity.',
          'Transferable motor patterns (swimming lung capacity + gymnastics balance + football agility) build elite foundations.',
          'Early success in pre-pubertal sports is predominantly driven by relative age effect, not innate talent.',
        ],
        content: [
          'In many competitive youth academies, children as young as seven are pressured to select one sport and practice it year-round. While this produces short-term technical mimicry and early tournament trophies, the long-term consequences are disastrous.',
          'Orthopaedic statistics reveal an alarming spike in pediatric ACL tears, shoulder impingements, and growth-plate stress injuries caused by repetitive single-plane movements.',
          'Athletes who sample three to four different sports between ages 6 and 12 develop a broader motor library. They understand balance, rotational power, spatial acceleration, and tactical adaptability far better than single-sport peers when they finally specialize at age 15.',
        ],
      },
      {
        id: 'ch-2',
        chapterNumber: 2,
        title: 'Game-Based Learning vs. The Robotic Drill Trap',
        readingTimeMinutes: 11,
        summary: 'Replacing long queues at training with high-touch small-sided games that force real-time decision making under constraints.',
        keyTakeaways: [
          'Children learn motor skills through perception-action coupling, not repetitive cone hopping.',
          'Keep lines under three players; if kids are standing idle, training density has failed.',
          'Manipulate constraints (pitch size, ball weight, player numbers) to naturally induce desired technique.',
        ],
        content: [
          'The traditional coaching paradigm consisted of an adult whistling, twelve children standing in a single line, and each child touching the ball for 3 seconds every two minutes. This develops boredom, not athletes.',
          'Modern ecological coaching uses the Constraints-Led Approach (CLA). Instead of verbally lecturing a player on how to pass into space, the coach designs a 3v3 game with two narrow target gates on each wing.',
          'The constraints of the game environment force the child’s perceptual system to scan for space, calculate pass speed, and execute technique organically. The coach acts as a facilitator, asking guiding questions rather than shouting commands.',
        ],
      },
      {
        id: 'ch-3',
        chapterNumber: 3,
        title: 'Bio-Banding: Eliminating the Relative Age Effect',
        readingTimeMinutes: 10,
        summary: 'How grouping young athletes by biological maturity rather than calendar age protects late bloomers and challenges early maturers.',
        keyTakeaways: [
          'Calendar age brackets favor children born in January–March over those born in October–December.',
          'Late-maturing players develop superior technical and tactical intellect to survive.',
          'Using Khamis-Roche adult height predictions allows fair bio-banded selection combines.',
        ],
        content: [
          'In standard U-14 tournaments, an athlete born in January can be up to 18 months ahead in biological skeletal maturity compared to a teammate born in December of the same cohort. The early developer is bigger, faster, and stronger, often getting picked for representative squads based purely on temporary hormonal size.',
          'When these early developers reach senior sports where everyone is equally large, their physical advantage disappears and they struggle because they never had to develop elite tactical wits.',
          'Bio-banding categorizes athletes based on percentage of predicted adult height. When late bloomers play against opponents of equal physical size, their skill shines; when early maturers play against bigger athletes, they are forced to learn intelligent positioning rather than relying on brute speed.',
        ],
      },
    ],
  },
  {
    id: 'sports-nutrition-recovery',
    title: 'Sports Nutrition, Hydration & Rapid Recovery Protocols',
    subtitle: 'Glycogen re-synthesis, heat acclimatization, anti-inflammatory meals & sleep hygiene',
    author: 'Dr. Meera Nambiar',
    authorRole: 'Chief Sports Dietitian · High Performance Advisor',
    category: 'Sports Nutrition',
    sport: 'Multi-Sport',
    readingTimeMinutes: 35,
    totalPages: 136,
    coverEmoji: '🥗',
    coverGradient: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 50%, #042f2e 100%)',
    rating: 4.92,
    ratingsCount: 3100,
    publishedYear: 2026,
    isbn: 'KG-978-93-8912-05',
    badge: 'Nutrition Guide',
    description: 'Fueling athletic performance under demanding tropical climates. Practical nutritional periodization, evidence-based meal timing, electrolyte balances, and scientifically backed recovery modalities.',
    highlights: [
      'The 4:1 carbohydrate-to-protein post-match window for rapid muscle repair',
      'Managing sodium and sweat loss in Indian summer conditions (>35°C, high humidity)',
      'Vegetarian and vegan athlete protein profiling (combining dal, paneer, sprouts & quinoa)',
      'Sleep stage architecture: maximizing slow-wave deep sleep for growth hormone release',
    ],
    chapters: [
      {
        id: 'ch-1',
        chapterNumber: 1,
        title: 'Hydration Science & Sweat Electrolyte Management in the Tropics',
        readingTimeMinutes: 11,
        summary: 'Calculating individual sweat rates and preventing cramping without risking dangerously diluted blood sodium (hyponatremia).',
        keyTakeaways: [
          'A 2% drop in body weight from dehydration impairs cardiovascular output by up to 15%.',
          'Weighing in before and after training is the simplest, most accurate sweat rate diagnostic.',
          'Pure water during long hot sessions can dilute electrolytes; sodium chloride is mandatory.',
        ],
        content: [
          'Playing 90 minutes of football or 50 overs of cricket in Indian peak summer temperatures places immense strain on thermoregulatory mechanisms. Athletes can lose between 1.5 to 2.8 liters of sweat per hour.',
          'Sweat contains not just water, but crucial minerals: sodium, potassium, magnesium, and chloride. If an athlete only drinks pure water, blood osmolarity drops, triggering dizziness, muscle cramping, and sluggish neural firing.',
          'Field Formula: Weigh yourself nude before training. Weigh yourself afterwards. Every 1 kg lost equates to approximately 1 liter of fluid deficit. Rehydrate with 125% to 150% of the lost volume over the next 4 hours, incorporating 450–700mg of sodium per liter of fluids.',
        ],
      },
      {
        id: 'ch-2',
        chapterNumber: 2,
        title: 'Vegetarian Athlete Protein Mastery: Overcoming Leucine Thresholds',
        readingTimeMinutes: 12,
        summary: 'How plant-based athletes can hit optimal muscle protein synthesis (MPS) through strategic amino acid pairing and leucine targets.',
        keyTakeaways: [
          'Muscle Protein Synthesis requires 2.7g to 3.0g of leucine per feeding to trigger the mTOR pathway.',
          'Complementary grains and legumes (rice + lentils, roti + chana) deliver full essential amino acid profiles.',
          'Total daily protein intake should target 1.6g to 2.0g per kilogram of bodyweight for training athletes.',
        ],
        content: [
          'A common misconception in grassroots sports is that Indian vegetarian diets cannot support elite strength and power. The actual constraint is not protein quantity, but protein quality and leucine concentration.',
          'Leucine is the chemical "light switch" that initiates muscle repair. Animal proteins contain higher leucine density per gram, but vegetarian athletes can easily achieve the same mTOR stimulation by combining diverse protein sources.',
          'By pairing legumes (rich in lysine, low in methionine) with whole grains (rich in methionine, low in lysine), and supplementing with paneer, Greek curd, sattu, tofu, and whey or soy protein isolate, plant-based competitors achieve identical hypertrophic recovery to meat-eating counterparts.',
        ],
      },
      {
        id: 'ch-3',
        chapterNumber: 3,
        title: 'Sleep Architecture: The Most Potent Legal Performance Enhancer',
        readingTimeMinutes: 12,
        summary: 'Optimizing sleep cycles, reducing sleep latency, and structuring naps around double training sessions.',
        keyTakeaways: [
          '95% of natural Human Growth Hormone (HGH) release occurs during Stage 3 and 4 Slow-Wave Sleep.',
          'Sleeping under 7 hours per night increases sports injury probability by 1.7x.',
          'A dark, cool room (18-21°C) without blue screens 60 minutes before bed accelerates deep sleep onset.',
        ],
        content: [
          'Cryotherapy chambers, massage guns, and compression boots are minor recovery aids compared to eight hours of consolidated sleep. During Slow-Wave Sleep, the anterior pituitary gland secretes massive pulses of growth hormone to rebuild microscopic muscle fiber microtears.',
          'Chronic sleep deprivation elevates catabolic cortisol, degrades reaction time, impairs glucose glycogen storage, and blunts immune function.',
          'Athletic Sleep Protocol: Maintain a non-negotiable sleep schedule within a 30-minute window every day. If doing two-a-day sessions, implement a 25-minute "power nap" between 1:00 PM and 2:30 PM to clear adenosine buildup without causing sleep inertia.',
        ],
      },
    ],
  },
  {
    id: 'badminton-footwork-tactics',
    title: 'Badminton Kinetic Footwork & Deceptive Strokes',
    subtitle: 'Split-step timing, 6-point corner recoveries, deceptive holds & net tumble physics',
    author: 'Coach P. Chandrashekhar',
    authorRole: 'Former National Singles Champion · Master High-Performance Coach',
    category: 'Tactical Play',
    sport: 'Badminton',
    readingTimeMinutes: 30,
    totalPages: 112,
    coverEmoji: '🏸',
    coverGradient: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #1e1b4b 100%)',
    rating: 4.9,
    ratingsCount: 2640,
    publishedYear: 2026,
    isbn: 'KG-978-93-8912-06',
    badge: 'Precision Manual',
    description: 'Master the lightning-fast movement patterns and deceptive shot mechanics of modern elite badminton. Details kinetic lunging, center base recovery, jump-smash biomechanics, and deception at the net tape.',
    highlights: [
      'The split-step trigger: Landing on the balls of your feet at the exact opponent strike frame',
      'The 6-point court coverage grid with minimal stride count (2 steps to net, 3 steps to rear)',
      'Holding the racket angle: Delaying wrist pronation until the final 0.05 seconds of contact',
      'Front-knee tracking: Preventing patellar tendon shear during deep lunges',
    ],
    chapters: [
      {
        id: 'ch-1',
        chapterNumber: 1,
        title: 'The Kinetic Split-Step: Anticipation vs. Reaction',
        readingTimeMinutes: 10,
        summary: 'Synchronizing your hop with your opponent’s shuttle impact to exploit the stretch-shortening cycle for instant acceleration.',
        keyTakeaways: [
          'The split step is not an upward jump; it is an unweighting drop that pre-loads calf and Achilles tendons.',
          'Timing must match the opponent’s contact instant exactly; jumping too early freezes feet on court.',
          'The directional push starts from the contralateral leg opposite to the direction of travel.',
        ],
        content: [
          'In badminton, where shuttles reach speeds exceeding 400 km/h, human reaction time alone is insufficient to reach the corners. A player who waits to see the shuttle fly before moving will always be late.',
          'The split-step is the universal mechanism of elite court coverage. Just as the opponent prepares to strike, the player performs a micro-hop, spreading their feet slightly wider than shoulder width.',
          'As the feet land, the stretch receptors in the calf muscles store elastic strain energy. The moment the trajectory is recognized, that stored elastic force is converted into an explosive push off the back foot toward the relevant corner.',
        ],
      },
      {
        id: 'ch-2',
        chapterNumber: 2,
        title: 'Rear-Court China Jump & Jump Smash Mechanics',
        readingTimeMinutes: 10,
        summary: 'Generating maximum downward smash velocity through hip scissor kicks and rotational trunk whip.',
        keyTakeaways: [
          'The China jump allows rapid counter-attacking from flat mid-court pushes without turning fully side-on.',
          'In a full jump smash, hip rotation precedes shoulder rotation by 0.08 seconds.',
          'Contact the shuttle at the highest point, slightly in front of the racket shoulder.',
        ],
        content: [
          'The jump smash is badminton’s most lethal scoring weapon. It creates a steep, unreturnable downward angle while reducing the opponent’s reaction window by up to 0.15 seconds.',
          'To maximize velocity, the player jumps off both legs with a coordinated archer’s pose: non-racket hand pointing at the shuttle for spatial triangulation, elbow drawn high and back like an archer drawing a bow.',
          'At the apex of the jump, explosive contraction of the abdominals and internal obliques whips the torso forward, followed by rapid forearm pronation. Landing should be on the racket leg with knee flexion to absorb the landing force safely.',
        ],
      },
      {
        id: 'ch-3',
        chapterNumber: 3,
        title: 'Deceptive Holds & Tight Spinning Net Tumbles',
        readingTimeMinutes: 10,
        summary: 'Freezing opponents through identical preparation postures before releasing delicate spinning net drops or disguised flicks.',
        keyTakeaways: [
          'Deception requires 100% identical racket swing setup for both the drop and the flick.',
          'Spinning net shots contact the shuttle feather skirt obliquely rather than the cork base.',
          'Keep the racket head above wrist height at all times when approaching the net tape.',
        ],
        content: [
          'The hallmark of a world-class player is making the opponent lean the wrong way before the shuttle even crosses the net. Deception is not a flashy trick; it is an economy of motion that denies the opponent early movement cues.',
          'By holding the racket face stationary for an extra tenth of a second at the net tape, you force the opponent to pause their recovery. If they step back expecting a clear, a delicate brush produces a tumbling net drop; if they rush forward, a sudden flick snaps the shuttle deep into the back corner.',
        ],
      },
    ],
  },
  {
    id: 'athletics-speed-mechanics',
    title: 'Athletics Sprint Mechanics & Acceleration Dynamics',
    subtitle: 'Drive phase angles, ground contact time reduction & top-end velocity kinematics',
    author: 'Devendra Singh',
    authorRole: 'Track & Field Sprint Coach · Speed Consultant to Multi-Sport Federations',
    category: 'Biomechanics',
    sport: 'Athletics',
    readingTimeMinutes: 25,
    totalPages: 98,
    coverEmoji: '🏃',
    coverGradient: 'linear-gradient(135deg, #b91c1c 0%, #ef4444 50%, #7f1d1d 100%)',
    rating: 4.87,
    ratingsCount: 1980,
    publishedYear: 2026,
    isbn: 'KG-978-93-8912-07',
    badge: 'Speed Science',
    description: 'The definitive guide to running faster in any sport. Deconstructs block clearance, low acceleration angles, positive shin angles, and vertical force production during upright maximum velocity.',
    highlights: [
      'The 45-degree acceleration posture: Driving the ground away rather than pulling',
      'Reducing Ground Contact Time (GCT) below 0.10 seconds during maximum velocity',
      'The "Whip from the Hip" cue: Active leg strike directly under the center of mass',
      'Dorsiflexion discipline: Preventing energy bleed through a collapsed ankle joint',
    ],
    chapters: [
      {
        id: 'ch-1',
        chapterNumber: 1,
        title: 'The Drive Phase: Positive Shin Angles and Pushing Mechanics',
        readingTimeMinutes: 8,
        summary: 'Why the first 10-20 meters require pushing like a piston rather than reaching with the lead foot.',
        keyTakeaways: [
          'During acceleration, the body should form a straight diagonal line from ankle to ear (45°).',
          'Over-striding in front of the center of mass produces heavy braking forces that kill speed.',
          'Triple extension of the hip, knee, and ankle delivers maximum horizontal impulse.',
        ],
        content: [
          'Speed is often misdiagnosed as "moving feet fast". High stride frequency with zero propulsion simply burns energy in place. In the acceleration phase (0–20 meters), the sole objective is to deliver large horizontal forces into the track.',
          'To do this, the athlete must maintain a positive shin angle—meaning the knee is ahead of the ankle at touchdown. This ensures the foot pushes backward against the earth, propelling the hips forward.',
          'Drills: Heavy sled pushes (20-30% bodyweight), wall drill holds at 45°, and unresisted 10-meter accelerations focusing on violent elbow drive backward.',
        ],
      },
      {
        id: 'ch-2',
        chapterNumber: 2,
        title: 'Maximum Velocity: From Pushing to Vertical Bouncing',
        readingTimeMinutes: 9,
        summary: 'How elite sprinters run at 40+ km/h by applying massive vertical ground reaction forces in under 90 milliseconds.',
        keyTakeaways: [
          'Top speed sprinters do not push horizontally; they punch vertically into the track with immense stiffness.',
          'The leg acts as a stiff pogo-stick spring: stiffness in the ankle and knee determines rebound velocity.',
          'Arm swing balances rotational torque created by the violent downward strike of the lead leg.',
        ],
        content: [
          'As an athlete transitions from acceleration to upright sprinting (30m onwards), the physics of speed completely flips. You are no longer accelerating; you are managing top velocity.',
          'At maximum speed, elite sprinters contact the track for only 0.08 to 0.10 seconds. In that tiny fraction of time, they deliver forces equal to 4 to 5 times their body weight directly into the rubber.',
          'The foot must strike directly beneath the hips with a pre-tensed, dorsiflexed ankle. If the foot lands even three inches ahead of the hips, a braking force occurs, instantly robbing the runner of momentum.',
        ],
      },
      {
        id: 'ch-3',
        chapterNumber: 3,
        title: 'Speed Work vs. Conditioning: The 95% Intensity Rule',
        readingTimeMinutes: 8,
        summary: 'Why true speed can only be trained with full neurological recovery, not exhausted endurance circuits.',
        keyTakeaways: [
          'Sprinting at 85% trains endurance, not maximum neural firing frequency.',
          'Rule of thumb: 1 minute of complete rest for every 10 meters of sprint distance.',
          'Keep total sprint volume per session below 300 meters to ensure elite quality.',
        ],
        content: [
          'One of the most destructive coaching mistakes is turning sprint training into a conditioning drill with short rest intervals. When an athlete sprints with incomplete recovery, their nervous system down-regulates to protect against injury.',
          'Running 60-meter sprints with only 30 seconds of rest trains lactate tolerance, but it slows the athlete down. True neuromuscular speed adaptation requires maximal effort (>95% velocity) performed in a state of absolute freshness.',
          'If a sprinter runs 40 meters in 4.8 seconds, they must rest at least 4 full minutes before the next repetition. If times drop by more than 3%, end the sprint session immediately and switch to mobility.',
        ],
      },
    ],
  },
  {
    id: 'injury-prevention-protocols',
    title: 'ACL & Soft Tissue Injury Prevention for Turf Athletes',
    subtitle: 'FIFA 11+ protocols, Nordic hamstring curls, deceleration mechanics & artificial turf risks',
    author: 'Dr. Rohini Deshmukh',
    authorRole: 'Head Sports Physiotherapist · Knee & Ankle Rehabilitation Specialist',
    category: 'Strength & Conditioning',
    sport: 'Multi-Sport',
    readingTimeMinutes: 35,
    totalPages: 124,
    coverEmoji: '🛡️',
    coverGradient: 'linear-gradient(135deg, #15803d 0%, #22c55e 50%, #14532d 100%)',
    rating: 4.96,
    ratingsCount: 3410,
    publishedYear: 2026,
    isbn: 'KG-978-93-8912-08',
    badge: 'High Impact Medical',
    description: 'An indispensable guide for turf football, cricket, and field sports players. Clinically validated protocols that reduce non-contact anterior cruciate ligament (ACL) and hamstring strains by up to 60%.',
    highlights: [
      'The biomechanics of non-contact ACL tears: Dynamic knee valgus during deceleration',
      'The Nordic Hamstring Curl progression: Building eccentric strength against high-speed tears',
      'Turf shoe friction selection: Preventing stud lock-in on artificial grass pitches',
      'Weekly 20-minute FIFA 11+ warmup routine implementation for amateur squads',
    ],
    chapters: [
      {
        id: 'ch-1',
        chapterNumber: 1,
        title: 'Dynamic Knee Valgus: Understanding the Non-Contact ACL Tear',
        readingTimeMinutes: 11,
        summary: 'Why 70% of ACL tears occur without contact during cutting or landing, and how gluteus medius strength prevents inward knee collapse.',
        keyTakeaways: [
          'Dynamic valgus (knee caving inward while hip internally rotates) places peak tensile shear on the ACL.',
          'Landing with a stiff, upright trunk triples peak impact forces transmitted through the knee.',
          'Weak hip abductors fail to stabilize the femur during sudden directional change.',
        ],
        content: [
          'The dreaded "pop" of an anterior cruciate ligament tear usually happens when an athlete attempts to change direction or lands from a jump. It is almost always a non-contact event occurring within the first 40 milliseconds of ground contact—faster than any voluntary muscle reflex.',
          'The dangerous position is known as dynamic knee valgus: the hip collapses inward, the knee buckles medially, and the foot is pronated and fixed to the turf. If the trunk is upright, the quadriceps overpower the hamstrings, pulling the tibia forward and snapping the ligament.',
          'Correction requires neuromuscular retraining: teaching athletes to land with deep knee and hip flexion ("soft knees") and strengthening the posterior chain to maintain knee alignment over the second toe.',
        ],
      },
      {
        id: 'ch-2',
        chapterNumber: 2,
        title: 'The Nordic Hamstring Revolution: Eliminating Sprint Strains',
        readingTimeMinutes: 12,
        summary: 'Implementing the single most evidence-backed exercise in sports science to protect the biceps femoris during top-speed sprinting.',
        keyTakeaways: [
          'Hamstring tears occur during the terminal swing phase when the muscle is lengthening under high load.',
          'Nordic curls increase hamstring fascicle length, shifting the optimum angle of force generation.',
          'Just two sets of 5 repetitions twice a week cuts hamstring strain rates by 51%.',
        ],
        content: [
          'Hamstring strains are the most frequent injury in running sports, accounting for thousands of missed matches each season. Most strains occur in the long head of the biceps femoris during late swing phase, right before foot strike.',
          'Standard leg curls only train the muscle concentrically. When sprinting, however, the hamstring must act eccentrically—braking the rapidly extending lower leg like a high-performance car brake pad.',
          'The Nordic Hamstring Curl forces the hamstring to control the descent of the entire upper body against gravity. Long-term studies show this exercise causes architectural remodeling of the muscle fibers, making them longer and drastically more resilient to high-velocity tears.',
        ],
      },
      {
        id: 'ch-3',
        chapterNumber: 3,
        title: 'Artificial Turf Hazards & Footwear Optimization',
        readingTimeMinutes: 12,
        summary: 'Navigating the high rotational friction of synthetic 3G/4G turf pitches and choosing appropriate stud patterns.',
        keyTakeaways: [
          'High rotational traction on turf prevents the foot from slipping naturally, trapping knee joints.',
          'Avoid long blade-type firm ground (FG) studs on turf; use multi-stud artificial grass (AG) plates.',
          'Turf infill rubber heat: Artificial grass can be 15°C hotter than air temperature in summer.',
        ],
        content: [
          'The rapid expansion of commercial turf facilities across Indian cities has revolutionized access to sports. However, synthetic surfaces possess significantly higher rotational friction than natural grass.',
          'On natural grass, a sharp cut will allow the ground to give way slightly, releasing joint torque. On artificial turf with rubber crumb, standard metal or aggressive blade studs become mechanically locked into the carpet.',
          'When the upper body rotates while the foot is trapped in the turf matrix, the entire rotational torque is transferred directly into the ankle and knee joints. Athletes should invest in dedicated AG (Artificial Grass) footwear with multiple short, conical rubber studs that release torque cleanly during sharp cuts.',
        ],
      },
    ],
  },
]

export function adaptDatabaseBookToSportsBook(dbBook: DatabaseSportsBook): SportsBook {
  const fallbackBook = SPORTS_BOOKS.find(b => b.id === dbBook.id)
  return {
    id: dbBook.id,
    title: dbBook.title,
    subtitle: dbBook.subtitle,
    author: dbBook.author,
    authorRole: dbBook.author_role || fallbackBook?.authorRole || 'Sports Specialist',
    category: (dbBook.category as BookCategory) || fallbackBook?.category || 'Tactical Play',
    sport: dbBook.sport,
    readingTimeMinutes: dbBook.reading_time_minutes || fallbackBook?.readingTimeMinutes || 30,
    totalPages: dbBook.total_pages || fallbackBook?.totalPages || 100,
    coverEmoji: dbBook.cover_emoji || fallbackBook?.coverEmoji || '📚',
    coverGradient: dbBook.cover_gradient || fallbackBook?.coverGradient || 'linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%)',
    rating: Number(dbBook.rating) || fallbackBook?.rating || 4.9,
    ratingsCount: dbBook.ratings_count || fallbackBook?.ratingsCount || 1000,
    publishedYear: dbBook.published_year || fallbackBook?.publishedYear || 2026,
    isbn: dbBook.isbn || fallbackBook?.isbn || 'KG-978-IN-01',
    badge: dbBook.badge || fallbackBook?.badge,
    description: dbBook.description || fallbackBook?.description || '',
    highlights: Array.isArray(dbBook.highlights) && dbBook.highlights.length > 0 ? (dbBook.highlights as string[]) : fallbackBook?.highlights || [],
    chapters: (Array.isArray(dbBook.chapters) && dbBook.chapters.length > 0 ? (dbBook.chapters as BookChapter[]) : fallbackBook?.chapters) || [],
  }
}

export async function getDynamicSportsBooks(): Promise<SportsBook[]> {
  try {
    const res = await getSportsBooks()
    if (res.status === 'ready' && res.data.length > 0) {
      return res.data.map(adaptDatabaseBookToSportsBook)
    }
  } catch {
    // Fallback smoothly to curated baseline
  }
  return SPORTS_BOOKS
}
