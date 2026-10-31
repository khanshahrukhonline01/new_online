-- ============================================================================
-- KhelGrid Seeds: Step 09 - Seed 16 Metro Premier Stadiums & Venue-Sport Mappings
-- Runner: Run in Supabase SQL Editor
-- ============================================================================

begin;

insert into public.venues (
  slug, name, description, city, address, timezone, publication_status, government_facility, source_name, source_url
)
values
  -- 1. Delhi
  ('jawaharlal-nehru-stadium-delhi', 'Jawaharlal Nehru Stadium (JLN)', 'Premier 60,000-seater national athletics and football stadium. Host venue for 2010 Commonwealth Games, SAI national camps, and international athletics meets.', 'Delhi', 'Pragati Vihar, Lodhi Road, New Delhi, Delhi 110003', 'Asia/Kolkata', 'published', true, 'Sports Authority of India', 'https://sportsauthorityofindia.gov.in'),
  ('thyagaraj-stadium-delhi', 'Thyagaraj Sports Complex', 'State-of-the-art green indoor multisport complex equipped with high-grade maple wood flooring for badminton, basketball, volleyball, and table tennis.', 'Delhi', 'INA Colony, Near Safdarjung Airport, New Delhi, Delhi 110023', 'Asia/Kolkata', 'published', true, 'Delhi Government Directorate of Education (Sports)', 'https://edudel.nic.in'),
  ('karni-singh-shooting-range-delhi', 'Dr. Karni Singh Shooting Range', 'World-class 72-acre Olympic standard shooting range featuring 10m, 25m, 50m, and shotgun trap/skeet ranges with electronic SIUS targets.', 'Delhi', 'Surajkund Road, Tughlakabad, New Delhi, Delhi 110044', 'Asia/Kolkata', 'published', true, 'Sports Authority of India', 'https://sportsauthorityofindia.gov.in'),

  -- 2. Mumbai
  ('wankhede-stadium-mumbai', 'Wankhede Stadium', 'Iconic 33,000-capacity international cricket stadium and home of Mumbai Cricket Association. Hosted 2011 ICC Cricket World Cup Final.', 'Mumbai', 'Vinoo Mankad Road, Churchgate, Mumbai, Maharashtra 400020', 'Asia/Kolkata', 'published', false, 'Mumbai Cricket Association', 'https://mumbaicricket.com'),
  ('mca-bkc-ground-mumbai', 'MCA Bandra-Kurla Complex Ground (BKC)', 'Modern multi-pitch cricket facility featuring indoor nets, biomechanics laboratory, and state-of-the-art gymnasium for BCCI state squads.', 'Mumbai', 'Bandra Kurla Complex, Bandra East, Mumbai, Maharashtra 400051', 'Asia/Kolkata', 'published', false, 'Mumbai Cricket Association', 'https://mumbaicricket.com'),
  ('cooperage-football-ground-mumbai', 'Cooperage Football Stadium', 'Historic premier football stadium in South Mumbai equipped with FIFA-certified artificial turf, floodlights, and Western India Football Association academy.', 'Mumbai', 'Maharshi Karve Road, Nariman Point, Mumbai, Maharashtra 400021', 'Asia/Kolkata', 'published', false, 'Western India Football Association', 'https://wifa.in'),

  -- 3. Bengaluru
  ('sree-kanteerava-stadium-bengaluru', 'Sree Kanteerava Outdoor Stadium', 'Historic 25,000-seat athletics and football stadium featuring an 8-lane synthetic running track, high-jump aprons, and multi-tier seating.', 'Bengaluru', 'Kasturba Road, Sampangi Rama Nagar, Bengaluru, Karnataka 560001', 'Asia/Kolkata', 'published', true, 'Department of Youth Empowerment and Sports (DYES) Karnataka', 'https://dyes.karnataka.gov.in'),
  ('m-chinnaswamy-stadium-bengaluru', 'M. Chinnaswamy Stadium', 'Premier 40,000-seat solar-powered cricket stadium featuring advanced SubAir subsurface aeration drainage systems and National Cricket Academy (NCA) facilities.', 'Bengaluru', 'Queens Road, Shivaji Nagar, Bengaluru, Karnataka 560001', 'Asia/Kolkata', 'published', false, 'Karnataka State Cricket Association', 'https://ksca.cricket'),
  ('kanteerava-aquatic-centre-bengaluru', 'Kanteerava Aquatic Centre', 'Olympic-size 50-metre 10-lane competition pool and diving well with heating facilities for national aquatic championships and junior squads.', 'Bengaluru', 'Kasturba Road, Nunegundlapalli, Bengaluru, Karnataka 560001', 'Asia/Kolkata', 'published', true, 'DYES Karnataka', 'https://dyes.karnataka.gov.in'),

  -- 4. Hyderabad
  ('gachibowli-stadium-hyderabad', 'Gachibowli Athletic Stadium', 'Premier 30,000-seater stadium with an 8-lane synthetic track and natural football pitch. Host venue for 2003 Afro-Asian Games.', 'Hyderabad', 'Old Mumbai Highway, Gachibowli, Hyderabad, Telangana 500032', 'Asia/Kolkata', 'published', true, 'Sports Authority of Telangana State (SATS)', 'https://sats.telangana.gov.in'),
  ('gmc-balayogi-stadium-hyderabad', 'GMC Balayogi Indoor Stadium', 'World-class 5,000-seat multi-sport air-conditioned indoor arena hosting elite badminton, basketball, volleyball, and gymnastics competitions.', 'Hyderabad', 'Gachibowli Sports Complex, Hyderabad, Telangana 500032', 'Asia/Kolkata', 'published', true, 'SATS Telangana', 'https://sats.telangana.gov.in'),
  ('rajiv-gandhi-stadium-hyderabad', 'Rajiv Gandhi International Cricket Stadium', 'Premier 55,000-capacity international cricket stadium in Uppal with floodlights and high-performance training nets.', 'Hyderabad', 'Uppal, Hyderabad, Telangana 500039', 'Asia/Kolkata', 'published', false, 'Hyderabad Cricket Association', 'https://hyderabadcricketassociation.com'),

  -- 5. Pune
  ('shree-shiv-chhatrapati-sports-complex-pune', 'Shree Shiv Chhatrapati Sports Complex (Balewadi)', 'Massive 153-acre Olympic-style sports city featuring an athletics stadium, international swimming complex, shooting range, badminton hall, and boxing arena.', 'Pune', 'National Highway 48, Balewadi, Pune, Maharashtra 411045', 'Asia/Kolkata', 'published', true, 'Sports & Youth Services, Government of Maharashtra', 'https://sports.maharashtra.gov.in'),
  ('mca-stadium-gahunje-pune', 'Maharashtra Cricket Association Stadium (Gahunje)', 'Modern 37,000-capacity international cricket stadium along the Mumbai-Pune Expressway designed by Hopkins Architects.', 'Pune', 'Gahunje, Pune, Maharashtra 412101', 'Asia/Kolkata', 'published', false, 'Maharashtra Cricket Association', 'https://cricketmaharashtra.com'),
  ('deccan-gymkhana-pune', 'Deccan Gymkhana Sports Complex', 'Historic multi-sport institution established in 1906 with 11 tennis courts, swimming pools, basketball courts, and cricket pavilion.', 'Pune', 'Prabhat Road, Deccan Gymkhana, Pune, Maharashtra 411004', 'Asia/Kolkata', 'published', false, 'Deccan Gymkhana', 'https://deccangymkhana.org'),

  -- 6. Kolkata
  ('salt-lake-stadium-kolkata', 'Vivekananda Yuba Bharati Krirangan (Salt Lake Stadium)', 'Massive 85,000-seat premier football stadium with FIFA-grade natural turf and 8-lane running track. Host venue for 2017 FIFA U-17 World Cup Final.', 'Kolkata', 'JB Block, Sector III, Bidhannagar, Kolkata, West Bengal 700106', 'Asia/Kolkata', 'published', true, 'Government of West Bengal Department of Youth Services and Sports', 'https://wbsportsandyouth.gov.in'),
  ('eden-gardens-kolkata', 'Eden Gardens', 'Legendary 66,000-seat international cricket ground, one of the oldest and most storied cricket amphitheaters in the world.', 'Kolkata', 'BBD Bagh, Kolkata, West Bengal 700021', 'Asia/Kolkata', 'published', false, 'Cricket Association of Bengal', 'https://cricketassociationofbengal.com'),
  ('mohun-bagan-ground-kolkata', 'Mohun Bagan Athletic Club Ground', 'Historic football stadium and academy training ground located on the Kolkata Maidan with state-of-the-art floodlights and dressing facilities.', 'Kolkata', 'Maidan, Kolkata, West Bengal 700021', 'Asia/Kolkata', 'published', false, 'Mohun Bagan AC', 'https://mohunbaganathleticclub.com'),

  -- 7. Chennai
  ('jawaharlal-nehru-stadium-chennai', 'Jawaharlal Nehru Stadium (Marina Arena)', 'Multipurpose 40,000-capacity stadium featuring an 8-lane synthetic track, natural grass football pitch, and indoor gymnastics arena.', 'Chennai', 'Sydenhams Road, Periyamet, Chennai, Tamil Nadu 600003', 'Asia/Kolkata', 'published', true, 'Sports Development Authority of Tamil Nadu (SDAT)', 'https://sdat.tn.gov.in'),
  ('m-a-chidambaram-stadium-chennai', 'M. A. Chidambaram Stadium (Chepauk)', 'Iconic 38,000-capacity international cricket stadium established in 1916, famous for turning tracks and passionate sports audiences.', 'Chennai', 'Victoria Hostel Road, Chepauk, Chennai, Tamil Nadu 600005', 'Asia/Kolkata', 'published', false, 'Tamil Nadu Cricket Association', 'https://tnca.cricket'),
  ('sdat-tennis-stadium-chennai', 'SDAT Tennis Stadium (Nungambakkam)', 'Premier 5,800-seat centre court tennis stadium featuring 5 championship hard courts. Former host venue of the ATP Chennai Open.', 'Chennai', 'Lake Area, Nungambakkam, Chennai, Tamil Nadu 600034', 'Asia/Kolkata', 'published', true, 'SDAT Tamil Nadu', 'https://sdat.tn.gov.in'),

  -- 8. Ahmedabad
  ('narendra-modi-stadium-ahmedabad', 'Narendra Modi Stadium (Motera)', 'World’s largest sports amphitheater with 132,000 seating capacity, 11 center-strip pitches, 3 practice grounds, and Olympic-size club facilities.', 'Ahmedabad', 'Motera Stadium Road, Sabarmati, Ahmedabad, Gujarat 380005', 'Asia/Kolkata', 'published', false, 'Gujarat Cricket Association', 'https://gujaratcricketassociation.com'),
  ('the-arena-by-transstadia-ahmedabad', 'The Arena by TransStadia', 'Cutting-edge convertible 20,000-seat multi-sport stadium featuring FIFA-standard pitch and patented convertible indoor arena.', 'Ahmedabad', 'Near Kankaria Lake, Maninagar, Ahmedabad, Gujarat 380022', 'Asia/Kolkata', 'published', false, 'TransStadia Infrastructure', 'https://transstadia.com'),
  ('eka-club-sports-arena-ahmedabad', 'Eka Club Sports Arena', 'High-performance urban sports club equipped with 10 badminton courts, heated 50m lap pool, glass squash courts, and table tennis academy.', 'Ahmedabad', 'Kankaria, Ahmedabad, Gujarat 380022', 'Asia/Kolkata', 'published', false, 'Eka Club', 'https://ekaclub.com'),

  -- 9. Chandigarh
  ('pca-stadium-mohali-chandigarh', 'PCA IS Bindra Stadium (Mohali)', 'Renowned 27,000-seat international cricket ground with lush outfield and fast pace-friendly wickets.', 'Chandigarh', 'Sector 63, SAS Nagar, Mohali, Punjab 160062', 'Asia/Kolkata', 'published', false, 'Punjab Cricket Association', 'https://cricketpunjab.in'),
  ('sector-16-cricket-stadium-chandigarh', 'Sector 16 Cricket Stadium', 'Historic municipal cricket stadium in the heart of Chandigarh that hosted legendary Ranji Trophy clashes and international matches.', 'Chandigarh', 'Sector 16, Chandigarh 160015', 'Asia/Kolkata', 'published', true, 'Chandigarh Sports Department', 'https://sportsdept.chd.gov.in'),
  ('sector-42-hockey-stadium-chandigarh', 'Sector 42 Sports Complex Hockey Stadium', 'Premier hockey arena equipped with Olympic blue synthetic astro-turf, floodlights, and high-performance training gymnasium.', 'Chandigarh', 'Sector 42, Chandigarh 160036', 'Asia/Kolkata', 'published', true, 'Chandigarh Sports Department', 'https://sportsdept.chd.gov.in'),

  -- 10. Bhubaneswar
  ('kalinga-stadium-bhubaneswar', 'Kalinga Stadium Sports Complex', 'World-class 55-acre multi-sport complex hosting High-Performance Centres (HPCs) for athletics, football, swimming, gymnastics, and weightlifting.', 'Bhubaneswar', 'Bidyut Marg, Nayapalli, Bhubaneswar, Odisha 751012', 'Asia/Kolkata', 'published', true, 'Sports and Youth Services Department, Odisha', 'https://sports.odisha.gov.in'),
  ('kalinga-hockey-stadium-bhubaneswar', 'Kalinga Hockey Stadium', 'World hockey capital stadium with 16,000 capacity that hosted 2018 and 2023 Men’s FIH Hockey World Cups.', 'Bhubaneswar', 'Kalinga Stadium Complex, Nayapalli, Bhubaneswar, Odisha 751012', 'Asia/Kolkata', 'published', true, 'Government of Odisha', 'https://sports.odisha.gov.in'),
  ('biju-patnaik-swimming-pool-bhubaneswar', 'Biju Patnaik Swimming Pool Complex', 'State-of-the-art all-weather 50m Olympic competition pool, warm-up pool, and diving academy run in partnership with Inspire Institute of Sport (IIS).', 'Bhubaneswar', 'Kalinga Stadium, Nayapalli, Bhubaneswar, Odisha 751012', 'Asia/Kolkata', 'published', true, 'Government of Odisha', 'https://sports.odisha.gov.in'),

  -- 11. Lucknow
  ('ekana-cricket-stadium-lucknow', 'BRSABV Ekana Cricket Stadium', 'Premier 50,000-capacity international cricket stadium with natural grass outfield, modern dugouts, and multi-sport indoor academy.', 'Lucknow', 'Amar Shaheed Path, Gomti Nagar Extension, Lucknow, Uttar Pradesh 226010', 'Asia/Kolkata', 'published', false, 'Ekana Sportz City', 'https://ekana.com'),
  ('kd-singh-babu-stadium-lucknow', 'K. D. Singh Babu Stadium', 'Named after Olympic hockey legend K. D. Singh Babu, featuring a cricket ground, synthetic hockey turf, tennis courts, and boxing ring.', 'Lucknow', 'Hazratganj, Lucknow, Uttar Pradesh 226001', 'Asia/Kolkata', 'published', true, 'UP Sports Directorate', 'https://upsports.gov.in'),
  ('bbd-badminton-academy-lucknow', 'BBD Uttar Pradesh Badminton Academy', 'Premier 10-court indoor air-conditioned wooden badminton arena that hosts the annual Syed Modi International BWF Super 300 Tournament.', 'Lucknow', 'Vipin Khand, Gomti Nagar, Lucknow, Uttar Pradesh 226010', 'Asia/Kolkata', 'published', true, 'UP Badminton Association', 'https://upbadminton.org'),

  -- 12. Jaipur
  ('sawai-mansingh-stadium-jaipur', 'Sawai Mansingh Stadium (SMS)', 'Premier 30,000-capacity international stadium in Rajasthan hosting IPL cricket, national athletics, and state championships.', 'Jaipur', 'Jan Path, Nagar Nigam Colony, Lalkothi, Jaipur, Rajasthan 302005', 'Asia/Kolkata', 'published', true, 'Rajasthan State Sports Council', 'https://rssc.rajasthan.gov.in'),
  ('sms-indoor-sports-arena-jaipur', 'SMS Indoor Sports Complex', 'Air-conditioned wooden-floored arena hosting Pro Kabaddi League, national basketball, and national badminton ranking tournaments.', 'Jaipur', 'SMS Stadium Complex, Lalkothi, Jaipur, Rajasthan 302005', 'Asia/Kolkata', 'published', true, 'Rajasthan State Sports Council', 'https://rssc.rajasthan.gov.in'),
  ('rajasthan-cricket-academy-ground-jaipur', 'Rajasthan Cricket Academy Ground', 'Dedicated cricket training and academy complex with turf practice wickets, bowling machines, and video analysis studios.', 'Jaipur', 'Ambedkar Circle, Lalkothi, Jaipur, Rajasthan 302005', 'Asia/Kolkata', 'published', false, 'Rajasthan Cricket Association', 'https://cricketrajasthan.com'),

  -- 13. Bhopal
  ('tt-nagar-stadium-bhopal', 'Tatya Tope Nagar Stadium (TT Nagar)', 'Historic 20,000-capacity sports complex featuring synthetic athletics track, martial arts hall, boxing rings, and table tennis academy.', 'Bhopal', 'TT Nagar, Bhopal, Madhya Pradesh 462003', 'Asia/Kolkata', 'published', true, 'MP Directorate of Sports and Youth Welfare', 'https://dsywmp.gov.in'),
  ('major-dhyan-chand-hockey-stadium-bhopal', 'Major Dhyan Chand Hockey Stadium', 'Premier synthetic turf hockey stadium that has produced dozens of Olympians for Indian men and women hockey squads.', 'Bhopal', 'Near Polytechnic Square, Shyamla Hills, Bhopal, Madhya Pradesh 462002', 'Asia/Kolkata', 'published', true, 'MP Sports Department', 'https://dsywmp.gov.in'),
  ('sai-regional-centre-goregaon-bhopal', 'SAI Central Regional Sports Centre (Goregaon)', 'Comprehensive 100-acre SAI campus offering world-class training in athletics, kayaking, canoeing, judo, and shooting.', 'Bhopal', 'Goregaon, Gram Bishenkheri, Bhopal, Madhya Pradesh 462044', 'Asia/Kolkata', 'published', true, 'Sports Authority of India', 'https://sportsauthorityofindia.gov.in'),

  -- 14. Kochi
  ('jawaharlal-nehru-international-stadium-kochi', 'Jawaharlal Nehru International Stadium (Kaloor)', 'Iconic 40,000-capacity football and cricket stadium. Celebrated home ground of Kerala Blasters FC in the Indian Super League.', 'Kochi', 'Banerji Road, Kaloor, Kochi, Kerala 682017', 'Asia/Kolkata', 'published', true, 'Greater Cochin Development Authority (GCDA)', 'https://gcda.kerala.gov.in'),
  ('regional-sports-centre-kochi', 'Regional Sports Centre (RSC Kadavanthra)', 'Premier multi-sport club featuring 12 indoor badminton courts, international swimming complex, 4 tennis courts, table tennis hall, and shooting range.', 'Kochi', 'Kadavanthra, Kochi, Kerala 682020', 'Asia/Kolkata', 'published', false, 'Regional Sports Centre Kochi', 'https://rsckochi.com'),
  ('maharajas-college-ground-kochi', 'Maharaja’s College Stadium', 'Central synthetic track and football stadium that serves as Kerala’s traditional nursery for sprint champions and state footballers.', 'Kochi', 'PT Usha Road, Marine Drive, Kochi, Kerala 682011', 'Asia/Kolkata', 'published', true, 'Maharaja’s College / Kerala Sports Council', 'https://maharajas.ac.in'),

  -- 15. Ranchi
  ('birsa-munda-athletics-stadium-ranchi', 'Birsa Munda Athletics Stadium', 'Premier 35,000-capacity Olympic-grade stadium featuring synthetic running tracks, field event facilities, and natural grass football ground.', 'Ranchi', 'Mega Sports Complex, Hotwar, Ranchi, Jharkhand 834015', 'Asia/Kolkata', 'published', true, 'Jharkhand State Sports Promotion Society', 'https://jharkhand.gov.in'),
  ('jsca-international-stadium-ranchi', 'JSCA International Stadium Complex', 'Premier 50,000-capacity cricket stadium with world-class dressing rooms, indoor training facility, and tennis academy.', 'Ranchi', 'Sector 3, Dhurwa, Ranchi, Jharkhand 834004', 'Asia/Kolkata', 'published', false, 'Jharkhand State Cricket Association', 'https://cricjsca.org'),
  ('mega-sports-complex-hotwar-ranchi', 'Mega Sports Complex Hotwar (Khel Gaon)', 'Vast multi-disciplinary sports city featuring 7 indoor stadiums for gymnastics, badminton, boxing, table tennis, wrestling, and swimming.', 'Ranchi', 'Hotwar, Ranchi, Jharkhand 834015', 'Asia/Kolkata', 'published', true, 'Government of Jharkhand', 'https://jharkhand.gov.in'),

  -- 16. Dehradun
  ('rajiv-gandhi-cricket-stadium-dehradun', 'Rajiv Gandhi International Cricket Stadium', 'Scenic 25,000-capacity stadium nestled near the Garhwal Himalayas. Official home venue for Uttarakhand cricket and international friendlies.', 'Dehradun', 'Raipur, Dehradun, Uttarakhand 248008', 'Asia/Kolkata', 'published', true, 'Uttarakhand Sports Department', 'https://sports.uk.gov.in'),
  ('pavilion-ground-dehradun', 'Pavilion Ground Parade Ground', 'Historic sports ground in the centre of Dehradun hosting district football leagues, school cricket, and junior athletics trials.', 'Dehradun', 'Parade Ground Road, Dehradun, Uttarakhand 248001', 'Asia/Kolkata', 'published', true, 'Dehradun Municipal Corporation', 'https://dehradun.nic.in'),
  ('maharana-pratap-sports-college-dehradun', 'Maharana Pratap Sports College Complex', 'Premier state residential sports college featuring 8-lane synthetic track, football ground, boxing rings, and hockey astroturf.', 'Dehradun', 'Raipur Road, Dehradun, Uttarakhand 248008', 'Asia/Kolkata', 'published', true, 'Uttarakhand Sports Department', 'https://sports.uk.gov.in')
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  city = excluded.city,
  address = excluded.address,
  timezone = excluded.timezone,
  publication_status = 'published',
  government_facility = excluded.government_facility,
  source_name = excluded.source_name,
  source_url = excluded.source_url,
  updated_at = now();

