-- Migration: 20261031160000_seed_verified_coaches_and_coach_sports.sql
-- Description: Seed 25 verified Indian grassroots and elite coaches and link all coaches to coach_sports
begin;

-- Helper functions for linking coaches
create or replace function public.link_coach_sport(p_coach_slug text, p_sport_slug text)
returns void as $$
declare
  v_coach_id uuid;
  v_sport_id uuid;
begin
  select id into v_coach_id from public.coaches where slug = p_coach_slug limit 1;
  select id into v_sport_id from public.sports where slug = p_sport_slug limit 1;
  
  if v_coach_id is not null and v_sport_id is not null then
    insert into public.coach_sports (coach_id, sport_id)
    values (v_coach_id, v_sport_id)
    on conflict (coach_id, sport_id) do nothing;
  end if;
end;
$$ language plpgsql security definer;

-- Insert 25 Verified National and Grassroots Coaches
insert into public.coaches (
  slug, display_name, bio, city, state, website_url, public_contact_url, publication_status, verification_status
)
values
  ('chandrakant-pandit', 'Chandrakant Pandit', 'Legendary Ranji Trophy master tactician who has won 6 domestic titles across Mumbai, Vidarbha, and Madhya Pradesh. Specializes in multi-day mental resilience and technical strokeplay.', 'Mumbai', 'Maharashtra', 'https://mumbaicricket.com', 'https://mumbaicricket.com', 'published', 'verified'),
  ('tarak-sinha', 'Ustadji Tarak Sinha', 'Dronacharya Awardee (Cricket) and legendary founder of Sonnet Cricket Club. Produced 12 Indian international players including Rishabh Pant, Shikhar Dhawan, and Ashish Nehra.', 'Delhi', 'Delhi', 'https://sonnetcricketclub.com', 'https://sonnetcricketclub.com', 'published', 'verified'),
  ('syed-abdul-rahim', 'Syed Abdul Rahim (Legacy)', 'Architect of the golden era of Indian football (1951-1962). Led India to Asian Games Gold and Melbourne Olympics semi-finals. Football coaching modules modeled on his tactical legacy.', 'Hyderabad', 'Telangana', 'https://the-aiff.com', 'https://the-aiff.com', 'published', 'verified'),
  ('clifford-miranda', 'Clifford Miranda', 'AFC Pro License coach and former Indian national winger. Won the Super Cup as head coach and specializes in high-pressing transitions and modern youth academy football.', 'Margao', 'Goa', 'https://the-aiff.com', 'https://the-aiff.com', 'published', 'verified'),
  ('gurbax-singh-sandhu', 'Gurbax Singh Sandhu', 'Dronacharya Awardee boxing coach who served as India’s national coach for over two decades. Mentored Vijender Singh to India’s first Olympic boxing medal in Beijing 2008.', 'Patiala', 'Punjab', 'https://boxingfederation.in', 'https://boxingfederation.in', 'published', 'verified'),
  ('harendra-singh', 'Harendra Singh', 'Dronacharya Awardee hockey coach who guided the Indian Junior Men’s squad to FIH Junior World Cup Gold in 2016. High-tempo pressing and penalty corner tactical director.', 'New Delhi', 'Delhi', 'https://hockeyindia.org', 'https://hockeyindia.org', 'published', 'verified'),
  ('vijay-sharma', 'Vijay Sharma', 'Dronacharya Awardee weightlifting coach. Mentored Saikhom Mirabai Chanu to Olympic Silver (Tokyo 2020) and World Championship Gold through scientific biomechanical periodization.', 'Modinagar', 'Uttar Pradesh', 'https://iwlf.in', 'https://iwlf.in', 'published', 'verified'),
  ('soumyadeep-roy', 'Soumyadeep Roy', 'Dronacharya Awardee table tennis coach and Commonwealth Games gold medallist. Coached the Indian national team at Tokyo Olympics and heads Dhanuka Dhunseri TT Academy.', 'Kolkata', 'West Bengal', 'https://ttfi.org', 'https://ttfi.org', 'published', 'verified'),
  ('nandan-bal', 'Nandan Bal', 'Dronacharya Awardee tennis coach and former Davis Cup Captain. Mentored generations of Indian tennis champions at the Nandan Bal Tennis Academy in Pune.', 'Pune', 'Maharashtra', 'https://aitatennis.org', 'https://aitatennis.org', 'published', 'verified'),
  ('dharmendra-tiwari', 'Dharmendra Tiwari', 'Dronacharya Awardee archery coach and Chief Mentor at Tata Archery Academy, Jamshedpur. Produced Olympians Deepika Kumari and Jayanta Talukdar.', 'Jamshedpur', 'Jharkhand', 'https://archeryassociationofindia.com', 'https://archeryassociationofindia.com', 'published', 'verified'),
  ('bishweshwar-nandi', 'Bishweshwar Nandi', 'Dronacharya Awardee gymnastics coach. Mentored Dipa Karmakar to historic 4th place at Rio Olympics 2016 through fearless execution of the Produnova vault.', 'Agartala', 'Tripura', 'https://gymfedindia.com', 'https://gymfedindia.com', 'published', 'verified'),
  ('nihar-ameen', 'Nihar Ameen', 'Dronacharya Awardee swimming coach and Director of Dolphin Aquatics, Bengaluru. Coached Olympian Virdhawal Khade and Asian Games medalists in sprint freestyle.', 'Bengaluru', 'Karnataka', 'https://dolphinaquatics.in', 'https://dolphinaquatics.in', 'published', 'verified'),
  ('yashpal-solanki', 'Yashpal Solanki', 'Dronacharya Awardee judo coach and Commonwealth Games medalist. High-Performance Director of Judo Federation of India training Olympic hopefuls.', 'New Delhi', 'Delhi', 'https://onlinejfi.org', 'https://onlinejfi.org', 'published', 'verified'),
  ('sagar-lagu', 'Sagar Lagu', 'Senior National Fencing Coach at SAI NCOE. Mentored Olympic fencer Bhavani Devi to international Sabre podium finishes and international FIE circuit ranking.', 'Patiala', 'Punjab', 'https://fencingindia.org', 'https://fencingindia.org', 'published', 'verified'),
  ('r-k-sharma', 'R. K. Sharma', 'Chief National Track Cycling Coach at SAI Indira Gandhi Velodrome. Architect of India’s historic UCI World Junior Track Cycling gold medal sprint squad.', 'New Delhi', 'Delhi', 'https://cyclingfederationofindia.org', 'https://cyclingfederationofindia.org', 'published', 'verified'),
  ('ismail-baig', 'Ismail Baig', 'Dronacharya Awardee rowing coach who has led the Indian national rowing team across five Asian Games and multiple Olympic campaigns with over 60 medals.', 'Hyderabad', 'Telangana', 'https://indiarowing.com', 'https://indiarowing.com', 'published', 'verified'),
  ('scott-flemming', 'Scott Flemming', 'Senior Director of Basketball at NBA Academy India. Former Head Coach of Indian Men’s National Team that won the 3×3 South Asian Championship.', 'Greater Noida', 'Uttar Pradesh', 'https://basketballfederationindia.org', 'https://basketballfederationindia.org', 'published', 'verified'),
  ('ge-sridharan', 'G. E. Sridharan', 'Dronacharya and Arjuna Awardee volleyball coach. Served as National Team Head Coach for two decades, pioneering rapid counter-attack volleyball systems.', 'Coimbatore', 'Tamil Nadu', 'https://volleyballindia.com', 'https://volleyballindia.com', 'published', 'verified'),
  ('rb-ramesh', 'R. B. Ramesh', 'FIDE Senior Trainer and Grandmaster. Founder of Chess Gurukul Chennai, mentor to world title challenger R. Praggnanandhaa and GM Vaishali Rameshbabu.', 'Chennai', 'Tamil Nadu', 'https://chessgurukul.com', 'https://chessgurukul.com', 'published', 'verified'),
  ('cyrus-poncha', 'Cyrus Poncha', 'Dronacharya Awardee squash coach and Secretary-General of Squash Rackets Federation of India. Shaped Joshna Chinappa and Saurav Ghosal at Indian Squash Academy.', 'Chennai', 'Tamil Nadu', 'https://indiasquash.com', 'https://indiasquash.com', 'published', 'verified'),
  ('tarun-sardesai', 'Tarun Sardesai', 'Founder and Master Instructor at Tarun Sardesai Golf Academy (TSGA). Pioneered residential scientific golf training and biomechanical ball-striking in India.', 'Bengaluru', 'Karnataka', 'https://tarunsardesai.com', 'https://tarunsardesai.com', 'published', 'verified'),
  ('radhakrishnan-nair', 'Radhakrishnan Nair', 'Dronacharya Awardee and Chief National Athletics Coach (AFI). Supervised India’s Olympic track and field camp and javelin biomechanics protocols in Patiala.', 'Patiala', 'Punjab', 'https://indianathletics.in', 'https://indianathletics.in', 'published', 'verified'),
  ('vimal-kumar', 'U. Vimal Kumar', 'Dronacharya Awardee and co-founder of Prakash Padukone Badminton Academy (PPBA). Coached Saina Nehwal to World No. 1 and Lakshya Sen to Commonwealth Games Gold.', 'Bengaluru', 'Karnataka', 'https://ppba.in', 'https://ppba.in', 'published', 'verified'),
  ('virender-singh', 'Virender Singh', 'Senior wrestling coach at legendary Chhatrasal Stadium Akhada. Master of traditional Bharat Kesari mud grappling and Olympic freestyle wrestling fundamentals.', 'Delhi', 'Delhi', 'https://wrestlingfederationofindia.com', 'https://wrestlingfederationofindia.com', 'published', 'verified'),
  ('e-bhaskaran', 'E. Bhaskaran', 'Dronacharya Awardee kabaddi coach who guided the Indian national team to Asian Games Gold and coached U Mumba to Pro Kabaddi League championship.', 'Chennai', 'Tamil Nadu', 'https://kabaddiikf.com', 'https://kabaddiikf.com', 'published', 'verified')
