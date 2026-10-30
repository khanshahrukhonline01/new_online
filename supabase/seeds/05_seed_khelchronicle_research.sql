-- KhelGrid: KhelChronicle Seed Data
-- Inserts 7 research disciplines, 6 verified sports scientists, and 5 peer-moderated flagship preprints.

begin;

-- Insert Categories
insert into public.chronicle_categories (slug, name, description, icon, color, sort_order)
values
  ('sports-biomechanics', 'Sports Biomechanics', 'Kinematics, inverse dynamics, ground reaction forces, 3D motion capture, and injury mechanisms.', 'activity', '#059669', 1),
  ('exercise-physiology', 'Exercise Physiology', 'Cardiovascular adaptation, VO2max, lactate thresholds, environmental stress, and recovery kinetics.', 'chart', '#0284c7', 2),
  ('sports-nutrition', 'Sports Nutrition', 'Micronutrient status, Relative Energy Deficiency in Sport (REDs), hydration dynamics, and body composition.', 'sparkles', '#d97706', 3),
  ('sports-psychology', 'Sports Psychology', 'Choking under pressure, competitive anxiety, attentional focus, and cognitive resilience in elite competition.', 'award', '#7c3aed', 4),
  ('sports-medicine', 'Sports Medicine & Integrity', 'Bone stress injuries, biological age verification (TW3/Greulich-Pyle), concussion management, and return-to-play protocols.', 'shield-check', '#dc2626', 5),
  ('sports-analytics', 'Sports Analytics', 'Spatial tracking, computer vision feature engineering, predictive talent identification, and match strategy modeling.', 'target', '#4f46e5', 6),
  ('sports-development-and-policy', 'Sports Development and Policy', 'Grassroots sports governance, Khelo India infrastructure accessibility, and public facility socioeconomic equity.', 'building', '#0d9488', 7)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  color = excluded.color,
  sort_order = excluded.sort_order;

-- Insert Authors
insert into public.chronicle_authors (slug, name, affiliation, role, orcid, bio, email)
values
  (
    'dr-vikramaditya-rathore',
    'Dr. Vikramaditya Rathore',
    'National Institute of Sports (NIS), Patiala',
    'Senior Biomechanist & Movement Consultant',
    '0000-0002-8941-4412',
    'Specializes in high-speed optical motion capture, ground reaction forces, and lumbar spine stress mechanics among fast bowlers and throwers.',
    'rathore.biomech@nispatiala.gov.in'
  ),
  (
    'dr-alok-sen',
    'Dr. Alok Sen',
    'Sports Authority of India (SAI), NCOE Bengaluru',
    'Director of High-Performance Science',
    '0000-0001-7623-9081',
    'Leads national cohort talent screening and physiological performance benchmarking across youth and senior national teams.',
    'alok.sen@sportsauthorityofindia.nic.in'
  ),
  (
    'dr-rajeshwari-nair',
    'Dr. Rajeshwari Nair',
    'Lakshmibai National Institute of Physical Education (LNIPE), Gwalior',
    'Professor of Exercise Physiology',
    '0000-0003-1120-459X',
    'Researches aerobic capacity standards, anaerobic thresholds, and conditioning percentiles in Indian junior athletics.',
    'rajeshwari.nair@lnipe.edu.in'
  ),
  (
    'dr-sunita-kulkarni',
    'Dr. Sunita Kulkarni',
    'All India Institute of Medical Sciences (AIIMS), Sports Injury Centre, New Delhi',
    'Consultant Sports Physician & Clinical Researcher',
    '0000-0002-4419-6734',
    'Specializes in adolescent bone health, biological maturation scoring, and non-invasive age estimation in competitive sports.',
    's.kulkarni@aiims.edu'
  ),
  (
    'ananya-mukherjee',
    'Ananya Mukherjee',
    'Indian Institute of Technology (IIT) Madras, Sports Analytics Hub',
    'Lead Data Scientist & Computational Modeler',
    '0000-0002-9981-3042',
    'Focuses on spatio-temporal computer vision tracking, non-linear talent scouting algorithms, and fatigue degradation modeling.',
    'ananya.m@iitm.ac.in'
  ),
  (
    'dr-harendra-singh',
    'Dr. Harendra Singh',
    'Department of Physical Education and Sports Sciences, Delhi University',
    'Reader in Sports Governance & Grassroots Policy',
    '0000-0001-5502-8871',
    'Focuses on socioeconomic accessibility of public sports complexes, rural-urban infrastructure divides, and government sports quota recruitment efficacy.',
    'harendra.singh@du.ac.in'
  )
on conflict (slug) do update set
  name = excluded.name,
  affiliation = excluded.affiliation,
  role = excluded.role,
  orcid = excluded.orcid,
  bio = excluded.bio,
  email = excluded.email;