-- Map newly added Metro Stadiums to sports in venue_sports
select public.link_venue_sport('jawaharlal-nehru-stadium-delhi', 'athletics');
select public.link_venue_sport('jawaharlal-nehru-stadium-delhi', 'football');
select public.link_venue_sport('jawaharlal-nehru-stadium-delhi', 'weightlifting');

select public.link_venue_sport('thyagaraj-stadium-delhi', 'badminton');
select public.link_venue_sport('thyagaraj-stadium-delhi', 'basketball');
select public.link_venue_sport('thyagaraj-stadium-delhi', 'table-tennis');
select public.link_venue_sport('thyagaraj-stadium-delhi', 'volleyball');

select public.link_venue_sport('karni-singh-shooting-range-delhi', 'shooting');

select public.link_venue_sport('wankhede-stadium-mumbai', 'cricket');
select public.link_venue_sport('mca-bkc-ground-mumbai', 'cricket');
select public.link_venue_sport('cooperage-football-ground-mumbai', 'football');

select public.link_venue_sport('sree-kanteerava-stadium-bengaluru', 'athletics');
select public.link_venue_sport('sree-kanteerava-stadium-bengaluru', 'football');
select public.link_venue_sport('m-chinnaswamy-stadium-bengaluru', 'cricket');
select public.link_venue_sport('kanteerava-aquatic-centre-bengaluru', 'swimming');

