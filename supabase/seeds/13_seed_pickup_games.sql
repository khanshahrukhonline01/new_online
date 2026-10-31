-- Seed baseline verified community pickup games for development
insert into public.pickup_games (
  slug, sport, emoji, skill_level, venue_name, city, time_label, host_name,
  price_per_player, spots_open, total_players, confirmed_players, is_featured, publication_status
) values
  ('ferrohub-pickleball-bengaluru', 'Pickleball', '🎾', 'Intermediate', 'FerroHub Sports', 'Bengaluru', 'Today · 7:00 PM', 'Rahul S.', '₹200/player', 1, 4, 3, true, 'published'),
  ('kicks-on-grass-football-bengaluru', 'Football', '⚽', 'Beginner', 'Kicks on Grass Arena', 'Bengaluru', 'Today · 8:30 PM', 'Aakash M.', '₹250/player', 4, 12, 8, true, 'published'),
  ('whitefield-badminton-bengaluru', 'Badminton', '🏸', 'Advanced', 'Whitefield Sports Hub', 'Bengaluru', 'Tomorrow · 6:30 AM', 'Sneha K.', '₹150/player', 1, 4, 3, false, 'published'),
  ('dda-cricket-delhi', 'Cricket', '🏏', 'Intermediate', 'DDA Sports Ground', 'Delhi', 'Saturday · 7:00 AM', 'Vikram P.', '₹180/player', 8, 22, 14, true, 'published'),
  ('dlta-tennis-new-delhi', 'Tennis', '🎾', 'Intermediate', 'DLTA Tennis Complex', 'New Delhi', 'Tomorrow · 5:30 PM', 'Neha R.', '₹220/player', 3, 4, 1, false, 'published'),
  ('turfside-box-cricket-mumbai', 'Box Cricket', '🏏', 'Beginner', 'Turfside Arena', 'Mumbai', 'Sunday · 6:00 PM', 'Karan D.', '₹300/player', 4, 10, 6, false, 'published'),
  ('regional-sports-centre-basketball-kochi', 'Basketball', '🏀', 'Advanced', 'Regional Sports Centre', 'Kochi', 'Friday · 6:00 PM', 'Fahad A.', '₹120/player', 2, 10, 8, false, 'published')
on conflict (slug) do update set
  sport = excluded.sport,
  emoji = excluded.emoji,
  skill_level = excluded.skill_level,
  venue_name = excluded.venue_name,
  city = excluded.city,
  time_label = excluded.time_label,
  host_name = excluded.host_name,
  price_per_player = excluded.price_per_player,
  spots_open = excluded.spots_open,
  total_players = excluded.total_players,
  confirmed_players = excluded.confirmed_players,
  is_featured = excluded.is_featured,
  publication_status = excluded.publication_status,
  updated_at = now();
