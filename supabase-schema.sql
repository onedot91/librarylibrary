create table if not exists public.school_lending_counts (
  id text primary key,
  monthly_lending jsonb not null,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists school_lending_counts_updated_at on public.school_lending_counts;

create trigger school_lending_counts_updated_at
before update on public.school_lending_counts
for each row
execute function public.set_updated_at();

alter table public.school_lending_counts enable row level security;

drop policy if exists "Anyone can read school lending counts" on public.school_lending_counts;
create policy "Anyone can read school lending counts"
on public.school_lending_counts
for select
to anon
using (true);

drop policy if exists "Anyone can insert school lending counts" on public.school_lending_counts;
create policy "Anyone can insert school lending counts"
on public.school_lending_counts
for insert
to anon
with check (true);

drop policy if exists "Anyone can update school lending counts" on public.school_lending_counts;
create policy "Anyone can update school lending counts"
on public.school_lending_counts
for update
to anon
using (true)
with check (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'school_lending_counts'
  ) then
    alter publication supabase_realtime add table public.school_lending_counts;
end if;
end;
$$;

drop function if exists public.apply_ambient_growth(text, integer, integer, integer, integer);
drop table if exists public.ambient_growth_state;

create table if not exists public.book_loans (
  id uuid primary key default gen_random_uuid(),
  school_id text not null,
  student_number text not null,
  title text not null,
  author text not null,
  created_at timestamptz not null default now()
);

alter table public.book_loans
add column if not exists student_number text;

update public.book_loans
set student_number = '미입력'
where student_number is null;

alter table public.book_loans
alter column student_number set not null;

alter table public.book_loans enable row level security;

drop policy if exists "Anyone can read book loans" on public.book_loans;
create policy "Anyone can read book loans"
on public.book_loans
for select
to anon
using (true);

drop policy if exists "Anyone can insert book loans" on public.book_loans;
create policy "Anyone can insert book loans"
on public.book_loans
for insert
to anon
with check (
  school_id = 'daegu'
  and length(trim(student_number)) > 0
  and length(trim(title)) > 0
  and length(trim(author)) > 0
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'book_loans'
  ) then
    alter publication supabase_realtime add table public.book_loans;
  end if;
end;
$$;