select public.link_venue_sport('gachibowli-stadium-hyderabad', 'athletics');
select public.link_venue_sport('gachibowli-stadium-hyderabad', 'football');
select public.link_venue_sport('gmc-balayogi-stadium-hyderabad', 'badminton');
select public.link_venue_sport('gmc-balayogi-stadium-hyderabad', 'basketball');
select public.link_venue_sport('gmc-balayogi-stadium-hyderabad', 'volleyball');
select public.link_venue_sport('rajiv-gandhi-stadium-hyderabad', 'cricket');

select public.link_venue_sport('shree-shiv-chhatrapati-sports-complex-pune', 'athletics');
select public.link_venue_sport('shree-shiv-chhatrapati-sports-complex-pune', 'badminton');
select public.link_venue_sport('shree-shiv-chhatrapati-sports-complex-pune', 'boxing');
select public.link_venue_sport('shree-shiv-chhatrapati-sports-complex-pune', 'swimming');
select public.link_venue_sport('shree-shiv-chhatrapati-sports-complex-pune', 'table-tennis');
select public.link_venue_sport('shree-shiv-chhatrapati-sports-complex-pune', 'wrestling');
select public.link_venue_sport('mca-stadium-gahunje-pune', 'cricket');
select public.link_venue_sport('deccan-gymkhana-pune', 'basketball');
select public.link_venue_sport('deccan-gymkhana-pune', 'swimming');
select public.link_venue_sport('deccan-gymkhana-pune', 'tennis');

