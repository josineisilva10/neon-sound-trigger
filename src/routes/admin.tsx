import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, KeyRound, RefreshCw, ShieldCheck, ShieldX, Plus, Copy, LogOut } from "lucide-react";

export const Route = createFileRoute("/admin")({ component: LicenseAdminPage });

type License = {
  id: string;
  email: string | null;
  status: "active" | "revoked";
  max_activations: number;
  expires_at: string | null;
  created_at: string;
  revoked_at: string | null;
  vexora_license_activations?: { count: number; email?: string | null }[];
};

const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

function LicenseAdminPage() {
  const [token, setToken] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [key, setKey] = useState("");
  const [maxActivations, setMaxActivations] = useState("1");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const apiUrl = (import.meta.env["VITE_SUPABASE_URL"] as string | undefined)?.replace(/\/+$/, "");
  const publishableKey = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;

  const request = useCallback(async (method: "GET" | "POST" | "PATCH", body?: Record<string, unknown>) => {
    if (!apiUrl) throw new Error("Lovable Cloud não está configurado neste ambiente.");
    const response = await fetch(apiUrl + "/functions/v1/vexora-license-admin", {
      method,
      headers: { "Content-Type": "application/json", "x-admin-token": token, ...(publishableKey ? { apikey: publishableKey } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json().catch(() => ({})) as { error?: string; licenses?: License[]; license?: License };
    if (!response.ok) throw new Error(result.error || "Falha ao comunicar com o servidor.");
    return result;
  }, [apiUrl, token]);

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const result = await request("GET");
      setLicenses(result.licenses ?? []);
      setAuthenticated(true);
    } catch (e) {
      setAuthenticated(false);
      setError(e instanceof Error ? e.message : "Não foi possível carregar as licenças.");
    } finally {
      setBusy(false);
    }
  }, [request]);

  useEffect(() => {
    if (authenticated) void load();
    // Refresh is explicitly triggered after actions to avoid polling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated]);

  async function createLicense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await request("POST", {
        // Compatibility with a Cloud Edge Function that has not yet been redeployed:
        // this is a non-customer placeholder; the real customer email is saved at activation.
        email: `pending-${crypto.randomUUID()}@vexora.invalid`,
        licenseKey: key, maxActivations: Number(maxActivations),
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      if (result.license) setLicenses(current => [result.license!, ...current]);
      setNotice("Licença criada. Copie a chave agora; por segurança ela não será exibida novamente.");
      setKey(""); setMaxActivations("1"); setExpiresAt("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao criar a licença.");
    } finally { setBusy(false); }
  }

  async function revoke(license: License) {
    if (license.status !== "active" || !window.confirm(`Revogar a licença de ${license.email}? Essa ação não pode ser desfeita.`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await request("PATCH", { id: license.id });
      if (result.license) setLicenses(current => current.map(item => item.id === license.id ? { ...item, ...result.license! } : item));
      setNotice("Licença revogada. A instalação será bloqueada na próxima verificação.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao revogar a licença.");
    } finally { setBusy(false); }
  }

  if (!authenticated) return (
    <main className="min-h-screen bg-[#05070c] p-4 text-white sm:p-8">
      <section className="mx-auto mt-16 max-w-md rounded-2xl border border-cyan-400/30 bg-[#0b1220] p-6 shadow-2xl">
        <div className="mb-5 flex items-center gap-3"><div className="grid size-12 place-items-center rounded-xl border border-cyan-300/40 bg-cyan-400/10 text-cyan-300"><KeyRound /></div><div><p className="text-xs font-bold tracking-[.25em] text-cyan-300">VEXORA SAMPLER</p><h1 className="text-xl font-bold">Administração de licenças</h1></div></div>
        <p className="mb-5 text-sm text-slate-300">Acesso restrito. Informe o token administrativo configurado nos Secrets do Lovable Cloud.</p>
        <form className="space-y-3" onSubmit={event => { event.preventDefault(); void load(); }}>
          <label className="block text-sm">Token administrativo<input className={inputClass + " mt-1"} type="password" minLength={24} autoComplete="current-password" value={token} onChange={e => setToken(e.target.value)} required /></label>
          {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-sm text-red-200">{error}</p>}
          <button className={buttonClass + " w-full bg-cyan-400 text-slate-950 hover:bg-cyan-300"} disabled={busy || token.length < 24}><ShieldCheck size={16}/>{busy ? "Verificando…" : "Entrar no painel"}</button>
        </form>
        <a href="/" className="mt-5 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-300"><ArrowLeft size={16}/> Voltar ao VEXORA</a>
      </section>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#05070c] p-4 text-white sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold tracking-[.25em] text-cyan-300">VEXORA SAMPLER</p><h1 className="text-2xl font-bold">Painel de licenças</h1><p className="mt-1 text-sm text-slate-400">Criar, consultar e revogar licenças.</p></div><div className="flex gap-2"><button className={buttonClass + " border border-slate-700 text-slate-200 hover:border-cyan-400"} onClick={() => void load()} disabled={busy}><RefreshCw size={16}/> Atualizar</button><button className={buttonClass + " border border-slate-700 text-slate-200 hover:border-red-400"} onClick={() => { setAuthenticated(false); setToken(""); setLicenses([]); }}><LogOut size={16}/> Sair</button></div></header>

        <section className="rounded-2xl border border-cyan-400/20 bg-[#0b1220] p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Plus size={18} className="text-cyan-300"/> Criar licença</h2>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={createLicense}>
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-sm text-slate-300">O cliente informará o próprio e-mail ao ativar a chave. Você só precisa gerar e enviar a chave.</div>
            <label className="text-sm">Chave de licença<input className={inputClass + " mt-1 font-mono"} minLength={16} value={key} onChange={e=>setKey(e.target.value)} required /><span className="mt-1 flex flex-wrap items-center gap-2"><button type="button" className={buttonClass + " border border-cyan-400/40 text-cyan-200 hover:bg-cyan-400/10"} onClick={() => { const bytes = crypto.getRandomValues(new Uint8Array(24)); const randomPart = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("").toUpperCase(); setKey("VEXORA-" + randomPart.match(/.{1,6}/g)!.join("-")); setError(""); setNotice("Chave aleatória gerada. Copie e guarde após criar a licença; ela não será exibida novamente."); }}><RefreshCw size={15}/> Gerar chave aleatória</button><button type="button" className={buttonClass + " border border-slate-700 text-slate-200 hover:border-cyan-400"} disabled={!key} onClick={() => { void navigator.clipboard.writeText(key); setNotice("Chave copiada. Guarde-a em local seguro."); }}><Copy size={15}/> Copiar</button></span></label>
            <label className="text-sm">Máximo de dispositivos<select className={inputClass + " mt-1"} value={maxActivations} onChange={e=>setMaxActivations(e.target.value)}>{Array.from({length:20},(_,i)=><option key={i+1} value={String(i+1)}>{i+1}</option>)}</select></label>
            <label className="text-sm">Validade (opcional)<input className={inputClass + " mt-1"} type="datetime-local" value={expiresAt} onChange={e=>setExpiresAt(e.target.value)} /></label>
            <div className="md:col-span-2"><button className={buttonClass + " bg-cyan-400 text-slate-950 hover:bg-cyan-300"} disabled={busy}><Plus size={16}/> Criar licença</button></div>
          </form>
          {notice && <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-3 text-sm text-emerald-200">{notice}</p>}
          {error && <p role="alert" className="mt-4 rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-sm text-red-200">{error}</p>}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-[#0b1220] p-5">
          <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Licenças cadastradas ({licenses.length})</h2><span className="text-xs text-slate-500">Chaves não são armazenadas em texto puro.</span></div>
          {licenses.length === 0 ? <p className="text-sm text-slate-400">Nenhuma licença encontrada.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="text-xs uppercase text-slate-400"><tr><th className="px-3 py-3">Cliente</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3">Dispositivos</th><th className="px-3 py-3">Validade</th><th className="px-3 py-3">Criada em</th><th className="px-3 py-3">Ação</th></tr></thead><tbody>{licenses.map(license => {const used = license.vexora_license_activations?.[0]?.count ?? 0; const expired = license.expires_at !== null && new Date(license.expires_at).getTime() <= Date.now(); return <tr key={license.id} className="border-t border-slate-800"><td className="px-3 py-3"><div className="font-medium">{license.vexora_license_activations?.find(a => a.email)?.email ?? "Aguardando primeira ativação"}</div><div className="mt-1 text-xs text-slate-500">{license.id}</div></td><td className="px-3 py-3"><span className={license.status === "revoked" ? "text-red-300" : expired ? "text-amber-300" : "text-emerald-300"}>{license.status === "revoked" ? "Revogada" : expired ? "Expirada" : "Ativa"}</span></td><td className="px-3 py-3">{used} / {license.max_activations}</td><td className="px-3 py-3">{license.expires_at ? new Date(license.expires_at).toLocaleString() : "Sem validade"}</td><td className="px-3 py-3">{new Date(license.created_at).toLocaleString()}</td><td className="px-3 py-3">{license.status === "active" ? <button className={buttonClass + " border border-red-500/40 text-red-300 hover:bg-red-950/40"} onClick={() => void revoke(license)} disabled={busy}><ShieldX size={15}/> Revogar</button> : <span className="text-slate-500">—</span>}</td></tr>;})}</tbody></table></div>}
        </section>
        <a href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-300"><ArrowLeft size={16}/> Voltar ao VEXORA</a>
      </div>
    </main>
  );
}
