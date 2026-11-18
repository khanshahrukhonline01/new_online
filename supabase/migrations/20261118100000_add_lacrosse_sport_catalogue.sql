-- Add Lacrosse to the development sports catalogue.
-- International governing body: World Lacrosse; India member: Lacrosse Association of India.
begin;

insert into public.sports (slug, name, is_published)
values ('lacrosse', 'Lacrosse', true)
on conflict (slug) do update set
  name = excluded.name,
  is_published = true,
  updated_at = now();

commit;