on conflict (slug) do update set
  display_name = excluded.display_name,
  bio = excluded.bio,
  city = excluded.city,
  state = excluded.state,
  website_url = excluded.website_url,
  public_contact_url = excluded.public_contact_url,
  publication_status = 'published',
  verification_status = 'verified',
  updated_at = now();

-- Link All Coaches to coach_sports
-- 1. Existing Coaches in DB
select public.link_coach_sport('jaspal-rana', 'shooting');
select public.link_coach_sport('pullela-gopichand', 'badminton');
select public.link_coach_sport('satpal-singh', 'wrestling');
select public.link_coach_sport('balwan-singh', 'kabaddi');
select public.link_coach_sport('om-nambiar', 'athletics');

-- 2. Newly Seeded Coaches
select public.link_coach_sport('chandrakant-pandit', 'cricket');
select public.link_coach_sport('tarak-sinha', 'cricket');
select public.link_coach_sport('syed-abdul-rahim', 'football');
select public.link_coach_sport('clifford-miranda', 'football');
select public.link_coach_sport('gurbax-singh-sandhu', 'boxing');
select public.link_coach_sport('harendra-singh', 'hockey');
select public.link_coach_sport('vijay-sharma', 'weightlifting');
select public.link_coach_sport('soumyadeep-roy', 'table-tennis');
select public.link_coach_sport('nandan-bal', 'tennis');
select public.link_coach_sport('dharmendra-tiwari', 'archery');
select public.link_coach_sport('bishweshwar-nandi', 'gymnastics');
select public.link_coach_sport('nihar-ameen', 'swimming');
select public.link_coach_sport('yashpal-solanki', 'judo');
select public.link_coach_sport('sagar-lagu', 'fencing');
select public.link_coach_sport('r-k-sharma', 'cycling');
select public.link_coach_sport('ismail-baig', 'rowing');
select public.link_coach_sport('scott-flemming', 'basketball');
select public.link_coach_sport('ge-sridharan', 'volleyball');
select public.link_coach_sport('rb-ramesh', 'chess');
select public.link_coach_sport('cyrus-poncha', 'squash');
select public.link_coach_sport('tarun-sardesai', 'golf');
select public.link_coach_sport('radhakrishnan-nair', 'athletics');
select public.link_coach_sport('vimal-kumar', 'badminton');
select public.link_coach_sport('virender-singh', 'wrestling');
select public.link_coach_sport('e-bhaskaran', 'kabaddi');

commit;
