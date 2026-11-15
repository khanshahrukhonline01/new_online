-- KhelGrid development catalogue: SAI November 2026 selection trials.
-- Source basis: three SAI-branded flyers supplied by the user on 2026-10-30.
-- No direct public notice URL was printed/provided; records remain visibly unverified.
-- Do not infer a fee, registration URL, or source verification from the supplied artwork alone.

begin;

alter table public.opportunities
  add column if not exists description text;

insert into public.opportunities (
  slug, title, description, sport_id, opportunity_type, organizer_name, city, venue_name,
  starts_at, ends_at, application_deadline, source_url, source_name,
  verification_status, publication_status
)
values
(
  'sai-stc-padma-hazaribagh-archery-hockey-trials-nov-2026',
  'SAI STC Padma Hazaribagh Selection Trials — Archery & Hockey',
  'Dates shown on the supplied flyer: 2–4 November, 10–12 November, and 17–19 November 2026. Boys and girls; residential and non-residential options are listed. Age: 12–14 years as of 31 March 2026; outstanding athletes up to age 16 may also be considered. The flyer asks for birth-date proof, achievement certificates, educational certificates, passport-size photographs, and originals plus photocopies. Selection uses SAI fitness and skill tests. Travel and other personal expenses are the candidate’s responsibility. Fee and online registration link are not stated in the supplied flyer; confirm with SAI STC Padma before travelling.',
  null, 'trial', 'Sports Authority of India (SAI) — Sports Training Centre, Padma',
  'Hazaribagh, Jharkhand', 'SAI Sports Training Centre, Padma, Hazaribagh, Jharkhand 825411',
  '2026-11-02 00:00:00+05:30', '2026-11-19 23:59:00+05:30', null, null,
  'User-provided SAI flyer (received 30 Oct 2026; direct public notice URL not supplied)',
  'pending_review', 'published'
),
(
  'sai-stc-ranchi-hockey-selection-trials-nov-2026',
  'SAI Sports Training Centre Ranchi — Hockey Selection Trials',
  'Selection trials for boys and girls, residential, as shown on the supplied flyer. Dates: 11–12 November 2026; reporting time 07:00 AM. Registration is listed for 11 November 2026 only. Age: 12–14 years; exceptional talent up to 16 may be considered. Required documents: two passport-size photographs, original Aadhaar and photocopy, date-of-birth proof, medical fitness certificate, sports achievement certificates, and school bonafide document. Boarding/lodging and other benefits are described as benefits after selection; the flyer says no travel allowance or accommodation is provided during the selection trial. Fee and online registration URL are not stated.',
  (select id from public.sports where slug = 'hockey' limit 1),
  'trial', 'Sports Authority of India (SAI) — Sports Training Centre, Ranchi',
  'Ranchi, Jharkhand', 'Gate 16, Birsa Munda Football Stadium, SAI Sports Training Centre, Ranchi',
  '2026-11-11 07:00:00+05:30', '2026-11-12 23:59:00+05:30', null, null,
  'User-provided SAI flyer (received 30 Oct 2026; direct public notice URL not supplied)',
  'pending_review', 'published'
),
(
  'sai-ncoe-bhopal-judo-selection-trials-nov-2026',
  'SAI NCOE Bhopal — Judo Open Selection Trials',
  'Reporting date: 11 November 2026. Selection trials and bouts: 12–14 November 2026. Venue: SAI Central Regional Centre, Bhopal, Madhya Pradesh. The flyer lists age categories 15–18, 19–24, and above 26 years with different national/state/international achievement thresholds; candidates must read the original notice carefully because the exact criteria vary by age group. Required documents include four passport-size photographs, original and photocopy of Aadhaar, date-of-birth proof, medical fitness certificate, sports achievements, and school bonafide document. Weight categories are listed on the supplied flyer. No TA/DA, boarding, or lodging is provided during selection. Registration QR is present on the flyer, but no readable registration URL was supplied.',
  null, 'trial', 'Sports Authority of India (SAI) — National Centre of Excellence, Bhopal',
  'Bhopal, Madhya Pradesh', 'SAI Central Regional Centre, Bhopal, Madhya Pradesh',
  '2026-11-11 07:00:00+05:30', '2026-11-14 23:59:00+05:30', null, null,
  'User-provided SAI flyer (received 30 Oct 2026; direct public notice URL not supplied)',
  'pending_review', 'published'
)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  sport_id = excluded.sport_id,
  opportunity_type = excluded.opportunity_type,
  organizer_name = excluded.organizer_name,
  city = excluded.city,
  venue_name = excluded.venue_name,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  application_deadline = excluded.application_deadline,
  source_url = excluded.source_url,
  source_name = excluded.source_name,
  updated_at = now();

commit;