select public.link_venue_sport('salt-lake-stadium-kolkata', 'football');
select public.link_venue_sport('salt-lake-stadium-kolkata', 'athletics');
select public.link_venue_sport('eden-gardens-kolkata', 'cricket');
select public.link_venue_sport('mohun-bagan-ground-kolkata', 'football');

select public.link_venue_sport('jawaharlal-nehru-stadium-chennai', 'athletics');
select public.link_venue_sport('jawaharlal-nehru-stadium-chennai', 'football');
select public.link_venue_sport('m-a-chidambaram-stadium-chennai', 'cricket');
select public.link_venue_sport('sdat-tennis-stadium-chennai', 'tennis');

select public.link_venue_sport('narendra-modi-stadium-ahmedabad', 'cricket');
select public.link_venue_sport('the-arena-by-transstadia-ahmedabad', 'football');
select public.link_venue_sport('the-arena-by-transstadia-ahmedabad', 'kabaddi');
select public.link_venue_sport('the-arena-by-transstadia-ahmedabad', 'table-tennis');
select public.link_venue_sport('eka-club-sports-arena-ahmedabad', 'badminton');
select public.link_venue_sport('eka-club-sports-arena-ahmedabad', 'swimming');
select public.link_venue_sport('eka-club-sports-arena-ahmedabad', 'squash');

