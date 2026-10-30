-- KhelGrid: KhelChronicle Open Sports Research & Preprint Repository
-- Database schema for peer-moderated sports science preprints, categories, authors, and manuscript submissions.

begin;

-- 1. CHRONICLE CATEGORIES
create table if not exists public.chronicle_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 120),
  description text not null,
  icon text not null default 'award',
  color text not null default '#059669',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. CHRONICLE RESEARCH AUTHORS
create table if not exists public.chronicle_authors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 150),
  affiliation text not null check (char_length(affiliation) between 2 and 200),
  role text not null check (char_length(role) between 2 and 150),
  orcid text check (orcid is null or orcid ~ '^0000-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X]$'),
  bio text not null,
  email text,
  avatar_url text,
  is_verified boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. CHRONICLE RESEARCH PAPERS
create table if not exists public.chronicle_papers (
  id uuid primary key default gen_random_uuid(),
  paper_id text not null unique check (paper_id ~ '^KG-[0-9]{4}-[0-9]{3}$'),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 10 and 350),
  subtitle text check (subtitle is null or char_length(subtitle) <= 500),
  category_slug text not null references public.chronicle_categories(slug) on delete restrict,
  date_published date not null default current_date,
  date_modified date,
  version text not null default 'v1.0',
  status text not null default 'screened' check (status in ('draft', 'preprint', 'screened', 'published', 'archived')),
  license text not null default 'CC BY-NC-ND 4.0',
  reading_time_minutes integer not null default 10 check (reading_time_minutes between 1 and 180),
  downloads_count integer not null default 0 check (downloads_count >= 0),
  views_count integer not null default 0 check (views_count >= 0),
  citations_count integer not null default 0 check (citations_count >= 0),
  abstract jsonb not null,
  sections jsonb not null default '[]'::jsonb,
  keywords text[] not null default '{}',
  ethics_statement text,
  data_availability text,
  funding_statement text,
  conflicts_of_interest text,
  references jsonb not null default '[]'::jsonb,
  connected_links jsonb not null default '[]'::jsonb,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. JUNCTION TABLE: PAPER AUTHORS
create table if not exists public.chronicle_paper_authors (
  paper_id uuid not null references public.chronicle_papers(id) on delete cascade,
  author_id uuid not null references public.chronicle_authors(id) on delete cascade,
  author_order integer not null default 1,
  is_corresponding boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (paper_id, author_id)
);

-- 5. CHRONICLE SUBMISSION INTAKE QUEUE
create table if not exists public.chronicle_submissions (
  id uuid primary key default gen_random_uuid(),
  manuscript_title text not null check (char_length(btrim(manuscript_title)) between 5 and 350),
  category_slug text not null check (char_length(category_slug) <= 100),
  primary_author_name text not null check (char_length(btrim(primary_author_name)) between 2 and 150),
  primary_author_email text not null check (primary_author_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  primary_author_affiliation text not null check (char_length(btrim(primary_author_affiliation)) between 2 and 200),
  orcid text check (orcid is null or orcid ~ '^0000-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X]$'),
  co_authors text check (co_authors is null or char_length(co_authors) <= 1000),
  abstract_text text not null check (char_length(btrim(abstract_text)) between 50 and 6000),
  keywords text not null check (char_length(keywords) between 3 and 500),
  full_text_or_url text not null check (char_length(full_text_or_url) <= 10000),
  human_ethics_confirmed boolean not null default false,
  minor_consent_confirmed boolean not null default false,
  status text not null default 'pending_screening' check (status in ('pending_screening', 'in_moderation', 'accepted', 'rejected')),
  moderator_notes text check (moderator_notes is null or char_length(moderator_notes) <= 2000),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'pending_screening' and reviewed_at is null)
    or (status in ('in_moderation', 'accepted', 'rejected'))
  )
);

-- INDEXES
create index if not exists chronicle_categories_slug_idx on public.chronicle_categories(slug);
create index if not exists chronicle_authors_slug_idx on public.chronicle_authors(slug);
create index if not exists chronicle_papers_slug_idx on public.chronicle_papers(slug);
create index if not exists chronicle_papers_category_idx on public.chronicle_papers(category_slug);
create index if not exists chronicle_papers_status_idx on public.chronicle_papers(status, date_published desc);
create index if not exists chronicle_paper_authors_order_idx on public.chronicle_paper_authors(paper_id, author_order);
create index if not exists chronicle_submissions_status_idx on public.chronicle_submissions(status, created_at desc);

