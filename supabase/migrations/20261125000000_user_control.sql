-- Alcancía Viva: control del usuario sobre metas, grupos y solicitudes.
-- Solo agrega (una columna, funciones y la vista recalculada); no modifica datos existentes.
begin;

-- Metas archivadas: salen del jardín pero conservan sus aportes y se pueden restaurar.
alter table public.goals add column if not exists archived boolean not null default false;

-- La vista expande g.* al crearse: se recrea para incluir la columna nueva.
drop view if exists public.goal_progress;
create view public.goal_progress with (security_invoker = true) as
  select g.*, coalesce((select sum(m.amount) from public.movements m
    where m.goal_id = g.id and m.reversed_at is null), 0) as current_amount
  from public.goals g;
grant select on public.goal_progress to authenticated;

-- Quién gestiona una meta: su dueño si es personal; el administrador si es de un grupo.
create function private.can_manage_goal(p_goal public.goals) returns boolean
language sql stable security definer set search_path = '' as $$
  select case when p_goal.group_id is null then p_goal.owner_id = auth.uid()
              else private.is_admin(p_goal.group_id) end;
$$;

create function private.update_goal(p_goal uuid, p_title text, p_amount numeric, p_date date) returns void
language plpgsql security definer set search_path = '' as $$
declare v_goal public.goals;
begin
  if auth.uid() is null then raise exception 'Inicia sesión'; end if;
  select * into v_goal from public.goals where id = p_goal for update;
  if v_goal.id is null or not private.can_manage_goal(v_goal) then raise exception 'No puedes editar esta meta'; end if;
  if p_title is null or length(trim(p_title)) not between 1 and 100 then raise exception 'Escribe un nombre de hasta 100 caracteres'; end if;
  if p_amount is null or p_amount <= 0 or p_amount >= 1000000 then raise exception 'Usa un monto mayor que cero y menor a S/ 1 000 000'; end if;
  if p_date is null or (p_date <> v_goal.target_date and p_date <= (now() at time zone 'America/Lima')::date) then
    raise exception 'Elige una fecha futura'; end if;
  update public.goals set title = trim(p_title), target_amount = p_amount, target_date = p_date where id = p_goal;
end;
$$;

