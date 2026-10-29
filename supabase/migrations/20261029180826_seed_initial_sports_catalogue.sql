-- KhelGrid: initial published sports taxonomy.
-- These are sport-category records, not venue, event, or opportunity listings.
-- Insert idempotently so reapplying the migration does not duplicate sports.

begin;

insert into public.sports (slug, name, is_published)
values
  ('athletics', 'Athletics', true),
  ('badminton', 'Badminton', true),
  ('basketball', 'Basketball', true),
  ('boxing', 'Boxing', true),
  ('cricket', 'Cricket', true),
  ('football', 'Football', true),
  ('hockey', 'Hockey', true),
  ('kabaddi', 'Kabaddi', true),
  ('swimming', 'Swimming', true),
  ('table-tennis', 'Table Tennis', true),
  ('tennis', 'Tennis', true),
  ('volleyball', 'Volleyball', true),
  ('wrestling', 'Wrestling', true)
on conflict (slug) do nothing;

commit;
