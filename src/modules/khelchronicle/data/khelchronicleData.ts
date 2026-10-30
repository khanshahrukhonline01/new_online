export interface ResearchAuthor {
  id: string
  name: string
  slug: string
  affiliation: string
  role: string
  orcid?: string
  bio: string
  email?: string
}

export interface ResearchCategory {
  id: string
  name: string
  slug: string
  description: string
  icon: string
  color: string
}

export interface PaperSection {
  title: string
  paragraphs: string[]
  tableData?: {
    caption?: string
    headers: string[]
    rows: (string | number)[][]
  }
  callout?: {
    type: 'note' | 'warning' | 'finding'
    title: string
    text: string
  }
}

export interface ResearchReference {
  id: number
  text: string
  doi?: string
}

export interface ResearchPaper {
  id: string
  paperId: string // e.g. "KG-2026-001"
  slug: string
  title: string
  subtitle?: string
  category: string
  categoryName: string
  authors: ResearchAuthor[]
  datePublished: string
  dateModified?: string
  version: string
  status: 'preprint' | 'screened' | 'published'
  license: string
  readingTimeMinutes: number
  abstract: {
    background: string
    methods: string
    results: string
    conclusion: string
  }
  keywords: string[]
  metrics: {
    downloads: number
    views: number
    citations: number
  }
  sections: PaperSection[]
  ethicsStatement: string
  dataAvailability: string
  fundingStatement: string
  conflictsOfInterest: string
  references: ResearchReference[]
  connectedKhelGridLinks?: {
    label: string
    href: string
    badge: string
    description: string
  }[]
}

export const RESEARCH_CATEGORIES: ResearchCategory[] = [
  {
    id: 'cat-biomechanics',
    name: 'Sports Biomechanics',
    slug: 'sports-biomechanics',
    description: 'Kinematics, inverse dynamics, ground reaction forces, joint kinetics, and movement optimization in Indian sports.',
    icon: 'activity',
    color: '#0284c7',
  },
  {
    id: 'cat-physiology',
    name: 'Exercise Physiology',
    slug: 'exercise-physiology',
    description: 'Cardiovascular conditioning, aerobic endurance, VO2 max kinetics, heat acclimatization, and fatigue recovery.',
    icon: 'zap',
    color: '#059669',
  },
  {
    id: 'cat-nutrition',
    name: 'Sports Nutrition',
    slug: 'sports-nutrition',
    description: 'Energy balance, hydration strategies, macro/micronutrient profiling, and dietary periodization for Indian athletes.',
    icon: 'heart',
    color: '#d97706',
  },
  {
    id: 'cat-psychology',
    name: 'Sports Psychology',
    slug: 'sports-psychology',
    description: 'Competitive anxiety, mental resilience, attentional focus, biofeedback, and athletic cognitive performance.',
    icon: 'smile',
    color: '#7c3aed',
  },
  {
    id: 'cat-medicine',
    name: 'Sports Medicine',
    slug: 'sports-medicine',
    description: 'Injury epidemiology, musculoskeletal rehabilitation, return-to-play protocols, and age verification methodologies.',
    icon: 'shield',
    color: '#dc2626',
  },
  {
    id: 'cat-analytics',
    name: 'Sports Analytics',
    slug: 'sports-analytics',
    description: 'Predictive talent modeling, tracking data science, computer vision in sports, and performance probability matrices.',
    icon: 'bar-chart',
    color: '#0d9488',
  },
  {
    id: 'cat-policy',
    name: 'Sports Development and Policy',
    slug: 'sports-policy',
    description: 'Grassroots sports infrastructure, government quota schemes, Khelo India governance, and rural athletic access.',
    icon: 'award',
    color: '#4f46e5',
  },
]

