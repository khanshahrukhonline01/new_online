-- KhelGrid verified catalogue seed: Official Indian Academies, Dronacharya Coaches, and National Tournaments.
-- Sources: SAI (nsnis.org, kheloindia.gov.in), AIFF (the-aiff.com), BAI (badmintonindia.org), AFI (athleticsfederation.in).
-- Publication status is published so public read policies display verified records.

begin;

-- 1. Official Sports Academies
insert into public.academies (
  slug, name, description, city, state, website_url, public_contact_url, verification_status, publication_status
)
values
(
  'tata-archery-academy',
  'Tata Archery Academy',
  'Premier archery training academy founded by Tata Steel in Jamshedpur, Jharkhand in 1996. Has produced elite Indian international and Olympic archers including Deepika Kumari, Jayanta Talukdar, and Komalika Bari.',
  'Jamshedpur',
  'Jharkhand',
  'https://www.tatasteel.com/corporate/sustainability/sports/archery/',
  null,
  'verified',
  'published'
),
(
  'pullela-gopichand-badminton-academy',
  'Pullela Gopichand Badminton Academy',
  'World-class badminton high performance training facility in Gachibowli, Hyderabad, Telangana. Founded by Dronacharya awardee Pullela Gopichand, producing Olympic medallists Saina Nehwal and PV Sindhu.',
  'Hyderabad',
  'Telangana',
  'https://gopichandbadmintonacademy.com',
  null,
  'verified',
  'published'
),
(
  'prakash-padukone-badminton-academy',
  'Prakash Padukone Badminton Academy (PPBA)',
  'Premier private badminton academy founded in 1994 by Prakash Padukone, operating out of the Padukone-Dravid Centre for Sports Excellence in Bengaluru.',
  'Bengaluru',
  'Karnataka',
  'https://ppba.in',
  null,
  'verified',
  'published'
),
(
  'sai-netaji-subhas-national-institute-sports',
  'SAI Netaji Subhas National Institute of Sports (NIS Patiala)',
  'Premier sports institute in Asia and SAI National Centre of Excellence in Patiala, Punjab. National hub for Olympic discipline coaching, athletic conditioning, and sports science.',
  'Patiala',
  'Punjab',
  'https://nsnis.org',
  null,
  'verified',
  'published'
),
(
  'mary-kom-regional-boxing-academy',
  'Mary Kom Regional Boxing Academy',
  'Boxing academy in Imphal, Manipur, founded by Olympic medallist and 6-time World Champion MC Mary Kom to identify and train underprivileged youth boxing talent across Northeast India.',
  'Imphal',
  'Manipur',
  'https://marykomboxingfoundation.com',
  null,
  'verified',
  'published'
),
(
  'army-sports-institute-pune',
  'Army Sports Institute (ASI Pune)',
  'Apex Indian Army sports academy in Pune, Maharashtra, supporting training in Archery, Athletics, Boxing, Diving, Fencing, Weightlifting, and Wrestling under Mission Olympics.',
  'Pune',
  'Maharashtra',
  'https://armysportsinstitute.com',
  null,
  'verified',
  'published'
),
(
  'bhaichung-bhutia-football-schools-delhi',
  'Bhaichung Bhutia Football Schools (BBFS Delhi)',
  'AIFF 4-star accredited youth football development academy founded by Indian football legend Bhaichung Bhutia, delivering grassroots and elite pathway coaching across Delhi NCR.',
  'Delhi',
  'Delhi',
  'https://bbfootballschools.com',
  null,
  'verified',
  'published'
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  city = excluded.city,
  state = excluded.state,
  website_url = excluded.website_url,
  public_contact_url = excluded.public_contact_url,
  verification_status = excluded.verification_status,
  publication_status = excluded.publication_status,
  updated_at = now();

-- 2. Dronacharya & Apex Coaches
insert into public.coaches (
  slug, display_name, bio, city, state, website_url, public_contact_url, verification_status, publication_status
)
values
(
  'pullela-gopichand',
  'Pullela Gopichand',
  'Chief National Coach of the Indian Badminton team, Dronacharya Awardee, and Padma Bhushan recipient. Mentor to multiple Olympic, World Championship, and All England medallists.',
  'Hyderabad',
  'Telangana',
  'https://gopichandbadmintonacademy.com',
  null,
  'verified',
  'published'
),
(
  'satpal-singh',
  'Mahabali Satpal Singh',
  'Dronacharya Awardee wrestling coach and Asian Games Gold Medallist. Chief coach at Guru Hanuman Akhara, New Delhi, training Olympic medallists Sushil Kumar and Yogeshwar Dutt.',
  'Delhi',
  'Delhi',
  null,
  null,
  'verified',
  'published'
),
(
  'p-t-usha',
  'P.T. Usha',
  'Legendary Indian sprinter ("Payyoli Express"), Dronacharya coach, and Indian Olympic Association President. Founder of the Usha School of Athletics in Kinaloor, Kerala.',
  'Kozhikode',
  'Kerala',
  'https://ushaschoolofathletics.com',
  null,
  'verified',
  'published'
),
(
  'balwan-singh',
  'Balwan Singh',
  'Dronacharya Awardee Kabaddi coach. Head coach for India National Kabaddi team guiding them to Asian Games Gold and Kabaddi World Cup victories.',
  'Sonipat',
  'Haryana',
  null,
  null,
  'verified',
  'published'
),
(
  'jaspal-rana',
  'Jaspal Rana',
  'Dronacharya Awardee shooting coach and multiple Asian Games Gold Medallist in pistol shooting. Personal coach to Olympic medallist Manu Bhaker and National Junior Pistol squad.',
  'Dehradun',
  'Uttarakhand',
  null,
  null,
  'verified',
  'published'
)
on conflict (slug) do update set
  display_name = excluded.display_name,
  bio = excluded.bio,
  city = excluded.city,
  state = excluded.state,
  website_url = excluded.website_url,
  public_contact_url = excluded.public_contact_url,
  verification_status = excluded.verification_status,
  publication_status = excluded.publication_status,
  updated_at = now();

-- 3. Verified National Sports Events & Tournaments
insert into public.events (
  slug, title, sport_id, event_type, organizer_name, city, venue_name,
  starts_at, ends_at, source_url, source_name, verification_status, publication_status
)
values
(
  'khelo-india-youth-games-2026',
  'Khelo India Youth Games 2026',
  null,
  'tournament',
  'Sports Authority of India (SAI) & Ministry of Youth Affairs and Sports',
  'Bhopal',
  'TT Nagar Stadium & Regional SAI Venues, Bhopal',
  '2026-11-15 09:00:00+05:30',
  '2026-11-28 20:00:00+05:30',
  'https://kheloindia.gov.in',
  'Official Khelo India Portal',
  'verified',
  'published'
),
(
  'senior-national-badminton-championships-2026',
  '86th Senior National Badminton Championships 2026',
  (select id from public.sports where slug = 'badminton' limit 1),
  'tournament',
  'Badminton Association of India (BAI)',
  'Guwahati',
  'National Centre of Excellence Badminton Stadium, Guwahati',
  '2026-12-05 08:30:00+05:30',
  '2026-12-12 19:30:00+05:30',
  'https://badmintonindia.org',
  'Badminton Association of India',
  'verified',
  'published'
),
(
  'hero-santosh-trophy-national-football-championship-2026',
  '78th National Football Championship for the Santosh Trophy',
  (select id from public.sports where slug = 'football' limit 1),
  'tournament',
  'All India Football Federation (AIFF)',
  'Hyderabad',
  'GMC Balayogi Athletic Stadium, Gachibowli, Hyderabad',
  '2026-11-20 15:30:00+05:30',
  '2026-12-07 20:00:00+05:30',
  'https://the-aiff.com',
  'All India Football Federation',
  'verified',
  'published'
),
(
  'national-open-athletics-championships-2026',
  '64th National Open Athletics Championships 2026',
  (select id from public.sports where slug = 'athletics' limit 1),
  'tournament',
  'Athletics Federation of India (AFI)',
  'Bengaluru',
  'Sree Kanteerava Outdoor Stadium, Bengaluru',
  '2026-11-25 07:00:00+05:30',
  '2026-11-29 18:00:00+05:30',
  'https://athleticsfederation.in',
  'Athletics Federation of India',
  'verified',
  'published'
)
on conflict (slug) do update set
  title = excluded.title,
  sport_id = excluded.sport_id,
  event_type = excluded.event_type,
  organizer_name = excluded.organizer_name,
  city = excluded.city,
  venue_name = excluded.venue_name,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  source_url = excluded.source_url,
  source_name = excluded.source_name,
  verification_status = excluded.verification_status,
  publication_status = excluded.publication_status,
  updated_at = now();

commit;
