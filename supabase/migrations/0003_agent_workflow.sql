-- Store where an event happens and how the AI agents produced its plan.
alter table public.events add column if not exists location text;
alter table public.events add column if not exists agent_trace jsonb;

create or replace function public.create_event_plan(p_club uuid, p jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_event uuid;
  v_phase uuid;
  v_date date := nullif(p->>'event_date', '')::date;
  ph jsonb;
  i integer := 0;
begin
  insert into public.events (club_id, title, category, concept, event_date, time_window, venue, location, capacity,
      budget_total, funding_sources, status, ai_generated, plan_source, plan_summary, agent_trace)
    values (p_club, p->>'title', coalesce(p->>'category', 'Social'), p->>'concept', v_date, p->>'time_window',
      p->>'venue', p->>'location', coalesce((p->>'capacity')::integer, 0), coalesce((p->>'budget_total')::numeric, 0),
      coalesce(p->'funding_sources', '[]'::jsonb), 'planning', coalesce((p->>'ai_generated')::boolean, false),
      p->>'plan_source', p->>'plan_summary', p->'agent_trace')
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
