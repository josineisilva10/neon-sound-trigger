# VEXORA SAMPLER license activation

This feature is implemented on branch `feature/license-activation-cloud`. It is not production-ready until the migrations are applied in the Neon Sound Trigger Lovable Cloud project and the end-to-end checks below pass.

## What is included

- `supabase/migrations/20261013010000_vexora_license_activation.sql`: license and activation tables, RLS, and the `activate_vexora_license` RPC.
- `supabase/migrations/20261013020000_vexora_license_revalidation.sql`: server-side activation status recheck.
- `supabase/migrations/20261013030000_vexora_license_activation_concurrency.sql`: serializes activation attempts so simultaneous requests cannot exceed the device limit.
- `src/components/vexora/ActivationGate.tsx`: activation UI and a five-minute browser trial gate.
- The main VEXORA route wraps the sampler in the activation gate.

## Apply the migrations

In the Lovable Cloud project connected to this repository, use the database migration workflow/SQL editor to apply all three migration files in timestamp order. Do not apply them to an old, unrelated Supabase project.

## Create a license (admin-only SQL)

Generate a long random key privately, for example with a password manager. Do not put the plaintext key into the repository, frontend, issue tracker, or chat. In the Cloud SQL editor, run the following after replacing the email and the placeholder with your own values. The database stores only a SHA-256 hash.

```sql
insert into public.vexora_licenses (email, key_hash, max_activations, expires_at)
values (
  lower('customer@example.com'),
  encode(digest('REPLACE_WITH_LONG_RANDOM_LICENSE_KEY', 'sha256'), 'hex'),
  1,
  null
);
```

The placeholder is used only to calculate the hash inside the trusted SQL editor. Keep the actual key privately and deliver it to the license holder securely. Never make the SQL editor available to customers.

To revoke a license, run this as a trusted administrator:

```sql
update public.vexora_licenses
set status = 'revoked', revoked_at = now()
where lower(email) = lower('customer@example.com');
```

## Important security and product limitations

- The activation RPC is callable with the project's public/publishable key, but it returns no license data beyond activation status and basic metadata. Table access is denied to `anon` and `authenticated` via RLS.
- A browser-side gate can be modified by a determined user and browser local storage can be cleared. It is not DRM. Strong enforcement for the Windows product requires a native desktop build that verifies a signed server response and protects the local entitlement state.
- The five-minute trial timestamp is stored in local storage and is therefore resettable; do not market it as tamper-proof.
- Keep all service-role keys and administrative credentials out of client code.
- Do not announce completion until the migrations are applied and activation, expiry, activation limit, and revocation are tested against the real Lovable Cloud backend.