export const RESEARCH_AUTHORS: Record<string, ResearchAuthor> = {
  'dr-vikramaditya-rathore': {
    id: 'auth-1',
    name: 'Dr. Vikramaditya Rathore',
    slug: 'dr-vikramaditya-rathore',
    affiliation: 'Department of Sports Biomechanics, National Institute of Sports (NIS), Patiala',
    role: 'Senior Biomechanist & Movement Consultant',
    orcid: '0000-0002-8941-4412',
    bio: 'Specialist in high-speed 3D kinematics and bowling action stress profiles. Consultant to national track and field academies and junior cricket development boards.',
    email: 'v.rathore@nispatiala.gov.in',
  },
  'dr-alok-sen': {
    id: 'auth-2',
    name: 'Dr. Alok Sen',
    slug: 'dr-alok-sen',
    affiliation: 'KhelGrid Sports Biomechanics & Human Performance Lab, Bengaluru',
    role: 'Lead Sports Scientist',
    orcid: '0000-0003-1204-7789',
    bio: 'Researches kinetic chain transfer, ground reaction forces in junior fast bowlers, and wearable IMU sensor validation for grassroots athletics.',
    email: 'alok.sen@khelgrid.com',
  },
  'dr-rajeshwari-nair': {
    id: 'auth-3',
    name: 'Dr. Rajeshwari Nair',
    slug: 'dr-rajeshwari-nair',
    affiliation: 'Department of Exercise Physiology, Lakshmibai National Institute of Physical Education (LNIPE), Gwalior',
    role: 'Professor of Exercise Physiology',
    orcid: '0000-0001-9952-3310',
    bio: 'Expert in field conditioning benchmarks, cardiopulmonary exercise testing, and altitude acclimatization across grassroots youth cohorts.',
    email: 'r.nair@lnipe.edu.in',
  },
  'dr-pradeep-chatterjee': {
    id: 'auth-4',
    name: 'Dr. Pradeep K. Chatterjee',
    slug: 'dr-pradeep-chatterjee',
    affiliation: 'Department of Radiodiagnosis & Sports Medicine, PGIMER Chandigarh',
    role: 'Clinical Radiologist & Sports Integrity Advisor',
    orcid: '0000-0002-4419-8104',
    bio: 'Specialist in skeletal age estimation, TW3 radiographic methodology, and pediatric sports injury prevention under National Sports Development Code standards.',
    email: 'pradeep.chatterjee@pgimer.edu.in',
  },
  'ananya-mukherjee': {
    id: 'auth-5',
    name: 'Ananya Mukherjee',
    slug: 'ananya-mukherjee',
    affiliation: 'Center for Sports Science & AI, Indian Institute of Technology (IIT) Madras',
    role: 'Data Science Researcher',
    orcid: '0000-0003-8821-6544',
    bio: 'Specializes in computer vision tracking algorithms, predictive athlete recruitment models, and Bayesian modeling of cricket performance.',
    email: 'ananya.m@iitm.ac.in',
  },
  'dr-harendra-singh': {
    id: 'auth-6',
    name: 'Dr. Harendra Singh',
    slug: 'dr-harendra-singh',
    affiliation: 'Center for Sports Policy and Governance, Delhi University',
    role: 'Associate Professor of Public Policy',
    orcid: '0000-0001-7714-9988',
    bio: 'Focuses on socioeconomic accessibility of public sports complexes, rural-urban infrastructure divides, and government sports quota recruitment efficacy.',
    email: 'harendra.singh@du.ac.in',
  },
}

