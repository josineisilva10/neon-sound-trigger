-- Allow the buyer to provide their own email at activation time.
-- License ownership is determined by the unique key hash, not a preassigned email.
alter table public.vexora_licenses alter column email drop not null;
alter table public.vexora_license_activations add column if not exists email text;

update public.vexora_license_activations a
set email = l.email
from public.vexora_licenses l
where a.license_id = l.id and a.email is null and l.email is not null;

create or replace function public.activate_vexora_license(
  p_email text,
  p_license_key text,
  p_installation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_license public.vexora_licenses%rowtype;
  v_activation_count integer;
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if position('@' in v_email) < 2
     or position('.' in split_part(v_email, '@', 2)) < 2
     or length(trim(coalesce(p_license_key, ''))) < 12
     or length(trim(coalesce(p_installation_id, ''))) < 16
     or length(p_installation_id) > 128 then
    return jsonb_build_object('ok', false, 'code', 'invalid_input', 'message', 'Confira o formato do e-mail, a chave e a instalação.');
  end if;

  -- Lock the license row so simultaneous activation attempts cannot exceed the device limit.
  select * into v_license
  from public.vexora_licenses
  where key_hash = encode(digest(trim(p_license_key), 'sha256'), 'hex')
  limit 1
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'invalid_license', 'message', 'Chave de licença inválida.');
  end if;

  if v_license.status <> 'active' or v_license.revoked_at is not null then
    return jsonb_build_object('ok', false, 'code', 'revoked', 'message', 'Esta licença foi revogada.');
  end if;

  if v_license.expires_at is not null and v_license.expires_at <= now() then
    return jsonb_build_object('ok', false, 'code', 'expired', 'message', 'Esta licença expirou.');
  end if;

  select count(*) into v_activation_count
  from public.vexora_license_activations
  where license_id = v_license.id;

  if not exists (
    select 1 from public.vexora_license_activations
    where license_id = v_license.id and installation_id = p_installation_id
  ) and v_activation_count >= v_license.max_activations then
    return jsonb_build_object('ok', false, 'code', 'activation_limit', 'message', 'Esta licença já atingiu o limite de dispositivos.');
  end if;

  insert into public.vexora_license_activations (license_id, installation_id, email)
  values (v_license.id, p_installation_id, v_email)
  on conflict (license_id, installation_id)
  do update set last_seen_at = now(), email = excluded.email;

  return jsonb_build_object(
    'ok', true,
    'license_id', v_license.id,
    'email', v_email,
    'expires_at', v_license.expires_at,
    'installation_id', p_installation_id
  );
end;
$$;

revoke all on function public.activate_vexora_license(text, text, text) from public;
grant execute on function public.activate_vexora_license(text, text, text) to anon, authenticated;
