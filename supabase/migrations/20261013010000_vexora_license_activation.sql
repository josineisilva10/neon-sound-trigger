-- VEXORA SAMPLER license activation foundation
-- Keys are stored as SHA-256 hashes; plaintext license keys are never stored.
create extension if not exists pgcrypto;

create table if not exists public.vexora_licenses (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  key_hash text not null unique,
  status text not null default 'active' check (status in ('active','revoked')),
  max_activations integer not null default 1 check (max_activations between 1 and 20),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists public.vexora_license_activations (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.vexora_licenses(id) on delete cascade,
  installation_id text not null,
  activated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (license_id, installation_id)
);

alter table public.vexora_licenses enable row level security;
alter table public.vexora_license_activations enable row level security;
revoke all on public.vexora_licenses from anon, authenticated;
revoke all on public.vexora_license_activations from anon, authenticated;

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
begin
  if length(trim(coalesce(p_email, ''))) < 5
     or length(trim(coalesce(p_license_key, ''))) < 12
     or length(trim(coalesce(p_installation_id, ''))) < 16
     or length(p_installation_id) > 128 then
    return jsonb_build_object('ok', false, 'code', 'invalid_input', 'message', 'Confira o e-mail, a chave e a instalação.');
  end if;

  select * into v_license
  from public.vexora_licenses
  where lower(email) = lower(trim(p_email))
    and key_hash = encode(digest(trim(p_license_key), 'sha256'), 'hex')
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'invalid_license', 'message', 'E-mail ou chave de licença inválidos.');
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

  insert into public.vexora_license_activations (license_id, installation_id)
  values (v_license.id, p_installation_id)
  on conflict (license_id, installation_id)
  do update set last_seen_at = now();

  return jsonb_build_object(
    'ok', true,
    'license_id', v_license.id,
    'email', v_license.email,
    'expires_at', v_license.expires_at,
    'installation_id', p_installation_id
  );
end;
$$;

revoke all on function public.activate_vexora_license(text, text, text) from public;
grant execute on function public.activate_vexora_license(text, text, text) to anon, authenticated;
