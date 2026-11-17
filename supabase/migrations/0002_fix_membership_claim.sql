-- The member-update guard blocked claim_memberships() from linking an invited
-- roster row to the user who just signed up. Let that one trusted path through.
create or replace function private.guard_member_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.club_id is distinct from old.club_id then
    raise exception 'A member cannot be moved between clubs';
  end if;
  if (select auth.uid()) is not null
     and not private.is_club_admin(old.club_id)
     and coalesce(current_setting('evently.claiming', true), '') <> '1' then
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

create or replace function public.claim_memberships() returns integer
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
  perform set_config('evently.claiming', '1', true);
  update public.members m set user_id = v_uid
    where m.user_id is null and lower(m.email) = v_email and m.tier <> 'prospect'
      and not exists (select 1 from public.members x where x.club_id = m.club_id and x.user_id = v_uid);
  get diagnostics v_count = row_count;
  perform set_config('evently.claiming', '', true);
  return v_count;
end;
$$;