select public.link_venue_sport('pca-stadium-mohali-chandigarh', 'cricket');
select public.link_venue_sport('sector-16-cricket-stadium-chandigarh', 'cricket');
select public.link_venue_sport('sector-42-hockey-stadium-chandigarh', 'hockey');

select public.link_venue_sport('kalinga-stadium-bhubaneswar', 'athletics');
select public.link_venue_sport('kalinga-stadium-bhubaneswar', 'football');
select public.link_venue_sport('kalinga-stadium-bhubaneswar', 'tennis');
select public.link_venue_sport('kalinga-hockey-stadium-bhubaneswar', 'hockey');
select public.link_venue_sport('biju-patnaik-swimming-pool-bhubaneswar', 'swimming');

select public.link_venue_sport('ekana-cricket-stadium-lucknow', 'cricket');
select public.link_venue_sport('kd-singh-babu-stadium-lucknow', 'cricket');
select public.link_venue_sport('kd-singh-babu-stadium-lucknow', 'hockey');
select public.link_venue_sport('kd-singh-babu-stadium-lucknow', 'football');
select public.link_venue_sport('bbd-badminton-academy-lucknow', 'badminton');

select public.link_venue_sport('sawai-mansingh-stadium-jaipur', 'cricket');
select public.link_venue_sport('sawai-mansingh-stadium-jaipur', 'athletics');
select public.link_venue_sport('sawai-mansingh-stadium-jaipur', 'football');
select public.link_venue_sport('sms-indoor-sports-arena-jaipur', 'badminton');
select public.link_venue_sport('sms-indoor-sports-arena-jaipur', 'basketball');
select public.link_venue_sport('sms-indoor-sports-arena-jaipur', 'kabaddi');
select public.link_venue_sport('rajasthan-cricket-academy-ground-jaipur', 'cricket');

