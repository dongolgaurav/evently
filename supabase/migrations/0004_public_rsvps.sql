-- Public event pages, RSVPs and check-in.

alter table public.events add column if not exists slug text unique;
alter table public.events add column if not exists public_page boolean not null default false;

create table public.rsvps (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null,
  event_id uuid not null,
  name text not null check (char_length(name) between 1 and 80),
  email text not null check (char_length(email) between 3 and 200),
  status text not null default 'going' check (status in ('going', 'waitlist', 'cancelled')),
  source text not null default 'public' check (source in ('public', 'manual')),
  check_in_code text not null unique default replace(gen_random_uuid()::text, '-', ''),
  checked_in_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (event_id, club_id) references public.events(id, club_id) on delete cascade
);
create unique index rsvps_event_email_idx on public.rsvps(event_id, lower(email));
create index rsvps_club_idx on public.rsvps(club_id);

alter table public.rsvps enable row level security;
create policy rsvps_member_all on public.rsvps for all to authenticated
  using (private.is_club_member(club_id)) with check (private.is_club_member(club_id));
revoke all on public.rsvps from anon;
grant select, insert, update, delete on public.rsvps to authenticated;

-- Keep the event's RSVP count equal to the number of guests marked "going".
create function private.sync_rsvp_count() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_event uuid := coalesce(new.event_id, old.event_id);
begin
  update public.events e
     set rsvp_count = (select count(*) from public.rsvps r where r.event_id = v_event and r.status = 'going')
   where e.id = v_event;
  return null;
end;
$$;
create trigger rsvps_sync_count after insert or update or delete on public.rsvps
  for each row execute function private.sync_rsvp_count();

-- ---------- public (signed-out) access, only through these functions ----------

-- Safe public details of an event whose public page is switched on.
create function public.public_event(p_slug text) returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'title', e.title,
    'category', e.category,
    'concept', e.concept,
    'event_date', e.event_date,
    'time_window', e.time_window,
    'venue', e.venue,
    'location', e.location,
    'capacity', e.capacity,
    'going', (select count(*) from public.rsvps r where r.event_id = e.id and r.status = 'going'),
    'rsvp_open', e.status <> 'completed' and (e.event_date is null or e.event_date >= current_date),
    'club_name', c.name,
    'club_full_name', c.full_name,
    'timeline', coalesce((
      select json_agg(json_build_object('time', t.start_time, 'title', t.title, 'location', t.location) order by t.start_time)
      from public.timeline_items t where t.event_id = e.id), '[]'::json)
  )
  from public.events e join public.clubs c on c.id = e.club_id
  where e.slug = p_slug and e.public_page;
$$;

-- RSVP to a public event. Returns the ticket code, or says the email is already registered.
create function public.public_rsvp(p_slug text, p_name text, p_email text) returns json
language plpgsql security definer set search_path = '' as $$
declare
  v_event public.events%rowtype;
  v_name text := btrim(coalesce(p_name, ''));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_existing public.rsvps%rowtype;
  v_going integer;
  v_status text;
  v_code text;
begin
  if char_length(v_name) < 1 or char_length(v_name) > 80 then raise exception 'Please enter your name.'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 200 then raise exception 'Please enter a valid email address.'; end if;

  select * into v_event from public.events where slug = p_slug and public_page for update;
  if not found then raise exception 'This event is not taking RSVPs.'; end if;
  if v_event.status = 'completed' or (v_event.event_date is not null and v_event.event_date < current_date) then
    raise exception 'RSVPs for this event have closed.';
  end if;

  select * into v_existing from public.rsvps where event_id = v_event.id and lower(email) = v_email;
  select count(*) into v_going from public.rsvps where event_id = v_event.id and status = 'going';
  v_status := case when v_event.capacity > 0 and v_going >= v_event.capacity then 'waitlist' else 'going' end;

  if v_existing.id is not null then
    if v_existing.status <> 'cancelled' then
      -- Don't hand out someone else's ticket just because their email is known.
      return json_build_object('already', true, 'status', v_existing.status);
    end if;
    update public.rsvps set status = v_status, name = v_name where id = v_existing.id returning check_in_code into v_code;
  else
    insert into public.rsvps (club_id, event_id, name, email, status, source)
      values (v_event.club_id, v_event.id, v_name, v_email, v_status, 'public')
      returning check_in_code into v_code;
  end if;
  return json_build_object('already', false, 'status', v_status, 'code', v_code);
end;
$$;

-- A guest's own ticket, looked up by its secret code.
create function public.public_ticket(p_code text) returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'name', r.name,
    'status', r.status,
    'checked_in_at', r.checked_in_at,
    'title', e.title,
    'event_date', e.event_date,
    'time_window', e.time_window,
    'venue', e.venue,
    'location', e.location,
    'slug', case when e.public_page then e.slug end,
    'club_name', c.name
  )
  from public.rsvps r join public.events e on e.id = r.event_id join public.clubs c on c.id = e.club_id
  where r.check_in_code = p_code;
$$;

-- A guest cancels their own RSVP with their ticket code.
create function public.public_cancel_rsvp(p_code text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.rsvps set status = 'cancelled' where check_in_code = p_code and status <> 'cancelled' and checked_in_at is null;
  return found;
end;
$$;

revoke execute on function public.public_event(text), public.public_rsvp(text, text, text), public.public_ticket(text), public.public_cancel_rsvp(text) from public;
grant execute on function public.public_event(text), public.public_rsvp(text, text, text), public.public_ticket(text), public.public_cancel_rsvp(text) to anon, authenticated;
