-- Planner Tasks Patch 2: versioned, private and expiring Evidence.
-- Fulfillment remains the lifecycle authority; submissions preserve the review record.

create table if not exists public.planner_task_evidence_artifacts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  task_id uuid not null references public.planner_tasks(id) on delete cascade,
  uploaded_by_member_id uuid not null references public.household_members(id),
  storage_path text not null unique,
  display_name text not null,
  mime_type text not null check (mime_type like 'image/%' or mime_type like 'video/%'),
  size_bytes bigint not null check (size_bytes > 0),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  state text not null default 'staging' check (state in ('staging','confirmed','attached','cancelled','purged')),
  intake_idempotency_key text not null,
  confirmed_at timestamptz,
  attached_at timestamptz,
  purged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, intake_idempotency_key),
  check ((state = 'staging' and confirmed_at is null) or state <> 'staging')
);

create table if not exists public.planner_task_evidence_submissions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  task_id uuid not null references public.planner_tasks(id) on delete cascade,
  fulfillment_id uuid not null references public.planner_task_fulfillments(id) on delete cascade,
  version integer not null check (version > 0),
  submitted_by_member_id uuid not null references public.household_members(id),
  submitted_by_person_id uuid not null references public.people(id),
  submitted_at timestamptz not null default now(),
  status text not null default 'awaiting_verification'
    check (status in ('awaiting_verification','approved','correction_requested','replaced','cancelled')),
  reviewer_member_id uuid references public.household_members(id),
  reviewer_person_id uuid references public.people(id),
  reviewed_at timestamptz,
  correction_reason text,
  is_current boolean not null default true,
  retired_at timestamptz,
  retain_until timestamptz,
  media_purged_at timestamptz,
  submit_idempotency_key text not null,
  submit_payload_hash text not null,
  expected_fulfillment_version integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fulfillment_id, version),
  unique (household_id, submit_idempotency_key),
  check (correction_reason is null or length(btrim(correction_reason)) > 0),
  check ((is_current and retired_at is null and retain_until is null) or not is_current)
);

create unique index if not exists planner_task_evidence_one_current_submission_idx
  on public.planner_task_evidence_submissions (fulfillment_id) where is_current;

create table if not exists public.planner_task_evidence_media (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  submission_id uuid not null references public.planner_task_evidence_submissions(id) on delete cascade,
  artifact_id uuid not null references public.planner_task_evidence_artifacts(id),
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  unique (submission_id, position),
  unique (submission_id, artifact_id),
  unique (artifact_id)
);

create index if not exists planner_task_evidence_submission_history_idx
  on public.planner_task_evidence_submissions (task_id, fulfillment_id, version desc);
create index if not exists planner_task_evidence_retention_idx
  on public.planner_task_evidence_submissions (retain_until)
  where retain_until is not null and media_purged_at is null;

alter table public.planner_task_evidence_artifacts enable row level security;
alter table public.planner_task_evidence_submissions enable row level security;
alter table public.planner_task_evidence_media enable row level security;

revoke all on public.planner_task_evidence_artifacts from public, anon, authenticated;
revoke all on public.planner_task_evidence_submissions from public, anon, authenticated;
revoke all on public.planner_task_evidence_media from public, anon, authenticated;
grant select on public.planner_task_evidence_artifacts to authenticated;
grant select on public.planner_task_evidence_submissions to authenticated;
grant select on public.planner_task_evidence_media to authenticated;
grant all on public.planner_task_evidence_artifacts to service_role;
grant all on public.planner_task_evidence_submissions to service_role;
grant all on public.planner_task_evidence_media to service_role;

drop policy if exists planner_task_evidence_artifacts_household_select on public.planner_task_evidence_artifacts;
create policy planner_task_evidence_artifacts_household_select
  on public.planner_task_evidence_artifacts for select to authenticated
  using (public.current_household_member_id(household_id) is not null);
drop policy if exists planner_task_evidence_submissions_household_select on public.planner_task_evidence_submissions;
create policy planner_task_evidence_submissions_household_select
  on public.planner_task_evidence_submissions for select to authenticated
  using (public.current_household_member_id(household_id) is not null);
