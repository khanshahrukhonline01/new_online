-- KhelGrid: Simple KhelChronicle Database Schema Migration
-- Creates chronicle_papers and chronicle_submissions with public RLS access.

begin;

-- 1. Research Papers Table
create table if not exists public.chronicle_papers (
  id uuid primary key default gen_random_uuid(),
  paper_id text not null unique,
  slug text not null unique,
  title text not null,
  category text not null,
  author_name text not null,
  author_affiliation text not null,
  date_published date not null default current_date,
  reading_time_minutes integer not null default 10,
  summary text not null,
  publication_status text not null default 'published',
  created_at timestamptz not null default now()
);

-- 2. Manuscript Submissions Intake Table
create table if not exists public.chronicle_submissions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  author_name text not null,
  author_email text not null,
  affiliation text not null,
  abstract text not null,
  status text not null default 'pending_review',
  created_at timestamptz not null default now()
);

-- 3. Row Level Security & Public Permissions
alter table public.chronicle_papers enable row level security;
alter table public.chronicle_submissions enable row level security;

drop policy if exists "chronicle_papers_public_read" on public.chronicle_papers;
create policy "chronicle_papers_public_read" on public.chronicle_papers
  for select to anon, authenticated using (publication_status = 'published');

drop policy if exists "chronicle_submissions_public_insert" on public.chronicle_submissions;
create policy "chronicle_submissions_public_insert" on public.chronicle_submissions
  for insert to anon, authenticated with check (status = 'pending_review');

grant select on public.chronicle_papers to anon, authenticated;
grant insert on public.chronicle_submissions to anon, authenticated;

commit;