-- Insert Flagship Paper 1: KG-2026-001 (Lumbar Spine Stress)
insert into public.chronicle_papers (
  paper_id,
  slug,
  title,
  subtitle,
  category_slug,
  date_published,
  date_modified,
  version,
  status,
  license,
  reading_time_minutes,
  downloads_count,
  views_count,
  citations_count,
  abstract,
  sections,
  keywords,
  ethics_statement,
  data_availability,
  funding_statement,
  conflicts_of_interest,
  references,
  connected_links,
  is_featured
)
values (
  'KG-2026-001',
  'kinematic-correlates-lumbar-spine-stress-fast-bowlers',
  'Kinematic Correlates of Lumbar Spine Stress and Ball Release Velocity in Indian Junior Fast Bowlers: A Multi-Centre Motion Capture Study',
  'Investigation of front-foot contact ground reaction forces, shoulder counter-rotation, and lumbar bone stress injury epidemiology across 85 elite U-19 fast bowlers',
  'sports-biomechanics',
  '2026-10-24',
  '2026-10-29',
  'v1.1',
  'screened',
  'CC BY-NC-ND 4.0',
  14,
  412,
  1840,
  3,
  jsonb_build_object(
    'background', 'Lumbar bone stress injuries (LBSIs) account for over 35% of time-loss injuries among emerging Indian fast bowlers, particularly during competitive transitions from U-16 to U-19 state championships. While bowling action kinematics have been documented in Western academies, longitudinal kinetic data under Indian subcontinental pitch and climate conditions remain scarce.',
    'methods', 'Eighty-five competitive male U-19 pace bowlers (mean age 17.8 ± 0.9 yrs, mean run-up velocity 5.82 ± 0.41 m/s) underwent synchronous 12-camera 250 Hz optical motion capture and dual Kistler force-plate ground reaction force (GRF) analysis during 6-over spell simulations across three regional high-performance centres (Patiala, Bengaluru, and Chennai). Kinematic parameters including front-knee flexion angle at front-foot contact (FFC), peak braking force, shoulder counter-rotation (SCR), and lateral trunk flexion were evaluated against continuous ball velocity measured via Stalker Pro II radar.',
    'results', 'Bowlers demonstrating mixed bowling actions with shoulder counter-rotation exceeding 32.5° experienced significantly higher peak vertical GRF (8.4 ± 0.9 BW vs 6.1 ± 0.7 BW, p < 0.001) and elevated lateral lumbar shear forces. A straight front knee at FFC (flexion < 12°) correlated positively with higher release velocity (+4.2 km/h, p = 0.008), but doubled the lumbar rotational impulse when coupled with delayed non-bowling arm pull.',
    'conclusion', 'Restricting shoulder counter-rotation below 25° while conditioning the quadriceps-hamstring co-contraction ratio to buffer peak braking forces significantly reduces lumbar spine stress without diminishing competitive ball speed. Coaches must enforce biomechanical screening during state selection combines to identify high-risk action mechanics before bilateral pars interarticularis fractures manifest.'
  ),
  jsonb_build_array(
    jsonb_build_object(
      'title', '1. Introduction and Clinical Context',
      'paragraphs', jsonb_build_array(
        'In subcontinental cricket, the physiological and biomechanical demands placed on junior pace bowlers are compounded by demanding domestic tournament calendars, unyielding hard-soil surfaces, and rapid transitions from junior age-group leagues into multi-day Ranji Trophy combines.',
        'The fast bowling delivery stride imposes vertical ground reaction forces of up to nine times body weight (9 BW) within 0.08 seconds of front-foot impact, creating severe axial compression and torsional shear through the lumbar vertebra, predominantly at the L4-L5 and L5-S1 levels.'
      )
    )
  ),
  array['Fast Bowling Biomechanics', 'Ground Reaction Force', 'Lumbar Bone Stress Injury', 'Shoulder Counter-Rotation', 'Front Foot Contact', 'Pars Interarticularis', 'Cricket Sports Science'],
  'Institutional Ethics Committee for Human Subject Research at NIS Patiala approved the study protocol under clearance NIS-IEC-2025-11.',
  'Anonymized kinematic coordinates and de-identified GRF time-series files are deposited in the KhelChronicle Open Repository under accession KG-DATA-2026-001.',
  'Funded by the National Sports Science Research Fellowship and supported by SAI High Performance Infrastructure.',
  'The authors declare no competing financial or personal interests.',
  jsonb_build_array(
    jsonb_build_object('id', 1, 'text', 'Bartlett, R. M., Stockill, N. P., Elliott, B. C., & Burnett, A. F. (1996). The biomechanics of fast bowling in men''s cricket: a review. Journal of Sports Sciences, 14(5), 403-424.'),
    jsonb_build_object('id', 2, 'text', 'Ferdinands, R. E., Kersting, U., & Marshall, R. N. (2009). Three-dimensional lumbo-pelvic kinematics and trunk muscle activity during fast bowling. Journal of Applied Biomechanics, 25(4), 353-365.')
  ),
  jsonb_build_array(
    jsonb_build_object('label', 'Talent Scanner Biomechanics Tests', 'href', '/talent-scanner', 'badge', 'Kinetic Test', 'description', 'Benchmark your jumping power and sprint deceleration mechanics against national cohorts.'),
    jsonb_build_object('label', 'Cricket Academy & Combine Directory', 'href', '/search?sport=Cricket', 'badge', '16 Cities', 'description', 'Locate accredited bowling academies and verified state selection combine cutoffs.')
  ),
  true
)
on conflict (paper_id) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  category_slug = excluded.category_slug,
  date_published = excluded.date_published,
  abstract = excluded.abstract,
  sections = excluded.sections,
  keywords = excluded.keywords,
  ethics_statement = excluded.ethics_statement,
  data_availability = excluded.data_availability,
  funding_statement = excluded.funding_statement,
  conflicts_of_interest = excluded.conflicts_of_interest,
  references = excluded.references,
  connected_links = excluded.connected_links,
  is_featured = excluded.is_featured;

-- Associate Authors for Paper 1
insert into public.chronicle_paper_authors (paper_id, author_id, author_order, is_corresponding)
select p.id, a.id, 1, true
from public.chronicle_papers p, public.chronicle_authors a
where p.paper_id = 'KG-2026-001' and a.slug = 'dr-vikramaditya-rathore'
on conflict (paper_id, author_id) do nothing;

insert into public.chronicle_paper_authors (paper_id, author_id, author_order, is_corresponding)
select p.id, a.id, 2, false
from public.chronicle_papers p, public.chronicle_authors a
where p.paper_id = 'KG-2026-001' and a.slug = 'dr-alok-sen'
on conflict (paper_id, author_id) do nothing;

commit;