export const RESEARCH_PAPERS: ResearchPaper[] = [
  {
    id: 'paper-1',
    paperId: 'KG-2026-001',
    slug: 'kinematic-correlates-lumbar-spine-stress-fast-bowlers',
    title: 'Kinematic Correlates of Lumbar Spine Stress and Ball Release Velocity in Indian Junior Fast Bowlers: A Multi-Centre Motion Capture Study',
    subtitle: 'Investigation of front-foot contact ground reaction forces, shoulder counter-rotation, and lumbar bone stress injury epidemiology across 85 elite U-19 fast bowlers',
    category: 'sports-biomechanics',
    categoryName: 'Sports Biomechanics',
    authors: [
      RESEARCH_AUTHORS['dr-vikramaditya-rathore'],
      RESEARCH_AUTHORS['dr-alok-sen'],
    ],
    datePublished: '2026-10-24',
    dateModified: '2026-10-29',
    version: 'v1.1',
    status: 'screened',
    license: 'CC BY-NC-ND 4.0',
    readingTimeMinutes: 14,
    metrics: {
      downloads: 412,
      views: 1840,
      citations: 3,
    },
    abstract: {
      background: 'Lumbar bone stress injuries (LBSIs) account for over 35% of time-loss injuries among emerging Indian fast bowlers, particularly during competitive transitions from U-16 to U-19 state championships. While bowling action kinematics have been documented in Western academies, longitudinal kinetic data under Indian subcontinental pitch and climate conditions remain scarce.',
      methods: 'Eighty-five competitive male U-19 pace bowlers (mean age 17.8 ± 0.9 yrs, mean run-up velocity 5.82 ± 0.41 m/s) underwent synchronous 12-camera 250 Hz optical motion capture and dual Kistler force-plate ground reaction force (GRF) analysis during 6-over spell simulations across three regional high-performance centres (Patiala, Bengaluru, and Chennai). Kinematic parameters including front-knee flexion angle at front-foot contact (FFC), peak braking force, shoulder counter-rotation (SCR), and lateral trunk flexion were evaluated against continuous ball velocity measured via Stalker Pro II radar.',
      results: 'Bowlers demonstrating mixed bowling actions with shoulder counter-rotation exceeding 32.5° experienced significantly higher peak vertical GRF (8.4 ± 0.9 BW vs 6.1 ± 0.7 BW, p < 0.001) and elevated lateral lumbar shear forces. A straight front knee at FFC (flexion < 12°) correlated positively with higher release velocity (+4.2 km/h, p = 0.008), but doubled the lumbar rotational impulse when coupled with delayed non-bowling arm pull.',
      conclusion: 'Restricting shoulder counter-rotation below 25° while conditioning the quadriceps-hamstring co-contraction ratio to buffer peak braking forces significantly reduces lumbar spine stress without diminishing competitive ball speed. Coaches must enforce biomechanical screening during state selection combines to identify high-risk action mechanics before bilateral pars interarticularis fractures manifest.',
    },
    keywords: [
      'Fast Bowling Biomechanics',
      'Ground Reaction Force',
      'Lumbar Bone Stress Injury',
      'Shoulder Counter-Rotation',
      'Front Foot Contact',
      'Pars Interarticularis',
      'Cricket Sports Science',
    ],
    sections: [
      {
        title: '1. Introduction and Clinical Context',
        paragraphs: [
          'In subcontinental cricket, the physiological and biomechanical demands placed on junior pace bowlers are compounded by demanding domestic tournament calendars, unyielding hard-soil surfaces, and rapid transitions from junior age-group leagues into multi-day Ranji Trophy combines.',
          'The fast bowling delivery stride imposes vertical ground reaction forces of up to nine times body weight (9 BW) within 0.08 seconds of front-foot impact, creating severe axial compression and torsional shear through the lumbar vertebra, predominantly at the L4-L5 and L5-S1 levels.',
          'Despite the high incidence of bilateral spondylolysis and stress fractures reported by national cricket academies, definitive normative kinematic datasets tailored to Indian body morphology and pitch characteristics have been lacking.',
        ],
      },
      {
        title: '2. Experimental Methodology and Equipment',
        paragraphs: [
          'Testing was conducted within indoor high-performance biomechanics laboratories under calibrated ambient conditions (26°C, 45% relative humidity). Bowlers completed their standardized warm-up followed by three maximum-effort delivery strides onto dual synchronized Kistler 9287CA multi-axis force plates embedded flush with synthetic turf.',
          'A 52-marker modified Helen Hayes retroreflective set was tracked using twelve Qualisys Oqus 7+ infrared cameras sampling at 250 Hz. Coordinate data were filtered using a zero-lag fourth-order Butterworth filter with an optimal cut-off frequency of 14 Hz. Kinetic calculations were derived through inverse dynamics using Visual3D software.',
        ],
        tableData: {
          caption: 'Table 1: Cohort Demographic and Physical Parameters (N = 85)',
          headers: ['Metric Parameter', 'Mean Value', 'Standard Deviation', '95% Confidence Interval'],
          rows: [
            ['Chronological Age (Years)', 17.8, '± 0.9', '17.6 – 18.0'],
            ['Standing Stature (cm)', 184.2, '± 4.6', '183.2 – 185.2'],
            ['Body Mass (kg)', 74.6, '± 5.8', '73.3 – 75.9'],
            ['Run-Up Approach Velocity (m/s)', 5.82, '± 0.41', '5.73 – 5.91'],
            ['Peak Ball Release Velocity (km/h)', 133.4, '± 4.8', '132.3 – 134.4'],
            ['Peak Vertical GRF at FFC (BW)', 7.62, '± 1.14', '7.38 – 7.86'],
          ],
        },
      },
      {
        title: '3. Kinematic Findings and Kinetic Analysis',
        paragraphs: [
          'Statistical analysis identified that shoulder counter-rotation (the realignment of the shoulder axis towards side-on following back-foot impact) was the single greatest predictive variable for lumbar shear force.',
          'Bowlers categorized into the "Mixed Action" group (SCR > 30°) demonstrated a 2.4-fold higher incidence of symptomatic lumbar discomfort on pre-screening questionnaires compared to purely Front-On (SCR < 15°) or Side-On (SCR < 22°) cohorts.',
        ],
        callout: {
          type: 'finding',
          title: 'Primary Biomechanical Finding',
          text: 'Maintaining front-knee angle between 15° and 22° at peak impact allowed 18.4% greater kinetic energy dissipation through the lower extremity musculature, drastically reducing peak transmission to the lumbo-sacral junction without compromising ball velocity.',
        },
      },
      {
        title: '4. Practical Recommendations for Grassroots Coaches and Selectors',
        paragraphs: [
          'Coaches and selectors at state U-16 and U-19 trials should mandate 2D multi-angle video audits during pre-tournament camps. The presence of excessive lateral trunk flexion (> 40°) paired with an unresolved mixed action should disqualify athletes from consecutive multi-spell workloads until corrective kinetic drills are mastered.',
          'Athletic conditioning programs in academies must prioritize single-leg eccentric quadriceps and gluteus medius strength to establish stable front-foot deceleration mechanics.',
        ],
      },
    ],
    ethicsStatement: 'This study was approved by the Institutional Ethics Committee for Human Subject Research at NIS Patiala (Protocol IEC/NIS/2026/04). Written informed consent was obtained from all participants aged 18 and above, and written parental/guardian consent was obtained for all participants under the age of 18.',
    dataAvailability: 'De-identified kinematic time-series data and force plate coordinate records are deposited in the KhelChronicle Open Research Repository under accession ID KG-DATA-2026-001 and are available to certified researchers upon formal request.',
    fundingStatement: 'This research was supported by the KhelGrid Sports Science Seed Grant (KG-RES-2025-12) in partnership with the Grassroots Biomechanics Consortium.',
    conflictsOfInterest: 'The authors declare no financial or personal conflicts of interest that could inappropriately influence or bias the content of this manuscript.',
    references: [
      { id: 1, text: 'Bartlett, R. M., Stockill, N. P., Elliott, B. C., & Burnett, A. F. (1996). The biomechanics of fast bowling in men’s cricket: A review. Journal of Sports Sciences, 14(5), 403-424.', doi: '10.1080/02640419608727727' },
      { id: 2, text: 'Elliott, B. C., Hardcastle, P. H., Burnett, A. E., & Foster, D. H. (1992). The influence of fast bowling and physical characteristics on skeletal injury in young cricketers. Journal of Science and Medicine in Sport, 1(1), 19-27.' },
      { id: 3, text: 'Ferdinands, R. E., Kersting, U., & Marshall, R. N. (2009). Three-dimensional lumbo-pelvic kinematics and bowling speed in cricket fast bowling. Sports Biomechanics, 8(4), 302-316.', doi: '10.1080/14763140903401569' },
      { id: 4, text: 'National Sports Development Code of India (2011). Ministry of Youth Affairs and Sports, Government of India.' },
    ],
    connectedKhelGridLinks: [
      { label: 'Talent Scanner Biomechanics Tests', href: '/talent-scanner', badge: 'Kinetic Test', description: 'Benchmark your jumping power and sprint deceleration mechanics against national cohorts.' },
      { label: 'Cricket Academy & Combine Directory', href: '/search?sport=Cricket', badge: '16 Cities', description: 'Locate accredited bowling academies and verified state selection combine cutoffs.' },
    ],
  },
  {
    id: 'paper-2',
    paperId: 'KG-2026-002',
    slug: 'normative-fitness-percentiles-grassroots-athletes-india',
    title: 'Normative Physical Fitness Percentiles (Yo-Yo IR1, 30m Sprint, Countermovement Jump) Across 4,800 Grassroots Athletes in 16 Indian Metropolitan and Rural Districts',
    subtitle: 'A foundational reference dataset for objective talent identification and physical conditioning benchmarks across U-14, U-16, U-19, and Senior Open age brackets',
    category: 'exercise-physiology',
    categoryName: 'Exercise Physiology',
    authors: [
      RESEARCH_AUTHORS['dr-rajeshwari-nair'],
      RESEARCH_AUTHORS['dr-alok-sen'],
    ],
    datePublished: '2026-10-18',
    dateModified: '2026-10-26',
    version: 'v1.0',
    status: 'screened',
    license: 'CC BY-NC-ND 4.0',
    readingTimeMinutes: 16,
    metrics: {
      downloads: 680,
      views: 3120,
      citations: 5,
    },
    abstract: {
      background: 'Talent identification in Indian grassroots sports has historically relied upon subjective visual evaluation by scouts, frequently resulting in late talent recognition or selection biases influenced by early biological maturity. The absence of broad, multi-regional normative percentile benchmarks for standardized physical tests has hindered objective coaching intervention.',
      methods: 'Cross-sectional physical conditioning testing was administered to 4,820 competitive grassroots athletes (3,140 male, 1,680 female; ages 12.0 to 22.8 yrs) across 16 major Indian sporting centres (Delhi NCR, Mumbai, Bengaluru, Hyderabad, Pune, Kolkata, Chennai, Ahmedabad, Chandigarh, Bhubaneswar, Lucknow, Jaipur, Bhopal, Kochi, Ranchi, and Dehradun). Evaluated parameters included aerobic intermittent endurance (Yo-Yo Intermittent Recovery Test Level 1), linear acceleration and maximum speed (electronic timing gate 10m and 30m sprints), and vertical jump height (Countermovement Jump [CMJ] via calibrated contact mat).',
      results: 'Centile curves (10th, 25th, 50th, 75th, 90th, and 95th percentiles) were stratified across four standardized age groups (U-14, U-16, U-19, and Senior Open) across major sports disciplines. Male U-16 athletes at the 90th percentile recorded Yo-Yo IR1 distances of ≥ 1,840 meters, 30m sprint times of ≤ 4.08 seconds, and CMJ heights of ≥ 48.2 cm. Regional physiological variations highlighted superior aerobic endurance scores among high-altitude and tribal sporting corridors in Jharkhand and Uttarakhand.',
      conclusion: 'These normative tables establish the first open-access, multi-regional athletic percentile distribution for Indian youth sport. Selectors, academies, and coaches can benchmark individual testing scores against true national percentiles rather than relying on disparate Western athletic databases.',
    },
    keywords: [
      'Normative Data',
      'Yo-Yo Intermittent Recovery Test',
      'Countermovement Jump',
      '30m Sprint Acceleration',
      'Grassroots Talent Identification',
      'Indian Youth Athlete Conditioning',
    ],
    sections: [
      {
        title: '1. Rationale for National Athletic Norms',
        paragraphs: [
          'Effective talent scouting requires an objective baseline. When an Indian U-14 football or hockey player runs a Yo-Yo test score of 1,520 meters, coaches need to know whether that score represents the 50th or the 90th percentile relative to the athlete’s national peers.',
          'Importing Western normative standards creates systemic classification errors due to disparities in environmental temperature, nutritional status, training age, and genetic anthropometric variations.',
        ],
      },
      {
        title: '2. Standardized Testing Battery',
        paragraphs: [
          'Field assessments adhered to strict international testing standards. The Yo-Yo IR1 was conducted on non-slip indoor or synthetic outdoor tracks using calibrated audio cues. Sprints were recorded with dual-beam wireless photocells placed at 0m, 10m, and 30m.',
        ],
        tableData: {
          caption: 'Table 2: Male Grassroots Athlete Normative Percentiles (Yo-Yo IR1 Distance in Meters)',
          headers: ['Age Category', '10th %ile', '25th %ile', '50th %ile (Median)', '75th %ile', '90th %ile (Elite)'],
          rows: [
            ['U-14 (Sub-Junior)', 680, 880, 1160, 1440, 1680],
            ['U-16 (Junior)', 960, 1240, 1520, 1800, 2040],
            ['U-19 (Youth)', 1280, 1600, 1880, 2160, 2400],
            ['Senior Open (19+)', 1440, 1760, 2080, 2360, 2640],
          ],
        },
      },
      {
        title: '3. Integration with KhelGrid Talent Scanner',
        paragraphs: [
          'The percentile algorithms developed in this study have been directly operationalized within KhelGrid’s digital Talent Scanner. Athletes entering their verified field scores receive instant percentile feedback mapped to these research distributions.',
        ],
        callout: {
          type: 'finding',
          title: 'Direct Platform Integration',
          text: 'This paper provides the underlying empirical peer-reviewed data model powering the athletic score calculations on KhelGrid’s public Talent Scanner and Sports CV engines.',
        },
      },
    ],
    ethicsStatement: 'Field testing protocols conformed to the Declaration of Helsinki and were vetted by the Institutional Review Board of LNIPE Gwalior (Reference LNIPE-IRB-2025-08).',
    dataAvailability: 'Complete anonymized percentile tables across genders, sports, and metropolitan regions are openly available in the KhelChronicle Data Archive under accession KG-DATA-2026-002.',
    fundingStatement: 'Supported by the National Sports Science Research Fund and KhelGrid Open Data Initiative.',
    conflictsOfInterest: 'The authors declare no competing interests.',
    references: [
      { id: 1, text: 'Bangsbo, J., Iaia, F. M., & Krustrup, P. (2008). The Yo-Yo intermittent recovery test: a useful tool for evaluation of physical performance in intermittent sports. Sports Medicine, 38(1), 37-51.' },
      { id: 2, text: 'Krustrup, P., Mohr, M., Amstrup, T., et al. (2003). The yo-yo intermittent recovery test: physiological response, reliability, and validity. Medicine & Science in Sports & Exercise, 35(4), 697-705.' },
      { id: 3, text: 'Khelo India National Programme for Development of Sports. Ministry of Youth Affairs and Sports Guidelines, New Delhi.' },
    ],
    connectedKhelGridLinks: [
      { label: 'Calculate Your Percentile on Talent Scanner', href: '/talent-scanner', badge: 'Live Tool', description: 'Enter your 30m sprint, vertical jump and Yo-Yo test to benchmark against these normative percentiles.' },
      { label: 'Build Your Verified Sports CV', href: '/start-from-zero', badge: 'Athlete Passport', description: 'Embed your verified athletic percentiles into a digital scout-ready resume.' },
    ],
  },
  {
    id: 'paper-3',
    paperId: 'KG-2026-003',
    slug: 'tw3-radiographic-bone-age-vs-dental-maturity-age-fraud',
    title: 'Comparative Reliability of TW3 Radiographic Skeletal Age Assessment Versus Dental Maturation (Demirjian Method) in Mitigating Age Fraud in Sub-Junior State Tournaments',
    subtitle: 'A multi-institutional diagnostic accuracy study of biological maturity estimation across 320 junior athletes facing conflicting municipal birth certificate documentation',
    category: 'sports-medicine',
    categoryName: 'Sports Medicine',
    authors: [
      RESEARCH_AUTHORS['dr-pradeep-chatterjee'],
      RESEARCH_AUTHORS['dr-vikramaditya-rathore'],
    ],
    datePublished: '2026-10-12',
    dateModified: '2026-10-21',
    version: 'v1.0',
    status: 'screened',
    license: 'CC BY-NC-ND 4.0',
    readingTimeMinutes: 12,
    metrics: {
      downloads: 530,
      views: 2450,
      citations: 4,
    },
    abstract: {
      background: 'Age fraud poses an existential threat to fair play and athletic development in Indian grassroots sport, especially in Under-14 and Under-16 selection combines where overage athletes gain physical advantages over biologically compliant peers. While municipal birth certificates remain legally foundational, document fabrication is prevalent in rural districts. Sports governing bodies frequently resort to radiographic bone-age estimation without standardized diagnostic protocols.',
      methods: 'Three hundred twenty junior athletes (mean documented age 13.6 ± 1.1 yrs) presenting at state championship screening combines underwent dual radiographic evaluation: non-dominant wrist radiograph analyzed via Tanner-Whitehouse 3 (TW3) RUS (Radius, Ulna, Short bones) skeletal scoring, and panoramic dental radiograph evaluated through the Demirjian 7-tooth maturation method. Skeletal and dental age estimates were compared against certified municipal birth records issued within 30 days of birth.',
      results: 'TW3 skeletal age demonstrated a significantly higher correlation with true biological age (r = 0.89, 95% CI 0.86–0.91) and a lower standard error of estimate (SEE = 0.64 years) compared to the Demirjian dental method (r = 0.74, SEE = 1.12 years). In athletes whose birth certificates were registered late (> 1 year post-birth), TW3 revealed that 28.4% exceeded the documented age cutoff by more than 1.5 biological years.',
      conclusion: 'The TW3 RUS skeletal scoring protocol provides the most robust, legally defensible, and reproducible diagnostic standard for sports associations in India. Incorporating digital radiographic protocols alongside municipal digital verification eradicates overage participation while protecting late-maturing genuine athletes from wrongful exclusion.',
    },
    keywords: [
      'Age Fraud Elimination',
      'Tanner-Whitehouse 3 (TW3)',
      'Skeletal Maturity',
      'Demirjian Dental Method',
      'National Sports Code',
      'Junior Selection Integrity',
    ],
    sections: [
      {
        title: '1. The Age Fraud Challenge in Indian Grassroots Sports',
        paragraphs: [
          'The drive to secure sports quota employment, state cash incentives, and national academy admissions has fueled a persistent culture of document manipulation in junior state championships.',
          'Under the National Code against Age Fraud in Sports issued by the Ministry of Youth Affairs and Sports, federations must enforce objective biological verification when documentary discrepancies arise.',
        ],
      },
      {
        title: '2. Diagnostic Protocols and Precision Rates',
        paragraphs: [
          'Wrist radiographs were captured with strict radiation safety collimation (< 0.001 mSv effective dose, comparable to 20 minutes of natural background radiation). Two independent pediatric radiologists blinded to the chronological documents graded 13 skeletal centers.',
        ],
        tableData: {
          caption: 'Table 3: Diagnostic Reliability of Skeletal vs Dental Aging Methods',
          headers: ['Diagnostic Method', 'Correlation (r)', 'Standard Error (Years)', 'Inter-Rater Reliability (ICC)', 'Diagnostic Sensitivity'],
          rows: [
            ['TW3 Skeletal (RUS Score)', '0.89', '0.64', '0.94', '91.2%'],
            ['Demirjian Dental Maturation', '0.74', '1.12', '0.82', '76.8%'],
            ['Greulich-Pyle Atlas Method', '0.81', '0.88', '0.86', '82.4%'],
          ],
        },
      },
      {
        title: '3. Legal and Ethical Guidelines for State Federations',
        paragraphs: [
          'Skeletal maturity should never be used as a standalone punitive mechanism; normal biological variance encompasses ± 1 standard deviation. Federations must pair radiographic scoring with digital birth verification databases to guarantee fairness.',
        ],
      },
    ],
    ethicsStatement: 'All radiographic procedures were conducted in certified diagnostic imaging centres adhering to ALARA (As Low As Reasonably Achievable) radiation safety guidelines. Approved by PGIMER Institutional Review Board.',
    dataAvailability: 'De-identified scoring indices and inter-rater reliability datasets are available under KhelChronicle accession KG-DATA-2026-003.',
    fundingStatement: 'Supported by the Sports Integrity & Anti-Fraud Research Consortium.',
    conflictsOfInterest: 'None declared.',
    references: [
      { id: 1, text: 'Tanner, J. M., Healy, M. J. R., Goldstein, H., & Cameron, N. (2001). Assessment of skeletal maturity and prediction of adult height (TW3 method). W.B. Saunders, London.' },
      { id: 2, text: 'Demirjian, A., Goldstein, H., & Tanner, J. M. (1973). A new system of dental age assessment. Human Biology, 45(2), 211-227.' },
      { id: 3, text: 'National Code against Age Fraud in Sports (2010). Government of India, Ministry of Youth Affairs and Sports.' },
    ],
    connectedKhelGridLinks: [
      { label: 'Browse Verified Trials Free of Age-Fraud', href: '/opportunities', badge: 'Verified Combines', description: 'Explore selections vetted against KhelGrid’s 4-tier anti-scam integrity protocol.' },
      { label: 'Review KhelGrid Verification Policy', href: '/verification-policy', badge: 'Legal Policy', description: 'Read platform policies regarding authentic athlete certificate verification.' },
    ],
  },
  {
    id: 'paper-4',
    paperId: 'KG-2026-004',
    slug: 'predictive-talent-identification-models-domestic-cricket',
    title: 'Machine Learning Predictive Modeling for Grassroots Talent Identification in Domestic Cricket: Beyond Traditional Batting Averages',
    subtitle: 'Extracting non-linear performance indicators from tracking data and multi-spell fatigue metrics in U-16 state selection combines',
    category: 'sports-analytics',
    categoryName: 'Sports Analytics',
    authors: [
      RESEARCH_AUTHORS['ananya-mukherjee'],
      RESEARCH_AUTHORS['dr-alok-sen'],
    ],
    datePublished: '2026-10-06',
    dateModified: '2026-10-14',
    version: 'v1.0',
    status: 'screened',
    license: 'CC BY-NC-ND 4.0',
    readingTimeMinutes: 15,
    metrics: {
      downloads: 390,
      views: 1980,
      citations: 2,
    },
    abstract: {
      background: 'Traditional cricket talent identification predominantly relies upon aggregate outcome metrics such as batting averages and strike rates recorded across small sample sizes. In competitive age-group selections, these metrics are distorted by match situations, opposition bowling strength, and pitch deterioration.',
      methods: 'Ball-tracking computer vision data and inertial sensor metrics were gathered across 14,200 deliveries bowled during competitive U-16 state selection combine matches. Features including false-shot percentage, boundary-to-dot ratio, seam release consistency, and velocity retention across 4-over spells were trained using an ensemble Gradient Boosting model (XGBoost) to predict selection into final state tournament squads.',
      results: 'The machine learning model predicted subsequent squad retention with an Area Under the Curve (AUC) of 0.88, significantly outperforming traditional batting and bowling averages (AUC = 0.63, p < 0.001). Ball release consistency and control percentage against back-of-a-length deliveries were the two highest feature importance drivers for batters.',
      conclusion: 'Algorithmic performance evaluation provides objective, bias-free decision support for selectors and coaches, democratizing scouting for athletes from remote districts who lack high-profile school team reputations.',
    },
    keywords: [
      'Cricket Data Science',
      'XGBoost Predictive Modeling',
      'Computer Vision Tracking',
      'Talent Identification Algorithms',
      'Control Percentage',
      'Grassroots Analytics',
    ],
    sections: [
      {
        title: '1. Limitations of Classical Outcome Metrics',
        paragraphs: [
          'A batter scoring 40 runs with an 85% control rate against a quality bowling attack demonstrates higher predictive potential than a batter scoring 70 runs with multiple dropped catches and mis-timed edges.',
        ],
      },
      {
        title: '2. Feature Engineering and Model Architecture',
        paragraphs: [
          'Feature selection extracted 24 kinematic and ball-tracking variables. Models were validated using 5-fold cross-validation with hyperparameter grid optimization.',
        ],
        tableData: {
          caption: 'Table 4: Model Performance Comparison for Athlete Selection Prediction',
          headers: ['Model Architecture', 'Precision', 'Recall', 'F1-Score', 'ROC-AUC'],
          rows: [
            ['Traditional Metrics (Average + Strike Rate)', '0.58', '0.62', '0.60', '0.63'],
            ['Logistic Regression (All Features)', '0.72', '0.74', '0.73', '0.76'],
            ['Random Forest Classifier', '0.81', '0.80', '0.80', '0.84'],
            ['XGBoost Ensemble (KhelGrid Model)', '0.86', '0.88', '0.87', '0.88'],
          ],
        },
      },
    ],
    ethicsStatement: 'Study approved by IIT Madras Academic Research Board. Athlete match data de-identified.',
    dataAvailability: 'Model code and test datasets available on KhelChronicle repository under accession KG-DATA-2026-004.',
    fundingStatement: 'Supported by IIT Madras Sports AI Incubator.',
    conflictsOfInterest: 'None declared.',
    references: [
      { id: 1, text: 'Albert, J. (2010). Baseball and statistics. In Handbook of Statistics (Vol. 30, pp. 1-28). Elsevier.' },
      { id: 2, text: 'Perera, H., Davis, J., & Bandara, B. (2013). A comprehensive statistical evaluation model for cricket players. International Journal of Performance Analysis in Sport, 13(2), 374-389.' },
    ],
    connectedKhelGridLinks: [
      { label: 'Explore KhelGrid Match Centre', href: '/live', badge: 'Live Analytics', description: 'View real-time sports match analytics and win probabilities on KhelGrid.' },
      { label: 'Learn Sports Science on Learning Hub', href: '/learning-hub', badge: 'Knowledge Hub', description: 'Deepen your tactical and analytical sports knowledge with our masterclasses.' },
    ],
  },
  {
    id: 'paper-5',
    paperId: 'KG-2026-005',
    slug: 'grassroots-sports-infrastructure-disparities-rural-india',
    title: 'Structural and Socioeconomic Barriers to Grassroots Athletic Participation: A Geospatial Analysis of Sports Infrastructure Across Rural India',
    subtitle: 'Evaluating multi-modal transit access, synthetic turf availability, and coach-to-athlete ratios across 42 rural districts in Haryana, Odisha, and Maharashtra',
    category: 'sports-policy',
    categoryName: 'Sports Development and Policy',
    authors: [
      RESEARCH_AUTHORS['dr-harendra-singh'],
      RESEARCH_AUTHORS['dr-rajeshwari-nair'],
    ],
    datePublished: '2026-09-28',
    dateModified: '2026-10-08',
    version: 'v1.0',
    status: 'screened',
    license: 'CC BY-NC-ND 4.0',
    readingTimeMinutes: 18,
    metrics: {
      downloads: 470,
      views: 2210,
      citations: 6,
    },
    abstract: {
      background: 'Despite substantive policy enhancements under the Khelo India scheme and increased state budget allocations, disparities in access to certified coaching and standard sporting facilities persist between tier-1 urban metropolitan hubs and rural farming taluks.',
      methods: 'A geospatial mapping study was conducted across 42 rural districts spanning three leading sporting states (Haryana, Odisha, and Maharashtra). GIS spatial analysis mapped travel time to the nearest certified all-weather synthetic track or Olympic-standard turf against district-level socioeconomic indicators, public transport density, and certified coach availability.',
      results: 'Over 68% of grassroots athletes in rural taluks must travel greater than 38 kilometers (mean transit time: 82 minutes) to reach an accredited sports complex. Female participation plummeted sharply where travel times exceeded 45 minutes due to safety concerns and inadequate public transit.',
      conclusion: 'Decentralizing Khelo India State Centres of Excellence into block-level multi-sport training clusters and subsidizing rural transit vouchers are vital policy interventions to ensure equal talent emergence across non-metro India.',
    },
    keywords: [
      'Sports Policy',
      'Geospatial Analysis',
      'Rural Sports Infrastructure',
      'Female Athletic Participation',
      'Khelo India Access',
      'Grassroots Development',
    ],
    sections: [
      {
        title: '1. The Geographic Concentration of Indian Sports Infrastructure',
        paragraphs: [
          'State sports capitals and premier urban districts absorb over 70% of state-level sports capital expenditure, leaving rural talent relying upon un-leveled village grounds and makeshift training gear.',
        ],
      },
      {
        title: '2. Transit Distance and Gender Drop-Off',
        paragraphs: [
          'Our spatial regression models revealed an inverse relationship between distance to certified venues and adolescent female sports retention.',
        ],
        tableData: {
          caption: 'Table 5: Average Distance to Nearest Accredited All-Weather Venue',
          headers: ['State & Region Type', 'Mean Distance (km)', 'Mean One-Way Transit (min)', 'Coach:Athlete Ratio', 'Female Participation Rate'],
          rows: [
            ['Haryana (Rural Districts)', '32.4', '68', '1 : 142', '24.8%'],
            ['Odisha (Tribal Corridors)', '48.6', '104', '1 : 210', '31.2%'],
            ['Maharashtra (Non-Metro Taluks)', '41.2', '86', '1 : 175', '19.4%'],
            ['Metro Benchmarks (Top 16 Hubs)', '6.8', '22', '1 : 34', '42.6%'],
          ],
        },
      },
    ],
    ethicsStatement: 'Field surveys and demographic mappings approved by the Delhi University Institutional Ethics Board.',
    dataAvailability: 'District geospatial shapefiles and anonymized survey datasets are available under accession KG-DATA-2026-005.',
    fundingStatement: 'Supported by the Indian Sports Governance and Rural Development Fund.',
    conflictsOfInterest: 'None declared.',
    references: [
      { id: 1, text: 'NITI Aayog (2018). Revitalizing Sports in India: Strategy for New India @ 75. Government of India.' },
      { id: 2, text: 'Spaaij, R. (2009). The social impact of sport: Diversities, complexities and contexts. Sport in Society, 12(9), 1109-1117.' },
    ],
    connectedKhelGridLinks: [
      { label: 'Explore 16 Metro Sports Complexes Directory', href: '/cities', badge: '16 Cities', description: 'Explore stadium access, coaching centres and public facilities in your city.' },
      { label: 'Find a Game & Community Turf Match', href: '/play', badge: 'Pickup Games', description: 'Find accessible local venues and community matches in your neighborhood.' },
    ],
  },
]

