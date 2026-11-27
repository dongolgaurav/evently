-- Show a schedule in planned order (overnight events cross midnight), not by clock time.
create or replace function public.public_event(p_slug text) returns json
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
      select json_agg(json_build_object('time', t.start_time, 'title', t.title, 'location', t.location) order by t.position, t.start_time)
      from public.timeline_items t where t.event_id = e.id), '[]'::json)
  )
  from public.events e join public.clubs c on c.id = e.club_id
  where e.slug = p_slug and e.public_page;
$$;