drop policy if exists planner_task_evidence_media_household_select on public.planner_task_evidence_media;
create policy planner_task_evidence_media_household_select
  on public.planner_task_evidence_media for select to authenticated
  using (public.current_household_member_id(household_id) is not null);

insert into storage.buckets (id, name, public)
values ('planner-evidence-private', 'planner-evidence-private', false)
on conflict (id) do update set public = false;

-- Only the versioned submission/review RPCs may cross Evidence-controlled
-- fulfillment states. This closes every old HTTP/RPC/direct-table bypass.
create or replace function public.planner_guard_evidence_fulfillment_transition()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
declare
  v_requires boolean;
  v_authority text := current_setting('app.planner_evidence_authority', true);
begin
  if new.status is not distinct from old.status then return new; end if;
  select requires_verification into v_requires from public.planner_tasks where id = new.task_id;
  if not coalesce(v_requires, false) then return new; end if;
  if (new.status in ('awaiting_verification','verified','correction_requested'))
     and coalesce(v_authority, '') = '' then
    raise exception using errcode = 'P0001', message = 'planner_evidence_submission_required';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_planner_evidence_fulfillment_guard on public.planner_task_fulfillments;
create trigger trg_planner_evidence_fulfillment_guard
  before update of status on public.planner_task_fulfillments
  for each row execute function public.planner_guard_evidence_fulfillment_transition();

create or replace function public.submit_planner_task_evidence_v2(
  p_household_id uuid,
  p_task_id uuid,
  p_fulfillment_id uuid,
  p_expected_version integer,
  p_artifact_ids uuid[],
  p_idempotency_key text
) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_task public.planner_tasks%rowtype;
  v_f public.planner_task_fulfillments%rowtype;
  v_actor_member uuid := public.current_household_member_id(p_household_id);
  v_actor_person uuid := public.current_person_id();
  v_submission public.planner_task_evidence_submissions%rowtype;
  v_version integer;
  v_count integer;
  v_is_assignee boolean;
  v_payload_hash text := md5(coalesce(p_expected_version::text,'') || ':' || coalesce(array_to_string(p_artifact_ids,','),''));
