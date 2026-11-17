-- Evently schema: clubs, roster, events and their plans.
create schema if not exists private;

-- ---------- tables ----------
create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  full_name text,
  term text,
  semester_budget numeric(10,2) not null default 0 check (semester_budget >= 0),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null check (char_length(full_name) between 1 and 80),
  email text,
  title text,
  tier text not null default 'member' check (tier in ('exec','lead','member','volunteer','prospect')),
  major text,
  year text,
  notes text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, club_id),
  unique (club_id, user_id)
);
create index members_club_idx on public.members(club_id);
create index members_user_idx on public.members(user_id);
create index members_email_idx on public.members(lower(email));

create table public.events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  category text not null default 'Social',
  concept text,
  event_date date,
  time_window text,
  venue text,
  capacity integer not null default 0 check (capacity >= 0),
  rsvp_count integer not null default 0 check (rsvp_count >= 0),
  budget_total numeric(10,2) not null default 0 check (budget_total >= 0),
  funding_sources jsonb not null default '[]'::jsonb,
  status text not null default 'planning' check (status in ('draft','planning','locked','completed')),
  ai_generated boolean not null default false,
  plan_source text,
  plan_summary text,
  plan_version integer not null default 1,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, club_id)
);
create index events_club_idx on public.events(club_id);

create table public.phases (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null,
  event_id uuid not null,
  name text not null,
  subtitle text,
  position integer not null default 0,
  foreign key (event_id, club_id) references public.events(id, club_id) on delete cascade,
  unique (id, event_id)
);
create index phases_event_idx on public.phases(event_id);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null,
  event_id uuid not null,
  phase_id uuid,
  kind text not null default 'task' check (kind in ('task','compliance')),
  title text not null check (char_length(title) between 1 and 200),
  detail text,
  tag text,
  assignee_id uuid,
  due_date date,
  priority boolean not null default false,
  done boolean not null default false,
  done_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key (event_id, club_id) references public.events(id, club_id) on delete cascade,
  foreign key (phase_id, event_id) references public.phases(id, event_id) on delete cascade,
  foreign key (assignee_id, club_id) references public.members(id, club_id) on delete set null (assignee_id)
);
create index tasks_event_idx on public.tasks(event_id);
create index tasks_club_idx on public.tasks(club_id);
create index tasks_assignee_idx on public.tasks(assignee_id);
create index tasks_phase_idx on public.tasks(phase_id);

create table public.budget_items (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null,
  event_id uuid not null,
  category text not null,
  allocated numeric(10,2) not null default 0 check (allocated >= 0),
  spent numeric(10,2) not null default 0 check (spent >= 0),
  position integer not null default 0,
  foreign key (event_id, club_id) references public.events(id, club_id) on delete cascade
);
create index budget_items_event_idx on public.budget_items(event_id);
create index budget_items_club_idx on public.budget_items(club_id);

create table public.timeline_items (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null,
  event_id uuid not null,
  start_time time not null,
  title text not null,
  detail text,
  location text,
  position integer not null default 0,
  foreign key (event_id, club_id) references public.events(id, club_id) on delete cascade
);
create index timeline_items_event_idx on public.timeline_items(event_id);

create table public.event_roles (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null,
  event_id uuid not null,
  member_id uuid not null,
  responsibility text not null,
  foreign key (event_id, club_id) references public.events(id, club_id) on delete cascade,
  foreign key (member_id, club_id) references public.members(id, club_id) on delete cascade,
  unique (event_id, member_id)
);
create index event_roles_member_idx on public.event_roles(member_id);

create table public.activity (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  actor_name text not null,
  message text not null,
  created_at timestamptz not null default now()
);
create index activity_club_idx on public.activity(club_id, created_at desc);

-- ---------- access helpers (private schema: not reachable through the API) ----------
create function private.is_club_member(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.members m
    where m.club_id = c and m.user_id = (select auth.uid()) and m.tier <> 'prospect'
  );
$$;

create function private.is_club_admin(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.members m
    where m.club_id = c and m.user_id = (select auth.uid()) and m.is_admin
  );