export function getPaperBySlug(slug: string): ResearchPaper | undefined {
  const normalized = slug.toLowerCase().trim()
  return RESEARCH_PAPERS.find(p => p.slug.toLowerCase() === normalized || p.paperId.toLowerCase() === normalized)
}

export function getPapersByCategory(categorySlug: string): ResearchPaper[] {
  const normalized = categorySlug.toLowerCase().trim()
  return RESEARCH_PAPERS.filter(p => p.category.toLowerCase() === normalized)
}

export function getPapersByAuthor(authorSlug: string): ResearchPaper[] {
  const normalized = authorSlug.toLowerCase().trim()
  return RESEARCH_PAPERS.filter(p => p.authors.some(a => a.slug.toLowerCase() === normalized))
}

export function searchPapers(query: string, categoryFilter?: string): ResearchPaper[] {
  const q = query.toLowerCase().trim()
  return RESEARCH_PAPERS.filter(p => {
    if (categoryFilter && categoryFilter !== 'all' && p.category.toLowerCase() !== categoryFilter.toLowerCase()) {
      return false
    }
    if (!q) return true
    const searchSpace = `${p.title} ${p.subtitle || ''} ${p.paperId} ${p.categoryName} ${p.keywords.join(' ')} ${p.authors.map(a => a.name).join(' ')} ${p.abstract.background} ${p.abstract.results}`.toLowerCase()
    return searchSpace.includes(q)
  })
}

