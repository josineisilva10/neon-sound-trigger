-- Re-check a previously activated installation on app startup so revocations/expiry take effect.
create or replace function public.verify_vexora_activation(
  p_license_id uuid,
  p_installation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_license public.vexora_licenses%rowtype;
begin
  if p_license_id is null or length(trim(coalesce(p_installation_id, ''))) < 16 then
    return jsonb_build_object('ok', false, 'code', 'invalid_input');
  end if;

  select l.* into v_license
  from public.vexora_licenses l
  join public.vexora_license_activations a on a.license_id = l.id
  where l.id = p_license_id
    and a.installation_id = p_installation_id
  limit 1;

  if not found or v_license.status <> 'active' or v_license.revoked_at is not null then
    return jsonb_build_object('ok', false, 'code', 'inactive');
  end if;

  if v_license.expires_at is not null and v_license.expires_at <= now() then
    return jsonb_build_object('ok', false, 'code', 'expired');
  end if;

  update public.vexora_license_activations
  set last_seen_at = now()
  where license_id = v_license.id and installation_id = p_installation_id;

  return jsonb_build_object('ok', true, 'license_id', v_license.id, 'email', v_license.email, 'expires_at', v_license.expires_at);
end;
$$;

revoke all on function public.verify_vexora_activation(uuid, text) from public;
grant execute on function public.verify_vexora_activation(uuid, text) to anon, authenticated;