$$;

-- Non-admins may edit only their own profile fields, never their access level.
create function private.guard_member_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.club_id is distinct from old.club_id then
    raise exception 'A member cannot be moved between clubs';
  end if;
  if (select auth.uid()) is not null and not private.is_club_admin(old.club_id) then
    if new.is_admin is distinct from old.is_admin
       or new.tier is distinct from old.tier
       or new.email is distinct from old.email
       or new.user_id is distinct from old.user_id then
      raise exception 'Only club admins can change roles, emails or access';
    end if;
  end if;
  if old.is_admin and not new.is_admin and not exists (
    select 1 from public.members m where m.club_id = old.club_id and m.is_admin and m.id <> old.id
  ) then
    raise exception 'A club needs at least one admin';
  end if;
  return new;
end;
$$;
create trigger members_guard_update before update on public.members
  for each row execute function private.guard_member_update();

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger events_touch before update on public.events
  for each row execute function private.touch_updated_at();

create function private.task_done_stamp() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.done and (tg_op = 'INSERT' or not old.done) then new.done_at = now();
  elsif not new.done then new.done_at = null;
  end if;
  return new;
end;
$$;
create trigger tasks_done_stamp before insert or update on public.tasks
  for each row execute function private.task_done_stamp();

-- ---------- row level security ----------
alter table public.clubs enable row level security;
alter table public.members enable row level security;
alter table public.events enable row level security;
alter table public.phases enable row level security;
alter table public.tasks enable row level security;
alter table public.budget_items enable row level security;
alter table public.timeline_items enable row level security;
alter table public.event_roles enable row level security;
alter table public.activity enable row level security;

create policy clubs_select on public.clubs for select to authenticated
  using (private.is_club_member(id));
create policy clubs_update on public.clubs for update to authenticated
  using (private.is_club_admin(id)) with check (private.is_club_admin(id));
create policy clubs_delete on public.clubs for delete to authenticated
  using (private.is_club_admin(id));

create policy members_select on public.members for select to authenticated
  using (private.is_club_member(club_id));
create policy members_insert on public.members for insert to authenticated
  with check (private.is_club_admin(club_id));
create policy members_update on public.members for update to authenticated
  using (private.is_club_admin(club_id) or user_id = (select auth.uid()))
  with check (private.is_club_admin(club_id) or user_id = (select auth.uid()));
create policy members_delete on public.members for delete to authenticated
  using (private.is_club_admin(club_id) and not is_admin);

do $$
declare t text;
begin
  foreach t in array array['events','phases','tasks','budget_items','timeline_items','event_roles'] loop
    execute format('create policy %I on public.%I for all to authenticated using (private.is_club_member(club_id)) with check (private.is_club_member(club_id))', t || '_member_all', t);
  end loop;
end $$;

create policy activity_select on public.activity for select to authenticated
  using (private.is_club_member(club_id));
create policy activity_insert on public.activity for insert to authenticated
  with check (private.is_club_member(club_id));

-- Clients never set user_id / is_admin directly on insert, and never change user_id.
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke insert, update on public.members from authenticated;
grant insert (club_id, full_name, email, title, tier, major, year, notes) on public.members to authenticated;
grant update (full_name, email, title, tier, major, year, notes, is_admin) on public.members to authenticated;
revoke insert on public.clubs from authenticated;