begin
  if v_actor_member is null or v_actor_person is null
     or not public.planner_current_actor_has_capability(p_household_id, 'planner.view')
     or not public.planner_current_actor_has_capability(p_household_id, 'task.complete_assigned') then
    return jsonb_build_object('outcome','planner_forbidden');
  end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    return jsonb_build_object('outcome','idempotency_context_required');
  end if;
  select * into v_submission from public.planner_task_evidence_submissions
   where household_id = p_household_id and submit_idempotency_key = p_idempotency_key;
  if found then
    if v_submission.submit_payload_hash is distinct from v_payload_hash then return jsonb_build_object('outcome','idempotency_key_reused'); end if;
    return jsonb_build_object('outcome','replay','submission_id',v_submission.id,'version',v_submission.version);
  end if;
  select * into v_task from public.planner_tasks
   where id = p_task_id and household_id = p_household_id for update;
  if not found then return jsonb_build_object('outcome','not_found'); end if;
  if not v_task.requires_verification then return jsonb_build_object('outcome','evidence_not_required'); end if;
  if v_task.trashed_at is not null or v_task.status = 'cancelled' then return jsonb_build_object('outcome','task_not_operational'); end if;
  select * into v_f from public.planner_task_fulfillments
   where id = p_fulfillment_id and task_id = p_task_id and household_id = p_household_id
     and retired_at is null and inactive_at is null for update;
  if not found then return jsonb_build_object('outcome','fulfillment_not_current'); end if;
  if v_f.version <> p_expected_version then return jsonb_build_object('outcome','version_conflict','current_version',v_f.version); end if;
  if v_f.status not in ('pending','correction_requested') then return jsonb_build_object('outcome','fulfillment_invalid_transition'); end if;
  select exists(select 1 from public.planner_task_assignees a where a.task_id=p_task_id and a.member_id=v_actor_member and a.revoked_at is null)
    into v_is_assignee;
  if not (v_is_assignee or v_f.responsible_member_id=v_actor_member
          or public.planner_current_actor_has_capability(p_household_id,'task.complete_any')) then
    return jsonb_build_object('outcome','fulfillment_not_responsible');
  end if;
  if coalesce(array_length(p_artifact_ids,1),0)=0 then return jsonb_build_object('outcome','evidence_media_required'); end if;
  select count(distinct a.id) into v_count from public.planner_task_evidence_artifacts a
   where a.id=any(p_artifact_ids) and a.household_id=p_household_id and a.task_id=p_task_id
     and a.uploaded_by_member_id=v_actor_member and a.state='confirmed';
  if v_count <> array_length(p_artifact_ids,1) then return jsonb_build_object('outcome','evidence_media_not_confirmed'); end if;

  v_version := coalesce((select max(s.version)+1 from public.planner_task_evidence_submissions s where s.fulfillment_id=p_fulfillment_id),1);
  update public.planner_task_evidence_submissions set
    is_current=false, status=case when status='correction_requested' then 'replaced' else status end,
    retired_at=now(), retain_until=now()+interval '7 days', updated_at=now()
   where fulfillment_id=p_fulfillment_id and is_current;
  insert into public.planner_task_evidence_submissions(
    household_id,task_id,fulfillment_id,version,submitted_by_member_id,submitted_by_person_id,
    submit_idempotency_key,submit_payload_hash,expected_fulfillment_version
  ) values (p_household_id,p_task_id,p_fulfillment_id,v_version,v_actor_member,v_actor_person,p_idempotency_key,v_payload_hash,p_expected_version)
  returning * into v_submission;
  insert into public.planner_task_evidence_media(household_id,submission_id,artifact_id,position)
    select p_household_id,v_submission.id,item,(ordinality-1)::integer from unnest(p_artifact_ids) with ordinality as x(item,ordinality);
  update public.planner_task_evidence_artifacts set state='attached',attached_at=now(),updated_at=now()
    where id=any(p_artifact_ids);
  perform set_config('app.planner_evidence_authority',v_submission.id::text,true);
  update public.planner_task_fulfillments set
    status='awaiting_verification',completed_by_member_id=v_actor_member,completed_by_person_id=v_actor_person,
    completed_at=now(),verified_by_member_id=null,verified_by_person_id=null,verified_at=null,
    correction_requested_by_member_id=case when v_f.status='correction_requested' then v_f.correction_requested_by_member_id else null end,
    correction_requested_at=case when v_f.status='correction_requested' then v_f.correction_requested_at else null end,
    correction_comment=case when v_f.status='correction_requested' then v_f.correction_comment else null end,
    resubmitted_by_member_id=case when v_f.status='correction_requested' then v_actor_member else null end,
    resubmitted_at=case when v_f.status='correction_requested' then now() else null end
   where id=p_fulfillment_id;
  perform public.planner_refresh_task_v0_projection(p_task_id);
  return jsonb_build_object('outcome','updated','submission_id',v_submission.id,'version',v_version);
end;
$$;

create or replace function public.review_planner_task_evidence_v2(
  p_household_id uuid,
  p_task_id uuid,
  p_fulfillment_id uuid,
  p_submission_id uuid,
  p_expected_version integer,
  p_action text,
  p_reason text default null
) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_f public.planner_task_fulfillments%rowtype;
  v_s public.planner_task_evidence_submissions%rowtype;
  v_actor_member uuid := public.current_household_member_id(p_household_id);
  v_actor_person uuid := public.current_person_id();
  v_reason text := nullif(btrim(coalesce(p_reason,'')),'');