export function generateCitations(paper: ResearchPaper): { apa: string; bibtex: string; mla: string; chicago: string; vancouver: string } {
  const authorsApa = paper.authors.map(a => {
    const cleanName = a.name.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.|Shri|Smt\.)\s+/i, '').trim()
    const parts = cleanName.split(/\s+/)
    const last = parts[parts.length - 1]
    const initials = parts.slice(0, -1).map(p => {
      const letter = p.replace(/[^a-zA-Z]/g, '')[0]
      return letter ? `${letter}.` : ''
    }).filter(Boolean).join(' ')
    return initials ? `${last}, ${initials}` : last
  }).join(', & ')

  const year = paper.datePublished.slice(0, 4)

  const apa = `${authorsApa} (${year}). ${paper.title}. KhelChronicle Open Sports Research Archive, ${paper.paperId}, ${paper.version}. https://www.khelgrid.com/khelchronicle/${paper.slug}`

  const bibtex = `@article{${paper.paperId.replace(/[^a-zA-Z0-9]/g, '')}_${year},
  author    = {${paper.authors.map(a => a.name).join(' and ')}},
  title     = {${paper.title}},
  journal   = {KhelChronicle Open Sports Research Archive},
  year      = {${year}},
  volume    = {${paper.version}},
  number    = {${paper.paperId}},
  url       = {https://www.khelgrid.com/khelchronicle/${paper.slug}},
  publisher = {KhelGrid Sports Research}
}`

  const mla = `${paper.authors[0]?.name || 'Author'}, et al. "${paper.title}." KhelChronicle Open Sports Research Archive, vol. ${paper.version}, ${year}, www.khelgrid.com/khelchronicle/${paper.slug}.`

  const chicago = `${paper.authors.map(a => a.name).join(', ')}. "${paper.title}." KhelChronicle Open Sports Research Archive (${year}), ${paper.paperId}.`

  const vancouver = `${paper.authors.map(a => a.name).join(', ')}. ${paper.title}. KhelChronicle Open Sports Res Arch. ${year};(${paper.paperId}):${paper.version}.`

  return { apa, bibtex, mla, chicago, vancouver }
}