select public.link_venue_sport('tt-nagar-stadium-bhopal', 'athletics');
select public.link_venue_sport('tt-nagar-stadium-bhopal', 'boxing');
select public.link_venue_sport('tt-nagar-stadium-bhopal', 'judo');
select public.link_venue_sport('tt-nagar-stadium-bhopal', 'martial-arts');
select public.link_venue_sport('tt-nagar-stadium-bhopal', 'table-tennis');
select public.link_venue_sport('major-dhyan-chand-hockey-stadium-bhopal', 'hockey');
select public.link_venue_sport('sai-regional-centre-goregaon-bhopal', 'athletics');
select public.link_venue_sport('sai-regional-centre-goregaon-bhopal', 'rowing');
select public.link_venue_sport('sai-regional-centre-goregaon-bhopal', 'shooting');

select public.link_venue_sport('jawaharlal-nehru-international-stadium-kochi', 'cricket');
select public.link_venue_sport('jawaharlal-nehru-international-stadium-kochi', 'football');
select public.link_venue_sport('regional-sports-centre-kochi', 'badminton');
select public.link_venue_sport('regional-sports-centre-kochi', 'swimming');
select public.link_venue_sport('regional-sports-centre-kochi', 'table-tennis');
select public.link_venue_sport('regional-sports-centre-kochi', 'tennis');
select public.link_venue_sport('maharajas-college-ground-kochi', 'athletics');
select public.link_venue_sport('maharajas-college-ground-kochi', 'football');

select public.link_venue_sport('birsa-munda-athletics-stadium-ranchi', 'athletics');
select public.link_venue_sport('birsa-munda-athletics-stadium-ranchi', 'football');
select public.link_venue_sport('jsca-international-stadium-ranchi', 'cricket');
select public.link_venue_sport('mega-sports-complex-hotwar-ranchi', 'gymnastics');
select public.link_venue_sport('mega-sports-complex-hotwar-ranchi', 'swimming');
select public.link_venue_sport('mega-sports-complex-hotwar-ranchi', 'wrestling');

select public.link_venue_sport('rajiv-gandhi-cricket-stadium-dehradun', 'cricket');
select public.link_venue_sport('pavilion-ground-dehradun', 'football');
select public.link_venue_sport('pavilion-ground-dehradun', 'cricket');
select public.link_venue_sport('maharana-pratap-sports-college-dehradun', 'athletics');
select public.link_venue_sport('maharana-pratap-sports-college-dehradun', 'boxing');
select public.link_venue_sport('maharana-pratap-sports-college-dehradun', 'football');
select public.link_venue_sport('maharana-pratap-sports-college-dehradun', 'hockey');

commit;
