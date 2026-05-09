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