create function private.set_goal_archived(p_goal uuid, p_archived boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare v_goal public.goals;
begin
  select * into v_goal from public.goals where id = p_goal for update;
  if v_goal.id is null or not private.can_manage_goal(v_goal) then raise exception 'No puedes cambiar esta meta'; end if;
  update public.goals set archived = coalesce(p_archived, true) where id = p_goal;
end;
$$;

-- Borrado definitivo solo sin aportes vigentes; los aportes ya deshechos no cuentan y se retiran con la meta.
create function private.delete_goal(p_goal uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_goal public.goals;
begin
  select * into v_goal from public.goals where id = p_goal for update;
  if v_goal.id is null or not private.can_manage_goal(v_goal) then raise exception 'No puedes eliminar esta meta'; end if;
  if exists (select 1 from public.movements where goal_id = p_goal and reversed_at is null) then
    raise exception 'Esta meta tiene aportes. Puedes archivarla para conservar tu historial'; end if;
  delete from public.movements where goal_id = p_goal and reversed_at is not null;
  delete from public.goals where id = p_goal;
end;
$$;

create function private.rename_group(p_group uuid, p_name text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin(p_group) then raise exception 'Solo el administrador cambia el nombre'; end if;
  if p_name is null or length(trim(p_name)) not between 1 and 100 then raise exception 'Escribe un nombre de hasta 100 caracteres'; end if;
  update public.groups set name = trim(p_name) where id = p_group;
end;
$$;

create function private.set_member_role(p_group uuid, p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin(p_group) then raise exception 'Solo el administrador cambia los roles'; end if;
  if p_role not in ('admin', 'member') then raise exception 'Rol no válido'; end if;
  if p_role = 'member' and not exists (select 1 from public.group_members
      where group_id = p_group and role = 'admin' and user_id <> p_user) then
    raise exception 'El grupo necesita al menos un administrador'; end if;
  update public.group_members set role = p_role where group_id = p_group and user_id = p_user;
  if not found then raise exception 'Esa persona ya no está en el grupo'; end if;
end;
$$;

create function private.remove_member(p_group uuid, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin(p_group) then raise exception 'Solo el administrador quita integrantes'; end if;
  if p_user = auth.uid() then raise exception 'Para irte del grupo usa «Salir del grupo»'; end if;
  delete from public.group_members where group_id = p_group and user_id = p_user;
  if not found then raise exception 'Esa persona ya no está en el grupo'; end if;
  -- Sin solicitud previa, podrá volver a pedir ingreso con un código.
  delete from public.join_requests where group_id = p_group and user_id = p_user;
end;
$$;

-- Cerrar un grupo: se retiran integrantes, invitaciones y solicitudes; las metas se archivan.
-- Los movimientos y aportes se conservan en el historial de cada persona.
create function private.close_group(p_group uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin(p_group) then raise exception 'Solo el administrador puede cerrar el grupo'; end if;
  update public.goals set archived = true where group_id = p_group;
  update public.group_invitations set revoked_at = coalesce(revoked_at, now()) where group_id = p_group;
  delete from public.join_requests where group_id = p_group;
  delete from public.group_members where group_id = p_group;
end;
$$;

create function private.leave_group(p_group uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_others int; v_admins int;
begin
  if not private.is_member(p_group) then raise exception 'Ya no perteneces a este grupo'; end if;
  select count(*) filter (where user_id <> auth.uid()), count(*) filter (where role = 'admin' and user_id <> auth.uid())
    into v_others, v_admins from public.group_members where group_id = p_group;
  if v_others = 0 then perform private.close_group(p_group); return; end if;
  if private.is_admin(p_group) and v_admins = 0 then
    raise exception 'Antes de salir, nombra a otra persona como administradora'; end if;
  delete from public.group_members where group_id = p_group and user_id = auth.uid();
  delete from public.join_requests where group_id = p_group and user_id = auth.uid();
end;
$$;

create function private.cancel_join_request(p_request uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.join_requests where id = p_request and user_id = auth.uid() and status = 'pending';
  if not found then raise exception 'Esta solicitud ya fue resuelta'; end if;
end;
$$;

-- Corrección: tras un rechazo o una salida, la persona puede volver a pedir ingreso.
create or replace function private.request_group_access(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_group uuid; v_name text; v_request uuid; v_status text;
begin
  if auth.uid() is null then raise exception 'Inicia sesión'; end if;
  select i.group_id, g.name into v_group, v_name
    from public.group_invitations i join public.groups g on g.id = i.group_id
    where i.code = upper(trim(p_code)) and i.revoked_at is null and i.expires_at > now();
  if v_group is null then raise exception 'Invitación no válida o vencida'; end if;
  if private.is_member(v_group) then
    return jsonb_build_object('group_name', v_name, 'status', 'member');
  end if;
  insert into public.join_requests(group_id, user_id) values (v_group, auth.uid())
    on conflict (group_id, user_id) do update
      set status = 'pending', requested_at = now(), decided_at = null, decided_by = null
      where public.join_requests.status <> 'pending';
  select id, status into v_request, v_status from public.join_requests
    where group_id = v_group and user_id = auth.uid();
  return jsonb_build_object('request_id', v_request, 'group_name', v_name, 'status', v_status);
end;
$$;

create function public.update_goal(p_goal uuid, p_title text, p_amount numeric, p_date date) returns void language sql security invoker set search_path = '' as $$ select private.update_goal(p_goal,p_title,p_amount,p_date); $$;
create function public.set_goal_archived(p_goal uuid, p_archived boolean) returns void language sql security invoker set search_path = '' as $$ select private.set_goal_archived(p_goal,p_archived); $$;
create function public.delete_goal(p_goal uuid) returns void language sql security invoker set search_path = '' as $$ select private.delete_goal(p_goal); $$;
create function public.rename_group(p_group uuid, p_name text) returns void language sql security invoker set search_path = '' as $$ select private.rename_group(p_group,p_name); $$;
create function public.set_member_role(p_group uuid, p_user uuid, p_role text) returns void language sql security invoker set search_path = '' as $$ select private.set_member_role(p_group,p_user,p_role); $$;
create function public.remove_member(p_group uuid, p_user uuid) returns void language sql security invoker set search_path = '' as $$ select private.remove_member(p_group,p_user); $$;
create function public.close_group(p_group uuid) returns void language sql security invoker set search_path = '' as $$ select private.close_group(p_group); $$;
create function public.leave_group(p_group uuid) returns void language sql security invoker set search_path = '' as $$ select private.leave_group(p_group); $$;
create function public.cancel_join_request(p_request uuid) returns void language sql security invoker set search_path = '' as $$ select private.cancel_join_request(p_request); $$;

revoke all on function private.can_manage_goal(public.goals), private.update_goal(uuid,text,numeric,date),
  private.set_goal_archived(uuid,boolean), private.delete_goal(uuid), private.rename_group(uuid,text),
  private.set_member_role(uuid,uuid,text), private.remove_member(uuid,uuid), private.close_group(uuid),
  private.leave_group(uuid), private.cancel_join_request(uuid),
  public.update_goal(uuid,text,numeric,date), public.set_goal_archived(uuid,boolean), public.delete_goal(uuid),
  public.rename_group(uuid,text), public.set_member_role(uuid,uuid,text), public.remove_member(uuid,uuid),
  public.close_group(uuid), public.leave_group(uuid), public.cancel_join_request(uuid) from public, anon;
grant execute on function private.can_manage_goal(public.goals), private.update_goal(uuid,text,numeric,date),
  private.set_goal_archived(uuid,boolean), private.delete_goal(uuid), private.rename_group(uuid,text),
  private.set_member_role(uuid,uuid,text), private.remove_member(uuid,uuid), private.close_group(uuid),
  private.leave_group(uuid), private.cancel_join_request(uuid),
  public.update_goal(uuid,text,numeric,date), public.set_goal_archived(uuid,boolean), public.delete_goal(uuid),
  public.rename_group(uuid,text), public.set_member_role(uuid,uuid,text), public.remove_member(uuid,uuid),
  public.close_group(uuid), public.leave_group(uuid), public.cancel_join_request(uuid) to authenticated;
commit;