-- ---------- RPCs ----------
-- Create a club and make the caller its first admin.
create function public.create_club(p_name text, p_full_name text, p_term text, p_title text, p_member_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_club uuid;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  select email into v_email from auth.users where id = v_uid;
  insert into public.clubs (name, full_name, term, created_by)
    values (trim(p_name), nullif(trim(p_full_name), ''), nullif(trim(p_term), ''), v_uid)
    returning id into v_club;
  insert into public.members (club_id, user_id, full_name, email, title, tier, is_admin)
    values (v_club, v_uid, coalesce(nullif(trim(p_member_name), ''), split_part(v_email, '@', 1)),
            v_email, coalesce(nullif(trim(p_title), ''), 'Club President'), 'exec', true);
  return v_club;
end;
$$;

-- Link roster rows that were invited by email to the signed-in (email-verified) user.
create function public.claim_memberships() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_count integer;
begin
  if v_uid is null then return 0; end if;
  select lower(email) into v_email from auth.users
    where id = v_uid and email_confirmed_at is not null;
  if v_email is null then return 0; end if;
  update public.members m set user_id = v_uid
    where m.user_id is null and lower(m.email) = v_email and m.tier <> 'prospect'
      and not exists (select 1 from public.members x where x.club_id = m.club_id and x.user_id = v_uid);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Save a whole generated plan in one transaction. Runs as the caller, so RLS applies.
create function public.create_event_plan(p_club uuid, p jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_event uuid;
  v_phase uuid;
  v_date date := nullif(p->>'event_date', '')::date;
  ph jsonb;
  i integer := 0;
begin
  insert into public.events (club_id, title, category, concept, event_date, time_window, venue, capacity,
      budget_total, funding_sources, status, ai_generated, plan_source, plan_summary)
    values (p_club, p->>'title', coalesce(p->>'category', 'Social'), p->>'concept', v_date, p->>'time_window',
      p->>'venue', coalesce((p->>'capacity')::integer, 0), coalesce((p->>'budget_total')::numeric, 0),
      coalesce(p->'funding_sources', '[]'::jsonb), 'planning', coalesce((p->>'ai_generated')::boolean, false),
      p->>'plan_source', p->>'plan_summary')
    returning id into v_event;

  insert into public.event_roles (club_id, event_id, member_id, responsibility)
    select p_club, v_event, (r->>'member_id')::uuid, r->>'responsibility'
    from jsonb_array_elements(coalesce(p->'roles', '[]'::jsonb)) r
    on conflict (event_id, member_id) do nothing;

  insert into public.budget_items (club_id, event_id, category, allocated, position)
    select p_club, v_event, b->>'category', (b->>'amount')::numeric, (ord - 1)::integer
    from jsonb_array_elements(coalesce(p->'budget', '[]'::jsonb)) with ordinality as x(b, ord);

  insert into public.timeline_items (club_id, event_id, start_time, title, detail, location, position)
    select p_club, v_event, (t->>'time')::time, t->>'title', t->>'detail', t->>'location', (ord - 1)::integer
    from jsonb_array_elements(coalesce(p->'timeline', '[]'::jsonb)) with ordinality as x(t, ord);

  for ph in select * from jsonb_array_elements(coalesce(p->'phases', '[]'::jsonb)) loop
    insert into public.phases (club_id, event_id, name, subtitle, position)
      values (p_club, v_event, ph->>'name', ph->>'subtitle', i) returning id into v_phase;
    insert into public.tasks (club_id, event_id, phase_id, title, detail, assignee_id, due_date, priority, position)
      select p_club, v_event, v_phase, t->>'title', t->>'detail', nullif(t->>'assignee_id', '')::uuid,
        case when v_date is null then null else v_date - coalesce((t->>'days_before')::integer, 0) end,
        coalesce((t->>'priority')::boolean, false), (ord - 1)::integer
      from jsonb_array_elements(coalesce(ph->'tasks', '[]'::jsonb)) with ordinality as x(t, ord);
    i := i + 1;
  end loop;

  insert into public.tasks (club_id, event_id, kind, title, detail, tag, position)
    select p_club, v_event, 'compliance', c->>'title', c->>'detail', c->>'reference', (ord - 1)::integer
    from jsonb_array_elements(coalesce(p->'compliance', '[]'::jsonb)) with ordinality as x(c, ord);

  return v_event;
end;
$$;

revoke execute on all functions in schema public from public, anon;
grant execute on function public.create_club(text, text, text, text, text) to authenticated;
grant execute on function public.claim_memberships() to authenticated;
grant execute on function public.create_event_plan(uuid, jsonb) to authenticated;
alter default privileges in schema public revoke execute on functions from public, anon;
grant usage on schema private to authenticated;
