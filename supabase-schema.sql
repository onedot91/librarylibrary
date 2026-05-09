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

create or replace function public.get_month_to_date_count(
  monthly_count integer,
  reference_date date
)
returns integer
language sql
immutable
as $$
  select round(
    greatest(monthly_count, 0)::numeric
    * extract(day from reference_date)::numeric
    / extract(day from (date_trunc('month', reference_date) + interval '1 month - 1 day'))::numeric
  )::integer;
$$;

create or replace function public.get_estimated_monthly_count(
  month_to_date_count integer,
  reference_date date
)
returns integer
language sql
immutable
as $$
  select round(
    greatest(month_to_date_count, 0)::numeric
    * extract(day from (date_trunc('month', reference_date) + interval '1 month - 1 day'))::numeric
    / greatest(extract(day from reference_date)::numeric, 1)
  )::integer;
$$;

create or replace function public.increment_school_month_to_date_count(
  school_id_to_update text,
  month_id text,
  delta integer,
  reference_date date default current_date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_monthly_count integer;
  current_month_to_date_count integer;
  next_monthly_count integer;
begin
  select coalesce((monthly_lending ->> month_id)::integer, 0)
  into current_monthly_count
  from public.school_lending_counts
  where id = school_id_to_update
  for update;

  if not found then
    insert into public.school_lending_counts (id, monthly_lending)
    values (
      school_id_to_update,
      jsonb_build_object(
        month_id,
        public.get_estimated_monthly_count(delta, reference_date)
      )
    );
    return;
  end if;

  current_month_to_date_count := public.get_month_to_date_count(current_monthly_count, reference_date);
  next_monthly_count := public.get_estimated_monthly_count(current_month_to_date_count + delta, reference_date);

  update public.school_lending_counts
  set monthly_lending = jsonb_set(
    monthly_lending,
    array[month_id],
    to_jsonb(next_monthly_count),
    true
  )
  where id = school_id_to_update;
end;
$$;

create or replace function public.apply_rival_response(
  our_school_id text default 'daegu',
  reference_date date default current_date,
  response_intensity numeric default 1
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  month_id text := to_char(reference_date, 'YYYY-MM');
  our_count integer := 0;
  leader_count integer := 0;
  lead_gap integer := 0;
  response_chance numeric;
  response_school_count integer;
  selected_rival record;
  selected_rank integer;
  total_school_count integer;
  is_lower_ranked_rival boolean;
  boost_roll numeric;
  increment_amount integer := 1;
  applied_count integer := 0;
begin
  select public.get_month_to_date_count(coalesce((monthly_lending ->> month_id)::integer, 0), reference_date)
  into our_count
  from public.school_lending_counts
  where id = our_school_id;

  our_count := coalesce(our_count, 0);

  select greatest(
    our_count,
    coalesce(max(public.get_month_to_date_count(coalesce((monthly_lending ->> month_id)::integer, 0), reference_date)), 0)
  )
  into leader_count
  from public.school_lending_counts
  where id <> our_school_id;

  if our_count >= leader_count then
    response_chance := least(0.68, 0.46 * response_intensity);
  else
    response_chance := least(0.42, 0.24 * response_intensity);
  end if;

  if random() > response_chance then
    return false;
  end if;

  lead_gap := leader_count - our_count;

  select count(*)
  into total_school_count
  from public.school_lending_counts;

  if our_count >= leader_count then
    response_school_count := case when random() < 0.35 then 3 else 2 end;
  else
    response_school_count := case when random() < 0.3 then 2 else 1 end;
  end if;

  for selected_rival in
    with rival_counts as (
      select
        id,
        public.get_month_to_date_count(coalesce((monthly_lending ->> month_id)::integer, 0), reference_date) as lending_count
      from public.school_lending_counts
      where id <> our_school_id
    ),
    weighted_rivals as (
      select
        id,
        lending_count,
        case
          when lending_count - our_count >= lead_gap and lead_gap >= 4 then 0.06
          when lending_count - our_count between 1 and 3 then 1.4
          when lending_count - our_count between -3 and 0 then
            case when our_count >= leader_count then 1.2 else 0.7 end
          else 0.35
        end as weight
      from rival_counts
    )
    select id, lending_count
    from weighted_rivals
    where weight > 0
    order by -ln(greatest(random(), 0.000001)) / weight
    limit response_school_count
  loop
    select 1 + count(*)
    into selected_rank
    from public.school_lending_counts
    where public.get_month_to_date_count(coalesce((monthly_lending ->> month_id)::integer, 0), reference_date) >
      selected_rival.lending_count;

    is_lower_ranked_rival := selected_rank >= greatest(4, ceiling(total_school_count * 0.6)::integer);
    boost_roll := random();
    increment_amount := 1;

    if our_count >= leader_count and is_lower_ranked_rival then
      increment_amount := case
        when boost_roll < 0.25 then 3
        when boost_roll < 0.7 then 2
        else 1
      end;
    elsif our_count >= leader_count then
      increment_amount := case when boost_roll < 0.25 then 2 else 1 end;
    elsif is_lower_ranked_rival then
      increment_amount := case when boost_roll < 0.35 then 2 else 1 end;
    end if;

    perform public.increment_school_month_to_date_count(selected_rival.id, month_id, increment_amount, reference_date);
    applied_count := applied_count + 1;
  end loop;

  return applied_count > 0;
end;
$$;

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

drop policy if exists "Anyone can delete book loans" on public.book_loans;
create policy "Anyone can delete book loans"
on public.book_loans
for delete
to anon
using (school_id = 'daegu');

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

create or replace function public.handle_book_loan_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_loan_count integer;
  response_intensity numeric;
begin
  if new.school_id <> 'daegu' then
    return new;
  end if;

  perform public.increment_school_month_to_date_count(new.school_id, to_char(current_date, 'YYYY-MM'), 1, current_date);

  select count(*)
  into recent_loan_count
  from public.book_loans
  where school_id = new.school_id
    and created_at >= now() - interval '10 minutes';

  response_intensity := least(1.45, 0.85 + recent_loan_count * 0.12);
  perform public.apply_rival_response(new.school_id, current_date, response_intensity);

  return new;
end;
$$;

drop trigger if exists book_loans_apply_counts on public.book_loans;

create trigger book_loans_apply_counts
after insert on public.book_loans
for each row
execute function public.handle_book_loan_insert();
