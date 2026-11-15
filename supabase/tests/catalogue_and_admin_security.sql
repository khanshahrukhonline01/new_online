-- ==============================================================================
-- Test: catalogue_and_admin_security.sql
-- Description: Transactional security assertions for Curated Catalogues,
-- User Notifications, and Administrative Moderation RLS policies.
-- ==============================================================================

begin;

-- 1. Verify RLS is enabled on all target tables
do $$
declare
  r record;
  target_tables text[] := array[
    'academies', 'venues', 'coaches', 'events',
    'listing_submissions', 'verification_claims',
    'listing_reports', 'user_notifications'
  ];
  t text;
begin
  foreach t in array target_tables loop
    if not exists (
      select 1 from pg_tables
      where schemaname = 'public' and tablename = t and rowsecurity = true
    ) then
      raise exception 'Security assertion failed: Table public.% does not have row level security enabled', t;
    end if;
  end loop;
end;
$$;

-- 2. Verify seeded curated academies exist and have published status
do $$
begin
  if not exists (select 1 from public.academies where slug = 'bengaluru-fc-academy' and publication_status = 'published') then
    raise exception 'Assertion failed: Bengaluru FC Academy missing or not published';
  end if;
  if not exists (select 1 from public.academies where slug = 'pullela-gopichand-badminton-academy' and publication_status = 'published') then
    raise exception 'Assertion failed: Pullela Gopichand Academy missing or not published';
  end if;
end;
$$;

-- 3. Verify seeded venues exist and have published status
do $$
begin
  if not exists (select 1 from public.venues where slug = 'sree-kanteerava-stadium' and publication_status = 'published') then
    raise exception 'Assertion failed: Sree Kanteerava Stadium missing or not published';
  end if;
  if not exists (select 1 from public.venues where slug = 'jawaharlal-nehru-stadium' and publication_status = 'published') then
    raise exception 'Assertion failed: JLN Stadium missing or not published';
  end if;
end;
$$;

-- 4. Verify verified coaches exist
do $$
begin
  if not exists (select 1 from public.coaches where slug = 'coach-rajeev-sharma-cricket' and verification_status = 'verified') then
    raise exception 'Assertion failed: Coach Rajeev Sharma missing or not verified';
  end if;
  if not exists (select 1 from public.coaches where slug = 'coach-manisha-ponnappa-badminton' and verification_status = 'verified') then
    raise exception 'Assertion failed: Coach Manisha Ponnappa missing or not verified';
  end if;
end;
$$;

-- 5. Verify national events exist
do $$
begin
  if not exists (select 1 from public.events where slug = 'khelo-india-youth-games-2026' and publication_status = 'published') then
    raise exception 'Assertion failed: Khelo India Youth Games 2026 missing or not published';
  end if;
  if not exists (select 1 from public.events where slug = 'sgfi-national-school-badminton-championship-2026' and publication_status = 'published') then
    raise exception 'Assertion failed: SGFI National School Badminton missing or not published';
  end if;
end;
$$;

rollback;