-- ROW LEVEL SECURITY (RLS)
alter table public.chronicle_categories enable row level security;
alter table public.chronicle_authors enable row level security;
alter table public.chronicle_papers enable row level security;
alter table public.chronicle_paper_authors enable row level security;
alter table public.chronicle_submissions enable row level security;

-- Public read access for published/screened preprints and verified metadata
drop policy if exists chronicle_categories_public_read on public.chronicle_categories;
create policy chronicle_categories_public_read
  on public.chronicle_categories for select to anon, authenticated
  using (is_active = true);

drop policy if exists chronicle_authors_public_read on public.chronicle_authors;
create policy chronicle_authors_public_read
  on public.chronicle_authors for select to anon, authenticated
  using (is_verified = true);

drop policy if exists chronicle_papers_public_read on public.chronicle_papers;
create policy chronicle_papers_public_read
  on public.chronicle_papers for select to anon, authenticated
  using (status in ('preprint', 'screened', 'published'));

drop policy if exists chronicle_paper_authors_public_read on public.chronicle_paper_authors;
create policy chronicle_paper_authors_public_read
  on public.chronicle_paper_authors for select to anon, authenticated
  using (true);

-- Public insert policy for manuscript submissions queue
drop policy if exists chronicle_submissions_public_insert on public.chronicle_submissions;
create policy chronicle_submissions_public_insert
  on public.chronicle_submissions for insert to anon, authenticated
  with check (
    status = 'pending_screening'
    and reviewed_at is null
    and reviewed_by is null
    and moderator_notes is null
  );

-- GRANTS
revoke all on public.chronicle_categories from public, anon, authenticated;
revoke all on public.chronicle_authors from public, anon, authenticated;
revoke all on public.chronicle_papers from public, anon, authenticated;
revoke all on public.chronicle_paper_authors from public, anon, authenticated;
revoke all on public.chronicle_submissions from public, anon, authenticated;

grant select on public.chronicle_categories to anon, authenticated;
grant select on public.chronicle_authors to anon, authenticated;
grant select on public.chronicle_papers to anon, authenticated;
grant select on public.chronicle_paper_authors to anon, authenticated;

grant insert (
  manuscript_title,
  category_slug,
  primary_author_name,
  primary_author_email,
  primary_author_affiliation,
  orcid,
  co_authors,
  abstract_text,
  keywords,
  full_text_or_url,
  human_ethics_confirmed,
  minor_consent_confirmed
) on public.chronicle_submissions to anon, authenticated;

-- Service role has full management
grant all on public.chronicle_categories to service_role;
grant all on public.chronicle_authors to service_role;
grant all on public.chronicle_papers to service_role;
grant all on public.chronicle_paper_authors to service_role;
grant all on public.chronicle_submissions to service_role;

-- TRIGGER FOR UPDATED_AT
create or replace function public.set_chronicle_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

drop trigger if exists chronicle_categories_updated_at on public.chronicle_categories;
create trigger chronicle_categories_updated_at
  before update on public.chronicle_categories
  for each row execute function public.set_chronicle_updated_at();

drop trigger if exists chronicle_authors_updated_at on public.chronicle_authors;
create trigger chronicle_authors_updated_at
  before update on public.chronicle_authors
  for each row execute function public.set_chronicle_updated_at();

drop trigger if exists chronicle_papers_updated_at on public.chronicle_papers;
create trigger chronicle_papers_updated_at
  before update on public.chronicle_papers
  for each row execute function public.set_chronicle_updated_at();

drop trigger if exists chronicle_submissions_updated_at on public.chronicle_submissions;
create trigger chronicle_submissions_updated_at
  before update on public.chronicle_submissions
  for each row execute function public.set_chronicle_updated_at();

-- RPC FUNCTIONS FOR ENGAGEMENT COUNTERS
create or replace function public.increment_chronicle_paper_views(p_paper_slug text)
returns void
language plpgsql
security definer
as $$
begin
  update public.chronicle_papers
  set views_count = views_count + 1
  where slug = p_paper_slug or paper_id = p_paper_slug;
end;
$$;

create or replace function public.increment_chronicle_paper_downloads(p_paper_slug text)
returns void
language plpgsql
security definer
as $$
begin
  update public.chronicle_papers
  set downloads_count = downloads_count + 1
  where slug = p_paper_slug or paper_id = p_paper_slug;
end;
$$;

grant execute on function public.increment_chronicle_paper_views(text) to anon, authenticated;
grant execute on function public.increment_chronicle_paper_downloads(text) to anon, authenticated;

commit;