begin
  if v_actor_member is null or not public.planner_current_actor_has_capability(p_household_id,'task.verify') then
    return jsonb_build_object('outcome','planner_forbidden'); end if;
  if p_action not in ('approve','request_correction') then return jsonb_build_object('outcome','validation_error'); end if;
  if p_action='request_correction' and v_reason is null then return jsonb_build_object('outcome','correction_reason_required'); end if;
  select * into v_f from public.planner_task_fulfillments where id=p_fulfillment_id and task_id=p_task_id and household_id=p_household_id for update;
  if not found then return jsonb_build_object('outcome','fulfillment_not_current'); end if;
  select * into v_s from public.planner_task_evidence_submissions where id=p_submission_id and fulfillment_id=p_fulfillment_id and household_id=p_household_id for update;
  if not found or not v_s.is_current then return jsonb_build_object('outcome','stale_evidence_version'); end if;
  if v_s.status <> 'awaiting_verification' or v_f.status <> 'awaiting_verification' then return jsonb_build_object('outcome','fulfillment_invalid_transition'); end if;
  if v_s.version <> p_expected_version then return jsonb_build_object('outcome','version_conflict','current_version',v_s.version); end if;
  if v_s.submitted_by_member_id=v_actor_member then return jsonb_build_object('outcome','self_verification_not_allowed'); end if;
  perform set_config('app.planner_evidence_authority',v_s.id::text,true);
  if p_action='approve' then
    update public.planner_task_evidence_submissions set status='approved',reviewer_member_id=v_actor_member,reviewer_person_id=v_actor_person,
      reviewed_at=now(),is_current=false,retired_at=now(),retain_until=now()+interval '7 days',updated_at=now() where id=v_s.id;
    update public.planner_task_fulfillments set status='verified',verified_by_member_id=v_actor_member,verified_by_person_id=v_actor_person,verified_at=now() where id=v_f.id;
  else
    update public.planner_task_evidence_submissions set status='correction_requested',reviewer_member_id=v_actor_member,reviewer_person_id=v_actor_person,
      reviewed_at=now(),correction_reason=v_reason,updated_at=now() where id=v_s.id;
    update public.planner_task_fulfillments set status='correction_requested',correction_requested_by_member_id=v_actor_member,
      correction_requested_at=now(),correction_comment=v_reason where id=v_f.id;
  end if;
  perform public.planner_refresh_task_v0_projection(p_task_id);
  return jsonb_build_object('outcome','updated','submission_id',v_s.id,'version',v_s.version,'status',p_action);
end;
$$;

-- Returns paths for a privileged worker. Metadata/history rows are intentionally retained.
create or replace function public.claim_expired_planner_evidence_media(p_limit integer default 100)
returns table(artifact_id uuid, storage_path text)
language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if auth.role() <> 'service_role' then raise exception 'service_role_required'; end if;
  return query
    select a.id,a.storage_path
    from public.planner_task_evidence_submissions s
    join public.planner_task_evidence_media m on m.submission_id=s.id
    join public.planner_task_evidence_artifacts a on a.id=m.artifact_id
    where not s.is_current and s.retain_until <= now() and s.media_purged_at is null and a.state <> 'purged'
    order by a.id limit greatest(1,least(coalesce(p_limit,100),500));
end;
$$;

create or replace function public.planner_retire_evidence_for_closed_task()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if (new.status = 'cancelled' and old.status is distinct from new.status)
     or (new.trashed_at is not null and old.trashed_at is null) then
    update public.planner_task_evidence_submissions set
      is_current=false,status='cancelled',retired_at=coalesce(retired_at,now()),
      retain_until=coalesce(retain_until,now()+interval '7 days'),updated_at=now()
    where task_id=new.id and is_current;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_planner_retire_evidence_for_closed_task on public.planner_tasks;
create trigger trg_planner_retire_evidence_for_closed_task
  after update of status,trashed_at on public.planner_tasks
  for each row execute function public.planner_retire_evidence_for_closed_task();

revoke all on function public.submit_planner_task_evidence_v2(uuid,uuid,uuid,integer,uuid[],text) from public;
grant execute on function public.submit_planner_task_evidence_v2(uuid,uuid,uuid,integer,uuid[],text) to authenticated;
revoke all on function public.review_planner_task_evidence_v2(uuid,uuid,uuid,uuid,integer,text,text) from public;
grant execute on function public.review_planner_task_evidence_v2(uuid,uuid,uuid,uuid,integer,text,text) to authenticated;
revoke all on function public.claim_expired_planner_evidence_media(integer) from public,anon,authenticated;
grant execute on function public.claim_expired_planner_evidence_media(integer) to service_role;
