import { useEffect, useState, type FormEvent } from "react";
import { KeyRound, ShieldCheck, LoaderCircle } from "lucide-react";

const ACTIVATION_KEY = "vexora.license.activation.v1";
const INSTALLATION_KEY = "vexora.license.installation.v1";
const TRIAL_KEY = "vexora.trial.startedAt.v1";
const TRIAL_MS = 5 * 60 * 1000;

type Activation = { licenseId: string; email: string; expiresAt: string | null };
type ActivationResult = { ok?: boolean; message?: string; code?: string; license_id?: string; email?: string; expires_at?: string | null };

function getInstallationId(): string {
  let id = localStorage.getItem(INSTALLATION_KEY);
  if (!id) {
    id = typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(INSTALLATION_KEY, id);
  }
  return id;
}

async function activate(email: string, licenseKey: string): Promise<ActivationResult> {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  if (!url || !apiKey) throw new Error("O backend do Lovable Cloud não está configurado neste ambiente.");
  const response = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/rpc/activate_vexora_license`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: apiKey, Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ p_email: email.trim(), p_license_key: licenseKey.trim(), p_installation_id: getInstallationId() }),
  });
  if (!response.ok) throw new Error("Não foi possível validar a licença. Confira se a migração foi aplicada no backend.");
  return await response.json() as ActivationResult;
}

export function ActivationGate({ children }: { children: React.ReactNode }) {
  const [activation, setActivation] = useState<Activation | null>(null);
  const [trialAllowed, setTrialAllowed] = useState(false);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      try {
        const installationId = getInstallationId();
        const raw = localStorage.getItem(ACTIVATION_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Activation;
          if (parsed.licenseId && parsed.email) {
            const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
            const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
            if (url && apiKey) {
              const response = await fetch(url.replace(/\\/+$/, '') + '/rest/v1/rpc/verify_vexora_activation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', apikey: apiKey, Authorization: 'Bearer ' + apiKey },
                body: JSON.stringify({ p_license_id: parsed.licenseId, p_installation_id: installationId }),
              });
              const checked = response.ok ? await response.json() as ActivationResult : { ok: false };
              if (checked.ok && !cancelled) setActivation({ ...parsed, expiresAt: checked.expires_at ?? parsed.expiresAt });
              else localStorage.removeItem(ACTIVATION_KEY);
            } else {
              localStorage.removeItem(ACTIVATION_KEY);
            }
          } else {
            localStorage.removeItem(ACTIVATION_KEY);
          }
        }
        let startedAt = Number(localStorage.getItem(TRIAL_KEY));
        if (!Number.isFinite(startedAt) || startedAt <= 0) {
          startedAt = Date.now();
          localStorage.setItem(TRIAL_KEY, String(startedAt));
        }
        if (!cancelled) setTrialAllowed(Date.now() - startedAt < TRIAL_MS);
      } catch {
        if (!cancelled) setError('Não foi possível verificar a ativação neste navegador.');
      } finally {
        if (!cancelled) setReady(true);
      }
    };
    void initialize();
    return () => { cancelled = true; };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await activate(email, licenseKey);
      if (!result.ok || !result.license_id || !result.email) {
        setError(result.message || "A licença não pôde ser ativada.");
        return;
      }
      const next: Activation = { licenseId: result.license_id, email: result.email, expiresAt: result.expires_at ?? null };
      localStorage.setItem(ACTIVATION_KEY, JSON.stringify(next));
      setActivation(next);
      setTrialAllowed(false);
      setLicenseKey("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao ativar a licença.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <div className="grid min-h-screen place-items-center bg-[#05070c] text-cyan-300">Carregando VEXORA SAMPLER…</div>;
  if (activation || trialAllowed) return <>{children}</>;

  return (
    <main className="grid min-h-screen place-items-center bg-[#05070c] p-4 text-white">
      <section className="w-full max-w-md rounded-2xl border border-cyan-400/30 bg-[#0b1220] p-6 shadow-[0_0_40px_rgba(34,211,238,.12)]">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-xl border border-cyan-300/40 bg-cyan-400/10 text-cyan-300"><KeyRound /></div>
          <div><p className="text-xs font-bold tracking-[.25em] text-cyan-300">VEXORA SAMPLER</p><h1 className="text-xl font-bold">Ativação da licença</h1></div>
        </div>
        <p className="mb-5 text-sm text-slate-300">O período de avaliação terminou. Informe o e-mail e a chave de licença para continuar.</p>
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block text-sm">E-mail da licença<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none focus:border-cyan-400" /></label>
          <label className="block text-sm">Chave de licença<input type="password" autoComplete="off" minLength={12} required value={licenseKey} onChange={e => setLicenseKey(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono outline-none focus:border-cyan-400" /></label>
          {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-sm text-red-200">{error}</p>}
          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60">
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            {busy ? "Validando licença…" : "Ativar VEXORA"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-500">A validação exige conexão com a internet.</p>
      </section>
    </main>
  );
}
