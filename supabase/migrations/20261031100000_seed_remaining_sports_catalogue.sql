-- KhelGrid: Complete sports taxonomy to 34 verified Olympic, National, and Grassroots sports.
-- Ensures that the public sports catalogue table contains all 34 sports indexed across KhelGrid.
begin;

insert into public.sports (slug, name, is_published)
values
  ('chess', 'Chess', true),
  ('cycling', 'Cycling', true),
  ('futsal', 'Futsal', true),
  ('golf', 'Golf', true),
  ('handball', 'Handball', true),
  ('karate', 'Karate', true),
  ('martial-arts', 'Martial Arts', true),
  ('rugby', 'Rugby', true),
  ('skating', 'Skating', true),
  ('squash', 'Squash', true),
  ('taekwondo', 'Taekwondo', true),
  ('yoga', 'Yoga', true)
on conflict (slug) do update set
  name = excluded.name,
  is_published = true,
  updated_at = now();

commit;
